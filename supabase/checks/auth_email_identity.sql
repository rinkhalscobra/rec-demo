-- Run as postgres. Fixtures and all changes are rolled back.
BEGIN;
DO $$
DECLARE
  first_id uuid := gen_random_uuid();
  second_id uuid := gen_random_uuid();
  alias_id uuid := gen_random_uuid();
  first_email text := 'identity-' || first_id::text || '@permissions-test.invalid';
  second_email text := 'identity-' || second_id::text || '@permissions-test.invalid';
BEGIN
  INSERT INTO auth.users (id, email, raw_user_meta_data)
  VALUES
    (first_id, first_email, jsonb_build_object('platform', 'brightfund')),
    (second_id, second_email, jsonb_build_object('platform', 'chargeback'));

  IF (SELECT case_number FROM public.profiles WHERE id = first_id) IS NOT NULL THEN
    RAISE EXCEPTION 'Case metadata unexpectedly required for a new account';
  END IF;

  BEGIN
    UPDATE public.profiles SET email = '  ' || upper(first_email) || '  ' WHERE id = second_id;
    RAISE EXCEPTION 'Duplicate profile email accepted across platforms';
  EXCEPTION WHEN unique_violation THEN NULL;
  END;

  BEGIN
    INSERT INTO auth.users (id, email, raw_user_meta_data)
    VALUES (alias_id, 'different-' || alias_id::text || '@permissions-test.invalid',
      jsonb_build_object('platform', 'brightfund', 'display_email', '  ' || upper(first_email) || '  '));
    RAISE EXCEPTION 'Duplicate display email accepted through an alias';
  EXCEPTION WHEN unique_violation THEN NULL;
  END;

  UPDATE public.profiles SET email = '  ' || upper(second_email) || '  ' WHERE id = second_id;
  IF (SELECT email FROM public.profiles WHERE id = second_id) IS DISTINCT FROM second_email THEN
    RAISE EXCEPTION 'Email normalization failed';
  END IF;
END;
$$;
ROLLBACK;
SELECT 'PASS: unique normalized emails across platforms, duplicate display aliases blocked, case number optional; all fixtures rolled back' AS result;
