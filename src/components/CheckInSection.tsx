import React, { useEffect, useRef } from 'react';
import { animate, motion } from 'motion/react';
import { ArrowUpRight } from 'lucide-react';
import type { CheckIn, Vitals } from '../types/health';
import { ParallaxTrack, PressButton, ScrollCanvasFrame, SpotlightCard } from './ui';

interface CheckInSectionProps {
  checkIn: CheckIn;
  vitals: Vitals;
  onChange: (patch: Partial<CheckIn>) => void;
  onAsk: (question: string) => void;
}

const GROUPS: Array<{
  key: keyof CheckIn;
  index: string;
  label: string;
  options: Array<{ id: CheckIn[keyof CheckIn]; label: string }>;
}> = [
  {
    key: 'meal',
    index: '01',
    label: 'Meal',
    options: [
      { id: 'normal', label: 'Normal' },
      { id: 'just_ate', label: 'Just ate' },
      { id: 'fasting', label: 'Fasting' },
      { id: 'shaky', label: 'Low' },
    ],
  },
  {
    key: 'hydration',
    index: '02',
    label: 'Water',
    options: [
      { id: 'good', label: 'Good' },
      { id: 'moderate', label: 'Okay' },
      { id: 'thirsty', label: 'Thirsty' },
    ],
  },
  {
    key: 'head',
    index: '03',
    label: 'Head',
    options: [
      { id: 'clear', label: 'Clear' },
      { id: 'pressure', label: 'Pressure' },
      { id: 'headache', label: 'Headache' },
    ],
  },
  {
    key: 'sleep',
    index: '04',
    label: 'Sleep',
    options: [
      { id: 'rested', label: 'Rested' },
      { id: 'short', label: 'Short' },
      { id: 'post_workout', label: 'Workout' },
    ],
  },
];

function AnimatedNumber({ value, decimals = 0 }: { value: number; decimals?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const prev = useRef(value);
  useEffect(() => {
    const controls = animate(prev.current, value, {
      duration: 0.45,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (v) => {
        if (ref.current) ref.current.textContent = v.toFixed(decimals);
      },
    });
    prev.current = value;
    return () => controls.stop();
  }, [value, decimals]);
  return <span ref={ref}>{value.toFixed(decimals)}</span>;
}

export function CheckInSection({ checkIn, vitals, onChange, onAsk }: CheckInSectionProps) {
  return (
    <section className="mt-8 pb-10 sm:mt-12 sm:pb-14">
      <ScrollCanvasFrame>
        <div className="rounded-[28px] border border-white/[0.08] bg-[#040404] p-5 sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/[0.06] pb-5">
            <div className="flex items-center gap-3">
              <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-white/40">Check-in</span>
              <span className="h-3 w-px bg-white/10" />
              <span className="text-[13px] text-white/65">Tap to update call vitals</span>
            </div>

            <ParallaxTrack distance={22} className="hidden items-center gap-4 font-mono text-[11px] text-white/35 md:flex">
              <span>BP {vitals.systolic}/{vitals.diastolic}</span>
              <span>·</span>
              <span>HRV {vitals.hrvMs} ms</span>
              <span>·</span>
              <span>TEMP {vitals.bodyTempC} °C</span>
              <span>·</span>
              <span>ONSD {vitals.onsdMm} mm</span>
            </ParallaxTrack>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {GROUPS.map((group, idx) => (
              <motion.div
                key={group.key}
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.25 }}
                transition={{ delay: idx * 0.06, type: 'spring', stiffness: 320, damping: 28 }}
              >
                <SpotlightCard className="h-full rounded-2xl p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[14px] font-medium text-white">{group.label}</span>
                    <span className="font-mono text-[10px] text-white/35">{group.index}</span>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {group.options.map((opt) => {
                      const active = checkIn[group.key] === opt.id;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => onChange({ [group.key]: opt.id })}
                          className={`relative rounded-full px-3 py-1.5 text-[12px] font-medium transition-colors ${
                            active ? 'text-black' : 'border border-white/[0.08] text-white/60 hover:border-white/20 hover:text-white'
                          }`}
                        >
                          {active && (
                            <motion.span
                              layoutId={`checkin-${group.key}`}
                              className="absolute inset-0 rounded-full bg-white"
                              transition={{ type: 'spring', stiffness: 520, damping: 35 }}
                            />
                          )}
                          <span className="relative">{opt.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </SpotlightCard>
              </motion.div>
            ))}
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-3">
            {[
              {
                label: 'Blood pressure',
                value: `${vitals.systolic}/${vitals.diastolic}`,
                unit: 'mmHg',
                ratio: (vitals.systolic - 90) / 70,
                warn: vitals.systolic >= 135,
                prompt: `My blood pressure is ${vitals.systolic}/${vitals.diastolic} and HRV is ${vitals.hrvMs} ms. How does that look?`,
              },
              {
                label: 'Hydration',
                value: vitals.hydrationPct,
                unit: '%',
                ratio: vitals.hydrationPct / 100,
                warn: vitals.hydrationPct < 75,
                prompt: `My hydration is around ${vitals.hydrationPct}%. Should I adjust my water intake?`,
              },
              {
                label: 'Eye pressure',
                value: vitals.onsdMm,
                decimals: 2,
                unit: 'mm',
                ratio: (vitals.onsdMm - 4.4) / 1.8,
                warn: vitals.onsdMm >= 5.2,
                prompt: `My optic nerve sheath proxy is ${vitals.onsdMm} mm. Should I be concerned?`,
              },
            ].map((item, idx) => {
              const barColor = item.warn ? '#ffd60a' : '#ffffff';
              return (
                <motion.div
                  key={item.label}
                  initial={{ opacity: 0, y: 18 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.25 }}
                  transition={{ delay: 0.1 + idx * 0.06, type: 'spring', stiffness: 300, damping: 28 }}
                >
                  <SpotlightCard className="rounded-2xl p-5">
                    <div className="flex items-center justify-between">
                      <span className="text-[12px] text-white/45">{item.label}</span>
                      <PressButton
                        onClick={() => onAsk(item.prompt)}
                        className="group inline-flex items-center gap-1 rounded-full border border-white/[0.08] px-2.5 py-1 text-[11px] text-white/65 transition-colors hover:border-white/25 hover:text-white"
                      >
                        Ask
                        <ArrowUpRight className="h-3 w-3 transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                      </PressButton>
                    </div>
                    <div className="mt-3 flex items-baseline gap-1.5">
                      <span className="font-mono text-[28px] font-medium leading-none tabular-nums" style={{ color: barColor }}>
                        {typeof item.value === 'number' ? (
                          <AnimatedNumber value={item.value} decimals={item.decimals} />
                        ) : (
                          item.value
                        )}
                      </span>
                      <span className="text-[12px] text-white/35">{item.unit}</span>
                    </div>
                    <div className="mt-4 h-[2.5px] overflow-hidden rounded-full bg-white/[0.07]">
                      <motion.div
                        className="h-full rounded-full"
                        style={{ backgroundColor: barColor }}
                        animate={{ width: `${Math.max(4, Math.min(100, item.ratio * 100))}%` }}
                        transition={{ type: 'spring', stiffness: 180, damping: 24 }}
                      />
                    </div>
                  </SpotlightCard>
                </motion.div>
              );
            })}
          </div>
        </div>
      </ScrollCanvasFrame>
    </section>
  );
}
