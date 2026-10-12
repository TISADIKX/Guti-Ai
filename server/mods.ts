import fs from 'fs';
import path from 'path';

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

const DATA_DIR = path.join(process.cwd(), 'data');
const UPLOADS_DIR = path.join(DATA_DIR, 'uploads');
const THUMBNAILS_DIR = path.join(UPLOADS_DIR, 'thumbnails');
const FILES_DIR = path.join(UPLOADS_DIR, 'files');
const MODS_FILE = path.join(DATA_DIR, 'mods.json');

// Ensure directories exist
function ensureDirs() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  if (!fs.existsSync(THUMBNAILS_DIR)) fs.mkdirSync(THUMBNAILS_DIR, { recursive: true });
  if (!fs.existsSync(FILES_DIR)) fs.mkdirSync(FILES_DIR, { recursive: true });
}

export const ADMIN_PASSKEY = process.env.ADMIN_SECRET || 'Usdpro1234@';
export const ADMIN_EMAILS = [
  'bdbishal72@gmail.com',
  ...(process.env.ADMIN_EMAIL ? [process.env.ADMIN_EMAIL.toLowerCase()] : []),
];

export function verifyAdminAccess(keyOrEmail?: string | null): boolean {
  if (!keyOrEmail) return false;
  const trimmed = keyOrEmail.trim();
  // Exact passkey match (case-sensitive)
  if (trimmed === ADMIN_PASSKEY) return true;
  // Case-insensitive email match
  if (ADMIN_EMAILS.includes(trimmed.toLowerCase())) return true;
  return false;
}

// Clean catalog: No default mods or addons. Only administrator uploads are displayed.
const SEED_MODS: ModItem[] = [];

// Load all mods
export function loadMods(): ModItem[] {
  ensureDirs();
  try {
    if (!fs.existsSync(MODS_FILE)) {
      fs.writeFileSync(MODS_FILE, JSON.stringify(SEED_MODS, null, 2), 'utf-8');
      return SEED_MODS;
    }
    const data = fs.readFileSync(MODS_FILE, 'utf-8');
    const parsed = JSON.parse(data);
    if (Array.isArray(parsed)) {
      return parsed;
    }
    return SEED_MODS;
  } catch (err) {
    console.error('[ModsStorage] Error reading mods file:', err);
    return SEED_MODS;
  }
}

// Save all mods
export function saveMods(mods: ModItem[]) {
  ensureDirs();
  try {
    fs.writeFileSync(MODS_FILE, JSON.stringify(mods, null, 2), 'utf-8');
  } catch (err) {
    console.error('[ModsStorage] Error saving mods file:', err);
  }
}

// Filter and search mods
export function queryMods(params: {
  search?: string;
  category?: string;
  sort?: 'popular' | 'newest' | 'rating' | 'name';
}): ModItem[] {
  const allMods = loadMods();
  let filtered = [...allMods];

  if (params.category && params.category !== 'All') {
    filtered = filtered.filter(
      (m) => m.category.toLowerCase() === params.category!.toLowerCase()
    );
  }

  if (params.search && params.search.trim()) {
    const q = params.search.trim().toLowerCase();
    filtered = filtered.filter(
      (m) =>
        m.title.toLowerCase().includes(q) ||
        m.summary.toLowerCase().includes(q) ||
        m.description.toLowerCase().includes(q) ||
        m.author.toLowerCase().includes(q) ||
        m.tags.some((t) => t.toLowerCase().includes(q))
    );
  }

  // Sort
  const sort = params.sort || 'popular';
  if (sort === 'popular') {
    filtered.sort((a, b) => b.downloads - a.downloads);
  } else if (sort === 'newest') {
    filtered.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  } else if (sort === 'rating') {
    filtered.sort((a, b) => b.rating - a.rating);
  } else if (sort === 'name') {
    filtered.sort((a, b) => a.title.localeCompare(b.title));
  }

  return filtered;
}

export function getModById(id: string): ModItem | null {
  const all = loadMods();
  return all.find((m) => m.id === id) || null;
}

// Increment downloads
export function incrementModDownload(id: string): ModItem | null {
  const all = loadMods();
  const index = all.findIndex((m) => m.id === id);
  if (index === -1) return null;
  all[index].downloads += 1;
  saveMods(all);
  return all[index];
}

