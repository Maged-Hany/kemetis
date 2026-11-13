import React from 'react';
import { motion } from 'motion/react';
import { Activity, ArrowUpRight, FileText, Radio, ShieldAlert, UserCheck } from 'lucide-react';
import type { GravityMode, MissionOutput, MissionParams, Vitals } from '../types/health';
import { ParallaxTrack, PressButton, ScrollCanvasFrame, SpotlightCard, StatusDot } from './ui';

interface RadiationMonitoringSectionProps {
  vitals: Vitals;
  mission: MissionParams;
  missionOutput: MissionOutput;
  onAsk: (question: string) => void;
}

const GRAVITY_LABEL: Record<GravityMode, string> = {
  '0g': 'Orbit (0g Microgravity)',
  '0.16g': 'Lunar Surface (0.16g)',
  '0.38g': 'Martian Surface (0.38g)',
  '1g': 'Earth Baseline (1g)',
};

export function RadiationMonitoringSection({
  vitals,
  mission,
  missionOutput,
  onAsk,
}: RadiationMonitoringSectionProps) {
  const sourceBadge = vitals.radiationSimulated ? 'Simulated Data' : 'Manual Sensor Input';

  // Tissue-specific dosimetry distribution (illustrating non-interchangeable mGy absorbed energy vs mSv biological effect)
  const tissueProfiles = [
    {
      tissue: 'Blood-Forming Organs (Marrow)',
      absorbedMgy: Number((vitals.absorbedDoseMgy * 0.92).toFixed(1)),
      equivalentMsv: Number((vitals.equivalentDoseMsv * 0.96).toFixed(1)),
      note: 'Deep high-LET GCR ion & secondary neutron biological sensitivity',
    },
    {
      tissue: 'Ocular Lens & Retina',
      absorbedMgy: Number((vitals.absorbedDoseMgy * 1.08).toFixed(1)),
      equivalentMsv: Number((vitals.equivalentDoseMsv * 1.04).toFixed(1)),
      note: 'Tracked alongside ONSD for SANS & radiation cataract risk',
    },
    {
      tissue: 'Central Nervous System (CNS)',
      absorbedMgy: Number((vitals.absorbedDoseMgy * 0.86).toFixed(1)),
      equivalentMsv: Number((vitals.equivalentDoseMsv * 1.12).toFixed(1)),
      note: 'High biological weighting from heavy Z-ion track structure',
    },
    {
      tissue: 'Cutaneous / Skin Interstitial',
      absorbedMgy: Number((vitals.absorbedDoseMgy * 1.24).toFixed(1)),
      equivalentMsv: Number((vitals.equivalentDoseMsv * 0.88).toFixed(1)),
      note: 'Higher low-LET proton energy absorption at body surface',
    },
  ];

  const maxTimelineMsv = Math.max(100, ...missionOutput.timeline.map((t) => t.equivalentDoseMsv), vitals.equivalentDoseMsv) * 1.1;
  const maxTimelineMgy = Math.max(40, ...missionOutput.timeline.map((t) => t.absorbedDoseMgy), vitals.absorbedDoseMgy) * 1.15;

  return (
    <section className="mt-8 sm:mt-10" aria-label="Radiation Monitoring and Astronaut Health Profile">
      <ScrollCanvasFrame>
        <div className="rounded-[28px] border border-white/[0.08] bg-[#040404] p-5 sm:p-8">
          {/* Header Bar */}
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/[0.06] pb-5">
            <div>
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-white/40">
                  Radiation Monitoring &amp; Astronaut Health Profile
                </span>
                <span className="rounded-full border border-white/15 bg-white/[0.04] px-2.5 py-0.5 font-mono text-[10px] text-white/80">
                  {sourceBadge}
                </span>
                <span className="rounded-full border border-white/[0.08] bg-white/[0.02] px-2.5 py-0.5 font-mono text-[10px] text-white/55">
                  mSv ≠ mGy · Non-Fixed Spectrum
                </span>
              </div>
              <h2 className="mt-1.5 text-[18px] font-semibold tracking-[-0.02em] text-white sm:text-[20px]">
                Equivalent Dose (mSv) &amp; Absorbed Dose (mGy) Telemetry
              </h2>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <PressButton
                onClick={() =>
                  onAsk(
                    `Explain the difference between my current Equivalent Dose of ${vitals.equivalentDoseMsv} mSv (${vitals.dailyEquivalentDoseMsv} mSv/day) and my Absorbed Dose of ${vitals.absorbedDoseMgy} mGy (${vitals.dailyAbsorbedDoseMgy} mGy/day), and why mSv and mGy are not interchangeable.`
                  )
                }
                className="group inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-[12px] font-semibold text-black"
              >
                Ask Kemetis: mSv vs mGy
                <ArrowUpRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
              </PressButton>
            </div>
          </div>

          {/* Astronaut Health Profile Strip */}
          <div className="mt-6 grid gap-3 lg:grid-cols-[1.15fr_1fr_1fr]">
            <SpotlightCard className="flex flex-col justify-between rounded-2xl p-5">
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.03] text-white/80">
                      <UserCheck className="h-4 w-4" />
                    </span>
                    <div>
                      <div className="text-[14px] font-medium text-white">Astronaut Health Profile</div>
                      <div className="font-mono text-[10px] text-white/40">
                        CREW ID: KEMETIS-01 · {GRAVITY_LABEL[mission.gravity]}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-black/60 px-2.5 py-1 text-[11px] text-white/70">
                    <StatusDot status={vitals.radiationRisk} />
                    {vitals.radiationRisk}
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2.5 rounded-xl border border-white/[0.06] bg-black/60 p-3">
                  <div>
                    <div className="text-[10px] uppercase tracking-[0.12em] text-white/40">Equivalent Dose</div>
                    <div className="mt-0.5 font-mono text-[16px] font-semibold tabular-nums text-white">
                      {vitals.equivalentDoseMsv} <span className="text-[11px] font-normal text-white/45">mSv</span>
                    </div>
                    <div className="text-[10px] text-white/40">Biological effect</div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-[0.12em] text-white/40">Absorbed Dose</div>
                    <div className="mt-0.5 font-mono text-[16px] font-semibold tabular-nums text-white">
                      {vitals.absorbedDoseMgy} <span className="text-[11px] font-normal text-white/45">mGy</span>
                    </div>
                    <div className="text-[10px] text-white/40">Tissue energy</div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-[0.12em] text-white/40">Cardio / SpO₂</div>
                    <div className="mt-0.5 font-mono text-[13px] tabular-nums text-white/90">
                      {vitals.heartRateBpm} bpm · {vitals.spo2Pct}%
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-[0.12em] text-white/40">Hull Shielding</div>
                    <div className="mt-0.5 font-mono text-[13px] tabular-nums text-white/90">
                      {mission.shielding} g/cm² · {mission.days}d
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-3 flex items-center justify-between border-t border-white/[0.06] pt-2.5 font-mono text-[10px] text-white/45">
                <span>
                  {vitals.radiationSimulated
                    ? 'Source: Simulated NASA HRP / CSA Dosimetry Model'
                    : 'Source: Manual Dosimeter Sensor Override'}
                </span>
                <span>{mission.solarStorm ? 'SPE Alert Active' : 'Quiet Solar Baseline'}</span>
              </div>
            </SpotlightCard>

            {/* Unit 1: mSv (Equivalent Dose) Card */}
            <SpotlightCard className="flex flex-col justify-between rounded-2xl p-5">
              <div>
                <div className="flex items-center justify-between">
                  <span className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.03] text-white/80">
                    <ShieldAlert className="h-4 w-4" />
                  </span>
                  <span className="rounded-full border border-white/[0.1] bg-white/[0.03] px-2.5 py-0.5 font-mono text-[10px] text-white/65">
                    mSv · Equivalent Dose ({sourceBadge})
                  </span>
                </div>

                <div className="mt-3 text-[14px] font-medium text-white">
                  mSv (millisievert) – Equivalent Dose
                </div>
                <div className="mt-0.5 text-[11px] text-white/45">
                  Biological effect of radiation exposure on the astronaut&apos;s body
                </div>

                <div className="mt-3 flex items-baseline gap-2">
                  <span className="font-mono text-[30px] font-medium leading-none tabular-nums text-white">
                    {vitals.equivalentDoseMsv}
                  </span>
                  <span className="font-mono text-[13px] text-white/45">mSv cumulative</span>
                  <span className="ml-auto font-mono text-[12px] tabular-nums text-white/70">
                    {vitals.dailyEquivalentDoseMsv} mSv/day
                  </span>
                </div>

                <div className="mt-3 h-[3px] overflow-hidden rounded-full bg-white/[0.08]">
                  <motion.div
                    className="h-full rounded-full bg-white"
                    animate={{ width: `${Math.max(3, Math.min(100, (vitals.equivalentDoseMsv / 600) * 100))}%` }}
                    transition={{ type: 'spring', stiffness: 180, damping: 24 }}
                  />
                </div>
              </div>

              <div className="mt-4 border-t border-white/[0.06] pt-2.5 text-[11px] leading-relaxed text-white/55">
                Weights physical dose by radiation quality factor (<span className="font-mono text-white/80">w_R</span>) for GCR heavy ions, secondary neutrons, and protons against the 600 mSv career limit.
              </div>
            </SpotlightCard>

            {/* Unit 2: mGy (Absorbed Dose) Card */}
            <SpotlightCard className="flex flex-col justify-between rounded-2xl p-5">
              <div>
                <div className="flex items-center justify-between">
                  <span className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.03] text-white/80">
                    <Radio className="h-4 w-4" />
                  </span>
                  <span className="rounded-full border border-white/[0.1] bg-white/[0.03] px-2.5 py-0.5 font-mono text-[10px] text-white/65">
                    mGy · Absorbed Dose ({sourceBadge})
                  </span>
                </div>

                <div className="mt-3 text-[14px] font-medium text-white">
                  mGy (milligray) – Absorbed Dose
                </div>
                <div className="mt-0.5 text-[11px] text-white/45">
                  Amount of radiation energy absorbed by body tissues
                </div>

                <div className="mt-3 flex items-baseline gap-2">
                  <span className="font-mono text-[30px] font-medium leading-none tabular-nums text-white">
                    {vitals.absorbedDoseMgy}
                  </span>
                  <span className="font-mono text-[13px] text-white/45">mGy cumulative</span>
                  <span className="ml-auto font-mono text-[12px] tabular-nums text-white/70">
                    {vitals.dailyAbsorbedDoseMgy} mGy/day
                  </span>
                </div>

                <div className="mt-3 h-[3px] overflow-hidden rounded-full bg-white/[0.08]">
                  <motion.div
                    className="h-full rounded-full bg-white/70"
                    animate={{ width: `${Math.max(3, Math.min(100, (vitals.absorbedDoseMgy / 500) * 100))}%` }}
                    transition={{ type: 'spring', stiffness: 180, damping: 24 }}
                  />
                </div>
              </div>

              <div className="mt-4 border-t border-white/[0.06] pt-2.5 text-[11px] leading-relaxed text-white/55">
                Quantifies raw ionizing energy deposited per unit mass of tissue (<span className="font-mono text-white/80">1 mGy = 1 mJ/kg</span>) prior to biological weighting.
              </div>
            </SpotlightCard>
          </div>

          {/* Data Visualization Charts Row */}
          <div className="mt-4 grid gap-4 lg:grid-cols-[1.2fr_1fr]">
            {/* Chart 1: Cumulative Trajectory Chart (mSv vs mGy) */}
            <SpotlightCard className="rounded-2xl p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <Activity className="h-3.5 w-3.5 text-white/55" />
                    <span className="text-[13px] font-medium text-white">
                      Radiation Exposure Visualization Chart ({ mission.days }-Day Trajectory)
                    </span>
                  </div>
                  <div className="mt-0.5 text-[11px] text-white/45">
                    Independent progression of Equivalent Dose (mSv) and Absorbed Dose (mGy) · {sourceBadge}
                  </div>
                </div>
                <div className="flex items-center gap-3 font-mono text-[10px]">
                  <span className="inline-flex items-center gap-1.5 text-white/85">
                    <span className="h-2 w-2 rounded-full bg-white" />
                    mSv (Biological Effect)
                  </span>
                  <span className="inline-flex items-center gap-1.5 text-white/55">
                    <span className="h-2 w-2 rounded-full bg-white/40" />
                    mGy (Tissue Energy)
                  </span>
                </div>
              </div>

              <div className="mt-5 grid grid-cols-6 gap-2.5 pt-1">
                {missionOutput.timeline.map((pt) => {
                  const msvHeight = Math.max(8, Math.min(100, (pt.equivalentDoseMsv / maxTimelineMsv) * 100));
                  const mgyHeight = Math.max(6, Math.min(100, (pt.absorbedDoseMgy / maxTimelineMgy) * 100));
                  return (
                    <div key={pt.label} className="flex flex-col items-center">
                      <div className="relative flex h-24 w-full items-end justify-center gap-1.5 rounded-xl border border-white/[0.06] bg-black/60 p-2">
                        <motion.div
                          className="w-1/2 rounded-sm bg-white"
                          animate={{ height: `${msvHeight}%` }}
                          transition={{ type: 'spring', stiffness: 220, damping: 26 }}
                          title={`Day ${pt.day}: ${pt.equivalentDoseMsv} mSv Equivalent Dose`}
                        />
                        <motion.div
                          className="w-1/2 rounded-sm bg-white/40"
                          animate={{ height: `${mgyHeight}%` }}
                          transition={{ type: 'spring', stiffness: 220, damping: 26 }}
                          title={`Day ${pt.day}: ${pt.absorbedDoseMgy} mGy Absorbed Dose`}
                        />
                      </div>
                      <span className="mt-1.5 font-mono text-[10px] font-medium text-white/80">{pt.label}</span>
                      <span className="font-mono text-[9px] tabular-nums text-white/60">{pt.equivalentDoseMsv} mSv</span>
                      <span className="font-mono text-[9px] tabular-nums text-white/40">{pt.absorbedDoseMgy} mGy</span>
                    </div>
                  );
                })}
              </div>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-white/[0.06] pt-3 font-mono text-[10px] text-white/45">
                <span>
                  Note: mSv and mGy are plotted on independent physical scales and never use a fixed multiplier.
                </span>
                <span>{vitals.radiationSimulated ? 'Simulated Telemetry' : 'Manual Sensor Telemetry'}</span>
              </div>
            </SpotlightCard>

            {/* Chart 2: Organ & Tissue Dosimetry Breakdown */}
            <SpotlightCard className="flex flex-col justify-between rounded-2xl p-5">
              <div>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-[13px] font-medium text-white">
                      Organ &amp; Tissue Dosimetry Chart (mSv vs mGy)
                    </div>
                    <div className="mt-0.5 text-[11px] text-white/45">
                      Tissue energy deposition (mGy) vs biological equivalent impact (mSv) · {sourceBadge}
                    </div>
                  </div>
                </div>

                <div className="mt-4 space-y-3">
                  {tissueProfiles.map((tp) => {
                    const msvPct = Math.max(5, Math.min(100, (tp.equivalentMsv / 600) * 100));
                    const mgyPct = Math.max(5, Math.min(100, (tp.absorbedMgy / 500) * 100));
                    return (
                      <div key={tp.tissue} className="rounded-xl border border-white/[0.06] bg-black/50 p-3">
                        <div className="flex flex-wrap items-baseline justify-between gap-2">
                          <span className="text-[12px] font-medium text-white/90">{tp.tissue}</span>
                          <div className="flex items-center gap-3 font-mono text-[11px] tabular-nums">
                            <span className="text-white">{tp.equivalentMsv} mSv</span>
                            <span className="text-white/30">·</span>
                            <span className="text-white/65">{tp.absorbedMgy} mGy</span>
                          </div>
                        </div>
                        <div className="mt-2 space-y-1.5">
                          <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.07]">
                            <motion.div
                              className="h-full rounded-full bg-white"
                              animate={{ width: `${msvPct}%` }}
                              transition={{ type: 'spring', stiffness: 180, damping: 24 }}
                            />
                          </div>
                          <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.07]">
                            <motion.div
                              className="h-full rounded-full bg-white/40"
                              animate={{ width: `${mgyPct}%` }}
                              transition={{ type: 'spring', stiffness: 180, damping: 24 }}
                            />
                          </div>
                        </div>
                        <div className="mt-1.5 text-[10px] text-white/40">{tp.note}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </SpotlightCard>
          </div>

          {/* Astronaut Health Report Summary Card */}
          <div className="mt-4 rounded-2xl border border-white/[0.07] bg-[#070708] p-4 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <FileText className="h-4 w-4 text-white/55" />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[13px] font-medium text-white">Astronaut Clinical &amp; Radiation Health Report</span>
                    <span className="rounded-full bg-white/[0.07] px-2 py-0.5 font-mono text-[10px] text-white/75">
                      {sourceBadge}
                    </span>
                  </div>
                  <p className="mt-0.5 text-[11px] text-white/45">
                    Integrated flight surgeon telemetry summary combining contactless vitals, 7-day ISF patch, and dual-unit radiation dosimetry
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <PressButton
                  onClick={() =>
                    onAsk(
                      `Give me a complete flight surgeon health report covering my Equivalent Dose (${vitals.equivalentDoseMsv} mSv), Absorbed Dose (${vitals.absorbedDoseMgy} mGy), cardiovascular vitals, and renal patch readings.`
                    )
                  }
                  className="group inline-flex items-center gap-1 rounded-full border border-white/[0.12] px-3 py-1.5 text-[11px] font-medium text-white/80 transition-colors hover:border-white/30 hover:text-white"
                >
                  Review Report with Kemetis
                  <ArrowUpRight className="h-3 w-3 transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                </PressButton>
              </div>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-xl border border-white/[0.06] bg-black/60 p-3.5">
                <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-white/40">
                  Equivalent Dose (Biological)
                </div>
                <div className="mt-1 font-mono text-[18px] font-semibold tabular-nums text-white">
                  {vitals.equivalentDoseMsv} mSv
                </div>
                <div className="mt-1 text-[11px] text-white/50">
                  Rate: {vitals.dailyEquivalentDoseMsv} mSv/day · Career limit: 600 mSv ({vitals.radiationSimulated ? 'Simulated' : 'Sensor'})
                </div>
              </div>

              <div className="rounded-xl border border-white/[0.06] bg-black/60 p-3.5">
                <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-white/40">
                  Absorbed Dose (Tissue Energy)
                </div>
                <div className="mt-1 font-mono text-[18px] font-semibold tabular-nums text-white">
                  {vitals.absorbedDoseMgy} mGy
                </div>
                <div className="mt-1 text-[11px] text-white/50">
                  Rate: {vitals.dailyAbsorbedDoseMgy} mGy/day · Energy per unit mass ({vitals.radiationSimulated ? 'Simulated' : 'Sensor'})
                </div>
              </div>

              <div className="rounded-xl border border-white/[0.06] bg-black/60 p-3.5">
                <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-white/40">
                  Cardiovascular &amp; Metabolic
                </div>
                <div className="mt-1 font-mono text-[18px] font-semibold tabular-nums text-white">
                  {vitals.heartRateBpm} bpm · {vitals.systolic}/{vitals.diastolic}
                </div>
                <div className="mt-1 text-[11px] text-white/50">
                  SpO₂ {vitals.spo2Pct}% · Glucose {vitals.glucoseMgDl} mg/dL ({vitals.glucoseState})
                </div>
              </div>

              <div className="rounded-xl border border-white/[0.06] bg-black/60 p-3.5">
                <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-white/40">
                  Ocular &amp; Renal Biomarkers
                </div>
                <div className="mt-1 font-mono text-[18px] font-semibold tabular-nums text-white">
                  ONSD {vitals.onsdMm} mm
                </div>
                <div className="mt-1 text-[11px] text-white/50">
                  Urea {vitals.ureaMgDl} · Ca²⁺ {vitals.calciumMgDl} mg/dL ({vitals.renalRisk})
                </div>
              </div>
            </div>

            <ParallaxTrack distance={18} className="mt-3 hidden border-t border-white/[0.05] pt-2.5 font-mono text-[10px] text-white/35 md:block">
              REPORT STATUS: {vitals.status.toUpperCase()} · EQUIVALENT DOSE {vitals.equivalentDoseMsv} mSv (BIOLOGICAL EFFECT) · ABSORBED DOSE {vitals.absorbedDoseMgy} mGy (TISSUE ENERGY) · DATA: {sourceBadge.toUpperCase()}
            </ParallaxTrack>
          </div>
        </div>
      </ScrollCanvasFrame>
    </section>
  );
}
