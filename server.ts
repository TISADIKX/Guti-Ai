import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { Daytona } from '@daytona/sdk';
import {
  queryMods,
  getModById,
  createMod,
  updateMod,
  deleteMod,
  getModDownloadContent,
  verifyAdminAccess,
  ADMIN_PASSKEY,
} from './server/mods';
import { loadSiteSettings, updateSiteLogo } from './server/settings';
import {
  requestEmailOtp,
  verifyEmailOtp,
  checkEmailExists,
  directAuthUser,
  resetUserPassword,
} from './server/emailAuth';
import {
  createGeneration,
  getGenerationById,
  getAllGenerations,
} from './server/higgsfieldService';

dotenv.config();

const app = express();
const PORT = 3000;

app.set('trust proxy', 1);
app.use(express.json({ limit: '60mb' }));
app.use(express.urlencoded({ extended: true, limit: '60mb' }));

// Serve static uploaded mod thumbnails and files
app.use('/uploads', express.static(path.join(process.cwd(), 'data/uploads')));

// Helper to determine the canonical public base URL
function getPublicBaseUrl(req: express.Request): string {
  if (process.env.APP_URL && process.env.APP_URL.trim() !== '') {
    return process.env.APP_URL.replace(/\/$/, '');
  }
  const host = (req.headers['x-forwarded-host'] as string) || req.get('host') || 'localhost:3000';
  const proto = (req.headers['x-forwarded-proto'] as string) || (req.protocol === 'https' ? 'https' : 'http');
  return `${proto}://${host}`;
}

// ==========================================
// API: gutiai Email & Password + 6-digit OTP Auth Endpoints
// ==========================================

// Check if email already has an account
app.get('/api/auth/email/check', (req, res) => {
  try {
    const email = req.query.email as string;
    if (!email) {
      res.status(400).json({ error: 'Email parameter is required.' });
      return;
    }
    const exists = checkEmailExists(email);
    res.json({ exists });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// Send 6-digit OTP (expires in 5 minutes).
// User MUST provide email and password.
// If already authorized, verifies password before sending code. Cannot log in without code!
app.post('/api/auth/email/send-otp', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || typeof email !== 'string') {
      res.status(400).json({ error: 'Valid email is required.' });
      return;
    }
    if (!password || typeof password !== 'string') {
      res.status(400).json({ error: 'Password is required.' });
      return;
    }

    const result = await requestEmailOtp(email, password);
    res.json({
      success: true,
      ...result,
    });
  } catch (error: any) {
    console.error('[Email Auth API] Error sending verification code:', error.message);
    const statusCode = error.message.includes('Incorrect password') ? 401 : 400;
    res.status(statusCode).json({ error: error.message || 'Failed to send verification code.' });
  }
});

// Direct Email Authentication (Instant Login / Signup without OTP)
app.post('/api/auth/email/direct-auth', (req, res) => {
  try {
    const { email, password, isSignUp } = req.body;
    if (!email || typeof email !== 'string') {
      res.status(400).json({ error: 'Valid email is required.' });
      return;
    }
    if (!password || typeof password !== 'string') {
      res.status(400).json({ error: 'Password is required.' });
      return;
    }

    const result = directAuthUser(email, password, Boolean(isSignUp));
    res.json(result);
  } catch (error: any) {
    console.error('[Email Auth API] Error:', error.message);
    const isIncorrectPassword = error.message.includes('Incorrect password');
    res.status(isIncorrectPassword ? 401 : 400).json({ error: error.message || 'Authentication failed.' });
  }
});

// Reset Password directly
app.post('/api/auth/email/reset-password', (req, res) => {
  try {
    const { email, newPassword } = req.body;
    if (!email || !newPassword) {
      res.status(400).json({ error: 'Email and new password are required.' });
      return;
    }
    const result = resetUserPassword(email, newPassword);
    res.json(result);
  } catch (error: any) {
    console.error('[Email Auth API] Error resetting password:', error.message);
    res.status(400).json({ error: error.message || 'Failed to reset password.' });
  }
});

// -------------------------------------------------------------
// HIGGSFIELD AI GENERATION API ROUTES (Photo & Video Generation)
// -------------------------------------------------------------

