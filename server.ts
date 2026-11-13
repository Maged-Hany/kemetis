import 'dotenv/config';
import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DEFAULT_CHECKIN, DEFAULT_MISSION } from './src/data/defaults';
import { parseCommands } from './src/engine/physiology';
import type { Action, CheckIn, GravityMode, MissionParams, Vitals, View } from './src/types/health';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isProd = process.argv.includes('--prod') || process.env.NODE_ENV === 'production';

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const TEXT_MODELS = (process.env.GROQ_TEXT_MODELS || 'openai/gpt-oss-120b,llama-3.3-70b-versatile,openai/gpt-oss-20b')
  .split(',')
  .map((m) => m.trim())
  .filter(Boolean);
const VISION_MODELS = (process.env.GROQ_VISION_MODELS || 'meta-llama/llama-4-scout-17b-16e-instruct')
  .split(',')
  .map((m) => m.trim())
  .filter(Boolean);

interface ModelReply {
  reply?: string;
  view?: View | 'none';
  gravity?: GravityMode | 'none';
  camera?: 'on' | 'off' | 'unchanged';
  mic?: 'on' | 'off' | 'unchanged';
  missionDays?: number | null;
  solarStorm?: boolean | null;
}

interface HistoryItem {
  role: 'user' | 'assistant';
  text: string;
}

function getApiKey(): string | null {
  const key = process.env.GROQ_API_KEY?.trim();
  if (!key || key === 'YOUR_GROQ_API_KEY') return null;
  return key;
}

function systemPrompt(vitals: Vitals, checkIn: CheckIn, mission: MissionParams, cameraOn: boolean, view: View) {
  return `You are Kemetis, a calm flight surgeon on a live call with an astronaut. Talk like a person, not a report.
Keep replies to 1-3 short sentences. No markdown, no lists, no emojis. Answer what was actually asked. Only mention numbers that matter for the question.

Current readings:
heart rate ${vitals.heartRateBpm} bpm${vitals.heartRateMeasured ? ' (measured from camera)' : ' (estimated)'}, blood pressure ${vitals.systolic}/${vitals.diastolic}, SpO2 ${vitals.spo2Pct}%, breathing ${vitals.respirationBpm}/min, glucose ${vitals.glucoseMgDl} mg/dL (${vitals.glucoseState}), hydration ${vitals.hydrationPct}%, temperature ${vitals.bodyTempC} C, optic nerve sheath ${vitals.onsdMm} mm, 7-day microneedle patch Day ${vitals.patchDay ?? 4}/7 (sensitivity ${vitals.sensorSensitivityPct ?? 98}%, Urea ${vitals.ureaMgDl ?? 28} mg/dL, Calcium Ca2+ ${vitals.calciumMgDl ?? 9.4} mg/dL, renal status ${vitals.renalRisk ?? 'Normal'}), overall ${vitals.status}.
Check-in: meal=${checkIn.meal}, hydration=${checkIn.hydration}, head=${checkIn.head}, sleep=${checkIn.sleep}.
Camera on: ${cameraOn}. Open screen: ${view}. Mission sim: gravity ${mission.gravity}, ${mission.days} days, shielding ${mission.shielding} g/cm2, solar storm ${mission.solarStorm}.

You can also control the app. Reply with JSON only:
{"reply": string, "view": "call"|"lab"|"none", "gravity": "0g"|"0.16g"|"0.38g"|"1g"|"none", "camera": "on"|"off"|"unchanged", "mic": "on"|"off"|"unchanged", "missionDays": number|null, "solarStorm": boolean|null}
Use "none", "unchanged", or null for every control field unless the astronaut explicitly asks to change it.`;
}

function parseJson(raw: string): ModelReply | null {
  const cleaned = raw.replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start === -1 || end <= start) return null;
  try {
    return JSON.parse(cleaned.slice(start, end + 1)) as ModelReply;
  } catch {
    return null;
  }
}

