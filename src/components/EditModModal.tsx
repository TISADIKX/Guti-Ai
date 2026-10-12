import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Pencil,
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

interface EditModModalProps {
  mod: ModItem | null;
  isOpen: boolean;
  onClose: () => void;
  onModUpdated: (updatedMod: ModItem) => void;
  adminKey: string;
}

export const EditModModal: React.FC<EditModModalProps> = ({
  mod,
  isOpen,
  onClose,
  onModUpdated,
  adminKey,
}) => {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<'Mod' | 'Addon' | 'Resource Pack' | 'Shader' | 'Data Pack' | 'Tool'>('Mod');
  const [version, setVersion] = useState('v1.0.0');
  const [gameVersion, setGameVersion] = useState('1.21.x');
  const [author, setAuthor] = useState('Admin Creator');
  const [summary, setSummary] = useState('');
  const [description, setDescription] = useState('');
  const [tagsInput, setTagsInput] = useState('');
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

  // Synchronize initial values whenever mod changes
  useEffect(() => {
    if (mod && isOpen) {
      setTitle(mod.title || '');
      setCategory(mod.category || 'Mod');
      setVersion(mod.version || 'v1.0.0');
      setGameVersion(mod.gameVersion || '1.21.x');
      setAuthor(mod.author || 'Admin Creator');
      setSummary(mod.summary || '');
      setDescription(mod.description || '');
      setTagsInput(mod.tags?.join(', ') || '');
      setIsFeatured(Boolean(mod.isFeatured));
      setThumbnailUrl(mod.thumbnailUrl || '');
      setThumbnailBase64(null);
      setThumbnailFileName(null);
      setFileBase64(null);
      setFileName(mod.fileName || '');
      setFileSize(mod.fileSize || '');
      setError(null);
    }
  }, [mod, isOpen]);

  if (!isOpen || !mod) return null;

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

  // Handle mod archive replacement file
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
      setError('Please provide a title and short summary for the mod or addon.');
      return;
    }

    setIsSubmitting(true);

    try {
      const parsedTags = tagsInput
        .split(',')
        .map((t) => t.trim().replace(/^#/, ''))
        .filter(Boolean);

      const payload: Record<string, any> = {
        title: title.trim(),
        category,
        version: version.trim() || 'v1.0.0',
        gameVersion: gameVersion.trim() || 'Universal',
        author: author.trim() || 'Admin Creator',
        summary: summary.trim(),
        description: description.trim() || summary.trim(),
        tags: parsedTags.length > 0 ? parsedTags : [category],
        isFeatured,
      };

      if (thumbnailBase64) {
        payload.thumbnailBase64 = thumbnailBase64;
      } else if (thumbnailUrl) {
        payload.thumbnailUrl = thumbnailUrl.trim();
      }

      if (fileBase64) {
        payload.fileBase64 = fileBase64;
        payload.fileName = fileName;
        payload.fileSize = fileSize;
      }

      const res = await fetch(`/api/mods/${mod.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-key': adminKey,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to update mod');
      }

      if (data.success && data.mod) {
        onModUpdated(data.mod);
        onClose();
      } else {
        throw new Error('Server did not confirm mod update');
      }
    } catch (err: any) {
      console.error('[EditModModal] Error:', err);
      setError(err.message || 'An unexpected error occurred while updating the mod.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      <div
        id="edit-mod-modal-backdrop"
        className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.2 }}
          className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden my-auto"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/60">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                <Pencil className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white tracking-tight">Edit Mod or Addon</h3>
                <p className="text-xs text-slate-400">Update specifications, package file, and visual thumbnail</p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
            {error && (
              <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2.5">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{error}</span>
              </div>
            )}

            {/* Basic Info Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Title */}
              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-xs font-semibold text-slate-300">
                  Mod / Addon Title <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Sodium Optimizer Engine, Epic Dragons Addon"
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              {/* Category */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">
                  Category <span className="text-rose-400">*</span>
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="Mod">Mod (.jar / .zip)</option>
                  <option value="Addon">Addon (.mcaddon / .mcpack)</option>
                  <option value="Resource Pack">Resource Pack (.zip / .mcpack)</option>
                  <option value="Shader">Shader Pack (.zip)</option>
                  <option value="Data Pack">Data Pack (.zip)</option>
                  <option value="Tool">Tool / Utility</option>
                </select>
              </div>

              {/* Version */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">
                  Mod Version <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={version}
                  onChange={(e) => setVersion(e.target.value)}
                  placeholder="v1.0.0"
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 font-mono"
                />
              </div>

              {/* Game Version */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Target Game Version</label>
                <input
                  type="text"
                  value={gameVersion}
                  onChange={(e) => setGameVersion(e.target.value)}
                  placeholder="1.21.x / Universal"
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 font-mono"
                />
              </div>

              {/* Author */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Author Name</label>
                <input
                  type="text"
                  value={author}
                  onChange={(e) => setAuthor(e.target.value)}
                  placeholder="USDPRO1 / Studio"
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>

            {/* Summary */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">
                Short Summary <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                required
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                placeholder="A concise description shown in search results and cards"
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            {/* Full Description */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">
                Full Description & Installation Guide
              </label>
              <textarea
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Detailed features, installation instructions, dependencies..."
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 resize-none font-sans"
              />
            </div>

            {/* Tags & Featured */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 flex items-center gap-1">
                  <Tag className="w-3.5 h-3.5 text-slate-400" />
                  <span>Tags (comma-separated)</span>
                </label>
                <input
                  type="text"
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                  placeholder="Optimization, FPS, Shaders, Adventure"
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="pt-5 sm:pt-4">
                <label className="flex items-center gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={isFeatured}
                    onChange={(e) => setIsFeatured(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-700 bg-slate-950 text-indigo-600 focus:ring-indigo-500"
                  />
                  <div className="flex items-center gap-1 text-xs text-slate-300 font-medium">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    <span>Feature as "Hot" Material</span>
                  </div>
                </label>
              </div>
            </div>

            {/* Thumbnail Upload or Preview */}
            <div className="space-y-2 pt-2 border-t border-slate-800/80">
              <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                <span>Mod Thumbnail Image</span>
                <span className="text-[11px] text-slate-500">Optional update</span>
              </label>

              {/* Current or Selected Thumbnail Preview */}
              {Boolean((thumbnailBase64 && thumbnailBase64.trim()) || (thumbnailUrl && thumbnailUrl.trim())) && (
                <div className="flex items-center gap-3 p-3 bg-slate-950 border border-slate-800 rounded-xl">
                  <img
                    src={(thumbnailBase64 && thumbnailBase64.trim()) || (thumbnailUrl && thumbnailUrl.trim()) || undefined}
                    alt="Preview"
                    className="w-16 h-12 rounded-lg object-cover border border-slate-800 shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-white truncate">
                      {thumbnailFileName || 'Current Thumbnail'}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      {thumbnailBase64 ? 'New replacement image selected' : 'Active thumbnail'}
                    </p>
                  </div>
                  {thumbnailBase64 && (
                    <button
                      type="button"
                      onClick={() => {
                        setThumbnailBase64(null);
                        setThumbnailFileName(null);
                      }}
                      className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-slate-800"
                      title="Revert to original thumbnail"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              )}

              {/* Drag & Drop Thumbnail Zone */}
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDraggingThumb(true);
                }}
                onDragLeave={() => setIsDraggingThumb(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDraggingThumb(false);
                  if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                    handleThumbnailFile(e.dataTransfer.files[0]);
                  }
                }}
                onClick={() => thumbInputRef.current?.click()}
                className={`border border-dashed rounded-xl p-3 text-center cursor-pointer transition-colors ${
                  isDraggingThumb
                    ? 'border-indigo-500 bg-indigo-500/10'
                    : 'border-slate-800 hover:border-slate-700 bg-slate-950/40'
                }`}
              >
                <input
                  ref={thumbInputRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleThumbnailFile(e.target.files[0]);
                    }
                  }}
                  className="hidden"
                />
                <div className="flex items-center justify-center gap-2 text-xs text-slate-400">
                  <ImageIcon className="w-4 h-4 text-indigo-400" />
                  <span>Drop a new image here or click to browse (PNG, JPG, WebP)</span>
                </div>
              </div>
            </div>

            {/* Package File Attachment (Optional update) */}
            <div className="space-y-2 pt-2 border-t border-slate-800/80">
              <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                <span>Mod Package File</span>
                <span className="text-[11px] text-slate-500">Optional replacement</span>
              </label>

              {/* Existing file info */}
              <div className="flex items-center gap-3 p-3 bg-slate-950 border border-slate-800 rounded-xl">
                <div className="w-10 h-10 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0">
                  <FileArchive className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-mono font-medium text-white truncate">{fileName}</p>
                  <p className="text-[11px] text-slate-400">
                    {fileSize} • {fileBase64 ? 'New package uploaded' : 'Current package'}
                  </p>
                </div>
                {fileBase64 && (
                  <button
                    type="button"
                    onClick={() => {
                      setFileBase64(null);
                      setFileName(mod.fileName);
                      setFileSize(mod.fileSize);
                    }}
                    className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-slate-800"
                    title="Revert to original file"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Drag & Drop File Zone */}
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDraggingFile(true);
                }}
                onDragLeave={() => setIsDraggingFile(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDraggingFile(false);
                  if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                    handleModFile(e.dataTransfer.files[0]);
                  }
                }}
                onClick={() => fileInputRef.current?.click()}
                className={`border border-dashed rounded-xl p-3 text-center cursor-pointer transition-colors ${
                  isDraggingFile
                    ? 'border-indigo-500 bg-indigo-500/10'
                    : 'border-slate-800 hover:border-slate-700 bg-slate-950/40'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".zip,.jar,.mcaddon,.mcpack,.rar,.7z"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleModFile(e.target.files[0]);
                    }
                  }}
                  className="hidden"
                />
                <div className="flex items-center justify-center gap-2 text-xs text-slate-400">
                  <FileArchive className="w-4 h-4 text-indigo-400" />
                  <span>Click to select or drop a new file (.zip, .jar, .mcaddon, .mcpack)</span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 transition-colors cursor-pointer"
              >
                Cancel
              </button>

              <button
                id="save-edit-mod-btn"
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shadow-lg shadow-indigo-600/20 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Saving Changes...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Save Changes</span>
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