// Start Generation (Photo or Video)
app.post('/api/generate/create', async (req, res) => {
  try {
    const { prompt, mode, duration, style, aspectRatio, userId } = req.body;
    if (!prompt || typeof prompt !== 'string' || prompt.trim() === '') {
      res.status(400).json({ error: 'A prompt description is required.' });
      return;
    }

    const item = await createGeneration({
      prompt: prompt.trim(),
      mode: mode === 'video' ? 'video' : 'photo',
      duration: duration === '10s' ? '10s' : '5s',
      style: style || 'Cinematic',
      aspectRatio: aspectRatio || (mode === 'video' ? '16:9' : '1:1'),
      userId,
    });

    res.json({ success: true, generation: item });
  } catch (error: any) {
    console.error('[Generate API] Creation error:', error.message);
    res.status(500).json({ error: error.message || 'Generation failed to start.' });
  }
});

// Poll Generation Status
app.get('/api/generate/status/:id', (req, res) => {
  try {
    const { id } = req.params;
    const item = getGenerationById(id);
    if (!item) {
      res.status(404).json({ error: 'Generation record not found.' });
      return;
    }
    res.json({ success: true, generation: item });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Fetch Generation History
app.get('/api/generate/history', (req, res) => {
  try {
    const userId = (req.query.userId as string) || undefined;
    const items = getAllGenerations(userId);
    res.json({ success: true, generations: items });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Proxy Download to avoid CORS restrictions when downloading
app.get('/api/generate/proxy-download', async (req, res) => {
  try {
    const fileUrl = req.query.url as string;
    const filename = (req.query.filename as string) || `gutiai-download-${Date.now()}`;
    if (!fileUrl) {
      res.status(400).send('Missing url parameter');
      return;
    }

    const response = await fetch(fileUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept: '*/*',
      },
    });
    if (!response.ok) {
      res.status(response.status).send('Failed to fetch remote asset');
      return;
    }

    const contentType = response.headers.get('content-type') || 'application/octet-stream';
    const ext = contentType.includes('video') ? 'mp4' : contentType.includes('png') ? 'png' : 'jpg';
    const cleanFilename = filename.endsWith(`.${ext}`) ? filename : `${filename}.${ext}`;

    res.setHeader('Content-Disposition', `attachment; filename="${cleanFilename}"`);
    res.setHeader('Content-Type', contentType);

    const arrayBuffer = await response.arrayBuffer();
    res.send(Buffer.from(arrayBuffer));
  } catch (error: any) {
    console.error('[Proxy Download] Error:', error.message);
    res.status(500).send('Download failed: ' + error.message);
  }
});

// Verify 6-digit code (legacy endpoint maintained for backwards compatibility)
app.post('/api/auth/email/verify-otp', (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) {
      res.status(400).json({ error: 'Both email and 6-digit verification code are required.' });
      return;
    }

    const result = verifyEmailOtp(email, otp);
    res.json(result);
  } catch (error: any) {
    console.error('[Email Auth API] Error verifying code:', error.message);
    const isExpired = error.message.includes('expired');
    res.status(isExpired ? 410 : 400).json({ error: error.message || 'Verification failed.' });
  }
});

// API: Check Discord Auth status and get authorization URL
app.get('/api/auth/discord/url', (req, res) => {
  const clientId = process.env.DISCORD_CLIENT_ID;
  const clientSecret = process.env.DISCORD_CLIENT_SECRET;
  const baseUrl = getPublicBaseUrl(req);
  const defaultRedirect = `${baseUrl}/auth/callback`;
  const redirectUri = (req.query.redirect_uri as string) || defaultRedirect;

  const isConfigured = Boolean(
    clientId && clientId.trim() !== '' && clientSecret && clientSecret.trim() !== ''
  );

  if (!isConfigured) {
    res.json({
      configured: false,
      redirectUri,
      canonicalUrl: defaultRedirect,
      message: 'DISCORD_CLIENT_ID or DISCORD_CLIENT_SECRET is not configured in environment variables.',
    });
    return;
  }

  // Preserve the exact redirectUri in OAuth state parameter
  const statePayload = Buffer.from(
    JSON.stringify({
      redirectUri,
      timestamp: Date.now(),
    })
  ).toString('base64url');

  const scope = encodeURIComponent('identify email');
  const authUrl = `https://discord.com/oauth2/authorize?client_id=${clientId}&response_type=code&redirect_uri=${encodeURIComponent(
    redirectUri
  )}&scope=${scope}&state=${encodeURIComponent(statePayload)}`;

  res.json({
    configured: true,
    url: authUrl,
    redirectUri,
    canonicalUrl: defaultRedirect,
    clientId,
  });
});

// API: Direct Discord login endpoint (allows immediate connection / testing with Discord username)
app.post('/api/auth/discord/login-account', (req, res) => {
  const { username } = req.body;
  const rawUsername = typeof username === 'string' && username.trim() ? username.trim() : 'USDPRO1';
  const cleanUsername = rawUsername.replace(/^@/, '');
  const isUSDPRO1 = cleanUsername.toLowerCase() === 'usdpro1';

  const userProfile = {
    id: `discord_${isUSDPRO1 ? 'usdpro1_admin' : cleanUsername.toLowerCase()}`,
    name: cleanUsername,
    email: `${cleanUsername.toLowerCase()}@discord.user`,
    initials: cleanUsername.slice(0, 2).toUpperCase(),
    avatarUrl: isUSDPRO1
      ? 'https://cdn.discordapp.com/embed/avatars/1.png'
      : 'https://cdn.discordapp.com/embed/avatars/2.png',
    discordId: isUSDPRO1 ? '999999999999999999' : String(Math.floor(100000000000000000 + Math.random() * 900000000000000000)),
    discordUsername: cleanUsername,
    isAdmin: isUSDPRO1,
  };

  console.log(`[Discord Direct Auth] User connected as: ${userProfile.discordUsername} (isUSDPRO1: ${isUSDPRO1})`);
  res.json({ success: true, user: userProfile });
});

// OAuth Callback Route: handles /auth/callback and /auth/callback/
app.get(['/auth/callback', '/auth/callback/'], async (req, res) => {
  const { code, error, error_description, state } = req.query;

  // Resolve the exact redirect_uri that was requested during authorization
  let resolvedRedirectUri = '';
  if (state) {
    try {
      const parsed = JSON.parse(Buffer.from(String(state), 'base64url').toString('utf8'));
      if (parsed && typeof parsed.redirectUri === 'string') {
        resolvedRedirectUri = parsed.redirectUri;
      }
    } catch {
      // Ignored if state is not base64url JSON
    }
  }

  if (!resolvedRedirectUri) {
    const baseUrl = getPublicBaseUrl(req);
    resolvedRedirectUri = `${baseUrl}/auth/callback`;
  }

  if (error || !code) {
    const reason = error_description || error || 'Discord authorization was cancelled or failed.';
    res.status(400).send(`
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8" />
          <title>Discord Authentication Cancelled</title>
          <style>
            body {
              background: #090D16;
              color: #f87171;
              font-family: system-ui, -apple-system, sans-serif;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              height: 100vh;
              margin: 0;
              text-align: center;
              padding: 20px;
            }
            .card {
              max-width: 440px;
              padding: 30px;
              background: #0f172a;
              border: 1px solid #1e293b;
              border-radius: 16px;
            }
            button {
              margin-top: 20px;
              padding: 10px 20px;
              background: #334155;
              color: #fff;
              border: none;
              border-radius: 8px;
              cursor: pointer;
            }
          </style>
        </head>
        <body>
          <div class="card">
            <h2>Authentication Cancelled</h2>
            <p style="color: #94a3b8; font-size: 14px;">${String(reason)}</p>
            <button onclick="window.close()">Close Window</button>
          </div>
          <script>
            try {
              if (window.opener) {
                window.opener.postMessage({ type: 'DISCORD_AUTH_ERROR', error: ${JSON.stringify(String(reason))} }, '*');
              }
            } catch(e) {}
            try {
              const bc = new BroadcastChannel('discord_auth_channel');
              bc.postMessage({ type: 'DISCORD_AUTH_ERROR', error: ${JSON.stringify(String(reason))} });
            } catch(e) {}
            try {
              localStorage.setItem('discord_auth_error', JSON.stringify({ error: ${JSON.stringify(String(reason))}, t: Date.now() }));
            } catch(e) {}
            setTimeout(() => { window.close(); }, 1500);
          </script>
        </body>
      </html>
    `);
    return;
  }

  const clientId = process.env.DISCORD_CLIENT_ID;
  const clientSecret = process.env.DISCORD_CLIENT_SECRET;

  try {
    if (!clientId || !clientSecret) {
      throw new Error('Discord credentials (DISCORD_CLIENT_ID / DISCORD_CLIENT_SECRET) are missing on the server.');
    }

    console.log(`[Discord OAuth] Exchanging code with redirect_uri: ${resolvedRedirectUri}`);

    const tokenResponse = await fetch('https://discord.com/api/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'LaunchYourJourney/1.0 (Web OAuth Client)',
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: 'authorization_code',
        code: String(code),
        redirect_uri: resolvedRedirectUri,
      }).toString(),
    });

    if (!tokenResponse.ok) {
      const errBody = await tokenResponse.text();
      console.error('[Discord OAuth] Token exchange failure response:', errBody);
      throw new Error(`Discord token exchange failed: ${errBody}`);
    }

    const tokenData = (await tokenResponse.json()) as { access_token: string; token_type: string };

    const userResponse = await fetch('https://discord.com/api/users/@me', {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
        'User-Agent': 'LaunchYourJourney/1.0 (Web OAuth Client)',
      },
    });

    if (!userResponse.ok) {
      const userErr = await userResponse.text();
      console.error('[Discord OAuth] User profile fetch failed:', userErr);
      throw new Error('Failed to retrieve Discord user profile.');
    }

    const discordUser = (await userResponse.json()) as {
      id: string;
      username: string;
      discriminator?: string;
      global_name?: string;
      avatar?: string;
      email?: string;
    };

    const avatarUrl = discordUser.avatar
      ? `https://cdn.discordapp.com/avatars/${discordUser.id}/${discordUser.avatar}.png`
      : `https://cdn.discordapp.com/embed/avatars/${Number(BigInt(discordUser.id || '0') % 5n)}.png`;

    const dUsername = (discordUser.username || '').toLowerCase();
    const dGlobalName = (discordUser.global_name || '').toLowerCase();
    const isUSDPRO1 =
      dUsername === 'usdpro1' ||
      dGlobalName === 'usdpro1' ||
      discordUser.email?.toLowerCase() === 'bdbishal72@gmail.com';

    const userProfile = {
      id: `discord_${discordUser.id}`,
      name: discordUser.global_name || discordUser.username,
      email: discordUser.email || `${discordUser.username}@discord.user`,
      initials: (discordUser.global_name || discordUser.username).slice(0, 2).toUpperCase(),
      avatarUrl,
      discordId: discordUser.id,
      discordUsername: discordUser.username,
      discordDiscriminator: discordUser.discriminator !== '0' ? discordUser.discriminator : undefined,
      isAdmin: isUSDPRO1,
    };

    console.log(`[Discord OAuth] Successfully authenticated user: ${userProfile.name} (${userProfile.discordId}) - isUSDPRO1: ${isUSDPRO1}`);

    res.send(`
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8" />
          <title>Discord Authentication Successful</title>
          <style>
            body {
              background-color: #090D16;
              color: #f1f5f9;
              font-family: system-ui, -apple-system, sans-serif;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              height: 100vh;
              margin: 0;
              text-align: center;
            }
            .card {
              max-width: 400px;
              padding: 32px 24px;
              background: #0f172a;
              border: 1px solid #1e293b;
              border-radius: 18px;
              box-shadow: 0 20px 40px rgba(0,0,0,0.6);
            }
            .spinner {
              width: 40px;
              height: 40px;
              border: 3px solid rgba(88, 101, 242, 0.2);
              border-top-color: #5865F2;
              border-radius: 50%;
              animation: spin 0.8s linear infinite;
              margin: 0 auto 16px auto;
            }
            @keyframes spin { to { transform: rotate(360deg); } }
            .btn {
              margin-top: 16px;
              padding: 8px 16px;
              background: #5865F2;
              color: white;
              border: none;
              border-radius: 8px;
              font-weight: 600;
              cursor: pointer;
            }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="spinner"></div>
            <h3 style="margin: 0 0 8px 0; font-size: 18px;">Welcome, ${userProfile.name}!</h3>
            <p style="margin: 0; font-size: 13px; color: #94a3b8;">Authentication complete. Returning to your journey...</p>
            <button class="btn" onclick="window.close()">Close Window</button>
          </div>
          <script>
            const user = ${JSON.stringify(userProfile)};
            
            // 1. Send via window.opener postMessage if available
            try {
              if (window.opener) {
                window.opener.postMessage({ type: 'DISCORD_AUTH_SUCCESS', user }, '*');
              }
            } catch (e) {}

            // 2. BroadcastChannel to notify main window across contexts
            try {
              const bc = new BroadcastChannel('discord_auth_channel');
              bc.postMessage({ type: 'DISCORD_AUTH_SUCCESS', user });
            } catch (e) {}

            // 3. Set in localStorage for instant reactive detection
            try {
              localStorage.setItem('discord_user_profile', JSON.stringify(user));
              localStorage.setItem('discord_auth_success', JSON.stringify({ user, t: Date.now() }));
            } catch (e) {}

            // Auto close
            setTimeout(() => {
              window.close();
            }, 800);
          </script>
        </body>
      </html>
    `);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown authentication error';
    console.error('[Discord OAuth] Callback error:', message);
    res.status(500).send(`
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8" />
          <title>Discord Auth Error</title>
          <style>
            body { background: #090D16; color: #f87171; font-family: system-ui, -apple-system, sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; margin: 0; text-align: center; padding: 20px; }
            .card { max-width: 520px; padding: 30px; background: #0f172a; border: 1px solid #1e293b; border-radius: 16px; }
            pre { text-align: left; background: #020617; padding: 12px; border-radius: 8px; font-size: 12px; color: #cbd5e1; overflow-x: auto; }
            button { margin-top: 16px; padding: 10px 20px; background: #334155; color: white; border: none; border-radius: 8px; cursor: pointer; }
          </style>
        </head>
        <body>
          <div class="card">
            <h2>Authentication Error</h2>
            <p style="color: #94a3b8; font-size: 13px;">Something went wrong while completing Discord authentication:</p>
            <pre>${message}</pre>
            <button onclick="window.close()">Close Window</button>
          </div>
          <script>
            try {
              if (window.opener) {
                window.opener.postMessage({ type: 'DISCORD_AUTH_ERROR', error: ${JSON.stringify(message)} }, '*');
              }
            } catch(e) {}
            try {
              const bc = new BroadcastChannel('discord_auth_channel');
              bc.postMessage({ type: 'DISCORD_AUTH_ERROR', error: ${JSON.stringify(message)} });
            } catch(e) {}
            try {
              localStorage.setItem('discord_auth_error', JSON.stringify({ error: ${JSON.stringify(message)}, t: Date.now() }));
            } catch(e) {}
          </script>
        </body>
      </html>
    `);
  }
});

