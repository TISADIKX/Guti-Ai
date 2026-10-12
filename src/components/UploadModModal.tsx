import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  UploadCloud,
  FileArchive,
  Image as ImageIcon,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Trash2,
  Sparkles,
  Tag,
  Info,
} from 'lucide-react';
import { ModItem } from '../types';

interface UploadModModalProps {
  isOpen: boolean;
  onClose: () => void;
  onModCreated: (mod: ModItem) => void;
  adminKey: string;
}

export const UploadModModal: React.FC<UploadModModalProps> = ({
  isOpen,
  onClose,
  onModCreated,
  adminKey,
}) => {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<'Mod' | 'Addon' | 'Resource Pack' | 'Shader' | 'Data Pack' | 'Tool'>('Mod');
  const [version, setVersion] = useState('v1.0.0');
  const [gameVersion, setGameVersion] = useState('1.21.x');
  const [author, setAuthor] = useState('Admin Creator');
  const [summary, setSummary] = useState('');
  const [description, setDescription] = useState('');
  const [tagsInput, setTagsInput] = useState('Adventure, RPG, Vanilla+');
  const [isFeatured, setIsFeatured] = useState(false);

  // Thumbnail State
  const [thumbnailBase64, setThumbnailBase64] = useState<string | null>(null);
  const [thumbnailUrl, setThumbnailUrl] = useState('');
  const [thumbnailFileName, setThumbnailFileName] = useState<string | null>(null);
  const [isDraggingThumb, setIsDraggingThumb] = useState(false);
  const thumbInputRef = useRef<HTMLInputElement>(null);

  // File State
  const [fileBase64, setFileBase64] = useState<string | null>(null);
  const [fileName, setFileName] = useState('');
  const [fileSize, setFileSize] = useState('');
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Status
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  // Handle image thumbnail file
  const handleThumbnailFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('Please select a valid image file (PNG, JPG, WebP, GIF).');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setThumbnailBase64(reader.result as string);
      setThumbnailFileName(file.name);
      setError(null);
    };
    reader.readAsDataURL(file);
  };

  // Handle mod archive file
  const handleModFile = (file: File) => {
    const sizeInMb = (file.size / (1024 * 1024)).toFixed(1);
    setFileSize(`${sizeInMb} MB`);
    setFileName(file.name);

    if (file.name.toLowerCase().endsWith('.mcaddon') || file.name.toLowerCase().includes('addon')) {
      setCategory('Addon');
    }

    const reader = new FileReader();
    reader.onload = () => {
      setFileBase64(reader.result as string);
      setError(null);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!title.trim() || !summary.trim()) {
      setError('Please provide a title and short summary for the mod.');
      return;
    }

    setIsSubmitting(true);

    try {
      const parsedTags = tagsInput
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);

      const payload = {
        title: title.trim(),
        category,
        version: version.trim() || 'v1.0.0',
        gameVersion: gameVersion.trim() || 'Universal',
        author: author.trim() || 'Admin Creator',
        summary: summary.trim(),
        description: description.trim() || summary.trim(),
        tags: parsedTags.length > 0 ? parsedTags : [category],
        thumbnailBase64: thumbnailBase64 || undefined,
        thumbnailUrl: thumbnailUrl.trim() || undefined,
        fileBase64: fileBase64 || undefined,
        fileName: fileName || `${title.replace(/[^a-zA-Z0-9_-]/g, '_')}.zip`,
        fileSize: fileSize || '5.2 MB',
        isFeatured,
      };

      const res = await fetch('/api/mods', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-key': adminKey,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to upload mod.');
      }

      onModCreated(data.mod);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Error uploading mod.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      <div
        id="upload-mod-modal-backdrop"
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto py-8"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 md:p-8 relative overflow-hidden my-auto"
        >
          {/* Close button */}
          <button
            id="close-upload-mod-modal"
            type="button"
            onClick={onClose}
            className="absolute top-5 right-5 p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Header */}
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <UploadCloud className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white tracking-tight">Upload New Mod or Addon</h3>
              <p className="text-xs text-slate-400">
                Administrator mode • Add thumbnails, file packages, and documentation.
              </p>
            </div>
          </div>

          {error && (
            <div className="mb-5 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center gap-2.5 text-xs text-rose-300">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* 1. Title & Category */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Mod / Addon Title <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Celestial Dimensions & Bosses"
                  required
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as any)}
                  className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500 transition-all cursor-pointer"
                >
                  <option value="Mod">Mod</option>
                  <option value="Addon">Add-on</option>
                  <option value="Resource Pack">Resource Pack</option>
                  <option value="Shader">Shader</option>
                  <option value="Data Pack">Data Pack</option>
                  <option value="Tool">Tool / Utility</option>
                </select>
              </div>
            </div>

            {/* 2. Version, Game Version, Author */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Version</label>
                <input
                  type="text"
                  value={version}
                  onChange={(e) => setVersion(e.target.value)}
                  placeholder="v1.0.0"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-all font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Game Compatibility</label>
                <input
                  type="text"
                  value={gameVersion}
                  onChange={(e) => setGameVersion(e.target.value)}
                  placeholder="e.g. 1.21.x / Universal"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-all font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Author / Creator</label>
                <input
                  type="text"
                  value={author}
                  onChange={(e) => setAuthor(e.target.value)}
                  placeholder="Your Name or Studio"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-all"
                />
              </div>
            </div>

            {/* 3. Thumbnail / Photo Upload */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-slate-300">
                  Thumbnail Photo Upload
                </label>
                <span className="text-[11px] text-slate-400">PNG, JPG, WebP, GIF</span>
              </div>

              {thumbnailBase64 && thumbnailBase64.trim() ? (
                <div className="relative rounded-xl border border-indigo-500/40 p-3 bg-indigo-950/20 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <img
                      src={thumbnailBase64}
                      alt="Thumbnail preview"
                      className="w-14 h-14 object-cover rounded-lg border border-slate-700"
                    />
                    <div>
                      <p className="text-xs font-medium text-white">{thumbnailFileName || 'Custom Thumbnail'}</p>
                      <p className="text-[11px] text-emerald-400 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Image ready
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setThumbnailBase64(null);
                      setThumbnailFileName(null);
                    }}
                    className="p-2 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDraggingThumb(true);
                  }}
                  onDragLeave={() => setIsDraggingThumb(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDraggingThumb(false);
                    if (e.dataTransfer.files?.[0]) {
                      handleThumbnailFile(e.dataTransfer.files[0]);
                    }
                  }}
                  onClick={() => thumbInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-colors ${
                    isDraggingThumb
                      ? 'border-indigo-500 bg-indigo-500/10'
                      : 'border-slate-800 hover:border-slate-700 bg-slate-950/60'
                  }`}
                >
                  <input
                    ref={thumbInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files?.[0]) handleThumbnailFile(e.target.files[0]);
                    }}
                  />
                  <ImageIcon className="w-6 h-6 text-slate-400 mx-auto mb-1.5" />
                  <p className="text-xs font-medium text-slate-300">
                    Click to browse or drag & drop a thumbnail photo
                  </p>
                  <p className="text-[10px] text-slate-500 mt-1">Recommended: 16:9 or 4:3 ratio</p>
                </div>
              )}

              {/* Optional external image URL */}
              {!thumbnailBase64 && (
                <div className="mt-2">
                  <input
                    type="url"
                    value={thumbnailUrl}
                    onChange={(e) => setThumbnailUrl(e.target.value)}
                    placeholder="Or paste an image URL (e.g. https://...)"
                    className="w-full px-3 py-1.5 bg-slate-950/70 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>
              )}
            </div>

            {/* 4. Mod Package File Upload */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-slate-300">
                  Mod / Addon File Upload
                </label>
                <span className="text-[11px] text-slate-400">.zip, .jar, .mcpack, .mcaddon, .rar</span>
              </div>

              {fileName ? (
                <div className="relative rounded-xl border border-indigo-500/40 p-3 bg-indigo-950/20 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-indigo-600/30 flex items-center justify-center text-indigo-300">
                      <FileArchive className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-white font-mono">{fileName}</p>
                      <p className="text-[11px] text-slate-400">Size: {fileSize || '3.2 MB'}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setFileBase64(null);
                      setFileName('');
                      setFileSize('');
                    }}
                    className="p-2 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDraggingFile(true);
                  }}
                  onDragLeave={() => setIsDraggingFile(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDraggingFile(false);
                    if (e.dataTransfer.files?.[0]) {
                      handleModFile(e.dataTransfer.files[0]);
                    }
                  }}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-colors ${
                    isDraggingFile
                      ? 'border-indigo-500 bg-indigo-500/10'
                      : 'border-slate-800 hover:border-slate-700 bg-slate-950/60'
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".zip,.jar,.mcaddon,.mcpack,.rar,.tar.gz,.json,.txt"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files?.[0]) handleModFile(e.target.files[0]);
                    }}
                  />
                  <FileArchive className="w-6 h-6 text-indigo-400 mx-auto mb-1.5" />
                  <p className="text-xs font-medium text-slate-300">
                    Click to select file or drag & drop your mod archive
                  </p>
                  <p className="text-[10px] text-slate-500 mt-1">
                    If no file is attached, a verified mod installer archive will be generated
                    automatically.
                  </p>
                </div>
              )}
            </div>

            {/* 5. Summary */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Short Summary <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                maxLength={160}
                placeholder="A compelling one-sentence overview of what this mod provides..."
                required
                className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-all"
              />
            </div>

            {/* 6. Detailed Description & Documentation */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Full Description & Installation Guide
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                placeholder="Describe mod mechanics, required dependencies, recipes, keybindings, and changelog..."
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-all leading-relaxed"
              />
            </div>

            {/* 7. Tags & Featured */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Tags (comma separated)
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={tagsInput}
                    onChange={(e) => setTagsInput(e.target.value)}
                    placeholder="Adventure, RPG, Tech, Magic"
                    className="w-full pl-8 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-all font-mono"
                  />
                  <Tag className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              <div className="flex items-center gap-3 pt-4">
                <input
                  id="featured-checkbox"
                  type="checkbox"
                  checked={isFeatured}
                  onChange={(e) => setIsFeatured(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-700 text-indigo-600 focus:ring-indigo-500 focus:ring-offset-slate-900 cursor-pointer"
                />
                <label htmlFor="featured-checkbox" className="text-xs font-medium text-slate-300 cursor-pointer">
                  Feature on Top Spotlight Banner
                </label>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                id="submit-upload-mod-btn"
                type="submit"
                disabled={isSubmitting || !title.trim() || !summary.trim()}
                className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-2 transition-colors disabled:opacity-50 cursor-pointer shadow-lg shadow-indigo-600/20"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Uploading Mod...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Publish Mod to Dashboard</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
