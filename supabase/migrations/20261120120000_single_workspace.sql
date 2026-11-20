-- Keep the internal membership used by RLS, without exposing group management.
BEGIN;

INSERT INTO public.groups (name, platform)
SELECT 'Financial Recovery', 'brightfund'
WHERE NOT EXISTS (SELECT 1 FROM public.groups WHERE platform = 'brightfund');

CREATE OR REPLACE FUNCTION public.get_default_group_id(_platform text DEFAULT 'brightfund')
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT id FROM public.groups
  WHERE platform = _platform
  ORDER BY created_at NULLS LAST, id
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_default_group_id(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_default_group_id(text) TO authenticated, service_role;

-- Preserve every account, invitation and IP rule when adopting one workspace.
UPDATE public.profiles SET group_id = public.get_default_group_id()
WHERE platform = 'brightfund' AND group_id IS DISTINCT FROM public.get_default_group_id();
UPDATE public.promocodes SET group_id = public.get_default_group_id()
WHERE group_id IN (SELECT id FROM public.groups WHERE platform = 'brightfund')
  AND group_id IS DISTINCT FROM public.get_default_group_id();
UPDATE public.ip_whitelist SET group_id = public.get_default_group_id()
WHERE group_id IN (SELECT id FROM public.groups WHERE platform = 'brightfund')
  AND group_id IS DISTINCT FROM public.get_default_group_id();
DELETE FROM public.groups
WHERE platform = 'brightfund' AND id <> public.get_default_group_id();

CREATE UNIQUE INDEX IF NOT EXISTS groups_single_recovery_workspace
ON public.groups (platform) WHERE platform = 'brightfund';

CREATE OR REPLACE FUNCTION public.assign_recovery_workspace()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NEW.platform = 'brightfund' THEN
    NEW.group_id := public.get_default_group_id();
    IF NEW.group_id IS NULL THEN
      RAISE EXCEPTION 'The Financial Recovery workspace is unavailable';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.assign_recovery_workspace() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER profiles_assign_recovery_workspace
BEFORE INSERT OR UPDATE OF group_id, platform ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.assign_recovery_workspace();

ALTER TABLE public.promocodes ALTER COLUMN group_id SET DEFAULT public.get_default_group_id();
ALTER TABLE public.ip_whitelist ALTER COLUMN group_id SET DEFAULT public.get_default_group_id();

-- Membership is automatic; browser sessions cannot create/delete workspaces.
REVOKE INSERT, UPDATE, DELETE ON public.groups FROM authenticated, anon;

COMMIT;
