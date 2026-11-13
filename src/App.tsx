import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { CallStage, formatDuration } from './components/CallStage';
import { ChatPanel } from './components/ChatPanel';
import { CheckInSection } from './components/CheckInSection';
import { Header } from './components/Header';
import { Lab } from './components/Lab';
import type { VoiceState } from './components/VoiceStageVisualizer';
import { DEFAULT_CHECKIN, DEFAULT_MISSION, DEFAULT_OPTICAL, DEFAULT_VOICE } from './data/defaults';
import { computeVitals, parseCommands, simulateMission } from './engine/physiology';
import { useMicLevel } from './hooks/useMicLevel';
import { usePulse } from './hooks/usePulse';
import { createRecognizer, speak, stopSpeaking } from './lib/speech';
import type { Action, ChatMessage, CheckIn, GravityMode, MissionParams, View } from './types/health';

const GRAVITY_NAME: Record<GravityMode, string> = { '0g': 'Orbit', '0.16g': 'Moon', '0.38g': 'Mars', '1g': 'Earth' };
const GREETINGS = [
  "I'm here. How are you feeling today?",
  'Hey, good to see you. Anything bothering you?',
  "Hi. I've got your readings up, what's on your mind?",
];

let counter = 0;
const uid = () => `${Date.now().toString(36)}${(counter++).toString(36)}`;

const welcome = (): ChatMessage => ({
  id: uid(),
  role: 'assistant',
  text: "Hi, I'm Kemetis. Call me or type here, whichever is easier.",
  at: Date.now(),
});

