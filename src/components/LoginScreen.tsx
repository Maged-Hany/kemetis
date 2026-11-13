import React, { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowRight, Eye, EyeOff, Lock, User } from 'lucide-react';
import { Logo, SpotlightCard } from './ui';

interface LoginScreenProps {
  onSuccess: () => void;
}

const VALID_USER = 'KemetisForLife';
const VALID_PASS = 'Kemet2211';

export function LoginScreen({ onSuccess }: LoginScreenProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shakeKey, setShakeKey] = useState(0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (username.trim() === VALID_USER && password === VALID_PASS) {
      setError(null);
      onSuccess();
      return;
    }
    setError('Invalid username or password.');
    setShakeKey((k) => k + 1);
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-black px-4 py-12 text-white">
      <div className="canvas-grid pointer-events-none absolute inset-0 opacity-65" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_35%,rgba(255,255,255,0.05),transparent_55%)]" />

      <motion.div
        key={shakeKey}
        initial={{ opacity: 0, y: 18, scale: 0.96 }}
        animate={{
          opacity: 1,
          y: 0,
          scale: 1,
          x: error ? [0, -8, 8, -5, 5, 0] : 0,
        }}
        transition={{ duration: 0.36, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 w-full max-w-[400px]"
      >
        <SpotlightCard className="rounded-[28px] p-7 shadow-[0_24px_80px_rgba(0,0,0,0.9)] sm:p-8">
          <div className="flex flex-col items-center text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/[0.1] bg-[#0a0a0a]">
              <Logo className="h-6 w-6 text-white" />
            </div>
            <h1 className="mt-4 text-[21px] font-semibold tracking-[-0.025em] text-white">kemetis</h1>
            <p className="mt-1 text-[13px] text-white/45">Sign in to access telemetry &amp; flight surgeon</p>
          </div>

          <form onSubmit={handleSubmit} className="mt-7 space-y-4">
            <div>
              <label htmlFor="kemetis-user" className="block text-[11px] font-medium uppercase tracking-[0.12em] text-white/45">
                Username
              </label>
              <div className="mt-1.5 flex items-center gap-2.5 rounded-2xl border border-white/[0.09] bg-[#0a0a0c] px-3.5 py-2.5 transition-colors focus-within:border-white/30">
                <User className="h-4 w-4 shrink-0 text-white/35" />
                <input
                  id="kemetis-user"
                  type="text"
                  autoComplete="username"
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value);
                    if (error) setError(null);
                  }}
                  placeholder="Enter username"
                  className="w-full bg-transparent text-[14px] text-white placeholder:text-white/25 outline-none"
                />
              </div>
            </div>

            <div>
              <label htmlFor="kemetis-pass" className="block text-[11px] font-medium uppercase tracking-[0.12em] text-white/45">
                Password
              </label>
              <div className="mt-1.5 flex items-center gap-2.5 rounded-2xl border border-white/[0.09] bg-[#0a0a0c] px-3.5 py-2.5 transition-colors focus-within:border-white/30">
                <Lock className="h-4 w-4 shrink-0 text-white/35" />
                <input
                  id="kemetis-pass"
                  type={showPass ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (error) setError(null);
                  }}
                  placeholder="Enter password"
                  className="w-full bg-transparent text-[14px] text-white placeholder:text-white/25 outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPass((v) => !v)}
                  aria-label={showPass ? 'Hide password' : 'Show password'}
                  className="text-white/35 transition-colors hover:text-white/75"
                >
                  {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden text-center text-[12px] text-[#ff453a]"
                >
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            <motion.button
              type="submit"
              whileHover={{ scale: 1.015 }}
              whileTap={{ scale: 0.97 }}
              transition={{ type: 'spring', stiffness: 520, damping: 28 }}
              className="group mt-2 flex w-full items-center justify-center gap-2 rounded-2xl bg-white py-3 text-[14px] font-semibold text-black transition-colors hover:bg-white/90"
            >
              Sign in
              <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
            </motion.button>
          </form>
        </SpotlightCard>
      </motion.div>
    </div>
  );
}
