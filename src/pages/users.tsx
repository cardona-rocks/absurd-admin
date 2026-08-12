import { useCallback, useEffect, useState } from 'react';
import { api, patch, post } from '@/lib/api';
import {
  ROLES,
  ROLE_LABELS,
  type AdminUser,
  type Avatar,
  type Paginated,
  type Role,
} from '@/lib/types';
import {
  Alert,
  CategoryTag,
  EmptyState,
  Field,
  Modal,
  Pagination,
  RoleTag,
  Spinner,
  formatDate,
  num,
} from '@/components/ui';
import { useAuth } from '@/context/auth';

export function UsersPage() {
  const [data, setData] = useState<Paginated<AdminUser> | null>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [role, setRole] = useState<'' | Role>('');
  const [banned, setBanned] = useState<'' | 'true' | 'false'>('');
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError('');
    try {
      const params = new URLSearchParams({ page: String(page), limit: '25' });
      if (search) params.set('search', search);
      if (role) params.set('role', role);
      if (banned) params.set('banned', banned);
      setData(await api<Paginated<AdminUser>>(`/admin/users?${params}`));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudieron cargar los usuarios');
    }
  }, [page, search, role, banned]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <>
      <div className="page-head">
        <div>
          <h1 style={{ fontSize: 30 }}>Usuarios</h1>
          <div className="muted">
            {data ? `${num(data.total)} cuentas` : 'Cargando…'}
          </div>
        </div>
      </div>

      <div className="card" style={{ padding: 14, marginBottom: 18 }}>
        <div className="row" style={{ flexWrap: 'wrap', gap: 12 }}>
          <input
            className="input grow"
            style={{ minWidth: 200 }}
            placeholder="Buscar por nombre o correo…"
            value={search}
            onChange={(e) => {
              setPage(1);
              setSearch(e.target.value);
            }}
          />
          <select
            className="select"
            style={{ width: 170 }}
            value={role}
            onChange={(e) => {
              setPage(1);
              setRole(e.target.value as '' | Role);
            }}
          >
            <option value="">Todos los roles</option>
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {ROLE_LABELS[r]}
              </option>
            ))}
          </select>
          <select
            className="select"
            style={{ width: 170 }}
            value={banned}
            onChange={(e) => {
              setPage(1);
              setBanned(e.target.value as '' | 'true' | 'false');
            }}
          >
            <option value="">Cualquier estado</option>
            <option value="false">Activos</option>
            <option value="true">Suspendidos</option>
          </select>
        </div>
      </div>

      {error && <Alert>{error}</Alert>}

      {!data ? (
        <Spinner />
      ) : data.items.length === 0 ? (
        <EmptyState title="No hay usuarios con esos filtros" />
      ) : (
        <>
          <div className="card" style={{ padding: 6 }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Jugador</th>
                  <th>Rol</th>
                  <th>Créditos</th>
                  <th>Combates</th>
                  <th>Alta</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {data.items.map((u) => (
                  <tr key={u._id}>
                    <td>
                      <div className="row" style={{ gap: 8 }}>
                        <div>
                          <b>{u.name}</b>
                          {u.banned && (
                            <span className="tag tag-red" style={{ marginLeft: 6 }}>
                              suspendido
                            </span>
                          )}
                          {u.isGuest && (
                            <span className="tag tag-muted" style={{ marginLeft: 6 }}>
                              invitado
                            </span>
                          )}
                          <div className="muted" style={{ fontSize: 12 }}>
                            {u.email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <RoleTag role={u.role} />
                    </td>
                    <td>¢{num(u.credits)}</td>
                    <td>
                      {num(u.stats?.wins ?? 0)}V / {num(u.stats?.loses ?? 0)}D
                    </td>
                    <td className="muted" style={{ fontSize: 12 }}>
                      {formatDate(u.createdAt)}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        className="btn btn-sm btn-ghost"
                        onClick={() => setSelected(u._id)}
                      >
                        Gestionar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={data.page} pages={data.pages} onChange={setPage} />
        </>
      )}

      {selected && (
        <UserModal
          userId={selected}
          onClose={() => {
            setSelected(null);
            load();
          }}
        />
      )}
    </>
  );
}

function UserModal({ userId, onClose }: { userId: string; onClose: () => void }) {
  const { isAdmin, me } = useAuth();
  const [user, setUser] = useState<AdminUser | null>(null);
  const [avatars, setAvatars] = useState<Avatar[]>([]);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);

  const [creditAmount, setCreditAmount] = useState(0);
  const [creditReason, setCreditReason] = useState('');
  const [banReason, setBanReason] = useState('');
  const [note, setNote] = useState('');
  const [grantId, setGrantId] = useState('');

  const load = useCallback(async () => {
    try {
      const u = await api<AdminUser>(`/admin/users/${userId}`);
      setUser(u);
      setNote(u.moderationNote ?? '');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo cargar');
    }
  }, [userId]);

  useEffect(() => {
    load();
    api<Paginated<Avatar>>('/admin/avatars?limit=200')
      .then((d) => setAvatars(d.items))
      .catch(() => setAvatars([]));
  }, [load]);

  const run = async (fn: () => Promise<unknown>, ok: string) => {
    setError('');
    setNotice('');
    setBusy(true);
    try {
      await fn();
      setNotice(ok);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo completar');
    } finally {
      setBusy(false);
    }
  };

  if (!user) {
    return (
      <Modal title="Usuario" onClose={onClose}>
        <Spinner />
      </Modal>
    );
  }

  const isSelf = me?._id === user._id;

  return (
    <Modal title={user.name} onClose={onClose}>
      {error && <Alert>{error}</Alert>}
      {notice && <Alert kind="ok">{notice}</Alert>}

      <div className="muted" style={{ fontSize: 13 }}>
        {user.email} · alta {formatDate(user.createdAt)}
        {user.age ? ` · ${user.age} años` : ''}
      </div>

      <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
        <RoleTag role={user.role} />
        {user.banned && <span className="tag tag-red">suspendido</span>}
        {user.isGuest && <span className="tag tag-muted">invitado</span>}
        {user.avatar && <CategoryTag category={user.avatar.category} />}
      </div>

      <div className="card" style={{ padding: 12 }}>
        <div className="eyebrow" style={{ marginBottom: 6 }}>
          estadísticas
        </div>
        <div style={{ fontSize: 13.5, lineHeight: 1.7 }}>
          {num(user.stats?.wins ?? 0)} victorias · {num(user.stats?.loses ?? 0)}{' '}
          derrotas · {num(user.stats?.matchesPlayed ?? 0)} combates
          <br />
          {num(user.credits)} créditos · {num(user.collection?.length ?? 0)} avatares
        </div>
      </div>

      {/* ---- créditos ---- */}
      <div className="card" style={{ padding: 12 }}>
        <div className="eyebrow" style={{ marginBottom: 8 }}>
          ajustar créditos
        </div>
        <div className="row" style={{ gap: 8 }}>
          <input
            className="input"
            style={{ width: 120 }}
            type="number"
            value={creditAmount}
            onChange={(e) => setCreditAmount(Number(e.target.value))}
            placeholder="±"
          />
          <input
            className="input grow"
            placeholder="Motivo (opcional)"
            value={creditReason}
            onChange={(e) => setCreditReason(e.target.value)}
          />
          <button
            className="btn btn-sm"
            disabled={busy || creditAmount === 0}
            onClick={() =>
              run(
                () =>
                  patch(`/admin/users/${user._id}/credits`, {
                    amount: creditAmount,
                    reason: creditReason || undefined,
                  }),
                'Créditos ajustados.',
              )
            }
          >
            Aplicar
          </button>
        </div>
        <div className="muted" style={{ fontSize: 12, marginTop: 6 }}>
          Positivo suma, negativo resta. Queda registrado en la auditoría.
        </div>
      </div>

      {/* ---- regalar avatar ---- */}
      <div className="card" style={{ padding: 12 }}>
        <div className="eyebrow" style={{ marginBottom: 8 }}>
          regalar avatar
        </div>
        <div className="row" style={{ gap: 8 }}>
          <select
            className="select grow"
            value={grantId}
            onChange={(e) => setGrantId(e.target.value)}
          >
            <option value="">Elige un avatar…</option>
            {avatars.map((a) => (
              <option key={a._id} value={a._id}>
                {a.name} ({a.category})
              </option>
            ))}
          </select>
          <button
            className="btn btn-sm"
            disabled={busy || !grantId}
            onClick={() =>
              run(
                () => post(`/admin/users/${user._id}/avatars`, { avatarId: grantId }),
                'Avatar concedido.',
              )
            }
          >
            Regalar
          </button>
        </div>
      </div>

      {/* ---- rol ---- */}
      {isAdmin && (
        <div className="card" style={{ padding: 12 }}>
          <div className="eyebrow" style={{ marginBottom: 8 }}>
            rol
          </div>
          <div className="row" style={{ gap: 8 }}>
            <select
              className="select grow"
              value={user.role}
              disabled={busy || isSelf}
              onChange={(e) =>
                run(
                  () =>
                    patch(`/admin/users/${user._id}/role`, {
                      role: e.target.value as Role,
                    }),
                  'Rol actualizado.',
                )
              }
            >
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABELS[r]}
                </option>
              ))}
            </select>
          </div>
          {isSelf && (
            <div className="muted" style={{ fontSize: 12, marginTop: 6 }}>
              No puedes cambiar tu propio rol.
            </div>
          )}
        </div>
      )}

      {/* ---- nota interna ---- */}
      <Field label="Nota interna" hint="Solo la ve el equipo.">
        <textarea
          className="textarea"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </Field>
      <button
        className="btn btn-sm btn-ghost"
        disabled={busy}
        onClick={() =>
          run(() => patch(`/admin/users/${user._id}/note`, { note }), 'Nota guardada.')
        }
      >
        Guardar nota
      </button>

      {/* ---- suspensión ---- */}
      <div className="card" style={{ padding: 12, borderColor: 'var(--red)' }}>
        <div className="eyebrow" style={{ marginBottom: 8 }}>
          moderación
        </div>
        {user.banned ? (
          <>
            <div style={{ fontSize: 13, marginBottom: 8 }}>
              Suspendido {formatDate(user.bannedAt)}
              {user.bannedReason ? ` · ${user.bannedReason}` : ''}
            </div>
            <button
              className="btn btn-sm"
              disabled={busy}
              onClick={() =>
                run(
                  () => patch(`/admin/users/${user._id}/ban`, { banned: false }),
                  'Cuenta reactivada.',
                )
              }
            >
              Reactivar cuenta
            </button>
          </>
        ) : (
          <div className="row" style={{ gap: 8 }}>
            <input
              className="input grow"
              placeholder="Motivo de la suspensión"
              value={banReason}
              onChange={(e) => setBanReason(e.target.value)}
            />
            <button
              className="btn btn-sm btn-red"
              disabled={busy || isSelf}
              onClick={() =>
                run(
                  () =>
                    patch(`/admin/users/${user._id}/ban`, {
                      banned: true,
                      reason: banReason || undefined,
                    }),
                  'Cuenta suspendida.',
                )
              }
            >
              Suspender
            </button>
          </div>
        )}

        {isAdmin && !user.isGuest && (
          <button
            className="btn btn-sm btn-ghost"
            style={{ marginTop: 10 }}
            disabled={busy}
            onClick={async () => {
              if (!confirm('¿Restablecer la contraseña de esta cuenta?')) return;
              setBusy(true);
              try {
                const res = await post<{ temporaryPassword: string }>(
                  `/admin/users/${user._id}/reset-password`,
                );
                // Se muestra una sola vez: no se guarda en claro en ningún sitio.
                alert(
                  `Contraseña temporal: ${res.temporaryPassword}\n\n` +
                    'Cópiala ahora y pásasela al usuario. Tendrá que cambiarla al entrar.',
                );
              } catch (e) {
                setError(e instanceof Error ? e.message : 'No se pudo restablecer');
              } finally {
                setBusy(false);
              }
            }}
          >
            Restablecer contraseña
          </button>
        )}
      </div>
    </Modal>
  );
}
