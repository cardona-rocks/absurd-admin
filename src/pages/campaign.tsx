import { useCallback, useEffect, useState } from 'react';
import { api, del, patch, post } from '@/lib/api';
import {
  CYCLE_LENGTH,
  ENEMY_CLASSES,
  ENEMY_CLASS_LABELS,
  LEVEL_KINDS,
  LEVEL_KIND_LABELS,
  type CampaignLevel,
  type CampaignOverview,
  type CampaignStats,
  type EnemyClass,
  type EnemyOption,
  type LevelKind,
  type LevelPlan,
} from '@/lib/types';
import { Alert, Field, Modal, Spinner, StatCard } from '@/components/ui';

/**
 * Panel de la campaña.
 *
 * La campaña no tiene final, así que no se editan "los niveles" sino las 20
 * ranuras del ciclo que se repite. La ranura 3 manda sobre los niveles 3, 23,
 * 43… Para hacer especial un nivel suelto están las excepciones.
 */
export function CampaignPage() {
  const [data, setData] = useState<CampaignOverview | null>(null);
  const [stats, setStats] = useState<CampaignStats | null>(null);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState<CampaignLevel | null>(null);
  const [creatingOverride, setCreatingOverride] = useState(false);
  const [previewFrom, setPreviewFrom] = useState(1);
  const [preview, setPreview] = useState<LevelPlan[] | null>(null);

  const load = useCallback(async () => {
    try {
      const [overview, s] = await Promise.all([
        api<CampaignOverview>('/admin/campaign'),
        api<CampaignStats>('/admin/campaign/stats'),
      ]);
      setData(overview);
      setStats(s);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo cargar la campaña');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const loadPreview = useCallback(async (from: number) => {
    setPreview(
      await api<LevelPlan[]>(`/admin/campaign/preview?from=${from}&count=20`),
    );
  }, []);

  useEffect(() => {
    void loadPreview(previewFrom);
  }, [loadPreview, previewFrom]);

  if (!data) return error ? <Alert>{error}</Alert> : <Spinner label="Cargando campaña…" />;

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Campaña</h1>
          <p className="muted">
            Niveles infinitos en ciclos de {data.cycleLength}. Editas el ciclo
            una vez y vale para siempre.
          </p>
        </div>
        <button className="btn btn-red" onClick={() => setCreatingOverride(true)}>
          Nueva excepción
        </button>
      </div>

      {error && <Alert>{error}</Alert>}
      {data.warnings.map((w) => (
        <Alert key={w} kind="warn">
          {w}
        </Alert>
      ))}

      {stats && (
        <div className="grid grid-stats" style={{ marginBottom: 22 }}>
          <StatCard label="Jugadores en campaña" value={stats.players} />
          <StatCard label="Nivel medio" value={stats.averageLevel} />
          <StatCard label="Nivel más alto" value={stats.highestLevel} />
          <StatCard
            label="Bestiario"
            value={data.enemies.length}
            hint={ENEMY_CLASSES.map(
              (c) => `${data.enemyCounts[c] ?? 0} ${ENEMY_CLASS_LABELS[c].toLowerCase()}`,
            ).join(' · ')}
          />
        </div>
      )}

      {/* ------------------------------------------------ ciclo de 20 ranuras */}
      <h2 className="section-title">El ciclo</h2>
      <p className="muted" style={{ marginBottom: 12 }}>
        Cada ranura vale para todos los niveles que caen en ella. La ranura 6
        manda sobre los niveles 6, 26, 46… El jugador nunca ve el ciclo: en la
        app los niveles sólo cuentan hacia arriba y cada vuelta estrena nombres.
      </p>

      <div className="card table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th style={{ width: 70 }}>Ranura</th>
              <th>Etiqueta</th>
              <th>Tipo</th>
              <th>Enemigos</th>
              <th>Corazones</th>
              <th>Jugador</th>
              <th>Elegidos</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {data.cycle.map((slot) => (
              <tr key={slot.slot} className={slot.kind !== 'basic' ? 'row-mark' : ''}>
                <td>
                  <strong>{slot.slot}</strong>
                  {!slot.seeded && (
                    <span className="tag tag-muted" style={{ marginLeft: 6 }}>
                      de fábrica
                    </span>
                  )}
                </td>
                <td>{slot.name || <span className="muted">—</span>}</td>
                <td>
                  <KindTag kind={slot.kind} />
                </td>
                <td>
                  {slot.enemyCount}× {ENEMY_CLASS_LABELS[slot.enemyClass]}
                </td>
                <td>
                  {slot.heartsPerEnemy.join(' / ')} ♥
                  {slot.heartsPerEnemyAlt.length > 0 && (
                    <span className="muted" style={{ fontSize: 12 }}>
                      {' '}
                      · ciclos pares {slot.heartsPerEnemyAlt.join(' / ')} ♥
                    </span>
                  )}
                </td>
                <td>{slot.playerHearts} ♥</td>
                <td>
                  {slot.enemies.length ? (
                    <span className="tag">{slot.enemies.length} fijados</span>
                  ) : (
                    <span className="muted" style={{ fontSize: 12 }}>
                      automáticos
                    </span>
                  )}
                </td>
                <td style={{ textAlign: 'right' }}>
                  <button
                    className="btn btn-sm btn-ghost"
                    onClick={() => setEditing(slot)}
                  >
                    Editar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ------------------------------------------------------- excepciones */}
      <h2 className="section-title" style={{ marginTop: 30 }}>
        Excepciones
      </h2>
      <p className="muted" style={{ marginBottom: 12 }}>
        Niveles sueltos que se salen del ciclo. Mandan sobre la ranura que les
        tocaría.
      </p>

      {data.overrides.length === 0 ? (
        <div className="card" style={{ padding: 18 }}>
          <span className="muted">
            Ninguna. Todos los niveles siguen el ciclo.
          </span>
        </div>
      ) : (
        <div className="card table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th style={{ width: 80 }}>Nivel</th>
                <th>Nombre</th>
                <th>Tipo</th>
                <th>Enemigos</th>
                <th>Corazones</th>
                <th>Estado</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {data.overrides.map((o) => (
                <tr key={o._id}>
                  <td>
                    <strong>{o.level}</strong>
                  </td>
                  <td>{o.name || <span className="muted">—</span>}</td>
                  <td>
                    <KindTag kind={o.kind} />
                  </td>
                  <td>
                    {o.enemyCount}× {ENEMY_CLASS_LABELS[o.enemyClass]}
                  </td>
                  <td>{o.heartsPerEnemy.join(' / ')} ♥</td>
                  <td>
                    {o.enabled ? (
                      <span className="tag">activa</span>
                    ) : (
                      <span className="tag tag-muted">desactivada</span>
                    )}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <button
                      className="btn btn-sm btn-ghost"
                      onClick={() => setEditing(o)}
                    >
                      Editar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ---------------------------------------------------------- simulador */}
      <h2 className="section-title" style={{ marginTop: 30 }}>
        Simulador
      </h2>
      <p className="muted" style={{ marginBottom: 12 }}>
        Qué se va a encontrar el jugador, con el ciclo y las excepciones ya
        aplicados.
      </p>

      <div className="row" style={{ gap: 10, marginBottom: 12 }}>
        <span className="muted">Desde el nivel</span>
        <input
          className="input"
          style={{ width: 110 }}
          type="number"
          min={1}
          value={previewFrom}
          onChange={(e) => setPreviewFrom(Math.max(1, Number(e.target.value)))}
        />
        {[1, 21, 41, 101].map((n) => (
          <button
            key={n}
            className="btn btn-sm btn-ghost"
            onClick={() => setPreviewFrom(n)}
          >
            Ciclo {Math.floor(n / CYCLE_LENGTH) + 1}
          </button>
        ))}
      </div>

      <div className="preview-grid">
        {(preview ?? []).map((p) => (
          <div
            key={p.level}
            className={`card preview-cell ${p.kind !== 'basic' ? 'preview-special' : ''}`}
          >
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <strong>Lv {p.level}</strong>
              {p.source === 'override' && <span className="tag tag-red">excepción</span>}
            </div>
            <div style={{ fontSize: 12, marginTop: 4 }}>
              {LEVEL_KIND_LABELS[p.kind]}
            </div>
            <div className="muted" style={{ fontSize: 12 }}>
              {p.enemyCount}× {ENEMY_CLASS_LABELS[p.enemyClass]} · {p.hearts.join('/')} ♥
            </div>
          </div>
        ))}
      </div>

      {/* ------------------------------------------------ dónde se atasca la gente */}
      {stats && stats.levels.length > 0 && (
        <>
          <h2 className="section-title" style={{ marginTop: 30 }}>
            Dónde se atasca la gente
          </h2>
          <div className="card table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Nivel</th>
                  <th>Intentos</th>
                  <th>Superado</th>
                  <th>Tasa de éxito</th>
                </tr>
              </thead>
              <tbody>
                {stats.levels.map((l) => (
                  <tr key={l.level} className={l.winRate < 35 ? 'row-mark' : ''}>
                    <td>
                      <strong>{l.level}</strong>
                    </td>
                    <td>{l.attempts}</td>
                    <td>{l.wins}</td>
                    <td>
                      {l.winRate}%
                      {l.winRate < 35 && (
                        <span className="tag tag-red" style={{ marginLeft: 8 }}>
                          duro
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {editing && (
        <LevelModal
          level={editing}
          enemies={data.enemies}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            void load();
            void loadPreview(previewFrom);
          }}
        />
      )}

      {creatingOverride && (
        <CreateOverrideModal
          enemies={data.enemies}
          onClose={() => setCreatingOverride(false)}
          onSaved={() => {
            setCreatingOverride(false);
            void load();
            void loadPreview(previewFrom);
          }}
        />
      )}
    </>
  );
}

function KindTag({ kind }: { kind: LevelKind }) {
  const cls = kind === 'boss' ? 'tag-red' : kind === 'basic' ? 'tag-muted' : '';
  return <span className={`tag ${cls}`}>{LEVEL_KIND_LABELS[kind]}</span>;
}

/** Editor común para una ranura del ciclo y para una excepción. */
function LevelModal({
  level,
  enemies,
  onClose,
  onSaved,
}: {
  level: CampaignLevel;
  enemies: EnemyOption[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState(level);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const isOverride = level.level != null;
  const affects = isOverride
    ? `Sólo el nivel ${level.level}.`
    : `Los niveles ${level.slot}, ${level.slot + CYCLE_LENGTH}, ${level.slot + CYCLE_LENGTH * 2}, ${level.slot + CYCLE_LENGTH * 3}…`;

  const save = async () => {
    setError('');
    setBusy(true);
    try {
      const body = {
        name: form.name,
        kind: form.kind,
        enemyClass: form.enemyClass,
        enemyCount: form.enemyCount,
        heartsPerEnemy: form.heartsPerEnemy,
        heartsPerEnemyAlt: form.heartsPerEnemyAlt,
        playerHearts: form.playerHearts,
        enemies: form.enemies,
        enabled: form.enabled,
        notes: form.notes,
      };
      if (isOverride) await patch(`/admin/campaign/overrides/${form._id}`, body);
      else await patch(`/admin/campaign/cycle/${form.slot}`, body);
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo guardar');
    } finally {
      setBusy(false);
    }
  };

  const reset = async () => {
    if (!confirm('¿Devolver esta ranura a los valores de fábrica?')) return;
    await post(`/admin/campaign/cycle/${form.slot}/reset`);
    onSaved();
  };

  const remove = async () => {
    if (!confirm(`¿Borrar la excepción del nivel ${form.level}?`)) return;
    await del(`/admin/campaign/overrides/${form._id}`);
    onSaved();
  };

  return (
    <Modal
      title={isOverride ? `Nivel ${level.level}` : `Ranura ${level.slot} del ciclo`}
      onClose={onClose}
      footer={
        <>
          {isOverride ? (
            <button className="btn btn-ghost btn-sm" onClick={remove}>
              Borrar excepción
            </button>
          ) : (
            <button className="btn btn-ghost btn-sm" onClick={reset}>
              Valores de fábrica
            </button>
          )}
          <div className="grow" />
          <button className="btn btn-ghost btn-sm" onClick={onClose}>
            Cancelar
          </button>
          <button className="btn btn-red btn-sm" disabled={busy} onClick={save}>
            {busy ? 'Guardando…' : 'Guardar'}
          </button>
        </>
      }
    >
      {error && <Alert>{error}</Alert>}
      <Alert kind="warn">Afecta a: {affects}</Alert>

      <LevelFields form={form} setForm={setForm} enemies={enemies} />

      {isOverride && (
        <label className="row" style={{ gap: 8, cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={form.enabled}
            onChange={(e) => setForm({ ...form, enabled: e.target.checked })}
          />
          <span>
            Activa
            <span className="muted"> — desactívala para volver al ciclo sin borrarla</span>
          </span>
        </label>
      )}
    </Modal>
  );
}

function CreateOverrideModal({
  enemies,
  onClose,
  onSaved,
}: {
  enemies: EnemyOption[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [level, setLevel] = useState(21);
  const [form, setForm] = useState<CampaignLevel>({
    _id: null,
    slot: 1,
    level: null,
    name: '',
    kind: 'basic',
    enemyClass: 'Basic',
    enemyCount: 1,
    heartsPerEnemy: [3],
    heartsPerEnemyAlt: [],
    playerHearts: 3,
    enemies: [],
    enabled: true,
    notes: '',
  });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setError('');
    setBusy(true);
    try {
      await post('/admin/campaign/overrides', {
        level,
        name: form.name,
        kind: form.kind,
        enemyClass: form.enemyClass,
        enemyCount: form.enemyCount,
        heartsPerEnemy: form.heartsPerEnemy,
        playerHearts: form.playerHearts,
        enemies: form.enemies,
        notes: form.notes,
      });
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo crear');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      title="Nueva excepción"
      onClose={onClose}
      footer={
        <>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>
            Cancelar
          </button>
          <button className="btn btn-red btn-sm" disabled={busy} onClick={submit}>
            {busy ? 'Creando…' : 'Crear'}
          </button>
        </>
      }
    >
      {error && <Alert>{error}</Alert>}
      <Alert kind="warn">
        Una excepción manda sobre la ranura del ciclo que le tocaría a ese nivel.
        Úsala para hacer especial un nivel suelto.
      </Alert>

      <Field
        label="Nivel"
        hint={`Le tocaría la ranura ${((level - 1) % CYCLE_LENGTH) + 1} del ciclo ${Math.floor((level - 1) / CYCLE_LENGTH) + 1}.`}
      >
        <input
          className="input"
          type="number"
          min={1}
          value={level}
          onChange={(e) => setLevel(Math.max(1, Number(e.target.value)))}
        />
      </Field>

      <LevelFields form={form} setForm={setForm} enemies={enemies} />
    </Modal>
  );
}

/** Los campos que comparten el editor de ranura y el de excepción. */
function LevelFields({
  form,
  setForm,
  enemies,
}: {
  form: CampaignLevel;
  setForm: (l: CampaignLevel) => void;
  enemies: EnemyOption[];
}) {
  /** Ajusta la lista de corazones al número de enemigos, repitiendo el último. */
  const setCount = (n: number) => {
    const count = Math.min(5, Math.max(1, n));
    const hearts = Array.from(
      { length: count },
      (_, i) => form.heartsPerEnemy[i] ?? form.heartsPerEnemy.at(-1) ?? 3,
    );
    setForm({
      ...form,
      enemyCount: count,
      heartsPerEnemy: hearts,
      // Los enemigos fijados que sobran se descartan.
      enemies: form.enemies.slice(0, count),
    });
  };

  const setHeart = (i: number, v: number) => {
    const hearts = [...form.heartsPerEnemy];
    hearts[i] = Math.min(12, Math.max(1, v));
    setForm({ ...form, heartsPerEnemy: hearts });
  };

  const setPick = (i: number, id: string) => {
    const picks = [...form.enemies];
    if (id) picks[i] = id;
    else picks.splice(i, 1);
    setForm({ ...form, enemies: picks.filter(Boolean) });
  };

  const candidates = enemies.filter(
    (e) => e.class === form.enemyClass && !e.retired,
  );

  return (
    <>
      <Field
        label={form.level == null ? 'Etiqueta interna' : 'Nombre'}
        hint={
          form.level == null
            ? 'Sólo para el panel. Al jugador se le enseña un nombre distinto en cada vuelta, para que no note que los niveles se repiten.'
            : "Lo ve el jugador. Vacío usa 'Nivel N'."
        }
      >
        <input
          className="input"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          placeholder={form.level == null ? 'Ranura del jefe' : 'La emboscada'}
        />
      </Field>

      <div className="row" style={{ gap: 12, alignItems: 'flex-start' }}>
        <div className="grow">
          <Field label="Tipo de combate">
            <select
              className="select"
              value={form.kind}
              onChange={(e) => {
                const kind = e.target.value as LevelKind;
                // El tipo sugiere la clase de enemigo, pero se puede cambiar.
                const enemyClass: EnemyClass =
                  kind === 'boss' ? 'Boss' : kind === 'elite' ? 'Elite' : 'Basic';
                setForm({ ...form, kind, enemyClass });
              }}
            >
              {LEVEL_KINDS.map((k) => (
                <option key={k} value={k}>
                  {LEVEL_KIND_LABELS[k]}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <div className="grow">
          <Field label="Clase de enemigo">
            <select
              className="select"
              value={form.enemyClass}
              onChange={(e) =>
                setForm({
                  ...form,
                  enemyClass: e.target.value as EnemyClass,
                  enemies: [],
                })
              }
            >
              {ENEMY_CLASSES.map((c) => (
                <option key={c} value={c}>
                  {ENEMY_CLASS_LABELS[c]} ({enemies.filter((x) => x.class === c).length})
                </option>
              ))}
            </select>
          </Field>
        </div>
        <div className="grow">
          <Field label="Cuántos" hint="Se pelean de uno en uno.">
            <input
              className="input"
              type="number"
              min={1}
              max={5}
              value={form.enemyCount}
              onChange={(e) => setCount(Number(e.target.value))}
            />
          </Field>
        </div>
      </div>

      <Field label="Corazones de cada enemigo">
        <div className="row" style={{ gap: 8 }}>
          {form.heartsPerEnemy.slice(0, form.enemyCount).map((h, i) => (
            <input
              key={i}
              className="input"
              style={{ width: 80 }}
              type="number"
              min={1}
              max={12}
              value={h}
              onChange={(e) => setHeart(i, Number(e.target.value))}
            />
          ))}
        </div>
      </Field>

      {form.level == null && (
        <Field
          label="Corazones en los ciclos pares"
          hint="La horquilla del diseño: élite 4 o 5, jefe 6 o 7. Vacío = igual en todos los ciclos."
        >
          <div className="row" style={{ gap: 8 }}>
            {Array.from({ length: form.enemyCount }, (_, i) => (
              <input
                key={i}
                className="input"
                style={{ width: 80 }}
                type="number"
                min={0}
                max={12}
                value={form.heartsPerEnemyAlt[i] ?? ''}
                placeholder="—"
                onChange={(e) => {
                  const alt = [...form.heartsPerEnemyAlt];
                  const v = Number(e.target.value);
                  if (!e.target.value || v <= 0) alt.splice(i, 1);
                  else alt[i] = Math.min(12, v);
                  setForm({ ...form, heartsPerEnemyAlt: alt.filter(Boolean) });
                }}
              />
            ))}
          </div>
        </Field>
      )}

      <Field label="Corazones del jugador">
        <input
          className="input"
          style={{ width: 100 }}
          type="number"
          min={1}
          max={10}
          value={form.playerHearts}
          onChange={(e) =>
            setForm({ ...form, playerHearts: Math.max(1, Number(e.target.value)) })
          }
        />
      </Field>

      <Field
        label="Qué enemigos salen"
        hint="Déjalo en automático para que la campaña elija los de nivel más cercano; así el bestiario se renueva solo en los ciclos altos."
      >
        <div className="stack" style={{ gap: 8 }}>
          {Array.from({ length: form.enemyCount }, (_, i) => (
            <select
              key={i}
              className="select"
              value={form.enemies[i] ?? ''}
              onChange={(e) => setPick(i, e.target.value)}
            >
              <option value="">Enemigo {i + 1}: automático</option>
              {candidates.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.name} (Lv {c.level}){c.ready ? '' : ' — sin imagen'}
                </option>
              ))}
            </select>
          ))}
        </div>
      </Field>

      <Field label="Nota interna" hint="No la ve nadie fuera del panel.">
        <input
          className="input"
          value={form.notes}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
        />
      </Field>
    </>
  );
}
