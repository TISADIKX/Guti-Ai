import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, AlertCircle, ExternalLink, Check, Copy } from 'lucide-react';
import { UserProfile } from '../types';

interface DiscordAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: UserProfile) => void;
}

export const DiscordIcon: React.FC<{ className?: string }> = ({ className = 'w-5 h-5' }) => (
  <svg
    className={className}
    viewBox="0 0 127.14 96.36"
    fill="currentColor"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M107.7,8.07A105.15,105.15,0,0,0,81.47,0a72.06,72.06,0,0,0-3.36,6.83A97.68,97.68,0,0,0,49,6.83,72.37,72.37,0,0,0,45.64,0,105.89,105.89,0,0,0,19.39,8.09C2.79,32.65-1.71,56.6.54,80.21h0A105.73,105.73,0,0,0,32.71,96.36,77.7,77.7,0,0,0,39.6,85.25a68.42,68.42,0,0,1-10.85-5.18c.91-.66,1.8-1.34,2.66-2a75.57,75.57,0,0,0,64.32,0c.87.71,1.76,1.39,2.66,2a68.68,68.68,0,0,1-10.87,5.19,77,77,0,0,0,6.89,11.1A105.25,105.25,0,0,0,126.6,80.22h0C129.24,52.84,122.09,29.11,107.7,8.07ZM42.45,65.69C36.18,65.69,31,60,31,53s5-12.74,11.43-12.74S54,45.91,53.89,53,48.84,65.69,42.45,65.69Zm42.24,0C78.41,65.69,73.25,60,73.25,53s5-12.74,11.44-12.74S96.23,45.91,96.12,53,91.08,65.69,84.69,65.69Z" />
  </svg>
);

