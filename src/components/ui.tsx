import type { ReactNode } from 'react';
import type { Category, Role } from '@/lib/types';
import { ROLE_LABELS } from '@/lib/types';

export function Spinner({ label }: { label?: string }) {
  return (
    <div className="center-box">
      <div className="spinner" />
      {label && <span className="muted">{label}</span>}
    </div>
  );
}

export function Alert({
  kind = 'error',
  children,
}: {
  kind?: 'error' | 'ok' | 'warn';
  children: ReactNode;
}) {
  const cls = kind === 'ok' ? 'alert-ok' : kind === 'warn' ? 'alert-warn' : 'alert-error';
  return <div className={`alert ${cls}`}>{children}</div>;
}

export function CategoryTag({ category }: { category: Category }) {
  return <span className={`tag cat-${category}`}>{category}</span>;
}

export function RoleTag({ role }: { role: Role }) {
  const cls = role === 'admin' ? 'tag-red' : role === 'moderator' ? '' : 'tag-muted';
  return <span className={`tag ${cls}`}>{ROLE_LABELS[role]}</span>;
}

export function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <div className="card stat-card">
      <div className="eyebrow">{label}</div>
      <div className="stat-value">{value}</div>
      {hint && (
        <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>
          {hint}
        </div>
      )}
    </div>
  );
}

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="field">
      <span className="eyebrow">{label}</span>
      {children}
      {hint && (
        <span className="muted" style={{ fontSize: 12 }}>
          {hint}
        </span>
      )}
    </label>
  );
}

export function Modal({
  title,
  onClose,
  children,
  footer,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="scrim" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="row" style={{ justifyContent: 'space-between', marginBottom: 16 }}>
          <h2 style={{ fontSize: 20 }}>{title}</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Cerrar">
            ✕
          </button>
        </div>
        <div className="stack">{children}</div>
        {footer && (
          <div className="row" style={{ justifyContent: 'flex-end', marginTop: 20, gap: 10 }}>
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

export function Pagination({
  page,
  pages,
  onChange,
}: {
  page: number;
  pages: number;
  onChange: (p: number) => void;
}) {
  if (pages <= 1) return null;
  return (
    <div className="pagination">
      <button
        className="btn btn-sm btn-ghost"
        disabled={page <= 1}
        onClick={() => onChange(page - 1)}
      >
        ← Anterior
      </button>
      <span className="muted" style={{ fontSize: 13, fontWeight: 700 }}>
        {page} / {pages}
      </span>
      <button
        className="btn btn-sm btn-ghost"
        disabled={page >= pages}
        onClick={() => onChange(page + 1)}
      >
        Siguiente →
      </button>
    </div>
  );
}

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="center-box">
      <h3 style={{ fontSize: 18 }}>{title}</h3>
      {hint && <span className="muted">{hint}</span>}
    </div>
  );
}

/** Formatea números grandes con separador de miles. */
export function num(n: number): string {
  return new Intl.NumberFormat('es-ES').format(n);
}

export function formatDate(value?: string | null): string {
  if (!value) return '—';
  return new Date(value).toLocaleString('es-ES', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
