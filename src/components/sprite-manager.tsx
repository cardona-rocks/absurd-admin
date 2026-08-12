import { useRef, useState } from 'react';
import { assetUrl, del, patch, upload } from '@/lib/api';
import {
  REQUIRED_SPRITE_TYPES,
  SPRITE_HINTS,
  SPRITE_LABELS,
  SPRITE_TYPES,
  type Avatar,
  type SpriteType,
} from '@/lib/types';
import { Alert } from './ui';

/**
 * Gestión de sprites de un avatar.
 *
 * Cada tipo admite varias imágenes para poder animar; el orden de la lista es
 * el orden de los fotogramas y se puede reordenar con las flechas.
 */
export function SpriteManager({
  avatar,
  onChange,
}: {
  avatar: Avatar;
  onChange: (updated: Avatar) => void;
}) {
  const [error, setError] = useState('');

  return (
    <div>
      {error && <Alert>{error}</Alert>}
      {SPRITE_TYPES.map((type) => (
        <SpriteGroup
          key={type}
          avatar={avatar}
          type={type}
          onChange={onChange}
          onError={setError}
        />
      ))}
    </div>
  );
}

function SpriteGroup({
  avatar,
  type,
  onChange,
  onError,
}: {
  avatar: Avatar;
  type: SpriteType;
  onChange: (a: Avatar) => void;
  onError: (msg: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const images = avatar.sprites?.[type] ?? [];
  const required = REQUIRED_SPRITE_TYPES.includes(type);
  const missing = required && images.length === 0;

  const send = async (files: File[]) => {
    const images = files.filter((f) => f.type.startsWith('image/'));
    if (!images.length) return;
    onError('');
    setBusy(true);
    try {
      onChange(
        await upload<Avatar>(`/admin/avatars/${avatar._id}/sprites/${type}`, images),
      );
    } catch (e) {
      onError(e instanceof Error ? e.message : 'No se pudo subir la imagen');
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const remove = async (filename: string) => {
    onError('');
    setBusy(true);
    try {
      onChange(
        await del<Avatar>(
          `/admin/avatars/${avatar._id}/sprites/${type}/${encodeURIComponent(filename)}`,
        ),
      );
    } catch (e) {
      onError(e instanceof Error ? e.message : 'No se pudo borrar la imagen');
    } finally {
      setBusy(false);
    }
  };

  /** Mueve un fotograma una posición y persiste el orden completo. */
  const move = async (index: number, delta: number) => {
    const next = [...images];
    const target = index + delta;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];

    onError('');
    setBusy(true);
    try {
      onChange(
        await patch<Avatar>(`/admin/avatars/${avatar._id}/sprites/${type}/order`, {
          filenames: next.map((s) => s.filename),
        }),
      );
    } catch (e) {
      onError(e instanceof Error ? e.message : 'No se pudo reordenar');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="card sprite-group">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <div>
          <div className="row" style={{ gap: 8 }}>
            <h3 style={{ fontSize: 16 }}>{SPRITE_LABELS[type]}</h3>
            {required ? (
              <span className="tag tag-red">obligatorio</span>
            ) : (
              <span className="tag tag-muted">opcional</span>
            )}
            {images.length > 1 && (
              <span className="tag tag-green">{images.length} fotogramas</span>
            )}
          </div>
          <div className="muted" style={{ fontSize: 12.5, marginTop: 3 }}>
            {SPRITE_HINTS[type]}
          </div>
        </div>
        <button
          className="btn btn-sm"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
        >
          {busy ? 'Subiendo…' : 'Añadir'}
        </button>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        multiple
        hidden
        onChange={(e) => send(Array.from(e.target.files ?? []))}
      />

      {missing && (
        <div style={{ marginTop: 12 }}>
          <Alert kind="warn">
            Hace falta al menos una imagen para poder mostrar el avatar en combate.
          </Alert>
        </div>
      )}

      {images.length > 0 && (
        <div className="sprite-list">
          {images.map((img, i) => (
            <div className="sprite-thumb" key={img.filename || img.url}>
              {images.length > 1 && <span className="order-badge">{i + 1}</span>}
              <img src={assetUrl(img.url)} alt={`${SPRITE_LABELS[type]} ${i + 1}`} />
              <div className="sprite-actions">
                {images.length > 1 && (
                  <>
                    <button
                      className="icon-btn"
                      disabled={busy || i === 0}
                      title="Mover antes"
                      onClick={() => move(i, -1)}
                    >
                      ←
                    </button>
                    <button
                      className="icon-btn"
                      disabled={busy || i === images.length - 1}
                      title="Mover después"
                      onClick={() => move(i, 1)}
                    >
                      →
                    </button>
                  </>
                )}
                <button
                  className="icon-btn"
                  disabled={busy}
                  title="Borrar"
                  onClick={() => remove(img.filename)}
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div
        className={`dropzone ${dragOver ? 'over' : ''}`}
        style={{ marginTop: 12 }}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          send(Array.from(e.dataTransfer.files));
        }}
      >
        Arrastra imágenes aquí o haz clic para elegirlas · PNG, JPG, WEBP o GIF ·
        máximo 4 MB
      </div>
    </div>
  );
}
