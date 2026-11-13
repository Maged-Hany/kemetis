import { DEFAULT_CHECKIN, DEFAULT_MANUAL_OVERRIDES } from '../data/defaults';
import type {
  Action,
  CheckIn,
  GravityMode,
  ManualVitalsOverride,
  MissionOutput,
  MissionParams,
  OpticalSample,
  Vitals,
  VoiceSample,
} from '../types/health';

export function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

function isNum(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v);
}

export function computeVitals(
  optical: OpticalSample,
  voice: VoiceSample,
  checkIn: CheckIn = DEFAULT_CHECKIN,
  measuredHeartRate: number | null = null,
  overrides: ManualVitalsOverride = DEFAULT_MANUAL_OVERRIDES
): Vitals {
  const ratio = clamp(optical.redAcDc / Math.max(0.0005, optical.greenAcDc), 0.4, 1.35);
  const autoSpo2 = Math.round(clamp(110 - 25 * ratio, 86, 100));
  const spo2Pct = isNum(overrides.spo2Pct) ? Math.round(clamp(overrides.spo2Pct, 70, 100)) : autoSpo2;

  const pulsatile = clamp(optical.greenAcDc * 1000, 4, 42);
  const vocalLoad = (100 - voice.stabilityPct) * 0.35;
  const workout = checkIn.sleep === 'post_workout' ? 18 : 0;
  const dehydration = checkIn.hydration === 'thirsty' ? 7 : 0;

  const modelHeartRate = 62 + (pulsatile - 15) * 0.55 + vocalLoad + workout + dehydration;
  const heartRateMeasured = !isNum(overrides.heartRateBpm) && isNum(measuredHeartRate);
  const heartRateBpm = isNum(overrides.heartRateBpm)
    ? Math.round(clamp(overrides.heartRateBpm, 35, 200))
    : Math.round(clamp(heartRateMeasured ? (measuredHeartRate as number) : modelHeartRate, 40, 180));

  const hrvMs = Math.round(
    clamp(
      76 - (heartRateBpm - 60) * 0.8 - vocalLoad * 1.1 - (checkIn.sleep === 'short' ? 12 : 0),
      20,
      98
    )
  );

  const autoRespiration = Math.round(
    clamp(voice.respirationBpm + (checkIn.sleep === 'post_workout' ? 4 : 0), 9, 30)
  );
  const respirationBpm = isNum(overrides.respirationBpm)
    ? Math.round(clamp(overrides.respirationBpm, 6, 40))
    : autoRespiration;

  const autoSystolic = Math.round(clamp(114 + (heartRateBpm - 64) * 0.45 + (70 - hrvMs) * 0.25, 96, 162));
  const autoDiastolic = Math.round(clamp(74 + (heartRateBpm - 64) * 0.25 + (70 - hrvMs) * 0.15, 60, 104));
  const systolic = isNum(overrides.systolic) ? Math.round(clamp(overrides.systolic, 75, 220)) : autoSystolic;
  const diastolic = isNum(overrides.diastolic) ? Math.round(clamp(overrides.diastolic, 45, 140)) : autoDiastolic;

  const glucoseBase: Record<CheckIn['meal'], [number, string]> = {
    normal: [92, 'Steady'],
    just_ate: [132, 'Post-meal rise'],
    fasting: [79, 'Fasting'],
    shaky: [71, 'Running low'],
  };
  const [baseGlucose, baseState] = glucoseBase[checkIn.meal];
  const sleepBump = checkIn.sleep === 'short' ? 9 : 0;
  const stressBump = Math.max(0, (65 - hrvMs) * 0.18);
  const autoGlucose = Math.round(clamp(baseGlucose + sleepBump + stressBump, 65, 185));
  const glucoseMgDl = isNum(overrides.glucoseMgDl)
    ? Math.round(clamp(overrides.glucoseMgDl, 40, 320))
    : autoGlucose;

  const glucoseState = isNum(overrides.glucoseMgDl)
    ? glucoseMgDl < 75
      ? 'Running low'
      : glucoseMgDl <= 115
        ? 'Steady'
        : glucoseMgDl <= 145
          ? 'Post-meal rise'
          : 'Elevated'
    : baseState;

  const autoHydration = checkIn.hydration === 'good' ? 92 : checkIn.hydration === 'moderate' ? 81 : 69;
  const hydrationPct = isNum(overrides.hydrationPct)
    ? Math.round(clamp(overrides.hydrationPct, 40, 100))
    : autoHydration;

  const autoTemp = Number(
    clamp(36.6 + (checkIn.sleep === 'post_workout' ? 0.5 : 0) + (heartRateBpm - 65) * 0.008, 36.1, 38.4).toFixed(1)
  );
  const bodyTempC = isNum(overrides.bodyTempC)
    ? Number(clamp(overrides.bodyTempC, 35.0, 41.0).toFixed(1))
    : autoTemp;

  const redBlue = optical.redMean / Math.max(1, optical.blueMean);
  const headBump = checkIn.head === 'headache' ? 0.55 : checkIn.head === 'pressure' ? 0.25 : 0;
  const autoOnsd = Number(
    clamp(4.55 + Math.max(0, redBlue - 1.15) * 1.1 + headBump + (100 - hrvMs) * 0.004, 4.4, 6.4).toFixed(2)
  );
  const onsdMm = isNum(overrides.onsdMm)
    ? Number(clamp(overrides.onsdMm, 4.0, 7.2).toFixed(2))
    : autoOnsd;

  const patchDay = clamp(Math.round(overrides.patchDay ?? 4), 1, 7);
  const zwitterionicShield = overrides.zwitterionicShield ?? true;
  const skinTempC = clamp(overrides.skinTempC ?? 33.6, 30, 39);
  const skinHumidityPct = clamp(overrides.skinHumidityPct ?? 46, 15, 95);

  const sensorSensitivityPct = zwitterionicShield
    ? Math.round(clamp(99.4 - (patchDay - 1) * 0.55, 95, 100))
    : Math.round(
        patchDay <= 3
          ? 98 - (patchDay - 1) * 2.5
          : 93 - (patchDay - 3) * 9.8
      );

  const autoUrea = Math.round(
    clamp(28 + (92 - hydrationPct) * 0.45 + (checkIn.sleep === 'post_workout' ? 5 : 0), 14, 75)
  );
  const ureaMgDl = isNum(overrides.ureaMgDl)
    ? Math.round(clamp(overrides.ureaMgDl, 10, 120))
    : autoUrea;

  const autoCalcium = Number(
    clamp(9.4 - (92 - hydrationPct) * 0.018 - (checkIn.sleep === 'short' ? 0.15 : 0), 7.4, 11.2).toFixed(2)
  );
  const calciumMgDl = isNum(overrides.calciumMgDl)
    ? Number(clamp(overrides.calciumMgDl, 6.5, 12.5).toFixed(2))
    : autoCalcium;

  const afeSignalNa = Number(
    clamp((ureaMgDl * 0.34 + calciumMgDl * 0.85) * (sensorSensitivityPct / 100), 4.2, 48).toFixed(1)
  );

  const mlDriftCorrectionPct = Number(
    clamp(
      Math.abs(skinTempC - 33.5) * 0.85 +
        Math.abs(skinHumidityPct - 45) * 0.055 +
        (100 - sensorSensitivityPct) * 0.22,
      0.4,
      14.5
    ).toFixed(1)
  );

  const batteryPct = Math.round(clamp(100 - (patchDay - 1) * 12.5, 12, 100));

  let renalRisk: Vitals['renalRisk'] = 'Normal';
  if (ureaMgDl >= 42 && calciumMgDl <= 8.6) {
    renalRisk = 'Early Renal Alert';
  } else if (ureaMgDl >= 38 || calciumMgDl <= 8.8 || hydrationPct < 75) {
    renalRisk = 'Watch';
  }

  const manualActive = Boolean(
    isNum(overrides.glucoseMgDl) ||
      isNum(overrides.systolic) ||
      isNum(overrides.diastolic) ||
      isNum(overrides.heartRateBpm) ||
      isNum(overrides.spo2Pct) ||
      isNum(overrides.respirationBpm) ||
      isNum(overrides.hydrationPct) ||
      isNum(overrides.bodyTempC) ||
      isNum(overrides.onsdMm) ||
      isNum(overrides.ureaMgDl) ||
      isNum(overrides.calciumMgDl)
  );

  let status: Vitals['status'] = 'Nominal';
  if (
    spo2Pct < 92 ||
    heartRateBpm >= 120 ||
    systolic >= 150 ||
    onsdMm >= 5.8 ||
    glucoseMgDl <= 68 ||
    glucoseMgDl >= 165 ||
    renalRisk === 'Early Renal Alert'
  ) {
    status = 'Critical';
  } else if (
    spo2Pct < 95 ||
    heartRateBpm >= 95 ||
    systolic >= 132 ||
    onsdMm >= 5.2 ||
    glucoseMgDl <= 76 ||
    glucoseMgDl >= 142 ||
    hydrationPct < 75 ||
    renalRisk === 'Watch'
  ) {
    status = 'Advisory';
  }

  return {
    spo2Pct,
    heartRateBpm,
    heartRateMeasured,
    systolic,
    diastolic,
    glucoseMgDl,
    glucoseState,
    hrvMs,
    respirationBpm,
    bodyTempC,
    hydrationPct,
    onsdMm,
    ureaMgDl,
    calciumMgDl,
    patchDay,
    zwitterionicShield,
    sensorSensitivityPct,
    afeSignalNa,
    mlDriftCorrectionPct,
    batteryPct,
    renalRisk,
    manualActive,
    status,
  };
}

