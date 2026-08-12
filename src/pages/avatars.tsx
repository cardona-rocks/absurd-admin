import { useCallback, useEffect, useState } from 'react';
import { api, assetUrl, del, patch, post } from '@/lib/api';
import {
  CATEGORIES,
  missingRequiredSprites,
  SPRITE_LABELS,
  type Avatar,
  type Category,
  type Paginated,
} from '@/lib/types';
import { SpriteManager } from '@/components/sprite-manager';
import {
  Alert,
  CategoryTag,
  EmptyState,
  Field,
  Modal,
  Pagination,
  Spinner,
  num,
} from '@/components/ui';
import { useAuth } from '@/context/auth';

/** Sugiere un slug a partir del nombre. */
function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
}

export function AvatarsPage() {
  const { isAdmin } = useAuth();
  const [data, setData] = useState<Paginated<Avatar> | null>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<'' | Category>('');
  const [error, setError] = useState('');
  const [editing, setEditing] = useState<Avatar | null>(null);
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    setError('');
    try {
      const params = new URLSearchParams({ page: String(page), limit: '50' });
      if (search) params.set('search', search);
      if (category) params.set('category', category);
      setData(await api<Paginated<Avatar>>(`/admin/avatars?${params}`));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudieron cargar los avatares');
    }
  }, [page, search, category]);

  useEffect(() => {
    load();
  }, [load]);

  const remove = async (avatar: Avatar) => {
    if (!confirm(`¿Borrar "${avatar.name}"? Esta acción no se puede deshacer.`)) return;
    try {
      await del(`/admin/avatars/${avatar._id}`);
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo borrar');
    }
  };

  return (
    <>
      <div className="page-head">
        <div>
          <h1 style={{ fontSize: 30 }}>Avatares</h1>
          <div className="muted">
            {data ? `${num(data.total)} en el catálogo` : 'Cargando…'}
          </div>
        </div>
        <button className="btn btn-red" onClick={() => setCreating(true)}>
          + Nuevo avatar
        </button>
      </div>

      <div className="card" style={{ padding: 14, marginBottom: 18 }}>
        <div className="row" style={{ flexWrap: 'wrap', gap: 12 }}>
          <input
            className="input grow"
            style={{ minWidth: 200 }}
            placeholder="Buscar por nombre o slug…"
            value={search}
            onChange={(e) => {
              setPage(1);
              setSearch(e.target.value);
            }}
          />
          <select
            className="select"
            style={{ width: 190 }}
            value={category}
            onChange={(e) => {
              setPage(1);
              setCategory(e.target.value as '' | Category);
            }}
          >
            <option value="">Todas las categorías</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && <Alert>{error}</Alert>}

      {!data ? (
        <Spinner />
      ) : data.items.length === 0 ? (
        <EmptyState
          title="No hay avatares"
          hint="Crea el primero con el botón de arriba."
        />
      ) : (
        <>
          <div className="grid grid-avatars">
            {data.items.map((avatar) => (
              <AvatarCard
                key={avatar._id}
                avatar={avatar}
                canDelete={isAdmin}
                onEdit={() => setEditing(avatar)}
                onDelete={() => remove(avatar)}
              />
            ))}
          </div>
          <Pagination page={data.page} pages={data.pages} onChange={setPage} />
        </>
      )}

      {creating && (
        <CreateAvatarModal
          onClose={() => setCreating(false)}
          onCreated={(a) => {
            setCreating(false);
            load();
            // Se abre el editor para subir las imágenes obligatorias.
            setEditing(a);
          }}
        />
      )}

      {editing && (
        <EditAvatarModal
          avatar={editing}
          onClose={() => {
            setEditing(null);
            load();
          }}
          onChange={setEditing}
        />
      )}
    </>
  );
}

