import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Sparkles,
  Camera,
  Film,
  Send,
  Download,
  Copy,
  Check,
  RefreshCw,
  Sliders,
  ChevronDown,
  Layers,
  Wand2,
  ArrowLeft,
  X,
  Play,
  Maximize2,
  ShieldCheck,
  Zap,
  ArrowUp,
  User,
} from 'lucide-react';
import { UserProfile, GenerationItem, GenerationMode, AspectRatio, VideoDuration, ChatMessage } from '../types';
import { MediaLightbox } from './MediaLightbox';

interface DashboardViewProps {
  user: UserProfile;
  onBackToHome: () => void;
  onSignOut: () => void;
}

const STYLE_PRESETS = [
  'Cinematic',
  'Photorealistic',
  'Cyberpunk',
  '3D Render',
  'Anime Manga',
  'Dark Fantasy',
  'Sci-Fi',
  'Vintage Film',
];

export const DashboardView: React.FC<DashboardViewProps> = ({ user, onBackToHome, onSignOut }) => {
  // Generation Settings
  const [mode, setMode] = useState<GenerationMode>('photo');
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('16:9');
  const [videoDuration, setVideoDuration] = useState<VideoDuration>('5s');
  const [selectedStyle, setSelectedStyle] = useState<string>('Cinematic');
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  // Chat and Generation history
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [recentGenerations, setRecentGenerations] = useState<GenerationItem[]>([]);
  const [lightboxItem, setLightboxItem] = useState<GenerationItem | null>(null);

  // UI States
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showHistorySidebar, setShowHistorySidebar] = useState(false);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Load previous generation history on mount
  useEffect(() => {
    fetch('/api/generate/history')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.generations) {
          setRecentGenerations(data.generations);
        }
      })
      .catch((err) => console.error('Failed to load history:', err));
  }, []);

  // Auto-scroll chat on updates
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handle direct file download
  const handleDownload = (item: GenerationItem, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const cleanName = item.prompt
      .replace(/[^a-zA-Z0-9]/g, '-')
      .slice(0, 30)
      .toLowerCase();
    const filename = `gutiai-${item.mode}-${cleanName || 'output'}`;
    const downloadUrl = `/api/generate/proxy-download?url=${encodeURIComponent(item.mediaUrl)}&filename=${filename}`;

    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCopyPrompt = (text: string, id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleEnhancePrompt = () => {
    if (!prompt.trim()) return;
    const enhancers = [
      'cinematic depth of field, 8k resolution, volumetric lighting, award-winning visual composition',
      'ultra-detailed textures, photorealistic render, masterwork, dramatic atmosphere',
      'hyperrealistic details, octane render, beautiful contrast, professional color grading',
    ];
    const randomEnhancer = enhancers[Math.floor(Math.random() * enhancers.length)];
    setPrompt((prev) => `${prev.trim()}, ${randomEnhancer}`);
  };

  const handleStartGeneration = async (promptToUse?: string) => {
    const textPrompt = (promptToUse || prompt).trim();
    if (!textPrompt || isGenerating) return;

    setIsGenerating(true);
    setPrompt('');

    const userMsgId = `user_${Date.now()}`;
    const assistantMsgId = `assistant_${Date.now()}`;

    // Add user message
    const userMessage: ChatMessage = {
      id: userMsgId,
      role: 'user',
      content: textPrompt,
      timestamp: new Date().toISOString(),
    };

    // Temporary placeholder generation
    const pendingItem: GenerationItem = {
      id: `temp_${Date.now()}`,
      mode,
      duration: mode === 'video' ? videoDuration : undefined,
      prompt: textPrompt,
      style: selectedStyle,
      aspectRatio,
      mediaUrl: '',
      progress: 5,
      status: 'generating',
      createdAt: new Date().toISOString(),
      engine: 'AI Generative Engine',
      modelTitle: mode === 'photo' ? 'AI Photo Studio' : 'AI Video Studio',
    };

    const assistantMessage: ChatMessage = {
      id: assistantMsgId,
      role: 'assistant',
      timestamp: new Date().toISOString(),
      generation: pendingItem,
    };

    setMessages((prev) => [...prev, userMessage, assistantMessage]);

    // Animate progress percentage
    let simulatedProgress = 10;
    const progressInterval = setInterval(() => {
      simulatedProgress = Math.min(simulatedProgress + Math.floor(Math.random() * 12) + 5, 92);
      setMessages((prev) =>
        prev.map((msg) => {
          if (msg.id === assistantMsgId && msg.generation) {
            return {
              ...msg,
              generation: {
                ...msg.generation,
                progress: simulatedProgress,
              },
            };
          }
          return msg;
        })
      );
    }, 450);

    try {
      const res = await fetch('/api/generate/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: textPrompt,
          mode,
          duration: mode === 'video' ? videoDuration : undefined,
          style: selectedStyle,
          aspectRatio,
          userId: user.id,
        }),
      });

      const data = await res.json();
      clearInterval(progressInterval);

      if (!res.ok || !data.generation) {
        throw new Error(data.error || 'Generation failed');
      }

      const completedItem: GenerationItem = data.generation;

      // Finish at 100%
      setMessages((prev) =>
        prev.map((msg) => {
          if (msg.id === assistantMsgId) {
            return {
              ...msg,
              generation: {
                ...completedItem,
                progress: 100,
                status: 'completed',
              },
            };
          }
          return msg;
        })
      );

      if (completedItem.mediaUrl && completedItem.mediaUrl.trim()) {
        setRecentGenerations((prev) => [completedItem, ...prev]);
      }
    } catch (err: any) {
      clearInterval(progressInterval);
      console.error('Generation failed:', err);
      setMessages((prev) =>
        prev.map((msg) => {
          if (msg.id === assistantMsgId && msg.generation) {
            return {
              ...msg,
              generation: {
                ...msg.generation,
                status: 'failed',
                errorMessage: err.message || 'Generation error',
              },
            };
          }
          return msg;
        })
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleStartGeneration();
    }
  };

  return (
    <div id="main-dashboard-root" className="min-h-screen flex flex-col bg-[#080B12] text-slate-100 relative overflow-hidden">
      {/* Top Navbar */}
      <header className="h-16 border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between z-30 shrink-0">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBackToHome}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-semibold text-slate-300 hover:text-white transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Home</span>
          </button>

          <div className="flex items-center gap-2">
            <span className="font-display font-extrabold text-lg text-white tracking-tight">
              gutiai <span className="text-indigo-400 font-medium text-sm">Studio</span>
            </span>
          </div>
        </div>

        {/* Right Nav Actions */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300">
              <User className="w-4 h-4 text-slate-300" />
            </div>
            <div className="hidden sm:block text-left">
              <p className="text-xs font-semibold text-white leading-tight">{user.name}</p>
              <p className="text-[10px] text-slate-400 leading-tight">{user.email}</p>
            </div>
            <button
              type="button"
              onClick={onSignOut}
              className="text-xs text-rose-400 hover:text-rose-300 font-medium ml-2 cursor-pointer"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      {/* Main Workspace Body */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Sidebar: Controls & History */}
        <aside
          className={`w-72 bg-slate-950/90 border-r border-slate-800/80 flex flex-col shrink-0 transition-all z-20 ${
            showHistorySidebar ? 'fixed inset-y-16 left-0 z-40' : 'hidden md:flex'
          }`}
        >
          {/* New Creation Action */}
          <div className="p-4 border-b border-slate-800/80">
            <button
              type="button"
              onClick={() => {
                setMessages([]);
                setPrompt('');
                if (textareaRef.current) textareaRef.current.focus();
              }}
              className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white text-xs font-bold transition-all shadow-md shadow-indigo-600/30 flex items-center justify-center gap-2 cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              <span>+ New Creation</span>
            </button>
          </div>

          {/* Quick Settings Panel */}
          <div className="p-4 border-b border-slate-800/80 space-y-4 text-left">
            {/* Mode Selector */}
            <div>
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                Generation Mode
              </label>
              <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-900 rounded-xl border border-slate-800">
                <button
                  type="button"
                  onClick={() => setMode('photo')}
                  className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    mode === 'photo'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>Photo</span>
                </button>
                <button
                  type="button"
                  onClick={() => setMode('video')}
                  className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    mode === 'video'
                      ? 'bg-purple-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Film className="w-3.5 h-3.5" />
                  <span>Video</span>
                </button>
              </div>
            </div>

            {/* Video Duration (when in video mode) */}
            {mode === 'video' && (
              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                  Video Duration
                </label>
                <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-900 rounded-xl border border-slate-800">
                  <button
                    type="button"
                    onClick={() => setVideoDuration('5s')}
                    className={`py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      videoDuration === '5s'
                        ? 'bg-purple-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    5 second
                  </button>
                  <button
                    type="button"
                    onClick={() => setVideoDuration('10s')}
                    className={`py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      videoDuration === '10s'
                        ? 'bg-purple-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    10 second
                  </button>
                </div>
              </div>
            )}

            {/* Aspect Ratio */}
            <div>
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                Aspect Ratio
              </label>
              <div className="grid grid-cols-4 gap-1.5">
                {(['1:1', '16:9', '9:16', '4:3'] as AspectRatio[]).map((ratio) => (
                  <button
                    key={ratio}
                    type="button"
                    onClick={() => setAspectRatio(ratio)}
                    className={`py-1.5 rounded-lg text-[11px] font-semibold border transition-all cursor-pointer ${
                      aspectRatio === ratio
                        ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300 font-bold'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {ratio}
                  </button>
                ))}
              </div>
            </div>

            {/* Style Preset */}
            <div>
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                Style Preset
              </label>
              <select
                value={selectedStyle}
                onChange={(e) => setSelectedStyle(e.target.value)}
                className="w-full py-2 px-3 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 transition-colors cursor-pointer"
              >
                {STYLE_PRESETS.map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Recent Gallery List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
              <span>Recent Gallery</span>
              <span className="text-slate-500 font-normal">({recentGenerations.length})</span>
            </p>

            {recentGenerations.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-500">
                No creations yet. Enter a prompt to generate!
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {recentGenerations
                  .filter((gen) => Boolean(gen.mediaUrl && gen.mediaUrl.trim()))
                  .map((gen) => (
                  <div
                    key={gen.id}
                    onClick={() => setLightboxItem(gen)}
                    className="group relative aspect-square rounded-xl overflow-hidden bg-slate-900 border border-slate-800 hover:border-indigo-500/50 cursor-pointer transition-all shadow-sm"
                  >
                    {gen.mode === 'video' ? (
                      <video
                        src={gen.mediaUrl || undefined}
                        className="w-full h-full object-cover"
                        muted
                        playsInline
                      />
                    ) : (
                      <img
                        src={gen.mediaUrl || undefined}
                        alt={gen.prompt}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    )}

                    {/* Mode badge overlay */}
                    <div className="absolute top-1.5 left-1.5 p-1 rounded-md bg-black/60 backdrop-blur-sm text-white">
                      {gen.mode === 'video' ? (
                        <Film className="w-3 h-3 text-purple-400" />
                      ) : (
                        <Camera className="w-3 h-3 text-indigo-400" />
                      )}
                    </div>

                    {/* Hover download button */}
                    <button
                      type="button"
                      onClick={(e) => handleDownload(gen, e)}
                      className="absolute bottom-1.5 right-1.5 p-1.5 rounded-lg bg-indigo-600/90 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-indigo-500 shadow-lg"
                      title="Download"
                    >
                      <Download className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </aside>

        {/* Center Main Chat Area */}
        <main className="flex-1 flex flex-col overflow-hidden relative bg-radial from-indigo-950/10 via-transparent to-transparent">
          {/* Scrollable Chat Feed */}
          <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-6 space-y-6">
            {messages.length === 0 ? (
              /* Welcoming State */
              <div className="max-w-2xl mx-auto my-auto py-10 sm:py-16 text-center space-y-6 animate-in fade-in duration-500">
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-semibold backdrop-blur-sm">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                  <span>AI Generative Studio</span>
                </div>

                <div>
                  <h1 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight font-display leading-tight">
                    What will you create today?
                  </h1>
                  <p className="text-sm sm:text-base text-slate-400 mt-2 max-w-lg mx-auto font-normal">
                    Transform words into 8K photorealistic images or cinematic looping videos.
                  </p>
                </div>
              </div>
            ) : (
              /* Chat Conversation Thread */
              <div className="max-w-3xl mx-auto space-y-6">
                {messages.map((msg) => (
                  <div key={msg.id} className="space-y-3">
                    {/* User Prompt Bubble */}
                    {msg.role === 'user' && (
                      <div className="flex justify-end">
                        <div className="max-w-xl p-4 rounded-2xl rounded-tr-sm bg-indigo-600/90 text-white text-xs sm:text-sm leading-relaxed shadow-lg shadow-indigo-600/20">
                          {msg.content}
                        </div>
                      </div>
                    )}

                    {/* Assistant Generation Output */}
                    {msg.role === 'assistant' && msg.generation && (
                      <div className="flex justify-start">
                        <div className="w-full max-w-2xl bg-slate-900/95 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-2xl text-left space-y-4">
                          {/* Generation Status Header */}
                          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                            <div className="flex items-center gap-2">
                              <span className="p-1.5 rounded-lg bg-indigo-600/20 text-indigo-400">
                                {msg.generation.mode === 'video' ? (
                                  <Film className="w-4 h-4" />
                                ) : (
                                  <Camera className="w-4 h-4" />
                                )}
                              </span>
                              <div>
                                <h4 className="text-xs sm:text-sm font-bold text-white">
                                  {msg.generation.mode === 'video' ? 'Video Generation' : 'Photo Generation'}
                                </h4>
                                <p className="text-[11px] text-slate-400">
                                  {msg.generation.modelTitle} • {msg.generation.aspectRatio}
                                  {msg.generation.duration && (
                                    <span> • {msg.generation.duration === '10s' ? '10s' : '5s'}</span>
                                  )}
                                </p>
                              </div>
                            </div>

                            <span
                              className={`text-xs font-semibold px-2.5 py-1 rounded-lg ${
                                msg.generation.status === 'completed'
                                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                                  : msg.generation.status === 'failed'
                                  ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                                  : 'bg-indigo-500/10 text-indigo-300 border border-indigo-500/30'
                              }`}
                            >
                              {msg.generation.status === 'completed'
                                ? 'Complete'
                                : msg.generation.status === 'failed'
                                ? 'Failed'
                                : `${msg.generation.progress}%`}
                            </span>
                          </div>

                          {/* GENERATING STATE: Live Animation & Percentage Counter */}
                          {msg.generation.status === 'generating' && (
                            <div className="py-8 sm:py-12 flex flex-col items-center justify-center text-center space-y-5 bg-slate-950/60 rounded-xl border border-slate-800/80">
                              {/* Pulsing Animated Shutter Ring */}
                              <div className="relative w-20 h-20 flex items-center justify-center">
                                <motion.div
                                  animate={{ rotate: 360 }}
                                  transition={{ repeat: Infinity, duration: 4, ease: 'linear' }}
                                  className="absolute inset-0 rounded-full border-2 border-indigo-500/20 border-t-indigo-500 border-r-purple-500"
                                />
                                <motion.div
                                  animate={{ scale: [1, 1.15, 1] }}
                                  transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
                                  className="w-12 h-12 rounded-full bg-indigo-600/30 backdrop-blur-md border border-indigo-400/50 flex items-center justify-center text-indigo-300"
                                >
                                  {msg.generation.mode === 'video' ? (
                                    <Film className="w-5 h-5 animate-pulse" />
                                  ) : (
                                    <Camera className="w-5 h-5 animate-pulse" />
                                  )}
                                </motion.div>
                              </div>

                              {/* Live Progress Bar & Percentage */}
                              <div className="w-full max-w-xs space-y-2">
                                <div className="flex items-center justify-between text-xs font-bold text-slate-300">
                                  <span>
                                    {msg.generation.mode === 'video'
                                      ? 'Generating Video...'
                                      : 'Generating Photo...'}
                                  </span>
                                  <span className="font-mono text-indigo-400 text-sm">
                                    {msg.generation.progress}%
                                  </span>
                                </div>
                                <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                                  <motion.div
                                    className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-400 rounded-full"
                                    animate={{ width: `${msg.generation.progress}%` }}
                                    transition={{ duration: 0.3 }}
                                  />
                                </div>
                                <p className="text-[11px] text-slate-400">
                                  {msg.generation.progress < 30
                                    ? 'Initializing generative neural model...'
                                    : msg.generation.progress < 60
                                    ? 'Synthesizing scene & latent frames...'
                                    : msg.generation.progress < 90
                                    ? 'Rendering 8K visual details...'
                                    : 'Finalizing masterpiece...'}
                                </p>
                              </div>
                            </div>
                          )}

                          {/* COMPLETED STATE: Generated Photo or Video */}
                          {msg.generation.status === 'completed' && Boolean(msg.generation.mediaUrl && msg.generation.mediaUrl.trim()) && (
                            <div className="space-y-3">
                              {/* Clickable Media Display */}
                              <div
                                onClick={() => setLightboxItem(msg.generation!)}
                                className="group relative rounded-xl overflow-hidden bg-black/60 border border-slate-800 hover:border-indigo-500/70 cursor-pointer shadow-xl transition-all"
                              >
                                {msg.generation.mode === 'video' ? (
                                  <video
                                    src={msg.generation.mediaUrl || undefined}
                                    controls
                                    autoPlay
                                    loop
                                    playsInline
                                    className="w-full max-h-[460px] object-contain rounded-xl"
                                  />
                                ) : (
                                  <img
                                    src={msg.generation.mediaUrl || undefined}
                                    alt={msg.generation.prompt}
                                    className="w-full max-h-[460px] object-contain rounded-xl group-hover:scale-[1.01] transition-transform duration-300"
                                  />
                                )}

                                {/* Hover Enlarge Overlay */}
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                                  <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-black/80 text-white text-xs font-semibold backdrop-blur-md">
                                    <Maximize2 className="w-3.5 h-3.5" />
                                    <span>Click to Preview & Enlarge</span>
                                  </span>
                                </div>
                              </div>

                              {/* Bottom Action Bar (Download & Copy Prompt) */}
                              <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                                <div className="flex items-center gap-2">
                                  {/* Direct Download Button */}
                                  <button
                                    id="btn-card-download"
                                    type="button"
                                    onClick={(e) => handleDownload(msg.generation!, e)}
                                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white text-xs font-bold transition-all shadow-md shadow-indigo-600/30 cursor-pointer"
                                  >
                                    <Download className="w-3.5 h-3.5" />
                                    <span>
                                      Download {msg.generation.mode === 'video' ? 'Video' : 'Photo'}
                                    </span>
                                  </button>

                                  {/* Copy Prompt Button */}
                                  <button
                                    type="button"
                                    onClick={(e) =>
                                      handleCopyPrompt(msg.generation!.prompt, msg.generation!.id, e)
                                    }
                                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-medium transition-colors cursor-pointer"
                                  >
                                    {copiedId === msg.generation.id ? (
                                      <>
                                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                                        <span className="text-emerald-400 font-semibold">Copied!</span>
                                      </>
                                    ) : (
                                      <>
                                        <Copy className="w-3.5 h-3.5" />
                                        <span>Copy Prompt</span>
                                      </>
                                    )}
                                  </button>
                                </div>

                                <button
                                  type="button"
                                  onClick={() => handleStartGeneration(msg.generation!.prompt)}
                                  className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1 cursor-pointer"
                                >
                                  <RefreshCw className="w-3 h-3" />
                                  <span>Remix</span>
                                </button>
                              </div>
                            </div>
                          )}

                          {/* FAILED STATE */}
                          {msg.generation.status === 'failed' && (
                            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
                              {msg.generation.errorMessage || 'Generation failed. Please try again.'}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>
            )}
          </div>

          {/* Bottom Floating Meta AI Style Chat Box */}
          <div className="p-3 sm:p-5 bg-gradient-to-t from-[#080B12] via-[#080B12]/95 to-transparent border-t border-white/[0.06] z-20 shrink-0">
            <div className="max-w-3xl mx-auto">
              {/* Meta AI Styled Capsule Box */}
              <div className="relative rounded-[28px] bg-[#14161f]/95 border border-white/[0.09] shadow-[0_12px_45px_rgba(0,0,0,0.65)] backdrop-blur-2xl transition-all duration-200 focus-within:border-indigo-500/50 focus-within:ring-2 focus-within:ring-indigo-500/20 p-2.5 sm:p-3.5 space-y-2">
                {/* Meta AI Input Controls Header */}
                <div className="flex items-center justify-between gap-2 px-1 text-xs">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {/* Mode segmented toggle */}
                    <div className="inline-flex items-center p-0.5 rounded-full bg-white/[0.05] border border-white/[0.08]">
                      <button
                        type="button"
                        onClick={() => setMode('photo')}
                        className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold transition-all cursor-pointer ${
                          mode === 'photo'
                            ? 'bg-gradient-to-r from-indigo-600 to-indigo-500 text-white shadow-sm'
                            : 'text-zinc-400 hover:text-white'
                        }`}
                      >
                        <Camera className="w-3 h-3" />
                        <span>Photo</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setMode('video')}
                        className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold transition-all cursor-pointer ${
                          mode === 'video'
                            ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-sm'
                            : 'text-zinc-400 hover:text-white'
                        }`}
                      >
                        <Film className="w-3 h-3" />
                        <span>Video</span>
                      </button>
                    </div>

                    {/* Video Duration Option in Chatbox (5 second & 10 second) */}
                    {mode === 'video' && (
                      <div className="inline-flex items-center p-0.5 rounded-full bg-white/[0.05] border border-white/[0.08] animate-in fade-in duration-150">
                        <button
                          type="button"
                          onClick={() => setVideoDuration('5s')}
                          className={`px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all cursor-pointer ${
                            videoDuration === '5s'
                              ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-sm'
                              : 'text-zinc-400 hover:text-white'
                          }`}
                        >
                          5 second
                        </button>
                        <button
                          type="button"
                          onClick={() => setVideoDuration('10s')}
                          className={`px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all cursor-pointer ${
                            videoDuration === '10s'
                              ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-sm'
                              : 'text-zinc-400 hover:text-white'
                          }`}
                        >
                          10 second
                        </button>
                      </div>
                    )}

                    {/* Aspect Ratio Pill Selector */}
                    <div className="relative">
                      <select
                        value={aspectRatio}
                        onChange={(e) => setAspectRatio(e.target.value as AspectRatio)}
                        className="appearance-none bg-white/[0.05] hover:bg-white/[0.08] border border-white/[0.08] text-zinc-300 text-[11px] font-medium rounded-full pl-2.5 pr-6 py-1 focus:outline-none transition-colors cursor-pointer"
                      >
                        <option value="16:9" className="bg-[#14161f] text-white">16:9 Landscape</option>
                        <option value="1:1" className="bg-[#14161f] text-white">1:1 Square</option>
                        <option value="9:16" className="bg-[#14161f] text-white">9:16 Portrait</option>
                        <option value="4:3" className="bg-[#14161f] text-white">4:3 Standard</option>
                      </select>
                      <ChevronDown className="w-2.5 h-2.5 text-zinc-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>

                    {/* Style Preset Pill Selector */}
                    <div className="relative hidden sm:block">
                      <select
                        value={selectedStyle}
                        onChange={(e) => setSelectedStyle(e.target.value)}
                        className="appearance-none bg-white/[0.05] hover:bg-white/[0.08] border border-white/[0.08] text-zinc-300 text-[11px] font-medium rounded-full pl-2.5 pr-6 py-1 focus:outline-none transition-colors cursor-pointer"
                      >
                        {STYLE_PRESETS.map((st) => (
                          <option key={st} value={st} className="bg-[#14161f] text-white">
                            {st}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="w-2.5 h-2.5 text-zinc-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                  </div>

                  {/* Enhance Prompt pill */}
                  <button
                    type="button"
                    onClick={handleEnhancePrompt}
                    disabled={!prompt.trim()}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-medium text-indigo-300 hover:text-white bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/25 disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer shrink-0"
                  >
                    <Wand2 className="w-3 h-3 text-indigo-400" />
                    <span>Enhance</span>
                  </button>
                </div>

                {/* Textarea + Meta AI Send Circle */}
                <div className="flex items-end gap-2 pt-1 px-1">
                  <textarea
                    id="dashboard-prompt-input"
                    ref={textareaRef}
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={
                      mode === 'video'
                        ? `Describe a ${videoDuration === '10s' ? '10-second' : '5-second'} video to generate (e.g., A dog is walking alone in a forest)...`
                        : 'Describe a photo to generate (e.g., A cybernetic samurai in rainy neo-Tokyo)...'
                    }
                    rows={2}
                    className="flex-1 bg-transparent border-0 text-white placeholder:text-zinc-500 text-xs sm:text-sm resize-none focus:outline-none p-1.5 leading-relaxed max-h-36 overflow-y-auto"
                  />

                  {/* Meta AI signature round Send button */}
                  <button
                    id="btn-submit-prompt"
                    type="button"
                    disabled={!prompt.trim() || isGenerating}
                    onClick={() => handleStartGeneration()}
                    className={`w-10 h-10 rounded-full flex items-center justify-center transition-all cursor-pointer shrink-0 mb-0.5 ${
                      prompt.trim() && !isGenerating
                        ? 'bg-gradient-to-tr from-indigo-500 via-indigo-600 to-violet-500 text-white shadow-lg shadow-indigo-600/40 hover:scale-105 active:scale-95'
                        : 'bg-white/[0.05] border border-white/[0.08] text-zinc-600 cursor-not-allowed'
                    }`}
                    title="Send Prompt"
                  >
                    <ArrowUp className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Media Lightbox with Download Option */}
      <MediaLightbox item={lightboxItem} onClose={() => setLightboxItem(null)} />
    </div>
  );
};
