import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowUp, Camera, Check, RotateCcw } from 'lucide-react';
import type { ChatMessage } from '../types/health';
import { Logo, PressButton, SpotlightCard } from './ui';

interface ChatPanelProps {
  messages: ChatMessage[];
  thinking: boolean;
  online: boolean | null;
  cameraOn: boolean;
  interim: string;
  onSend: (text: string) => void;
  onClear: () => void;
}

const SUGGESTIONS = ["How's my heart?", 'Explain mSv vs mGy', 'I just ate', 'Open the lab'];

function time(at: number) {
  return new Date(at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function ChatPanel({ messages, thinking, online, cameraOn, interim, onSend, onClear }: ChatPanelProps) {
  const [draft, setDraft] = useState('');
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
  }, [messages.length, thinking, interim]);

  useLayoutEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = '0px';
    el.style.height = `${Math.min(el.scrollHeight, 132)}px`;
  }, [draft]);

  const submit = (text = draft) => {
    const value = text.trim();
    if (!value || thinking) return;
    onSend(value);
    setDraft('');
  };

  const showSuggestions = messages.filter((m) => m.role === 'user').length === 0;

  return (
    <SpotlightCard className="h-full min-h-[560px] rounded-[28px]">
      <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-[28px]">
        <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-4">
          <div className="flex items-center gap-2.5">
            <div className="text-[15px] font-medium tracking-[-0.01em] text-white">Chat</div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.07] bg-white/[0.03] px-2 py-0.5 text-[10px] text-white/50">
              <span className={`h-1.5 w-1.5 rounded-full ${online === false ? 'bg-white/30' : 'bg-[#30d158]'}`} />
              {online === false ? 'Offline' : 'Ready'}
            </span>
          </div>
          <PressButton
            onClick={onClear}
            aria-label="Clear chat"
            title="Clear chat"
            className="group flex h-8 w-8 items-center justify-center rounded-full text-white/40 transition-colors hover:bg-white/[0.06] hover:text-white"
          >
            <RotateCcw className="h-3.5 w-3.5 transition-transform duration-300 group-hover:-rotate-90" />
          </PressButton>
        </div>

        <div ref={listRef} className="chat-scroll min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4" aria-live="polite">
          <AnimatePresence initial={false}>
            {messages.map((m) => {
              if (m.role === 'event') {
                return (
                  <motion.div
                    key={m.id}
                    layout
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex items-center gap-3 py-1 text-[11px] text-white/30"
                  >
                    <span className="h-px flex-1 bg-white/[0.06]" />
                    {m.text}
                    <span className="h-px flex-1 bg-white/[0.06]" />
                  </motion.div>
                );
              }
              if (m.role === 'user') {
                return (
                  <motion.div
                    key={m.id}
                    layout
                    initial={{ opacity: 0, y: 10, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ type: 'spring', stiffness: 440, damping: 32 }}
                    className="flex justify-end"
                  >
                    <div className="max-w-[84%]">
                      <div className="rounded-[20px] rounded-br-md bg-white px-4 py-2.5 text-[13.5px] leading-relaxed text-black">
                        {m.text}
                      </div>
                      <div className="mt-1 text-right font-mono text-[10px] text-white/25">{time(m.at)}</div>
                    </div>
                  </motion.div>
                );
              }
              return (
                <motion.div
                  key={m.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ type: 'spring', stiffness: 440, damping: 32 }}
                  className="flex gap-2.5"
                >
                  <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-white/[0.09] bg-[#0b0b0b]">
                    <Logo className="h-3.5 w-3.5 text-white/80" />
                  </div>
                  <div className="min-w-0 max-w-[86%]">
                    <div className="rounded-[20px] rounded-tl-md border border-white/[0.06] bg-[#0d0d0f] px-4 py-2.5 text-[13.5px] leading-relaxed text-white/90">
                      {m.text}
                    </div>
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                      {m.actions?.map((a) => (
                        <span
                          key={a}
                          className="inline-flex items-center gap-1 rounded-full border border-white/[0.08] bg-white/[0.03] px-2 py-0.5 text-[10px] text-white/55"
                        >
                          <Check className="h-2.5 w-2.5 text-[#30d158]" />
                          {a}
                        </span>
                      ))}
                      <span className="font-mono text-[10px] text-white/25">{time(m.at)}</span>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>

          <AnimatePresence>
            {interim && (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="flex justify-end"
              >
                <div className="max-w-[82%] rounded-[20px] rounded-br-md border border-white/15 bg-white/[0.06] px-4 py-2.5 text-[13.5px] leading-relaxed text-white/70">
                  {interim}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {thinking && (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-2.5"
              >
                <div className="flex h-7 w-7 items-center justify-center rounded-full border border-white/[0.09] bg-[#0b0b0b]">
                  <Logo className="h-3.5 w-3.5 text-white/80" />
                </div>
                <div className="flex gap-1 rounded-full border border-white/[0.06] bg-[#0d0d0f] px-3.5 py-3">
                  <span className="typing-dot" />
                  <span className="typing-dot" style={{ animationDelay: '0.15s' }} />
                  <span className="typing-dot" style={{ animationDelay: '0.3s' }} />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="px-4 pb-4 pt-2">
          <AnimatePresence>
            {showSuggestions && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-3 flex flex-wrap gap-1.5 overflow-hidden"
              >
                {SUGGESTIONS.map((s, i) => (
                  <motion.button
                    key={s}
                    type="button"
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0, transition: { delay: 0.04 * i } }}
                    whileHover={{ y: -2, borderColor: 'rgba(255,255,255,0.28)' }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => submit(s)}
                    className="rounded-full border border-white/10 bg-white/[0.02] px-3 py-1.5 text-[12px] text-white/70 transition-colors hover:text-white"
                  >
                    {s}
                  </motion.button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              submit();
            }}
            className="flex items-end gap-2 rounded-[22px] border border-white/[0.09] bg-[#0a0a0c] py-1.5 pl-3.5 pr-1.5 transition-colors duration-200 focus-within:border-white/25"
          >
            {cameraOn && (
              <motion.button
                type="button"
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.9 }}
                disabled={thinking}
                onClick={() => submit('Look at my camera frame and check how I look right now.')}
                title="Check camera frame"
                aria-label="Check camera frame"
                className="mb-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white/50 transition-colors hover:bg-white/[0.07] hover:text-white disabled:opacity-30"
              >
                <Camera className="h-4 w-4" />
              </motion.button>
            )}
            <label htmlFor="chat-input" className="sr-only">
              Message
            </label>
            <textarea
              id="chat-input"
              ref={inputRef}
              rows={1}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                  e.preventDefault();
                  submit();
                }
              }}
              placeholder="Message Kemetis"
              className="max-h-[132px] flex-1 resize-none bg-transparent py-2 text-[13.5px] leading-relaxed text-white placeholder:text-white/30 outline-none"
            />
            <motion.button
              type="submit"
              aria-label="Send"
              disabled={!draft.trim() || thinking}
              whileHover={draft.trim() && !thinking ? { scale: 1.06 } : undefined}
              whileTap={draft.trim() && !thinking ? { scale: 0.88 } : undefined}
              animate={{ scale: draft.trim() ? 1 : 0.94 }}
              transition={{ type: 'spring', stiffness: 520, damping: 28 }}
              className={`mb-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-colors duration-200 ${
                draft.trim() && !thinking ? 'bg-white text-black' : 'bg-white/[0.06] text-white/30'
              }`}
            >
              <ArrowUp className="h-4 w-4" strokeWidth={2.4} />
            </motion.button>
          </form>
        </div>
      </div>
    </SpotlightCard>
  );
}
