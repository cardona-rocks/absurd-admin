import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import type { AuditEntry, Paginated } from '@/lib/types';
import {
  Alert,
  EmptyState,
  Pagination,
  Spinner,
  formatDate,
  num,
} from '@/components/ui';

const ENTITIES = [
  { value: '', label: 'Todo' },
  { value: 'avatar', label: 'Avatares' },
  { value: 'user', label: 'Usuarios' },
];

/** Colorea la acción según si crea, modifica o destruye. */
function actionTone(action: string): string {
  if (action.includes('delete') || action.includes('ban')) return 'tag-red';
  if (action.includes('create') || action.includes('add')) return 'tag-green';
  return 'tag-muted';
}

export function AuditPage() {
  const [data, setData] = useState<Paginated<AuditEntry> | null>(null);
  const [page, setPage] = useState(1);
  const [entity, setEntity] = useState('');
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setError('');
    try {
      const params = new URLSearchParams({ page: String(page), limit: '50' });
      if (entity) params.set('entity', entity);
      setData(await api<Paginated<AuditEntry>>(`/admin/audit?${params}`));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo cargar la auditoría');
    }
  }, [page, entity]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <>
      <div className="page-head">
        <div>
          <h1 style={{ fontSize: 30 }}>Auditoría</h1>
          <div className="muted">
            {data ? `${num(data.total)} acciones registradas` : 'Cargando…'}
          </div>
        </div>
        <select
          className="select"
          style={{ width: 180 }}
          value={entity}
          onChange={(e) => {
            setPage(1);
            setEntity(e.target.value);
          }}
        >
          {ENTITIES.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      {error && <Alert>{error}</Alert>}

      {!data ? (
        <Spinner />
      ) : data.items.length === 0 ? (
        <EmptyState
          title="Sin actividad"
          hint="Aquí aparecerá todo lo que se haga desde el panel."
        />
      ) : (
        <>
          <div className="card" style={{ padding: 6 }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Cuándo</th>
                  <th>Quién</th>
                  <th>Acción</th>
                  <th>Detalle</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((e) => (
                  <tr key={e._id}>
                    <td className="muted" style={{ fontSize: 12, whiteSpace: 'nowrap' }}>
                      {formatDate(e.createdAt)}
                    </td>
                    <td style={{ fontSize: 13 }}>
                      {e.actor?.name ?? e.actorName ?? '—'}
                    </td>
                    <td>
                      <span className={`tag ${actionTone(e.action)}`}>{e.action}</span>
                    </td>
                    <td style={{ fontSize: 13.5 }}>{e.summary}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={data.page} pages={data.pages} onChange={setPage} />
        </>
      )}
    </>
  );
}
