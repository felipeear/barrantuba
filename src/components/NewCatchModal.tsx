import { useState, useRef } from 'react';
import { FishCatch, FishingSpot, BaitCategory, User } from '../types';
import { X, Fish, Camera, Check, Anchor, Upload } from 'lucide-react';
import { TROPHY_FISH_IMAGE, HERO_DAWN_IMAGE, SPOT_RIVER_IMAGE } from '../services/storageService';

interface NewCatchModalProps {
  spots: FishingSpot[];
  initialSpotId?: string;
  currentUser: User;
  onClose: () => void;
  onSave: (fishCatch: FishCatch) => void;
}

const COMMON_SPECIES = [
  'Tucunaré Azul',
  'Tucunaré Amarelo',
  'Robalo Flecha',
  'Robalo Peva',
  'Dourado do Rio',
  'Pintado / Surubim',
  'Traíra / Trairão',
  'Corvina',
  'Tambaqui',
  'Tilápia do Nilo',
  'Apaiari',
  'Cachara'
];

const COMMON_BAITS = [
  { name: 'Zara Spook Jr 9cm Osso', cat: 'superficie' as BaitCategory },
  { name: 'Zig Zara 110 Osso / Verde', cat: 'superficie' as BaitCategory },
  { name: 'Stick Firestick 90', cat: 'superficie' as BaitCategory },
  { name: 'Brava 90 Meia-Água', cat: 'meia_agua' as BaitCategory },
  { name: 'Inna Pro Tuned 70 Meia-Água', cat: 'meia_agua' as BaitCategory },
  { name: 'Camarão Soft D.O.A no Jig 15g', cat: 'soft_camarao' as BaitCategory },
  { name: 'Shad Soft 9cm no Jig Head', cat: 'fundo_jig' as BaitCategory },
  { name: 'Jig de Penacho / Bucktail 14g', cat: 'fundo_jig' as BaitCategory },
  { name: 'Lambari Vivo no Chicote', cat: 'isca_viva' as BaitCategory },
  { name: 'Camarão Vivo no Anzol Maruseigo', cat: 'isca_viva' as BaitCategory },
  { name: 'Minhocuçu / Tuvira', cat: 'isca_natural' as BaitCategory }
];

