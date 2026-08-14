import { useCallback, useEffect, useState } from 'react';
import { api, assetUrl, del, patch, post } from '@/lib/api';
import {
  ENEMY_CLASSES,
  ENEMY_CLASS_LABELS,
  emptySprites,
  type Avatar,
  type EnemyClass,
  type Paginated,
} from '@/lib/types';
import { SpriteManager } from '@/components/sprite-manager';
import { Alert, EmptyState, Field, Modal, Spinner } from '@/components/ui';

/** Slug a partir del nombre, con las mismas reglas que la API. */
function slugify(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
}

/**
 * Bestiario de la campaña.
 *
 * Los enemigos son avatares de categoría `Enemy`: comparten el gestor de
 * imágenes con los jugables, pero no se venden, no se listan en la tienda y
 * nadie puede equipárselos. Por eso tienen pantalla propia y no aparecen entre
 * los avatares normales.
 */
export function EnemiesPage() {
  const [data, setData] = useState<Paginated<Avatar> | null>(null);
  const [cls, setCls] = useState<'' | EnemyClass>('');
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [editing, setEditing] = useState<Avatar | null>(null);
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    try {
      const params = new URLSearchParams({ category: 'Enemy', limit: '200' });
      if (search.trim()) params.set('search', search.trim());
      setData(await api<Paginated<Avatar>>(`/admin/avatars?${params}`));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo cargar el bestiario');
    }
  }, [search]);

  useEffect(() => {
    const t = setTimeout(load, search ? 300 : 0);
    return () => clearTimeout(t);
  }, [load, search]);

  const shown = (data?.items ?? []).filter(
    (e) => !cls || e.enemy?.class === cls,
  );
  const counts = ENEMY_CLASSES.map((c) => ({
    cls: c,
    n: (data?.items ?? []).filter((e) => e.enemy?.class === c).length,
  }));
  const sinImagen = (data?.items ?? []).filter((e) => e.ready === false).length;

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Enemigos</h1>
          <p className="muted">
            Las criaturas de la campaña. No se venden ni se pueden equipar: sólo
            el sistema las saca a pelear.
          </p>
        </div>
        <button className="btn btn-red" onClick={() => setCreating(true)}>
          Nuevo enemigo
        </button>
      </div>

      {error && <Alert>{error}</Alert>}

      {data && counts.some((c) => c.n === 0) && (
        <Alert kind="warn">
          Faltan enemigos de{' '}
          {counts
            .filter((c) => !c.n)
            .map((c) => ENEMY_CLASS_LABELS[c.cls].toLowerCase())
            .join(' y ')}
          . Los niveles que los pidan fallarán al empezar. Puedes crearlos aquí o
          pasar <code>npm run seed:campaign</code>.
        </Alert>
      )}

      {sinImagen > 0 && (
        <Alert kind="warn">
          {sinImagen} enemigo(s) sin imagen de frente. Pelean igual, pero con una
          ilustración de reserva.
        </Alert>
      )}

      <div className="row" style={{ gap: 10, marginBottom: 16 }}>
        <input
          className="input grow"
          placeholder="Buscar por nombre o slug…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className="select"
          value={cls}
          onChange={(e) => setCls(e.target.value as '' | EnemyClass)}
        >
          <option value="">Todas las clases</option>
          {ENEMY_CLASSES.map((c) => (
            <option key={c} value={c}>
              {ENEMY_CLASS_LABELS[c]} ({counts.find((x) => x.cls === c)?.n ?? 0})
            </option>
          ))}
        </select>
      </div>

      {!data ? (
        <Spinner label="Cargando bestiario…" />
      ) : shown.length === 0 ? (
        <EmptyState
          title="No hay enemigos"
          hint="Crea uno o ejecuta `npm run seed:campaign` para sembrar el bestiario completo."
        />
      ) : (
        <div className="grid grid-avatars">
          {shown.map((e) => (
            <EnemyCard key={e._id} enemy={e} onEdit={() => setEditing(e)} />
          ))}
        </div>
      )}

      {creating && (
        <CreateEnemyModal
          onClose={() => setCreating(false)}
          onCreated={(a) => {
            setCreating(false);
            setEditing(a);
            void load();
          }}
        />
      )}

      {editing && (
        <EditEnemyModal
          enemy={editing}
          onClose={() => {
            setEditing(null);
            void load();
          }}
          onChange={setEditing}
        />
      )}
    </>
  );
}