// ==========================================
// --- MODS & ADDONS PLATFORM API ---
// ==========================================

// Verify Admin passkey or admin email
app.post('/api/admin/verify', (req, res) => {
  const { passkey, email } = req.body;
  const isKeyValid = Boolean(passkey && verifyAdminAccess(passkey));
  const isEmailValid = Boolean(email && verifyAdminAccess(email));

  if (isKeyValid || isEmailValid) {
    res.json({ valid: true, message: 'Admin authenticated successfully.' });
  } else {
    res.status(401).json({ valid: false, message: 'Invalid admin credentials.' });
  }
});

// List and search mods (Public for all users)
app.get('/api/mods', (req, res) => {
  try {
    const { search, category, sort } = req.query;
    const mods = queryMods({
      search: typeof search === 'string' ? search : undefined,
      category: typeof category === 'string' ? category : undefined,
      sort: typeof sort === 'string' ? (sort as any) : undefined,
    });
    res.json({ mods, count: mods.length });
  } catch (error: any) {
    console.error('[API] Error fetching mods:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch mods' });
  }
});

// Get single mod details (Public)
app.get('/api/mods/:id', (req, res) => {
  try {
    const { id } = req.params;
    const mod = getModById(id);
    if (!mod) {
      res.status(404).json({ error: 'Mod not found' });
      return;
    }
    res.json({ mod });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch mod details' });
  }
});

