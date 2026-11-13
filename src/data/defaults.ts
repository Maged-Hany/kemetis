import type { CheckIn, MissionParams, OpticalSample, VoiceSample } from '../types/health';

export const DEFAULT_OPTICAL: OpticalSample = {
  redAcDc: 0.0094,
  greenAcDc: 0.0198,
  redMean: 152,
  blueMean: 108,
  brightnessPct: 82,
  faceDetected: true,
};

export const DEFAULT_VOICE: VoiceSample = {
  rms: 0.08,
  stabilityPct: 94,
  respirationBpm: 14,
};

export const DEFAULT_CHECKIN: CheckIn = {
  meal: 'normal',
  hydration: 'good',
  head: 'clear',
  sleep: 'rested',
};

export const DEFAULT_MISSION: MissionParams = {
  gravity: '0g',
  days: 180,
  shielding: 20,
  solarStorm: false,
  lbnpMin: 30,
  exerciseMin: 60,
  co2MmHg: 2.8,
};
