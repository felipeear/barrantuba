import { useState } from 'react';
import { 
  X, 
  Heart, 
  MessageCircle, 
  Share2, 
  Bookmark, 
  MapPin, 
  EyeOff, 
  ChevronLeft, 
  ChevronRight, 
  Send, 
  Trash2, 
  Fish, 
  Scale, 
  Ruler, 
  Sparkles,
  ShieldCheck,
  Check
} from 'lucide-react';
import { FishCatch, User, CatchComment } from '../../types';

interface CatchDetailsModalProps {
  fishCatch: FishCatch;
  currentUser: User | null;
  onClose: () => void;
  onToggleLike: (catchId: string) => void;
  onAddComment: (catchId: string, comment: CatchComment) => void;
  onDeleteCatch?: (catchId: string) => void;
  onViewUserProfile?: (userId: string) => void;
}

export function CatchDetailsModal({
  fishCatch,
  currentUser,
  onClose,
  onToggleLike,
  onAddComment,
  onDeleteCatch,
  onViewUserProfile
}: CatchDetailsModalProps) {
  const [activeMediaIndex, setActiveMediaIndex] = useState(0);
  const [commentText, setCommentText] = useState('');
  const [isCopied, setIsCopied] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);

  const mediaList = fishCatch.mediaUrls && fishCatch.mediaUrls.length > 0 
    ? fishCatch.mediaUrls 
    : [fishCatch.photoUrl];

  const hasMultipleMedia = mediaList.length > 1;

  const isLikedByMe = currentUser && (
    fishCatch.likes?.includes(currentUser.id) || 
    (fishCatch.likesCount && fishCatch.likesCount > 0 && fishCatch.userId === currentUser.id)
  );

  const comments = fishCatch.comments || [];

  const handleSendComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim() || !currentUser) return;

    const newComment: CatchComment = {
      id: `comm_${Date.now()}`,
      userId: currentUser.id,
      userName: currentUser.name,
      userAvatar: currentUser.avatar,
      text: commentText.trim(),
      createdAt: new Date().toISOString()
    };

    onAddComment(fishCatch.id, newComment);
    setCommentText('');
  };

  const handleShare = async () => {
    const shareText = `Confira a captura de ${fishCatch.species} (${fishCatch.weightKg}kg) no Barrantuba Clube de Pesca!`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Captura no Barrantuba - ${fishCatch.species}`,
          text: shareText,
          url: window.location.href
        });
        return;
      } catch {
        // Fallback
      }
    }
    navigator.clipboard.writeText(`${shareText} - ${window.location.href}`);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2500);
  };

  const canDelete = currentUser && (currentUser.role === 'admin' || currentUser.id === fishCatch.userId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/85 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-[410px] bg-[#07131e] border border-slate-800 rounded-3xl shadow-2xl overflow-hidden my-auto max-h-[94vh] flex flex-col text-slate-100 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header bar */}
        <div className="px-4 py-3 border-b border-slate-800/80 flex items-center justify-between bg-[#040e17] shrink-0">
          <button
            type="button"
            onClick={() => {
              onClose();
              onViewUserProfile?.(fishCatch.userId);
            }}
            className="flex items-center gap-2.5 text-left group cursor-pointer"
            title={`Ver perfil completo de ${fishCatch.userName}`}
          >
            <div className="relative">
              <img 
                src={fishCatch.userAvatar} 
                alt={fishCatch.userName} 
                className="w-9 h-9 rounded-full object-cover ring-2 ring-emerald-500/80 group-hover:ring-emerald-400 transition-all"
              />
            </div>
            <div>
              <div className="flex items-center gap-1.5 leading-none">
                <span className="font-bold text-xs sm:text-sm text-white group-hover:text-emerald-300 transition-colors">
                  {fishCatch.userName}
                </span>
                <span className="text-[9px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-1.5 py-0.2 rounded-full font-bold">
                  Ver Perfil
                </span>
              </div>
              <span className="text-[10px] text-slate-400">
                {new Date(fishCatch.capturedAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
              </span>
            </div>
          </button>

          <div className="flex items-center gap-1">
            {canDelete && onDeleteCatch && (
              <button
                type="button"
                onClick={() => {
                  if (confirm('Deseja excluir esta publicação de captura?')) {
                    onDeleteCatch(fishCatch.id);
                    onClose();
                  }
                }}
                className="p-1.5 rounded-full text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 transition-colors"
                title="Excluir captura"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Media & Carousel Container */}
        <div className="relative w-full bg-slate-950 h-72 sm:h-96 flex items-center justify-center overflow-hidden shrink-0">
          {fishCatch.videoUrl && activeMediaIndex === mediaList.length ? (
            <video 
              src={fishCatch.videoUrl} 
              controls 
              autoPlay 
              className="w-full h-full object-contain bg-black"
            />
          ) : (
            <img
              src={mediaList[activeMediaIndex] || fishCatch.photoUrl}
              alt={fishCatch.species}
              className="w-full h-full object-contain bg-black select-none"
            />
          )}

          {/* Carousel Arrows */}
          {hasMultipleMedia && (
            <>
              <button
                type="button"
                onClick={() => setActiveMediaIndex(prev => prev > 0 ? prev - 1 : mediaList.length - 1)}
                className="absolute left-2 p-1.5 rounded-full bg-slate-950/70 text-white hover:bg-slate-900 border border-slate-700 backdrop-blur-xs cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setActiveMediaIndex(prev => prev < mediaList.length - 1 ? prev + 1 : 0)}
                className="absolute right-2 p-1.5 rounded-full bg-slate-950/70 text-white hover:bg-slate-900 border border-slate-700 backdrop-blur-xs cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>

              {/* Dots Indicator */}
              <div className="absolute bottom-2 inset-x-0 flex items-center justify-center gap-1.5">
                {mediaList.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveMediaIndex(i)}
                    className={`h-1.5 rounded-full transition-all ${
                      i === activeMediaIndex ? 'w-5 bg-emerald-400' : 'w-1.5 bg-white/50'
                    }`}
                  />
                ))}
              </div>
            </>
          )}

          {/* Location badge */}
          <div className="absolute top-2.5 left-2.5">
            {fishCatch.isLocationPrivate ? (
              <span className="flex items-center gap-1 text-[10px] font-bold bg-slate-950/80 backdrop-blur-md text-amber-300 border border-amber-500/40 px-2.5 py-1 rounded-full shadow-lg">
                <EyeOff className="w-3 h-3 text-amber-400" />
                <span>Localização Privada</span>
              </span>
            ) : (
              <span className="flex items-center gap-1 text-[10px] font-bold bg-slate-950/80 backdrop-blur-md text-emerald-300 border border-emerald-500/40 px-2.5 py-1 rounded-full shadow-lg">
                <MapPin className="w-3 h-3 text-emerald-400" />
                <span>{fishCatch.spotName}</span>
              </span>
            )}
          </div>
        </div>

        {/* Social Actions Row */}
        <div className="px-4 py-2.5 border-b border-slate-800/80 flex items-center justify-between bg-[#05111c] shrink-0">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => onToggleLike(fishCatch.id)}
              className="flex items-center gap-1.5 text-slate-300 hover:text-rose-400 transition-colors cursor-pointer group"
            >
              <Heart 
                className={`w-5 h-5 transition-transform group-active:scale-125 ${
                  isLikedByMe ? 'fill-rose-500 text-rose-500' : 'text-slate-300'
                }`} 
              />
              <span className="text-xs font-bold text-white">
                {fishCatch.likesCount || 0}
              </span>
            </button>

            <button
              type="button"
              className="flex items-center gap-1.5 text-slate-300 hover:text-white transition-colors cursor-pointer"
            >
              <MessageCircle className="w-5 h-5" />
              <span className="text-xs font-bold text-white">
                {comments.length}
              </span>
            </button>

            <button
              type="button"
              onClick={handleShare}
              className="flex items-center gap-1 text-slate-300 hover:text-cyan-400 transition-colors cursor-pointer"
              title="Compartilhar"
            >
              {isCopied ? (
                <span className="text-[11px] font-bold text-emerald-400 flex items-center gap-1">
                  <Check className="w-4 h-4" /> Copiado!
                </span>
              ) : (
                <Share2 className="w-4 h-4" />
              )}
            </button>
          </div>

          <button
            type="button"
            onClick={() => setIsBookmarked(!isBookmarked)}
            className="text-slate-300 hover:text-amber-400 transition-colors"
            title="Salvar nos favoritos"
          >
            <Bookmark className={`w-5 h-5 ${isBookmarked ? 'fill-amber-400 text-amber-400' : ''}`} />
          </button>
        </div>

        {/* Scrollable Details & Comments */}
        <div className="p-4 overflow-y-auto space-y-4 flex-1">
          
          {/* Fish Specs Cards */}
          <div className="grid grid-cols-3 gap-2">
            <div className="p-2.5 rounded-2xl bg-[#061423] border border-slate-800 text-center">
              <span className="text-[10px] text-slate-400 block font-semibold">Espécie</span>
              <span className="text-xs font-black text-white truncate block mt-0.5">
                {fishCatch.species}
              </span>
            </div>
            <div className="p-2.5 rounded-2xl bg-[#061423] border border-slate-800 text-center">
              <span className="text-[10px] text-slate-400 block font-semibold">Peso</span>
              <span className="text-xs font-black text-emerald-400 truncate block mt-0.5">
                {fishCatch.weightKg} kg
              </span>
            </div>
            <div className="p-2.5 rounded-2xl bg-[#061423] border border-slate-800 text-center">
              <span className="text-[10px] text-slate-400 block font-semibold">Isca</span>
              <span className="text-xs font-black text-cyan-300 truncate block mt-0.5">
                {fishCatch.baitUsed}
              </span>
            </div>
          </div>

          {/* Description */}
          {fishCatch.description && (
            <div className="bg-[#05111c] border border-slate-800/80 rounded-2xl p-3 text-xs text-slate-200 leading-relaxed">
              <p>{fishCatch.description}</p>
            </div>
          )}

          {/* Comments List */}
          <div className="space-y-3 pt-1">
            <div className="text-xs font-bold text-slate-300 flex items-center justify-between">
              <span>Comentários ({comments.length})</span>
              <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">Comunidade</span>
            </div>

            {comments.length === 0 ? (
              <div className="p-4 rounded-xl bg-[#05111c] text-center text-xs text-slate-500">
                Seja o primeiro a parabenizar esta captura! 🎣
              </div>
            ) : (
              <div className="space-y-2.5">
                {comments.map((comm) => (
                  <div key={comm.id} className="flex items-start gap-2.5 text-xs bg-[#05111c] p-2.5 rounded-xl border border-slate-800/60">
                    <img 
                      src={comm.userAvatar} 
                      alt={comm.userName} 
                      className="w-7 h-7 rounded-full object-cover shrink-0 ring-1 ring-slate-700"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <span className="font-bold text-white text-[11px] truncate">{comm.userName}</span>
                        <span className="text-[9px] text-slate-500">
                          {new Date(comm.createdAt).toLocaleDateString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-slate-300 text-[11px] leading-relaxed break-words">{comm.text}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Comment input field */}
        {currentUser && (
          <form onSubmit={handleSendComment} className="p-3 border-t border-slate-800 bg-[#040e17] flex items-center gap-2 shrink-0">
            <input
              type="text"
              placeholder="Escreva um comentário sobre o peixe..."
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              className="flex-1 bg-[#061423] border border-slate-700/80 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />
            <button
              type="submit"
              disabled={!commentText.trim()}
              className="p-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-slate-950 font-bold cursor-pointer transition-colors"
            >
              <Send className="w-4 h-4 stroke-[2.5]" />
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
