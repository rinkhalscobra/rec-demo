-- Run as postgres against a migrated database using the SQL Editor or psql.
-- This is a standalone SQL smoke check, not a pgTAP test.
-- All fixtures and writes roll back.
-- This exercises real RLS and transaction triggers without creating accounts
-- through Auth, sending emails, or changing existing customer records.
BEGIN;

DO $$
DECLARE
  relation record;
  policy record;
  operation text;
BEGIN
  FOR relation IN
    SELECT c.oid, c.relname, c.relrowsecurity
    FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p')
  LOOP
    IF NOT relation.relrowsecurity THEN
      RAISE EXCEPTION 'RLS is disabled on %', relation.relname;
    END IF;
    FOREACH operation IN ARRAY ARRAY['SELECT', 'INSERT', 'UPDATE', 'DELETE'] LOOP
      IF NOT has_table_privilege('service_role', relation.oid, operation) THEN
        RAISE EXCEPTION 'Missing service_role % on %', operation, relation.relname;
      END IF;
      IF has_table_privilege('anon', relation.oid, operation) THEN
        RAISE EXCEPTION 'Unexpected anonymous % on %', operation, relation.relname;
      END IF;
    END LOOP;
  END LOOP;

  FOR policy IN
    SELECT tablename, cmd FROM pg_policies
    WHERE schemaname = 'public' AND tablename <> 'ip_validation_logs'
      AND (roles && ARRAY['public', 'authenticated']::name[])
  LOOP
    FOREACH operation IN ARRAY CASE WHEN policy.cmd = 'ALL'
      THEN ARRAY['SELECT', 'INSERT', 'UPDATE', 'DELETE'] ELSE ARRAY[policy.cmd] END
    LOOP
      IF policy.tablename = 'ip_whitelist_settings' AND operation = 'UPDATE' THEN
        IF NOT has_column_privilege('authenticated', 'public.ip_whitelist_settings', 'enabled', 'UPDATE') THEN
          RAISE EXCEPTION 'Missing settings column update grant';
        END IF;
      ELSIF NOT has_table_privilege('authenticated', format('public.%I', policy.tablename), operation) THEN
        RAISE EXCEPTION 'Missing authenticated % on %', operation, policy.tablename;
      END IF;
    END LOOP;
  END LOOP;
  IF has_table_privilege('authenticated', 'public.crypto_balance_adjustments', 'INSERT')
    OR has_table_privilege('authenticated', 'public.ip_whitelist_settings', 'UPDATE') THEN
    RAISE EXCEPTION 'Ledger or settings grants are too broad';
  END IF;
END;
$$;

CREATE TEMP TABLE permission_test_actors (
  label text PRIMARY KEY,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  group_id uuid,
  app_role public.app_role NOT NULL
);
GRANT SELECT ON permission_test_actors TO authenticated, service_role;

DO $$
DECLARE
  group_a uuid;
  group_b uuid;
  actor record;
BEGIN
  INSERT INTO public.groups (name) VALUES ('Permission smoke test A') RETURNING id INTO group_a;
  INSERT INTO public.groups (name) VALUES ('Permission smoke test B') RETURNING id INTO group_b;
  INSERT INTO permission_test_actors (label, group_id, app_role) VALUES
    ('admin', group_a, 'admin'),
    ('group_admin', group_a, 'group_admin'),
    ('supervisor', group_a, 'supervisor'),
    ('agent', group_a, 'agent'),
    ('customer', group_a, 'user'),
    ('unrelated_customer', group_b, 'user');

  FOR actor IN SELECT * FROM permission_test_actors LOOP
    INSERT INTO auth.users (id, email, raw_user_meta_data)
    VALUES (actor.id, actor.id::text || '@permissions-test.invalid',
      jsonb_build_object('platform', 'brightfund', 'group_id', actor.group_id));
    INSERT INTO public.user_roles (user_id, role) VALUES (actor.id, actor.app_role);
  END LOOP;
  UPDATE public.profiles SET assigned_to = (SELECT id FROM permission_test_actors WHERE label = 'agent')
  WHERE id = (SELECT id FROM permission_test_actors WHERE label = 'customer');
END;
$$;

-- Query every public table through each real application role. This catches
-- missing grants as well as permission errors inside policy dependencies.
DO $$
DECLARE
  actor record;
  relation record;
BEGIN
  FOR actor IN SELECT * FROM permission_test_actors LOOP
    PERFORM set_config('request.jwt.claims', jsonb_build_object('sub', actor.id, 'role', 'authenticated')::text, true);
    SET LOCAL ROLE authenticated;
    FOR relation IN
      SELECT c.relname FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p')
    LOOP
      EXECUTE format('SELECT 1 FROM public.%I LIMIT 1', relation.relname);
    END LOOP;
    RESET ROLE;
  END LOOP;
END;
$$;

DO $$
DECLARE
  customer uuid := (SELECT id FROM permission_test_actors WHERE label = 'customer');
  unrelated uuid := (SELECT id FROM permission_test_actors WHERE label = 'unrelated_customer');
  agent uuid := (SELECT id FROM permission_test_actors WHERE label = 'agent');
  admin uuid := (SELECT id FROM permission_test_actors WHERE label = 'admin');
  request_id uuid;
  affected integer;
  balance_after numeric;
  actor record;