async function askModel(
  message: string,
  history: HistoryItem[],
  image: string | undefined,
  prompt: string
): Promise<ModelReply | null> {
  const apiKey = getApiKey();
  if (!apiKey) return null;

  const past = history.slice(-8).map((h) => ({ role: h.role, content: h.text.slice(0, 1200) }));
  const models = image ? [...VISION_MODELS, ...TEXT_MODELS] : TEXT_MODELS;

  for (const model of models) {
    const withImage = Boolean(image) && VISION_MODELS.includes(model);
    const content = withImage
      ? [
          { type: 'text', text: `${message}\n\nA frame from my camera is attached if it helps.` },
          { type: 'image_url', image_url: { url: image } },
        ]
      : message;

    for (const forcePlainJson of [false, true]) {
      if (forcePlainJson && !withImage) continue;
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 20000);
        const body: Record<string, unknown> = {
          model,
          messages: [{ role: 'system', content: prompt }, ...past, { role: 'user', content }],
          temperature: 0.6,
          max_tokens: 400,
        };
        if (!forcePlainJson) {
          body.response_format = { type: 'json_object' };
        }
        const response = await fetch(GROQ_URL, {
          method: 'POST',
          signal: controller.signal,
          headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        }).finally(() => clearTimeout(timeout));

        if (!response.ok) {
          console.warn(`[groq] ${model} -> ${response.status}`);
          if (response.status === 400 && withImage && !forcePlainJson) continue;
          break;
        }

        const data = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
        const parsed = parseJson(data.choices?.[0]?.message?.content ?? '');
        if (parsed?.reply?.trim()) return parsed;
      } catch (err) {
        console.warn(`[groq] ${model} failed: ${(err as Error).message}`);
        break;
      }
    }
  }
  return null;
}

function offlineReply(message: string, v: Vitals): string {
  const t = message.toLowerCase();
  if (/urea|calcium|renal|kidney|patch|microneedle|biofouling/.test(t)) {
    return `Your 7-day microneedle patch is on Day ${v.patchDay ?? 4} at ${v.sensorSensitivityPct ?? 98}% sensitivity, reading Urea ${v.ureaMgDl ?? 28} mg/dL and Calcium ${v.calciumMgDl ?? 9.4} mg/dL (${v.renalRisk ?? 'Normal'}).`;
  }
  if (/sugar|glucose|ate|meal|hungry|shaky|food/.test(t)) {
    return `Your glucose estimate is about ${v.glucoseMgDl} mg/dL, which reads as ${v.glucoseState.toLowerCase()}. ${
      v.glucoseMgDl < 80 ? 'Grab something with slow carbs soon.' : v.glucoseMgDl > 140 ? 'That should settle within a couple of hours.' : 'Nothing to worry about.'
    }`;
  }
  if (/heart|pulse|bpm|pressure/.test(t)) {
    return `Heart rate is ${v.heartRateBpm} bpm and pressure is around ${v.systolic}/${v.diastolic}. ${
      v.heartRateBpm > 95 ? 'A bit high, take a few slow breaths with me.' : 'That looks steady.'
    }`;
  }
  if (/oxygen|spo2|breath|lung/.test(t)) {
    return `Oxygen is ${v.spo2Pct}% and you're breathing about ${v.respirationBpm} times a minute. ${
      v.spo2Pct < 95 ? "Let's keep an eye on that." : 'All good there.'
    }`;
  }
  if (/thirst|water|hydrat|dry/.test(t)) {
    return `Hydration is around ${v.hydrationPct}%. ${v.hydrationPct < 80 ? 'Have some water now and keep sipping over the next hour.' : "You're doing fine, keep it up."}`;
  }
  if (/tired|sleep|exhaust|fatigue/.test(t)) {
    return `Short sleep shows up in your heart rate variability, it's at ${v.hrvMs} ms. Try to keep the next work block light if you can.`;
  }
  if (/head|eye|vision|blurry/.test(t)) {
    return `Eye pressure proxy is ${v.onsdMm} mm. ${v.onsdMm >= 5.2 ? 'That is elevated, log it and tell me if your vision changes.' : 'Within the normal range.'}`;
  }
  if (/lab|sim|mars|moon|gravity|radiation|days/.test(t)) {
    return 'Done. The mission simulator is updated, take a look.';
  }
  return `You look ${v.status === 'Nominal' ? 'good' : 'mostly okay'} right now. Heart rate ${v.heartRateBpm}, oxygen ${v.spo2Pct}%. What's on your mind?`;
}

