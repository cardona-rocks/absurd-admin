import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '@/context/auth';
import { ROLE_LABELS } from '@/lib/types';

const NAV = [
  { to: '/', label: 'Resumen', end: true },
  { to: '/avatars', label: 'Avatares' },
  { to: '/enemies', label: 'Enemigos' },
  { to: '/campaign', label: 'Campaña' },
  { to: '/users', label: 'Usuarios' },
  { to: '/audit', label: 'Auditoría' },
];

export function Layout() {
  const { me, logout } = useAuth();

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          A<span>.</span>B<span>.</span>S<span>.</span>U<span>.</span>R
          <span>.</span>D
        </div>

        {NAV.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          >
            {item.label}
          </NavLink>
        ))}

        <div style={{ marginTop: 'auto', paddingTop: 20 }}>
          <div className="eyebrow">sesión</div>
          <div style={{ fontSize: 13.5, fontWeight: 700, marginTop: 4 }}>
            {me?.name}
          </div>
          <div className="muted" style={{ fontSize: 11.5, marginBottom: 10 }}>
            {me ? ROLE_LABELS[me.role] : ''}
          </div>
          <button className="btn btn-sm btn-ghost" onClick={logout}>
            Cerrar sesión
          </button>
        </div>
      </aside>

      <main className="main">
        <Outlet />
      </main>
    </div>
  );
}