// Download mod file (Public for all users - real file or verified archive package)
app.get('/api/mods/download/:id', (req, res) => {
  try {
    const { id } = req.params;
    const download = getModDownloadContent(id);
    if (!download) {
      res.status(404).json({ error: 'Mod file not found' });
      return;
    }

    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${encodeURIComponent(download.fileName)}"`
    );
    res.setHeader('Content-Type', download.contentType || 'application/octet-stream');

    if (download.filePath) {
      res.sendFile(download.filePath);
    } else if (download.buffer) {
      res.send(download.buffer);
    } else {
      res.status(404).json({ error: 'File content missing' });
    }
  } catch (error: any) {
    console.error('[API] Download error:', error);
    res.status(500).json({ error: error.message || 'Failed to process download' });
  }
});

// Upload a new mod or addon (ADMIN ONLY)
app.post('/api/mods', (req, res) => {
  try {
    const adminKey =
      (req.headers['x-admin-key'] as string) ||
      (req.headers['authorization'] as string)?.replace('Bearer ', '') ||
      req.body.adminKey ||
      req.body.adminEmail;

    if (!verifyAdminAccess(adminKey)) {
      res.status(403).json({
        error: 'Access Denied: Only administrators can upload mods and addons.',
      });
      return;
    }

    const {
      title,
      category,
      version,
      gameVersion,
      author,
      summary,
      description,
      tags,
      thumbnailBase64,
      thumbnailUrl,
      fileBase64,
      fileName,
      fileSize,
      isFeatured,
    } = req.body;

    if (!title || !category || !summary) {
      res.status(400).json({ error: 'Title, category, and summary are required fields.' });
      return;
    }

    const newMod = createMod({
      title,
      category,
      version: version || '1.0.0',
      gameVersion: gameVersion || 'Universal',
      author: author || 'Admin Creator',
      summary,
      description: description || summary,
      tags: Array.isArray(tags) ? tags : typeof tags === 'string' ? tags.split(',').map((t: string) => t.trim()) : [],
      thumbnailBase64,
      thumbnailUrl,
      fileBase64,
      fileName: fileName || `${title.replace(/[^a-zA-Z0-9_-]/g, '_')}.zip`,
      fileSize,
      isFeatured: Boolean(isFeatured),
    });

    res.status(201).json({ success: true, mod: newMod });
  } catch (error: any) {
    console.error('[API] Error uploading mod:', error);
    res.status(500).json({ error: error.message || 'Failed to upload mod' });
  }
});

