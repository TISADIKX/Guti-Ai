import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Download, Copy, Sparkles, Film, Image as ImageIcon, Check, ExternalLink } from 'lucide-react';
import { GenerationItem } from '../types';

interface MediaLightboxProps {
  item: GenerationItem | null;
  onClose: () => void;
}

export const MediaLightbox: React.FC<MediaLightboxProps> = ({ item, onClose }) => {
  const [copied, setCopied] = React.useState(false);

  if (!item) return null;

  const handleCopyPrompt = () => {
    navigator.clipboard.writeText(item.prompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const cleanName = item.prompt
      .replace(/[^a-zA-Z0-9]/g, '-')
      .slice(0, 30)
      .toLowerCase();
    const filename = `gutiai-${item.mode}-${cleanName || 'generation'}`;
    const downloadUrl = `/api/generate/proxy-download?url=${encodeURIComponent(item.mediaUrl)}&filename=${filename}`;
    
    // Create an anchor and trigger download
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <AnimatePresence>
      <div id="media-lightbox-container" className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-slate-950/90 backdrop-blur-md"
        />

        {/* Content Container */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ type: 'spring', damping: 25, stiffness: 350 }}
          className="relative z-10 w-full max-w-5xl max-h-[92vh] bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col md:flex-row text-white"
        >
          {/* Close button */}
          <button
            type="button"
            onClick={onClose}
            className="absolute top-3 right-3 z-20 p-2 rounded-xl bg-slate-950/80 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Media Viewport */}
          <div className="flex-1 bg-black/60 flex items-center justify-center p-4 min-h-[300px] md:min-h-[500px] overflow-hidden relative">
            {item.mediaUrl && item.mediaUrl.trim() ? (
              item.mode === 'video' ? (
                <video
                  src={item.mediaUrl}
                  controls
                  autoPlay
                  loop
                  playsInline
                  className="max-h-[80vh] max-w-full rounded-xl object-contain shadow-2xl"
                />
              ) : (
                <img
                  src={item.mediaUrl}
                  alt={item.prompt}
                  className="max-h-[80vh] max-w-full rounded-xl object-contain shadow-2xl"
                />
              )
            ) : (
              <div className="text-center p-8 text-slate-400 text-sm">
                Media preview is unavailable.
              </div>
            )}
          </div>

          {/* Details Sidebar */}
          <div className="w-full md:w-80 lg:w-96 p-5 sm:p-6 bg-slate-900/95 flex flex-col justify-between border-t md:border-t-0 md:border-l border-slate-800 overflow-y-auto">
            <div className="space-y-4">
              {/* Header Badges */}
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-600/20 border border-indigo-500/30 text-indigo-300 text-xs font-semibold">
                  {item.mode === 'video' ? (
                    <>
                      <Film className="w-3.5 h-3.5" />
                      <span>Video</span>
                    </>
                  ) : (
                    <>
                      <ImageIcon className="w-3.5 h-3.5" />
                      <span>Photo</span>
                    </>
                  )}
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-slate-800/80 text-slate-300 text-xs font-medium">
                  {item.aspectRatio}
                </span>
                {item.style && (
                  <span className="px-2.5 py-1 rounded-lg bg-slate-800/80 text-slate-300 text-xs font-medium">
                    {item.style}
                  </span>
                )}
                {item.duration && (
                  <span className="px-2.5 py-1 rounded-lg bg-slate-800/80 text-purple-300 text-xs font-medium">
                    {item.duration === '10s' ? '10 second' : '5 second'}
                  </span>
                )}
              </div>

              {/* Engine metadata */}
              <div>
                <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  Model Engine
                </p>
                <p className="text-sm font-semibold text-white mt-0.5 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                  <span>{item.modelTitle || 'AI Creative Studio'}</span>
                </p>
              </div>

              {/* Prompt Text */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    Prompt
                  </p>
                  <button
                    type="button"
                    onClick={handleCopyPrompt}
                    className="inline-flex items-center gap-1 text-[11px] font-medium text-indigo-400 hover:text-indigo-300 cursor-pointer"
                  >
                    {copied ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-400" />
                        <span className="text-emerald-400">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 text-xs text-slate-200 leading-relaxed max-h-48 overflow-y-auto">
                  {item.prompt}
                </div>
              </div>

              {/* Generation Date */}
              <div className="text-[11px] text-slate-500">
                Created: {new Date(item.createdAt).toLocaleString()}
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="pt-5 mt-4 border-t border-slate-800/80 space-y-2">
              <button
                id="btn-download-media"
                type="button"
                onClick={handleDownload}
                className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white text-xs font-bold transition-all shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>
                  Download {item.mode === 'video' ? 'Video (.mp4)' : 'Photo (.png)'}
                </span>
              </button>

              <a
                href={item.mediaUrl}
                target="_blank"
                rel="noreferrer"
                className="w-full py-2 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white text-xs font-medium transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Open Raw Media in New Tab</span>
              </a>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
