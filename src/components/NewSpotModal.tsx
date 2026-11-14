import { useState, useRef } from 'react';
import { FishingSpot, WaterType, AccessType, User } from '../types';
import { X, MapPin, Navigation, Plus, Search, CheckCircle2, Loader2, Compass, Image as ImageIcon, Upload, Camera, Check } from 'lucide-react';
import { SPOT_RIVER_IMAGE, HERO_DAWN_IMAGE, TROPHY_FISH_IMAGE } from '../services/storageService';

interface NewSpotModalProps {
  initialLatLng?: { lat: number; lng: number } | null;
  currentUser: User;
  onClose: () => void;
  onSave: (spot: FishingSpot) => void;
}

export function NewSpotModal({ initialLatLng, currentUser, onClose, onSave }: NewSpotModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [latitude, setLatitude] = useState(initialLatLng ? initialLatLng.lat.toFixed(5) : '-23.52500');
  const [longitude, setLongitude] = useState(initialLatLng ? initialLatLng.lng.toFixed(5) : '-46.73200');
  const [waterType, setWaterType] = useState<WaterType>('rio');
  const [accessType, setAccessType] = useState<AccessType>('barco');
  const [structureNotes, setStructureNotes] = useState('');
  const [depthMeters, setDepthMeters] = useState('5.0');
  const [selectedPhoto, setSelectedPhoto] = useState(SPOT_RIVER_IMAGE);
  const [customGalleryPhoto, setCustomGalleryPhoto] = useState<string | null>(null);
  const spotFileInputRef = useRef<HTMLInputElement>(null);

  const handleGalleryImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
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
          setSelectedPhoto(compressed);
          setCustomGalleryPhoto(compressed);
        } else {
          setSelectedPhoto(rawUrl);
          setCustomGalleryPhoto(rawUrl);
        }
      };
      img.src = rawUrl;
    };
    reader.readAsDataURL(file);
  };

  // Address Geocoding state
  const [addressSearchQuery, setAddressSearchQuery] = useState('');
  const [searchingAddress, setSearchingAddress] = useState(false);
  const [detectedAddress, setDetectedAddress] = useState('');

  // GPS real-time capture state
  const [locatingGps, setLocatingGps] = useState(false);
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null);
  const [gpsSuccessMessage, setGpsSuccessMessage] = useState('');

  // Baits tags
  const [baitInput, setBaitInput] = useState('');
  const [recommendedBaits, setRecommendedBaits] = useState<string[]>([
    'Zara Spook Jr 9cm',
    'Plug Meia-água Brava 90'
  ]);

  // Target species
  const [speciesInput, setSpeciesInput] = useState('');
  const [targetSpecies, setTargetSpecies] = useState<string[]>([
    'Tucunaré Azul',
    'Dourado'
  ]);

  // Real-time GPS capture requested by user
  const handleCaptureCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocalização não disponível no navegador do seu celular/computador.');
      return;
    }

    setLocatingGps(true);
    setGpsSuccessMessage('');

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const accuracy = Math.round(pos.coords.accuracy);

        setLatitude(lat.toFixed(5));
        setLongitude(lng.toFixed(5));
        setGpsAccuracy(accuracy);
        setLocatingGps(false);
        setGpsSuccessMessage(`Localização atual capturada com sucesso! (Precisão: ${accuracy}m)`);

        // Reverse geocode to suggest spot name or address
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=16`, {
            headers: { 'Accept-Language': 'pt-BR' }
          });
          if (res.ok) {
            const data = await res.json();
            if (data.display_name) {
              setDetectedAddress(data.display_name);
              if (!name.trim()) {
                // suggest locality or road
                const parts = data.display_name.split(',');
                setName(parts.slice(0, 2).join(' - ').trim());
              }
            }
          }
        } catch {
          // ignore network failure on reverse geocode
        }
      },
      (err) => {
        setLocatingGps(false);
        alert('Não foi possível obter sua localização exata. Verifique se o GPS e as permissões de localização estão ativados.');
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  // Search by Address / Landmark requested by user
  const handleSearchAddress = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!addressSearchQuery.trim()) return;

    setSearchingAddress(true);
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(addressSearchQuery.trim())}&countrycodes=br&limit=1`;
      const res = await fetch(url, { headers: { 'Accept-Language': 'pt-BR' } });
      if (!res.ok) throw new Error('Falha na busca de endereço');
      const results = await res.json();

      if (results && results.length > 0) {
        const item = results[0];
        const lat = parseFloat(item.lat);
        const lon = parseFloat(item.lon);
        setLatitude(lat.toFixed(5));
        setLongitude(lon.toFixed(5));
        setDetectedAddress(item.display_name);
        setGpsSuccessMessage(`Endereço localizado: ${item.display_name.split(',').slice(0, 3).join(', ')}`);
        if (!name.trim()) {
          setName(addressSearchQuery.trim());
        }
      } else {
        alert('Nenhum ponto ou endereço encontrado para esta busca. Tente adicionar a cidade ou estado.');
      }
    } catch {
      alert('Não foi possível consultar o serviço de endereços no momento. Você também pode clicar no mapa ou usar o GPS.');
    } finally {
      setSearchingAddress(false);
    }
  };

  const handleAddBait = () => {
    if (baitInput.trim() && !recommendedBaits.includes(baitInput.trim())) {
      setRecommendedBaits([...recommendedBaits, baitInput.trim()]);
      setBaitInput('');
    }
  };

  const handleRemoveBait = (bait: string) => {
    setRecommendedBaits(recommendedBaits.filter(b => b !== bait));
  };

  const handleAddSpecies = () => {
    if (speciesInput.trim() && !targetSpecies.includes(speciesInput.trim())) {
      setTargetSpecies([...targetSpecies, speciesInput.trim()]);
      setSpeciesInput('');
    }
  };

  const handleRemoveSpecies = (sp: string) => {
    setTargetSpecies(targetSpecies.filter(s => s !== sp));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert('Por favor informe o nome do ponto de pesca.');
      return;
    }

    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);
    if (isNaN(lat) || isNaN(lng)) {
      alert('Coordenadas inválidas. Use o botão de GPS ou busque por endereço.');
      return;
    }

    const newSpot: FishingSpot = {
      id: `spot_${Date.now()}`,
      name: name.trim(),
      description: description.trim() || (detectedAddress ? `Localizado próximo a: ${detectedAddress}` : 'Ponto de pesca cadastrado por membro do Clube Barrantuba.'),
      latitude: lat,
      longitude: lng,
      waterType,
      accessType,
      structureNotes: structureNotes.trim() || 'Estrutura natural com boa oxigenação e refúgio de peixes.',
      recommendedBaits: recommendedBaits.length > 0 ? recommendedBaits : ['Zara Spook', 'Meia-água'],
      targetSpecies: targetSpecies.length > 0 ? targetSpecies : ['Tucunaré', 'Robalo'],
      depthMeters: depthMeters ? parseFloat(depthMeters) : undefined,
      rating: 5.0,
      imageUrl: selectedPhoto,
      createdByUserId: currentUser.id,
      createdByUserName: currentUser.name,
      createdAt: new Date().toISOString().split('T')[0]
    };

    onSave(newSpot);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/85 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-[410px] bg-[#07131e] border border-slate-800 rounded-3xl shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-slate-800 flex items-center justify-between bg-[#040e17] shrink-0">
          <div>
            <h2 className="text-base font-extrabold text-white flex items-center gap-2">
              <MapPin className="w-4 h-4 text-emerald-400" />
              <span>Cadastrar Novo Ponto de Pesca</span>
            </h2>
            <p className="text-[11px] text-slate-400">
              Cadastre por endereço, GPS atual ou toque no mapa
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4 flex-1 text-xs">
          {/* Location Mode 1: REAL-TIME CURRENT GPS (Crucial User Requirement) */}
          <div className="p-3.5 bg-gradient-to-r from-emerald-950/40 via-slate-900 to-slate-900 border border-emerald-500/40 rounded-2xl space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="font-extrabold text-emerald-300 text-xs flex items-center gap-1.5 uppercase tracking-wide">
                <Navigation className="w-4 h-4 text-emerald-400" />
                <span>Localização Atual do Pescador</span>
              </span>
              <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/20 px-2 py-0.5 rounded-full">
                Em Tempo Real
              </span>
            </div>

            <p className="text-[11px] text-slate-300 leading-snug">
              Está na beira d'água agora? Clique abaixo para capturar sua coordenada real exata via satélite:
            </p>

            <button
              type="button"
              onClick={handleCaptureCurrentLocation}
              disabled={locatingGps}
              className="w-full py-3 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 active:scale-[0.98] text-slate-950 font-black text-xs shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              {locatingGps ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Obtendo Coordenadas GPS de Alta Precisão...</span>
                </>
              ) : (
                <>
                  <Compass className="w-4 h-4 stroke-[2.5]" />
                  <span>📍 Capturar Minha Localização Atual Agora (GPS)</span>
                </>
              )}
            </button>

            {gpsSuccessMessage && (
              <div className="p-2.5 rounded-xl bg-emerald-950/80 border border-emerald-500/60 text-emerald-300 text-[11px] flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold">{gpsSuccessMessage}</div>
                  {detectedAddress && (
                    <div className="text-[10px] text-slate-300 mt-0.5 line-clamp-1">{detectedAddress}</div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Location Mode 2: SEARCH BY ADDRESS OR LANDMARK (Crucial User Requirement) */}
          <div className="p-3 bg-slate-900/80 border border-slate-800 rounded-2xl space-y-2">
            <span className="font-bold text-slate-200 text-xs block">
              Ou Cadastrar por Endereço / Ponto de Referência
            </span>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Ex: Represa de Jurumirim, Rua do Porto Piracicaba..."
                value={addressSearchQuery}
                onChange={(e) => setAddressSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleSearchAddress();
                  }
                }}
                className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
              <button
                type="button"
                onClick={() => handleSearchAddress()}
                disabled={searchingAddress || !addressSearchQuery.trim()}
                className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 disabled:opacity-40"
              >
                {searchingAddress ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400" />
                ) : (
                  <Search className="w-3.5 h-3.5" />
                )}
                <span>Buscar</span>
              </button>
            </div>
          </div>

          {/* Spot Name */}
          <div>
            <label className="block font-bold text-slate-200 mb-1">
              Nome do Ponto de Pesca *
            </label>
            <input
              type="text"
              required
              placeholder="Ex: Curva dos Troncos, Bico da Ilha, Poço Fundo..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Water & Access Type */}
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="block font-semibold text-slate-300 mb-1">Tipo de Água</label>
              <select
                value={waterType}
                onChange={(e) => setWaterType(e.target.value as WaterType)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
              >
                <option value="rio">Rio / Correnteza</option>
                <option value="represa">Represa / Lago</option>
                <option value="manguezal">Manguezal / Estuário</option>
                <option value="mar">Mar / Costa</option>
                <option value="lagoa">Lagoa / Poço</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-300 mb-1">Forma de Acesso</label>
              <select
                value={accessType}
                onChange={(e) => setAccessType(e.target.value as AccessType)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
              >
                <option value="barco">Somente Barco</option>
                <option value="caiaque">Caiaque / Bote</option>
                <option value="barranco">Barranco / A pé</option>
                <option value="todos">Todos os Acessos</option>
              </select>
            </div>
          </div>

          {/* Active Coords Preview */}
          <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl">
            <div className="text-[11px] font-semibold text-slate-400 mb-1.5 flex items-center justify-between">
              <span>Coordenadas Geográficas do Ponto:</span>
              <span className="font-mono text-emerald-400">{latitude}, {longitude}</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div>
                <span className="text-slate-500 block">Latitude</span>
                <input
                  type="text"
                  required
                  value={latitude}
                  onChange={(e) => setLatitude(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg p-1.5 text-xs text-slate-100 font-mono focus:outline-none"
                />
              </div>
              <div>
                <span className="text-slate-500 block">Longitude</span>
                <input
                  type="text"
                  required
                  value={longitude}
                  onChange={(e) => setLongitude(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg p-1.5 text-xs text-slate-100 font-mono focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Structure Notes & Depth */}
          <div className="grid grid-cols-3 gap-2.5">
            <div className="col-span-2">
              <label className="block font-semibold text-slate-300 mb-1">Estrutura Submersa</label>
              <input
                type="text"
                placeholder="Ex: Galhadas, pedral, drop-off..."
                value={structureNotes}
                onChange={(e) => setStructureNotes(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-300 mb-1">Profundidade (m)</label>
              <input
                type="number"
                step="0.5"
                placeholder="5.0"
                value={depthMeters}
                onChange={(e) => setDepthMeters(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 font-mono focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Target Species */}
          <div>
            <label className="block font-semibold text-slate-300 mb-1">Espécies Presentes</label>
            <div className="flex gap-2 mb-1.5">
              <input
                type="text"
                placeholder="Ex: Robalo Flecha, Tucunaré..."
                value={speciesInput}
                onChange={(e) => setSpeciesInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddSpecies();
                  }
                }}
                className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
              <button
                type="button"
                onClick={handleAddSpecies}
                className="px-3 py-1.5 bg-slate-800 text-slate-200 rounded-xl text-xs font-semibold"
              >
                +
              </button>
            </div>
            <div className="flex flex-wrap gap-1">
              {targetSpecies.map((sp, idx) => (
                <span
                  key={idx}
                  className="bg-emerald-950/60 border border-emerald-800/40 text-emerald-300 px-2 py-0.5 rounded-lg text-[11px] inline-flex items-center gap-1"
                >
                  <span>{sp}</span>
                  <button type="button" onClick={() => handleRemoveSpecies(sp)} className="text-emerald-400 hover:text-rose-400">×</button>
                </span>
              ))}
            </div>
          </div>

          {/* Recommended Baits */}
          <div>
            <label className="block font-semibold text-slate-300 mb-1">Iscas Mais Eficientes</label>
            <div className="flex gap-2 mb-1.5">
              <input
                type="text"
                placeholder="Ex: Zara 110, Camarão soft 9cm..."
                value={baitInput}
                onChange={(e) => setBaitInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddBait();
                  }
                }}
                className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
              <button
                type="button"
                onClick={handleAddBait}
                className="px-3 py-1.5 bg-slate-800 text-slate-200 rounded-xl text-xs font-semibold"
              >
                +
              </button>
            </div>
            <div className="flex flex-wrap gap-1">
              {recommendedBaits.map((bait, idx) => (
                <span
                  key={idx}
                  className="bg-slate-800 text-slate-300 px-2 py-0.5 rounded-lg text-[11px] inline-flex items-center gap-1"
                >
                  <span>{bait}</span>
                  <button type="button" onClick={() => handleRemoveBait(bait)} className="text-slate-400 hover:text-rose-400">×</button>
                </span>
              ))}
            </div>
          </div>

          {/* Photo select & Gallery upload */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="font-semibold text-slate-300 flex items-center gap-1.5">
                <ImageIcon className="w-3.5 h-3.5 text-emerald-400" />
                <span>Foto do Ponto de Pesca</span>
              </label>
              <span className="text-[10px] text-emerald-400 font-medium">Galeria ou Câmera</span>
            </div>

            {/* Hidden file input for phone gallery */}
            <input
              ref={spotFileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleGalleryImageUpload}
            />

            {/* Button to open mobile gallery / camera */}
            <button
              type="button"
              onClick={() => spotFileInputRef.current?.click()}
              className="w-full py-2.5 px-3.5 rounded-xl bg-slate-900 border border-emerald-500/50 hover:border-emerald-400 text-emerald-300 hover:text-emerald-200 text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm active:scale-[0.99]"
            >
              <Camera className="w-4 h-4 text-emerald-400" />
              <span>📷 Escolher Foto da Minha Galeria / Câmera</span>
            </button>

            {customGalleryPhoto && (
              <div className="relative rounded-2xl overflow-hidden border-2 border-emerald-500 shadow-md">
                <img
                  src={customGalleryPhoto}
                  alt="Foto da Galeria"
                  className="w-full h-32 object-cover"
                />
                <div className="absolute top-2 left-2 bg-emerald-950/90 border border-emerald-500/80 text-emerald-300 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                  <Check className="w-3 h-3" />
                  <span>Foto da Galeria Selecionada</span>
                </div>
                <button
                  type="button"
                  onClick={() => spotFileInputRef.current?.click()}
                  className="absolute bottom-2 right-2 bg-slate-950/80 hover:bg-slate-900 text-slate-200 text-[10px] font-semibold px-2 py-1 rounded-lg border border-slate-700"
                >
                  Trocar Foto
                </button>
              </div>
            )}

            <div className="text-[10px] text-slate-400 pt-0.5">Ou escolha uma foto padrão do Barrantuba:</div>
            <div className="grid grid-cols-3 gap-2">
              {[
                { url: SPOT_RIVER_IMAGE, label: 'Curva de Rio' },
                { url: HERO_DAWN_IMAGE, label: 'Barco / Alvorada' },
                { url: TROPHY_FISH_IMAGE, label: 'Águas Claras' }
              ].map((opt, i) => (
                <div
                  key={i}
                  onClick={() => {
                    setSelectedPhoto(opt.url);
                    setCustomGalleryPhoto(null);
                  }}
                  className={`cursor-pointer rounded-xl overflow-hidden border-2 transition-all ${
                    selectedPhoto === opt.url && !customGalleryPhoto ? 'border-emerald-500 shadow-md ring-1 ring-emerald-500' : 'border-slate-800 opacity-60'
                  }`}
                >
                  <img src={opt.url} alt={opt.label} className="w-full h-14 object-cover" />
                </div>
              ))}
            </div>
          </div>

          {/* Submit */}
          <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 rounded-xl text-xs text-slate-400 hover:text-white"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-full bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-black text-xs shadow-lg shadow-emerald-500/25 flex items-center gap-1.5 active:scale-95 transition-transform"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Salvar Ponto de Pesca</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