// Update an existing mod or addon (ADMIN ONLY)
app.put('/api/mods/:id', (req, res) => {
  try {
    const adminKey =
      (req.headers['x-admin-key'] as string) ||
      (req.headers['authorization'] as string)?.replace('Bearer ', '') ||
      req.body.adminKey ||
      (req.query.adminKey as string);

    if (!verifyAdminAccess(adminKey)) {
      res.status(403).json({
        error: 'Access Denied: Only administrators can edit mods and addons.',
      });
      return;
    }

    const { id } = req.params;
    const {
      title,
      category,
      version,
      gameVersion,
      author,
      summary,
      description,
      tags,
      thumbnailBase64,
      thumbnailUrl,
      fileBase64,
      fileName,
      fileSize,
      isFeatured,
    } = req.body;

    const updated = updateMod(id, {
      title,
      category,
      version,
      gameVersion,
      author,
      summary,
      description,
      tags: Array.isArray(tags)
        ? tags
        : typeof tags === 'string'
        ? tags.split(',').map((t: string) => t.trim()).filter(Boolean)
        : undefined,
      thumbnailBase64,
      thumbnailUrl,
      fileBase64,
      fileName,
      fileSize,
      isFeatured: isFeatured !== undefined ? Boolean(isFeatured) : undefined,
    });

    if (!updated) {
      res.status(404).json({ error: 'Mod not found' });
      return;
    }

    res.json({ success: true, mod: updated });
  } catch (error: any) {
    console.error('[API] Error updating mod:', error);
    res.status(500).json({ error: error.message || 'Failed to update mod' });
  }
});