function AvatarCard({
  avatar,
  canDelete,
  onEdit,
  onDelete,
}: {
  avatar: Avatar;
  canDelete: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const preview =
    avatar.sprites?.default?.[0] ??
    avatar.sprites?.front?.[0] ??
    avatar.sprites?.back?.[0];
  const missing = missingRequiredSprites(avatar);

  return (
    <div className="card" style={{ padding: 14 }}>
      <div className="row" style={{ justifyContent: 'space-between', marginBottom: 8 }}>
        <CategoryTag category={avatar.category} />
        <div className="row" style={{ gap: 5 }}>
          {avatar.hidden && <span className="tag tag-muted">oculto</span>}
          {avatar.retired && <span className="tag tag-muted">retirado</span>}
        </div>
      </div>

      <div
        style={{
          height: 132,
          background: 'var(--paper)',
          borderRadius: 10,
          display: 'grid',
          placeItems: 'center',
          overflow: 'hidden',
          marginBottom: 10,
        }}
      >
        {preview ? (
          <img
            src={assetUrl(preview.url)}
            alt={avatar.name}
            style={{ maxHeight: '100%', maxWidth: '100%', objectFit: 'contain' }}
          />
        ) : (
          <span className="muted" style={{ fontSize: 12 }}>
            sin imagen
          </span>
        )}
      </div>

      <h3 style={{ fontSize: 16 }}>{avatar.name}</h3>
      <div className="muted" style={{ fontSize: 12, marginBottom: 8 }}>
        {avatar.slug} · ¢{num(avatar.price)}
        {avatar.ownedBy !== undefined && ` · ${num(avatar.ownedBy)} jugadores`}
      </div>

      {missing.length > 0 && !avatar.hidden && (
        <div
          style={{
            fontSize: 11.5,
            fontWeight: 700,
            color: 'var(--red)',
            marginBottom: 8,
          }}
        >
          Faltan: {missing.map((m) => SPRITE_LABELS[m]).join(', ')}
        </div>
      )}

      <div className="row" style={{ gap: 8 }}>
        <button className="btn btn-sm grow" onClick={onEdit}>
          Editar
        </button>
        {canDelete && (
          <button
            className="btn btn-sm btn-ghost"
            onClick={onDelete}
            title={
              avatar.ownedBy
                ? 'Tiene dueños: retíralo en vez de borrarlo'
                : 'Borrar'
            }
          >
            ✕
          </button>
        )}
      </div>
    </div>
  );
}

function CreateAvatarModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (a: Avatar) => void;
}) {
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [slugTouched, setSlugTouched] = useState(false);
  const [category, setCategory] = useState<Category>('Basic');
  const [price, setPrice] = useState(500);
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const effectiveSlug = slugTouched ? slug : slugify(name);
  const valid = name.trim().length >= 2 && effectiveSlug.length >= 2;

  const submit = async () => {
    setError('');
    setBusy(true);
    try {
      // Nace oculto: así se puede guardar sin tener aún las imágenes.
      const created = await post<Avatar>('/admin/avatars', {
        name: name.trim(),
        slug: effectiveSlug,
        category,
        price,
        description,
        hidden: true,
      });
      onCreated(created);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo crear');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      title="Nuevo avatar"
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
            {busy ? 'Creando…' : 'Crear y subir imágenes'}
          </button>
        </>
      }
    >
      {error && <Alert>{error}</Alert>}

      <Alert kind="warn">
        Se creará oculto. Súbele las imágenes de Frente y Espalda y luego márcalo
        como visible.
      </Alert>

      <Field label="Nombre">
        <input
          className="input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="El Melenas"
        />
      </Field>

      <Field
        label="Slug"
        hint="Identificador en minúsculas. La app lo usa para la ilustración local."
      >
        <input
          className="input"
          value={effectiveSlug}
          onChange={(e) => {
            setSlugTouched(true);
            setSlug(slugify(e.target.value));
          }}
          placeholder="melenas"
        />
      </Field>

      <div className="row" style={{ gap: 12, alignItems: 'flex-start' }}>
        <div className="grow">
          <Field label="Categoría">
            <select
              className="select"
              value={category}
              onChange={(e) => setCategory(e.target.value as Category)}
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <div className="grow">
          <Field label="Coste en créditos">
            <input
              className="input"
              type="number"
              min={0}
              value={price}
              onChange={(e) => setPrice(Number(e.target.value))}
            />
          </Field>
        </div>
      </div>

      <Field label="Descripción">
        <textarea
          className="textarea"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="León con tijeras. Realeza decadente con buen pulso."
        />
      </Field>
    </Modal>
  );
}

