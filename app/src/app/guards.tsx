// Proteções de rota. A segurança de verdade está na RLS; aqui é só para a tela fazer sentido.
import { Navigate, Outlet } from 'react-router';
import { LoginPage, useAuth } from '@/features/auth/index.ts';
import { CompanyProvider, useCurrentCompany } from '@/features/companies/index.ts';
import { LoadingMessage } from '@/shared/components/Feedback.tsx';

export function RequireAuth() {
  const { user, loading } = useAuth();
  if (loading) return <LoadingMessage />;
  if (!user) return <LoginPage />;
  return (
    <CompanyProvider>
      <Outlet />
    </CompanyProvider>
  );
}

export function RequireOwner() {
  const { role } = useCurrentCompany();
  if (role !== 'owner') return <Navigate to="/boardings" replace />;
  return <Outlet />;
}