BEGIN
  PERFORM set_config('request.jwt.claims', jsonb_build_object('sub', customer, 'role', 'authenticated')::text, true);
  SET LOCAL ROLE authenticated;
  IF (SELECT count(*) FROM public.profiles WHERE id IN (customer, unrelated)) <> 1 THEN
    RAISE EXCEPTION 'Customer profile isolation failed';
  END IF;
  IF (SELECT count(*) FROM public.customer_balances WHERE customer_id = customer) <> 3 THEN
    RAISE EXCEPTION 'Signup currency balance seeding failed';
  END IF;
  INSERT INTO public.transaction_requests (customer_id, type, amount, currency, method)
  VALUES (customer, 'deposit', 25, 'EUR', 'bank_transfer') RETURNING id INTO request_id;

  BEGIN
    INSERT INTO public.transaction_requests (customer_id, type, amount, currency, method)
    VALUES (unrelated, 'deposit', 25, 'EUR', 'bank_transfer');
    RAISE EXCEPTION 'Customer inserted another customer transaction';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  BEGIN
    INSERT INTO public.transaction_requests (customer_id, type, amount, currency, method, status)
    VALUES (customer, 'deposit', 25, 'EUR', 'bank_transfer', 'approved');
    RAISE EXCEPTION 'Customer self-approved a transaction';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  UPDATE public.transaction_requests SET status = 'approved' WHERE id = request_id;
  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 0 THEN RAISE EXCEPTION 'Customer can review transactions'; END IF;
  BEGIN
    PERFORM public.adjust_fiat_balance(customer, 'EUR', 1, 'credit', 'permission test');
    RAISE EXCEPTION 'Customer can adjust their own cash balance';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  RESET ROLE;

  -- Same-group staff and the assigned agent can see the customer request;
  -- another customer cannot see it.
  FOR actor IN SELECT * FROM permission_test_actors WHERE label <> 'customer' LOOP
    PERFORM set_config('request.jwt.claims', jsonb_build_object('sub', actor.id, 'role', 'authenticated')::text, true);
    SET LOCAL ROLE authenticated;
    SELECT count(*) INTO affected FROM public.transaction_requests WHERE id = request_id;
    IF affected <> (CASE WHEN actor.label = 'unrelated_customer' THEN 0 ELSE 1 END) THEN
      RAISE EXCEPTION 'Transaction visibility failed for %', actor.label;
    END IF;
    RESET ROLE;
  END LOOP;

  PERFORM set_config('request.jwt.claims', jsonb_build_object('sub', agent, 'role', 'authenticated')::text, true);
  SET LOCAL ROLE authenticated;
  UPDATE public.transaction_requests
  SET status = 'approved', processed_by = agent, processed_at = now(), review_message = 'Permission test'
  WHERE id = request_id;
  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 1 THEN RAISE EXCEPTION 'Assigned agent review failed'; END IF;
  SELECT balance INTO balance_after FROM public.customer_balances WHERE customer_id = customer AND currency = 'EUR';
  IF balance_after IS DISTINCT FROM 25 THEN RAISE EXCEPTION 'Approval did not credit exactly once'; END IF;
  UPDATE public.transaction_requests SET review_message = 'Permission test edited' WHERE id = request_id;
  SELECT balance INTO balance_after FROM public.customer_balances WHERE customer_id = customer AND currency = 'EUR';
  IF balance_after IS DISTINCT FROM 25 THEN RAISE EXCEPTION 'Approval credited more than once'; END IF;
  PERFORM public.adjust_fiat_balance(customer, 'EUR', 5, 'credit', 'permission test');
  PERFORM public.adjust_crypto_balance(customer, 'bitcoin', 'BTC', 'Bitcoin', 1, 'credit', 'permission test', 100);
  IF NOT EXISTS (SELECT 1 FROM public.crypto_balance_adjustments WHERE customer_id = customer) THEN
    RAISE EXCEPTION 'Crypto adjustment audit write failed';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.notifications WHERE user_id = customer) THEN
    RAISE EXCEPTION 'Balance notification write failed';
  END IF;
  PERFORM public.delete_crypto_balance(customer, 'bitcoin');
  RESET ROLE;

  PERFORM set_config('request.jwt.claims', jsonb_build_object('sub', admin, 'role', 'authenticated')::text, true);
  SET LOCAL ROLE authenticated;
  UPDATE public.ip_whitelist_settings SET enabled = enabled WHERE id = 'global';
  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 1 THEN RAISE EXCEPTION 'Admin settings update failed'; END IF;
  RESET ROLE;

  SET LOCAL ROLE service_role;
  UPDATE public.profiles SET first_name = 'Permission test' WHERE id = customer;
  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 1 THEN RAISE EXCEPTION 'Service role profile write failed'; END IF;
  INSERT INTO public.ip_validation_logs (user_id, ipv4_address, action, reason)
  VALUES (customer, '127.0.0.1', 'ALLOW', 'Permission test');
  RESET ROLE;
END;
$$;

ROLLBACK;
SELECT 'PASS: all table reads, five app roles, customer isolation, transaction creation/review, single balance credit, balance RPCs, notifications, settings, and service-role writes; all fixtures rolled back' AS result;
