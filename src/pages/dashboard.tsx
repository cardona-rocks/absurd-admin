import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import type { Overview, TopAvatar } from '@/lib/types';
import { Alert, CategoryTag, Spinner, StatCard, num } from '@/components/ui';

interface TimelinePoint {
  date: string;
  matches: number;
}

export function DashboardPage() {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [timeline, setTimeline] = useState<TimelinePoint[]>([]);
  const [top, setTop] = useState<TopAvatar[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const [o, t, a] = await Promise.all([
          api<Overview>('/admin/stats'),
          api<TimelinePoint[]>('/admin/stats/timeline?days=14'),
          api<TopAvatar[]>('/admin/stats/top-avatars?limit=8'),
        ]);
        setOverview(o);
        setTimeline(t);
        setTop(a);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'No se pudieron cargar las cifras');
      }
    })();
  }, []);

  if (error) return <Alert>{error}</Alert>;
  if (!overview) return <Spinner label="Cargando el panel…" />;

  return (
    <>
      <div className="page-head">
        <div>
          <h1 style={{ fontSize: 30 }}>Resumen</h1>
          <div className="muted">Cómo va el juego ahora mismo.</div>
        </div>
      </div>

      <div className="grid grid-stats" style={{ marginBottom: 24 }}>
        <StatCard
          label="Jugadores"
          value={num(overview.users.total)}
          hint={`${num(overview.users.newThisWeek)} esta semana · ${num(overview.users.guests)} invitados`}
        />
        <StatCard
          label="Suspendidos"
          value={num(overview.users.banned)}
          hint="Cuentas sin acceso"
        />
        <StatCard
          label="Combates hoy"
          value={num(overview.matches.today)}
          hint={`${num(overview.matches.total)} en total`}
        />
        <StatCard
          label="En vivo"
          value={num(overview.matches.live)}
          hint={`${num(overview.matches.searching)} buscando rival`}
        />
        <StatCard
          label="Avatares"
          value={num(overview.avatars.total)}
          hint={`${num(overview.avatars.hidden)} ocultos`}
        />
        <StatCard
          label="Créditos en circulación"
          value={num(overview.economy.creditsInCirculation)}
          hint={`${num(overview.tournaments.active)} torneos activos`}
        />
      </div>

      <div className="card" style={{ padding: 20, marginBottom: 20 }}>
        <div className="eyebrow">combates por día · últimas 2 semanas</div>
        <MatchesChart data={timeline} />
      </div>

      <div className="card" style={{ padding: 20 }}>
        <div className="eyebrow" style={{ marginBottom: 12 }}>
          avatares más comprados
        </div>
        {top.length === 0 ? (
          <div className="muted">Todavía no hay compras.</div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Avatar</th>
                <th>Categoría</th>
                <th>Precio</th>
                <th style={{ textAlign: 'right' }}>Compras</th>
              </tr>
            </thead>
            <tbody>
              {top.map((a) => (
                <tr key={a.avatarId}>
                  <td>
                    <b>{a.name}</b>
                    <span className="muted"> · {a.slug}</span>
                  </td>
                  <td>
                    <CategoryTag category={a.category} />
                  </td>
                  <td>¢{num(a.price)}</td>
                  <td style={{ textAlign: 'right', fontWeight: 800 }}>
                    {num(a.purchases)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}

/**
 * Gráfico de barras sin librería: son 14 puntos, no compensa añadir una
 * dependencia de charting para esto.
 */
function MatchesChart({ data }: { data: TimelinePoint[] }) {
  const max = Math.max(1, ...data.map((d) => d.matches));

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-end',
        gap: 6,
        height: 150,
        marginTop: 14,
      }}
    >
      {data.map((d) => (
        <div
          key={d.date}
          style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 5 }}
          title={`${d.date}: ${d.matches} combates`}
        >
          <div
            style={{
              height: `${(d.matches / max) * 110}px`,
              minHeight: d.matches > 0 ? 4 : 2,
              background: d.matches > 0 ? 'var(--ink)' : 'var(--paper-3)',
              border: '2px solid var(--ink)',
              borderRadius: '6px 6px 0 0',
              marginTop: 'auto',
            }}
          />
          <div
            className="muted"
            style={{ fontSize: 9.5, textAlign: 'center', fontWeight: 700 }}
          >
            {d.date.slice(8)}
          </div>
        </div>
      ))}
    </div>
  );
}
