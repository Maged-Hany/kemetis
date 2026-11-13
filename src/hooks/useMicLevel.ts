import { useEffect, useRef, useState } from 'react';

export function useMicLevel(enabled: boolean, onError: (message: string) => void) {
  const [level, setLevel] = useState(0);
  const errorRef = useRef(onError);
  errorRef.current = onError;

  useEffect(() => {
    if (!enabled) {
      setLevel(0);
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      errorRef.current('Microphone is not available in this browser.');
      return;
    }
    let cancelled = false;
    let stream: MediaStream | null = null;
    let ctx: AudioContext | null = null;
    let raf = 0;
    let last = 0;
    let lastValue = 0;

    navigator.mediaDevices
      .getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } })
      .then(async (media) => {
        if (cancelled) {
          media.getTracks().forEach((t) => t.stop());
          return;
        }
        stream = media;
        const Ctor =
          window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        ctx = new Ctor();
        if (ctx.state === 'suspended') {
          await ctx.resume().catch(() => {});
        }
        if (cancelled) {
          media.getTracks().forEach((t) => t.stop());
          ctx.close().catch(() => {});
          return;
        }
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 512;
        ctx.createMediaStreamSource(media).connect(analyser);
        const data = new Uint8Array(analyser.fftSize);

        const loop = (time: number) => {
          raf = requestAnimationFrame(loop);
          if (time - last < 65) return;
          last = time;
          analyser.getByteTimeDomainData(data);
          let sum = 0;
          for (let i = 0; i < data.length; i++) {
            const v = (data[i] - 128) / 128;
            sum += v * v;
          }
          const value = Math.min(1, Math.sqrt(sum / data.length) * 6);
          if (Math.abs(value - lastValue) > 0.025 || (value < 0.02 && lastValue !== 0)) {
            lastValue = value < 0.02 ? 0 : value;
            setLevel(lastValue);
          }
        };
        raf = requestAnimationFrame(loop);
      })
      .catch(() => {
        if (!cancelled) errorRef.current('Microphone access was blocked.');
      });

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      stream?.getTracks().forEach((t) => t.stop());
      ctx?.close().catch(() => {});
      setLevel(0);
    };
  }, [enabled]);

  return level;
}
