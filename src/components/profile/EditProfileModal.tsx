import { useState, useRef } from 'react';
import { X, Camera, Check, Lock, Globe, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { User } from '../../types';

interface EditProfileModalProps {
  user: User;
  onClose: () => void;
  onSaveProfile: (updated: User) => Promise<{ ok: boolean; error?: string; user?: User } | void> | void;
}

function compressAvatarImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const objectUrl = typeof URL !== 'undefined' && URL.createObjectURL ? URL.createObjectURL(file) : null;

    const processImage = (img: HTMLImageElement, cleanup?: () => void) => {
      try {
        const canvas = document.createElement('canvas');
        const maxDim = 480;
        let width = img.naturalWidth || img.width || maxDim;
        let height = img.naturalHeight || img.height || maxDim;

        if (width > height) {
          if (width > maxDim) {
            height = Math.max(1, Math.round((height * maxDim) / width));
            width = maxDim;
          }
        } else if (height > maxDim) {
          width = Math.max(1, Math.round((width * maxDim) / height));
          height = maxDim;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          cleanup?.();
          reject(new Error('Falha ao preparar o editor de imagem.'));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        let compressed = canvas.toDataURL('image/jpeg', 0.85);
        if (compressed.length > 240_000) {
          compressed = canvas.toDataURL('image/jpeg', 0.68);
        }
        cleanup?.();
        resolve(compressed);
      } catch (err) {
        cleanup?.();
        reject(err instanceof Error ? err : new Error('Falha ao compactar foto.'));
      }
    };

    const loadViaFileReader = () => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        if (!result) {
          reject(new Error('Arquivo de imagem vazio.'));
          return;
        }
        const img = new Image();
        img.onload = () => processImage(img);
        img.onerror = () => reject(new Error('Formato de imagem não suportado. Use JPG ou PNG.'));
        img.src = result;
      };
      reader.onerror = () => reject(new Error('Não foi possível ler o arquivo selecionado.'));
      reader.readAsDataURL(file);
    };

    if (objectUrl) {
      const img = new Image();
      img.onload = () => processImage(img, () => URL.revokeObjectURL(objectUrl));
      img.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        loadViaFileReader();
      };
      img.src = objectUrl;
    } else {
      loadViaFileReader();
    }
  });
}

