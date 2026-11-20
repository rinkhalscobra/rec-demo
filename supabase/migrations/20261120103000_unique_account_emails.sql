-- Email is the sole account identifier. Case numbers remain optional case
-- metadata and are never needed to authenticate.
CREATE OR REPLACE FUNCTION public.normalize_profile_email()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.email := nullif(lower(btrim(NEW.email)), '');
  NEW.display_email := coalesce(nullif(lower(btrim(NEW.display_email)), ''), NEW.email);
  RETURN NEW;
END;
$$;

CREATE TRIGGER normalize_profile_email_trg
BEFORE INSERT OR UPDATE OF email, display_email ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.normalize_profile_email();

UPDATE public.profiles
SET email = nullif(lower(btrim(email)), ''),
    display_email = coalesce(nullif(lower(btrim(display_email)), ''), nullif(lower(btrim(email)), ''));

-- Expression indexes also cover writes that differ only by case/whitespace.
-- Include archived accounts and all platforms so a login email stays unique.
CREATE UNIQUE INDEX profiles_login_email_unique
ON public.profiles (lower(btrim(email)))
WHERE nullif(btrim(email), '') IS NOT NULL;

CREATE UNIQUE INDEX profiles_display_email_unique
ON public.profiles (lower(btrim(display_email)))
WHERE nullif(btrim(display_email), '') IS NOT NULL;

NOTIFY pgrst, 'reload schema';