const UNLOADING: Record<GravityMode, number> = { '0g': 1, '0.16g': 0.72, '0.38g': 0.46, '1g': 0.02 };
const RADIATION: Record<GravityMode, number> = { '0g': 1.45, '0.16g': 0.92, '0.38g': 0.64, '1g': 0.008 };

export function simulateMission(p: MissionParams): MissionOutput {
  const unloading = UNLOADING[p.gravity];
  const months = Math.max(0.25, p.days / 30);
  const attenuation = clamp(1 - (p.shielding - 10) * 0.011, 0.48, 1.15);

  const dailyDoseMsv = Number(
    clamp(RADIATION[p.gravity] * attenuation + (p.solarStorm ? 28.5 * attenuation : 0), 0.01, 65).toFixed(2)
  );
  const totalDoseMsv = Number(
    clamp(p.days * RADIATION[p.gravity] * attenuation + (p.solarStorm ? 85 * attenuation : 0), 0.1, 2500).toFixed(1)
  );

  const lbnp = clamp(p.lbnpMin / 60, 0, 1) * 0.62;
  const co2 = Math.max(0, p.co2MmHg - 2.5) * 0.12;
  const onsdMm = Number(
    clamp(4.55 + unloading * 0.95 * clamp(months / 6, 0.2, 1.4) * (1 - lbnp) + co2, 4.4, 6.8).toFixed(2)
  );

  const exercise = clamp(p.exerciseMin / 90, 0, 1) * 0.78;
  const monthlyBoneLossPct = Number(clamp(unloading * 1.55 * (1 - exercise), 0.02, 1.85).toFixed(2));
  const boneLossPct = Number(clamp(monthlyBoneLossPct * months, 0.05, 24).toFixed(1));

  const orthostaticPct = Math.round(
    clamp(98 - unloading * 26 * clamp(months / 6, 0.25, 1.35) * (1 - lbnp * 0.65) + exercise * 9, 42, 99)
  );

  const reactionMs = Math.round(
    clamp(
      232 + Math.max(0, p.co2MmHg - 2.5) * 22 + clamp(p.days / 365, 0, 1.5) * 24 + (p.solarStorm ? 28 : 0),
      215,
      460
    )
  );

  let status: MissionOutput['status'] = 'Nominal';
  if (onsdMm >= 5.8 || totalDoseMsv >= 600 || dailyDoseMsv >= 15 || boneLossPct >= 8 || reactionMs >= 340) {
    status = 'Critical';
  } else if (onsdMm >= 5.2 || totalDoseMsv >= 250 || monthlyBoneLossPct >= 0.65 || reactionMs >= 290) {
    status = 'Advisory';
  }

  return { totalDoseMsv, dailyDoseMsv, onsdMm, boneLossPct, monthlyBoneLossPct, orthostaticPct, reactionMs, status };
}

