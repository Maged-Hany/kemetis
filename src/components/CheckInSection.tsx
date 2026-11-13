import React, { useEffect, useRef } from 'react';
import { animate, motion } from 'motion/react';
import { ArrowUpRight, RotateCcw, SlidersHorizontal } from 'lucide-react';
import type { CheckIn, ManualVitalsOverride, Vitals } from '../types/health';
import { ParallaxTrack, PressButton, ScrollCanvasFrame, SpotlightCard } from './ui';

interface CheckInSectionProps {
  checkIn: CheckIn;
  overrides: ManualVitalsOverride;
  vitals: Vitals;
  onChange: (patch: Partial<CheckIn>) => void;
  onOverrideChange: (patch: Partial<ManualVitalsOverride>) => void;
  onResetOverrides: () => void;
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

interface ManualFieldSpec {
  key: keyof ManualVitalsOverride;
  label: string;
  unit: string;
  min: number;
  max: number;
  step?: number;
  liveValue: number;
}

export function CheckInSection({
  checkIn,
  overrides,
  vitals,
  onChange,
  onOverrideChange,
  onResetOverrides,
  onAsk,
}: CheckInSectionProps) {
  const manualFields: ManualFieldSpec[] = [
    { key: 'glucoseMgDl', label: 'Blood Sugar (Glucose)', unit: 'mg/dL', min: 40, max: 320, liveValue: vitals.glucoseMgDl },
    { key: 'systolic', label: 'Systolic BP', unit: 'mmHg', min: 75, max: 220, liveValue: vitals.systolic },
    { key: 'diastolic', label: 'Diastolic BP', unit: 'mmHg', min: 45, max: 140, liveValue: vitals.diastolic },
    { key: 'heartRateBpm', label: 'Heart Rate', unit: 'bpm', min: 35, max: 200, liveValue: vitals.heartRateBpm },
    { key: 'spo2Pct', label: 'Blood Oxygen (SpO₂)', unit: '%', min: 70, max: 100, liveValue: vitals.spo2Pct },
    { key: 'hydrationPct', label: 'Hydration', unit: '%', min: 40, max: 100, liveValue: vitals.hydrationPct },
    { key: 'ureaMgDl', label: 'ISF Urea', unit: 'mg/dL', min: 10, max: 120, liveValue: vitals.ureaMgDl },
    { key: 'calciumMgDl', label: 'ISF Calcium (Ca²⁺)', unit: 'mg/dL', min: 6.5, max: 12.5, step: 0.1, liveValue: vitals.calciumMgDl },
  ];

  return (
    <section className="mt-8 sm:mt-12">
      <ScrollCanvasFrame>
        <div className="rounded-[28px] border border-white/[0.08] bg-[#040404] p-5 sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/[0.06] pb-5">
            <div className="flex items-center gap-3">
              <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-white/40">Check-in &amp; Manual Input</span>
              <span className="h-3 w-px bg-white/10" />
              <span className="text-[13px] text-white/65">Answer questions or type exact readings</span>
            </div>

            <ParallaxTrack distance={22} className="hidden items-center gap-4 font-mono text-[11px] text-white/35 md:flex">
              <span>BP {vitals.systolic}/{vitals.diastolic}</span>
              <span>·</span>
              <span>SUGAR {vitals.glucoseMgDl} mg/dL</span>
              <span>·</span>
              <span>UREA {vitals.ureaMgDl} mg/dL</span>
              <span>·</span>
              <span>Ca²⁺ {vitals.calciumMgDl} mg/dL</span>
            </ParallaxTrack>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {GROUPS.map((group, idx) => (
              <motion.div
                key={group.key}
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.25 }}
                transition={{ delay: idx * 0.05, type: 'spring', stiffness: 320, damping: 28 }}
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

          <div className="mt-6 rounded-2xl border border-white/[0.07] bg-[#070708] p-4 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="h-3.5 w-3.5 text-white/45" />
                <span className="text-[13px] font-medium text-white">Manual Vitals Entry</span>
                {vitals.manualActive && (
                  <span className="rounded-full bg-white/10 px-2 py-0.5 font-mono text-[10px] text-white/80">
                    Manual override active
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <PressButton
                  onClick={() =>
                    onOverrideChange({
                      glucoseMgDl: 162,
                      systolic: 144,
                      diastolic: 92,
                    })
                  }
                  className="rounded-full border border-white/[0.09] px-3 py-1 text-[11px] text-white/65 transition-colors hover:border-white/25 hover:text-white"
                >
                  Preset: High Sugar &amp; BP
                </PressButton>
                <PressButton
                  onClick={() =>
                    onOverrideChange({
                      ureaMgDl: 52,
                      calciumMgDl: 8.1,
                    })
                  }
                  className="rounded-full border border-white/[0.09] px-3 py-1 text-[11px] text-white/65 transition-colors hover:border-white/25 hover:text-white"
                >
                  Preset: Renal Alert (↑Urea ↓Ca²⁺)
                </PressButton>
                {vitals.manualActive && (
                  <PressButton
                    onClick={onResetOverrides}
                    className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1 text-[11px] font-semibold text-black"
                  >
                    <RotateCcw className="h-3 w-3" />
                    Reset to auto
                  </PressButton>
                )}
              </div>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {manualFields.map((field) => {
                const rawVal = overrides[field.key];
                const isOverridden = typeof rawVal === 'number' && Number.isFinite(rawVal);
                return (
                  <label
                    key={field.key}
                    className={`flex flex-col justify-between rounded-xl border px-3.5 py-2.5 transition-colors ${
                      isOverridden
                        ? 'border-white/30 bg-white/[0.04]'
                        : 'border-white/[0.07] bg-black/60 focus-within:border-white/25'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] text-white/50">{field.label}</span>
                      <span className="font-mono text-[10px] text-white/35">{field.unit}</span>
                    </div>
                    <div className="mt-1.5 flex items-center justify-between gap-2">
                      <input
                        type="number"
                        min={field.min}
                        max={field.max}
                        step={field.step ?? 1}
                        value={isOverridden ? String(rawVal) : ''}
                        placeholder={String(field.liveValue)}
                        onChange={(e) => {
                          const v = e.target.value.trim();
                          onOverrideChange({
                            [field.key]: v === '' ? null : Number(v),
                          });
                        }}
                        className="w-full bg-transparent font-mono text-[18px] font-medium tabular-nums text-white placeholder:text-white/40 outline-none"
                      />
                      {isOverridden && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            onOverrideChange({ [field.key]: null });
                          }}
                          className="text-[10px] text-white/45 hover:text-white"
                        >
                          Auto
                        </button>
                      )}
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-3">
            {[
              {
                label: 'Blood pressure',
                value: `${vitals.systolic}/${vitals.diastolic}`,
                unit: 'mmHg',
                ratio: (vitals.systolic - 90) / 70,
                warn: vitals.systolic >= 132,
                prompt: `My blood pressure is ${vitals.systolic}/${vitals.diastolic} and heart rate is ${vitals.heartRateBpm} bpm. How does that look?`,
              },
              {
                label: 'Blood sugar (Glucose)',
                value: vitals.glucoseMgDl,
                unit: 'mg/dL',
                ratio: (vitals.glucoseMgDl - 60) / 140,
                warn: vitals.glucoseMgDl <= 75 || vitals.glucoseMgDl >= 142,
                prompt: `My blood sugar is ${vitals.glucoseMgDl} mg/dL (${vitals.glucoseState}). What should I do right now?`,
              },
              {
                label: 'ISF Urea / Calcium',
                value: `${vitals.ureaMgDl} / ${vitals.calciumMgDl}`,
                unit: 'mg/dL',
                ratio: vitals.ureaMgDl / 60,
                warn: vitals.renalRisk !== 'Normal',
                prompt: `My microneedle patch reads Urea ${vitals.ureaMgDl} mg/dL and Calcium ${vitals.calciumMgDl} mg/dL (${vitals.renalRisk}). Explain what this means for my kidneys.`,
              },
            ].map((item, idx) => {
              const barColor = item.warn ? '#ffd60a' : '#ffffff';
              return (
                <motion.div
                  key={item.label}
                  initial={{ opacity: 0, y: 18 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.25 }}
                  transition={{ delay: 0.08 + idx * 0.05, type: 'spring', stiffness: 300, damping: 28 }}
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
                      <span className="font-mono text-[26px] font-medium leading-none tabular-nums" style={{ color: barColor }}>
                        {typeof item.value === 'number' ? <AnimatedNumber value={item.value} /> : item.value}
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
