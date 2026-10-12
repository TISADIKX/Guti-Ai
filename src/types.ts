export interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  initials: string;
  discordId?: string;
  discordUsername?: string;
  discordDiscriminator?: string;
  isAdmin?: boolean;
  authProvider?: 'email' | 'discord';
  isEmailVerified?: boolean;
}

/**
 * Checks whether the logged-in user is the authorized "USDPRO1" Discord account.
 * Only the USDPRO1 Discord account can see the admin login.
 */
export function isUsdproDiscordAccount(user: UserProfile | null): boolean {
  if (!user) return false;
  const username = (user.discordUsername || '').trim().toLowerCase();
  const name = (user.name || '').trim().toLowerCase();
  const email = (user.email || '').trim().toLowerCase();

  return (
    username === 'usdpro1' ||
    name === 'usdpro1' ||
    email === 'usdpro1' ||
    email.startsWith('usdpro1@') ||
    user.isAdmin === true
  );
}

export type ModCategory = 'All' | 'Mod' | 'Addon' | 'Resource Pack' | 'Shader' | 'Data Pack' | 'Tool';

export interface ModItem {
  id: string;
  title: string;
  summary: string;
  description: string;
  category: 'Mod' | 'Addon' | 'Resource Pack' | 'Shader' | 'Data Pack' | 'Tool';
  version: string;
  gameVersion?: string;
  author: string;
  downloads: number;
  rating: number;
  thumbnailUrl: string;
  galleryUrls?: string[];
  fileName: string;
  fileSize: string;
  downloadUrl: string;
  tags: string[];
  createdAt: string;
  updatedAt?: string;
  isFeatured?: boolean;
}

export interface NewModInput {
  title: string;
  category: 'Mod' | 'Addon' | 'Resource Pack' | 'Shader' | 'Data Pack' | 'Tool';
  version: string;
  gameVersion?: string;
  author: string;
  summary: string;
  description: string;
  tags: string[];
  thumbnailBase64?: string;
  thumbnailUrl?: string;
  fileBase64?: string;
  fileName: string;
  fileSize: string;
  isFeatured?: boolean;
}

export type PlanType = 'free' | 'premium';

export interface ProjectResources {
  ram: string;
  cpu: string;
  disk: string;
}

export interface ProjectMetrics {
  uptime?: string;
  memoryUsedMb?: number;
  memoryTotalMb?: number;
  diskUsed?: string;
  diskTotal?: string;
}

export interface Project {
  id: string;
  name: string;
  resources: ProjectResources;
  status: 'active' | 'deploying' | 'paused' | 'stopped';
  createdAt: string;
  provider?: string;
  metrics?: ProjectMetrics;
}

export interface SiteSettings {
  siteName: string;
  logoUrl: string | null;
  tagline?: string;
  updatedAt?: string;
}

export type GenerationMode = 'photo' | 'video';
export type AspectRatio = '1:1' | '16:9' | '9:16' | '4:3';
export type VideoDuration = '5s' | '10s';
export type GenerationStatus = 'pending' | 'generating' | 'completed' | 'failed';

export interface GenerationItem {
  id: string;
  userId?: string;
  mode: GenerationMode;
  duration?: VideoDuration;
  prompt: string;
  style?: string;
  aspectRatio: AspectRatio;
  mediaUrl: string;
  thumbnailUrl?: string;
  progress: number;
  status: GenerationStatus;
  createdAt: string;
  engine: string;
  modelTitle: string;
  errorMessage?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content?: string;
  timestamp: string;
  generation?: GenerationItem;
}

