import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, Rocket, X, Zap, Compass, RotateCcw } from 'lucide-react';

interface LaunchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LaunchModal: React.FC<LaunchModalProps> = ({ isOpen, onClose }) => {
  const [step, setStep] = useState(1);

  useEffect(() => {
    if (isOpen) {
      setStep(1);
      const t1 = setTimeout(() => setStep(2), 500);
      const t2 = setTimeout(() => setStep(3), 1100);
      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
      };
    }
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div id="launch-modal-backdrop" className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            id="launch-modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm"
          />

          <motion.div
            id="launch-modal-card"
            initial={{ opacity: 0, scale: 0.94, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 15 }}
            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            className="relative z-10 w-full max-w-md bg-slate-900 rounded-2xl p-6 md:p-8 shadow-2xl border border-slate-800 text-white overflow-hidden"
          >
            {/* Top decorative accent bar */}
            <div id="launch-modal-accent" className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-600 via-purple-500 to-indigo-600" />

            <button
              id="launch-modal-close-btn"
              type="button"
              onClick={onClose}
              className="absolute top-4 right-4 p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div id="launch-modal-header" className="flex items-center gap-3 mb-5">
              <div id="launch-modal-icon-badge" className="w-12 h-12 rounded-xl bg-indigo-950/70 border border-indigo-800/60 text-indigo-400 flex items-center justify-center">
                <Rocket className="w-6 h-6" />
              </div>
              <div>
                <h3 id="launch-modal-title" className="font-display text-xl font-bold text-white">
                  Journey Commenced
                </h3>
                <p id="launch-modal-subtitle" className="text-xs text-slate-400">
                  All systems configured and ready to go
                </p>
              </div>
            </div>

            {/* Launch Checklist */}
            <div id="launch-checklist" className="space-y-3 my-6 bg-slate-950/80 p-4 rounded-xl border border-slate-800/80">
              <div id="checklist-item-1" className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 text-slate-200 font-medium">
                  <Compass className="w-4 h-4 text-indigo-400" />
                  Navigation environment
                </span>
                {step >= 1 ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 animate-in fade-in duration-300" />
                ) : (
                  <span className="w-3 h-3 rounded-full border-2 border-slate-700 border-t-indigo-500 animate-spin" />
                )}
              </div>

              <div id="checklist-item-2" className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 text-slate-200 font-medium">
                  <Zap className="w-4 h-4 text-amber-400" />
                  High-speed engine
                </span>
                {step >= 2 ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 animate-in fade-in duration-300" />
                ) : (
                  <span className="w-3 h-3 rounded-full border-2 border-slate-700 border-t-indigo-500 animate-spin" />
                )}
              </div>

              <div id="checklist-item-3" className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 text-slate-200 font-medium">
                  <Rocket className="w-4 h-4 text-emerald-400" />
                  Experience launched
                </span>
                {step >= 3 ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 animate-in fade-in duration-300" />
                ) : (
                  <span className="w-3 h-3 rounded-full border-2 border-slate-700 border-t-indigo-500 animate-spin" />
                )}
              </div>
            </div>

            <p id="launch-modal-description" className="text-sm text-slate-400 leading-relaxed mb-6">
              Welcome aboard! Your session is now live with real-time responsiveness and clean architecture.
            </p>

            <div id="launch-modal-actions" className="flex gap-3">
              <button
                id="launch-modal-continue-btn"
                type="button"
                onClick={onClose}
                className="flex-1 py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm transition-colors text-center shadow-lg shadow-indigo-600/30"
              >
                Continue Exploring
              </button>
              <button
                id="launch-modal-replay-btn"
                type="button"
                onClick={() => {
                  setStep(1);
                  setTimeout(() => setStep(2), 400);
                  setTimeout(() => setStep(3), 900);
                }}
                className="p-3 rounded-xl border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                title="Replay sequence"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