export function NewCatchModal({
  spots,
  initialSpotId,
  currentUser,
  onClose,
  onSave
}: NewCatchModalProps) {
  const [spotId, setSpotId] = useState(initialSpotId || (spots[0]?.id ?? ''));
  const [species, setSpecies] = useState('Tucunaré Azul');
  const [customSpecies, setCustomSpecies] = useState('');
  const [weightKg, setWeightKg] = useState('3.50');
  const [lengthCm, setLengthCm] = useState('52.0');
  const [baitUsed, setBaitUsed] = useState('Zara Spook Jr 9cm Osso');
  const [baitCategory, setBaitCategory] = useState<BaitCategory>('superficie');
  const [technique, setTechnique] = useState('Toques rápidos de ponta de vara com cadência');
  const [released, setReleased] = useState(true);
  const [notes, setNotes] = useState('');
  const [photoUrl, setPhotoUrl] = useState(TROPHY_FISH_IMAGE);
  const [customFishPhoto, setCustomFishPhoto] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const catchFileInputRef = useRef<HTMLInputElement>(null);

  const handleFishPhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const rawUrl = event.target?.result as string;
      const img = new Image();
      img.onload = () => {
        const maxDim = 1200;
        let width = img.width;
        let height = img.height;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressed = canvas.toDataURL('image/jpeg', 0.85);
          setPhotoUrl(compressed);
          setCustomFishPhoto(compressed);
        } else {
          setPhotoUrl(rawUrl);
          setCustomFishPhoto(rawUrl);
        }
      };
      img.src = rawUrl;
    };
    reader.readAsDataURL(file);
  };

  const handleSelectBaitPreset = (b: { name: string; cat: BaitCategory }) => {
    setBaitUsed(b.name);
    setBaitCategory(b.cat);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const selectedSpot = spots.find(s => s.id === spotId);
    const finalSpecies = species === 'Outra Espécie' ? customSpecies.trim() : species;
    setErrorMsg(null);

    if (!finalSpecies) {
      setErrorMsg('Por favor especifique a espécie do peixe capturado.');
      return;
    }

    const weight = parseFloat(weightKg);
    const length = parseFloat(lengthCm);

    if (isNaN(weight) || weight <= 0) {
      setErrorMsg('Por favor informe um peso válido em kg.');
      return;
    }

    const newCatch: FishCatch = {
      id: `catch_${Date.now()}`,
      spotId,
      spotName: selectedSpot ? selectedSpot.name : 'Ponto Barrantuba',
      userId: currentUser.id,
      userName: currentUser.name,
      userAvatar: currentUser.avatar,
      species: finalSpecies,
      weightKg: weight,
      lengthCm: isNaN(length) ? 0 : length,
      baitUsed: baitUsed.trim() || 'Isca Artificial',
      baitCategory,
      technique: technique.trim() || 'Arremesso e recolhimento',
      photoUrl,
      capturedAt: new Date().toISOString(),
      weatherTemp: 25,
      windSpeedKm: 11,
      windDirection: 'NE',
      released,
      notes: notes.trim(),
      likesCount: 1
    };

    onSave(newCatch);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-[410px] bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/50 shrink-0">
          <div>
            <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
              <Fish className="w-5 h-5 text-emerald-400" />
              <span>Registrar Peixe Capturado</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Registre os dados da sua captura, a isca utilizada e suba no ranking do Barrantuba!
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5 flex-1">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-950/70 border border-rose-500/40 text-rose-200 text-xs font-semibold">
              {errorMsg}
            </div>
          )}
          {/* Fishing Spot selection */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Ponto Onde Foi Capturado *
            </label>
            <select
              value={spotId}
              onChange={(e) => setSpotId(e.target.value)}
              required
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-emerald-500"
            >
              {spots.map(s => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.waterType.toUpperCase()})
                </option>
              ))}
            </select>
          </div>

          {/* Species */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Espécie do Peixe *
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-2">
              {COMMON_SPECIES.slice(0, 6).map(sp => (
                <button
                  type="button"
                  key={sp}
                  onClick={() => {
                    setSpecies(sp);
                    setCustomSpecies('');
                  }}
                  className={`px-3 py-2 rounded-lg text-xs font-medium text-left truncate transition-colors ${
                    species === sp ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'bg-slate-950 border border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {sp}
                </button>
              ))}
            </div>
            <select
              value={species}
              onChange={(e) => setSpecies(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
            >
              {COMMON_SPECIES.map(sp => (
                <option key={sp} value={sp}>{sp}</option>
              ))}
              <option value="Outra Espécie">Outra Espécie (digitar nome)</option>
            </select>

            {species === 'Outra Espécie' && (
              <input
                type="text"
                placeholder="Nome da espécie..."
                value={customSpecies}
                onChange={(e) => setCustomSpecies(e.target.value)}
                required
                className="mt-2 w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
            )}
          </div>

          {/* Weight & Length */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Peso Registrado (kg) *
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.05"
                  min="0.1"
                  required
                  value={weightKg}
                  onChange={(e) => setWeightKg(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm font-bold text-slate-100 font-mono-numbers focus:outline-none focus:border-emerald-500"
                />
                <span className="absolute right-3.5 top-2.5 text-xs text-slate-400 font-mono-numbers">kg</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Comprimento (cm)
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.5"
                  min="1"
                  value={lengthCm}
                  onChange={(e) => setLengthCm(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm font-bold text-slate-100 font-mono-numbers focus:outline-none focus:border-emerald-500"
                />
                <span className="absolute right-3.5 top-2.5 text-xs text-slate-400 font-mono-numbers">cm</span>
              </div>
            </div>
          </div>

          {/* Bait Used (Crucial Requirement) */}
          <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                <Anchor className="w-4 h-4 text-emerald-400" />
                <span>Isca Utilizada para Capturar *</span>
              </label>
              <span className="text-[11px] text-slate-400">Gera relatórios de eficácia de iscas</span>
            </div>

            {/* Quick bait pills */}
            <div className="text-[11px] text-slate-400">Iscas Mais Populares no Barrantuba:</div>
            <div className="flex flex-wrap gap-1.5">
              {COMMON_BAITS.map((b, i) => (
                <button
                  type="button"
                  key={i}
                  onClick={() => handleSelectBaitPreset(b)}
                  className={`text-xs px-2.5 py-1 rounded-md transition-colors ${
                    baitUsed === b.name
                      ? 'bg-emerald-500 text-slate-950 font-bold'
                      : 'bg-slate-900 border border-slate-800 text-slate-300 hover:text-white'
                  }`}
                >
                  {b.name}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Nome Específico da Isca</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Zig Zara 110 Osso, Camarão D.O.A 9cm..."
                  value={baitUsed}
                  onChange={(e) => setBaitUsed(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Categoria da Isca</label>
                <select
                  value={baitCategory}
                  onChange={(e) => setBaitCategory(e.target.value as BaitCategory)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
                >
                  <option value="superficie">Superfície (Zara / Stick / Popper)</option>
                  <option value="meia_agua">Meia-Água (Plug Minnow / Twitch)</option>
                  <option value="soft_camarao">Camarão Soft / Criatura</option>
                  <option value="fundo_jig">Fundo & Jig Head / Colher</option>
                  <option value="isca_viva">Isca Viva (Lambari / Camarão)</option>
                  <option value="isca_natural">Isca Natural (Massa / Minhocuçu)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Technique */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Trabalho da Isca & Técnica
            </label>
            <input
              type="text"
              placeholder="Ex: Toques curtos de ponta de vara rente ao pedral..."
              value={technique}
              onChange={(e) => setTechnique(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Pesque & Solte Toggle */}
          <div className="flex items-center justify-between p-3.5 bg-slate-950/60 border border-slate-800 rounded-xl">
            <div>
              <div className="text-xs font-bold text-slate-200">Modalidade Pesque & Solte</div>
              <div className="text-[11px] text-slate-400">O peixe foi devolvido com vida para a água?</div>
            </div>
            <button
              type="button"
              onClick={() => setReleased(!released)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                released
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/50'
                  : 'bg-slate-800 text-slate-400'
              }`}
            >
              {released && <Check className="w-3.5 h-3.5" />}
              <span>{released ? 'Sim, Solto com Vida!' : 'Peixe Conservado'}</span>
            </button>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Relato da Fisgada & Observações
            </label>
            <textarea
              rows={2}
              placeholder="Detalhes da briga, condição da água, momento do bote..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Photo select & Gallery upload */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Camera className="w-4 h-4 text-emerald-400" />
                <span>Foto do Troféu Capturado</span>
              </label>
              <span className="text-[10px] text-emerald-400 font-medium">Galeria do Celular</span>
            </div>

            {/* Hidden file input for phone gallery */}
            <input
              ref={catchFileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFishPhotoUpload}
            />

            {/* Button to open mobile gallery / camera */}
            <button
              type="button"
              onClick={() => catchFileInputRef.current?.click()}
              className="w-full py-2.5 px-3.5 rounded-xl bg-slate-950 border border-emerald-500/50 hover:border-emerald-400 text-emerald-300 hover:text-emerald-200 text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm active:scale-[0.99]"
            >
              <Camera className="w-4 h-4 text-emerald-400" />
              <span>📷 Escolher Foto do Peixe da Galeria / Câmera</span>
            </button>

            {customFishPhoto && (
              <div className="relative rounded-xl overflow-hidden border-2 border-emerald-500 shadow-md">
                <img
                  src={customFishPhoto}
                  alt="Foto do Peixe"
                  className="w-full h-36 object-cover"
                />
                <div className="absolute top-2 left-2 bg-emerald-950/90 border border-emerald-500/80 text-emerald-300 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                  <Check className="w-3 h-3" />
                  <span>Foto do Peixe Selecionada da Galeria</span>
                </div>
                <button
                  type="button"
                  onClick={() => catchFileInputRef.current?.click()}
                  className="absolute bottom-2 right-2 bg-slate-950/80 hover:bg-slate-900 text-slate-200 text-[10px] font-semibold px-2 py-1 rounded-lg border border-slate-700"
                >
                  Trocar Foto
                </button>
              </div>
            )}

            <div className="text-[11px] text-slate-400 pt-1">Ou selecione uma foto padrão:</div>
            <div className="grid grid-cols-3 gap-2">
              {[
                { url: TROPHY_FISH_IMAGE, label: 'Tucunaré Troféu' },
                { url: HERO_DAWN_IMAGE, label: 'Pescaria no Barco' },
                { url: SPOT_RIVER_IMAGE, label: 'Pesca no Rio' }
              ].map((opt, i) => (
                <div
                  key={i}
                  onClick={() => {
                    setPhotoUrl(opt.url);
                    setCustomFishPhoto(null);
                  }}
                  className={`relative cursor-pointer rounded-lg overflow-hidden border-2 transition-all ${
                    photoUrl === opt.url && !customFishPhoto ? 'border-emerald-500 shadow-lg ring-1 ring-emerald-500' : 'border-slate-800 opacity-60 hover:opacity-100'
                  }`}
                >
                  <img src={opt.url} alt={opt.label} className="w-full h-16 object-cover" />
                  <span className="absolute bottom-1 left-1 bg-slate-950/80 text-[10px] text-white px-1.5 py-0.5 rounded">
                    {opt.label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Submit */}
          <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-xs font-medium text-slate-400 hover:text-slate-200"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-lg transition-transform active:scale-95 flex items-center gap-2"
            >
              <Fish className="w-4 h-4" />
              <span>Confirmar Captura no Barrantuba</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