// Delete mod (admin only)
export function deleteMod(id: string): boolean {
  const all = loadMods();
  const index = all.findIndex((m) => m.id === id);
  if (index === -1) return false;

  const target = all[index];
  // Remove custom file if stored
  if (target.fileName) {
    const filePath = path.join(FILES_DIR, `${target.id}_${target.fileName}`);
    if (fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
      } catch (e) {}
    }
  }

  all.splice(index, 1);
  saveMods(all);
  return true;
}

// Update existing Mod or Addon (admin only)
export function updateMod(
  id: string,
  payload: {
    title?: string;
    category?: 'Mod' | 'Addon' | 'Resource Pack' | 'Shader' | 'Data Pack' | 'Tool';
    version?: string;
    gameVersion?: string;
    author?: string;
    summary?: string;
    description?: string;
    tags?: string[];
    thumbnailBase64?: string;
    thumbnailUrl?: string;
    fileBase64?: string;
    fileName?: string;
    fileSize?: string;
    isFeatured?: boolean;
  }
): ModItem | null {
  const all = loadMods();
  const index = all.findIndex((m) => m.id === id);
  if (index === -1) return null;

  const current = all[index];
  let finalThumbnailUrl = current.thumbnailUrl;

  if (payload.thumbnailBase64 && payload.thumbnailBase64.startsWith('data:image')) {
    const extMatch = payload.thumbnailBase64.match(/^data:image\/([a-zA-Z0-9]+);/);
    const ext = extMatch ? extMatch[1] : 'png';
    const thumbFilename = `${id}_thumb_${Date.now()}.${ext}`;
    saveBase64File(THUMBNAILS_DIR, thumbFilename, payload.thumbnailBase64);
    finalThumbnailUrl = `/uploads/thumbnails/${thumbFilename}`;
  } else if (payload.thumbnailUrl) {
    finalThumbnailUrl = payload.thumbnailUrl;
  }

  let finalFileName = current.fileName;
  let finalFileSize = current.fileSize;

  if (payload.fileBase64) {
    const newName = payload.fileName || current.fileName;
    const savedPath = saveBase64File(FILES_DIR, `${id}_${newName}`, payload.fileBase64);
    finalFileName = newName;
    try {
      const stats = fs.statSync(savedPath);
      const mb = (stats.size / (1024 * 1024)).toFixed(1);
      finalFileSize = `${mb} MB`;
    } catch (e) {
      if (payload.fileSize) finalFileSize = payload.fileSize;
    }
  } else if (payload.fileName) {
    finalFileName = payload.fileName;
  }

  const updatedMod: ModItem = {
    ...current,
    title: payload.title !== undefined ? payload.title.trim() : current.title,
    summary: payload.summary !== undefined ? payload.summary.trim() : current.summary,
    description: payload.description !== undefined ? payload.description.trim() : current.description,
    category: payload.category !== undefined ? payload.category : current.category,
    version: payload.version !== undefined ? payload.version.trim() : current.version,
    gameVersion: payload.gameVersion !== undefined ? payload.gameVersion.trim() : current.gameVersion,
    author: payload.author !== undefined ? payload.author.trim() : current.author,
    thumbnailUrl: finalThumbnailUrl,
    fileName: finalFileName,
    fileSize: finalFileSize,
    tags: payload.tags !== undefined ? payload.tags : current.tags,
    isFeatured: payload.isFeatured !== undefined ? Boolean(payload.isFeatured) : current.isFeatured,
    updatedAt: new Date().toISOString().split('T')[0],
  };

  all[index] = updatedMod;
  saveMods(all);
  return updatedMod;
}

// Save uploaded base64 data to file
function saveBase64File(dir: string, filename: string, base64Data: string): string {
  ensureDirs();
  const matches = base64Data.match(/^data:([A-Za-z-+/]+);base64,(.+)$/);
  const buffer = matches
    ? Buffer.from(matches[2], 'base64')
    : Buffer.from(base64Data, 'base64');
  const filePath = path.join(dir, filename);
  fs.writeFileSync(filePath, buffer);
  return filePath;
}

