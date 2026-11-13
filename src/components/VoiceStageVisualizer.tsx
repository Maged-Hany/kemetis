import React, { useMemo } from 'react';
import { motion } from 'motion/react';
import { Logo } from './ui';

export type VoiceState = 'idle' | 'listening' | 'thinking' | 'speaking' | 'muted';

const BARS = 20;

export function VoiceStageVisualizer({ state, level }: { state: VoiceState; level: number }) {
  const weights = useMemo(
    () =>
      Array.from({ length: BARS }, (_, i) => {
        const center = 1 - Math.abs(i - (BARS - 1) / 2) / (BARS / 2);
        return (0.4 + center * 0.6).toFixed(2);
      }),
    []
  );

  const ringActive = state === 'speaking' || (state === 'listening' && level > 0.08);

  return (
    <div
      className="eq-stage flex flex-col items-center"
      data-state={state}
      style={{ ['--lvl' as string]: level.toFixed(3) } as React.CSSProperties}
    >
      <div className="relative flex h-28 w-28 items-center justify-center rounded-full border border-white/[0.1] bg-[#0a0a0a]">
        <motion.div
          animate={{
            scale: ringActive ? [1, 1.14, 1] : 1,
            opacity: ringActive ? [0.22, 0.06, 0.22] : state === 'thinking' ? 0.16 : 0,
          }}
          transition={{
            duration: state === 'speaking' ? 1.5 : 1.1,
            repeat: ringActive ? Infinity : 0,
            ease: 'easeInOut',
          }}
          className="pointer-events-none absolute -inset-3 rounded-full border border-white/40"
        />
        <Logo className="h-9 w-9 text-white/90" />
      </div>

      <div className="mt-6 flex h-8 items-center gap-[5px]" aria-hidden="true">
        {weights.map((w, i) => (
          <span
            key={i}
            className="eq-bar h-7 w-[2.5px] rounded-full bg-white"
            style={
              {
                ['--i' as string]: i,
                ['--w' as string]: w,
              } as React.CSSProperties
            }
          />
        ))}
      </div>
    </div>
  );
}
