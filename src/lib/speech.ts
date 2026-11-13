type Listener = () => void;

let preferredVoice: SpeechSynthesisVoice | null = null;
let session = 0;

function pickVoice(): SpeechSynthesisVoice | null {
  if (preferredVoice) return preferredVoice;
  const voices = window.speechSynthesis.getVoices().filter((v) => v.lang.startsWith('en'));
  const ranked = ['Google US English', 'Samantha', 'Aria', 'Jenny', 'Natural', 'Google UK English Female'];
  for (const name of ranked) {
    const match = voices.find((v) => v.name.includes(name));
    if (match) return (preferredVoice = match);
  }
  return (preferredVoice = voices[0] ?? null);
}

if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  window.speechSynthesis.addEventListener?.('voiceschanged', () => {
    preferredVoice = null;
    pickVoice();
  });
}

export function canSpeak(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

export function speak(text: string, onStart?: Listener, onEnd?: Listener): void {
  if (!canSpeak()) {
    onEnd?.();
    return;
  }
  const synth = window.speechSynthesis;
  synth.cancel();
  const id = ++session;

  const chunks = (text.replace(/[*#`_~]/g, '').match(/[^.!?]+[.!?]*\s*/g) ?? [text])
    .map((c) => c.trim())
    .filter(Boolean);
  if (chunks.length === 0) {
    onEnd?.();
    return;
  }

  const voice = pickVoice();
  chunks.forEach((chunk, index) => {
    const u = new SpeechSynthesisUtterance(chunk);
    u.lang = 'en-US';
    u.rate = 1.02;
    u.pitch = 1;
    if (voice) u.voice = voice;
    if (index === 0) u.onstart = () => id === session && onStart?.();
    if (index === chunks.length - 1) {
      u.onend = () => id === session && onEnd?.();
      u.onerror = () => id === session && onEnd?.();
    }
    synth.speak(u);
  });
}

export function stopSpeaking(): void {
  session++;
  if (canSpeak()) window.speechSynthesis.cancel();
}

export interface Recognizer {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((e: { resultIndex: number; results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }> }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  abort: () => void;
}

export function createRecognizer(): Recognizer | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as { SpeechRecognition?: new () => Recognizer; webkitSpeechRecognition?: new () => Recognizer };
  const Ctor = w.SpeechRecognition || w.webkitSpeechRecognition;
  return Ctor ? new Ctor() : null;
}
