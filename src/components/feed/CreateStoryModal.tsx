import { useState, useRef } from 'react';
import { User, Story } from '../../types';
import { X, Image as ImageIcon, Camera, Sparkles, Loader2 } from 'lucide-react';

interface CreateStoryModalProps {
  currentUser: User;
  onClose: () => void;
  onSaveStory: (story: Story) => Promise<{ ok: boolean; error?: string } | void> | void;
}

export function CreateStoryModal({
  currentUser,
  onClose,
  onSaveStory
}: CreateStoryModalProps) {
  const [caption, setCaption] = useState('');
  const [category, setCategory] = useState<'Pesca' | 'Corrida' | 'Aventura' | 'Eventos'>('Pesca');
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<'image' | 'video'>('image');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMsg(null);
    if (file.type.startsWith('video/')) {
      if (file.size > 15 * 1024 * 1024) {
        setErrorMsg('O vídeo do Story deve ter no máximo 15MB.');
        e.target.value = '';
        return;
      }
      setMediaType('video');
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          setMediaPreview(reader.result);
        }
      };
      reader.readAsDataURL(file);
      e.target.value = '';
      return;
    }

    setMediaType('image');
    // Compress image via Canvas
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 900;
        const MAX_HEIGHT = 1600;
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
          const compressed = canvas.toDataURL('image/jpeg', 0.85);
          setMediaPreview(compressed);
        } else {
          setMediaPreview(event.target?.result as string);
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting || !mediaPreview) {
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const newStory: Story = {
        id: `story_${currentUser.id}_${Date.now()}`,
        userId: currentUser.id,
        userName: currentUser.name,
        userHandle: currentUser.handle || `@${currentUser.name.toLowerCase().replace(/\s+/g, '')}`,
        userAvatar: currentUser.avatar,
        category,
        caption: caption.trim() || undefined,
        mediaUrl: mediaPreview,
        mediaType,
        createdAt: new Date().toISOString(),
        viewedBy: []
      };

      const res = await onSaveStory(newStory);
      if (res && res.ok === false) {
        setErrorMsg(res.error || 'Não foi possível salvar o Story no banco de dados.');
        return;
      }
      onClose();
    } catch (err) {
      console.error('Erro ao publicar Story:', err);
      setErrorMsg('Erro ao salvar Story no banco de dados. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-[400px] bg-[#071421] border border-emerald-500/30 rounded-3xl p-5 shadow-2xl space-y-4 max-h-[88vh] overflow-y-auto no-scrollbar">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
              <Camera className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-black text-white uppercase tracking-wider">Criar Novo Story</h3>
              <p className="text-[11px] text-slate-400">Visível por 24 horas para os membros do clube</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full bg-slate-900 text-slate-400 hover:text-white"
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
          {/* Media Preview / Picker */}
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5">
              Foto ou Vídeo do Story
            </label>

            {mediaPreview ? (
              <div className="relative w-full h-64 rounded-2xl overflow-hidden border border-emerald-500/40 bg-black group">
                {mediaType === 'video' ? (
                  <video src={mediaPreview} controls className="w-full h-full object-cover" />
                ) : (
                  <img src={mediaPreview} alt="Preview" className="w-full h-full object-cover" />
                )}
                <button
                  type="button"
                  onClick={() => setMediaPreview(null)}
                  className="absolute top-2 right-2 p-1.5 rounded-full bg-black/70 text-white hover:bg-rose-600 transition-colors"
                  title="Trocar mídia"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="w-full h-44 border-2 border-dashed border-slate-700 hover:border-emerald-400/80 rounded-2xl bg-[#05111a] flex flex-col items-center justify-center gap-2 cursor-pointer transition-all group"
              >
                <div className="w-12 h-12 rounded-full bg-slate-800 group-hover:bg-emerald-500/20 flex items-center justify-center text-slate-400 group-hover:text-emerald-400 transition-colors">
                  <ImageIcon className="w-6 h-6" />
                </div>
                <div className="text-center">
                  <span className="text-xs font-bold text-slate-200 block group-hover:text-emerald-300">
                    Toque para escolher foto ou vídeo
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">
                    JPG, PNG ou MP4 da galeria
                  </span>
                </div>
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>

          {/* Category Picker */}
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5">
              Categoria
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { id: 'Pesca', label: '🎣 Pesca' },
                { id: 'Corrida', label: '🏃 Corrida' },
                { id: 'Aventura', label: '🌲 Aventura' },
                { id: 'Eventos', label: '🏆 Eventos' },
              ].map(cat => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setCategory(cat.id as any)}
                  className={`py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer text-center ${
                    category === cat.id
                      ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20 font-black'
                      : 'bg-slate-900 text-slate-300 border border-slate-800 hover:border-slate-700'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Caption Input */}
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5">
              Legenda rápida (opcional)
            </label>
            <input
              type="text"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Ex: Aquecimento no lago ou fisgada no amanhecer! 🎣"
              maxLength={120}
              className="w-full bg-[#05111a] border border-slate-800 focus:border-emerald-500 rounded-xl px-3 py-2.5 text-xs text-white placeholder-slate-500 outline-none transition-colors"
            />
            <span className="text-[10px] text-slate-500 block text-right mt-1 font-mono">
              {caption.length}/120
            </span>
          </div>

          {/* Submit Button */}
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
              disabled={isSubmitting || !mediaPreview}
              className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-slate-950 text-xs font-black shadow-lg shadow-emerald-500/20 transition-all flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Publicando...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Publicar Story (24h)</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
