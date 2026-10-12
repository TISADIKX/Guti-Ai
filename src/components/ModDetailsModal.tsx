import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Download,
  Star,
  HardDrive,
  Calendar,
  User,
  CheckCircle2,
  Trash2,
  Loader2,
  ExternalLink,
  Layers,
  Sparkles,
  FileCheck,
  Pencil,
} from 'lucide-react';
import { ModItem } from '../types';

interface ModDetailsModalProps {
  mod: ModItem | null;
  isOpen: boolean;
  onClose: () => void;
  onDownload: (mod: ModItem) => void;
  isAdmin: boolean;
  onDelete?: (modId: string) => void;
  onEdit?: (mod: ModItem) => void;
}

export const ModDetailsModal: React.FC<ModDetailsModalProps> = ({
  mod,
  isOpen,
  onClose,
  onDownload,
  isAdmin,
  onDelete,
  onEdit,
}) => {
  const [isDeleting, setIsDeleting] = useState(false);
  const [downloadTriggered, setDownloadTriggered] = useState(false);

  if (!isOpen || !mod) return null;

  const isAddon =
    mod.category?.toLowerCase() === 'addon' ||
    mod.fileName?.toLowerCase().endsWith('.mcaddon') ||
    mod.tags?.some((t) => t.toLowerCase() === 'addon');

  const handleDownloadClick = () => {
    setDownloadTriggered(true);
    onDownload(mod);
    setTimeout(() => setDownloadTriggered(false), 3000);
  };

  const handleDeleteClick = async () => {
    if (!window.confirm(`Are you sure you want to permanently delete "${mod.title}"?`)) {
      return;
    }
    setIsDeleting(true);
    if (onDelete) {
      await onDelete(mod.id);
    }
    setIsDeleting(false);
    onClose();
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'Mod':
        return 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30';
      case 'Shader':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
      case 'Addon':
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
      case 'Resource Pack':
        return 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30';
      case 'Data Pack':
        return 'bg-purple-500/20 text-purple-300 border-purple-500/30';
      default:
        return 'bg-slate-700/40 text-slate-300 border-slate-600/40';
    }
  };

  return (
    <AnimatePresence>
      <div
        id="mod-details-modal-backdrop"
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto py-8"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="w-full max-w-3xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden my-auto relative"
        >
          {/* Top banner controls */}
          <div className="absolute top-4 right-4 z-20 flex items-center gap-2">
            {isAdmin && onEdit && (
              <button
                id="header-edit-mod-btn"
                type="button"
                onClick={() => onEdit(mod)}
                className="px-3 py-1.5 rounded-full bg-slate-900/80 hover:bg-indigo-600 text-white text-xs font-semibold backdrop-blur-md transition-colors cursor-pointer border border-white/10 flex items-center gap-1.5 shadow-md"
                title="Edit Mod / Addon"
              >
                <Pencil className="w-3.5 h-3.5" />
                <span>Edit</span>
              </button>
            )}

            <button
              id="close-mod-details-modal"
              type="button"
              onClick={onClose}
              className="p-2 text-white/80 hover:text-white bg-slate-900/80 hover:bg-slate-800 rounded-full backdrop-blur-md transition-colors cursor-pointer border border-white/10"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Banner Thumbnail */}
          <div className="relative w-full h-64 sm:h-72 bg-slate-950 overflow-hidden">
            <img
              src={
                mod.thumbnailUrl && mod.thumbnailUrl.trim()
                  ? mod.thumbnailUrl
                  : 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?q=80&w=800&auto=format&fit=crop'
              }
              alt={mod.title}
              className="w-full h-full object-cover"
              onError={(e) => {
                // Fallback image if remote url fails
                (e.target as HTMLImageElement).src =
                  'https://images.unsplash.com/photo-1550745165-9bc0b252726f?q=80&w=800&auto=format&fit=crop';
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/50 to-transparent" />

            {/* Badges on Banner */}
            <div className="absolute bottom-4 left-6 right-6 flex items-end justify-between gap-4">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className={`px-2.5 py-0.5 rounded-md text-[11px] font-bold border uppercase tracking-wider ${getCategoryColor(
                      isAddon ? 'Addon' : mod.category
                    )}`}
                  >
                    {isAddon ? 'Addon' : mod.category}
                  </span>
                  <span className="px-2 py-0.5 rounded-md text-[11px] font-mono font-medium bg-slate-800/90 text-slate-300 border border-slate-700/60">
                    {mod.version}
                  </span>
                  {mod.isFeatured && (
                    <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-amber-400" /> Featured
                    </span>
                  )}
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight leading-snug drop-shadow-md">
                  {mod.title}
                </h2>
              </div>
            </div>
          </div>

          {/* Content Body */}
          <div className="p-6 sm:p-8 space-y-6">
            {/* Metadata Stats Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
                <span className="text-[11px] text-slate-400 block mb-0.5">Author</span>
                <span className="text-xs font-semibold text-white flex items-center gap-1.5 truncate">
                  <User className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                  <span className="truncate">{mod.author}</span>
                </span>
              </div>

              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
                <span className="text-[11px] text-slate-400 block mb-0.5">Downloads</span>
                <span className="text-xs font-semibold text-white flex items-center gap-1.5">
                  <Download className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>{mod.downloads.toLocaleString()}</span>
                </span>
              </div>

              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
                <span className="text-[11px] text-slate-400 block mb-0.5">File Size</span>
                <span className="text-xs font-semibold text-white flex items-center gap-1.5 font-mono">
                  <HardDrive className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                  <span>{mod.fileSize}</span>
                </span>
              </div>

              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
                <span className="text-[11px] text-slate-400 block mb-0.5">Game Compatibility</span>
                <span className="text-xs font-semibold text-white flex items-center gap-1.5 truncate font-mono">
                  <Layers className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                  <span className="truncate">{mod.gameVersion || 'Universal'}</span>
                </span>
              </div>
            </div>

            {/* Tags */}
            {mod.tags && mod.tags.length > 0 && (
              <div className="flex items-center gap-1.5 flex-wrap">
                {mod.tags.map((tag, i) => (
                  <span
                    key={i}
                    className="px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-800/70 text-slate-300 border border-slate-700/50"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}

            {/* Description & Overview */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                About this Mod
              </h4>
              <p className="text-sm text-slate-300 leading-relaxed font-normal">
                {mod.summary}
              </p>

              {mod.description && mod.description !== mod.summary && (
                <div className="mt-4 p-4 rounded-xl bg-slate-950/70 border border-slate-800/80 text-xs text-slate-300 leading-relaxed whitespace-pre-line font-sans space-y-2">
                  {mod.description}
                </div>
              )}
            </div>

            {/* Download File Card Banner */}
            <div className="p-4 rounded-xl bg-indigo-950/30 border border-indigo-500/30 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400 shrink-0">
                  <FileCheck className="w-6 h-6" />
                </div>
                <div>
                  <h5 className="text-sm font-bold text-white font-mono">{mod.fileName}</h5>
                  <p className="text-xs text-slate-400">
                    Safe package • Verified checksum • {mod.fileSize}
                  </p>
                </div>
              </div>

              <button
                id="modal-download-mod-btn"
                type="button"
                onClick={handleDownloadClick}
                className="w-full sm:w-auto px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shadow-indigo-600/30 shrink-0 hover:scale-[1.02]"
              >
                {downloadTriggered ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                    <span>Download Started!</span>
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    <span>Download Mod Now</span>
                  </>
                )}
              </button>
            </div>

            {/* Footer with Admin controls if admin */}
            <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
              <div className="text-[11px] text-slate-500">
                Released on {mod.createdAt}
              </div>

              <div className="flex items-center gap-3">
                {isAdmin && onEdit && (
                  <button
                    id="admin-footer-edit-mod-btn"
                    type="button"
                    onClick={() => onEdit(mod)}
                    className="px-3 py-1.5 rounded-lg bg-indigo-500/15 hover:bg-indigo-500/25 border border-indigo-500/30 text-indigo-300 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    <span>Edit Mod</span>
                  </button>
                )}

                {isAdmin && onDelete && (
                  <button
                    id="admin-delete-mod-btn"
                    type="button"
                    disabled={isDeleting}
                    onClick={handleDeleteClick}
                    className="px-3 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    {isDeleting ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="w-3.5 h-3.5" />
                    )}
                    <span>Delete Mod</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
