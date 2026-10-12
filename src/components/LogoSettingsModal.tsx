import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Upload, Link, Check, Image as ImageIcon, Trash2, Loader2, Sparkles } from 'lucide-react';
import { SiteSettings } from '../types';

interface LogoSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentSettings: SiteSettings | null;
  onSave: (updated: SiteSettings) => void;
}

export const LogoSettingsModal: React.FC<LogoSettingsModalProps> = ({
  isOpen,
  onClose,
  currentSettings,
  onSave,
}) => {
  const [logoMode, setLogoMode] = useState<'upload' | 'url'>('upload');
  const [logoUrlInput, setLogoUrlInput] = useState(currentSettings?.logoUrl || '');
  const [siteNameInput, setSiteNameInput] = useState(currentSettings?.siteName || 'gutiai');
  const [selectedBase64, setSelectedBase64] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentSettings?.logoUrl || null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processFile(file);
  };

  const processFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('Please select a valid image file (PNG, JPG, SVG, WebP).');
      return;
    }
    setError(null);
    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      setSelectedBase64(result);
      setPreviewUrl(result);
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  const handleClearLogo = () => {
    setSelectedBase64(null);
    setPreviewUrl(null);
    setLogoUrlInput('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const payload: {
        logoBase64?: string;
        logoUrl?: string;
        siteName?: string;
      } = {
        siteName: siteNameInput.trim() || 'gutiai',
      };

      if (selectedBase64) {
        payload.logoBase64 = selectedBase64;
      } else if (logoMode === 'url') {
        payload.logoUrl = logoUrlInput.trim();
      } else if (!previewUrl) {
        payload.logoUrl = '';
      }

      const res = await fetch('/api/settings/logo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok && data.settings) {
        onSave(data.settings);
        onClose();
      } else {
        setError(data.error || 'Failed to update logo');
      }
    } catch (err: any) {
      setError(err.message || 'Network error updating logo');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div id="logo-modal-backdrop" className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-950/80 backdrop-blur-md"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 15 }}
            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            className="relative z-10 w-full max-w-md bg-slate-900 rounded-2xl border border-slate-800 p-6 shadow-2xl text-white overflow-hidden"
          >
            {/* Top Accent */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-500" />

            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                  <ImageIcon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-display text-lg font-bold text-white">Website Logo</h3>
                  <p className="text-xs text-slate-400">Add or update your site brand logo</p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {error && (
              <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Logo Preview */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-2">
                  Logo Preview
                </label>
                <div className="flex items-center gap-4 p-3.5 rounded-xl bg-slate-950/80 border border-slate-800">
                  <div className="w-14 h-14 rounded-xl bg-slate-900 border border-slate-700/60 flex items-center justify-center overflow-hidden shrink-0 shadow-inner">
                    {previewUrl && previewUrl.trim() ? (
                      <img
                        src={previewUrl}
                        alt="Website Logo Preview"
                        className="w-full h-full object-contain p-1"
                        onError={() => setPreviewUrl(null)}
                      />
                    ) : (
                      <ImageIcon className="w-6 h-6 text-slate-500" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white truncate">
                      {siteNameInput || 'Your Website'}
                    </p>
                    <p className="text-xs text-slate-400">
                      {previewUrl ? 'Custom logo selected' : 'Default icon currently active'}
                    </p>
                  </div>
                  {previewUrl && (
                    <button
                      type="button"
                      onClick={handleClearLogo}
                      className="p-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                      title="Remove custom logo"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Upload Mode Selector */}
              <div className="flex rounded-xl bg-slate-950 p-1 border border-slate-800 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setLogoMode('upload')}
                  className={`flex-1 py-1.5 rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
                    logoMode === 'upload'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Upload Image</span>
                </button>
                <button
                  type="button"
                  onClick={() => setLogoMode('url')}
                  className={`flex-1 py-1.5 rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
                    logoMode === 'url'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Link className="w-3.5 h-3.5" />
                  <span>Image URL</span>
                </button>
              </div>

              {logoMode === 'upload' ? (
                <div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/svg+xml"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      setIsDragOver(true);
                    }}
                    onDragLeave={() => setIsDragOver(false)}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
                      isDragOver
                        ? 'border-indigo-500 bg-indigo-500/10'
                        : 'border-slate-700/80 hover:border-slate-600 bg-slate-950/40 hover:bg-slate-950/70'
                    }`}
                  >
                    <Upload className="w-7 h-7 text-indigo-400 mx-auto mb-2" />
                    <p className="text-xs font-semibold text-slate-200">
                      Click to upload or drag & drop logo
                    </p>
                    <p className="text-[11px] text-slate-500 mt-1">
                      PNG, JPG, SVG, or WebP (max 5MB)
                    </p>
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Logo Image URL
                  </label>
                  <input
                    type="url"
                    value={logoUrlInput}
                    onChange={(e) => {
                      setLogoUrlInput(e.target.value);
                      setPreviewUrl(e.target.value.trim() || null);
                    }}
                    placeholder="https://example.com/logo.png"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 transition-colors"
                  />
                </div>
              )}

              {/* Website Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Website Name
                </label>
                <input
                  type="text"
                  value={siteNameInput}
                  onChange={(e) => setSiteNameInput(e.target.value)}
                  placeholder="Website name..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex items-center gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Save Logo</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
