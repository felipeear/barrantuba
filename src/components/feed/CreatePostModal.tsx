import { useState, useRef } from 'react';
import { User, FeedPost, FeedCategory } from '../../types';
import { X, Image as ImageIcon, Video, Sparkles, Hash, Loader2, Plus } from 'lucide-react';

interface CreatePostModalProps {
  currentUser: User;
  onClose: () => void;
  onSavePost: (post: FeedPost) => Promise<{ ok: boolean; error?: string } | void> | void;
}

export function CreatePostModal({
  currentUser,
  onClose,
  onSavePost
}: CreatePostModalProps) {
  const [text, setText] = useState('');
  const [category, setCategory] = useState<FeedCategory>('Pesca');
  const [mediaUrls, setMediaUrls] = useState<string[]>([]);
  const [mediaType, setMediaType] = useState<'image' | 'video'>('image');
  const [hashtagsStr, setHashtagsStr] = useState('#Pesca #Natureza #Barrantuba');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const SUGGESTED_TAGS = [
    '#Pesca', '#Natureza', '#VidaBoa', '#CorridaCDL', '#Esporte', 
    '#AventuraSC', '#Ecoturismo', '#Tucunare', '#Robalo', '#PesqueESolte'
  ];

  const handleAddTag = (tag: string) => {
    if (!hashtagsStr.includes(tag)) {
      setHashtagsStr(prev => `${prev.trim()} ${tag}`.trim());
    }
  };

  const compressImageFile = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 1080;
          const MAX_HEIGHT = 1080;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height = Math.round((height * MAX_WIDTH) / width);
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width = Math.round((width * MAX_HEIGHT) / height);
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            resolve(canvas.toDataURL('image/jpeg', 0.85));
          } else {
            resolve(event.target?.result as string);
          }
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setErrorMsg(null);

    const videoFile = files.find(f => f.type.startsWith('video/'));
    if (videoFile) {
      if (videoFile.size > 15 * 1024 * 1024) {
        setErrorMsg('O vídeo deve ter no máximo 15MB.');
        e.target.value = '';
        return;
      }
      setMediaType('video');
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          setMediaUrls([reader.result]);
        }
      };
      reader.readAsDataURL(videoFile);
      e.target.value = '';
      return;
    }

    setMediaType('image');
    const imageFiles = files.filter(f => f.type.startsWith('image/')).slice(0, 6);
    const compressedList = await Promise.all(imageFiles.map(compressImageFile));
    setMediaUrls(prev => {
      const base = mediaType === 'video' ? [] : prev;
      return [...base, ...compressedList].slice(0, 6);
    });
    e.target.value = '';
  };

  const handleRemoveMedia = (index: number) => {
    setMediaUrls(prev => prev.filter((_, idx) => idx !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    if (!text.trim() && mediaUrls.length === 0) {
      setErrorMsg('Escreva um texto ou selecione uma foto/vídeo para publicar no Feed!');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      // Extract hashtags from hashtagsStr and text
      const extractedTags = Array.from(
        new Set(
          `${text} ${hashtagsStr}`
            .match(/#[a-zA-Z0-9_À-ÿ]+/g) || ['#Barrantuba']
        )
      );

      const newPost: FeedPost = {
        id: `post_${currentUser.id}_${Date.now()}`,
        userId: currentUser.id,
        userName: currentUser.name,
        userHandle: currentUser.handle || `@${currentUser.name.toLowerCase().replace(/\s+/g, '')}`,
        userAvatar: currentUser.avatar,
        createdAt: new Date().toISOString(),
        category,
        text: text.trim(),
        mediaUrls,
        mediaType,
        hashtags: extractedTags,
        likes: [currentUser.id],
        likesCount: 1,
        comments: [],
        commentsCount: 0,
        sharesCount: 0,
        savedBy: []
      };

      const res = await onSavePost(newPost);
      if (res && res.ok === false) {
        setErrorMsg(res.error || 'Não foi possível salvar a publicação no banco de dados.');
        return;
      }
      onClose();
    } catch (err) {
      console.error('Erro ao salvar publicação no Feed:', err);
      setErrorMsg('Erro ao publicar no banco de dados. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-[400px] bg-[#071421] border border-emerald-500/30 rounded-3xl p-4 sm:p-5 shadow-2xl space-y-4 max-h-[88vh] overflow-y-auto no-scrollbar">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full ring-2 ring-emerald-400 overflow-hidden bg-slate-900 shrink-0">
              <img src={currentUser.avatar} alt={currentUser.name} className="w-full h-full object-cover" />
            </div>
            <div>
              <h3 className="text-sm font-black text-white leading-none">{currentUser.name}</h3>
              <span className="text-[11px] text-emerald-400 font-medium">Nova publicação no Feed</span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full bg-slate-900 text-slate-400 hover:text-white cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {errorMsg && (
            <div className="p-2.5 rounded-xl bg-rose-950/60 border border-rose-500/40 text-rose-200 text-xs font-medium">
              {errorMsg}
            </div>
          )}

          {/* Category Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5">
              Categoria da Publicação
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              {[
                { id: 'Pesca', label: '🎣 Pesca' },
                { id: 'Corrida', label: '🏃 Corrida' },
                { id: 'Aventura', label: '🌲 Aventura' },
                { id: 'Eventos', label: '🏆 Eventos' },
                { id: 'Equipamentos', label: '⚙️ Tralha' },
                { id: 'Geral', label: '💬 Geral' },
              ].map(cat => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setCategory(cat.id as FeedCategory)}
                  className={`py-1.5 px-2 rounded-xl text-[11px] font-bold transition-all cursor-pointer text-center ${
                    category === cat.id
                      ? 'bg-emerald-500 text-slate-950 font-black shadow-md'
                      : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-white'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Text Area */}
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5">
              Texto ou Legenda
            </label>
            <textarea
              rows={3}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Compartilhe sua pescaria, desafio esportivo, dica de isca ou aventura..."
              className="w-full bg-[#05111a] border border-slate-800 focus:border-emerald-500 rounded-2xl p-3 text-xs text-white placeholder-slate-500 outline-none resize-none transition-colors"
            />
          </div>

          {/* Media Upload / Preview */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-slate-300">
                Fotos ou Vídeo ({mediaType === 'video' ? '1 vídeo' : `${mediaUrls.length}/6 fotos`})
              </label>
              {mediaUrls.length > 0 && mediaType === 'image' && mediaUrls.length < 6 && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-[11px] font-bold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Mais fotos</span>
                </button>
              )}
            </div>

            {mediaUrls.length > 0 ? (
              mediaType === 'video' ? (
                <div className="relative w-full h-52 rounded-2xl overflow-hidden border border-emerald-500/40 bg-black">
                  <video src={mediaUrls[0]} controls className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => setMediaUrls([])}
                    className="absolute top-2 right-2 p-1.5 rounded-full bg-black/70 text-white hover:bg-rose-600 transition-colors cursor-pointer"
                    title="Remover vídeo"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className={`grid gap-2 ${mediaUrls.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
                  {mediaUrls.map((url, idx) => (
                    <div key={idx} className={`relative rounded-2xl overflow-hidden border border-emerald-500/40 bg-black ${mediaUrls.length === 1 ? 'h-52' : 'h-32'}`}>
                      <img src={url} alt={`Mídia ${idx + 1}`} className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => handleRemoveMedia(idx)}
                        className="absolute top-1.5 right-1.5 p-1 rounded-full bg-black/70 text-white hover:bg-rose-600 transition-colors cursor-pointer"
                        title="Remover foto"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="w-full h-32 border-2 border-dashed border-slate-700 hover:border-emerald-400/80 rounded-2xl bg-[#05111a] flex flex-col items-center justify-center gap-1.5 cursor-pointer transition-all group"
              >
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-full bg-slate-800 group-hover:bg-emerald-500/20 flex items-center justify-center text-slate-400 group-hover:text-emerald-400 transition-colors">
                    <ImageIcon className="w-4 h-4" />
                  </div>
                  <div className="w-9 h-9 rounded-full bg-slate-800 group-hover:bg-emerald-500/20 flex items-center justify-center text-slate-400 group-hover:text-emerald-400 transition-colors">
                    <Video className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-center">
                  <span className="text-xs font-bold text-slate-200 block group-hover:text-emerald-300">
                    Clique para anexar fotos ou vídeo
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">
                    Até 6 fotos ou 1 vídeo da galeria
                  </span>
                </div>
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*"
              multiple
              className="hidden"
              onChange={handleFileChange}
            />
          </div>

          {/* Hashtags */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-slate-300 flex items-center gap-1">
                <Hash className="w-3.5 h-3.5 text-emerald-400" />
                Hashtags
              </label>
              <span className="text-[10px] text-slate-500">Toque para adicionar</span>
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1 mb-2">
              {SUGGESTED_TAGS.map(tag => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => handleAddTag(tag)}
                  className="text-[10px] font-bold text-emerald-400/90 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 rounded-lg px-2 py-0.5 whitespace-nowrap transition-colors cursor-pointer"
                >
                  {tag}
                </button>
              ))}
            </div>

            <input
              type="text"
              value={hashtagsStr}
              onChange={(e) => setHashtagsStr(e.target.value)}
              placeholder="#Pesca #Natureza #VidaBoa"
              className="w-full bg-[#05111a] border border-slate-800 focus:border-emerald-500 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 outline-none"
            />
          </div>

          {/* Submit Actions */}
          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-bold transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting || (!text.trim() && mediaUrls.length === 0)}
              className="px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-slate-950 text-xs font-black shadow-lg shadow-emerald-500/20 transition-all flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Publicando...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Publicar no Feed</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
