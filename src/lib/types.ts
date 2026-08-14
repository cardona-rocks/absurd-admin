export const CATEGORIES = [
  'Basic',
  'Rare',
  'Epic',
  'Legendary',
  'Hidden',
  'Unique',
  'Limited',
  'Whalegrade',
  'Enemy',
] as const;
export type Category = (typeof CATEGORIES)[number];

/** Las que un jugador puede tener. 'Enemy' es del sistema y no se vende. */
export const PLAYABLE_CATEGORIES = CATEGORIES.filter((c) => c !== 'Enemy');

// ------------------------------------------------------------------ campaña

/** Clase de un enemigo dentro de la campaña. */
export const ENEMY_CLASSES = ['Basic', 'Elite', 'Boss'] as const;
export type EnemyClass = (typeof ENEMY_CLASSES)[number];

export const ENEMY_CLASS_LABELS: Record<EnemyClass, string> = {
  Basic: 'Común',
  Elite: 'Élite',
  Boss: 'Jefe',
};

export const LEVEL_KINDS = ['basic', 'gauntlet', 'elite', 'boss'] as const;
export type LevelKind = (typeof LEVEL_KINDS)[number];

export const LEVEL_KIND_LABELS: Record<LevelKind, string> = {
  basic: 'Normal',
  gauntlet: 'Gauntlet',
  elite: 'Élite',
  boss: 'Jefe',
};

/** Un ciclo de campaña dura 20 niveles y se repite para siempre. */
export const CYCLE_LENGTH = 20;

export interface EnemyFields {
  level: number;
  hearts: number;
  class: EnemyClass;
  /** null = usa el valor por defecto de su clase. */
  counterRate: number | null;
}

export interface CampaignLevel {
  _id: string | null;
  slot: number;
  /** null = plantilla del ciclo; un número = excepción para ese nivel. */
  level: number | null;
  name: string;
  kind: LevelKind;
  enemyClass: EnemyClass;
  enemyCount: number;
  heartsPerEnemy: number[];
  heartsPerEnemyAlt: number[];
  playerHearts: number;
  enemies: string[];
  enabled: boolean;
  notes: string;
  /** Sólo en las ranuras del ciclo: si existe ya en la base o es de fábrica. */
  seeded?: boolean;
}

export interface EnemyOption {
  _id: string;
  name: string;
  slug: string;
  class: EnemyClass;
  level: number;
  hearts: number;
  counterRate: number | null;
  retired: boolean;
  /** Tiene al menos una imagen de frente. */
  ready: boolean;
}

export interface CampaignOverview {
  cycleLength: number;
  cycle: CampaignLevel[];
  overrides: CampaignLevel[];
  enemies: EnemyOption[];
  enemyCounts: Record<EnemyClass, number>;
  warnings: string[];
}

export interface LevelPlan {
  level: number;
  slot: number;
  cycle: number;
  name: string;
  kind: LevelKind;
  enemyClass: EnemyClass;
  enemyCount: number;
  hearts: number[];
  playerHearts: number;
  enemyIds: string[];
  source: 'override' | 'template' | 'default';
}

export interface CampaignStats {
  players: number;
  averageLevel: number;
  highestLevel: number;
  levels: { level: number; attempts: number; wins: number; winRate: number }[];
  recent: {
    _id: string;
    level: number;
    levelName: string;
    kind: LevelKind;
    won: boolean;
    creditsEarned: number;
    finishedAt: string;
    userId?: { name: string } | string;
  }[];
}

export const SPRITE_TYPES = ['front', 'back', 'default', 'win', 'lose'] as const;
export type SpriteType = (typeof SPRITE_TYPES)[number];

/** Los que hacen falta para poder dibujar un combate. */
export const REQUIRED_SPRITE_TYPES: SpriteType[] = ['front', 'back'];

export const SPRITE_LABELS: Record<SpriteType, string> = {
  front: 'Frente',
  back: 'Espalda',
  default: 'Reposo',
  win: 'Victoria',
  lose: 'Derrota',
};

export const SPRITE_HINTS: Record<SpriteType, string> = {
  front: 'El rival, visto de cara en la esquina superior.',
  back: 'Tu personaje, de espaldas en la esquina inferior.',
  default: 'Pose de reposo para tarjetas y menús.',
  win: 'Celebración al ganar el combate.',
  lose: 'Reacción al perder el combate.',
};

export const ROLES = ['player', 'moderator', 'admin'] as const;
export type Role = (typeof ROLES)[number];

export const ROLE_LABELS: Record<Role, string> = {
  player: 'Jugador',
  moderator: 'Moderador',
  admin: 'Administrador',
};

export interface SpriteImage {
  url: string;
  filename: string;
  order: number;
  width: number;
  height: number;
  size: number;
}

export type Sprites = Record<SpriteType, SpriteImage[]>;

export interface Avatar {
  _id: string;
  name: string;
  slug: string;
  description: string;
  tagline: string;
  ability: string;
  category: Category;
  price: number;
  order: number;
  hidden: boolean;
  retired: boolean;
  sprites: Sprites;
  stats: { wins: number; loses: number; draws: number };
  /** Cuántos jugadores lo tienen; solo llega en el listado. */
  ownedBy?: number;
  /** Ficha de combate. Sólo la tienen los de categoría 'Enemy'. */
  enemy?: EnemyFields | null;
  /** Listo para salir a pelear (tiene imagen de frente); sólo en el listado. */
  ready?: boolean;
}

export interface AdminUser {
  _id: string;
  name: string;
  email: string;
  age: number | null;
  role: Role;
  banned: boolean;
  bannedReason: string | null;
  bannedAt: string | null;
  moderationNote: string;
  credits: number;
  isGuest: boolean;
  createdAt: string;
  avatar?: { _id: string; name: string; slug: string; category: Category } | null;
  collection?: {
    avatar: { _id: string; name: string; slug: string; price: number } | string;
    price: number;
    timestamp: string;
  }[];
  stats: {
    wins: number;
    draws: number;
    loses: number;
    matchesPlayed: number;
    roundsWon: number;
    perfectWins: number;
    creditsEarned: number;
  };
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pages: number;
}

export interface Overview {
  users: { total: number; guests: number; banned: number; newThisWeek: number };
  avatars: { total: number; hidden: number };
  matches: { total: number; today: number; live: number; searching: number };
  tournaments: { active: number };
  economy: { creditsInCirculation: number };
}

export interface AuditEntry {
  _id: string;
  actor: { _id: string; name: string; email: string } | null;
  actorName: string;
  action: string;
  entity: string;
  entityId: string | null;
  summary: string;
  meta: Record<string, unknown>;
  createdAt: string;
}

export interface Me {
  _id: string;
  name: string;
  email: string;
  role: Role;
  mustChangePassword: boolean;
}

export interface TopAvatar {
  avatarId: string;
  name: string;
  slug: string;
  category: Category;
  price: number;
  purchases: number;
}

/** Un avatar visible necesita imágenes de frente y espalda. */
export function missingRequiredSprites(avatar: {
  sprites: Sprites;
}): SpriteType[] {
  return REQUIRED_SPRITE_TYPES.filter(
    (t) => (avatar.sprites?.[t]?.length ?? 0) === 0,
  );
}

export function emptySprites(): Sprites {
  return { front: [], back: [], default: [], win: [], lose: [] };
}