const has = (text: string, ...words: string[]) => words.some((w) => text.includes(w));
const word = (text: string, pattern: string) => new RegExp(`\\b${pattern}\\b`).test(text);

export function parseCommands(input: string): Action[] {
  const text = input.trim().toLowerCase();
  if (!text) return [];
  const actions: Action[] = [];

  if (has(text, 'open the lab', 'go to the lab', 'open lab', 'show lab', 'switch to lab', 'simulator', 'mission sim')) {
    actions.push({ type: 'SWITCH_VIEW', view: 'lab' });
  } else if (
    has(
      text,
      'go back',
      'back to call',
      'back to home',
      'switch to call',
      'open call',
      'show call',
      'go home',
      'close the lab',
      'close lab'
    )
  ) {
    actions.push({ type: 'SWITCH_VIEW', view: 'call' });
  }

  const patch: Partial<CheckIn> = {};
  if (has(text, 'just ate', 'had lunch', 'had dinner', 'had breakfast', 'after meal', 'after eating')) {
    patch.meal = 'just_ate';
  } else if (has(text, 'shaky', 'dizzy', 'low sugar', 'hungry')) {
    patch.meal = 'shaky';
  } else if (has(text, 'fasting', 'skipped meal', "haven't eaten", 'havent eaten')) {
    patch.meal = 'fasting';
  }
  if (has(text, 'thirsty', 'dry mouth', 'dehydrated')) patch.hydration = 'thirsty';
  else if (has(text, 'drank water', 'well hydrated', 'had water')) patch.hydration = 'good';
  if (has(text, 'blurry', 'headache')) patch.head = 'headache';
  else if (has(text, 'stuffy', 'puffy', 'head pressure', 'head feels full')) patch.head = 'pressure';
  if (has(text, 'tired', 'bad sleep', 'insomnia', "couldn't sleep", 'exhausted')) patch.sleep = 'short';
  else if (has(text, 'worked out', 'exercised', 'after workout', 'just trained')) patch.sleep = 'post_workout';
  if (Object.keys(patch).length > 0) actions.push({ type: 'UPDATE_CHECKIN', patch });

  if (has(text, 'zero g', 'zero gravity', 'microgravity') || word(text, '0g')) {
    actions.push({ type: 'SET_GRAVITY', gravity: '0g' });
  } else if (has(text, 'lunar', 'moon', '0.16g')) {
    actions.push({ type: 'SET_GRAVITY', gravity: '0.16g' });
  } else if (has(text, 'mars', 'martian', '0.38g')) {
    actions.push({ type: 'SET_GRAVITY', gravity: '0.38g' });
  } else if (has(text, 'earth gravity') || word(text, '1g')) {
    actions.push({ type: 'SET_GRAVITY', gravity: '1g' });
  }

  const wantsOff = has(text, 'turn off', 'disable', 'stop', 'close', 'mute');
  const wantsOn = has(text, 'turn on', 'enable', 'start', 'open', 'unmute');
  if (word(text, '(camera|webcam)')) {
    if (wantsOff && !wantsOn) actions.push({ type: 'SET_CAMERA', enabled: false });
    else if (wantsOn) actions.push({ type: 'SET_CAMERA', enabled: true });
  }
  if (word(text, '(mic|microphone)')) {
    if (wantsOff && !has(text, 'unmute', 'turn on', 'enable')) actions.push({ type: 'SET_MIC', enabled: false });
    else if (wantsOn) actions.push({ type: 'SET_MIC', enabled: true });
  }

  const missionPatch: Partial<MissionParams> = {};
  const days = text.match(/(\d{2,4})\s*-?\s*days?/);
  if (days) missionPatch.days = clamp(Number(days[1]), 14, 1000);
  if (has(text, 'solar storm', 'solar flare', 'solar particle')) {
    missionPatch.solarStorm = !has(text, 'no solar', 'without solar', 'stop solar', 'end solar', 'turn off solar');
  }
  if (Object.keys(missionPatch).length > 0) actions.push({ type: 'UPDATE_MISSION', patch: missionPatch });

  return actions;
}