function EditAvatarModal({
  avatar,
  onClose,
  onChange,
}: {
  avatar: Avatar;
  onClose: () => void;
  onChange: (a: Avatar) => void;
}) {
  const [form, setForm] = useState(avatar);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  // Si el gestor de sprites actualiza el avatar, refrescamos el formulario.
  useEffect(() => {
    setForm((f) => ({ ...avatar, ...pickEditable(f) }));
  }, [avatar]);

  const missing = missingRequiredSprites(avatar);
  const blockedFromPublishing = missing.length > 0 && !form.hidden;

  const save = async () => {
    setError('');
    setBusy(true);
    try {
      const updated = await patch<Avatar>(`/admin/avatars/${avatar._id}`, {
        name: form.name,
        slug: form.slug,
        description: form.description,
        tagline: form.tagline,
        ability: form.ability,
        category: form.category,
        price: form.price,
        order: form.order,
        hidden: form.hidden,
        retired: form.retired,
      });
      onChange(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo guardar');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="scrim" onClick={onClose}>
      <div
        className="modal"
        style={{ maxWidth: 720 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="row" style={{ justifyContent: 'space-between', marginBottom: 16 }}>
          <h2 style={{ fontSize: 21 }}>{avatar.name}</h2>
          <button className="icon-btn" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="stack">
          {error && <Alert>{error}</Alert>}
          {saved && <Alert kind="ok">Cambios guardados.</Alert>}
          {blockedFromPublishing && (
            <Alert kind="warn">
              Para que sea visible necesita al menos una imagen de{' '}
              {missing.map((m) => SPRITE_LABELS[m]).join(' y ')}.
            </Alert>
          )}

          <Field label="Nombre">
            <input
              className="input"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </Field>

          <Field label="Slug">
            <input
              className="input"
              value={form.slug}
              onChange={(e) => setForm({ ...form, slug: slugify(e.target.value) })}
            />
          </Field>

          <Field label="Descripción">
            <textarea
              className="textarea"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </Field>

          <div className="row" style={{ gap: 12, alignItems: 'flex-start' }}>
            <div className="grow">
              <Field label="Frase corta">
                <input
                  className="input"
                  value={form.tagline}
                  onChange={(e) => setForm({ ...form, tagline: e.target.value })}
                />
              </Field>
            </div>
            <div className="grow">
              <Field label="Habilidad">
                <input
                  className="input"
                  value={form.ability}
                  onChange={(e) => setForm({ ...form, ability: e.target.value })}
                />
              </Field>
            </div>
          </div>

          <div className="row" style={{ gap: 12, alignItems: 'flex-start' }}>
            <div className="grow">
              <Field label="Categoría">
                <select
                  className="select"
                  value={form.category}
                  onChange={(e) =>
                    setForm({ ...form, category: e.target.value as Category })
                  }
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
            <div className="grow">
              <Field label="Coste">
                <input
                  className="input"
                  type="number"
                  min={0}
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: Number(e.target.value) })}
                />
              </Field>
            </div>
            <div className="grow">
              <Field label="Orden">
                <input
                  className="input"
                  type="number"
                  value={form.order}
                  onChange={(e) => setForm({ ...form, order: Number(e.target.value) })}
                />
              </Field>
            </div>
          </div>

          <div className="row" style={{ gap: 20 }}>
            <label className="row" style={{ gap: 8, fontWeight: 700, fontSize: 14 }}>
              <input
                type="checkbox"
                checked={form.hidden}
                onChange={(e) => setForm({ ...form, hidden: e.target.checked })}
              />
              Oculto en la tienda
            </label>
            <label className="row" style={{ gap: 8, fontWeight: 700, fontSize: 14 }}>
              <input
                type="checkbox"
                checked={form.retired}
                onChange={(e) => setForm({ ...form, retired: e.target.checked })}
              />
              Retirado (no se puede comprar)
            </label>
          </div>

          <button
            className="btn btn-red"
            onClick={save}
            disabled={busy || blockedFromPublishing}
          >
            {busy ? 'Guardando…' : 'Guardar cambios'}
          </button>

          <div>
            <div className="eyebrow" style={{ marginBottom: 10, marginTop: 6 }}>
              sprites
            </div>
            <SpriteManager avatar={avatar} onChange={onChange} />
          </div>
        </div>
      </div>
    </div>
  );
}

/** Campos del formulario que no deben pisarse al refrescar desde el servidor. */
function pickEditable(a: Avatar) {
  return {
    name: a.name,
    slug: a.slug,
    description: a.description,
    tagline: a.tagline,
    ability: a.ability,
    category: a.category,
    price: a.price,
    order: a.order,
    hidden: a.hidden,
    retired: a.retired,
  };
}
