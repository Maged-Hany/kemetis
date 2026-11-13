import React from 'react';
import { motion } from 'motion/react';
import { ArrowUpRight, BatteryCharging, Cpu, Layers, ShieldCheck, Sparkles } from 'lucide-react';
import type { ManualVitalsOverride, Vitals } from '../types/health';
import { PressButton, ScrollCanvasFrame, SpotlightCard } from './ui';

interface MicroneedlePatchSectionProps {
  vitals: Vitals;
  overrides: ManualVitalsOverride;
  onOverrideChange: (patch: Partial<ManualVitalsOverride>) => void;
  onAsk: (question: string) => void;
}

const DAYS = [1, 2, 3, 4, 5, 6, 7];
const ZWITTERIONIC_CURVE = [99, 99, 98, 98, 97, 96, 96];
const UNCOATED_CURVE = [98, 96, 93, 83, 73, 64, 54];

export function MicroneedlePatchSection({
  vitals,
  overrides,
  onOverrideChange,
  onAsk,
}: MicroneedlePatchSectionProps) {
  const skinTemp = overrides.skinTempC ?? 33.6;
  const skinHumidity = overrides.skinHumidityPct ?? 46;

  const stages = [
    {
      id: '01',
      icon: Layers,
      title: 'Microneedle Array (0.5–1.0 mm)',
      subtitle: 'Medical Hydrogel / Silicon · Painless ISF',
      metric: `Urea ${vitals.ureaMgDl} · Ca²⁺ ${vitals.calciumMgDl} mg/dL`,
      detail: 'Urease enzyme & Ca²⁺ ion-selective tips with Zwitterionic polymer anti-fouling shield.',
    },
    {
      id: '02',
      icon: Cpu,
      title: 'Analog Front-End (AFE)',
      subtitle: 'TI LMP91000 / AD5940 Transimpedance',
      metric: `${vitals.afeSignalNa} nA Clean Signal`,
      detail: 'Amplifies nA/µV electrochemical currents and filters patient motion artifacts.',
    },
    {
      id: '03',
      icon: BatteryCharging,
      title: 'BLE & 7-Day Power',
      subtitle: 'Nordic nRF52840 + Flexible LiPo / Coin Cell',
      metric: `Day ${vitals.patchDay}/7 · ${vitals.batteryPct}%`,
      detail: 'Continuous low-energy telemetry streaming for a full 168-hour wear cycle.',
    },
    {
      id: '04',
      icon: Sparkles,
      title: 'AI Calibration & Renal Model',
      subtitle: 'Temp/Moisture Compensation + Nephropathy Alert',
      metric: `±${vitals.mlDriftCorrectionPct}% Drift Fix · ${vitals.renalRisk}`,
      detail: 'Correlates elevated Urea with low Ca²⁺ for early renal nephropathy detection.',
    },
  ];

  return (
    <section className="mt-8 sm:mt-10">
      <ScrollCanvasFrame>
        <div className="rounded-[28px] border border-white/[0.08] bg-[#040404] p-5 sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/[0.06] pb-5">
            <div>
              <div className="flex items-center gap-2.5">
                <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-white/40">
                  7-Day Biosensor Architecture
                </span>
                <span className="rounded-full border border-white/15 bg-white/[0.04] px-2.5 py-0.5 font-mono text-[10px] text-white/80">
                  168h Anti-Fouling Patch
                </span>
              </div>
              <h2 className="mt-1.5 text-[18px] font-semibold tracking-[-0.02em] text-white sm:text-[20px]">
                Hydrogel Microneedle Patch &amp; Zwitterionic 7-Day Stability
              </h2>
            </div>

            <PressButton
              onClick={() =>
                onAsk(
                  `Explain how my 7-day microneedle patch (Day ${vitals.patchDay}/7, sensitivity ${vitals.sensorSensitivityPct}%, Urea ${vitals.ureaMgDl} mg/dL, Ca2+ ${vitals.calciumMgDl} mg/dL) prevents biofouling and checks for renal risk.`
                )
              }
              className="group inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-[12px] font-semibold text-black"
            >
              Ask Kemetis about Patch
              <ArrowUpRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
            </PressButton>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {stages.map((s, idx) => {
              const Icon = s.icon;
              return (
                <motion.div
                  key={s.id}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.2 }}
                  transition={{ delay: idx * 0.05, type: 'spring', stiffness: 320, damping: 28 }}
                >
                  <SpotlightCard className="flex h-full flex-col justify-between rounded-2xl p-4">
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.03] text-white/80">
                          <Icon className="h-4 w-4" />
                        </span>
                        <span className="font-mono text-[10px] text-white/35">{s.id}</span>
                      </div>
                      <div className="mt-3 text-[14px] font-medium text-white">{s.title}</div>
                      <div className="mt-0.5 text-[11px] text-white/40">{s.subtitle}</div>
                      <p className="mt-2.5 text-[12px] leading-relaxed text-white/60">{s.detail}</p>
                    </div>
                    <div className="mt-4 border-t border-white/[0.06] pt-2.5 font-mono text-[11px] text-white/90">
                      {s.metric}
                    </div>
                  </SpotlightCard>
                </motion.div>
              );
            })}
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-[1.2fr_1fr]">
            <SpotlightCard className="rounded-2xl p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-[13px] font-medium text-white">
                    7-Day Anti-Fouling Stability (Day {vitals.patchDay} of 7)
                  </div>
                  <div className="mt-0.5 text-[11px] text-white/45">
                    Zwitterionic / Polyurethane membrane prevents protein biofouling after Day 3
                  </div>
                </div>

                <button
                  type="button"
                  role="switch"
                  aria-checked={vitals.zwitterionicShield}
                  onClick={() => onOverrideChange({ zwitterionicShield: !vitals.zwitterionicShield })}
                  className="inline-flex items-center gap-2 rounded-full border border-white/[0.1] bg-black px-3 py-1.5 text-[11px] font-medium text-white/85 transition-colors hover:border-white/25"
                >
                  <ShieldCheck className={`h-3.5 w-3.5 ${vitals.zwitterionicShield ? 'text-[#30d158]' : 'text-white/35'}`} />
                  {vitals.zwitterionicShield ? 'Zwitterionic Coat: ON' : 'Uncoated (Biofouling)'}
                </button>
              </div>

              <div className="mt-4 flex items-center gap-1.5">
                {DAYS.map((d) => {
                  const active = vitals.patchDay === d;
                  return (
                    <button
                      key={d}
                      type="button"
                      onClick={() => onOverrideChange({ patchDay: d })}
                      className={`relative flex-1 rounded-xl py-2 font-mono text-[11px] font-medium transition-colors ${
                        active ? 'text-black' : 'border border-white/[0.07] text-white/55 hover:text-white'
                      }`}
                    >
                      {active && (
                        <motion.span
                          layoutId="patch-day-pill"
                          className="absolute inset-0 rounded-xl bg-white"
                          transition={{ type: 'spring', stiffness: 520, damping: 35 }}
                        />
                      )}
                      <span className="relative">D{d}</span>
                    </button>
                  );
                })}
              </div>

              <div className="mt-5 grid grid-cols-7 gap-2 pt-1">
                {DAYS.map((d, i) => {
                  const zPct = ZWITTERIONIC_CURVE[i];
                  const uPct = UNCOATED_CURVE[i];
                  const currentPct = vitals.zwitterionicShield ? zPct : uPct;
                  const isSelected = vitals.patchDay === d;
                  return (
                    <div key={d} className="flex flex-col items-center">
                      <div className="relative flex h-20 w-full items-end justify-center rounded-xl border border-white/[0.06] bg-black/60 p-1.5">
                        <motion.div
                          className="w-full rounded-md"
                          style={{
                            backgroundColor:
                              currentPct >= 90 ? '#30d158' : currentPct >= 75 ? '#ffd60a' : '#ff3b30',
                            opacity: isSelected ? 1 : 0.45,
                          }}
                          animate={{ height: `${currentPct}%` }}
                          transition={{ type: 'spring', stiffness: 220, damping: 26 }}
                        />
                      </div>
                      <span className={`mt-1.5 font-mono text-[10px] ${isSelected ? 'font-semibold text-white' : 'text-white/40'}`}>
                        {currentPct}%
                      </span>
                    </div>
                  );
                })}
              </div>
            </SpotlightCard>

            <SpotlightCard className="flex flex-col justify-between rounded-2xl p-5">
              <div>
                <div className="text-[13px] font-medium text-white">ML Skin Calibration &amp; Renal Correlation</div>
                <div className="mt-0.5 text-[11px] text-white/45">
                  Compensates for skin temperature &amp; sweat humidity drift
                </div>

                <div className="mt-5 space-y-4">
                  <label className="block">
                    <div className="flex justify-between text-[12px]">
                      <span className="text-white/60">Skin temperature</span>
                      <span className="font-mono text-white">{skinTemp.toFixed(1)} °C</span>
                    </div>
                    <input
                      type="range"
                      min={30}
                      max={39}
                      step={0.1}
                      value={skinTemp}
                      onChange={(e) => onOverrideChange({ skinTempC: Number(e.target.value) })}
                      className="range mt-2 w-full"
                      style={{ ['--pct' as string]: `${((skinTemp - 30) / 9) * 100}%` } as React.CSSProperties}
                    />
                  </label>

                  <label className="block">
                    <div className="flex justify-between text-[12px]">
                      <span className="text-white/60">Skin moisture / sweat</span>
                      <span className="font-mono text-white">{skinHumidity}%</span>
                    </div>
                    <input
                      type="range"
                      min={15}
                      max={95}
                      step={1}
                      value={skinHumidity}
                      onChange={(e) => onOverrideChange({ skinHumidityPct: Number(e.target.value) })}
                      className="range mt-2 w-full"
                      style={{ ['--pct' as string]: `${((skinHumidity - 15) / 80) * 100}%` } as React.CSSProperties}
                    />
                  </label>
                </div>
              </div>

              <div className="mt-5 flex items-center justify-between rounded-xl border border-white/[0.08] bg-black/70 px-3.5 py-2.5">
                <div>
                  <div className="text-[10px] uppercase tracking-[0.12em] text-white/40">Renal Urea + Ca²⁺ Status</div>
                  <div className="mt-0.5 text-[13px] font-medium text-white">{vitals.renalRisk}</div>
                </div>
                <span
                  className={`h-2.5 w-2.5 rounded-full ${
                    vitals.renalRisk === 'Normal'
                      ? 'bg-[#30d158]'
                      : vitals.renalRisk === 'Watch'
                        ? 'bg-[#ffd60a]'
                        : 'bg-[#ff3b30]'
                  }`}
                />
              </div>
            </SpotlightCard>
          </div>
        </div>
      </ScrollCanvasFrame>
    </section>
  );
}
