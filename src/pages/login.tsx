import { useState, type FormEvent } from 'react';
import { useAuth } from '@/context/auth';
import { Alert, Field } from '@/components/ui';

export function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await login(email.trim(), password);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No pudimos entrar');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="login-wrap">
      <form className="card login-card stack" onSubmit={submit}>
        <div>
          <div className="brand" style={{ padding: 0, marginBottom: 4 }}>
            A<span>.</span>B<span>.</span>S<span>.</span>U<span>.</span>R
            <span>.</span>D
          </div>
          <div className="muted" style={{ fontSize: 14, fontWeight: 600 }}>
            Panel de administración
          </div>
        </div>

        {error && <Alert>{error}</Alert>}

        <Field label="Correo">
          <input
            className="input"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="username"
            required
          />
        </Field>

        <Field label="Contraseña">
          <input
            className="input"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
        </Field>

        <button className="btn btn-red" type="submit" disabled={busy}>
          {busy ? 'Entrando…' : 'Entrar'}
        </button>

        <div className="muted" style={{ fontSize: 12, lineHeight: 1.5 }}>
          Solo cuentas con rol de moderador o administrador. El primer admin se
          crea con <code>npm run seed:admin</code> en la API.
        </div>
      </form>
    </div>
  );
}