export default function App() {
  const [view, setView] = useState<View>('call');
  const [callStartedAt, setCallStartedAt] = useState<number | null>(null);
  const [cameraOn, setCameraOn] = useState(false);
  const [micOn, setMicOn] = useState(false);
  const [speakerOn, setSpeakerOn] = useState(true);
  const [thinking, setThinking] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>(() => [welcome()]);
  const [checkIn, setCheckIn] = useState<CheckIn>(DEFAULT_CHECKIN);
  const [mission, setMission] = useState<MissionParams>(DEFAULT_MISSION);
  const [toast, setToast] = useState<string | null>(null);
  const [online, setOnline] = useState<boolean | null>(null);
  const [voiceCycle, setVoiceCycle] = useState(0);

  const inCall = callStartedAt !== null;
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const camStream = useRef<MediaStream | null>(null);
  const camPending = useRef(false);
  const busy = useRef(false);
  const speechTimer = useRef<number | undefined>(undefined);
  const voiceErrors = useRef(0);

  const notify = useCallback((message: string) => setToast(message), []);

  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(null), 3800);
    return () => window.clearTimeout(id);
  }, [toast]);

  useEffect(() => {
    fetch('/api/health')
      .then((r) => r.json())
      .then((d: { ai?: boolean }) => setOnline(Boolean(d.ai)))
      .catch(() => setOnline(false));
  }, []);

  const micLevel = useMicLevel(micOn, (message) => {
    notify(message);
    setMicOn(false);
  });
  const pulse = usePulse(videoRef, cameraOn && view === 'call');

  const measuredBpm = cameraOn ? pulse.bpm : null;
  const vitals = useMemo(
    () => computeVitals(DEFAULT_OPTICAL, DEFAULT_VOICE, checkIn, measuredBpm),
    [checkIn, measuredBpm]
  );
  const missionOutput = useMemo(() => simulateMission(mission), [mission]);

  const live = useRef({ checkIn, mission, view, cameraOn, micOn, inCall, speakerOn, measuredBpm, messages });
  live.current = { checkIn, mission, view, cameraOn, micOn, inCall, speakerOn, measuredBpm, messages };

  const attachVideo = useCallback((el: HTMLVideoElement | null) => {
    videoRef.current = el;
    if (el && camStream.current && el.srcObject !== camStream.current) {
      el.srcObject = camStream.current;
      el.play().catch(() => {});
    }
  }, []);

  const setCamera = useCallback(
    async (on: boolean) => {
      if (!on) {
        camStream.current?.getTracks().forEach((t) => t.stop());
        camStream.current = null;
        if (videoRef.current) videoRef.current.srcObject = null;
        setCameraOn(false);
        return;
      }
      if (camStream.current) {
        setCameraOn(true);
        return;
      }
      if (camPending.current) return;
      if (!navigator.mediaDevices?.getUserMedia) {
        notify('Camera is not available in this browser.');
        return;
      }
      camPending.current = true;
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
          audio: false,
        });
        camStream.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
        setCameraOn(true);
      } catch {
        notify('Camera access was blocked.');
        setCameraOn(false);
      } finally {
        camPending.current = false;
      }
    },
    [notify]
  );

  useEffect(
    () => () => {
      camStream.current?.getTracks().forEach((t) => t.stop());
      stopSpeaking();
    },
    []
  );

  const say = useCallback((text: string) => {
    window.clearTimeout(speechTimer.current);
    setSpeaking(true);
    const done = () => {
      window.clearTimeout(speechTimer.current);
      setSpeaking(false);
    };
    speechTimer.current = window.setTimeout(done, 4000 + text.split(/\s+/).length * 450);
    speak(text, undefined, done);
  }, []);

  const quiet = useCallback(() => {
    window.clearTimeout(speechTimer.current);
    stopSpeaking();
    setSpeaking(false);
  }, []);

  const runActions = useCallback(
    (actions: Action[]): string[] => {
      const labels: string[] = [];
      for (const a of actions) {
        switch (a.type) {
          case 'SWITCH_VIEW':
            setView(a.view);
            labels.push(a.view === 'lab' ? 'Opened lab' : 'Back to call');
            break;
          case 'UPDATE_CHECKIN':
            setCheckIn((prev) => ({ ...prev, ...a.patch }));
            labels.push('Check-in updated');
            break;
          case 'SET_GRAVITY':
            setMission((prev) => ({ ...prev, gravity: a.gravity }));
            labels.push(`Gravity: ${GRAVITY_NAME[a.gravity]}`);
            break;
          case 'UPDATE_MISSION':
            setMission((prev) => ({ ...prev, ...a.patch }));
            if (a.patch.days !== undefined) labels.push(`${a.patch.days} days`);
            if (a.patch.solarStorm !== undefined) labels.push(a.patch.solarStorm ? 'Solar storm on' : 'Solar storm off');
            break;
          case 'SET_CAMERA':
            void setCamera(a.enabled);
            labels.push(a.enabled ? 'Camera on' : 'Camera off');
            break;
          case 'SET_MIC':
            setMicOn(a.enabled);
            labels.push(a.enabled ? 'Mic on' : 'Mic off');
            break;
        }
      }
      return labels;
    },
    [setCamera]
  );

  const captureFrame = useCallback((): string | undefined => {
    const video = videoRef.current;
    if (!live.current.cameraOn || !video || video.readyState < 2) return undefined;
    const canvas = document.createElement('canvas');
    canvas.width = 320;
    canvas.height = 240;
    const ctx = canvas.getContext('2d');
    if (!ctx) return undefined;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', 0.7);
  }, []);

  const send = useCallback(
    async (raw: string) => {
      const text = raw.trim();
      if (!text || busy.current) return;
      busy.current = true;

      try {
        const state = live.current;
        const history = state.messages
          .filter((m) => m.role !== 'event')
          .slice(-8)
          .map((m) => ({ role: m.role, text: m.text }));
        setMessages((prev) => [...prev, { id: uid(), role: 'user', text, at: Date.now() }]);

        const local = parseCommands(text);
        let nextCheckIn = state.checkIn;
        let nextMission = state.mission;
        let nextView = state.view;
        for (const a of local) {
          if (a.type === 'UPDATE_CHECKIN') nextCheckIn = { ...nextCheckIn, ...a.patch };
          if (a.type === 'SET_GRAVITY') nextMission = { ...nextMission, gravity: a.gravity };
          if (a.type === 'UPDATE_MISSION') nextMission = { ...nextMission, ...a.patch };
          if (a.type === 'SWITCH_VIEW') nextView = a.view;
        }
        const localLabels = runActions(local);
        const vitalsNow = computeVitals(DEFAULT_OPTICAL, DEFAULT_VOICE, nextCheckIn, state.measuredBpm);

        setThinking(true);
        let reply = 'I lost the connection for a second. Can you say that again?';
        let labels = localLabels;
        try {
          const res = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              message: text,
              history,
              image: captureFrame(),
              context: {
                vitals: vitalsNow,
                checkIn: nextCheckIn,
                mission: nextMission,
                view: nextView,
                cameraOn: state.cameraOn,
                micOn: state.micOn,
              },
            }),
          });
          if (!res.ok) throw new Error(String(res.status));
          const data = (await res.json()) as { reply?: string; actions?: Action[]; online?: boolean };
          const localTypes = new Set(local.map((a) => a.type));
          const extra = (Array.isArray(data.actions) ? data.actions : []).filter((a) => !localTypes.has(a.type));
          labels = [...localLabels, ...runActions(extra)];
          if (data.reply) reply = data.reply;
          setOnline(Boolean(data.online));
        } catch {
          setOnline(false);
        }

        setMessages((prev) => [
          ...prev,
          { id: uid(), role: 'assistant', text: reply, at: Date.now(), actions: labels.length ? labels : undefined },
        ]);
        if (live.current.inCall && live.current.speakerOn) say(reply);
      } finally {
        setThinking(false);
        busy.current = false;
      }
    },
    [runActions, captureFrame, say]
  );

  const sendRef = useRef(send);
  sendRef.current = send;

  const wantListen = inCall && micOn && !thinking && !speaking;

  useEffect(() => {
    if (!wantListen) {
      setListening(false);
      return;
    }
    const rec = createRecognizer();
    if (!rec) return;

    let active = true;
    let finalText = '';
    let restartTimer: number | undefined;
    rec.lang = 'en-US';
    rec.continuous = false;
    rec.interimResults = true;

    rec.onresult = (e) => {
      voiceErrors.current = 0;
      let partial = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const result = e.results[i];
        if (result.isFinal) finalText += result[0].transcript;
        else partial += result[0].transcript;
      }
      setInterim(`${finalText} ${partial}`.trim());
    };

    rec.onerror = (e) => {
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
        active = false;
        notify('Voice input is blocked. You can still type.');
        setMicOn(false);
      } else if (e.error !== 'no-speech' && e.error !== 'aborted') {
        voiceErrors.current += 1;
        if (voiceErrors.current >= 3) {
          active = false;
          notify('Voice recognition is unavailable right now. Try typing.');
        }
      }
    };

    rec.onend = () => {
      setListening(false);
      if (!active) return;
      const said = finalText.trim();
      if (said) {
        setInterim('');
        void sendRef.current(said);
      } else {
        setInterim('');
        restartTimer = window.setTimeout(() => setVoiceCycle((c) => c + 1), 250);
      }
    };

    try {
      rec.start();
      setListening(true);
    } catch {
      restartTimer = window.setTimeout(() => setVoiceCycle((c) => c + 1), 600);
    }

    return () => {
      active = false;
      window.clearTimeout(restartTimer);
      rec.onresult = null;
      rec.onerror = null;
      rec.onend = null;
      try {
        rec.abort();
      } catch {
        return;
      }
    };
  }, [wantListen, voiceCycle, notify]);

  const startCall = useCallback(() => {
    const now = Date.now();
    const greeting = GREETINGS[Math.floor(Math.random() * GREETINGS.length)];
    voiceErrors.current = 0;
    setCallStartedAt(now);
    setMicOn(true);
    setView('call');
    if (!createRecognizer()) notify('Voice input needs Chrome or Edge. You can type instead.');
    setMessages((prev) => [
      ...prev,
      { id: uid(), role: 'event', text: 'Call started', at: now },
      { id: uid(), role: 'assistant', text: greeting, at: now },
    ]);
    if (live.current.speakerOn) say(greeting);
  }, [notify, say]);

  const endCall = useCallback(() => {
    const duration = callStartedAt ? Date.now() - callStartedAt : 0;
    quiet();
    setInterim('');
    setMicOn(false);
    void setCamera(false);
    setCallStartedAt(null);
    setMessages((prev) => [
      ...prev,
      { id: uid(), role: 'event', text: `Call ended · ${formatDuration(duration)}`, at: Date.now() },
    ]);
  }, [callStartedAt, quiet, setCamera]);

  const toggleSpeaker = useCallback(() => {
    setSpeakerOn((on) => {
      if (on) quiet();
      return !on;
    });
  }, [quiet]);

  const clearChat = useCallback(() => {
    quiet();
    setMessages([welcome()]);
  }, [quiet]);

  const lastAssistant = useMemo(() => [...messages].reverse().find((m) => m.role === 'assistant'), [messages]);
  const lastUser = useMemo(() => [...messages].reverse().find((m) => m.role === 'user'), [messages]);

  const caption: { who: 'you' | 'kemetis'; text: string } | null = interim
    ? { who: 'you', text: interim }
    : speaking && lastAssistant
      ? { who: 'kemetis', text: lastAssistant.text }
      : thinking && lastUser
        ? { who: 'you', text: lastUser.text }
        : null;

  const voiceState: VoiceState = speaking
    ? 'speaking'
    : thinking
      ? 'thinking'
      : !micOn
        ? 'muted'
        : listening
          ? 'listening'
          : 'idle';

  return (
    <div className="min-h-screen bg-black text-white">
      <Header view={view} onView={setView} callStartedAt={callStartedAt} online={online} />

      <main className="mx-auto w-full max-w-[1440px] px-4 pt-4 pb-6 sm:px-6 sm:pt-5">
        <AnimatePresence mode="wait" initial={false}>
          {view === 'call' ? (
            <motion.div
              key="call"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className="grid gap-4 lg:h-[max(560px,calc(100dvh-6.25rem))] lg:grid-cols-[minmax(0,1fr)_400px]">
                <CallStage
                  inCall={inCall}
                  startedAt={callStartedAt}
                  cameraOn={cameraOn}
                  micOn={micOn}
                  speakerOn={speakerOn}
                  voiceState={voiceState}
                  micLevel={micLevel}
                  caption={caption}
                  vitals={vitals}
                  pulse={pulse}
                  attachVideo={attachVideo}
                  onStart={startCall}
                  onEnd={endCall}
                  onToggleMic={() => setMicOn((on) => !on)}
                  onToggleCamera={() => void setCamera(!cameraOn)}
                  onToggleSpeaker={toggleSpeaker}
                />
                <div className="h-[72dvh] min-h-[560px] lg:h-full lg:min-h-0">
                  <ChatPanel
                    messages={messages}
                    thinking={thinking}
                    online={online}
                    cameraOn={cameraOn}
                    interim={interim}
                    onSend={send}
                    onClear={clearChat}
                  />
                </div>
              </div>

              <CheckInSection
                checkIn={checkIn}
                vitals={vitals}
                onChange={(patch) => setCheckIn((prev) => ({ ...prev, ...patch }))}
                onAsk={(question) => {
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                  void send(question);
                }}
              />
            </motion.div>
          ) : (
            <motion.div
              key="lab"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
            >
              <Lab
                params={mission}
                output={missionOutput}
                onChange={(patch) => setMission((prev) => ({ ...prev, ...patch }))}
                onReset={() => setMission(DEFAULT_MISSION)}
                onDiscuss={() => {
                  setView('call');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                  void send('Walk me through the biggest risks of this mission.');
                }}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <AnimatePresence>
        {toast && (
          <motion.div
            role="status"
            initial={{ opacity: 0, y: 16, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: 16, x: '-50%' }}
            transition={{ type: 'spring', stiffness: 420, damping: 32 }}
            className="fixed bottom-6 left-1/2 z-50 rounded-full border border-white/10 bg-[#0d0d0d] px-4 py-2.5 text-[13px] text-white/85 shadow-[0_10px_40px_rgba(0,0,0,0.85)] backdrop-blur-md"
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
