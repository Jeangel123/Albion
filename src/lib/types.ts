export type Profile = {
  id: string;
  username: string;
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  banner_url: string | null;
  custom_link: string | null;
  guild_id: string | null;
  discord: string | null;
  instagram: string | null;
  facebook: string | null;
  youtube: string | null;
  twitch: string | null;
  is_verified: boolean;
  is_suspended: boolean;
  role: 'user' | 'admin';
  created_at: string;
  updated_at: string;
};

export type Guild = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  avatar_url: string | null;
  banner_url: string | null;
  language: string | null;
  home_city: string | null;
  activities: string[];
  schedule: string | null;
  requirements: string | null;
  member_count: number;
  alliance_id: string | null;
  discord_url: string | null;
  apply_url: string | null;
  is_featured: boolean;
  is_verified: boolean;
  owner_id: string;
  created_at: string;
  updated_at: string;
};

export type Alliance = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  avatar_url: string | null;
  banner_url: string | null;
  discord_url: string | null;
  owner_id: string;
  created_at: string;
  updated_at: string;
};

export type GuildMember = {
  id: string;
  guild_id: string;
  user_id: string;
  role: 'leader' | 'officer' | 'member';
  joined_at: string;
};

export type PostType = 'text' | 'image' | 'video' | 'link' | 'poll';

export type Post = {
  id: string;
  author_id: string;
  guild_id: string | null;
  type: PostType;
  content: string | null;
  media_urls: string[];
  link_url: string | null;
  is_public: boolean;
  is_approved: boolean;
  is_pinned: boolean;
  is_news: boolean;
  like_count: number;
  comment_count: number;
  share_count: number;
  created_at: string;
  updated_at: string;
};

export type Comment = {
  id: string;
  post_id: string;
  author_id: string;
  content: string;
  parent_id: string | null;
  created_at: string;
};

export type ReactionType = 'like' | 'love' | 'haha' | 'wow' | 'sad' | 'angry';

export type AlbionEvent = {
  id: string;
  guild_id: string | null;
  author_id: string;
  title: string;
  description: string | null;
  type: string;
  start_time: string;
  end_time: string | null;
  location: string | null;
  created_at: string;
};

export type Notification = {
  id: string;
  user_id: string;
  actor_id: string | null;
  type: string;
  content: string | null;
  target_type: string | null;
  target_id: string | null;
  is_read: boolean;
  created_at: string;
};

export type AppConfig = {
  id: number;
  maintenance_mode: boolean;
  maintenance_message: string | null;
  announcement: string | null;
  announcement_active: boolean;
  community_rules: string | null;
};

export const ACTIVITIES = [
  'PvP', 'PvE', 'Avalon', 'ZvZ', 'Gankeo', 'Facción', 'Recolección', 'Economía', 'GvG', 'HCE', 'Crafting', 'Mercados',
] as const;

export const EVENT_TYPES = [
  { key: 'zvz', label: 'ZvZ', color: 'bg-red-500' },
  { key: 'avalon', label: 'Avalon', color: 'bg-emerald-500' },
  { key: 'hce', label: 'HCE', color: 'bg-amber-500' },
  { key: 'dungeon', label: 'Mazmorras', color: 'bg-indigo-500' },
  { key: 'roads', label: 'Roads', color: 'bg-sky-500' },
  { key: 'gank', label: 'Gankeos', color: 'bg-rose-500' },
  { key: 'gathering', label: 'Recolección', color: 'bg-lime-500' },
  { key: 'training', label: 'Entrenamientos', color: 'bg-violet-500' },
] as const;

export const REACTIONS: { key: ReactionType; emoji: string; label: string }[] = [
  { key: 'like', emoji: '👍', label: 'Me gusta' },
  { key: 'love', emoji: '❤️', label: 'Me encanta' },
  { key: 'haha', emoji: '😂', label: 'Me divierte' },
  { key: 'wow', emoji: '😮', label: 'Me asombra' },
  { key: 'sad', emoji: '😢', label: 'Me entristece' },
  { key: 'angry', emoji: '😡', label: 'Me enoja' },
];
