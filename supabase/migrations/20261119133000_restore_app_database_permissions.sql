-- Imported tables retained RLS policies but lost their Data API grants.
-- Keep row authorization in the existing policies; grant only operations that
-- those policies support. In particular, ledger adjustments stay read-only.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p')
      AND NOT c.relrowsecurity
  ) THEN
    RAISE EXCEPTION 'Enable RLS on public tables before restoring API grants';
  END IF;
END;
$$;

GRANT USAGE ON SCHEMA public TO authenticated, service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE
  public.case_timeline,
  public.client_payment_details,
  public.customer_balances,
  public.customer_notes,
  public.groups,
  public.ip_whitelist,
  public.notifications,
  public.password_reset_requests,
  public.portfolio_items,
  public.promocodes,
  public.recovery_funds,
  public.transaction_requests,
  public.user_roles
TO authenticated;

GRANT SELECT, INSERT, UPDATE ON TABLE
  public.messages,
  public.user_mfa
TO authenticated;

GRANT SELECT, UPDATE ON TABLE
  public.profiles,
  public.user_sessions
TO authenticated;

GRANT SELECT, INSERT, DELETE ON TABLE public.watchlist_items TO authenticated;

GRANT SELECT ON TABLE
  public.crypto_balance_adjustments,
  public.ip_validation_logs,
  public.ip_whitelist_settings
TO authenticated;

-- Preserve the column restriction from the settings migration.
GRANT UPDATE (enabled) ON TABLE public.ip_whitelist_settings TO authenticated;

-- Edge Functions bypass RLS using service_role but still need object grants.
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO service_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- Imported postgres-owned objects used a different default ACL from tables
-- created by the dashboard. Keep future server-side access working. Future
-- browser access must still be granted explicitly alongside the RLS policies.
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO service_role;

NOTIFY pgrst, 'reload schema';
