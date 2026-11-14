import { useState, useEffect } from 'react';
import { Story, User } from '../../types';
import { X, Heart, Send, ChevronLeft, ChevronRight, Compass } from 'lucide-react';

interface StoryViewerModalProps {
  stories: Story[];
  initialIndex?: number;
  currentUser: User;
  onClose: () => void;
  onViewUserProfile?: (userId: string) => void;
}

export function StoryViewerModal({
  stories,
  initialIndex = 0,
  currentUser,
  onClose,
  onViewUserProfile
}: StoryViewerModalProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [reactionText, setReactionText] = useState('');
  const [hasLiked, setHasLiked] = useState(false);
  const [showHeartAnim, setShowHeartAnim] = useState(false);

  const currentStory = stories[currentIndex] || stories[0];
  const DURATION_MS = 6000; // 6 seconds per story

  useEffect(() => {
    if (!currentStory) return;
    setProgress(0);
    setHasLiked(false);
  }, [currentIndex, currentStory]);

  useEffect(() => {
    if (isPaused) return;

    const interval = 50; // update every 50ms
    const step = (interval / DURATION_MS) * 100;

    const timer = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          if (currentIndex < stories.length - 1) {
            setCurrentIndex(c => c + 1);
            return 0;
          } else {
            clearInterval(timer);
            onClose();
            return 100;
          }
        }
        return prev + step;
      });
    }, interval);

    return () => clearInterval(timer);
  }, [currentIndex, isPaused, stories.length, onClose]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') handleNext();
      if (e.key === 'ArrowLeft') handlePrev();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, stories.length]);

  const handleNext = () => {
    if (currentIndex < stories.length - 1) {
      setCurrentIndex(c => c + 1);
      setProgress(0);
    } else {
      onClose();
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(c => c - 1);
      setProgress(0);
    }
  };

  const handleSendReaction = (emoji: string) => {
    setShowHeartAnim(true);
    setTimeout(() => setShowHeartAnim(false), 900);
    setReactionText(`Reagiu com ${emoji}`);
    setTimeout(() => setReactionText(''), 1500);
  };

  const formatTimeAgo = (dateStr: string) => {
    try {
      const diffMs = Date.now() - new Date(dateStr).getTime();
      const diffHrs = Math.floor(diffMs / (3600 * 1000));
      if (diffHrs < 1) return 'Agora mesmo';
      if (diffHrs === 1) return 'Há 1 hora';
      return `Há ${diffHrs} horas`;
    } catch {
      return 'Há 2 horas';
    }
  };

  if (!currentStory) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-md select-none animate-fade-in">
      {/* Story Card Container */}
      <div 
        className="relative w-full max-w-[400px] h-[90vh] max-h-[800px] bg-slate-950 rounded-3xl overflow-hidden flex flex-col shadow-2xl border border-slate-800"
        onMouseDown={() => setIsPaused(true)}
        onMouseUp={() => setIsPaused(false)}
        onTouchStart={() => setIsPaused(true)}
        onTouchEnd={() => setIsPaused(false)}
      >
        {/* Progress Bars for all stories */}
        <div className="absolute top-3 inset-x-3 z-30 flex items-center gap-1.5">
          {stories.map((st, idx) => {
            let widthPercent = 0;
            if (idx < currentIndex) widthPercent = 100;
            else if (idx === currentIndex) widthPercent = progress;
            return (
              <div key={st.id} className="h-1 flex-1 bg-white/25 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-emerald-400 transition-all duration-75"
                  style={{ width: `${widthPercent}%` }}
                />
              </div>
            );
          })}
        </div>

        {/* Story Header */}
        <div className="absolute top-6 inset-x-3 z-30 flex items-center justify-between text-white drop-shadow-md">
          <div 
            onClick={() => {
              if (onViewUserProfile) {
                onClose();
                onViewUserProfile(currentStory.userId);
              }
            }}
            className="flex items-center gap-2.5 cursor-pointer group"
          >
            <div className="w-10 h-10 rounded-full p-0.5 ring-2 ring-emerald-400 overflow-hidden bg-slate-900 shrink-0">
              <img 
                src={currentStory.userAvatar} 
                alt={currentStory.userName} 
                className="w-full h-full object-cover rounded-full"
              />
            </div>
            <div>
              <div className="font-extrabold text-xs text-white group-hover:text-emerald-300 flex items-center gap-1">
                <span>{currentStory.userName}</span>
                {currentStory.category && (
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.2 rounded-md font-bold">
                    {currentStory.category}
                  </span>
                )}
              </div>
              <div className="text-[10px] text-slate-300 font-medium">
                {formatTimeAgo(currentStory.createdAt)}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full bg-black/40 hover:bg-black/70 text-white transition-colors cursor-pointer"
            title="Fechar Story"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Media Zone */}
        <div className="relative flex-1 w-full bg-black flex items-center justify-center overflow-hidden">
          {currentStory.mediaType === 'video' ? (
            <video 
              src={currentStory.mediaUrl} 
              autoPlay 
              playsInline 
              loop 
              className="w-full h-full object-cover"
            />
          ) : (
            <img 
              src={currentStory.mediaUrl} 
              alt={currentStory.caption || 'Story'} 
              className="w-full h-full object-cover"
            />
          )}

          {/* Floating Heart Animation */}
          {showHeartAnim && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none animate-ping">
              <Heart className="w-24 h-24 text-emerald-400 fill-emerald-400 drop-shadow-2xl" />
            </div>
          )}

          {/* Touch Click Zones: Left for prev, Right for next */}
          <div 
            onClick={handlePrev}
            className="absolute left-0 inset-y-0 w-1/3 z-20 cursor-pointer"
            title="Story anterior"
          />
          <div 
            onClick={handleNext}
            className="absolute right-0 inset-y-0 w-2/3 z-20 cursor-pointer"
            title="Próximo story"
          />

          {/* Caption Overlay */}
          {currentStory.caption && (
            <div className="absolute bottom-20 inset-x-0 p-4 bg-gradient-to-t from-black/90 via-black/50 to-transparent z-25 pointer-events-none">
              <p className="text-sm font-semibold text-white drop-shadow-md leading-snug">
                {currentStory.caption}
              </p>
            </div>
          )}
        </div>

        {/* Bottom Interaction Bar */}
        <div className="relative z-30 p-3 bg-slate-950/95 border-t border-slate-800 flex items-center gap-2">
          {/* Reaction Quick Pills */}
          <div className="flex items-center gap-1.5 shrink-0">
            {['❤️', '🔥', '🎣', '👏', '🏆'].map(emoji => (
              <button
                key={emoji}
                type="button"
                onClick={() => handleSendReaction(emoji)}
                className="w-8 h-8 rounded-full bg-slate-900 hover:bg-slate-800 flex items-center justify-center text-sm transition-transform active:scale-125 cursor-pointer"
              >
                {emoji}
              </button>
            ))}
          </div>

          {/* Reaction Message Feedback */}
          {reactionText && (
            <div className="text-[11px] font-bold text-emerald-400 animate-pulse truncate flex-1 text-right">
              {reactionText}
            </div>
          )}

          {/* Heart Button */}
          <button
            type="button"
            onClick={() => {
              setHasLiked(!hasLiked);
              handleSendReaction(hasLiked ? '💔' : '❤️');
            }}
            className={`p-2 rounded-full transition-colors cursor-pointer shrink-0 ${
              hasLiked ? 'text-emerald-400 bg-emerald-500/20' : 'text-slate-400 hover:text-white bg-slate-900'
            }`}
          >
            <Heart className={`w-5 h-5 ${hasLiked ? 'fill-emerald-400' : ''}`} />
          </button>
        </div>

        {/* Desktop Left/Right Navigation Arrows */}
        {currentIndex > 0 && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); handlePrev(); }}
            className="hidden sm:flex absolute left-2 top-1/2 -translate-y-1/2 z-30 p-2 rounded-full bg-black/60 hover:bg-black/90 text-white cursor-pointer shadow-lg"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        )}
        {currentIndex < stories.length - 1 && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); handleNext(); }}
            className="hidden sm:flex absolute right-2 top-1/2 -translate-y-1/2 z-30 p-2 rounded-full bg-black/60 hover:bg-black/90 text-white cursor-pointer shadow-lg"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        )}
      </div>
    </div>
  );
}
