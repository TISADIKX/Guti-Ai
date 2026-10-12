import React from 'react';
import { Compass } from 'lucide-react';
import { ProfileButton } from './ProfileButton';
import { UserProfile, SiteSettings } from '../types';

interface NavbarProps {
  user: UserProfile | null;
  onOpenAuth: () => void;
  onSignOut: () => void;
  siteSettings: SiteSettings | null;
  onOpenDashboard?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  user,
  onOpenAuth,
  onSignOut,
  siteSettings,
  onOpenDashboard,
}) => {
  return (
    <header id="landing-navbar" className="w-full max-w-6xl mx-auto px-6 py-6 flex items-center justify-between">
      {/* Brand & Website Logo Container */}
      <div id="brand-logo-container" className="flex items-center gap-3">
        <div
          id="brand-icon-wrapper"
          className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 text-white flex items-center justify-center shadow-inner overflow-hidden"
        >
          {siteSettings?.logoUrl && siteSettings.logoUrl.trim() ? (
            <img
              src={siteSettings.logoUrl}
              alt={siteSettings.siteName || 'gutiai'}
              className="w-full h-full object-contain p-1 rounded-lg"
            />
          ) : (
            <Compass id="brand-icon" className="w-5 h-5 text-indigo-400 stroke-[2.2]" />
          )}
        </div>

        <span id="brand-site-name" className="font-display text-base font-bold text-white tracking-tight">
          {siteSettings?.siteName || 'gutiai'}
        </span>
      </div>

      {/* Top right profile / auth option */}
      <div id="navbar-profile-wrapper" className="flex items-center gap-3">
        {user && onOpenDashboard && (
          <button
            type="button"
            onClick={onOpenDashboard}
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/40 text-indigo-300 text-xs font-semibold transition-colors cursor-pointer"
          >
            <span>Studio Dashboard</span>
          </button>
        )}
        <ProfileButton
          user={user}
          onOpenAuth={onOpenAuth}
          onSignOut={onSignOut}
        />
      </div>
    </header>
  );
};
