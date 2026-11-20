import type { ReactNode } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import type { Database } from '@/integrations/supabase/types';

type AppRole = Database['public']['Enums']['app_role'];

export const RequireAuth = ({ children, roles }: { children?: ReactNode; roles?: AppRole[] }) => {
  const { user, loading } = useAuth();
  const { role, isLoading: roleLoading } = useUserRole();

  if (!loading && !user) return <Navigate to="/" replace />;

  if (loading || (roles && roleLoading)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background" role="status" aria-label="Loading account">
        <Loader2 className="h-8 w-8 animate-spin text-primary" aria-hidden="true" />
      </div>
    );
  }

  if (roles && (!role || !roles.includes(role))) return <Navigate to="/" replace />;

  return children ?? <Outlet />;
};
