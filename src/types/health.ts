export type View = 'call' | 'lab';
export type GravityMode = '0g' | '0.16g' | '0.38g' | '1g';

export interface CheckIn {
  meal: 'just_ate' | 'normal' | 'fasting' | 'shaky';
  hydration: 'good' | 'moderate' | 'thirsty';
  head: 'clear' | 'pressure' | 'headache';
  sleep: 'rested' | 'short' | 'post_workout';
}

export interface OpticalSample {
  redAcDc: number;
  greenAcDc: number;
  redMean: number;
  blueMean: number;
  brightnessPct: number;
  faceDetected: boolean;
}

export interface VoiceSample {
  rms: number;
  stabilityPct: number;
  respirationBpm: number;
}

export interface Vitals {
  spo2Pct: number;
  heartRateBpm: number;
  heartRateMeasured: boolean;
  systolic: number;
  diastolic: number;
  glucoseMgDl: number;
  glucoseState: string;
  hrvMs: number;
  respirationBpm: number;
  bodyTempC: number;
  hydrationPct: number;
  onsdMm: number;
  status: 'Nominal' | 'Advisory' | 'Critical';
}

export interface MissionParams {
  gravity: GravityMode;
  days: number;
  shielding: number;
  solarStorm: boolean;
  lbnpMin: number;
  exerciseMin: number;
  co2MmHg: number;
}

export interface MissionOutput {
  totalDoseMsv: number;
  dailyDoseMsv: number;
  onsdMm: number;
  boneLossPct: number;
  monthlyBoneLossPct: number;
  orthostaticPct: number;
  reactionMs: number;
  status: 'Nominal' | 'Advisory' | 'Critical';
}

export type Action =
  | { type: 'SWITCH_VIEW'; view: View }
  | { type: 'UPDATE_CHECKIN'; patch: Partial<CheckIn> }
  | { type: 'SET_GRAVITY'; gravity: GravityMode }
  | { type: 'UPDATE_MISSION'; patch: Partial<MissionParams> }
  | { type: 'SET_CAMERA'; enabled: boolean }
  | { type: 'SET_MIC'; enabled: boolean };

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'event';
  text: string;
  at: number;
  actions?: string[];
}
