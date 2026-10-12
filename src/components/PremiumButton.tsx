import React from 'react';
import { motion } from 'motion/react';
import { ArrowRight, Sparkles } from 'lucide-react';

interface PremiumButtonProps {
  id?: string;
  onClick?: () => void;
  label?: string;
}

export const PremiumButton: React.FC<PremiumButtonProps> = ({
  id = 'get-started-button',
  onClick,
  label = 'Get Started',
}) => {
  return (
    <div id={`${id}-wrapper`} className="relative inline-flex items-center justify-center group">
      {/* Outer ambient glow pulse */}
      <div
        id={`${id}-glow`}
        className="absolute -inset-1.5 bg-gradient-to-r from-indigo-600/40 via-purple-600/30 to-indigo-600/40 rounded-2xl blur-xl opacity-50 group-hover:opacity-80 transition duration-700 group-hover:duration-300 animate-pulse-glow"
      />

      {/* Outer gradient border layer */}
      <div
        id={`${id}-border-ring`}
        className="absolute -inset-0.5 bg-gradient-to-r from-slate-700 via-indigo-500/70 to-slate-700 rounded-2xl opacity-70 group-hover:opacity-100 transition duration-300"
      />

      {/* Main motion button */}
      <motion.button
        id={id}
        type="button"
        onClick={onClick}
        whileHover={{ scale: 1.03, y: -1 }}
        whileTap={{ scale: 0.97, y: 1 }}
        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
        className="relative z-10 flex items-center gap-3 px-8 py-4 bg-gradient-to-b from-slate-900 to-slate-950 text-white rounded-[14px] font-semibold text-base md:text-lg tracking-tight border border-slate-700/80 shadow-[0_12px_28px_-6px_rgba(0,0,0,0.8),0_0_24px_rgba(99,102,241,0.2)] overflow-hidden cursor-pointer select-none transition-all duration-300 group-hover:border-indigo-400/80 group-hover:shadow-[0_16px_36px_-6px_rgba(0,0,0,0.9),0_0_32px_rgba(99,102,241,0.35)]"
      >
        {/* Subtle specular sheen sweep effect */}
        <div
          id={`${id}-sheen`}
          className="absolute inset-0 w-1/2 h-full bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none animate-sheen"
        />

        {/* Top subtle highlight line for physical depth */}
        <div
          id={`${id}-top-highlight`}
          className="absolute top-0 left-3 right-3 h-[1px] bg-gradient-to-r from-transparent via-white/30 to-transparent"
        />

        <Sparkles
          id={`${id}-sparkle-icon`}
          className="w-4 h-4 text-indigo-300 opacity-90 transition-transform duration-300 group-hover:rotate-12 group-hover:scale-110"
        />

        <span id={`${id}-text`} className="font-display font-medium text-white tracking-normal">
          {label}
        </span>

        <div
          id={`${id}-icon-container`}
          className="flex items-center justify-center w-6 h-6 rounded-full bg-white/10 text-white transition-all duration-300 group-hover:bg-indigo-500/40 group-hover:translate-x-1"
        >
          <ArrowRight id={`${id}-arrow-icon`} className="w-3.5 h-3.5 stroke-[2.5]" />
        </div>
      </motion.button>
    </div>
  );
};
