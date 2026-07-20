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
  is_featured: boolean;
  is_suspended: boolean;
  role: 'user' | 'admin' | 'supreme_admin' | 'moderator' | 'founder';
  reputation_points: number;
  season_points: number;
  medieval_rank: MedievalRank;
  equipped_frame_id: string | null;
  language: string | null;
  onboarding_completed: boolean;
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
  is_boosted: boolean;
  boosted_until: string | null;
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
  is_boosted: boolean;
  boosted_until: string | null;
  like_count: number;
  comment_count: number;
  share_count: number;
  tags: string[];
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

export type Message = {
  id: string;
  room_id: string;
  sender_id: string;
  content: string | null;
  media_url: string | null;
  created_at: string;
  guild_id?: string | null;
  reply_to?: string | null;
  message_type?: 'text' | 'image' | 'audio' | 'system';
  audio_duration_sec?: number | null;
};

export type MessageReaction = {
  id: string;
  message_id: string;
  user_id: string;
  type: ReactionType;
  created_at: string;
};

export type MessageRead = {
  id: string;
  user_id: string;
  guild_id: string | null;
  room_id: string | null;
  last_read_message_id: string | null;
  last_read_at: string;
};

export type CallSession = {
  id: string;
  guild_id: string | null;
  room_id: string | null;
  initiator_id: string;
  status: 'initiated' | 'active' | 'ended';
  type: 'voice' | 'video';
  started_at: string | null;
  ended_at: string | null;
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
  maintenance_return_date: string | null;
  announcement: string | null;
  announcement_active: boolean;
  community_rules: string | null;
  platform_name: string | null;
  platform_description: string | null;
  platform_logo: string | null;
  platform_banner: string | null;
  support_email: string | null;
  discord_url: string | null;
  available_languages: string | null;
  currency_name: string | null;
  rep_create_post: number | null;
  rep_create_community: number | null;
  rep_send_message: number | null;
  rep_receive_reaction: number | null;
};

export type GlobalAnnouncement = {
  id: string;
  title: string;
  content: string;
  is_pinned: boolean;
  is_active: boolean;
  scheduled_at: string | null;
  expires_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type SeasonStatus = 'active' | 'ended' | 'upcoming';

export type Season = {
  id: string;
  number: number;
  name: string;
  status: SeasonStatus;
  starts_at: string;
  ends_at: string | null;
  created_at: string;
  created_by: string | null;
};

export type SeasonRanking = {
  id: string;
  season_id: string;
  user_id: string;
  season_points: number;
  final_rank: MedievalRank;
  position: number;
  created_at: string;
  user?: Pick<Profile, 'username' | 'display_name' | 'avatar_url' | 'medieval_rank' | 'role'>;
};

export type BadgeReviewStatus = 'pending' | 'approved' | 'rejected';

export type BadgeReviewRequest = {
  id: string;
  user_id: string;
  badge_id: string;
  reason: string;
  status: BadgeReviewStatus;
  staff_notes: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  cost: number;
  created_at: string;
  badge?: Badge;
};

export type Badge = {
  id: string;
  name: string;
  description: string | null;
  icon: string;
  color: string;
};

export const BOOST_PRICES = {
  post_24h: 150,
  post_72h: 350,
  guild_24h: 300,
  guild_72h: 700,
  event: 250,
  badge_review: 500,
} as const;

export type MedievalRank =
  | 'campesino'
  | 'escudero'
  | 'caballero'
  | 'caballero_real'
  | 'baron'
  | 'conde'
  | 'duque'
  | 'lord'
  | 'rey'
  | 'emperador';

export type FrameRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary' | 'mythic';

export type Community = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  avatar_url: string | null;
  banner_url: string | null;
  category: string;
  owner_id: string;
  member_count: number;
  is_featured: boolean;
  is_verified: boolean;
  created_at: string;
  updated_at: string;
};

export type CommunityMemberRole = 'owner' | 'admin' | 'member';

export type CommunityMember = {
  id: string;
  community_id: string;
  user_id: string;
  role: CommunityMemberRole;
  joined_at: string;
};

export type ReputationAction =
  | 'create_post'
  | 'create_community'
  | 'send_message'
  | 'receive_reaction';

export type ReputationLog = {
  id: string;
  user_id: string;
  action: ReputationAction | string;
  points: number;
  reference_type: string | null;
  reference_id: string | null;
  created_at: string;
};

export type AvatarFrame = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  rarity: FrameRarity;
  icon: string | null;
  price: number;
  is_free: boolean;
  unlock_condition: string | null;
  created_at: string;
};

export type UserFrame = {
  id: string;
  user_id: string;
  frame_id: string;
  acquired_at: string;
  is_equipped: boolean;
};

export type Wallet = {
  user_id: string;
  balance: number;
  created_at: string;
  updated_at: string;
};

export type TransactionType = 'earn' | 'spend' | 'purchase';

export type Transaction = {
  id: string;
  user_id: string;
  amount: number;
  type: TransactionType | string;
  reference: string | null;
  description: string | null;
  created_at: string;
};

export type ShopItem = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price: number;
  type: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

export type UserInventory = {
  id: string;
  user_id: string;
  shop_item_id: string;
  purchased_at: string;
  metadata: Record<string, unknown> | null;
};

