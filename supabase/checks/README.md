# Database permission check

Run `database_permissions.sql` as `postgres` in the Supabase SQL Editor, or with
`psql --set ON_ERROR_STOP=1 --file supabase/checks/database_permissions.sql` using
your normal database connection environment. A successful run returns `PASS`.

The check verifies table grants, RLS, all five app roles, customer isolation,
transaction submission and review, exactly-once balance crediting, balance RPCs,
notifications, the admin settings column grant, and service-role writes. It
creates temporary fixtures inside one transaction and rolls everything back;
it does not send Auth emails or modify existing customer records.

For future migrations, enable RLS and add the intended policies and explicit
`authenticated` table/column grants together. New `postgres`-owned public tables
inherit server-side `service_role` access, but browser access still needs an
explicit grant. Keep ledger audit tables read-only for browser clients and use
the authorized balance RPCs for changes. Never put secret keys or access tokens
in `VITE_*` environment variables.
