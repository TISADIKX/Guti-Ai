import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ShieldCheck, Key, Lock, AlertCircle, CheckCircle2, UserCheck } from 'lucide-react';
import { UserProfile, isUsdproDiscordAccount } from '../types';

interface AdminLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (passkey: string) => void;
  currentEmail?: string;
  currentUser?: UserProfile | null;
}

export const AdminLoginModal: React.FC<AdminLoginModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  currentEmail,
  currentUser,
}) => {
  const [passkey, setPasskey] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Security guard: Only the USDPRO1 Discord account can access this modal
  if (!isOpen || (currentUser && !isUsdproDiscordAccount(currentUser))) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const res = await fetch('/api/admin/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          passkey: passkey.trim(),
          email: currentEmail,
        }),
      });

      const data = await res.json();
      if (res.ok && data.valid) {
        setSuccessMsg('Admin access granted!');
        setTimeout(() => {
          onSuccess(passkey.trim());
          onClose();
        }, 500);
      } else {
        setError(data.message || 'Incorrect admin passkey. Please try again.');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to verify admin credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AnimatePresence>
      <div
        id="admin-login-backdrop"
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 12 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 relative overflow-hidden"
        >
          {/* Top ambient glow */}
          <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-48 h-48 bg-indigo-500/20 blur-3xl pointer-events-none rounded-full" />

          {/* Close button */}
          <button
            id="close-admin-login-modal"
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Header */}
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white tracking-tight">Admin Authentication</h3>
              <p className="text-xs text-slate-400">
                Only administrators can upload and manage mods.
              </p>
            </div>
          </div>

          {/* Verified Discord Account info */}
          <div className="mb-4 p-3 rounded-xl bg-indigo-950/40 border border-indigo-500/30 text-xs text-slate-300 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="text-slate-300">Authorized Discord Account:</span>
            </div>
            <span className="font-mono text-emerald-300 font-bold">@{currentUser?.discordUsername || 'USDPRO1'}</span>
          </div>

          {error && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center gap-2.5 text-xs text-rose-300"
            >
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{error}</span>
            </motion.div>
          )}

          {successMsg && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-2.5 text-xs text-emerald-300"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{successMsg}</span>
            </motion.div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="admin-passkey-input"
                className="block text-xs font-semibold text-slate-300 mb-1.5"
              >
                Admin Passkey
              </label>
              <div className="relative">
                <input
                  id="admin-passkey-input"
                  type="password"
                  value={passkey}
                  onChange={(e) => setPasskey(e.target.value)}
                  placeholder="Enter administrator passkey..."
                  required
                  autoFocus
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all font-mono"
                />
                <Key className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
              <p className="mt-1.5 text-[11px] text-slate-500">
                Only the platform owner can access the upload & management panel.
              </p>
            </div>

            <div className="pt-2 flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                id="submit-admin-passkey-btn"
                type="submit"
                disabled={isLoading || !passkey.trim()}
                className="flex-1 py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center justify-center gap-2 transition-colors disabled:opacity-50 cursor-pointer shadow-lg shadow-indigo-600/20"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>{isLoading ? 'Verifying...' : 'Unlock Admin Mode'}</span>
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
