import React, { useRef } from 'react';
import { motion, useScroll, useSpring, useTransform, type HTMLMotionProps } from 'motion/react';

export function Logo({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <circle cx="12" cy="12" r="9.25" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M4.5 12.5h3.2l1.9-4.2 3.3 8 2-4.6h4.6"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const spring = { type: 'spring', stiffness: 520, damping: 28 } as const;

interface RoundButtonProps extends Omit<HTMLMotionProps<'button'>, 'children'> {
  label: string;
  tone?: 'default' | 'inverted' | 'danger' | 'go';
  size?: 'md' | 'lg';
  halo?: number;
  children: React.ReactNode;
}

const tones: Record<NonNullable<RoundButtonProps['tone']>, string> = {
  default: 'bg-white/[0.07] text-white hover:bg-white/[0.14] border border-white/[0.08]',
  inverted: 'bg-white text-black hover:bg-white/90 border border-white',
  danger: 'bg-[#ff3b30] text-white hover:bg-[#ff5147] border border-[#ff3b30]',
  go: 'bg-[#30d158] text-black hover:bg-[#45dd6a] border border-[#30d158]',
};

export function RoundButton({
  label,
  tone = 'default',
  size = 'md',
  halo = 0,
  className = '',
  children,
  ...rest
}: RoundButtonProps) {
  const dims = size === 'lg' ? 'h-12 w-16 sm:h-[52px] sm:w-[72px]' : 'h-11 w-11 sm:h-[48px] sm:w-[48px]';
  return (
    <motion.button
      type="button"
      aria-label={label}
      whileHover={{ scale: 1.07, y: -1 }}
      whileTap={{ scale: 0.9 }}
      transition={spring}
      style={
        halo > 0.03
          ? { boxShadow: `0 0 0 ${Math.round(halo * 8)}px rgba(255,255,255,${(0.08 + halo * 0.14).toFixed(3)})` }
          : undefined
      }
      className={`group relative flex items-center justify-center rounded-full transition-colors duration-200 outline-none focus-visible:ring-2 focus-visible:ring-white/60 ${dims} ${tones[tone]} ${className}`}
      {...rest}
    >
      {children}
      <span className="pointer-events-none absolute -top-9 left-1/2 -translate-x-1/2 translate-y-1 whitespace-nowrap rounded-md bg-white px-2 py-1 text-[11px] font-medium text-black opacity-0 transition-all duration-150 group-hover:translate-y-0 group-hover:opacity-100">
        {label}
      </span>
    </motion.button>
  );
}

export function PressButton({ className = '', children, ...rest }: HTMLMotionProps<'button'>) {
  return (
    <motion.button
      type="button"
      whileHover={{ scale: 1.025, y: -1 }}
      whileTap={{ scale: 0.96 }}
      transition={spring}
      className={`outline-none focus-visible:ring-2 focus-visible:ring-white/60 ${className}`}
      {...rest}
    >
      {children}
    </motion.button>
  );
}

export function SpotlightCard({
  className = '',
  children,
  ...rest
}: HTMLMotionProps<'div'>) {
  const ref = useRef<HTMLDivElement>(null);

  const handleMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    el.style.setProperty('--mx', `${e.clientX - rect.left}px`);
    el.style.setProperty('--my', `${e.clientY - rect.top}px`);
  };

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMove}
      className={`spotlight-card border border-white/[0.08] bg-[#050505] transition-colors duration-200 hover:border-white/[0.18] ${className}`}
      {...rest}
    >
      {children}
    </motion.div>
  );
}

export function ScrollCanvasFrame({
  className = '',
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start 0.98', 'start 0.62'],
  });
  const smooth = useSpring(scrollYProgress, { stiffness: 220, damping: 30, restDelta: 0.001 });
  const scale = useTransform(smooth, [0, 1], [0.94, 1]);
  const y = useTransform(smooth, [0, 1], [44, 0]);
  const opacity = useTransform(smooth, [0, 1], [0.35, 1]);
  const radius = useTransform(smooth, [0, 1], [36, 28]);

  return (
    <div ref={ref} className={className}>
      <motion.div style={{ scale, y, opacity, borderRadius: radius }}>
        {children}
      </motion.div>
    </div>
  );
}

export function ParallaxTrack({
  distance = 28,
  className = '',
  children,
}: {
  distance?: number;
  className?: string;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start'],
  });
  const smooth = useSpring(scrollYProgress, { stiffness: 160, damping: 28 });
  const x = useTransform(smooth, [0, 1], [-distance, distance]);

  return (
    <div ref={ref} className="overflow-hidden">
      <motion.div style={{ x }} className={className}>
        {children}
      </motion.div>
    </div>
  );
}

export function StatusDot({ status }: { status: 'Nominal' | 'Advisory' | 'Critical' }) {
  const color = status === 'Nominal' ? 'bg-[#30d158]' : status === 'Advisory' ? 'bg-[#ffd60a]' : 'bg-[#ff3b30]';
  return <span className={`inline-block h-1.5 w-1.5 rounded-full ${color}`} />;
}
