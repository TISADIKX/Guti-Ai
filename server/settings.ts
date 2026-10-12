import fs from 'fs';
import path from 'path';

export interface SiteSettings {
  siteName: string;
  logoUrl: string | null;
  tagline?: string;
  updatedAt?: string;
}

const DATA_DIR = path.join(process.cwd(), 'data');
const SETTINGS_FILE = path.join(DATA_DIR, 'site_settings.json');
const UPLOADS_DIR = path.join(DATA_DIR, 'uploads');
const LOGO_DIR = path.join(UPLOADS_DIR, 'logo');

function ensureDirs() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  if (!fs.existsSync(LOGO_DIR)) fs.mkdirSync(LOGO_DIR, { recursive: true });
}

const DEFAULT_SETTINGS: SiteSettings = {
  siteName: 'gutiai',
  logoUrl: null,
  tagline: 'Curated Experience Platform',
};

export function loadSiteSettings(): SiteSettings {
  ensureDirs();
  try {
    if (!fs.existsSync(SETTINGS_FILE)) {
      fs.writeFileSync(SETTINGS_FILE, JSON.stringify(DEFAULT_SETTINGS, null, 2), 'utf-8');
      return DEFAULT_SETTINGS;
    }
    const data = fs.readFileSync(SETTINGS_FILE, 'utf-8');
    const parsed = JSON.parse(data);
    return { ...DEFAULT_SETTINGS, ...parsed };
  } catch (err) {
    console.error('[SiteSettings] Error loading settings:', err);
    return DEFAULT_SETTINGS;
  }
}

export function saveSiteSettings(settings: SiteSettings): void {
  ensureDirs();
  try {
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2), 'utf-8');
  } catch (err) {
    console.error('[SiteSettings] Error saving settings:', err);
  }
}

export function updateSiteLogo(payload: {
  logoBase64?: string;
  logoUrl?: string;
  siteName?: string;
  tagline?: string;
}): SiteSettings {
  ensureDirs();
  const current = loadSiteSettings();
  let finalLogoUrl = current.logoUrl;

  if (payload.logoBase64 && payload.logoBase64.startsWith('data:image')) {
    const extMatch = payload.logoBase64.match(/^data:image\/([a-zA-Z0-9+]+);/);
    const ext = extMatch ? extMatch[1].replace('+xml', '') : 'png';
    const filename = `site_logo_${Date.now()}.${ext === 'svg' ? 'svg' : ext}`;
    const filePath = path.join(LOGO_DIR, filename);

    const matches = payload.logoBase64.match(/^data:([A-Za-z-+/]+);base64,(.+)$/);
    const buffer = matches ? Buffer.from(matches[2], 'base64') : Buffer.from(payload.logoBase64, 'base64');
    fs.writeFileSync(filePath, buffer);

    finalLogoUrl = `/uploads/logo/${filename}`;
  } else if (payload.logoUrl !== undefined) {
    finalLogoUrl = payload.logoUrl.trim() || null;
  }

  const updated: SiteSettings = {
    siteName: payload.siteName !== undefined ? payload.siteName.trim() : current.siteName,
    tagline: payload.tagline !== undefined ? payload.tagline.trim() : current.tagline,
    logoUrl: finalLogoUrl,
    updatedAt: new Date().toISOString(),
  };

  saveSiteSettings(updated);
  return updated;
}