export const DiscordAuthModal: React.FC<DiscordAuthModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showConfigGuide, setShowConfigGuide] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [authConfig, setAuthConfig] = useState<{
    configured: boolean;
    url?: string;
    redirectUri?: string;
    canonicalUrl?: string;
  } | null>(null);

  const fallbackRedirectUri =
    typeof window !== 'undefined' ? `${window.location.origin}/auth/callback` : '';
  const displayRedirectUri = authConfig?.redirectUri || fallbackRedirectUri;

  // Pre-fetch auth configuration whenever the modal is opened
  useEffect(() => {
    if (!isOpen) {
      setError(null);
      setIsLoading(false);
      return;
    }

    let isMounted = true;
    const fetchStatus = async () => {
      try {
        const clientRedirect = `${window.location.origin}/auth/callback`;
        const res = await fetch(`/api/auth/discord/url?redirect_uri=${encodeURIComponent(clientRedirect)}`);
        if (res.ok) {
          const data = await res.json();
          if (isMounted) {
            setAuthConfig(data);
            if (!data.configured) {
              setShowConfigGuide(true);
            }
          }
        }
      } catch (e) {
        console.error('Error prefetching auth status:', e);
      }
    };

    fetchStatus();

    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  // Multi-channel auth listener: message, BroadcastChannel, and localStorage polling
  useEffect(() => {
    if (!isOpen) return;

    const handleAuthSuccess = (user: UserProfile) => {
      // Clear storage flags
      try {
        localStorage.removeItem('discord_auth_success');
        localStorage.removeItem('discord_auth_error');
      } catch {}
      setIsLoading(false);
      onSuccess(user);
      onClose();
    };

    const handleAuthError = (errMsg: string) => {
      try {
        localStorage.removeItem('discord_auth_error');
      } catch {}
      setIsLoading(false);
      setError(errMsg || 'Discord authorization was rejected or failed.');
    };

    // 1. window.addEventListener('message')
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'DISCORD_AUTH_SUCCESS' && event.data.user) {
        handleAuthSuccess(event.data.user as UserProfile);
      } else if (event.data?.type === 'DISCORD_AUTH_ERROR') {
        handleAuthError(event.data.error);
      }
    };

    window.addEventListener('message', handleMessage);

    // 2. BroadcastChannel
    let bc: BroadcastChannel | null = null;
    try {
      if (typeof BroadcastChannel !== 'undefined') {
        bc = new BroadcastChannel('discord_auth_channel');
        bc.onmessage = (event) => {
          if (event.data?.type === 'DISCORD_AUTH_SUCCESS' && event.data.user) {
            handleAuthSuccess(event.data.user as UserProfile);
          } else if (event.data?.type === 'DISCORD_AUTH_ERROR') {
            handleAuthError(event.data.error);
          }
        };
      }
    } catch {}

    // 3. Storage event listener
    const handleStorage = (event: StorageEvent) => {
      if (event.key === 'discord_auth_success' && event.newValue) {
        try {
          const data = JSON.parse(event.newValue);
          if (data.user) handleAuthSuccess(data.user);
        } catch {}
      } else if (event.key === 'discord_auth_error' && event.newValue) {
        try {
          const data = JSON.parse(event.newValue);
          if (data.error) handleAuthError(data.error);
        } catch {}
      }
    };

    window.addEventListener('storage', handleStorage);

    // 4. Polling fallback while loading
    let pollInterval: ReturnType<typeof setInterval> | null = null;
    if (isLoading) {
      pollInterval = setInterval(() => {
        try {
          const successItem = localStorage.getItem('discord_auth_success');
          if (successItem) {
            const data = JSON.parse(successItem);
            if (data.user) {
              handleAuthSuccess(data.user);
              return;
            }
          }
          const errorItem = localStorage.getItem('discord_auth_error');
          if (errorItem) {
            const data = JSON.parse(errorItem);
            if (data.error) {
              handleAuthError(data.error);
              return;
            }
          }
        } catch {}
      }, 500);
    }

    return () => {
      window.removeEventListener('message', handleMessage);
      window.removeEventListener('storage', handleStorage);
      if (bc) bc.close();
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [isOpen, isLoading, onSuccess, onClose]);

  const handleDiscordOAuth = async () => {
    setIsLoading(true);
    setError(null);

    // Synchronously open popup on user gesture to avoid popup blockers
    let popupWindow: Window | null = null;
    try {
      popupWindow = window.open(
        'about:blank',
        'discord_oauth_popup',
        'width=580,height=720,scrollbars=yes,status=yes,resizable=yes'
      );
    } catch {
      // Popup blocked or not permitted
    }

    try {
      const redirectUri = `${window.location.origin}/auth/callback`;
      const res = await fetch(`/api/auth/discord/url?redirect_uri=${encodeURIComponent(redirectUri)}`);
      
      if (!res.ok) {
        throw new Error('Failed to retrieve Discord authorization URL from server.');
      }

      const data = await res.json() as {
        configured: boolean;
        url?: string;
        redirectUri?: string;
        message?: string;
      };

      setAuthConfig(data);

      if (!data.configured || !data.url) {
        if (popupWindow) popupWindow.close();
        setIsLoading(false);
        setError('Discord credentials are not configured yet. Set DISCORD_CLIENT_ID and DISCORD_CLIENT_SECRET to enable.');
        setShowConfigGuide(true);
        return;
      }

      // If popup opened successfully, navigate it to Discord
      if (popupWindow && !popupWindow.closed) {
        popupWindow.location.href = data.url;
      } else {
        // Fallback: try opening with URL directly
        const directPopup = window.open(
          data.url,
          'discord_oauth_popup',
          'width=580,height=720,scrollbars=yes,status=yes,resizable=yes'
        );
        if (!directPopup) {
          setIsLoading(false);
          setError('Browser popup was blocked. Please allow popups for this site, or try again.');
          return;
        }
      }

      // Check for popup closure periodically
      const closeChecker = setInterval(() => {
        if (popupWindow && popupWindow.closed) {
          clearInterval(closeChecker);
          // Allow short delay for localStorage to settle
          setTimeout(() => {
            setIsLoading(false);
          }, 600);
        }
      }, 700);

    } catch (err: unknown) {
      if (popupWindow) popupWindow.close();
      setIsLoading(false);
      const msg = err instanceof Error ? err.message : 'Error starting Discord login';
      setError(msg);
    }
  };

  const copyCallbackUrl = () => {
    navigator.clipboard.writeText(displayRedirectUri);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div id="discord-auth-modal-backdrop" className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop blur overlay */}
          <motion.div
            id="discord-auth-modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-950/75 backdrop-blur-md"
          />

          {/* Modal Container */}
          <motion.div
            id="discord-auth-modal-card"
            initial={{ opacity: 0, scale: 0.94, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 15 }}
            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            className="relative z-10 w-full max-w-md bg-[#0e1322] rounded-2xl p-6 sm:p-8 shadow-2xl border border-slate-800 text-slate-100 overflow-hidden"
          >
            {/* Ambient accent top bar in Discord Blurple */}
            <div
              id="discord-modal-accent"
              className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#5865F2] via-indigo-400 to-[#5865F2]"
            />

            {/* Close Button */}
            <button
              id="discord-modal-close-btn"
              type="button"
              onClick={onClose}
              className="absolute top-4 right-4 p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Header with Discord Icon */}
            <div id="discord-modal-header" className="mb-6 text-center">
              <div
                id="discord-modal-icon-badge"
                className="w-14 h-14 rounded-2xl bg-[#5865F2]/15 border border-[#5865F2]/40 mx-auto flex items-center justify-center mb-3 text-[#5865F2] shadow-[0_0_24px_rgba(88,101,242,0.25)]"
              >
                <DiscordIcon className="w-8 h-8 text-[#5865F2]" />
              </div>
              <h3 id="discord-modal-title" className="font-display text-2xl font-bold text-white tracking-tight">
                Log in with Discord
              </h3>
              <p id="discord-modal-subtitle" className="text-xs sm:text-sm text-slate-400 mt-1 max-w-xs mx-auto leading-relaxed">
                Log in with your Discord account to launch your journey and access your personalized workspace.
              </p>
            </div>

            {/* Error banner */}
            {error && (
              <div
                id="discord-auth-error"
                className="mb-4 px-3.5 py-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2.5"
              >
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
                <span className="flex-1">{error}</span>
              </div>
            )}

            {/* Main Action Button: Log in with Discord */}
            <div>
              <button
                id="btn-login-discord"
                type="button"
                onClick={handleDiscordOAuth}
                disabled={isLoading}
                className="w-full py-3.5 px-4 rounded-xl bg-[#5865F2] hover:bg-[#4752C4] active:bg-[#3C45A5] text-white font-semibold text-sm transition-all duration-200 shadow-lg shadow-[#5865F2]/25 flex items-center justify-center gap-3 cursor-pointer disabled:opacity-60"
              >
                {isLoading ? (
                  <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <DiscordIcon className="w-5 h-5 text-white" />
                    <span>Log in with Discord</span>
                  </>
                )}
              </button>
            </div>

            {/* Discord Developer Setup Guide toggle */}
            <div className="mt-5 pt-4 border-t border-slate-800/80 text-center">
              <button
                id="btn-toggle-config-guide"
                type="button"
                onClick={() => setShowConfigGuide(!showConfigGuide)}
                className="text-xs text-slate-400 hover:text-indigo-400 transition-colors inline-flex items-center gap-1 cursor-pointer"
              >
                <span>{showConfigGuide ? 'Hide' : 'View'} Discord OAuth configuration guide</span>
                <ExternalLink className="w-3 h-3" />
              </button>

              {showConfigGuide && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="mt-3 p-3 text-left rounded-xl bg-slate-950 border border-slate-800 text-[11px] text-slate-300 space-y-2 overflow-hidden"
                >
                  <p className="font-semibold text-white">To enable live Discord OAuth login:</p>
                  <ol className="list-decimal pl-4 space-y-1 text-slate-400">
                    <li>Create or open an application in the Discord Developer Portal</li>
                    <li>
                      Under OAuth2, add this Redirect URL:
                      <div className="flex items-center gap-1.5 mt-1">
                        <code className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-[#5865F2] font-mono text-[10px] break-all select-all flex-1">
                          {displayRedirectUri}
                        </code>
                        <button
                          type="button"
                          onClick={copyCallbackUrl}
                          className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
                          title="Copy Redirect URL"
                        >
                          {copiedUrl ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        </button>
                      </div>
                    </li>
                    <li>Set <code className="text-indigo-300">DISCORD_CLIENT_ID</code> and <code className="text-indigo-300">DISCORD_CLIENT_SECRET</code> in Settings</li>
                  </ol>
                </motion.div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
