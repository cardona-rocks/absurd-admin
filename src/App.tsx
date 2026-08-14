import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/context/auth';
import { Layout } from '@/components/layout';
import { LoginPage } from '@/pages/login';
import { ChangePasswordPage } from '@/pages/change-password';
import { DashboardPage } from '@/pages/dashboard';
import { AvatarsPage } from '@/pages/avatars';
import { EnemiesPage } from '@/pages/enemies';
import { CampaignPage } from '@/pages/campaign';
import { UsersPage } from '@/pages/users';
import { AuditPage } from '@/pages/audit';
import { Spinner } from '@/components/ui';

/**
 * Puerta de entrada: sin sesión se ve el login, y con la contraseña inicial
 * todavía sin cambiar no se llega al panel hasta cambiarla.
 */
function Gate() {
  const { me, loading } = useAuth();

  if (loading) return <Spinner label="Comprobando sesión…" />;
  if (!me) return <LoginPage />;
  if (me.mustChangePassword) return <ChangePasswordPage />;

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<DashboardPage />} />
        <Route path="avatars" element={<AvatarsPage />} />
        <Route path="enemies" element={<EnemiesPage />} />
        <Route path="campaign" element={<CampaignPage />} />
        <Route path="users" element={<UsersPage />} />
        <Route path="audit" element={<AuditPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Gate />
      </AuthProvider>
    </BrowserRouter>
  );
}