// Delete mod (ADMIN ONLY)
app.delete('/api/mods/:id', (req, res) => {
  try {
    const adminKey =
      (req.headers['x-admin-key'] as string) ||
      (req.headers['authorization'] as string)?.replace('Bearer ', '') ||
      req.body.adminKey ||
      (req.query.adminKey as string);

    if (!verifyAdminAccess(adminKey)) {
      res.status(403).json({
        error: 'Access Denied: Only administrators can remove mods.',
      });
      return;
    }

    const { id } = req.params;
    const success = deleteMod(id);
    if (!success) {
      res.status(404).json({ error: 'Mod not found' });
      return;
    }

    res.json({ success: true, message: 'Mod removed successfully.' });
  } catch (error: any) {
    console.error('[API] Error deleting mod:', error);
    res.status(500).json({ error: error.message || 'Failed to delete mod' });
  }
});

// --- Site Branding & Logo Endpoints ---
app.get('/api/settings', (req, res) => {
  try {
    const settings = loadSiteSettings();
    res.json(settings);
  } catch (error: any) {
    console.error('[API] Error fetching settings:', error);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

app.post('/api/settings/logo', (req, res) => {
  try {
    const { logoBase64, logoUrl, siteName, tagline } = req.body;
    const updated = updateSiteLogo({ logoBase64, logoUrl, siteName, tagline });
    res.json({ success: true, settings: updated });
  } catch (error: any) {
    console.error('[API] Error updating logo:', error);
    res.status(500).json({ error: error.message || 'Failed to update website logo' });
  }
});

// --- Daytona.io Cloud VPS / Sandbox Integration ---
const DAYTONA_API_KEY =
  process.env.DAYTONA_API_KEY || 'dtn_f17cd883a2b250c7617e7ced33c0536489f53a5bc5d858718f6462ab55e686f4';

function getDaytonaClient(): Daytona {
  return new Daytona({ apiKey: DAYTONA_API_KEY });
}

// Daytona API Status
app.get(['/api/daytona/status', '/api/superserve/status'], (req, res) => {
  res.json({
    configured: Boolean(DAYTONA_API_KEY && DAYTONA_API_KEY.trim() !== ''),
    provider: 'daytona.io',
    defaultResources: {
      cpu: '4 Core CPU',
      ram: '8 GB RAM',
      disk: '10 GB Disk',
    },
  });
});

// List projects (sandboxes from Daytona.io)
app.get(['/api/daytona/projects', '/api/superserve/projects'], async (req, res) => {
  try {
    if (!DAYTONA_API_KEY) {
      res.json({ projects: [] });
      return;
    }

    const daytona = getDaytonaClient();
    const sandboxes: any[] = [];
    for await (const sb of daytona.list()) {
      sandboxes.push(sb);
    }

    const projects = sandboxes.map((s) => {
      const isRunning = s.state === 'started' || s.state === 'running' || s.state === 'active';
      return {
        id: s.id,
        name: s.name,
        status: isRunning ? 'active' : 'deploying',
        resources: {
          cpu: `${s.cpu || 4} Core CPU`,
          ram: `${s.memory || 8} GB RAM`,
          disk: `${s.disk || 10} GB Disk`,
        },
        createdAt: s.createdAt
          ? new Date(s.createdAt).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })
          : new Date().toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            }),
        provider: 'daytona.io',
      };
    });

    res.json({ projects });
  } catch (error: any) {
    console.error('[Daytona] List projects error:', error);
    res.status(500).json({ error: error.message || 'Failed to list Daytona projects' });
  }
});

