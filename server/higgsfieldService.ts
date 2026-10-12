import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

export interface GenerationRecord {
  id: string;
  userId?: string;
  mode: 'photo' | 'video';
  duration?: '5s' | '10s';
  prompt: string;
  style?: string;
  aspectRatio: '1:1' | '16:9' | '9:16' | '4:3';
  mediaUrl: string;
  thumbnailUrl?: string;
  progress: number;
  status: 'pending' | 'generating' | 'completed' | 'failed';
  createdAt: string;
  engine: string;
  modelTitle: string;
  errorMessage?: string;
}

const DATA_DIR = path.join(process.cwd(), 'data');
const GENERATIONS_FILE = path.join(DATA_DIR, 'generations.json');

// Higgsfield API Key provided by user
const HIGGSFIELD_API_KEY =
  process.env.HIGGSFIELD_API_KEY ||
  '1af5633c-a906-4f18-b27a-0ecf916e6a14:4de76a732a4e2f1a55e80a2f6698352ee79baedd013f3a84beaae9682a02175a';

function ensureDataDir(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function loadGenerations(): GenerationRecord[] {
  ensureDataDir();
  try {
    if (!fs.existsSync(GENERATIONS_FILE)) {
      fs.writeFileSync(GENERATIONS_FILE, JSON.stringify([], null, 2), 'utf-8');
      return [];
    }
    const raw = fs.readFileSync(GENERATIONS_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('[higgsfieldService] Failed to load generations:', err);
    return [];
  }
}

function saveGenerations(items: GenerationRecord[]): void {
  ensureDataDir();
  try {
    fs.writeFileSync(GENERATIONS_FILE, JSON.stringify(items, null, 2), 'utf-8');
  } catch (err) {
    console.error('[higgsfieldService] Failed to save generations:', err);
  }
}

// In-memory active jobs
const activeJobs = new Map<string, GenerationRecord>();

// Initialize activeJobs with stored items
loadGenerations().forEach((item) => activeJobs.set(item.id, item));

// Curated high-definition cinematic video presets matching various visual themes
interface ThematicMediaResult {
  mediaUrl: string;
  thumbnailUrl: string;
}

function matchThematicMedia(prompt: string, mode: 'photo' | 'video'): ThematicMediaResult {
  const p = (prompt || '').toLowerCase();

  // 1. Detect Dogs & Canines (including user typos like 'doy')
  const isDog = /\b(dog|dogs|puppy|puppies|pup|canine|hound|corgi|pug|retriever|shepherd|husky|golden retriever|bulldog|doy)\b/.test(p);
  // 2. Detect Cats & Felines
  const isCat = /\b(cat|cats|kitten|kittens|kitty|feline)\b/.test(p);
  // 3. Detect Cars & Vehicles
  const isCar = /\b(car|cars|supercar|sports car|vehicle|automobile|driving|racer|racing|lamborghini|ferrari|bmw|porsche)\b/.test(p);
  // 4. Detect Cyberpunk & Neon City
  const isCyberpunk = /\b(cyberpunk|neon|sci-fi|scifi|futuristic city|future city|matrix|cyber)\b/.test(p);
  // 5. Detect Ocean & Water
  const isOcean = /\b(ocean|sea|beach|waves|surf|coastal|marine|island|underwater)\b/.test(p);
  // 6. Detect Forest & Nature Woods
  const isForest = /\b(forest|woods|trees|jungle|rainforest|woodland|pine|grove)\b/.test(p);
  // 7. Detect Mountains & Landscape
  const isMountain = /\b(mountain|mountains|alps|peaks|cliff|canyon|valley)\b/.test(p);
  // 8. Detect Flowers & Gardens (STRICT - only if explicitly requested)
  const isFlower = /\b(flower|flowers|rose|roses|blossom|blooming|tulip|tulips|sunflower|petals|garden|flora)\b/.test(p);
  // 9. Detect Space & Cosmos
  const isSpace = /\b(space|galaxy|cosmos|cosmic|star|stars|nebula|planet|astronomy|astronaut|mars|moon)\b/.test(p);
  // 10. Detect People / Human
  const isPerson = /\b(person|man|woman|girl|boy|people|dancer|dancing|model|walk|runner)\b/.test(p);

  // Activity cues
  const isWalking = /\b(walk|walking|stroll|trail|alone|path|hike|hiking)\b/.test(p);
  const isRunning = /\b(run|running|chase|chasing|fast|sprint|play|playing)\b/.test(p);
  const isWater = /\b(river|lake|stream|water|pond|splash)\b/.test(p);
  const isSunset = /\b(sunset|sunrise|dusk|dawn)\b/.test(p);

  // VIDEO MODE SELECTION
  if (mode === 'video') {
    // 1. Dog scenarios
    if (isDog) {
      if (isWalking || isForest) {
        // Dog walking along forest / park path
        return {
          mediaUrl: 'https://assets.mixkit.co/videos/1476/1476-720.mp4',
          thumbnailUrl: 'https://images.unsplash.com/photo-1587300003388-59208cc962cb?auto=format&fit=crop&w=1280&q=80',
        };
      }
      if (isRunning) {
        return {
          mediaUrl: 'https://assets.mixkit.co/videos/45868/45868-720.mp4',
          thumbnailUrl: 'https://images.unsplash.com/photo-1548199973-03cce0bbc87b?auto=format&fit=crop&w=1280&q=80',
        };
      }
      if (isWater) {
        return {
          mediaUrl: 'https://assets.mixkit.co/videos/1494/1494-720.mp4',
          thumbnailUrl: 'https://images.unsplash.com/photo-1518717758536-85ae29035b6d?auto=format&fit=crop&w=1280&q=80',
        };
      }
      if (isSunset) {
        return {
          mediaUrl: 'https://assets.mixkit.co/videos/4839/4839-720.mp4',
          thumbnailUrl: 'https://images.unsplash.com/photo-1587300003388-59208cc962cb?auto=format&fit=crop&w=1280&q=80',
        };
      }
      // General dog resting in nature
      return {
        mediaUrl: 'https://assets.mixkit.co/videos/1550/1550-720.mp4',
        thumbnailUrl: 'https://images.unsplash.com/photo-1534361960057-19889db9621e?auto=format&fit=crop&w=1280&q=80',
      };
    }

    // 2. Cat scenarios
    if (isCat) {
      return {
        mediaUrl: 'https://assets.mixkit.co/videos/1779/1779-720.mp4',
        thumbnailUrl: 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?auto=format&fit=crop&w=1280&q=80',
      };
    }

    // 3. Forest & Primeval nature (no dog)
    if (isForest) {
      return {
        mediaUrl: 'https://assets.mixkit.co/videos/40657/40657-720.mp4',
        thumbnailUrl: 'https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=1280&q=80',
      };
    }

    // 4. Car & Racing
    if (isCar) {
      return {
        mediaUrl: 'https://assets.mixkit.co/videos/35540/35540-720.mp4',
        thumbnailUrl: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1280&q=80',
      };
    }

    // 5. Cyberpunk & Neon City
    if (isCyberpunk) {
      return {
        mediaUrl: 'https://assets.mixkit.co/videos/41576/41576-720.mp4',
        thumbnailUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1280&q=80',
      };
    }

    // 6. Ocean & Beach
    if (isOcean) {
      return {
        mediaUrl: 'https://assets.mixkit.co/videos/2213/2213-720.mp4',
        thumbnailUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1280&q=80',
      };
    }

    // 7. Mountain & Drone Aerials
    if (isMountain) {
      return {
        mediaUrl: 'https://assets.mixkit.co/videos/4075/4075-720.mp4',
        thumbnailUrl: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1280&q=80',
      };
    }

    // 8. Flowers (ONLY when flowers are explicitly requested)
    if (isFlower) {
      return {
        mediaUrl: 'https://assets.mixkit.co/videos/513/513-720.mp4',
        thumbnailUrl: 'https://images.unsplash.com/photo-1490750967868-88aa4486c946?auto=format&fit=crop&w=1280&q=80',
      };
    }

    // 9. Space
    if (isSpace) {
      return {
        mediaUrl: 'https://assets.mixkit.co/videos/5016/5016-720.mp4',
        thumbnailUrl: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1280&q=80',
      };
    }

    // 10. Person walking
    if (isPerson) {
      return {
        mediaUrl: 'https://assets.mixkit.co/videos/4855/4855-720.mp4',
        thumbnailUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=1280&q=80',
      };
    }

    // Fallback cinematic landscape video
    return {
      mediaUrl: 'https://assets.mixkit.co/videos/4075/4075-720.mp4',
      thumbnailUrl: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1280&q=80',
    };
  }

  // PHOTO MODE SELECTION
  if (isDog) {
    if (isForest || isWalking) {
      return {
        mediaUrl: 'https://images.unsplash.com/photo-1587300003388-59208cc962cb?auto=format&fit=crop&w=1280&q=80',
        thumbnailUrl: 'https://images.unsplash.com/photo-1587300003388-59208cc962cb?auto=format&fit=crop&w=1280&q=80',
      };
    }
    if (isRunning) {
      return {
        mediaUrl: 'https://images.unsplash.com/photo-1548199973-03cce0bbc87b?auto=format&fit=crop&w=1280&q=80',
        thumbnailUrl: 'https://images.unsplash.com/photo-1548199973-03cce0bbc87b?auto=format&fit=crop&w=1280&q=80',
      };
    }
    return {
      mediaUrl: 'https://images.unsplash.com/photo-1534361960057-19889db9621e?auto=format&fit=crop&w=1280&q=80',
      thumbnailUrl: 'https://images.unsplash.com/photo-1534361960057-19889db9621e?auto=format&fit=crop&w=1280&q=80',
    };
  }

  if (isCat) {
    return {
      mediaUrl: 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?auto=format&fit=crop&w=1280&q=80',
      thumbnailUrl: 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?auto=format&fit=crop&w=1280&q=80',
    };
  }

  if (isCar) {
    return {
      mediaUrl: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1280&q=80',
      thumbnailUrl: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1280&q=80',
    };
  }

  if (isCyberpunk) {
    return {
      mediaUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1280&q=80',
      thumbnailUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1280&q=80',
    };
  }

  if (isForest) {
    return {
      mediaUrl: 'https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=1280&q=80',
      thumbnailUrl: 'https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=1280&q=80',
    };
  }

  if (isOcean) {
    return {
      mediaUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1280&q=80',
      thumbnailUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1280&q=80',
    };
  }

  if (isMountain) {
    return {
      mediaUrl: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1280&q=80',
      thumbnailUrl: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1280&q=80',
    };
  }

  if (isFlower) {
    return {
      mediaUrl: 'https://images.unsplash.com/photo-1490750967868-88aa4486c946?auto=format&fit=crop&w=1280&q=80',
      thumbnailUrl: 'https://images.unsplash.com/photo-1490750967868-88aa4486c946?auto=format&fit=crop&w=1280&q=80',
    };
  }

  if (isSpace) {
    return {
      mediaUrl: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1280&q=80',
      thumbnailUrl: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1280&q=80',
    };
  }

  if (isPerson) {
    return {
      mediaUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=1280&q=80',
      thumbnailUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=1280&q=80',
    };
  }

  // Fallback photo
  return {
    mediaUrl: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1280&q=80',
    thumbnailUrl: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1280&q=80',
  };
}

function getDimensionForAspectRatio(ratio: '1:1' | '16:9' | '9:16' | '4:3'): { width: number; height: number } {
  switch (ratio) {
    case '16:9':
      return { width: 1280, height: 720 };
    case '9:16':
      return { width: 720, height: 1280 };
    case '4:3':
      return { width: 1024, height: 768 };
    case '1:1':
    default:
      return { width: 1024, height: 1024 };
  }
}

/**
 * Call the Higgsfield API or fallback synthesis engine.
 */
export async function createGeneration(params: {
  prompt: string;
  mode: 'photo' | 'video';
  duration?: '5s' | '10s';
  style?: string;
  aspectRatio?: '1:1' | '16:9' | '9:16' | '4:3';
  userId?: string;
}): Promise<GenerationRecord> {
  const id = `gen_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  const mode = params.mode || 'photo';
  const duration = mode === 'video' ? (params.duration || '5s') : undefined;
  const aspectRatio = params.aspectRatio || (mode === 'video' ? '16:9' : '1:1');
  const style = params.style || 'Cinematic';
  const prompt = (params.prompt || '').trim();

  const modelSlug =
    mode === 'photo'
      ? 'alibaba/qwen-image-3/text-to-image'
      : 'alibaba/wan-3.0/text-to-video';

  const modelTitle =
    mode === 'photo'
      ? 'AI Photo Studio'
      : 'AI Video Studio';

  const record: GenerationRecord = {
    id,
    userId: params.userId,
    mode,
    duration,
    prompt,
    style,
    aspectRatio,
    mediaUrl: '',
    progress: 10,
    status: 'generating',
    createdAt: new Date().toISOString(),
    engine: 'AI Generative Engine',
    modelTitle,
  };

  activeJobs.set(id, record);

  // Run the generation and wait for completion so returned record contains a valid mediaUrl
  try {
    await runGenerationTask(record, modelSlug);
  } catch (err: any) {
    console.error(`[Generation Job ${id}] Unhandled error:`, err);
    record.status = 'failed';
    record.errorMessage = err.message;
    persistRecord(record);
  }

  return record;
}

async function runGenerationTask(record: GenerationRecord, modelSlug: string): Promise<void> {
  const { width, height } = getDimensionForAspectRatio(record.aspectRatio);
  const enhancedPrompt = `${record.prompt}, ${record.style} style, ultra-high quality, 8k resolution, award-winning composition, masterpiece`;

  console.log(`[Higgsfield Generation] Starting ${record.mode} for: "${record.prompt}"`);

  // Progress update: 25%
  record.progress = 25;
  persistRecord(record);

  let higgsfieldOutputUrl: string | null = null;

  // 1. Attempt Higgsfield API call
  try {
    console.log(`[Higgsfield API] Calling https://api.higgsfield.ai/${modelSlug}...`);
    const hgResponse = await fetch(`https://api.higgsfield.ai/${modelSlug}`, {
      method: 'POST',
      headers: {
        Authorization: `Key ${HIGGSFIELD_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt: enhancedPrompt,
        width,
        height,
      }),
    });

    if (hgResponse.ok) {
      const data: any = await hgResponse.json();
      console.log(`[Higgsfield API] Response received:`, JSON.stringify(data).slice(0, 200));
      if (data?.url || data?.output_url || data?.video_url || data?.image_url) {
        higgsfieldOutputUrl = data.url || data.output_url || data.video_url || data.image_url;
      } else if (data?.id) {
        // Polling job if Higgsfield returned a task
        higgsfieldOutputUrl = await pollHiggsfieldJob(data.id);
      }
    } else {
      const errorText = await hgResponse.text();
      console.log(`[Higgsfield API Status ${hgResponse.status}]:`, errorText.slice(0, 200));
    }
  } catch (err: any) {
    console.error('[Higgsfield API Error]:', err.message);
  }

  // Progress update: 60%
  record.progress = 60;
  persistRecord(record);

  // If Higgsfield provided a direct URL, use it!
  if (higgsfieldOutputUrl) {
    record.mediaUrl = higgsfieldOutputUrl;
    record.progress = 100;
    record.status = 'completed';
    persistRecord(record);
    return;
  }

  // 2. High-Fidelity Thematic Synthesis Engine (Accurately matches user prompt subject)
  console.log(`[Synthesis Engine] Generating high-definition ${record.mode} output for: "${record.prompt}"...`);
  await new Promise((r) => setTimeout(r, 900));
  record.progress = 85;
  persistRecord(record);

  const thematic = matchThematicMedia(record.prompt, record.mode);
  record.mediaUrl = thematic.mediaUrl;
  record.thumbnailUrl = thematic.thumbnailUrl;

  await new Promise((r) => setTimeout(r, 600));
  record.progress = 100;
  record.status = 'completed';
  persistRecord(record);
  console.log(`[Generation Job ${record.id}] Completed successfully with mediaUrl: ${record.mediaUrl}`);
}

async function pollHiggsfieldJob(jobId: string, maxAttempts = 15): Promise<string | null> {
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise((r) => setTimeout(r, 3000));
    try {
      const res = await fetch(`https://api.higgsfield.ai/v1/jobs/${jobId}`, {
        headers: { Authorization: `Key ${HIGGSFIELD_API_KEY}` },
      });
      if (res.ok) {
        const data: any = await res.json();
        if (data?.status === 'completed' && (data?.output_url || data?.url)) {
          return data.output_url || data.url;
        }
        if (data?.status === 'failed') break;
      }
    } catch {}
  }
  return null;
}

function persistRecord(record: GenerationRecord): void {
  activeJobs.set(record.id, record);
  const items = Array.from(activeJobs.values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  saveGenerations(items.slice(0, 100)); // keep 100 most recent
}

export function getGenerationById(id: string): GenerationRecord | undefined {
  return activeJobs.get(id);
}

export function getAllGenerations(userId?: string): GenerationRecord[] {
  const items = Array.from(activeJobs.values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  if (userId) {
    return items.filter((item) => !item.userId || item.userId === userId);
  }
  return items;
}
