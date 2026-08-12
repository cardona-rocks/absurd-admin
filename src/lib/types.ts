export const CATEGORIES = [
  'Basic',
  'Rare',
  'Epic',
  'Legendary',
  'Hidden',
  'Unique',
  'Limited',
  'Whalegrade',
] as const;
export type Category = (typeof CATEGORIES)[number];

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