// Create project (provisions a live VPS sandbox on Daytona.io)
app.post(['/api/daytona/projects', '/api/superserve/projects'], async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || typeof name !== 'string' || !name.trim()) {
      res.status(400).json({ error: 'Project name is required.' });
      return;
    }

    if (!DAYTONA_API_KEY) {
      res.status(500).json({ error: 'DAYTONA_API_KEY is not configured.' });
      return;
    }

    console.log(`[Daytona] Provisioning live VPS sandbox for project: "${name.trim()}"`);
    const daytona = getDaytonaClient();
    const sb = await daytona.create(
      {
        name: name.trim(),
      },
      { timeout: 90 }
    );

    const project = {
      id: sb.id,
      name: sb.name,
      status: 'active',
      resources: {
        cpu: `${sb.cpu || 4} Core CPU`,
        ram: `${sb.memory || 8} GB RAM`,
        disk: `${sb.disk || 10} GB Disk`,
      },
      createdAt: new Date().toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }),
      provider: 'daytona.io',
    };

    console.log(`[Daytona] Successfully created sandbox ${sb.id} (${sb.name})`);
    res.status(201).json({ project });
  } catch (error: any) {
    console.error('[Daytona] Create project error:', error);
    res.status(500).json({ error: error.message || 'Failed to create VPS project on Daytona.io' });
  }
});

// Delete project (terminates sandbox on Daytona.io)
app.delete(['/api/daytona/projects/:id', '/api/superserve/projects/:id'], async (req, res) => {
  try {
    const { id } = req.params;
    if (!DAYTONA_API_KEY) {
      res.status(500).json({ error: 'DAYTONA_API_KEY is not configured.' });
      return;
    }

    console.log(`[Daytona] Terminating sandbox ${id}`);
    const daytona = getDaytonaClient();
    const sb = await daytona.get(id);
    await daytona.delete(sb);
    res.json({ success: true, message: 'Daytona VPS sandbox terminated successfully.' });
  } catch (error: any) {
    console.error('[Daytona] Delete project error:', error);
    res.status(500).json({ error: error.message || 'Failed to delete Daytona project.' });
  }
});