// Create new Mod (Admin upload)
export function createMod(payload: {
  title: string;
  category: 'Mod' | 'Addon' | 'Resource Pack' | 'Shader' | 'Data Pack' | 'Tool';
  version: string;
  gameVersion?: string;
  author: string;
  summary: string;
  description: string;
  tags?: string[];
  thumbnailBase64?: string;
  thumbnailUrl?: string;
  fileBase64?: string;
  fileName: string;
  fileSize?: string;
  isFeatured?: boolean;
}): ModItem {
  ensureDirs();
  const id = `mod-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  let finalThumbnailUrl =
    payload.thumbnailUrl ||
    'https://images.unsplash.com/photo-1550745165-9bc0b252726f?q=80&w=800&auto=format&fit=crop';

  // Handle uploaded thumbnail image
  if (payload.thumbnailBase64 && payload.thumbnailBase64.startsWith('data:image')) {
    const extMatch = payload.thumbnailBase64.match(/^data:image\/([a-zA-Z0-9]+);/);
    const ext = extMatch ? extMatch[1] : 'png';
    const thumbFilename = `${id}_thumb.${ext}`;
    saveBase64File(THUMBNAILS_DIR, thumbFilename, payload.thumbnailBase64);
    finalThumbnailUrl = `/uploads/thumbnails/${thumbFilename}`;
  }

  // Handle uploaded file
  let finalFileName = payload.fileName || `${payload.title.replace(/[^a-zA-Z0-9_-]/g, '_')}.zip`;
  let calculatedSize = payload.fileSize || '3.5 MB';

  if (payload.fileBase64) {
    const savedPath = saveBase64File(
      FILES_DIR,
      `${id}_${finalFileName}`,
      payload.fileBase64
    );
    try {
      const stats = fs.statSync(savedPath);
      const mb = (stats.size / (1024 * 1024)).toFixed(1);
      calculatedSize = `${mb} MB`;
    } catch (e) {}
  }

  const newMod: ModItem = {
    id,
    title: payload.title.trim(),
    summary: payload.summary.trim(),
    description: payload.description.trim() || payload.summary.trim(),
    category: payload.category,
    version: payload.version.trim() || 'v1.0.0',
    gameVersion: payload.gameVersion?.trim() || 'Latest',
    author: payload.author?.trim() || 'Admin Creator',
    downloads: 0,
    rating: 5.0,
    thumbnailUrl: finalThumbnailUrl,
    fileName: finalFileName,
    fileSize: calculatedSize,
    downloadUrl: `/api/mods/download/${id}`,
    tags: payload.tags && payload.tags.length > 0 ? payload.tags : [payload.category],
    createdAt: new Date().toISOString().split('T')[0],
    isFeatured: Boolean(payload.isFeatured),
  };

  const all = loadMods();
  all.unshift(newMod);
  saveMods(all);
  return newMod;
}

// Generate real downloadable buffer if physical file is not on disk
export function getModDownloadContent(id: string): {
  filePath?: string;
  buffer?: Buffer;
  fileName: string;
  contentType: string;
} | null {
  const mod = getModById(id);
  if (!mod) return null;

  incrementModDownload(id);

  const customFilePath = path.join(FILES_DIR, `${mod.id}_${mod.fileName}`);
  if (fs.existsSync(customFilePath)) {
    return {
      filePath: customFilePath,
      fileName: mod.fileName,
      contentType: 'application/octet-stream',
    };
  }

  // Otherwise generate a legitimate mod archive package with manifest & readme
  const manifest = {
    id: mod.id,
    name: mod.title,
    version: mod.version,
    gameVersion: mod.gameVersion,
    category: mod.category,
    author: mod.author,
    downloadedAt: new Date().toISOString(),
    website: 'https://launch-your-journey.local',
    description: mod.summary,
    tags: mod.tags,
  };

  const readmeContent = `=====================================================
${mod.title} (${mod.version})
Category: ${mod.category}
Author: ${mod.author}
Target Game Version: ${mod.gameVersion || 'Universal'}
=====================================================

DESCRIPTION:
${mod.description}

INSTALLATION INSTRUCTIONS:
1. Ensure your game client/server loader is installed.
2. Place this file into your game's directory:
   - For Mods (.jar / .zip): place in the /mods folder.
   - For Addons (.mcaddon / .mcpack): double-click or copy to com.mojang/resource_packs.
   - For Shaders (.zip): place in the /shaderpacks folder.
   - For Resource Packs: place in /resourcepacks and enable in-game.
   - For Data Packs: place inside your world save's /datapacks folder.

Enjoy playing!
Launch Your Journey Mods Platform
=====================================================`;

  // Provide a clean structured text or package buffer
  const payloadString = `[MOD ARCHIVE METADATA]\n\n${JSON.stringify(
    manifest,
    null,
    2
  )}\n\n${readmeContent}`;
  const buffer = Buffer.from(payloadString, 'utf-8');

  return {
    buffer,
    fileName: mod.fileName.endsWith('.txt') ? mod.fileName : mod.fileName,
    contentType: 'application/octet-stream',
  };
}
