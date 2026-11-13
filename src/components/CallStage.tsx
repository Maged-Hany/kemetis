import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Maximize2, Mic, MicOff, Minimize2, Phone, PhoneOff, Video, VideoOff, Volume2, VolumeX } from 'lucide-react';
import type { Vitals } from '../types/health';
import type { PulseReading } from '../hooks/usePulse';
import { PressButton, RoundButton, SpotlightCard, StatusDot } from './ui';
import { VoiceStageVisualizer, type VoiceState } from './VoiceStageVisualizer';

interface CallStageProps {
  inCall: boolean;
  startedAt: number | null;
  cameraOn: boolean;
  micOn: boolean;
  speakerOn: boolean;
  voiceState: VoiceState;
  micLevel: number;
  caption: { who: 'you' | 'kemetis'; text: string } | null;
  vitals: Vitals;
  pulse: PulseReading;
  attachVideo: (el: HTMLVideoElement | null) => void;
  onStart: () => void;
  onEnd: () => void;
  onToggleMic: () => void;
  onToggleCamera: () => void;
  onToggleSpeaker: () => void;
}

const STATE_LABEL: Record<VoiceState, string> = {
  idle: 'Ready',
  listening: 'Listening',
  thinking: 'Thinking',
  speaking: 'Speaking',
  muted: 'Muted',
};

export function formatDuration(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  const h = Math.floor(m / 60);
  const mm = String(m % 60).padStart(2, '0');
  const ss = String(s).padStart(2, '0');
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

export function useElapsed(startedAt: number | null) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!startedAt) return;
    setNow(Date.now());
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [startedAt]);
  return startedAt ? now - startedAt : 0;
}

function Readout({ label, value, unit, hint }: { label: string; value: React.ReactNode; unit: string; hint?: string }) {
  return (
    <div className="min-w-0">
      <div className="text-[10px] font-medium uppercase tracking-[0.14em] text-white/40">{label}</div>
      <div className="mt-0.5 flex items-baseline gap-1">
        <span className="font-mono text-xl font-medium tabular-nums text-white sm:text-[22px]">{value}</span>
        <span className="text-[11px] text-white/40">{unit}</span>
      </div>
      {hint && <div className="truncate text-[10px] text-white/35">{hint}</div>}
    </div>
  );
}