function mergeActions(
  local: Action[],
  remote: ModelReply | null,
  currentView: View,
  currentMission: MissionParams,
  cameraOn: boolean,
  micOn: boolean
): Action[] {
  const merged = [...local];
  if (!remote) return merged;
  const exists = (type: Action['type']) => merged.some((a) => a.type === type);

  if ((remote.view === 'call' || remote.view === 'lab') && remote.view !== currentView && !exists('SWITCH_VIEW')) {
    merged.push({ type: 'SWITCH_VIEW', view: remote.view });
  }
  if (
    remote.gravity &&
    remote.gravity !== 'none' &&
    remote.gravity !== currentMission.gravity &&
    ['0g', '0.16g', '0.38g', '1g'].includes(remote.gravity) &&
    !exists('SET_GRAVITY')
  ) {
    merged.push({ type: 'SET_GRAVITY', gravity: remote.gravity });
  }
  if ((remote.camera === 'on' || remote.camera === 'off') && (remote.camera === 'on') !== cameraOn && !exists('SET_CAMERA')) {
    merged.push({ type: 'SET_CAMERA', enabled: remote.camera === 'on' });
  }
  if ((remote.mic === 'on' || remote.mic === 'off') && (remote.mic === 'on') !== micOn && !exists('SET_MIC')) {
    merged.push({ type: 'SET_MIC', enabled: remote.mic === 'on' });
  }
  if (!exists('UPDATE_MISSION')) {
    const patch: Partial<MissionParams> = {};
    if (typeof remote.missionDays === 'number' && remote.missionDays >= 14) {
      const clampedDays = Math.min(1000, Math.round(remote.missionDays));
      if (clampedDays !== currentMission.days) patch.days = clampedDays;
    }
    if (typeof remote.solarStorm === 'boolean' && remote.solarStorm !== currentMission.solarStorm) {
      patch.solarStorm = remote.solarStorm;
    }
    if (Object.keys(patch).length > 0) merged.push({ type: 'UPDATE_MISSION', patch });
  }
  return merged;
}

async function start() {
  const app = express();
  const port = Number(process.env.PORT || 3000);

  app.use(express.json({ limit: '4mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, ai: Boolean(getApiKey()) });
  });

  app.post('/api/chat', async (req, res) => {
    const message = String(req.body?.message ?? '').trim().slice(0, 2000);
    if (!message) {
      res.status(400).json({ error: 'Empty message' });
      return;
    }

    const history: HistoryItem[] = Array.isArray(req.body?.history)
      ? req.body.history
          .filter((h: HistoryItem) => h && (h.role === 'user' || h.role === 'assistant') && typeof h.text === 'string')
          .slice(-8)
      : [];
    const rawImage = req.body?.image;
    const image = typeof rawImage === 'string' && rawImage.startsWith('data:image/') ? rawImage : undefined;
    const ctx = req.body?.context ?? {};
    const vitals = ctx.vitals as Vitals | undefined;
    if (!vitals || typeof vitals.heartRateBpm !== 'number') {
      res.status(400).json({ error: 'Missing vitals' });
      return;
    }
    const checkIn: CheckIn = { ...DEFAULT_CHECKIN, ...(ctx.checkIn ?? {}) };
    const mission: MissionParams = { ...DEFAULT_MISSION, ...(ctx.mission ?? {}) };
    const view: View = ctx.view === 'lab' ? 'lab' : 'call';
    const cameraOn = Boolean(ctx.cameraOn ?? image);
    const micOn = Boolean(ctx.micOn);

    const local = parseCommands(message);
    const remote = await askModel(message, history, image, systemPrompt(vitals, checkIn, mission, cameraOn, view));

    res.json({
      reply: remote?.reply?.trim() || offlineReply(message, vitals),
      actions: mergeActions(local, remote, view, mission, cameraOn, micOn),
      online: Boolean(remote),
    });
  });

  if (!isProd) {
    const { createServer } = await import('vite');
    const vite = await createServer({ server: { middlewareMode: true }, appType: 'spa' });
    app.use(vite.middlewares);
  } else {
    const dist = path.join(__dirname, 'dist');
    app.use(express.static(dist));
    app.get('*', (_req, res) => res.sendFile(path.join(dist, 'index.html')));
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`kemetis running on http://localhost:${port}${getApiKey() ? '' : ' (no GROQ_API_KEY, using offline replies)'}`);
  });
}

start();