export function EditProfileModal({ user, onClose, onSaveProfile }: EditProfileModalProps) {
  const avatarFileRef = useRef<HTMLInputElement>(null);
  const [avatar, setAvatar] = useState(user.avatar);
  const [name, setName] = useState(user.name);
  const [handle, setHandle] = useState(user.handle || '@felipinho_pesca');
  const [subtitle, setSubtitle] = useState(user.subtitle ?? 'Pescador esportivo 🎣');
  const [bio, setBio] = useState(user.bio ?? '');
  const [city, setCity] = useState(user.city ?? 'Barrantuba • Santa Catarina');
  const [phone, setPhone] = useState(user.phone ?? '');
  const [isPrivate, setIsPrivate] = useState(Boolean(user.isPrivate));

  const [isProcessingAvatar, setIsProcessingAvatar] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setSaveError(null);
    setSavedSuccess(false);
    setIsProcessingAvatar(true);

    try {
      const compressed = await compressAvatarImage(file);
      setAvatar(compressed);
    } catch (err: any) {
      setSaveError(err?.message || 'Não foi possível processar esta foto. Tente outra imagem.');
    } finally {
      setIsProcessingAvatar(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving || isProcessingAvatar) return;

    if (!name.trim()) {
      setSaveError('Informe seu nome de exibição.');
      return;
    }

    setIsSaving(true);
    setSavedSuccess(false);
    setSaveError(null);

    const formattedHandle = handle.trim()
      ? (handle.trim().startsWith('@') ? handle.trim() : `@${handle.trim()}`)
      : `@${name.trim().toLowerCase().replace(/\s+/g, '_')}`;

    const updated: User = {
      ...user,
      avatar,
      name: name.trim(),
      handle: formattedHandle,
      subtitle: subtitle.trim(),
      bio: bio.trim(),
      city: city.trim(),
      phone: phone.trim(),
      isPrivate
    };

    try {
      const res = await onSaveProfile(updated);
      if (res && res.ok === false) {
        setSaveError(res.error || 'Erro ao gravar alterações no banco de dados. Tente novamente.');
        return;
      }
      setSavedSuccess(true);
      setTimeout(() => {
        onClose();
      }, 900);
    } catch (err: any) {
      console.error('Erro ao salvar perfil:', err);
      setSaveError(err?.message || 'Erro ao gravar alterações no banco de dados. Tente novamente.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-md bg-[#07131e] border border-slate-800 rounded-3xl shadow-2xl overflow-hidden my-auto flex flex-col text-slate-100 max-h-[90vh]">
        
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-[#040e17]">
          <h2 className="text-base font-black text-white">Editar Perfil</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto flex-1">
          
          {/* Avatar Upload */}
          <div className="flex flex-col items-center justify-center space-y-2">
            <div 
              onClick={() => !isProcessingAvatar && avatarFileRef.current?.click()}
              className="relative cursor-pointer group"
            >
              <img
                src={avatar}
                alt="Avatar"
                className={`w-24 h-24 rounded-full object-cover ring-4 ring-emerald-500/80 shadow-xl transition-opacity ${
                  isProcessingAvatar ? 'opacity-50' : 'group-hover:opacity-85'
                }`}
              />
              <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                {isProcessingAvatar ? (
                  <Loader2 className="w-6 h-6 text-white animate-spin" />
                ) : (
                  <Camera className="w-6 h-6 text-white" />
                )}
              </div>
              <div className="absolute bottom-0 right-0 p-1.5 rounded-full bg-emerald-500 text-slate-950 shadow-md">
                {isProcessingAvatar ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Camera className="w-3.5 h-3.5 stroke-[2.5]" />
                )}
              </div>
            </div>
            <button
              type="button"
              disabled={isProcessingAvatar}
              onClick={() => avatarFileRef.current?.click()}
              className="text-xs text-emerald-400 hover:text-emerald-300 font-bold cursor-pointer disabled:opacity-60"
            >
              {isProcessingAvatar ? 'Processando foto selecionada...' : 'Alterar foto de perfil da galeria'}
            </button>
            <input
              type="file"
              ref={avatarFileRef}
              accept="image/*"
              className="hidden"
              onChange={handleAvatarChange}
            />
          </div>

          {/* Name & Handle */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-400">Nome de exibição</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-[#05111c] border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-xs font-bold text-white focus:outline-none focus:border-emerald-500"
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-400">Usuário / Handle</label>
            <input
              type="text"
              value={handle}
              onChange={(e) => setHandle(e.target.value)}
              className="w-full bg-[#05111c] border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
              required
            />
          </div>

          {/* Subtitle */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-400">Subtítulo / Especialidade</label>
            <input
              type="text"
              value={subtitle}
              onChange={(e) => setSubtitle(e.target.value)}
              placeholder="Ex: Pescador esportivo 🎣"
              className="w-full bg-[#05111c] border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Bio */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-400">Biografia</label>
            <textarea
              rows={3}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Conte um pouco sobre suas pescarias..."
              className="w-full bg-[#05111c] border border-slate-700/80 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 resize-none"
            />
          </div>

          {/* City & Phone */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-400">Localização</label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Ex: Barrantuba • SC"
                className="w-full bg-[#05111c] border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-400">WhatsApp / Telefone</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="(48) 99999-9999"
                className="w-full bg-[#05111c] border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-xs text-white font-mono-numbers focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Privacy Toggle */}
          <div className="bg-[#05111c] border border-slate-800 rounded-2xl p-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              {isPrivate ? (
                <Lock className="w-4 h-4 text-amber-400" />
              ) : (
                <Globe className="w-4 h-4 text-emerald-400" />
              )}
              <div>
                <span className="text-xs font-bold text-white block">Perfil Privado</span>
                <span className="text-[10px] text-slate-400 block">
                  {isPrivate ? 'Apenas seguidores aprovados vêem suas capturas' : 'Perfil visível para todos os membros'}
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsPrivate(!isPrivate)}
              className={`text-xs font-bold px-3 py-1 rounded-full transition-colors cursor-pointer ${
                isPrivate 
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' 
                  : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
              }`}
            >
              {isPrivate ? 'Privado' : 'Público'}
            </button>
          </div>

          {/* Error Alert */}
          {saveError && (
            <div className="p-3.5 rounded-2xl bg-rose-950/80 border border-rose-500/60 text-rose-200 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-black text-white block">Não foi possível salvar no banco</span>
                <span className="text-[11px] text-rose-300 block">{saveError}</span>
              </div>
            </div>
          )}

          {/* Success Alert */}
          {savedSuccess && (
            <div className="p-3.5 rounded-2xl bg-emerald-950/90 border border-emerald-500/60 text-emerald-300 text-xs flex items-center gap-2.5 animate-in fade-in">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              <div>
                <span className="font-black text-white block">✓ Alterações salvas com sucesso!</span>
                <span className="text-[11px] text-emerald-400/90 block">Seus dados foram gravados no banco de dados.</span>
              </div>
            </div>
          )}

          {/* Submit */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isSaving || isProcessingAvatar}
              className={`w-full py-3.5 px-4 rounded-xl font-black text-xs shadow-lg transition-all flex items-center justify-center gap-2 ${
                savedSuccess
                  ? 'bg-emerald-600 text-white shadow-emerald-500/25'
                  : isSaving || isProcessingAvatar
                    ? 'bg-slate-700 text-slate-300 cursor-wait'
                    : 'bg-emerald-500 hover:bg-emerald-400 active:scale-[0.98] text-slate-950 shadow-emerald-500/25 cursor-pointer'
              }`}
            >
              {isProcessingAvatar ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Processando foto...</span>
                </>
              ) : isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Salvando no banco de dados...</span>
                </>
              ) : savedSuccess ? (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Confirmado & Salvo!</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 stroke-[3]" />
                  <span>Salvar Alterações</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
