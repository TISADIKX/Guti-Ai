import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Navbar } from './components/Navbar';
import { PremiumButton } from './components/PremiumButton';
import { AuthModal } from './components/AuthModal';
import { DashboardView } from './components/DashboardView';
import { Sparkles, Mail, ArrowRight, Wand2, Camera, Film } from 'lucide-react';
import { UserProfile, SiteSettings } from './types';

export default function App() {
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [siteSettings, setSiteSettings] = useState<SiteSettings | null>(null);
  const [currentView, setCurrentView] = useState<'landing' | 'dashboard'>('landing');

  // Load site settings from server
  useEffect(() => {
    fetch('/api/settings')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) setSiteSettings(data);
      })
      .catch((err) => console.error('Failed to load site settings:', err));
  }, []);

  // Load user from localStorage if available
  const [user, setUser] = useState<UserProfile | null>(() => {
    try {
      const saved = localStorage.getItem('journey_user_profile');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const handleLoginSuccess = (loggedInUser: UserProfile) => {
    setUser(loggedInUser);
    try {
      localStorage.setItem('journey_user_profile', JSON.stringify(loggedInUser));
    } catch (err) {
      console.error('Failed to save session:', err);
    }
    // Enter Main Dashboard immediately upon login
    setCurrentView('dashboard');
  };

  const handleSignOut = () => {
    setUser(null);
    setCurrentView('landing');
    try {
      localStorage.removeItem('journey_user_profile');
    } catch (err) {
      console.error('Failed to remove session:', err);
    }
  };

  const openAuth = () => {
    setIsAuthModalOpen(true);
  };

  // When user clicks Get Started:
  // If not logged in -> open Auth Modal
  // If logged in -> enter Main Dashboard!
  const handleGetStarted = () => {
    if (!user) {
      setIsAuthModalOpen(true);
    } else {
      setCurrentView('dashboard');
    }
  };

  const siteDisplayName = siteSettings?.siteName || 'gutiai';

  // If user is in Dashboard view and logged in, render the main generative chat dashboard!
  if (currentView === 'dashboard' && user) {
    return (
      <DashboardView
        user={user}
        onBackToHome={() => setCurrentView('landing')}
        onSignOut={handleSignOut}
      />
    );
  }

  return (
    <div id="landing-page-root" className="min-h-screen flex flex-col bg-[#090D16] text-slate-100 relative overflow-hidden selection:bg-indigo-500 selection:text-white">
      {/* Background Decorative Ambient Radial Gradients */}
      <div
        id="bg-ambient-glow-top"
        className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 w-[750px] h-[550px] bg-gradient-to-b from-indigo-950/50 via-slate-900/30 to-transparent blur-3xl opacity-70 -z-10"
      />
      <div
        id="bg-ambient-glow-center"
        className="pointer-events-none absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-radial from-indigo-900/20 to-transparent blur-3xl opacity-60 -z-10"
      />

      {/* Subtle fine dot matrix pattern */}
      <div
        id="bg-dot-pattern"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:24px_24px] opacity-70 -z-10"
      />

      {/* Top Navigation */}
      <Navbar
        user={user}
        onOpenAuth={openAuth}
        onSignOut={handleSignOut}
        siteSettings={siteSettings}
        onOpenDashboard={() => setCurrentView('dashboard')}
      />

      {/* Main Hero Container - Centered in viewport */}
      <main id="hero-section" className="flex-1 flex flex-col items-center justify-center px-6 py-8 text-center max-w-4xl mx-auto w-full">
        {/* Eyebrow Pill */}
        <motion.div
          id="hero-eyebrow-pill"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900/90 border border-slate-800/90 shadow-sm mb-6"
        >
          <Sparkles id="hero-eyebrow-icon" className="w-3.5 h-3.5 text-indigo-400" />
          <span id="hero-eyebrow-text" className="text-xs sm:text-sm font-medium text-slate-300 tracking-tight">
            {siteDisplayName} Generative Studio
          </span>
        </motion.div>

        {/* Hero Title */}
        <motion.h1
          id="hero-main-title"
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1, ease: 'easeOut' }}
          className="font-display text-5xl sm:text-6xl md:text-7xl font-extrabold tracking-tight text-white leading-[1.08] mb-5"
        >
          Welcome to <span className="bg-gradient-to-r from-indigo-400 via-purple-300 to-indigo-200 bg-clip-text text-transparent">{siteDisplayName}</span>
        </motion.h1>

        {/* Hero Subtitle */}
        <motion.p
          id="hero-subtitle"
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2, ease: 'easeOut' }}
          className="text-base sm:text-lg text-slate-400 max-w-xl mx-auto font-normal leading-relaxed mb-6"
        >
          Create stunning 8K AI photos and cinematic videos. Describe your vision, watch the live generation progress, and download in one click.
        </motion.p>

        {/* Authentication sign-in action button (hidden when user is logged in) */}
        {!user && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.28 }}
            className="mb-8"
          >
            <button
              type="button"
              onClick={openAuth}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white text-xs font-medium transition-colors cursor-pointer"
            >
              <Mail className="w-3.5 h-3.5 text-indigo-400" />
              <span>Sign in with Email</span>
              <ArrowRight className="w-3 h-3 text-slate-500" />
            </button>
          </motion.div>
        )}

        {/* Central Premium Button: Get Started */}
        <motion.div
          id="hero-cta-container"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.3, ease: 'easeOut' }}
          className="my-3 flex justify-center items-center w-full"
        >
          <PremiumButton
            id="hero-get-started-btn"
            label="Get Started"
            onClick={handleGetStarted}
          />
        </motion.div>
      </main>

      {/* Minimal Footer */}
      <footer id="landing-footer" className="w-full max-w-6xl mx-auto px-6 py-6 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-3">
        <span id="footer-copyright">
          © {new Date().getFullYear()} {siteDisplayName}. All rights reserved.
        </span>
        <div id="footer-links" className="flex items-center gap-5">
          {user ? (
            <button
              type="button"
              onClick={() => setCurrentView('dashboard')}
              className="hover:text-slate-300 cursor-pointer transition-colors text-indigo-400 font-medium"
            >
              Studio Dashboard
            </button>
          ) : (
            <button
              type="button"
              onClick={openAuth}
              className="hover:text-slate-300 cursor-pointer transition-colors"
            >
              Login with Email
            </button>
          )}
          <span className="hover:text-slate-300 cursor-pointer transition-colors">Privacy</span>
          <span className="hover:text-slate-300 cursor-pointer transition-colors">Terms</span>
        </div>
      </footer>

      {/* Unified Auth Modal without OTP */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onSuccess={handleLoginSuccess}
      />
    </div>
  );
}