export function CallStage(props: CallStageProps) {
  const {
    inCall,
    startedAt,
    cameraOn,
    micOn,
    speakerOn,
    voiceState,
    micLevel,
    caption,
    vitals,
    pulse,
    attachVideo,
    onStart,
    onEnd,
    onToggleMic,
    onToggleCamera,
    onToggleSpeaker,
  } = props;
  const stageRef = useRef<HTMLDivElement>(null);
  const elapsed = useElapsed(startedAt);
  const [expandedCam, setExpandedCam] = useState(false);

  useEffect(() => {
    if (!cameraOn) setExpandedCam(false);
  }, [cameraOn]);

  const hrHint = cameraOn
    ? pulse.bpm !== null
      ? 'from camera'
      : `reading ${Math.round(pulse.progress * 100)}%`
    : 'estimated';

  const showFullCam = cameraOn && expandedCam;

  return (
    <SpotlightCard className="h-full min-h-[560px] rounded-[28px]">
      <div ref={stageRef} className="relative flex h-full min-h-[560px] flex-col overflow-hidden rounded-[28px]">
        <div className="canvas-grid pointer-events-none absolute inset-0 opacity-70" />

        <div className="relative z-20 flex items-start justify-between gap-4 p-5 sm:p-6">
          <div className="grid grid-cols-2 gap-x-6 gap-y-4 rounded-2xl bg-black/50 px-3 py-2 backdrop-blur-md sm:grid-cols-4 sm:gap-x-8">
            <Readout label="Heart" value={vitals.heartRateBpm} unit="bpm" hint={hrHint} />
            <Readout label="SpO₂" value={vitals.spo2Pct} unit="%" />
            <Readout label="Glucose" value={vitals.glucoseMgDl} unit="mg/dL" hint={vitals.glucoseState.toLowerCase()} />
            <Readout label="Breath" value={vitals.respirationBpm} unit="/min" />
          </div>

          <div className="flex shrink-0 flex-col items-end gap-2">
            <AnimatePresence>
              {inCall && (
                <motion.div
                  initial={{ opacity: 0, y: -6, scale: 0.94 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -6, scale: 0.94 }}
                  className="flex items-center gap-2 rounded-full border border-white/[0.1] bg-black/75 px-3 py-1.5 backdrop-blur-md"
                >
                  <span className="live-dot h-1.5 w-1.5 rounded-full bg-[#ff3b30]" />
                  <span className="font-mono text-xs tabular-nums text-white/85">{formatDuration(elapsed)}</span>
                </motion.div>
              )}
            </AnimatePresence>
            <div className="flex items-center gap-1.5 rounded-full border border-white/[0.06] bg-black/60 px-2.5 py-1 text-[11px] text-white/55 backdrop-blur-md">
              <StatusDot status={vitals.status} />
              {vitals.status}
            </div>
          </div>
        </div>

        <div
          className={`relative z-10 flex flex-1 flex-col items-center justify-center px-6 pb-32 transition-opacity duration-300 ${
            showFullCam ? 'pointer-events-none opacity-0' : 'opacity-100'
          }`}
        >
          <VoiceStageVisualizer state={inCall ? voiceState : 'idle'} level={micLevel} />

          <div className="mt-6 text-center">
            <div className="text-[15px] font-medium tracking-[-0.01em] text-white">Kemetis</div>
            <AnimatePresence mode="wait">
              <motion.div
                key={inCall ? voiceState : 'offline'}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.16 }}
                className="mt-1 text-[13px] text-white/45"
              >
                {inCall ? STATE_LABEL[voiceState] : 'Available'}
              </motion.div>
            </AnimatePresence>
          </div>

          <AnimatePresence>
            {!inCall && (
              <motion.div
                initial={{ opacity: 0, scale: 0.92, y: 8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.92, y: 8 }}
                transition={{ type: 'spring', stiffness: 420, damping: 28 }}
                className="mt-7 flex items-center gap-3"
              >
                <PressButton
                  onClick={onStart}
                  className="group flex items-center gap-2.5 rounded-full bg-white py-3.5 pl-5 pr-6 text-[14px] font-semibold text-black shadow-[0_8px_30px_rgba(255,255,255,0.12)]"
                >
                  <Phone className="h-4 w-4 transition-transform duration-300 group-hover:-rotate-12" />
                  Start call
                </PressButton>
                <RoundButton
                  label={cameraOn ? 'Stop video' : 'Start video'}
                  tone={cameraOn ? 'inverted' : 'default'}
                  onClick={onToggleCamera}
                  aria-pressed={cameraOn}
                >
                  {cameraOn ? <Video className="h-4 w-4" /> : <VideoOff className="h-4 w-4" />}
                </RoundButton>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="pointer-events-none absolute inset-x-0 bottom-[102px] z-20 flex justify-center px-6">
          <AnimatePresence mode="wait">
            {inCall && caption && (
              <motion.p
                key={caption.who + caption.text.slice(0, 24)}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className={`max-w-xl rounded-2xl border border-white/[0.06] bg-black/75 px-4 py-2 text-center text-[13px] leading-relaxed line-clamp-2 backdrop-blur-md ${
                  caption.who === 'you' ? 'text-white/55' : 'text-white/90'
                }`}
              >
                {caption.text}
              </motion.p>
            )}
          </AnimatePresence>
        </div>

        <AnimatePresence>
          {inCall && (
            <motion.div
              initial={{ opacity: 0, y: 24, scale: 0.94 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 24, scale: 0.94 }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              className="absolute inset-x-0 bottom-6 z-30 flex justify-center"
            >
              <div className="flex items-center gap-2.5 rounded-full border border-white/[0.09] bg-black/80 p-2 backdrop-blur-xl sm:gap-3">
                <RoundButton
                  label={micOn ? 'Mute' : 'Unmute'}
                  tone={micOn ? 'default' : 'inverted'}
                  halo={micOn ? micLevel : 0}
                  onClick={onToggleMic}
                  aria-pressed={!micOn}
                >
                  {micOn ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
                </RoundButton>
                <RoundButton
                  label={cameraOn ? 'Stop video' : 'Start video'}
                  tone={cameraOn ? 'inverted' : 'default'}
                  onClick={onToggleCamera}
                  aria-pressed={cameraOn}
                >
                  {cameraOn ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
                </RoundButton>
                <RoundButton
                  label={speakerOn ? 'Mute voice' : 'Unmute voice'}
                  tone={speakerOn ? 'default' : 'inverted'}
                  onClick={onToggleSpeaker}
                  aria-pressed={!speakerOn}
                >
                  {speakerOn ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
                </RoundButton>
                <RoundButton label="End call" tone="danger" size="lg" onClick={onEnd}>
                  <PhoneOff className="h-5 w-5" />
                </RoundButton>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {(cameraOn || inCall) && (
            <motion.div
              layout
              drag={!showFullCam}
              dragConstraints={stageRef}
              dragMomentum={false}
              dragElastic={0.08}
              initial={{ opacity: 0, scale: 0.88 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.88 }}
              transition={{ type: 'spring', stiffness: 360, damping: 28 }}
              whileDrag={{ scale: 1.03 }}
              className={
                showFullCam
                  ? 'absolute inset-0 z-10 overflow-hidden rounded-[28px] bg-black'
                  : 'absolute top-40 right-4 z-20 h-[96px] w-[128px] cursor-grab overflow-hidden rounded-2xl border border-white/15 bg-[#0a0a0a] shadow-[0_20px_60px_rgba(0,0,0,0.85)] active:cursor-grabbing sm:top-28 sm:right-6 sm:h-[124px] sm:w-[168px]'
              }
            >
              <video
                ref={attachVideo}
                muted
                playsInline
                autoPlay
                className={`h-full w-full -scale-x-100 object-cover transition-opacity duration-300 ${
                  cameraOn ? 'opacity-100' : 'opacity-0'
                }`}
              />
              {showFullCam && (
                <div className="pointer-events-none absolute inset-6">
                  <span className="absolute left-0 top-0 h-5 w-5 border-l border-t border-white/30" />
                  <span className="absolute right-0 top-0 h-5 w-5 border-r border-t border-white/30" />
                  <span className="absolute bottom-0 left-0 h-5 w-5 border-b border-l border-white/30" />
                  <span className="absolute bottom-0 right-0 h-5 w-5 border-b border-r border-white/30" />
                </div>
              )}
              {!cameraOn && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div
                    className="flex h-11 w-11 items-center justify-center rounded-full bg-white/[0.08] text-[12px] font-medium text-white/80 transition-shadow duration-100"
                    style={{
                      boxShadow: micOn
                        ? `0 0 0 ${2 + micLevel * 10}px rgba(255,255,255,${0.06 + micLevel * 0.22})`
                        : 'none',
                    }}
                  >
                    You
                  </div>
                </div>
              )}
              {cameraOn && (
                <button
                  type="button"
                  onClick={() => setExpandedCam((v) => !v)}
                  aria-label={showFullCam ? 'Minimize camera' : 'Expand camera'}
                  className={`absolute flex h-7 w-7 items-center justify-center rounded-full border border-white/15 bg-black/70 text-white/80 backdrop-blur-md transition-colors hover:bg-black hover:text-white ${
                    showFullCam ? 'bottom-6 right-6 z-30' : 'right-2 top-2'
                  }`}
                >
                  {showFullCam ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
                </button>
              )}
              <div className={`absolute flex items-center gap-1.5 ${showFullCam ? 'bottom-6 left-6' : 'bottom-2 left-2'}`}>
                {!micOn && (
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-black/70">
                    <MicOff className="h-3 w-3 text-white" />
                  </span>
                )}
                {cameraOn && (
                  <span className="rounded-full bg-black/70 px-2 py-0.5 font-mono text-[10px] text-white/85 backdrop-blur">
                    {pulse.bpm !== null
                      ? `♥ ${pulse.bpm}`
                      : !pulse.faceDetected && pulse.progress > 0.3
                        ? 'more light'
                        : 'reading…'}
                  </span>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </SpotlightCard>
  );
}