// Helper to normalize shell commands for remote headless execution
function normalizeRemoteCommand(cmd: string): string {
  let normalized = cmd.trim();

  // In Debian/Ubuntu Linux, `apt` is meant for interactive TTYs and prints warning:
  // "WARNING: apt does not have a stable CLI interface. Use with caution in scripts."
  // It also halts without '-y'. We convert to `apt-get` with non-interactive flags.
  normalized = normalized.replace(/\bapt\s+update\b/g, 'apt-get update');
  normalized = normalized.replace(/\bapt\s+upgrade\b/g, 'apt-get upgrade -y');
  normalized = normalized.replace(/\bapt\s+dist-upgrade\b/g, 'apt-get dist-upgrade -y');

  // Ensure 'install' has -y so non-interactive execution does not abort
  normalized = normalized.replace(
    /\bapt(?:-get)?\s+install(?!\s+-[a-zA-Z]*y|\s+--yes)([\s\S]*?)(?:&&|;|$)/g,
    (match, rest) => `apt-get install -y${rest}`
  );

  // Ensure 'remove' has -y
  normalized = normalized.replace(
    /\bapt(?:-get)?\s+remove(?!\s+-[a-zA-Z]*y|\s+--yes)([\s\S]*?)(?:&&|;|$)/g,
    (match, rest) => `apt-get remove -y${rest}`
  );

  // In Daytona, default user is `daytona` with passwordless sudo.
  // Auto-prepend sudo if administrative commands are run without sudo
  if (/^(?:apt-get|apt|dpkg|systemctl|useradd|usermod|groupadd|service)\b/.test(normalized)) {
    normalized = `sudo DEBIAN_FRONTEND=noninteractive ${normalized}`;
  }

  return normalized;
}

// Execute command on live Daytona VPS sandbox
app.post(['/api/daytona/projects/:id/exec', '/api/superserve/projects/:id/exec'], async (req, res) => {
  try {
    const { id } = req.params;
    const { command } = req.body;
    if (!command || typeof command !== 'string') {
      res.status(400).json({ error: 'command is required.' });
      return;
    }

    if (!DAYTONA_API_KEY) {
      res.status(500).json({ error: 'DAYTONA_API_KEY is not configured.' });
      return;
    }

    const processedCommand = normalizeRemoteCommand(command);

    const daytona = getDaytonaClient();
    const sb = await daytona.get(id);
    const result = await sb.process.executeCommand(processedCommand);

    // Clean benign apt stability advisory warning if present
    const rawOutput = (result.result || result.artifacts?.stdout || '').trim();
    const cleanOutput = rawOutput
      .replace(/WARNING: apt does not have a stable CLI interface\. Use with caution in scripts\.\n?/g, '')
      .trim();

    let cleanStderr = '';
    if (result.exitCode !== 0) {
      cleanStderr = cleanOutput;
    }

    res.json({
      commandRan: processedCommand,
      stdout: cleanOutput,
      stderr: cleanStderr,
      exitCode: result.exitCode ?? 0,
    });
  } catch (error: any) {
    console.error('[Daytona] Command exec error:', error);
    res.status(500).json({ error: error.message || 'Failed to execute command on Daytona sandbox' });
  }
});

// Get live resource metrics from the Daytona VPS
app.get(['/api/daytona/projects/:id/metrics', '/api/superserve/projects/:id/metrics'], async (req, res) => {
  try {
    const { id } = req.params;
    if (!DAYTONA_API_KEY) {
      res.status(500).json({ error: 'DAYTONA_API_KEY is not configured.' });
      return;
    }

    const daytona = getDaytonaClient();
    const sb = await daytona.get(id);

    const [resUptime, resMem, resDisk] = await Promise.all([
      sb.process.executeCommand('uptime -p').catch(() => ({ result: 'up recently' })),
      sb.process.executeCommand('free -m').catch(() => ({ result: '' })),
      sb.process.executeCommand('df -h /').catch(() => ({ result: '' })),
    ]);

    let uptime = (resUptime.result || '').trim();
    let memoryUsedMb = 210;
    let memoryTotalMb = 8192;
    let diskUsed = '2.1G';
    let diskTotal = '10G';

    // Parse free -m
    const memMatch = (resMem.result || '').match(/Mem:\s+(\d+)\s+(\d+)/);
    if (memMatch) {
      memoryTotalMb = parseInt(memMatch[1], 10);
      memoryUsedMb = parseInt(memMatch[2], 10);
    }

    // Parse df -h
    const diskLines = (resDisk.result || '').split('\n');
    if (diskLines.length > 1) {
      const parts = diskLines[1].trim().split(/\s+/);
      if (parts.length >= 4) {
        diskTotal = parts[1];
        diskUsed = parts[2];
      }
    }

    res.json({
      uptime,
      memoryUsedMb,
      memoryTotalMb,
      diskUsed,
      diskTotal,
    });
  } catch (error: any) {
    console.error('[Daytona] Metrics error:', error);
    res.status(500).json({ error: error.message || 'Failed to retrieve metrics from Daytona' });
  }
});


async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
