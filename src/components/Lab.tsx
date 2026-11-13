import React, { useEffect, useRef } from 'react';
import { animate, motion } from 'motion/react';
import { ArrowUpRight, RotateCcw } from 'lucide-react';
import type { GravityMode, MissionOutput, MissionParams } from '../types/health';
import { ParallaxTrack, PressButton, ScrollCanvasFrame, SpotlightCard, StatusDot } from './ui';

interface LabProps {
  params: MissionParams;
  output: MissionOutput;
  onChange: (patch: Partial<MissionParams>) => void;
  onReset: () => void;
  onDiscuss: () => void;
}

const GRAVITY: Array<{ id: GravityMode; label: string }> = [
  { id: '0g', label: 'Orbit' },
  { id: '0.16g', label: 'Moon' },
  { id: '0.38g', label: 'Mars' },
  { id: '1g', label: 'Earth' },
];

function Count({ value, decimals = 0 }: { value: number; decimals?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const prev = useRef(value);
  useEffect(() => {
    const controls = animate(prev.current, value, {
      duration: 0.5,
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

function Slider({
  label,
  value,
  min,
  max,
  step = 1,
  unit,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit: string;
  onChange: (v: number) => void;
}) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <label className="block">
      <div className="flex items-baseline justify-between">
        <span className="text-[13px] text-white/60">{label}</span>
        <span className="font-mono text-[13px] tabular-nums text-white">
          {step < 1 ? value.toFixed(1) : value}
          <span className="ml-1 text-white/35">{unit}</span>
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="range mt-3 w-full"
        style={{ ['--pct' as string]: `${pct}%` } as React.CSSProperties}
      />
    </label>
  );
}

function Metric({
  label,
  value,
  decimals,
  unit,
  ratio,
  warn,
  danger,
  index,
}: {
  label: string;
  value: number;
  decimals?: number;
  unit: string;
  ratio: number;
  warn: boolean;
  danger: boolean;
  index: number;
}) {
  const color = danger ? '#ff3b30' : warn ? '#ffd60a' : '#ffffff';
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.04 * index, type: 'spring', stiffness: 320, damping: 28 }}
      whileHover={{ y: -3 }}
    >
      <SpotlightCard className="h-full rounded-[24px] p-5">
        <div className="text-[12px] text-white/45">{label}</div>
        <div className="mt-3 flex items-baseline gap-1.5">
          <span className="font-mono text-[34px] font-medium leading-none tabular-nums" style={{ color }}>
            <Count value={value} decimals={decimals} />
          </span>
          <span className="text-[12px] text-white/35">{unit}</span>
        </div>
        <div className="mt-5 h-[3px] overflow-hidden rounded-full bg-white/[0.07]">
          <motion.div
            className="h-full rounded-full"
            style={{ backgroundColor: color }}
            animate={{ width: `${Math.max(2, Math.min(100, ratio * 100))}%` }}
            transition={{ type: 'spring', stiffness: 160, damping: 24 }}
          />
        </div>
      </SpotlightCard>
    </motion.div>
  );
}

export function Lab({ params, output, onChange, onReset, onDiscuss }: LabProps) {
  return (
    <div className="space-y-8 pb-12">
      <div className="grid gap-4 lg:grid-cols-[380px_1fr]">
        <SpotlightCard className="rounded-[28px] p-6">
          <div className="flex items-center justify-between">
            <div className="text-[15px] font-medium text-white">Mission</div>
            <PressButton
              onClick={onReset}
              aria-label="Reset mission"
              title="Reset"
              className="group flex h-8 w-8 items-center justify-center rounded-full text-white/40 transition-colors hover:bg-white/[0.06] hover:text-white"
            >
              <RotateCcw className="h-3.5 w-3.5 transition-transform duration-300 group-hover:-rotate-90" />
            </PressButton>
          </div>

          <div className="mt-5 grid grid-cols-4 rounded-full border border-white/[0.07] bg-black p-1">
            {GRAVITY.map((g) => {
              const active = params.gravity === g.id;
              return (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => onChange({ gravity: g.id })}
                  className={`relative rounded-full py-2 text-[13px] font-medium transition-colors ${
                    active ? 'text-black' : 'text-white/55 hover:text-white'
                  }`}
                >
                  {active && (
                    <motion.span
                      layoutId="gravity-pill"
                      className="absolute inset-0 rounded-full bg-white"
                      transition={{ type: 'spring', stiffness: 520, damping: 36 }}
                    />
                  )}
                  <span className="relative">{g.label}</span>
                </button>
              );
            })}
          </div>

          <div className="mt-7 space-y-6">
            <Slider label="Duration" value={params.days} min={14} max={1000} unit="days" onChange={(v) => onChange({ days: v })} />
            <Slider label="Shielding" value={params.shielding} min={5} max={50} unit="g/cm²" onChange={(v) => onChange({ shielding: v })} />
            <Slider label="Exercise" value={params.exerciseMin} min={0} max={120} unit="min/day" onChange={(v) => onChange({ exerciseMin: v })} />
            <Slider label="Lower-body pressure" value={params.lbnpMin} min={0} max={90} unit="min/day" onChange={(v) => onChange({ lbnpMin: v })} />
            <Slider label="Cabin CO₂" value={params.co2MmHg} min={1.5} max={6} step={0.1} unit="mmHg" onChange={(v) => onChange({ co2MmHg: v })} />
          </div>

          <button
            type="button"
            role="switch"
            aria-checked={params.solarStorm}
            onClick={() => onChange({ solarStorm: !params.solarStorm })}
            className="mt-7 flex w-full items-center justify-between rounded-2xl border border-white/[0.08] px-4 py-3.5 text-left transition-colors hover:border-white/20"
          >
            <span className="text-[13px] text-white/75">Solar storm</span>
            <span
              className={`relative h-6 w-10 rounded-full transition-colors duration-200 ${
                params.solarStorm ? 'bg-[#ff9f0a]' : 'bg-white/[0.12]'
              }`}
            >
              <motion.span
                layout
                transition={{ type: 'spring', stiffness: 600, damping: 34 }}
                className={`absolute top-0.5 h-5 w-5 rounded-full bg-white ${params.solarStorm ? 'right-0.5' : 'left-0.5'}`}
              />
            </span>
          </button>
        </SpotlightCard>

        <div className="flex flex-col gap-4">
          <SpotlightCard className="flex flex-wrap items-center justify-between gap-4 rounded-[28px] px-6 py-5">
            <div className="flex items-center gap-3">
              <StatusDot status={output.status} />
              <span className="text-[15px] font-medium text-white">{output.status}</span>
              <span className="text-[13px] text-white/40">
                {GRAVITY.find((g) => g.id === params.gravity)?.label} · {params.days} days
              </span>
            </div>
            <PressButton
              onClick={onDiscuss}
              className="group flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-[13px] font-semibold text-black"
            >
              Ask Kemetis
              <ArrowUpRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
            </PressButton>
          </SpotlightCard>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <Metric index={0} label="Radiation dose" value={output.totalDoseMsv} decimals={0} unit="mSv" ratio={output.totalDoseMsv / 600} warn={output.totalDoseMsv >= 250} danger={output.totalDoseMsv >= 600} />
            <Metric index={1} label="Daily dose" value={output.dailyDoseMsv} decimals={2} unit="mSv/day" ratio={output.dailyDoseMsv / 15} warn={output.dailyDoseMsv >= 5} danger={output.dailyDoseMsv >= 15} />
            <Metric index={2} label="Bone loss" value={output.boneLossPct} decimals={1} unit="%" ratio={output.boneLossPct / 8} warn={output.monthlyBoneLossPct >= 0.65} danger={output.boneLossPct >= 8} />
            <Metric index={3} label="Optic nerve sheath" value={output.onsdMm} decimals={2} unit="mm" ratio={(output.onsdMm - 4.4) / (5.8 - 4.4)} warn={output.onsdMm >= 5.2} danger={output.onsdMm >= 5.8} />
            <Metric index={4} label="Standing tolerance" value={output.orthostaticPct} unit="%" ratio={output.orthostaticPct / 100} warn={output.orthostaticPct < 80} danger={output.orthostaticPct < 60} />
            <Metric index={5} label="Reaction time" value={output.reactionMs} unit="ms" ratio={(output.reactionMs - 200) / (340 - 200)} warn={output.reactionMs >= 290} danger={output.reactionMs >= 340} />
          </div>
        </div>
      </div>

      <ScrollCanvasFrame>
        <div className="rounded-[28px] border border-white/[0.08] bg-[#040404] p-6">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/[0.06] pb-4">
            <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-white/40">Limits</span>
            <ParallaxTrack distance={18} className="hidden font-mono text-[11px] text-white/35 sm:block">
              600 mSv career · 5.8 mm ONSD · 8% bone threshold
            </ParallaxTrack>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            {[
              { title: 'Career radiation', current: `${output.totalDoseMsv} mSv`, limit: '600 mSv max', pct: output.totalDoseMsv / 600 },
              { title: 'Optic sheath', current: `${output.onsdMm} mm`, limit: '5.8 mm threshold', pct: (output.onsdMm - 4.4) / 1.4 },
              { title: 'Bone retention', current: `${(100 - output.boneLossPct).toFixed(1)}%`, limit: '92% min', pct: 1 - output.boneLossPct / 12 },
            ].map((item, idx) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 14 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.25 }}
                transition={{ delay: idx * 0.06, type: 'spring', stiffness: 320, damping: 28 }}
              >
                <SpotlightCard className="rounded-2xl p-4">
                  <div className="flex items-baseline justify-between text-[12px]">
                    <span className="text-white/60">{item.title}</span>
                    <span className="font-mono text-white/35">{item.limit}</span>
                  </div>
                  <div className="mt-2 font-mono text-xl font-medium tabular-nums text-white">{item.current}</div>
                  <div className="mt-3 h-[2.5px] overflow-hidden rounded-full bg-white/[0.07]">
                    <motion.div
                      className="h-full rounded-full bg-white"
                      animate={{ width: `${Math.max(4, Math.min(100, item.pct * 100))}%` }}
                      transition={{ type: 'spring', stiffness: 160, damping: 24 }}
                    />
                  </div>
                </SpotlightCard>
              </motion.div>
            ))}
          </div>
        </div>
      </ScrollCanvasFrame>
    </div>
  );
}
