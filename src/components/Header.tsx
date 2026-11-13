import React from 'react';
import { AnimatePresence, motion, useScroll, useSpring } from 'motion/react';
import { LogOut } from 'lucide-react';
import type { View } from '../types/health';
import { Logo } from './ui';
import { formatDuration, useElapsed } from './CallStage';

interface HeaderProps {
  view: View;
  onView: (view: View) => void;
  callStartedAt: number | null;
  online: boolean | null;
  onLogout: () => void;
}

const TABS: Array<{ id: View; label: string }> = [
  { id: 'call', label: 'Call' },
  { id: 'lab', label: 'Lab' },
];

export function Header({ view, onView, callStartedAt, online, onLogout }: HeaderProps) {
  const elapsed = useElapsed(callStartedAt);
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 280, damping: 32, restDelta: 0.001 });

  return (
    <header className="sticky top-0 z-40 border-b border-white/[0.06] bg-black/80 backdrop-blur-xl">
      <motion.div
        style={{ scaleX }}
        className="pointer-events-none absolute inset-x-0 top-0 h-[1.5px] origin-left bg-white/80"
      />
      <div className="mx-auto flex h-16 w-full max-w-[1440px] items-center justify-between px-4 sm:px-6">
        <div className="flex flex-1">
          <motion.button
            type="button"
            onClick={() => {
              onView('call');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            whileHover={{ x: 1 }}
            whileTap={{ scale: 0.97 }}
            className="group flex items-center gap-2.5 text-white transition-opacity hover:opacity-85"
          >
            <Logo className="h-[22px] w-[22px] transition-transform duration-300 group-hover:rotate-12" />
            <span className="hidden text-[17px] font-semibold tracking-[-0.025em] sm:inline">kemetis</span>
          </motion.button>
        </div>

        <nav className="flex rounded-full border border-white/[0.08] bg-[#060606] p-1" aria-label="Views">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => {
                onView(t.id);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              aria-current={view === t.id ? 'page' : undefined}
              className={`relative rounded-full px-5 py-1.5 text-[13px] font-medium transition-colors ${
                view === t.id ? 'text-black' : 'text-white/55 hover:text-white'
              }`}
            >
              {view === t.id && (
                <motion.span
                  layoutId="nav-pill"
                  className="absolute inset-0 rounded-full bg-white"
                  transition={{ type: 'spring', stiffness: 520, damping: 36 }}
                />
              )}
              <span className="relative">{t.label}</span>
            </button>
          ))}
        </nav>

        <div className="flex flex-1 items-center justify-end gap-2">
          <AnimatePresence mode="wait">
            {callStartedAt && view !== 'call' ? (
              <motion.button
                key="live-pill"
                type="button"
                onClick={() => onView('call')}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.94 }}
                className="flex items-center gap-2 rounded-full bg-[#30d158] px-3 py-1.5 text-[12px] font-semibold text-black"
              >
                <span className="live-dot h-1.5 w-1.5 rounded-full bg-black" />
                <span className="font-mono tabular-nums">{formatDuration(elapsed)}</span>
              </motion.button>
            ) : (
              <motion.div
                key="status-pill"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="hidden items-center gap-1.5 rounded-full border border-white/[0.07] bg-[#060606] px-3 py-1.5 text-[11px] text-white/50 sm:flex"
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    online === false ? 'bg-white/30' : 'bg-[#30d158]'
                  }`}
                />
                {online === false ? 'Offline' : 'Live'}
              </motion.div>
            )}
          </AnimatePresence>

          <button
            type="button"
            onClick={onLogout}
            title="Sign out"
            aria-label="Sign out"
            className="flex h-8 w-8 items-center justify-center rounded-full border border-white/[0.07] bg-[#060606] text-white/45 transition-colors hover:border-white/20 hover:text-white"
          >
            <LogOut className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </header>
  );
}
