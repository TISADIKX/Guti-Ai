import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Search,
  Plus,
  Shield,
  ShieldCheck,
  ArrowLeft,
  X,
  CheckCircle2,
  Package,
  Layers,
  Sparkle,
  Compass,
  FileArchive,
  Pencil,
} from 'lucide-react';
import { ModItem, UserProfile, isUsdproDiscordAccount } from '../types';
import { ModDetailsModal } from './ModDetailsModal';
import { UploadModModal } from './UploadModModal';
import { EditModModal } from './EditModModal';
import { AdminLoginModal } from './AdminLoginModal';

interface ModsDashboardProps {
  user: UserProfile | null;
  onBackToHome: () => void;
  onOpenAuth: () => void;
  onSignOut: () => void;
}

export const ModsDashboard: React.FC<ModsDashboardProps> = ({
  user,
  onBackToHome,
  onOpenAuth,
  onSignOut,
}) => {
  const [mods, setMods] = useState<ModItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Only the "USDPRO1" Discord account can see or access the admin login
  const isUsdproAccount = isUsdproDiscordAccount(user);

  // Admin State
  const [isAdmin, setIsAdmin] = useState<boolean>(() => {
    if (!isUsdproDiscordAccount(user)) return false;
    try {
      const savedKey = localStorage.getItem('mods_admin_key');
      return savedKey === 'Usdpro1234@' || (user?.email && user.email.toLowerCase() === 'bdbishal72@gmail.com');
    } catch {
      return false;
    }
  });
  const [adminKey, setAdminKey] = useState<string>(() => {
    if (!isUsdproDiscordAccount(user)) return '';
    return localStorage.getItem('mods_admin_key') || (user?.email || '');
  });

  // Modals
  const [selectedMod, setSelectedMod] = useState<ModItem | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingMod, setEditingMod] = useState<ModItem | null>(null);
  const [isAdminLoginOpen, setIsAdminLoginOpen] = useState(false);

  // Download Feedback Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  // Synchronize admin status: normal users can never access admin mode
  useEffect(() => {
    if (!isUsdproAccount) {
      setIsAdmin(false);
      setAdminKey('');
      setIsAdminLoginOpen(false);
    } else {
      const savedKey = localStorage.getItem('mods_admin_key');
      if (savedKey === 'Usdpro1234@' || user?.email?.toLowerCase() === 'bdbishal72@gmail.com') {
        setIsAdmin(true);
        setAdminKey(savedKey || user?.email || 'Usdpro1234@');
      }
    }
  }, [user, isUsdproAccount]);

  // Fetch mods from API
  const fetchMods = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/mods');
      if (res.ok) {
        const data = await res.json();
        setMods(data.mods || []);
      }
    } catch (err) {
      console.error('Failed to fetch mods:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMods();
  }, []);

  // Filter & Sort mods (default newest first)
  const filteredMods = useMemo(() => {
    let result = [...mods];

    // Search query filter (title, summary, tags, author, category)
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter(
        (m) =>
          m.title.toLowerCase().includes(q) ||
          m.summary.toLowerCase().includes(q) ||
          m.category.toLowerCase().includes(q) ||
          m.author.toLowerCase().includes(q) ||
          (m.tags && m.tags.some((t) => t.toLowerCase().includes(q)))
      );
    }

    // Default newest releases first
    result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return result;
  }, [mods, searchQuery]);

  // Handle Download Click
  const handleDownloadMod = (mod: ModItem) => {
    // 1. Trigger actual browser download
    const downloadUrl = mod.downloadUrl || `/api/mods/download/${mod.id}`;
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.setAttribute('download', mod.fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // 2. Increment download count in local state
    setMods((prev) =>
      prev.map((item) =>
        item.id === mod.id ? { ...item, downloads: item.downloads + 1 } : item
      )
    );
    if (selectedMod?.id === mod.id) {
      setSelectedMod((prev) => (prev ? { ...prev, downloads: prev.downloads + 1 } : null));
    }

    showToast(`Downloading "${mod.title}" (${mod.fileName})`);
  };

  // Handle Delete Mod (Admin only)
  const handleDeleteMod = async (modId: string) => {
    try {
      const res = await fetch(`/api/mods/${encodeURIComponent(modId)}`, {
        method: 'DELETE',
        headers: {
          'x-admin-key': adminKey,
        },
      });
      if (res.ok) {
        setMods((prev) => prev.filter((m) => m.id !== modId));
        showToast('Mod removed successfully.');
      }
    } catch (err) {
      console.error('Failed to delete mod:', err);
    }
  };

  // Handle New Mod Created (Admin only)
  const handleModCreated = (newMod: ModItem) => {
    setMods((prev) => [newMod, ...prev]);
    showToast(`"${newMod.title}" published successfully!`);
  };

  // Handle Open Edit Mod Modal (Admin only)
  const handleOpenEdit = (mod: ModItem, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
    setEditingMod(mod);
    setIsEditOpen(true);
  };

  // Handle Mod Updated (Admin only)
  const handleModUpdated = (updatedMod: ModItem) => {
    setMods((prev) => prev.map((m) => (m.id === updatedMod.id ? updatedMod : m)));
    if (selectedMod?.id === updatedMod.id) {
      setSelectedMod(updatedMod);
    }
    showToast(`"${updatedMod.title}" updated successfully!`);
  };

  // Admin login success
  const handleAdminSuccess = (key: string) => {
    setIsAdmin(true);
    setAdminKey(key);
    try {
      localStorage.setItem('mods_admin_key', key);
    } catch (e) {}
    showToast('Administrator privileges unlocked! You can now upload and manage mods.');
  };

  const handleAdminLogout = () => {
    setIsAdmin(false);
    try {
      localStorage.removeItem('mods_admin_key');
    } catch (e) {}
    showToast('Exited Admin Mode. Now browsing as regular visitor.');
  };

  return (
    <div
      id="mods-dashboard-root"
      className="min-h-screen flex flex-col bg-[#090D16] text-slate-100 selection:bg-indigo-500 selection:text-white"
    >
      {/* Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="fixed top-6 right-6 z-50 px-4 py-3 bg-indigo-600 text-white text-xs font-semibold rounded-xl shadow-2xl shadow-indigo-600/30 border border-indigo-400/40 flex items-center gap-2.5 backdrop-blur-md"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-300" />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top Navigation Header */}
      <header
        id="mods-header"
        className="w-full border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-md sticky top-0 z-40"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between gap-4">
          {/* Left: Back button */}
          <div className="flex items-center gap-3">
            <button
              id="dashboard-back-home-btn"
              type="button"
              onClick={onBackToHome}
              className="px-3 py-2 rounded-xl text-slate-300 hover:text-white bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 transition-colors cursor-pointer flex items-center gap-2 text-xs font-medium shadow-sm"
              title="Return to Home"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Home</span>
            </button>
          </div>

          {/* Right: Admin Mode / Upload Button (Only USDPRO1 Discord account can see admin login) */}
          <div className="flex items-center gap-2.5">
            {isAdmin ? (
              <div className="flex items-center gap-2">
                <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-semibold">
                  <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                  <span>Admin Mode</span>
                </div>

                <button
                  id="admin-upload-mod-btn"
                  type="button"
                  onClick={() => setIsUploadOpen(true)}
                  className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-lg shadow-indigo-600/20"
                >
                  <Plus className="w-4 h-4" />
                  <span>Upload Mod</span>
                </button>

                <button
                  id="admin-exit-mode-btn"
                  type="button"
                  onClick={handleAdminLogout}
                  className="p-2 text-slate-400 hover:text-rose-400 bg-slate-800/60 hover:bg-slate-800 rounded-xl border border-slate-700/50 transition-colors cursor-pointer text-xs"
                  title="Exit Admin Mode"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : isUsdproAccount ? (
              <button
                id="open-admin-login-btn"
                type="button"
                onClick={() => setIsAdminLoginOpen(true)}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold text-amber-300 hover:text-amber-200 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
                title="Admin access for USDPRO1 Discord account"
              >
                <Shield className="w-3.5 h-3.5 text-amber-400" />
                <span>Admin Login</span>
              </button>
            ) : null}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Search Controls */}
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            {/* Search Box */}
            <div className="relative flex-1 max-w-xl">
              <input
                id="search-mods-input"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search mods, addons, shaders, tags..."
                className="w-full pl-10 pr-9 py-2.5 bg-slate-900/90 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all shadow-inner"
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="p-1 text-slate-400 hover:text-white absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md hover:bg-slate-800 transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Active Search Indicator */}
          {searchQuery && (
            <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
              <span>
                Showing <span className="font-semibold text-white">{filteredMods.length}</span> results matching{' '}
                <span className="text-indigo-400 font-mono">"{searchQuery}"</span>
              </span>

              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="text-xs text-indigo-400 hover:text-indigo-300 underline cursor-pointer"
              >
                Clear search
              </button>
            </div>
          )}
        </div>

        {/* Empty State */}
        {filteredMods.length === 0 && !isLoading && (
          <div className="p-12 text-center rounded-3xl border border-dashed border-slate-800 bg-slate-900/30 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-800/80 flex items-center justify-center text-slate-400 mx-auto">
              <Compass className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-white">
              {searchQuery ? 'No matching mods found' : 'No mods or addons uploaded yet'}
            </h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              {searchQuery
                ? "We couldn't find any mods matching your search query."
                : isUsdproAccount
                  ? 'No mods or addons uploaded yet. You are logged into the authorized USDPRO1 account.'
                  : 'No mods or addons uploaded yet. Check back soon for new community creations.'}
            </p>
            {isAdmin ? (
              <button
                id="empty-state-upload-btn"
                type="button"
                onClick={() => setIsUploadOpen(true)}
                className="mt-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold inline-flex items-center gap-2 cursor-pointer shadow-lg shadow-indigo-600/20"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Upload a Mod</span>
              </button>
            ) : isUsdproAccount ? (
              <button
                id="empty-state-admin-login-btn"
                type="button"
                onClick={() => setIsAdminLoginOpen(true)}
                className="mt-2 px-4 py-2 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer border border-amber-500/30 shadow-sm"
              >
                <Shield className="w-3.5 h-3.5 text-amber-400" />
                <span>Admin Login to Upload</span>
              </button>
            ) : null}
          </div>
        )}

        {/* Mods Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {filteredMods.map((mod) => (
            <motion.div
              key={mod.id}
              id={`mod-card-${mod.id}`}
              layout
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.2 }}
              onClick={() => {
                setSelectedMod(mod);
                setIsDetailsOpen(true);
              }}
              className="group rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-indigo-500/50 overflow-hidden flex flex-col transition-all hover:shadow-xl hover:shadow-indigo-950/30 cursor-pointer"
              title={`Click to view details and download ${mod.title}`}
            >
              {/* Thumbnail Container */}
              <div className="relative aspect-[16/10] w-full bg-slate-950 overflow-hidden">
                <img
                  src={
                    mod.thumbnailUrl && mod.thumbnailUrl.trim()
                      ? mod.thumbnailUrl
                      : 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?q=80&w=800&auto=format&fit=crop'
                  }
                  alt={mod.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src =
                      'https://images.unsplash.com/photo-1550745165-9bc0b252726f?q=80&w=800&auto=format&fit=crop';
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-transparent to-transparent opacity-40 group-hover:opacity-20 transition-opacity" />

                {/* Addon Badge */}
                {(mod.category?.toLowerCase() === 'addon' ||
                  mod.fileName?.toLowerCase().endsWith('.mcaddon') ||
                  mod.tags?.some((t) => t.toLowerCase() === 'addon')) && (
                  <div className="absolute top-2.5 left-2.5 z-10 pointer-events-none">
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-emerald-500 text-slate-950 shadow-md border border-emerald-400/40 backdrop-blur-md">
                      Addon
                    </span>
                  </div>
                )}
              </div>

              {/* Title with Addon Badge and Edit Button */}
              <div className="p-3.5 flex items-center justify-between gap-2">
                <h3
                  className="text-sm font-semibold text-white tracking-tight group-hover:text-indigo-300 transition-colors line-clamp-1"
                  title={mod.title}
                >
                  {mod.title}
                </h3>
                <div className="flex items-center gap-1.5 shrink-0">
                  {(mod.category?.toLowerCase() === 'addon' ||
                    mod.fileName?.toLowerCase().endsWith('.mcaddon') ||
                    mod.tags?.some((t) => t.toLowerCase() === 'addon')) && (
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                      Addon
                    </span>
                  )}
                  {isAdmin && (
                    <button
                      id={`edit-card-${mod.id}`}
                      type="button"
                      onClick={(e) => handleOpenEdit(mod, e)}
                      className="p-1 rounded-md bg-slate-800 hover:bg-indigo-600 text-slate-400 hover:text-white border border-slate-700/60 transition-colors shadow-sm cursor-pointer"
                      title={`Edit ${mod.title}`}
                    >
                      <Pencil className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </main>

      {/* Dashboard Footer */}
      <footer className="w-full border-t border-slate-800/80 py-6 mt-12 bg-slate-950/40 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p>© {new Date().getFullYear()} Launch Your Journey • Mods & Addons Repository</p>
          <div className="flex items-center gap-4 text-[11px] text-slate-400">
            <span>Free Community Downloads</span>
            <span>•</span>
            <span>Verified Safety Checksums</span>
            <span>•</span>
            {isAdmin ? (
              <span className="text-amber-400 font-semibold">Admin Active</span>
            ) : isUsdproAccount ? (
              <button
                type="button"
                onClick={() => setIsAdminLoginOpen(true)}
                className="text-amber-400 hover:text-amber-300 underline cursor-pointer"
              >
                Admin Login
              </button>
            ) : null}
          </div>
        </div>
      </footer>

      {/* Details Modal */}
      <ModDetailsModal
        mod={selectedMod}
        isOpen={isDetailsOpen}
        onClose={() => setIsDetailsOpen(false)}
        onDownload={handleDownloadMod}
        isAdmin={isAdmin}
        onDelete={handleDeleteMod}
        onEdit={(mod) => handleOpenEdit(mod)}
      />

      {/* Upload Mod Modal (Admin Only) */}
      <UploadModModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onModCreated={handleModCreated}
        adminKey={adminKey}
      />

      {/* Edit Mod Modal (Admin Only) */}
      <EditModModal
        isOpen={isEditOpen}
        onClose={() => {
          setIsEditOpen(false);
          setEditingMod(null);
        }}
        mod={editingMod}
        onModUpdated={handleModUpdated}
        adminKey={adminKey}
      />

      {/* Admin Login Modal (Mounted strictly for USDPRO1 Discord account) */}
      {isUsdproAccount && (
        <AdminLoginModal
          isOpen={isAdminLoginOpen}
          onClose={() => setIsAdminLoginOpen(false)}
          onSuccess={handleAdminSuccess}
          currentEmail={user?.email}
          currentUser={user}
        />
      )}
    </div>
  );
};
