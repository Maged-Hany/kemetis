import { useEffect, useState, type RefObject } from 'react';

export interface PulseReading {
  bpm: number | null;
  progress: number;
  brightnessPct: number;
  faceDetected: boolean;
}

const IDLE: PulseReading = { bpm: null, progress: 0, brightnessPct: 0, faceDetected: false };
const WINDOW_MS = 10000;
const MIN_MS = 6000;

interface Sample {
  t: number;
  g: number;
}

function estimateBpm(samples: Sample[]): number | null {
  const n = samples.length;
  const mean = samples.reduce((s, x) => s + x.g, 0) / n;
  if (mean < 1) return null;
  const x = samples.map((s) => s.g / mean - 1);

  const half = 12;
  const y = x.map((v, i) => {
    let sum = 0;
    let count = 0;
    for (let j = Math.max(0, i - half); j <= Math.min(n - 1, i + half); j++) {
      sum += x[j];
      count++;
    }
    return v - sum / count;
  });

  const t0 = samples[0].t;
  let best = 0;
  let bestF = 0;
  let total = 0;
  let steps = 0;
  for (let f = 0.75; f <= 3; f += 0.0125) {
    let re = 0;
    let im = 0;
    const w = 2 * Math.PI * f;
    for (let i = 0; i < n; i++) {
      const phase = (w * (samples[i].t - t0)) / 1000;
      re += y[i] * Math.cos(phase);
      im -= y[i] * Math.sin(phase);
    }
    const power = re * re + im * im;
    total += power;
    steps++;
    if (power > best) {
      best = power;
      bestF = f;
    }
  }
  if (total === 0 || best < (total / steps) * 3) return null;
  return bestF * 60;
}

export function usePulse(videoRef: RefObject<HTMLVideoElement | null>, enabled: boolean): PulseReading {
  const [reading, setReading] = useState<PulseReading>(IDLE);

  useEffect(() => {
    if (!enabled) {
      setReading(IDLE);
      return;
    }
    const canvas = document.createElement('canvas');
    canvas.width = 40;
    canvas.height = 30;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    const samples: Sample[] = [];
    let smoothed: number | null = null;
    let lastReport = 0;
    let lastFaceAt = 0;

    const tick = () => {
      const video = videoRef.current;
      if (!video || video.readyState < 2 || video.videoWidth === 0 || video.paused) return;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const { data } = ctx.getImageData(14, 6, 12, 12);
      let r = 0;
      let g = 0;
      let b = 0;
      const count = data.length / 4;
      for (let i = 0; i < data.length; i += 4) {
        r += data[i];
        g += data[i + 1];
        b += data[i + 2];
      }
      r /= count;
      g /= count;
      b /= count;

      const now = performance.now();
      const brightnessPct = Math.round(((r + g + b) / 765) * 100);
      const faceDetected = r > b && brightnessPct > 15;

      if (faceDetected) {
        lastFaceAt = now;
        samples.push({ t: now, g });
        while (samples.length > 0 && now - samples[0].t > WINDOW_MS) samples.shift();
      } else if (now - lastFaceAt > 3000) {
        samples.length = 0;
        smoothed = null;
      }

      if (now - lastReport < 1000) return;
      lastReport = now;

      const span = samples.length > 1 ? samples[samples.length - 1].t - samples[0].t : 0;
      if (faceDetected && span >= MIN_MS && samples.length >= 60) {
        const estimate = estimateBpm(samples);
        if (estimate !== null) {
          smoothed = smoothed === null ? estimate : smoothed * 0.7 + estimate * 0.3;
        }
      }

      setReading({
        bpm: smoothed === null ? null : Math.round(smoothed),
        progress: Math.min(1, span / MIN_MS),
        brightnessPct,
        faceDetected,
      });
    };

    const id = window.setInterval(tick, 50);
    return () => window.clearInterval(id);
  }, [enabled, videoRef]);

  return reading;
}
