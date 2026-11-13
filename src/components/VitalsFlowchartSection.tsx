import React from 'react';
import { motion } from 'motion/react';
import { ArrowUpRight, GitBranch } from 'lucide-react';
import type { Vitals } from '../types/health';
import { PressButton, ScrollCanvasFrame, SpotlightCard } from './ui';

interface VitalsFlowchartSectionProps {
  vitals: Vitals;
  onAsk: (question: string) => void;
}

type NodeTone = 'nominal' | 'advisory' | 'critical';

function toneColor(tone: NodeTone) {
  if (tone === 'critical') return '#ff3b30';
  if (tone === 'advisory') return '#ffd60a';
  return '#30d158';
}

export function VitalsFlowchartSection({ vitals, onAsk }: VitalsFlowchartSectionProps) {
  const glucoseTone: NodeTone =
    vitals.glucoseMgDl <= 68 || vitals.glucoseMgDl >= 165
      ? 'critical'
      : vitals.glucoseMgDl <= 76 || vitals.glucoseMgDl >= 142
        ? 'advisory'
        : 'nominal';

  const bpTone: NodeTone =
    vitals.systolic >= 150 || vitals.diastolic >= 95 || vitals.heartRateBpm >= 120
      ? 'critical'
      : vitals.systolic >= 132 || vitals.diastolic >= 85 || vitals.heartRateBpm >= 95
        ? 'advisory'
        : 'nominal';

  const spo2Tone: NodeTone =
    vitals.spo2Pct < 92 ? 'critical' : vitals.spo2Pct < 95 || vitals.hydrationPct < 75 ? 'advisory' : 'nominal';

  const renalTone: NodeTone =
    vitals.renalRisk === 'Early Renal Alert'
      ? 'critical'
      : vitals.renalRisk === 'Watch'
        ? 'advisory'
        : 'nominal';

  const inputs = [
    {
      id: 'glucose',
      label: 'Blood Sugar (Glucose)',
      reading: `${vitals.glucoseMgDl} mg/dL`,
      branch:
        vitals.glucoseMgDl < 75
          ? '< 75 mg/dL · Hypoglycemia'
          : vitals.glucoseMgDl > 140
            ? '> 140 mg/dL · Hyperglycemia'
            : '75–140 mg/dL · Target',
      tone: glucoseTone,
      x: 125,
    },
    {
      id: 'bp',
      label: 'Blood Pressure & HR',
      reading: `${vitals.systolic}/${vitals.diastolic} · ${vitals.heartRateBpm} bpm`,
      branch:
        bpTone === 'critical'
          ? '≥ 150/95 mmHg · Hypertensive'
          : bpTone === 'advisory'
            ? '≥ 132/85 mmHg · Elevated'
            : '< 132/85 mmHg · Nominal',
      tone: bpTone,
      x: 375,
    },
    {
      id: 'spo2',
      label: 'Oxygen & Hydration',
      reading: `SpO₂ ${vitals.spo2Pct}% · H₂O ${vitals.hydrationPct}%`,
      branch:
        spo2Tone === 'critical'
          ? 'SpO₂ < 92% · Hypoxia Alert'
          : spo2Tone === 'advisory'
            ? 'SpO₂ < 95% or Low H₂O'
            : 'SpO₂ ≥ 95% · Well Hydrated',
      tone: spo2Tone,
      x: 625,
    },
    {
      id: 'renal',
      label: 'Microneedle Urea + Ca²⁺',
      reading: `Urea ${vitals.ureaMgDl} · Ca²⁺ ${vitals.calciumMgDl}`,
      branch:
        renalTone === 'critical'
          ? '↑Urea + ↓Ca²⁺ · Renal Strain'
          : renalTone === 'advisory'
            ? 'Borderline Urea / Ca²⁺'
            : 'Urea ≤ 38 & Ca²⁺ ≥ 8.8',
      tone: renalTone,
      x: 875,
    },
  ];

  const allNominal =
    glucoseTone === 'nominal' && bpTone === 'nominal' && spo2Tone === 'nominal' && renalTone === 'nominal';

  const outcomes = [
    {
      id: 'out-nominal',
      title: 'Nominal Homeostasis',
      action: 'Continue 7-day passive telemetry & scheduled check-in',
      active: allNominal,
      tone: 'nominal' as NodeTone,
      x: 125,
    },
    {
      id: 'out-glucose',
      title: 'Glycemic Stabilization',
      action:
        vitals.glucoseMgDl < 75
          ? '15g fast carbs now + re-check in 15 min'
          : 'Hydrate + low-glycemic load & monitor insulin sensitivity',
      active: glucoseTone !== 'nominal',
      tone: glucoseTone,
      x: 375,
    },
    {
      id: 'out-bp',
      title: 'Cardio-Respiratory Protocol',
      action: 'Paced breathing (6/min), reduce workload & re-verify SpO₂/BP',
      active: bpTone !== 'nominal' || spo2Tone !== 'nominal',
      tone: bpTone === 'critical' || spo2Tone === 'critical' ? ('critical' as NodeTone) : ('advisory' as NodeTone),
      x: 625,
    },
    {
      id: 'out-renal',
      title: 'Early Renal Nephropathy Alert',
      action: 'Notify flight surgeon: elevated Urea + low Ca²⁺ correlation',
      active: renalTone !== 'nominal',
      tone: renalTone,
      x: 875,
    },
  ];

  const hubTone: NodeTone =
    vitals.status === 'Critical' ? 'critical' : vitals.status === 'Advisory' ? 'advisory' : 'nominal';

  return (
    <section className="mt-8 pb-12 sm:mt-10 sm:pb-16">
      <ScrollCanvasFrame>
        <div className="rounded-[28px] border border-white/[0.08] bg-[#040404] p-5 sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/[0.06] pb-5">
            <div>
              <div className="flex items-center gap-2">
                <GitBranch className="h-3.5 w-3.5 text-white/45" />
                <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-white/40">
                  Live Decision Flowchart
                </span>
              </div>
              <h2 className="mt-1.5 text-[18px] font-semibold tracking-[-0.02em] text-white sm:text-[20px]">
                Real-Time Vitals &amp; Biosensor Clinical Pathway
              </h2>
            </div>

            <PressButton
              onClick={() =>
                onAsk(
                  `Walk me through my current clinical flowchart: Glucose ${vitals.glucoseMgDl} mg/dL, BP ${vitals.systolic}/${vitals.diastolic} mmHg, SpO2 ${vitals.spo2Pct}%, Urea ${vitals.ureaMgDl} mg/dL, Ca2+ ${vitals.calciumMgDl} mg/dL, Equivalent Dose ${vitals.equivalentDoseMsv} mSv, and Absorbed Dose ${vitals.absorbedDoseMgy} mGy.`
                )
              }
              className="group inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-[12px] font-semibold text-black"
            >
              Discuss Flowchart on Call
              <ArrowUpRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
            </PressButton>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {inputs.map((node) => {
              const color = toneColor(node.tone);
              return (
                <SpotlightCard
                  key={node.id}
                  className="rounded-2xl p-4"
                  style={{ borderColor: node.tone !== 'nominal' ? `${color}55` : undefined }}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-medium text-white/50">{node.label}</span>
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
                  </div>
                  <div className="mt-2 font-mono text-[17px] font-semibold tabular-nums text-white">
                    {node.reading}
                  </div>
                  <div
                    className="mt-2 inline-block rounded-md px-2 py-0.5 font-mono text-[10px]"
                    style={{ backgroundColor: `${color}18`, color }}
                  >
                    {node.branch}
                  </div>
                </SpotlightCard>
              );
            })}
          </div>

          <div className="relative my-2 hidden h-16 w-full lg:block">
            <svg viewBox="0 0 1000 70" className="h-full w-full overflow-visible" fill="none">
              {inputs.map((node) => {
                const color = toneColor(node.tone);
                return (
                  <path
                    key={node.id}
                    d={`M ${node.x} 0 C ${node.x} 35, 500 35, 500 70`}
                    stroke={color}
                    strokeWidth={node.tone === 'nominal' ? 1.4 : 2.2}
                    strokeOpacity={node.tone === 'nominal' ? 0.35 : 0.9}
                  />
                );
              })}
            </svg>
          </div>

          <div className="mx-auto my-3 max-w-2xl lg:my-0">
            <SpotlightCard
              className="rounded-2xl px-5 py-4 text-center"
              style={{ borderColor: `${toneColor(hubTone)}55` }}
            >
              <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-white/45">
                AI Fusion &amp; Calibration Engine
              </div>
              <div className="mt-1 text-[14px] font-semibold text-white">
                AD5940 AFE ({vitals.afeSignalNa} nA) · Day {vitals.patchDay}/7 ({vitals.sensorSensitivityPct}% sensitivity) · Eq. {vitals.equivalentDoseMsv} mSv / Abs. {vitals.absorbedDoseMgy} mGy
              </div>
              <div className="mt-1 font-mono text-[11px]" style={{ color: toneColor(hubTone) }}>
                System Triage: {vitals.status.toUpperCase()}
              </div>
            </SpotlightCard>
          </div>

          <div className="relative my-2 hidden h-16 w-full lg:block">
            <svg viewBox="0 0 1000 70" className="h-full w-full overflow-visible" fill="none">
              {outcomes.map((out) => {
                const color = toneColor(out.tone);
                return (
                  <path
                    key={out.id}
                    d={`M 500 0 C 500 35, ${out.x} 35, ${out.x} 70`}
                    stroke={out.active ? color : 'rgba(255,255,255,0.12)'}
                    strokeWidth={out.active ? 2.4 : 1.2}
                    strokeDasharray={out.active ? undefined : '4 4'}
                  />
                );
              })}
            </svg>
          </div>

          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:mt-0 lg:grid-cols-4">
            {outcomes.map((out) => {
              const color = toneColor(out.tone);
              return (
                <motion.div
                  key={out.id}
                  animate={{
                    scale: out.active ? 1 : 0.985,
                    opacity: out.active ? 1 : 0.42,
                  }}
                  transition={{ type: 'spring', stiffness: 320, damping: 28 }}
                >
                  <SpotlightCard
                    className="h-full rounded-2xl p-4"
                    style={{
                      borderColor: out.active ? color : undefined,
                      boxShadow: out.active ? `0 0 28px -8px ${color}55` : undefined,
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className="rounded-full px-2 py-0.5 font-mono text-[10px] font-semibold uppercase"
                        style={{
                          backgroundColor: out.active ? `${color}22` : 'rgba(255,255,255,0.06)',
                          color: out.active ? color : 'rgba(255,255,255,0.45)',
                        }}
                      >
                        {out.active ? 'Active Path' : 'Standby'}
                      </span>
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: out.active ? color : 'rgba(255,255,255,0.2)' }}
                      />
                    </div>
                    <div className="mt-2.5 text-[14px] font-semibold text-white">{out.title}</div>
                    <p className="mt-1 text-[12px] leading-relaxed text-white/60">{out.action}</p>
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
