import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  KeyRound,
} from 'lucide-react';
import { UserProfile } from '../types';

export const DiscordIcon: React.FC<{ className?: string }> = ({ className = 'w-5 h-5' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.929 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.893.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
  </svg>
);

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: UserProfile) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onSuccess }) => {
  // Navigation tabs: 'email' or 'discord'
  const [activeTab, setActiveTab] = useState<'email' | 'discord'>('email');

  // Email form mode: 'login' or 'signup' or 'reset'
  const [authMode, setAuthMode] = useState<'login' | 'signup' | 'reset'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  // Discord Flow States
  const [discordConfigured, setDiscordConfigured] = useState<boolean | null>(null);
  const [discordAuthUrl, setDiscordAuthUrl] = useState<string | null>(null);
  const [discordError, setDiscordError] = useState<string | null>(null);
  const [discordLoading, setDiscordLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setError(null);
      setSuccessNotice(null);
      fetchDiscordUrl();
    }
  }, [isOpen]);

  const fetchDiscordUrl = async () => {
    try {
      const res = await fetch(
        `/api/auth/discord/url?redirect_uri=${encodeURIComponent(window.location.origin + '/auth/callback')}`
      );
      const data = await res.json();
      setDiscordConfigured(Boolean(data.configured));
      if (data.url) setDiscordAuthUrl(data.url);
    } catch {
      setDiscordConfigured(false);
    }
  };

  // Direct login or signup without OTP
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessNotice(null);

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@') || !cleanEmail.includes('.')) {
      setError('Please enter a valid email address.');
      return;
    }

    if (authMode === 'reset') {
      if (!newPassword || newPassword.length < 4) {
        setError('New password must be at least 4 characters.');
        return;
      }
      setIsSubmitting(true);
      try {
        const res = await fetch('/api/auth/email/reset-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: cleanEmail, newPassword }),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || 'Failed to update password.');
          setIsSubmitting(false);
          return;
        }
        setSuccessNotice('Password updated successfully! Logging you in...');
        setTimeout(() => {
          onSuccess(data.user);
          onClose();
        }, 800);
      } catch (err: any) {
        setError(err.message || 'Network error.');
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    if (!password || password.length < 4) {
      setError('Password must be at least 4 characters.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/auth/email/direct-auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: cleanEmail,
          password,
          isSignUp: authMode === 'signup',
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Authentication failed.');
        setIsSubmitting(false);
        return;
      }

      setSuccessNotice('Welcome back! Logging you in...');
      setTimeout(() => {
        onSuccess(data.user);
        onClose();
      }, 500);
    } catch (err: any) {
      setError(err.message || 'Network error during login.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStartDiscordOAuth = async () => {
    setDiscordError(null);
    setDiscordLoading(true);

    try {
      let authUrl = discordAuthUrl;
      if (!authUrl) {
        const res = await fetch(
          `/api/auth/discord/url?redirect_uri=${encodeURIComponent(window.location.origin + '/auth/callback')}`
        );
        const data = await res.json();
        if (!data.configured || !data.url) {
          setDiscordError('Discord OAuth is not configured in environment variables.');
          setDiscordLoading(false);
          return;
        }
        authUrl = data.url;
        setDiscordAuthUrl(authUrl);
      }

      const width = 500;
      const height = 750;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2;

      const popup = window.open(
        authUrl!,
        'discord_oauth_popup',
        `width=${width},height=${height},left=${left},top=${top},status=no,menubar=no,toolbar=no`
      );

      if (!popup) {
        setDiscordError('Pop-up blocked by browser. Please allow popups for this site.');
        setDiscordLoading(false);
        return;
      }

      const messageListener = (event: MessageEvent) => {
        if (event.origin !== window.location.origin) return;
        if (event.data?.type === 'DISCORD_AUTH_SUCCESS' && event.data?.user) {
          window.removeEventListener('message', messageListener);
          popup.close();
          setDiscordLoading(false);
          onSuccess(event.data.user);
          onClose();
        } else if (event.data?.type === 'DISCORD_AUTH_ERROR') {
          window.removeEventListener('message', messageListener);
          popup.close();
          setDiscordLoading(false);
          setDiscordError(event.data.error || 'Discord authentication failed.');
        }
      };

      window.addEventListener('message', messageListener);

      const checkPopupClosed = setInterval(() => {
        if (popup.closed) {
          clearInterval(checkPopupClosed);
          window.removeEventListener('message', messageListener);
          setDiscordLoading(false);
        }
      }, 800);
    } catch (err: any) {
      setDiscordError(err.message || 'Failed to initiate Discord OAuth flow.');
      setDiscordLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div id="auth-modal-backdrop" className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop blur */}
        <motion.div
          id="auth-modal-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-slate-950/70 backdrop-blur-md"
        />

        {/* Modal Card */}
        <motion.div
          id="auth-modal-card"
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ type: 'spring', damping: 25, stiffness: 350 }}
          className="relative z-10 w-full max-w-md bg-slate-900 rounded-2xl p-6 sm:p-7 shadow-2xl border border-slate-800 text-white overflow-hidden"
        >
          {/* Top subtle gradient line */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-500" />

          {/* Close button */}
          <button
            id="auth-modal-close-btn"
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Header */}
          <div className="text-center mb-5">
            <div className="inline-flex items-center justify-center w-11 h-11 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 mb-2.5">
              <Sparkles className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-bold font-display text-white tracking-tight">
              {authMode === 'reset'
                ? 'Reset Password'
                : authMode === 'signup'
                ? 'Create gutiai Account'
                : 'Log in to gutiai'}
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              {authMode === 'reset'
                ? 'Enter your email and set a new password'
                : 'Access your creative studio and AI generations'}
            </p>
          </div>

          {/* Tab Selector (Email vs Discord) */}
          <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-950/90 rounded-xl border border-slate-800 mb-5 text-xs font-semibold">
            <button
              id="tab-email-auth"
              type="button"
              onClick={() => setActiveTab('email')}
              className={`flex items-center justify-center gap-2 py-2 rounded-lg transition-all cursor-pointer ${
                activeTab === 'email'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30 font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Mail className="w-4 h-4" />
              <span>Email</span>
            </button>
            <button
              id="tab-discord-auth"
              type="button"
              onClick={() => setActiveTab('discord')}
              className={`flex items-center justify-center gap-2 py-2 rounded-lg transition-all cursor-pointer ${
                activeTab === 'discord'
                  ? 'bg-[#5865F2] text-white shadow-md shadow-[#5865F2]/30 font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <DiscordIcon className="w-4 h-4" />
              <span>Discord</span>
            </button>
          </div>

          {/* TAB 1: EMAIL AUTHENTICATION */}
          {activeTab === 'email' && (
            <div>
              {/* Login / Sign Up Sub-toggle */}
              {authMode !== 'reset' && (
                <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setAuthMode('login');
                        setError(null);
                      }}
                      className={`text-xs font-semibold px-2.5 py-1 rounded-md transition-colors ${
                        authMode === 'login'
                          ? 'text-white bg-slate-800'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      Log In
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setAuthMode('signup');
                        setError(null);
                      }}
                      className={`text-xs font-semibold px-2.5 py-1 rounded-md transition-colors ${
                        authMode === 'signup'
                          ? 'text-white bg-slate-800'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      Sign Up
                    </button>
                  </div>
                </div>
              )}

              {error && (
                <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex flex-col gap-2">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
                    <span>{error}</span>
                  </div>
                  {error.includes('Incorrect password') && (
                    <button
                      type="button"
                      onClick={() => {
                        setAuthMode('reset');
                        setError(null);
                      }}
                      className="self-start text-[11px] font-semibold text-indigo-300 hover:text-indigo-200 underline cursor-pointer"
                    >
                      Click here to reset your password now
                    </button>
                  )}
                </div>
              )}

              {successNotice && (
                <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                  <span>{successNotice}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Email Input */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Email Address
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                      <Mail className="w-4 h-4" />
                    </div>
                    <input
                      id="email-input-field"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@example.com"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 transition-colors"
                    />
                  </div>
                </div>

                {/* Password Input (for Login / Signup) */}
                {authMode !== 'reset' ? (
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-semibold text-slate-300">
                        Password
                      </label>
                      {authMode === 'login' && (
                        <button
                          type="button"
                          onClick={() => {
                            setAuthMode('reset');
                            setError(null);
                          }}
                          className="text-[11px] text-indigo-400 hover:text-indigo-300 hover:underline cursor-pointer"
                        >
                          Forgot password?
                        </button>
                      )}
                    </div>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                        <Lock className="w-4 h-4" />
                      </div>
                      <input
                        id="password-input-field"
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 transition-colors"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-300 cursor-pointer"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-semibold text-slate-300">
                        New Password
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setAuthMode('login');
                          setError(null);
                        }}
                        className="text-[11px] text-slate-400 hover:text-slate-200 cursor-pointer"
                      >
                        Back to Login
                      </button>
                    </div>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                        <KeyRound className="w-4 h-4" />
                      </div>
                      <input
                        id="new-password-input-field"
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Enter new password (min 4 chars)"
                        className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 transition-colors"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-300 cursor-pointer"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                )}

                {/* Submit Action */}
                <button
                  id="btn-auth-submit"
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white text-xs font-bold transition-all shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                >
                  {isSubmitting ? (
                    <span>Processing...</span>
                  ) : authMode === 'reset' ? (
                    <>
                      <span>Save New Password & Log In</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  ) : authMode === 'signup' ? (
                    <>
                      <span>Create Account & Log In</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  ) : (
                    <>
                      <span>Log In</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            </div>
          )}

          {/* TAB 2: DISCORD AUTHENTICATION */}
          {activeTab === 'discord' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-base font-bold text-white tracking-tight">
                  Login with Discord
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Authenticate your identity instantly using your Discord account.
                </p>
              </div>

              {discordError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
                  <span>{discordError}</span>
                </div>
              )}

              <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 text-center space-y-3">
                <div className="w-12 h-12 mx-auto rounded-2xl bg-[#5865F2]/20 border border-[#5865F2]/40 flex items-center justify-center text-[#5865F2]">
                  <DiscordIcon className="w-7 h-7" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-white">Official Discord OAuth2</h4>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Opens Discord authorization in a secure popup window
                  </p>
                </div>

                <button
                  id="btn-discord-oauth-trigger"
                  type="button"
                  onClick={handleStartDiscordOAuth}
                  disabled={discordLoading || !discordConfigured}
                  className="w-full py-2.5 rounded-xl bg-[#5865F2] hover:bg-[#4752C4] active:bg-[#3C45A5] text-white text-xs font-bold transition-all shadow-lg shadow-[#5865F2]/30 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <DiscordIcon className="w-4 h-4" />
                  <span>{discordLoading ? 'Connecting to Discord...' : 'Login with Discord'}</span>
                </button>
              </div>

              {!discordConfigured && (
                <p className="text-[11px] text-slate-500 text-center">
                  Discord OAuth credentials can be set via DISCORD_CLIENT_ID and DISCORD_CLIENT_SECRET.
                </p>
              )}
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