function EnemyCard({
  enemy,
  onEdit,
}: {
  enemy: Avatar;
  onEdit: () => void;
}) {
  const front = enemy.sprites?.front?.[0];
  const e = enemy.enemy;

  return (
    <div className="card avatar-card">
      <div className="avatar-thumb">
        {front ? (
          <img src={assetUrl(front.url)} alt={enemy.name} />
        ) : (
          <span className="muted" style={{ fontSize: 11 }}>
            sin imagen
          </span>
        )}
      </div>

      <div className="grow">
        <div className="row" style={{ gap: 6, alignItems: 'center' }}>
          <strong>{enemy.name}</strong>
          {enemy.retired && <span className="tag tag-muted">retirado</span>}
        </div>
        <div className="muted" style={{ fontSize: 12 }}>
          {enemy.tagline || enemy.slug}
        </div>

        <div className="row" style={{ gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
          <span className={`tag ${e?.class === 'Boss' ? 'tag-red' : ''}`}>
            {ENEMY_CLASS_LABELS[e?.class ?? 'Basic']}
          </span>
          <span className="tag tag-muted">Lv {e?.level ?? 1}</span>
          <span className="tag tag-muted">{e?.hearts ?? 3} ♥</span>
        </div>
      </div>

      <button className="btn btn-sm btn-ghost" onClick={onEdit}>
        Editar
      </button>
    </div>
  );
}

function CreateEnemyModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (a: Avatar) => void;
}) {
  const [name, setName] = useState('');
  const [cls, setCls] = useState<EnemyClass>('Basic');
  const [level, setLevel] = useState(1);
  const [hearts, setHearts] = useState(3);
  const [tagline, setTagline] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const slug = slugify(name);
  const valid = name.trim().length >= 2 && slug.length >= 2;

  const submit = async () => {
    setError('');
    setBusy(true);
    try {
      const created = await post<Avatar>('/admin/avatars', {
        name: name.trim(),
        slug,
        category: 'Enemy',
        // Un enemigo no se vende: la API fuerza precio 0 y oculto igualmente.
        price: 0,
        hidden: true,
        tagline,
        enemy: { class: cls, level, hearts },
      });
      onCreated({ ...created, sprites: created.sprites ?? emptySprites() });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo crear');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      title="Nuevo enemigo"
      onClose={onClose}
      footer={
        <>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>
            Cancelar
          </button>
          <button
            className="btn btn-red btn-sm"
            disabled={!valid || busy}
            onClick={submit}
          >
            {busy ? 'Creando…' : 'Crear y subir imagen'}
          </button>
        </>
      }
    >
      {error && <Alert>{error}</Alert>}

      <Alert kind="warn">
        A un enemigo sólo se le ve de frente, así que con la imagen de{' '}
        <strong>Frente</strong> basta. Si no le pones ninguna, pelea con una
        ilustración de reserva.
      </Alert>

      <Field label="Nombre">
        <input
          className="input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Impresora Atascada"
        />
      </Field>

      <Field label="Slug" hint={`Se generará como "${slug || '—'}"`}>
        <input className="input" value={slug} readOnly />
      </Field>

      <div className="row" style={{ gap: 12, alignItems: 'flex-start' }}>
        <div className="grow">
          <Field label="Clase">
            <select
              className="select"
              value={cls}
              onChange={(e) => {
                const next = e.target.value as EnemyClass;
                setCls(next);
                // Sugerencia de corazones acorde al papel que va a cumplir.
                setHearts(next === 'Boss' ? 6 : next === 'Elite' ? 4 : 3);
              }}
            >
              {ENEMY_CLASSES.map((c) => (
                <option key={c} value={c}>
                  {ENEMY_CLASS_LABELS[c]}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <div className="grow">
          <Field label="Nivel" hint="Aparece en niveles cercanos a este.">
            <input
              className="input"
              type="number"
              min={1}
              value={level}
              onChange={(e) => setLevel(Number(e.target.value))}
            />
          </Field>
        </div>
        <div className="grow">
          <Field label="Corazones">
            <input
              className="input"
              type="number"
              min={1}
              max={12}
              value={hearts}
              onChange={(e) => setHearts(Number(e.target.value))}
            />
          </Field>
        </div>
      </div>

      <Field label="Frase">
        <input
          className="input"
          value={tagline}
          onChange={(e) => setTagline(e.target.value)}
          placeholder="Papel atascado. No hay papel atascado."
        />
      </Field>
    </Modal>
  );
}

function EditEnemyModal({
  enemy,
  onClose,
  onChange,
}: {
  enemy: Avatar;
  onClose: () => void;
  onChange: (a: Avatar) => void;
}) {
  const [form, setForm] = useState(enemy);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => setForm(enemy), [enemy]);

  const e = form.enemy ?? { class: 'Basic', level: 1, hearts: 3, counterRate: null };
  const setEnemy = (patchFields: Partial<typeof e>) =>
    setForm({ ...form, enemy: { ...e, ...patchFields } });

  const save = async () => {
    setError('');
    setBusy(true);
    try {
      const updated = await patch<Avatar>(`/admin/avatars/${form._id}`, {
        name: form.name,
        tagline: form.tagline,
        description: form.description,
        retired: form.retired,
        enemy: {
          class: e.class,
          level: e.level,
          hearts: e.hearts,
          ...(e.counterRate === null ? {} : { counterRate: e.counterRate }),
        },
      });
      onChange({ ...updated, sprites: updated.sprites ?? emptySprites() });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar');
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!confirm(`¿Borrar "${form.name}"? No se puede deshacer.`)) return;
    try {
      await del(`/admin/avatars/${form._id}`);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo borrar');
    }
  };

  return (
    <Modal
      title={form.name}
      onClose={onClose}
      footer={
        <>
          <button className="btn btn-ghost btn-sm" onClick={remove}>
            Borrar
          </button>
          <div className="grow" />
          {saved && <span className="muted">Guardado</span>}
          <button className="btn btn-sm btn-red" disabled={busy} onClick={save}>
            {busy ? 'Guardando…' : 'Guardar'}
          </button>
        </>
      }
    >
      {error && <Alert>{error}</Alert>}

      <Field label="Nombre">
        <input
          className="input"
          value={form.name}
          onChange={(ev) => setForm({ ...form, name: ev.target.value })}
        />
      </Field>

      <div className="row" style={{ gap: 12, alignItems: 'flex-start' }}>
        <div className="grow">
          <Field label="Clase">
            <select
              className="select"
              value={e.class}
              onChange={(ev) => setEnemy({ class: ev.target.value as EnemyClass })}
            >
              {ENEMY_CLASSES.map((c) => (
                <option key={c} value={c}>
                  {ENEMY_CLASS_LABELS[c]}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <div className="grow">
          <Field
            label="Nivel"
            hint="La campaña lo saca en niveles cercanos a este."
          >
            <input
              className="input"
              type="number"
              min={1}
              value={e.level}
              onChange={(ev) => setEnemy({ level: Number(ev.target.value) })}
            />
          </Field>
        </div>
        <div className="grow">
          <Field label="Corazones" hint="El nivel puede pedir otros distintos.">
            <input
              className="input"
              type="number"
              min={1}
              max={12}
              value={e.hearts}
              onChange={(ev) => setEnemy({ hearts: Number(ev.target.value) })}
            />
          </Field>
        </div>
      </div>

      <Field
        label={`Astucia: ${e.counterRate === null ? 'la de su clase' : `${Math.round(e.counterRate * 100)}%`}`}
        hint="Cada cuánto responde a las manías del jugador en vez de tirar al azar. 0% es puro azar."
      >
        <div className="row" style={{ gap: 10 }}>
          <input
            type="range"
            min={0}
            max={100}
            step={5}
            className="grow"
            value={Math.round((e.counterRate ?? defaultRate(e.class)) * 100)}
            onChange={(ev) => setEnemy({ counterRate: Number(ev.target.value) / 100 })}
          />
          <button
            className="btn btn-sm btn-ghost"
            onClick={() => setEnemy({ counterRate: null })}
            disabled={e.counterRate === null}
          >
            Por defecto
          </button>
        </div>
      </Field>

      <Field label="Frase">
        <input
          className="input"
          value={form.tagline}
          onChange={(ev) => setForm({ ...form, tagline: ev.target.value })}
        />
      </Field>

      <Field label="Descripción">
        <textarea
          className="textarea"
          value={form.description}
          onChange={(ev) => setForm({ ...form, description: ev.target.value })}
        />
      </Field>

      <label className="row" style={{ gap: 8, cursor: 'pointer' }}>
        <input
          type="checkbox"
          checked={form.retired}
          onChange={(ev) => setForm({ ...form, retired: ev.target.checked })}
        />
        <span>
          Retirado
          <span className="muted"> — deja de salir en la campaña</span>
        </span>
      </label>

      <div style={{ marginTop: 18 }}>
        <div className="eyebrow" style={{ marginBottom: 6 }}>
          imágenes
        </div>
        <p className="muted" style={{ fontSize: 12, marginBottom: 10 }}>
          A un enemigo sólo se le ve de frente. Las demás pestañas se pueden
          dejar vacías.
        </p>
        <SpriteManager avatar={form} onChange={onChange} />
      </div>
    </Modal>
  );
}

/** Astucia por defecto de cada clase, igual que en la API. */
function defaultRate(cls: EnemyClass): number {
  return cls === 'Boss' ? 0.5 : cls === 'Elite' ? 0.35 : 0.1;
}
