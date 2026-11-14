import { useState, useRef, useEffect } from 'react';
import { FeedPost, FeedComment, User } from '../../types';
import { X, Send, MessageSquare } from 'lucide-react';

interface PostCommentsModalProps {
  post: FeedPost;
  currentUser: User;
  onClose: () => void;
  onAddComment: (postId: string, text: string) => void;
  onViewUserProfile?: (userId: string) => void;
}

export function PostCommentsModal({
  post,
  currentUser,
  onClose,
  onAddComment,
  onViewUserProfile
}: PostCommentsModalProps) {
  const [newComment, setNewComment] = useState('');
  const commentsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [post.comments?.length]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    onAddComment(post.id, newComment.trim());
    setNewComment('');
  };

  const formatCommentTime = (dateStr: string) => {
    try {
      const diffMs = Date.now() - new Date(dateStr).getTime();
      const diffMin = Math.floor(diffMs / (60 * 1000));
      if (diffMin < 1) return 'Agora';
      if (diffMin < 60) return `${diffMin}m`;
      const diffHrs = Math.floor(diffMin / 60);
      if (diffHrs < 24) return `${diffHrs}h`;
      const diffDays = Math.floor(diffHrs / 24);
      return `${diffDays}d`;
    } catch {
      return '1h';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm animate-fade-in select-none">
      <div className="w-full sm:max-w-[400px] bg-[#071421] border-t sm:border border-slate-800 rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col max-h-[85vh] h-[650px] overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-slate-800/80 bg-[#05111a] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-emerald-400" />
            <h3 className="text-xs font-black text-white uppercase tracking-wider">
              Comentários ({post.comments?.length || 0})
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-full bg-slate-900 text-slate-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Post Caption Summary Header */}
        <div className="p-3 bg-[#061423] border-b border-slate-800/50 flex items-start gap-2.5 shrink-0">
          <img 
            src={post.userAvatar} 
            alt={post.userName} 
            className="w-8 h-8 rounded-full object-cover shrink-0 ring-1 ring-emerald-500/50" 
          />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-white">{post.userName}</span>
              <span className="text-[10px] text-slate-400 font-mono">{post.userHandle}</span>
            </div>
            <p className="text-[11px] text-slate-300 line-clamp-2 mt-0.5 leading-tight">
              {post.text}
            </p>
          </div>
        </div>

        {/* Comments Scrollable List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3.5 no-scrollbar">
          {(!post.comments || post.comments.length === 0) ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-500">
              <MessageSquare className="w-8 h-8 text-slate-700 mb-2 stroke-[1.5]" />
              <p className="text-xs font-medium">Nenhum comentário ainda.</p>
              <p className="text-[11px] text-slate-600 mt-0.5">Seja o primeiro pescador a comentar!</p>
            </div>
          ) : (
            post.comments.map(c => (
              <div key={c.id} className="flex items-start gap-2.5 group">
                <img
                  src={c.userAvatar}
                  alt={c.userName}
                  onClick={() => {
                    if (onViewUserProfile) {
                      onClose();
                      onViewUserProfile(c.userId);
                    }
                  }}
                  className="w-8 h-8 rounded-full object-cover shrink-0 ring-1 ring-slate-700 cursor-pointer hover:ring-emerald-400 transition-all"
                />
                <div className="flex-1 min-w-0">
                  <div className="bg-[#091a2a] border border-slate-800/80 rounded-2xl p-2.5">
                    <div className="flex items-center justify-between gap-1 mb-0.5">
                      <span 
                        onClick={() => {
                          if (onViewUserProfile) {
                            onClose();
                            onViewUserProfile(c.userId);
                          }
                        }}
                        className="text-xs font-extrabold text-white hover:text-emerald-300 cursor-pointer truncate"
                      >
                        {c.userName}
                      </span>
                      <span className="text-[9px] text-slate-500 font-mono shrink-0">
                        {formatCommentTime(c.createdAt)}
                      </span>
                    </div>
                    <p className="text-xs text-slate-200 leading-snug break-words">
                      {c.text}
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}
          <div ref={commentsEndRef} />
        </div>

        {/* Fixed Input Bar */}
        <form onSubmit={handleSend} className="p-3 bg-[#05111a] border-t border-slate-800/80 flex items-center gap-2 shrink-0">
          <img 
            src={currentUser.avatar} 
            alt={currentUser.name} 
            className="w-7 h-7 rounded-full object-cover shrink-0 ring-1 ring-emerald-500/50" 
          />
          <input
            type="text"
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder={`Comentar como ${currentUser.name}...`}
            className="flex-1 bg-[#091a2a] border border-slate-800 focus:border-emerald-500 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 outline-none transition-colors"
          />
          <button
            type="submit"
            disabled={!newComment.trim()}
            className="p-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-slate-950 disabled:opacity-40 transition-all cursor-pointer shrink-0"
            title="Enviar comentário"
          >
            <Send className="w-4 h-4 stroke-[2.5]" />
          </button>
        </form>
      </div>
    </div>
  );
}
