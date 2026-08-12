import { useState, type FormEvent } from 'react';
import { useAuth } from '@/context/auth';
import { Alert, Field } from '@/components/ui';

/**
 * Pantalla obligatoria para las cuentas sembradas o con contraseña
 * restablecida: no se llega al panel sin pasar por aquí.
 */
export function ChangePasswordPage() {
  const { changePassword, logout, me } = useAuth();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [repeat, setRepeat] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const valid = next.length >= 10 && next === repeat && current.length > 0;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await changePassword(current, next);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cambiar');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="login-wrap">
      <form className="card login-card stack" onSubmit={submit}>
        <div>
          <h1 style={{ fontSize: 22 }}>Cambia tu contraseña</h1>
          <div className="muted" style={{ fontSize: 13.5, marginTop: 6, lineHeight: 1.5 }}>
            Estás usando la contraseña inicial de <b>{me?.email}</b>. Elige una
            nueva para continuar.
          </div>
        </div>

        {error && <Alert>{error}</Alert>}

        <Field label="Contraseña actual">
          <input
            className="input"
            type="password"
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
            autoComplete="current-password"
            required
          />
        </Field>

        <Field label="Nueva contraseña" hint="Mínimo 10 caracteres.">
          <input
            className="input"
            type="password"
            value={next}
            onChange={(e) => setNext(e.target.value)}
            autoComplete="new-password"
            required
          />
        </Field>

        <Field label="Repite la nueva contraseña">
          <input
            className="input"
            type="password"
            value={repeat}
            onChange={(e) => setRepeat(e.target.value)}
            autoComplete="new-password"
            required
          />
        </Field>

        {repeat.length > 0 && next !== repeat && (
          <div className="muted" style={{ fontSize: 12.5, color: 'var(--red)' }}>
            Las contraseñas no coinciden.
          </div>
        )}

        <button className="btn btn-red" type="submit" disabled={!valid || busy}>
          {busy ? 'Guardando…' : 'Guardar y entrar'}
        </button>

        <button type="button" className="btn btn-ghost btn-sm" onClick={logout}>
          Cerrar sesión
        </button>
      </form>
    </div>
  );
}
