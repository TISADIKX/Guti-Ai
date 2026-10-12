import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { LogOut, Check, Mail, User, ShieldCheck } from 'lucide-react';
import { UserProfile } from '../types';
import { DiscordIcon } from './AuthModal';

interface ProfileButtonProps {
  user: UserProfile | null;
  onOpenAuth: () => void;
  onSignOut: () => void;
}

export const ProfileButton: React.FC<ProfileButtonProps> = ({
  user,
  onOpenAuth,
  onSignOut,
}) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleClick = () => {
    if (!user) {
      onOpenAuth();
    } else {
      setIsDropdownOpen(!isDropdownOpen);
    }
  };

  const isEmailUser = user?.authProvider === 'email' || (!user?.discordId && Boolean(user?.email));

  return (
    <div id="profile-action-container" className="relative flex items-center gap-3" ref={dropdownRef}>
      {!user && (
        <button
          id="nav-login-btn"
          type="button"
          onClick={onOpenAuth}
          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white text-xs font-semibold shadow-md shadow-indigo-600/20 transition-all cursor-pointer"
        >
          <Mail className="w-3.5 h-3.5" />
          <span>Sign In</span>
        </button>
      )}

      {/* Circle Profile Button */}
      <motion.button
        id="profile-circle-btn"
        type="button"
        onClick={handleClick}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        aria-label={user ? `Profile menu for ${user.name}` : 'Log in to gutiai'}
        className={`group relative w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 cursor-pointer overflow-hidden ${
          user
            ? 'border-2 border-indigo-500/70 shadow-[0_0_15px_rgba(99,102,241,0.3)] bg-slate-900'
            : 'bg-slate-900/90 hover:bg-indigo-600/20 border border-slate-800 hover:border-indigo-500/60 text-slate-300 hover:text-white shadow-inner'
        }`}
      >
        {user ? (
          !isEmailUser && user.avatarUrl && user.avatarUrl.trim() ? (
            <img
              id="profile-avatar-image"
              src={user.avatarUrl}
              alt={user.name}
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          ) : !isEmailUser && user.initials ? (
            <span id="profile-avatar-initials" className="font-display font-semibold text-xs tracking-wider text-indigo-200">
              {user.initials}
            </span>
          ) : (
            <div id="profile-default-user" className="flex items-center justify-center text-slate-400">
              <User className="w-4 h-4" />
            </div>
          )
        ) : (
          <div id="contact-logo-wrapper" className="flex items-center justify-center text-slate-400 group-hover:text-indigo-400 transition-colors">
            <User className="w-4 h-4" />
          </div>
        )}
      </motion.button>

      {/* Dropdown Menu when Signed In */}
      <AnimatePresence>
        {user && isDropdownOpen && (
          <motion.div
            id="profile-dropdown-menu"
            initial={{ opacity: 0, y: 8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.95 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="absolute right-0 mt-3 top-full w-64 rounded-2xl bg-slate-900 border border-slate-800 p-3 shadow-2xl z-40 text-left"
          >
            {/* User Info Header */}
            <div id="dropdown-user-info" className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-950/70 border border-slate-800/80 mb-2">
              <div className="w-10 h-10 rounded-full overflow-hidden bg-slate-950 border border-slate-800 flex items-center justify-center text-slate-400 shrink-0">
                {!isEmailUser && user.avatarUrl && user.avatarUrl.trim() ? (
                  <img src={user.avatarUrl} alt={user.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : !isEmailUser && user.initials ? (
                  <span className="font-display font-bold text-xs text-indigo-300">{user.initials}</span>
                ) : (
                  <User className="w-4 h-4 text-slate-400" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p id="dropdown-user-name" className="text-sm font-semibold text-white truncate">
                  {user.name}
                </p>
                <p id="dropdown-user-account" className="text-xs text-slate-400 truncate flex items-center gap-1">
                  {isEmailUser ? (
                    <>
                      <Mail className="w-3 h-3 text-indigo-400 shrink-0" />
                      <span>{user.email}</span>
                    </>
                  ) : (
                    <>
                      <DiscordIcon className="w-3 h-3 text-[#5865F2] shrink-0" />
                      <span>{user.discordUsername ? `@${user.discordUsername}` : user.email}</span>
                    </>
                  )}
                </p>
              </div>
            </div>

            {/* Verification Status Badge */}
            <div id="dropdown-status-badge" className="flex items-center justify-between px-3 py-2 text-xs text-slate-400 bg-slate-950/40 rounded-lg mb-2 border border-slate-800/50">
              <span className="flex items-center gap-1.5 text-slate-300">
                {isEmailUser ? (
                  <>
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Email Verified</span>
                  </>
                ) : (
                  <>
                    <DiscordIcon className="w-3.5 h-3.5 text-[#5865F2]" />
                    <span>Discord Verified</span>
                  </>
                )}
              </span>
              <span className="text-emerald-400 font-medium flex items-center gap-1">
                <Check className="w-3 h-3 stroke-[2.5]" />
                Active
              </span>
            </div>

            {/* Actions */}
            <div className="pt-1 border-t border-slate-800/80 space-y-1">
              <button
                id="profile-signout-btn"
                type="button"
                onClick={() => {
                  setIsDropdownOpen(false);
                  onSignOut();
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                <span>{isEmailUser ? 'Sign Out' : 'Disconnect Account'}</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
