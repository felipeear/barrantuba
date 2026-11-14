import { useState, useRef } from 'react';
import { Camera, X, Plus, MapPin, EyeOff, Eye, Sparkles, Check, Film, UploadCloud, UserPlus } from 'lucide-react';
import { FishCatch, FishingSpot, User, BaitCategory } from '../../types';

interface NewPublicationModalProps {
  currentUser: User;
  spots: FishingSpot[];
  initialSpotId?: string;
  onClose: () => void;
  onSaveCatch: (newCatch: FishCatch) => Promise<{ ok: boolean; error?: string } | void> | void;
}

const COMMON_SPECIES = [
  'Tucunaré-azul',
  'Robalo Flecha',
  'Dourado do Rio',
  'Tucunaré Amarelo',
  'Tucunaré Açú',
  'Robalo Peva',
  'Corvina',
  'Traíra',
  'Pintado'
];

export function NewPublicationModal({
  currentUser,
  spots,
  initialSpotId,
  onClose,
  onSaveCatch
}: NewPublicationModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  // Media states (up to 10 photos or video)
  const [mediaList, setMediaList] = useState<string[]>([]);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);

  // Form Fields matching Image 2
  const [species, setSpecies] = useState('Tucunaré-azul');
  const [customSpecies, setCustomSpecies] = useState('');
  const [weightKg, setWeightKg] = useState('3.5');
  const [lengthCm, setLengthCm] = useState('58');
  const [baitUsed, setBaitUsed] = useState('Zara de superfície');
  const [baitCategory, setBaitCategory] = useState<BaitCategory>('superficie');
  const [technique, setTechnique] = useState('Trabalho em zigue-zague na flor d\'água');
  const [isLocationPrivate, setIsLocationPrivate] = useState(true);
  const [selectedSpotId, setSelectedSpotId] = useState(initialSpotId || (spots[0]?.id || ''));
  const [customSpotName, setCustomSpotName] = useState('Represa Barrantuba');
  const [description, setDescription] = useState('Ataque explosivo logo cedo na flor d\'água!');
  const [capturedDate, setCapturedDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [released, setReleased] = useState(true);
  const [taggedAnglers, setTaggedAnglers] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const compressImageFile = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onerror = () => resolve('');
      reader.onload = (event) => {
        const rawResult = event.target?.result as string;
        if (!rawResult) {
          resolve('');
          return;
        }
        const img = new Image();
        img.onerror = () => resolve(rawResult);
        img.onload = () => {
          try {
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
              resolve(canvas.toDataURL('image/jpeg', 0.82));
            } else {
              resolve(rawResult);
            }
          } catch {
            resolve(rawResult);
          }
        };
        img.src = rawResult;
      };
      reader.readAsDataURL(file);
    });
  };

  // Handle media selection (up to 10 compressed photos)
  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setErrorMsg(null);

    const remainingSlots = Math.max(0, 10 - mediaList.length);
    const filesToRead = Array.from(files).slice(0, remainingSlots);
    const compressed = (await Promise.all(filesToRead.map(compressImageFile))).filter(Boolean);
    if (compressed.length > 0) {
      setMediaList(prev => [...prev, ...compressed].slice(0, 10));
    }
    e.target.value = '';
  };

  const handleVideoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setErrorMsg(null);

    // Check size limit: 15MB (keeps base64 JSON payload safely within server/proxy limits)
    if (file.size > 15 * 1024 * 1024) {
      setErrorMsg('O vídeo selecionado excede o limite de 15MB. Por favor escolha um vídeo menor.');
      e.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (result) {
        setVideoUrl(result);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const removePhoto = (index: number) => {
    setMediaList(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setErrorMsg(null);
    setSubmitting(true);

    try {
      const chosenSpecies = (species === 'Outro' && customSpecies.trim())
        ? customSpecies.trim()
        : (customSpecies.trim() ? customSpecies.trim() : species);
      const parsedWeight = parseFloat(String(weightKg || '').replace(',', '.'));
      const chosenWeight = Number.isFinite(parsedWeight) && parsedWeight > 0 ? parsedWeight : 1.0;
      const parsedLength = parseFloat(String(lengthCm || '').replace(',', '.'));
      const chosenLength = Number.isFinite(parsedLength) && parsedLength >= 0 ? parsedLength : 0;

      let spotName = 'Ponto Privado / Não divulgado';
      if (!isLocationPrivate) {
        const foundSpot = spots.find(s => s.id === selectedSpotId);
        spotName = foundSpot ? foundSpot.name : (customSpotName || 'Ponto Barrantuba');
      }

      // Default primary photo: first uploaded or trophy placeholder
      const primaryPhoto = mediaList[0] || (
        chosenSpecies.toLowerCase().includes('robalo')
          ? '/src/assets/images/robalo_flecha_3d.png'
          : chosenSpecies.toLowerCase().includes('dourado')
          ? '/src/assets/images/dourado_rio_3d.png'
          : '/src/assets/images/tucunare_trophy_fish_1793877702286.jpg'
      );

      const parsedDate = capturedDate ? new Date(`${capturedDate}T12:00:00`) : new Date();
      const safeCapturedAt = Number.isNaN(parsedDate.getTime())
        ? new Date().toISOString()
        : parsedDate.toISOString();

      const newCatch: FishCatch = {
        id: `catch_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        spotId: isLocationPrivate ? 'spot_private' : (selectedSpotId || 'spot_custom'),
        spotName,
        userId: currentUser.id,
        userName: currentUser.name,
        userAvatar: currentUser.avatar,
        species: chosenSpecies,
        weightKg: chosenWeight,
        lengthCm: chosenLength,
        baitUsed: baitUsed.trim() || 'Isca Artificial',
        baitCategory,
        technique: technique.trim() || 'Toques de ponta de vara',
        photoUrl: primaryPhoto,
        mediaUrls: mediaList.length > 0 ? mediaList : [primaryPhoto],
        videoUrl: videoUrl || undefined,
        capturedAt: safeCapturedAt,
        weatherTemp: 24,
        released,
        description: description.trim(),
        notes: `${chosenSpecies} de ${chosenWeight}kg fisgado com ${baitUsed.trim() || 'Isca Artificial'}`,
        likesCount: 1,
        likes: [currentUser.id],
        comments: [],
        sharesCount: 0,
        isLocationPrivate,
        taggedUsers: taggedAnglers
      };

      const saveRes = await onSaveCatch(newCatch);
      if (saveRes && saveRes.ok === false) {
        setErrorMsg(saveRes.error || 'Não foi possível salvar no banco de dados. Tente novamente.');
        return;
      }
      onClose();
    } catch (err) {
      console.error('Erro ao salvar publicação:', err);
      setErrorMsg('Não foi possível salvar a publicação no banco de dados. Tente reduzir o tamanho da foto ou vídeo.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-[410px] bg-[#07131e] border border-slate-800 rounded-3xl shadow-2xl overflow-hidden my-auto max-h-[94vh] flex flex-col text-slate-100 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Top Header matching Image 2 */}
        <div className="px-5 py-4 border-b border-slate-800/80 flex items-center justify-between bg-[#040e17] shrink-0">
          <div className="flex items-center gap-2">
            <h2 className="text-base sm:text-lg font-black text-white tracking-tight">
              Nova publicação
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body matching Image 2 Layout */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-950/70 border border-rose-500/40 text-rose-200 text-xs font-semibold">
              {errorMsg}
            </div>
          )}
          
          {/* Box: Adicionar fotos ou vídeos matching Image 2 */}
          <div className="space-y-2">
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="group border-2 border-dashed border-slate-700/80 hover:border-emerald-500/80 bg-[#061423] hover:bg-[#071a2d] transition-all rounded-2xl p-6 sm:p-7 flex flex-col items-center justify-center text-center cursor-pointer shadow-inner"
            >
              <div className="w-14 h-14 rounded-full bg-slate-800/80 group-hover:bg-emerald-500/20 text-slate-300 group-hover:text-emerald-400 flex items-center justify-center mb-3 transition-colors">
                <Camera className="w-7 h-7 stroke-[2]" />
              </div>
              <span className="text-sm font-bold text-white mb-1">
                Adicionar fotos ou vídeos
              </span>
              <p className="text-xs text-slate-400 max-w-xs">
                Mostre sua pescaria para a comunidade. Até 10 fotografias ou vídeo.
              </p>
              {mediaList.length > 0 && (
                <span className="mt-3 text-[11px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-3 py-1 rounded-full">
                  ✓ {mediaList.length} foto(s) selecionada(s)
                </span>
              )}
            </div>

            {/* Hidden native inputs for gallery and video */}
            <input 
              type="file" 
              ref={fileInputRef} 
              accept="image/*" 
              multiple 
              className="hidden" 
              onChange={handlePhotoSelect} 
            />
            <input 
              type="file" 
              ref={videoInputRef} 
              accept="video/*" 
              className="hidden" 
              onChange={handleVideoSelect} 
            />

            {/* Small Quick Video Button */}
            <div className="flex items-center justify-between text-xs text-slate-400 px-1">
              <button
                type="button"
                onClick={() => videoInputRef.current?.click()}
                className="flex items-center gap-1.5 text-cyan-400 hover:text-cyan-300 font-medium py-1"
              >
                <Film className="w-4 h-4" />
                <span>{videoUrl ? 'Vídeo adicionado ✓' : '+ Adicionar vídeo de pescaria'}</span>
              </button>
              <span className="text-[11px] text-slate-500">{mediaList.length}/10 fotos</span>
            </div>

            {/* Previews Thumbnails Grid */}
            {mediaList.length > 0 && (
              <div className="flex items-center gap-2 overflow-x-auto py-2">
                {mediaList.map((img, idx) => (
                  <div key={idx} className="relative w-16 h-16 rounded-xl overflow-hidden shrink-0 border border-emerald-500/40 group">
                    <img src={img} alt={`Preview ${idx}`} className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removePhoto(idx)}
                      className="absolute top-1 right-1 p-0.5 rounded-full bg-rose-600/90 text-white hover:bg-rose-500"
                    >
                      <X className="w-3 h-3" />
                    </button>
                    {idx === 0 && (
                      <span className="absolute bottom-0 inset-x-0 bg-emerald-500/90 text-slate-950 text-[8px] font-bold text-center py-0.2">
                        Capa
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Field: Espécie matching Image 2 */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-400">Espécie</label>
              <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">Troféu</span>
            </div>
            <select
              value={species}
              onChange={(e) => setSpecies(e.target.value)}
              className="w-full bg-[#05111c] border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-sm font-bold text-white focus:outline-none focus:border-emerald-500"
            >
              {COMMON_SPECIES.map(sp => (
                <option key={sp} value={sp}>{sp}</option>
              ))}
              <option value="Outro">Outra espécie...</option>
            </select>
            {species === 'Outro' && (
              <input
                type="text"
                placeholder="Nome da espécie fisgada..."
                value={customSpecies}
                onChange={(e) => setCustomSpecies(e.target.value)}
                className="w-full mt-1.5 bg-[#05111c] border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                required
              />
            )}
          </div>

          {/* Row: Peso e Comprimento matching Image 2 */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-400">Peso</label>
              <div className="relative">
                <input
                  type="text"
                  value={weightKg}
                  onChange={(e) => setWeightKg(e.target.value)}
                  placeholder="3,5"
                  className="w-full bg-[#05111c] border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-sm font-extrabold text-white text-right pr-10 focus:outline-none focus:border-emerald-500"
                  required
                />
                <span className="absolute right-3.5 top-2.5 text-xs text-slate-400 font-bold">kg</span>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-400">Comprimento</label>
              <div className="relative">
                <input
                  type="text"
                  value={lengthCm}
                  onChange={(e) => setLengthCm(e.target.value)}
                  placeholder="58"
                  className="w-full bg-[#05111c] border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-sm font-extrabold text-white text-right pr-10 focus:outline-none focus:border-emerald-500"
                />
                <span className="absolute right-3.5 top-2.5 text-xs text-slate-400 font-bold">cm</span>
              </div>
            </div>
          </div>

          {/* Field: Isca matching Image 2 */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-400">Isca</label>
            <input
              type="text"
              value={baitUsed}
              onChange={(e) => setBaitUsed(e.target.value)}
              placeholder="Zara de superfície"
              className="w-full bg-[#05111c] border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-sm font-bold text-white focus:outline-none focus:border-emerald-500"
              required
            />
          </div>

          {/* Field: Localização matching Image 2 (Privada vs Pública) */}
          <div className="space-y-1.5 bg-[#05111c] border border-slate-800 rounded-2xl p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {isLocationPrivate ? (
                  <EyeOff className="w-4 h-4 text-amber-400" />
                ) : (
                  <Eye className="w-4 h-4 text-emerald-400" />
                )}
                <span className="text-xs font-bold text-slate-200">Localização</span>
              </div>
              <button
                type="button"
                onClick={() => setIsLocationPrivate(!isLocationPrivate)}
                className={`text-[11px] font-bold px-3 py-1 rounded-full transition-colors cursor-pointer ${
                  isLocationPrivate 
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' 
                    : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                }`}
              >
                {isLocationPrivate ? 'Privada' : 'Pública no Mapa'}
              </button>
            </div>

            {!isLocationPrivate ? (
              <div className="mt-2 pt-2 border-t border-slate-800/80">
                <label className="text-[11px] text-slate-400 mb-1 block">Selecione o ponto de pesca do clube:</label>
                <select
                  value={selectedSpotId}
                  onChange={(e) => setSelectedSpotId(e.target.value)}
                  className="w-full bg-[#071827] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                >
                  {spots.map(s => (
                    <option key={s.id} value={s.id}>{s.name} ({s.waterType})</option>
                  ))}
                  <option value="custom">Outro local do Barrantuba...</option>
                </select>
                {selectedSpotId === 'custom' && (
                  <input
                    type="text"
                    value={customSpotName}
                    onChange={(e) => setCustomSpotName(e.target.value)}
                    placeholder="Nome da represa, rio ou lagoa..."
                    className="w-full mt-2 bg-[#071827] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                  />
                )}
              </div>
            ) : (
              <p className="text-[11px] text-slate-400 mt-1">
                Suas coordenadas secretas ficam protegidas. O peixe aparece no seu perfil e no diário com o marcador &ldquo;Privada&rdquo;.
              </p>
            )}
          </div>

          {/* Field: Descrição / História da Captura */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-400">Descrição da pescaria</label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Conte como foi o ataque, a estrutura e a briga..."
              className="w-full bg-[#05111c] border border-slate-700/80 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 resize-none"
            />
          </div>

          {/* Row: Pesque e Solte + Data */}
          <div className="flex items-center justify-between bg-[#05111c] border border-slate-800 rounded-xl px-3.5 py-2 text-xs">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={released}
                onChange={(e) => setReleased(e.target.checked)}
                className="w-4 h-4 accent-emerald-500 rounded"
              />
              <span className="font-semibold text-slate-300">Pesque & Solte (Solto com vida 🌊)</span>
            </label>
            <input
              type="date"
              value={capturedDate}
              onChange={(e) => setCapturedDate(e.target.value)}
              className="bg-transparent text-slate-400 text-xs focus:outline-none"
            />
          </div>

          {/* Big Green Submit Button matching Image 2 */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3.5 px-4 rounded-2xl bg-emerald-500 hover:bg-emerald-400 active:scale-[0.98] text-slate-950 font-black text-sm shadow-xl shadow-emerald-500/25 transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              {submitting ? (
                <span>Salvando publicação...</span>
              ) : (
                <>
                  <Check className="w-5 h-5 stroke-[3]" />
                  <span>Publicar captura</span>
                </>
              )}
            </button>
            <p className="text-[11px] text-center text-slate-500 mt-2">
              Exemplo de formulário, integrado ao diário de capturas do clube.
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