export const MEDIEVAL_RANKS: { key: MedievalRank; label: string; min_points: number; emoji: string }[] = [
  { key: 'campesino', label: 'Campesino', min_points: 0, emoji: '🌾' },
  { key: 'escudero', label: 'Escudero', min_points: 50, emoji: '🛡️' },
  { key: 'caballero', label: 'Caballero', min_points: 150, emoji: '⚔️' },
  { key: 'caballero_real', label: 'Caballero Real', min_points: 350, emoji: '🏰' },
  { key: 'baron', label: 'Barón', min_points: 700, emoji: '⚜️' },
  { key: 'conde', label: 'Conde', min_points: 1200, emoji: '👑' },
  { key: 'duque', label: 'Duque', min_points: 2000, emoji: '💎' },
  { key: 'lord', label: 'Lord', min_points: 3000, emoji: '🏆' },
  { key: 'rey', label: 'Rey', min_points: 5000, emoji: '👑' },
  { key: 'emperador', label: 'Emperador', min_points: 10000, emoji: '🐉' },
];

export const FRAME_RARITIES: { key: FrameRarity; label: string; color: string }[] = [
  { key: 'common', label: 'Común', color: 'text-ink-500' },
  { key: 'uncommon', label: 'Poco común', color: 'text-emerald-500' },
  { key: 'rare', label: 'Raro', color: 'text-sky-500' },
  { key: 'epic', label: 'Épico', color: 'text-violet-500' },
  { key: 'legendary', label: 'Legendario', color: 'text-amber-500' },
  { key: 'mythic', label: 'Mítico', color: 'text-rose-500' },
];

export const COMMUNITY_CATEGORIES = [
  'general', 'pvp', 'pve', 'avalon', 'faccion', 'recoleccion', 'economia', 'zvz', 'hce', 'crafting', 'español', 'ingles',
] as const;

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

export type SuggestionCategory = 'nueva_funcion' | 'mejora_diseno' | 'error_tecnico' | 'idea_albion' | 'otro';
export type SuggestionStatus = 'pendiente' | 'en_revision' | 'en_desarrollo' | 'completado' | 'rechazado';

export type Suggestion = {
  id: string;
  author_id: string;
  title: string;
  description: string;
  category: SuggestionCategory;
  image_url: string | null;
  status: SuggestionStatus;
  vote_count: number;
  created_at: string;
  updated_at: string;
};

export type SuggestionVote = {
  id: string;
  suggestion_id: string;
  user_id: string;
  created_at: string;
};

export const SUGGESTION_CATEGORIES: { key: SuggestionCategory; label: string; emoji: string }[] = [
  { key: 'nueva_funcion', label: 'Nueva función', emoji: '✨' },
  { key: 'mejora_diseno', label: 'Mejora de diseño', emoji: '🎨' },
  { key: 'error_tecnico', label: 'Error técnico', emoji: '🐛' },
  { key: 'idea_albion', label: 'Idea para Albion', emoji: '⚔️' },
  { key: 'otro', label: 'Otro', emoji: '📜' },
];

export const SUGGESTION_STATUSES: { key: SuggestionStatus; label: string; color: string; emoji: string }[] = [
  { key: 'pendiente', label: 'Pendiente', color: 'bg-ink-200 text-ink-700 dark:bg-ink-700 dark:text-ink-200', emoji: '⏳' },
  { key: 'en_revision', label: 'En revisión', color: 'bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300', emoji: '🔍' },
  { key: 'en_desarrollo', label: 'En desarrollo', color: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300', emoji: '🔨' },
  { key: 'completado', label: 'Completado', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300', emoji: '✅' },
  { key: 'rechazado', label: 'Rechazado', color: 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300', emoji: '❌' },
];

export const REACTIONS: { key: ReactionType; emoji: string; label: string }[] = [
  { key: 'like', emoji: '👍', label: 'Me gusta' },
  { key: 'love', emoji: '❤️', label: 'Me encanta' },
  { key: 'haha', emoji: '😂', label: 'Me divierte' },
  { key: 'wow', emoji: '😮', label: 'Me asombra' },
  { key: 'sad', emoji: '😢', label: 'Me entristece' },
  { key: 'angry', emoji: '😡', label: 'Me enoja' },
];

export type Achievement = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  icon: string | null;
  category: string;
  points: number;
  created_at: string;
};

export type UserAchievement = {
  id: string;
  user_id: string;
  achievement_id: string;
  earned_at: string;
  metadata: Record<string, unknown> | null;
  achievement?: Achievement;
};

export type UserInterest = {
  id: string;
  user_id: string;
  interest: string;
  created_at: string;
};

export type CommunityMission = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  icon: string | null;
  target_count: number;
  reward_coins: number;
  reward_rep: number;
  is_active: boolean;
  created_at: string;
};

export type UserMission = {
  id: string;
  user_id: string;
  mission_id: string;
  progress: number;
  completed_at: string | null;
  created_at: string;
  mission?: CommunityMission;
};

export const INTEREST_OPTIONS = [
  { key: 'pvp', label: 'PvP', emoji: '⚔️', color: 'from-red-500 to-orange-500' },
  { key: 'pve', label: 'PvE', emoji: '🛡️', color: 'from-emerald-500 to-teal-500' },
  { key: 'avalon', label: 'Avalon', emoji: '🌌', color: 'from-violet-500 to-purple-500' },
  { key: 'economia', label: 'Economía', emoji: '💰', color: 'from-amber-500 to-yellow-500' },
  { key: 'social', label: 'Social', emoji: '🤝', color: 'from-sky-500 to-blue-500' },
] as const;
