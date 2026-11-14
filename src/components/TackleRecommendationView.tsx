import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  Bookmark,
  BookmarkCheck,
  Check,
  ChevronRight,
  Compass,
  Fish,
  Gauge,
  Layers,
  Scale,
  Search,
  Shield,
  SlidersHorizontal,
  Trash2,
  Waves,
  Wrench,
} from 'lucide-react';
import { User } from '../types';
import { apiSync } from '../services/storageService';
import {
  DEFAULT_FISH_IMAGES,
  LOCAL_BAIT_FALLBACK_IMAGES,
  fetchSpeciesPhotosFromDb,
  getCachedDbSpeciesPhotos,
  getDirectExactBaitImageUrl,
} from '../services/cityWeatherService';
import {
  BaitPreference,
  DEFAULT_TACKLE_CATALOG,
  FishingMode,
  SavedTackleKit,
  TackleBaitAndHook,
  TackleCatalog,
  TackleEnvironmentGroup,
  TackleKitRecommendation,
  TackleSpecies,
  recommendTackleKit,
} from '../services/tackleRecommendationEngine';

interface TackleRecommendationViewProps {
  currentUser: User;
  onApplyKitToProfile?: (kit: TackleKitRecommendation) => void;
}

type EnvironmentFilter = 'Todos' | TackleEnvironmentGroup;

function formatPtNumber(val: number, decimals = 1): string {
  return val.toFixed(decimals).replace('.', ',');
}

function getHabitatSummary(habitats: TackleSpecies['habitats']): string {
  const labels: Record<TackleSpecies['habitats'][number], string> = {
    rio: 'Rio',
    lago: 'Lago',
    mar: 'Mar',
    mangue: 'Mangue',
  };
  return habitats.map(h => labels[h]).join(' / ');
}

function getFeedingLabel(behavior: TackleSpecies['feedingBehavior']): string {
  if (behavior === 'predador') return 'Predador';
  if (behavior === 'onívoro') return 'Onívoro';
  return 'Herbívoro';
}

function getDepthLabel(depth: TackleSpecies['swimDepth']): string {
  if (depth === 'superfície') return 'Superfície';
  if (depth === 'meia-água') return 'Meia-água';
  return 'Fundo';
}

export function TackleRecommendationView({
  currentUser,
  onApplyKitToProfile,
}: TackleRecommendationViewProps) {
  const [catalog, setCatalog] = useState<TackleCatalog>(DEFAULT_TACKLE_CATALOG);
  const [savedKits, setSavedKits] = useState<SavedTackleKit[]>([]);
  const [dbSpeciesPhotos, setDbSpeciesPhotos] = useState<Record<string, string>>(() =>
    getCachedDbSpeciesPhotos()
  );
  const [imgFallbackStage, setImgFallbackStage] = useState<Record<string, number>>({});

  // 3-step wizard state
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [showSavedDrawer, setShowSavedDrawer] = useState(false);

  // Step 1: Search & environment filters
  const [searchQuery, setSearchQuery] = useState('');
  const [envFilter, setEnvFilter] = useState<EnvironmentFilter>('Todos');
  const [selectedSpecies, setSelectedSpecies] = useState<TackleSpecies | null>(null);

  // Step 2: Context answers
  const [fishingMode, setFishingMode] = useState<FishingMode>('embarcado');
  const [baitPreference, setBaitPreference] = useState<BaitPreference>('artificial');

  // Step 3: Active bait preview override (when user taps an alternative bait)
  const [selectedAltBait, setSelectedAltBait] = useState<TackleBaitAndHook | null>(null);
  const [justSavedKitId, setJustSavedKitId] = useState<string | null>(null);
  const [appliedToProfile, setAppliedToProfile] = useState(false);
  const [savingKit, setSavingKit] = useState(false);

  // Load 5 equipment catalog tables, saved user kits, and latest 3D/custom species photos from PostgreSQL
  useEffect(() => {
    let active = true;
    void apiSync.fetchTackleCatalog().then(data => {
      if (active && data?.species?.length) {
        setCatalog(data);
      }
    });
    void apiSync.fetchSavedTackleKits(currentUser.id).then(kits => {
      if (active) setSavedKits(kits);
    });
    void fetchSpeciesPhotosFromDb().then(({ photosBySpecies }) => {
      if (active && Object.keys(photosBySpecies).length > 0) {
        setDbSpeciesPhotos(photosBySpecies);
      }
    });
    return () => {
      active = false;
    };
  }, [currentUser.id]);

  // Helper returning 3D transparent PNG URL (preferring Admin custom upload if saved in DB)
  const resolveSpeciesImage = (sp: TackleSpecies): string => {
    const stage = imgFallbackStage[`sp_${sp.id}`] || 0;
    const fromDb = dbSpeciesPhotos[sp.speciesPhotoId];
    const localDefault =
      DEFAULT_FISH_IMAGES[sp.speciesPhotoId] || DEFAULT_FISH_IMAGES.tucunare;

    if (stage === 0 && fromDb) return fromDb;
    if (stage <= 1) return `/api/species-photos/${encodeURIComponent(sp.speciesPhotoId)}/image`;
    return localDefault;
  };

  const resolveBaitImage = (bait: TackleBaitAndHook): string => {
    const stage = imgFallbackStage[`bait_${bait.id}`] || 0;
    const direct = getDirectExactBaitImageUrl(bait.name);
    const localFallback =
      LOCAL_BAIT_FALLBACK_IMAGES[bait.baitPhotoId] ||
      LOCAL_BAIT_FALLBACK_IMAGES.colher_metal_jig;

    if (stage === 0) {
      return `/api/bait-photos/${encodeURIComponent(`exact_${bait.baitPhotoId}`)}/image?name=${encodeURIComponent(bait.name)}`;
    }
    if (stage === 1 && direct?.imageUrl) {
      return direct.imageUrl;
    }
    return localFallback;
  };

  const filteredSpecies = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return catalog.species.filter(sp => {
      const envMatch = envFilter === 'Todos' || sp.environmentGroup === envFilter;
      if (!envMatch) return false;
      if (!q) return true;
      const text = `${sp.popularName} ${sp.scientificName} ${sp.habitats.join(' ')} ${sp.environmentGroup} ${sp.feedingBehavior}`.toLowerCase();
      return text.includes(q);
    });
  }, [catalog.species, envFilter, searchQuery]);

  const recommendation = useMemo<TackleKitRecommendation | null>(() => {
    if (!selectedSpecies) return null;
    return recommendTackleKit(selectedSpecies, fishingMode, baitPreference, catalog);
  }, [selectedSpecies, fishingMode, baitPreference, catalog]);

  const activeBait = selectedAltBait || recommendation?.baitAndHook || null;

  const isCurrentKitAlreadySaved = useMemo(() => {
    if (!recommendation) return false;
    return savedKits.some(
      k =>
        k.speciesId === recommendation.species.id &&
        k.fishingMode === recommendation.fishingMode &&
        k.baitPreference === recommendation.baitPreference
    );
  }, [recommendation, savedKits]);

  const handleSelectSpecies = (sp: TackleSpecies) => {
    setSelectedSpecies(sp);
    setSelectedAltBait(null);
    setJustSavedKitId(null);
    setAppliedToProfile(false);
    // Smart sensible default context based on species biology (still editable by user in Step 2!)
    setBaitPreference(sp.feedingBehavior === 'predador' ? 'artificial' : 'natural');
    setFishingMode(sp.environmentGroup === 'Alto Mar' ? 'embarcado' : 'embarcado');
    setStep(2);
  };

  const handleGenerateKit = () => {
    if (!selectedSpecies) return;
    setSelectedAltBait(null);
    setJustSavedKitId(null);
    setAppliedToProfile(false);
    setStep(3);
  };

  const handleSaveKitToDb = async () => {
    if (!recommendation || savingKit) return;
    setSavingKit(true);
    try {
      const kitWithActiveBait: TackleKitRecommendation = activeBait
        ? { ...recommendation, baitAndHook: activeBait }
        : recommendation;
      const kitRecord: SavedTackleKit = {
        id: `kit_${currentUser.id}_${recommendation.species.id}_${recommendation.fishingMode}_${recommendation.baitPreference}`,
        userId: currentUser.id,
        speciesId: recommendation.species.id,
        speciesName: recommendation.species.popularName,
        fishingMode: recommendation.fishingMode,
        baitPreference: recommendation.baitPreference,
        kitData: kitWithActiveBait,
        createdAt: new Date().toISOString(),
      };
      setSavedKits(prev => [kitRecord, ...prev.filter(k => k.id !== kitRecord.id)]);
      setJustSavedKitId(kitRecord.id);
      await apiSync.postTackleKit(kitRecord);
    } finally {
      setSavingKit(false);
    }
  };

  const handleDeleteSavedKit = async (kitId: string) => {
    setSavedKits(prev => prev.filter(k => k.id !== kitId));
    await apiSync.deleteTackleKit(kitId, currentUser.id);
  };

  const handleLoadSavedKit = (saved: SavedTackleKit) => {
    const matchedSp =
      catalog.species.find(s => s.id === saved.speciesId) || saved.kitData.species;
    setSelectedSpecies(matchedSp);
    setFishingMode(saved.fishingMode);
    setBaitPreference(saved.baitPreference);
    setSelectedAltBait(saved.kitData.baitAndHook);
    setShowSavedDrawer(false);
    setStep(3);
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-4 pb-6">
      {/* Top Workspace Header */}
      <div className="bg-[#071421] border border-slate-800/90 rounded-2xl p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
              <Compass className="w-5 h-5 text-emerald-400 shrink-0" />
              <span className="truncate">Equipamento Ideal</span>
            </h1>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              Cruzamento biológico da espécie com especificações técnicas de vara, molinete/carretilha, linha, leader e isca.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowSavedDrawer(!showSavedDrawer)}
            className={`min-h-[44px] px-3 py-2 rounded-xl border text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
              showSavedDrawer
                ? 'bg-emerald-500/15 border-emerald-500/50 text-emerald-300'
                : 'bg-slate-900/80 border-slate-700/80 text-slate-200 hover:border-emerald-500/40'
            }`}
          >
            <Bookmark className="w-4 h-4 text-emerald-400" />
            <span>Salvos ({savedKits.length})</span>
          </button>
        </div>

        {/* Interactive 3-Step Flow Selector */}
        <div className="mt-4 grid grid-cols-3 gap-1.5 p-1 bg-[#040d16] rounded-xl border border-slate-800/80">
          <button
            type="button"
            onClick={() => setStep(1)}
            className={`min-h-[40px] px-2 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap truncate cursor-pointer ${
              step === 1
                ? 'bg-emerald-500 text-slate-950 font-bold'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            1. Espécie
          </button>
          <button
            type="button"
            disabled={!selectedSpecies}
            onClick={() => selectedSpecies && setStep(2)}
            className={`min-h-[40px] px-2 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap truncate ${
              !selectedSpecies
                ? 'text-slate-600 cursor-not-allowed'
                : step === 2
                  ? 'bg-emerald-500 text-slate-950 font-bold cursor-pointer'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60 cursor-pointer'
            }`}
          >
            2. Contexto
          </button>
          <button
            type="button"
            disabled={!selectedSpecies}
            onClick={() => selectedSpecies && setStep(3)}
            className={`min-h-[40px] px-2 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap truncate ${
              !selectedSpecies
                ? 'text-slate-600 cursor-not-allowed'
                : step === 3
                  ? 'bg-emerald-500 text-slate-950 font-bold cursor-pointer'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60 cursor-pointer'
            }`}
          >
            3. Kit Ideal
          </button>
        </div>
      </div>

      {/* Saved Kits Drawer (PostgreSQL tackle_saved_kits) */}
      {showSavedDrawer && (
        <section className="bg-[#071421] border border-emerald-500/30 rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-white">Kits Salvos na Sua Conta</h2>
            <button
              type="button"
              onClick={() => setShowSavedDrawer(false)}
              className="text-xs text-slate-400 hover:text-white px-2 py-1 cursor-pointer"
            >
              Fechar
            </button>
          </div>

          {savedKits.length === 0 ? (
            <div className="py-6 text-center text-xs text-slate-400 border-t border-slate-800/80">
              Nenhum kit salvo ainda. Escolha um peixe e clique em "Salvar Kit no Banco" para consultar quando estiver na beira do rio.
            </div>
          ) : (
            <div className="divide-y divide-slate-800/80 border-t border-slate-800/80">
              {savedKits.map(kit => (
                <div
                  key={kit.id}
                  className="py-3 flex items-center justify-between gap-3"
                >
                  <button
                    type="button"
                    onClick={() => handleLoadSavedKit(kit)}
                    className="min-w-0 flex-1 text-left cursor-pointer group"
                  >
                    <div className="text-sm font-semibold text-white group-hover:text-emerald-300 truncate">
                      {kit.speciesName}
                    </div>
                    <div className="text-xs text-slate-400 mt-0.5 truncate">
                      {kit.fishingMode === 'barranco' ? 'Barranco' : 'Embarcado'}
                      <span className="mx-1.5">·</span>
                      {kit.baitPreference === 'artificial' ? 'Isca Artificial' : 'Isca Natural'}
                      <span className="mx-1.5">·</span>
                      <span className="font-mono-numbers">
                        {kit.kitData.balanceSummary.targetResistanceLb} lb
                      </span>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleDeleteSavedKit(kit.id)}
                    aria-label={`Excluir kit de ${kit.speciesName}`}
                    className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-950/30 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* ===================================================================== */}
      {/* PASSO 1: BUSCA DO PEIXE E FILTRO POR AMBIENTE */}
      {/* ===================================================================== */}
      {step === 1 && (
        <section className="space-y-3">
          {/* Search Input & Environment Segmented Filter */}
          <div className="bg-[#071421] border border-slate-800/90 rounded-2xl p-4 space-y-3">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Buscar peixe (ex: Tucunaré, Robalo, Dourado, Tilápia)..."
                className="w-full min-h-[44px] bg-[#040d16] border border-slate-700/80 focus:border-emerald-500 rounded-xl pl-10 pr-4 text-sm text-white placeholder-slate-500 outline-none transition-colors"
              />
            </div>

            <div className="grid grid-cols-4 gap-1 p-1 bg-[#040d16] rounded-xl border border-slate-800/80">
              {(['Todos', 'Água Doce', 'Costeira', 'Alto Mar'] as EnvironmentFilter[]).map(env => (
                <button
                  key={env}
                  type="button"
                  onClick={() => setEnvFilter(env)}
                  className={`min-h-[40px] px-1.5 py-1.5 rounded-lg text-[11px] font-semibold transition-colors whitespace-nowrap truncate cursor-pointer ${
                    envFilter === env
                      ? 'bg-slate-800 text-emerald-300 border border-emerald-500/40'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {env}
                </button>
              ))}
            </div>
          </div>

          {/* Species List */}
          {filteredSpecies.length === 0 ? (
            <div className="bg-[#071421] border border-slate-800/90 rounded-2xl p-8 text-center space-y-3">
              <Fish className="w-8 h-8 text-slate-600 mx-auto" />
              <div className="text-sm font-semibold text-slate-200">
                Nenhuma espécie encontrada para "{searchQuery}"
              </div>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setEnvFilter('Todos');
                }}
                className="min-h-[44px] px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs cursor-pointer"
              >
                Limpar Filtros
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-2.5">
              {filteredSpecies.map(sp => {
                const isSelected = selectedSpecies?.id === sp.id;
                return (
                  <button
                    key={sp.id}
                    type="button"
                    onClick={() => handleSelectSpecies(sp)}
                    className={`w-full text-left bg-[#071421] border rounded-2xl p-3.5 flex items-center gap-3.5 transition-colors cursor-pointer group ${
                      isSelected
                        ? 'border-emerald-500/70 bg-emerald-950/15'
                        : 'border-slate-800/90 hover:border-emerald-500/40 hover:bg-[#091929]'
                    }`}
                  >
                    {/* Floating 3D Transparent PNG Fish */}
                    <div className="w-20 h-16 shrink-0 flex items-center justify-center relative">
                      <div className="absolute inset-x-2 bottom-1 h-2 bg-black/50 rounded-full blur-sm" />
                      <img
                        src={resolveSpeciesImage(sp)}
                        alt={sp.popularName}
                        referrerPolicy="no-referrer"
                        onError={() =>
                          setImgFallbackStage(prev => ({
                            ...prev,
                            [`sp_${sp.id}`]: (prev[`sp_${sp.id}`] || 0) + 1,
                          }))
                        }
                        className="relative w-full h-full object-contain drop-shadow-[0_8px_10px_rgba(0,0,0,0.75)] transition-transform duration-200 group-hover:scale-105"
                      />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <h3 className="text-sm font-bold text-white group-hover:text-emerald-300 truncate">
                          {sp.popularName}
                        </h3>
                        <span className="text-xs font-mono-numbers font-semibold text-emerald-400 shrink-0">
                          {formatPtNumber(sp.avgWeightKg)} kg
                        </span>
                      </div>

                      <div className="text-[11px] italic text-slate-400 truncate mt-0.5">
                        {sp.scientificName}
                      </div>

                      <div className="text-xs text-slate-300 mt-1.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
                        <span>{sp.environmentGroup}</span>
                        <span aria-hidden="true" className="text-slate-600">·</span>
                        <span>{getHabitatSummary(sp.habitats)}</span>
                        <span aria-hidden="true" className="text-slate-600">·</span>
                        <span>{getFeedingLabel(sp.feedingBehavior)}</span>
                        <span aria-hidden="true" className="text-slate-600">·</span>
                        <span>{getDepthLabel(sp.swimDepth)}</span>
                      </div>
                    </div>

                    <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-emerald-400 shrink-0" />
                  </button>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* ===================================================================== */}
      {/* PASSO 2: CONTEXTO (2 PERGUNTAS RÁPIDAS) */}
      {/* ===================================================================== */}
      {step === 2 && selectedSpecies && (
        <section className="space-y-4">
          {/* Selected Fish Summary Header */}
          <div className="bg-[#071421] border border-slate-800/90 rounded-2xl p-4 flex items-center gap-4">
            <div className="w-24 h-20 shrink-0 flex items-center justify-center relative">
              <div className="absolute inset-x-2 bottom-1 h-2 bg-black/50 rounded-full blur-sm" />
              <img
                src={resolveSpeciesImage(selectedSpecies)}
                alt={selectedSpecies.popularName}
                referrerPolicy="no-referrer"
                onError={() =>
                  setImgFallbackStage(prev => ({
                    ...prev,
                    [`sp_${selectedSpecies.id}`]: (prev[`sp_${selectedSpecies.id}`] || 0) + 1,
                  }))
                }
                className="relative w-full h-full object-contain drop-shadow-[0_10px_14px_rgba(0,0,0,0.8)]"
              />
            </div>

            <div className="min-w-0 flex-1">
              <div className="text-xs text-emerald-400 font-semibold">
                {selectedSpecies.environmentGroup} · {getHabitatSummary(selectedSpecies.habitats)}
              </div>
              <h2 className="text-base font-bold text-white truncate mt-0.5">
                {selectedSpecies.popularName}
              </h2>
              <div className="text-xs text-slate-400 mt-1 leading-relaxed">
                Peso médio <span className="font-mono-numbers text-slate-200">{formatPtNumber(selectedSpecies.avgWeightKg)} kg</span>
                <span className="mx-1.5 text-slate-600">·</span>
                Boca {selectedSpecies.mouthType}
                <span className="mx-1.5 text-slate-600">·</span>
                {getDepthLabel(selectedSpecies.swimDepth)}
              </div>
            </div>
          </div>

          {/* Question 1 & Question 2 */}
          <div className="bg-[#071421] border border-slate-800/90 rounded-2xl p-4 space-y-5">
            {/* Pergunta 1: Barranco vs Embarcado */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <label className="text-sm font-bold text-white">
                  1. Como você vai pescar hoje?
                </label>
                <span className="text-xs text-slate-400">Define tamanho da vara</span>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => setFishingMode('barranco')}
                  className={`min-h-[76px] p-3.5 rounded-xl border text-left transition-colors cursor-pointer ${
                    fishingMode === 'barranco'
                      ? 'bg-emerald-500/15 border-emerald-500 text-white'
                      : 'bg-[#040d16] border-slate-800 text-slate-300 hover:border-slate-600'
                  }`}
                >
                  <div className="text-sm font-bold flex items-center justify-between">
                    <span>Barranco</span>
                    {fishingMode === 'barranco' && <Check className="w-4 h-4 text-emerald-400" />}
                  </div>
                  <p className="text-xs text-slate-400 mt-1 leading-snug">
                    Margem, praia ou costão. Prioriza varas mais longas e arremesso distante.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setFishingMode('embarcado')}
                  className={`min-h-[76px] p-3.5 rounded-xl border text-left transition-colors cursor-pointer ${
                    fishingMode === 'embarcado'
                      ? 'bg-emerald-500/15 border-emerald-500 text-white'
                      : 'bg-[#040d16] border-slate-800 text-slate-300 hover:border-slate-600'
                  }`}
                >
                  <div className="text-sm font-bold flex items-center justify-between">
                    <span>Embarcado</span>
                    {fishingMode === 'embarcado' && <Check className="w-4 h-4 text-emerald-400" />}
                  </div>
                  <p className="text-xs text-slate-400 mt-1 leading-snug">
                    Barco ou caiaque. Prioriza precisão entre galhadas e controle de trabalho.
                  </p>
                </button>
              </div>
            </div>

            <div className="border-t border-slate-800/80" />

            {/* Pergunta 2: Isca Artificial vs Natural */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <label className="text-sm font-bold text-white">
                  2. Qual tipo de isca prefere usar?
                </label>
                <span className="text-xs text-slate-400">Cruza hábito × profundidade</span>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => setBaitPreference('artificial')}
                  className={`min-h-[76px] p-3.5 rounded-xl border text-left transition-colors cursor-pointer ${
                    baitPreference === 'artificial'
                      ? 'bg-emerald-500/15 border-emerald-500 text-white'
                      : 'bg-[#040d16] border-slate-800 text-slate-300 hover:border-slate-600'
                  }`}
                >
                  <div className="text-sm font-bold flex items-center justify-between">
                    <span>Isca Artificial</span>
                    {baitPreference === 'artificial' && <Check className="w-4 h-4 text-emerald-400" />}
                  </div>
                  <p className="text-xs text-slate-400 mt-1 leading-snug">
                    Popper, stick, plug meia-água, camarão soft ou metal jig.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setBaitPreference('natural')}
                  className={`min-h-[76px] p-3.5 rounded-xl border text-left transition-colors cursor-pointer ${
                    baitPreference === 'natural'
                      ? 'bg-emerald-500/15 border-emerald-500 text-white'
                      : 'bg-[#040d16] border-slate-800 text-slate-300 hover:border-slate-600'
                  }`}
                >
                  <div className="text-sm font-bold flex items-center justify-between">
                    <span>Isca Natural</span>
                    {baitPreference === 'natural' && <Check className="w-4 h-4 text-emerald-400" />}
                  </div>
                  <p className="text-xs text-slate-400 mt-1 leading-snug">
                    Isca viva, camarão fresco, sardinha, massa ou minhoca com chumbo/boia.
                  </p>
                </button>
              </div>
            </div>

            <div className="pt-1 flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="min-h-[48px] px-4 py-2 rounded-xl border border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800/60 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Voltar</span>
              </button>

              <button
                type="button"
                onClick={handleGenerateKit}
                className="flex-1 min-h-[48px] px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <SlidersHorizontal className="w-4 h-4" />
                <span>Montar Kit Ideal</span>
              </button>
            </div>
          </div>
        </section>
      )}

      {/* ===================================================================== */}
      {/* PASSO 3: RESULTADO COMPLETO (KIT IDEAL + EXPLICAÇÕES TÉCNICAS) */}
      {/* ===================================================================== */}
      {step === 3 && recommendation && activeBait && (
        <section className="space-y-3.5">
          {/* Biological Balance Summary Banner */}
          <div className="bg-[#071421] border border-emerald-500/35 rounded-2xl p-4 space-y-3">
            <div className="flex items-center gap-3.5">
              <div className="w-24 h-20 shrink-0 flex items-center justify-center relative">
                <div className="absolute inset-x-2 bottom-1 h-2 bg-black/50 rounded-full blur-sm" />
                <img
                  src={resolveSpeciesImage(recommendation.species)}
                  alt={recommendation.species.popularName}
                  referrerPolicy="no-referrer"
                  onError={() =>
                    setImgFallbackStage(prev => ({
                      ...prev,
                      [`sp_${recommendation.species.id}`]:
                        (prev[`sp_${recommendation.species.id}`] || 0) + 1,
                    }))
                  }
                  className="relative w-full h-full object-contain drop-shadow-[0_10px_14px_rgba(0,0,0,0.85)]"
                />
              </div>

              <div className="min-w-0 flex-1">
                <div className="text-xs text-emerald-400 font-semibold">
                  Kit Ideal Balanceado ·{' '}
                  {recommendation.fishingMode === 'barranco' ? 'Barranco' : 'Embarcado'} ·{' '}
                  {recommendation.baitPreference === 'artificial' ? 'Artificial' : 'Natural'}
                </div>
                <h2 className="text-lg font-bold text-white leading-tight truncate mt-0.5">
                  {recommendation.species.popularName}
                </h2>
                <div className="text-xs text-slate-400 mt-1">
                  {recommendation.species.scientificName} ·{' '}
                  {getFeedingLabel(recommendation.species.feedingBehavior)} ·{' '}
                  {getDepthLabel(recommendation.species.swimDepth)}
                </div>
              </div>
            </div>

            {/* Tabular Engineering Balance Strip */}
            <div className="grid grid-cols-3 gap-2 pt-3 border-t border-slate-800/80 text-center">
              <div className="bg-[#040d16] rounded-xl p-2.5 border border-slate-800/70">
                <div className="text-[11px] text-slate-400">Resistência Alvo</div>
                <div className="text-base font-bold font-mono-numbers text-emerald-400 mt-0.5">
                  {recommendation.balanceSummary.targetResistanceLb} lb
                </div>
              </div>
              <div className="bg-[#040d16] rounded-xl p-2.5 border border-slate-800/70">
                <div className="text-[11px] text-slate-400">Ação da Vara</div>
                <div className="text-base font-bold text-white capitalize mt-0.5">
                  {recommendation.rod.action}
                </div>
              </div>
              <div className="bg-[#040d16] rounded-xl p-2.5 border border-slate-800/70">
                <div className="text-[11px] text-slate-400">Drag Indicado</div>
                <div className="text-base font-bold font-mono-numbers text-cyan-300 mt-0.5">
                  {formatPtNumber(recommendation.balanceSummary.targetDragKg)} kg
                </div>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed pt-1">
              <span className="font-semibold text-white">Cálculo de Segurança:</span>{' '}
              <span className="font-mono-numbers text-emerald-300">
                {recommendation.balanceSummary.formulaText}
              </span>
              . {recommendation.species.fightingStyle}
            </p>
          </div>

          {/* Detailed 5-Category Equipment Breakdown */}
          <div className="bg-[#071421] border border-slate-800/90 rounded-2xl divide-y divide-slate-800/80">
            {/* 1. VARA */}
            <div className="p-4 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                  <Wrench className="w-3.5 h-3.5" />
                  1. Vara
                </span>
                <span className="text-xs font-mono-numbers text-slate-400">
                  {recommendation.rod.powerClass}
                </span>
              </div>

              <h3 className="text-sm font-bold text-white">{recommendation.rod.name}</h3>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs pt-1">
                <div>
                  <div className="text-slate-400">Tamanho</div>
                  <div className="font-mono-numbers font-semibold text-slate-100">
                    {recommendation.rod.lengthLabel}
                  </div>
                </div>
                <div>
                  <div className="text-slate-400">Libragem</div>
                  <div className="font-mono-numbers font-semibold text-slate-100">
                    {recommendation.rod.lineMinLb}–{recommendation.rod.lineMaxLb} lb
                  </div>
                </div>
                <div>
                  <div className="text-slate-400">Ação</div>
                  <div className="font-semibold text-slate-100 capitalize">
                    {recommendation.rod.action}
                  </div>
                </div>
                <div>
                  <div className="text-slate-400">Casting máx.</div>
                  <div className="font-mono-numbers font-semibold text-slate-100">
                    {recommendation.rod.castingMinG}–{recommendation.rod.castingMaxG} g
                  </div>
                </div>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed pt-1">
                {recommendation.rodReason}
              </p>
            </div>

            {/* 2. CARRETILHA OU MOLINETE */}
            <div className="p-4 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                  <Gauge className="w-3.5 h-3.5" />
                  2. {recommendation.reel.type === 'carretilha' ? 'Carretilha' : 'Molinete'}
                </span>
                <span className="text-xs text-slate-400 capitalize">
                  Recolhimento {recommendation.reel.recoverySpeed}
                </span>
              </div>

              <h3 className="text-sm font-bold text-white">{recommendation.reel.name}</h3>

              <div className="grid grid-cols-3 gap-2 text-xs pt-1">
                <div>
                  <div className="text-slate-400">Capacidade</div>
                  <div className="font-mono-numbers font-semibold text-slate-100">
                    {recommendation.reel.lineCapacity}
                  </div>
                </div>
                <div>
                  <div className="text-slate-400">Drag máx.</div>
                  <div className="font-mono-numbers font-semibold text-slate-100">
                    {formatPtNumber(recommendation.reel.maxDragKg)} kg
                  </div>
                </div>
                <div>
                  <div className="text-slate-400">Relação</div>
                  <div className="font-mono-numbers font-semibold text-slate-100">
                    {recommendation.reel.gearRatio}
                  </div>
                </div>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed pt-1">
                {recommendation.reelReason}
              </p>
            </div>

            {/* 3. LINHA PRINCIPAL */}
            <div className="p-4 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                  <Waves className="w-3.5 h-3.5" />
                  3. Linha Principal
                </span>
                <span className="text-xs text-slate-400 capitalize">
                  {recommendation.lineAndLeader.lineType}
                </span>
              </div>

              <h3 className="text-sm font-bold text-white">
                {recommendation.lineAndLeader.lineName}
              </h3>

              <div className="grid grid-cols-3 gap-2 text-xs pt-1">
                <div>
                  <div className="text-slate-400">Tipo</div>
                  <div className="font-semibold text-slate-100 capitalize">
                    {recommendation.lineAndLeader.lineType}
                  </div>
                </div>
                <div>
                  <div className="text-slate-400">Resistência</div>
                  <div className="font-mono-numbers font-semibold text-slate-100">
                    {recommendation.lineAndLeader.strengthLb} lb
                  </div>
                </div>
                <div>
                  <div className="text-slate-400">Bitola</div>
                  <div className="font-mono-numbers font-semibold text-slate-100">
                    {formatPtNumber(recommendation.lineAndLeader.diameterMm, 2)} mm
                  </div>
                </div>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed pt-1">
                {recommendation.lineReason}
              </p>
            </div>

            {/* 4. LEADER */}
            <div className="p-4 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5" />
                  4. Leader
                </span>
                <span className="text-xs text-slate-400 capitalize">
                  {recommendation.lineAndLeader.leaderType}
                </span>
              </div>

              <h3 className="text-sm font-bold text-white capitalize">
                {recommendation.lineAndLeader.leaderType === 'dispensável'
                  ? 'Leader Dispensável (Linha Direta)'
                  : `Leader ${recommendation.lineAndLeader.leaderType} ${formatPtNumber(
                      recommendation.lineAndLeader.leaderDiameterMm,
                      2
                    )} mm · ${recommendation.lineAndLeader.leaderStrengthLb} lb`}
              </h3>

              <p className="text-xs text-slate-300 leading-relaxed pt-1">
                {recommendation.leaderReason}
              </p>
            </div>

            {/* 5. ISCA, ANZOL & CHUMBO/BOIA (com PNG 3D Transparente) */}
            <div className="p-4 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5" />
                  5. Isca, Anzol & Peso
                </span>
                <span className="text-xs text-slate-400 capitalize">
                  {activeBait.baitKind}
                </span>
              </div>

              <div className="flex items-center gap-3.5">
                <div className="w-24 h-20 shrink-0 flex items-center justify-center relative">
                  <div className="absolute inset-x-3 bottom-1 h-2 bg-black/50 rounded-full blur-sm" />
                  <img
                    src={resolveBaitImage(activeBait)}
                    alt={activeBait.name}
                    referrerPolicy="no-referrer"
                    onError={() =>
                      setImgFallbackStage(prev => ({
                        ...prev,
                        [`bait_${activeBait.id}`]: (prev[`bait_${activeBait.id}`] || 0) + 1,
                      }))
                    }
                    className="relative w-full h-full object-contain drop-shadow-[0_10px_14px_rgba(0,0,0,0.85)]"
                  />
                </div>

                <div className="min-w-0 flex-1 space-y-1.5">
                  <h3 className="text-sm font-bold text-white leading-snug">
                    {activeBait.name}
                  </h3>
                  <div className="text-xs text-slate-300">
                    Anzol: <span className="font-semibold text-white">{activeBait.hookSize}</span>
                  </div>
                  <div className="text-xs text-slate-300">
                    Chumbo / Boia:{' '}
                    <span className="font-semibold text-white">{activeBait.rigWeight}</span>
                    <span className="mx-1.5 text-slate-600">·</span>
                    <span className="font-mono-numbers text-emerald-300">{activeBait.weightG}g</span>
                  </div>
                </div>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed">
                {activeBait.id === recommendation.baitAndHook.id
                  ? recommendation.baitReason
                  : `${activeBait.notes} Montagem indicada com ${activeBait.hookSize} e ${activeBait.rigWeight}.`}
              </p>

              {/* Alternative Bait Selector */}
              {recommendation.alternativeBaits.length > 0 && (
                <div className="pt-2 space-y-1.5">
                  <div className="text-[11px] font-semibold text-slate-400">
                    Outras opções compatíveis para comparar:
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {[recommendation.baitAndHook, ...recommendation.alternativeBaits].map(alt => {
                      const active = activeBait.id === alt.id;
                      return (
                        <button
                          key={alt.id}
                          type="button"
                          onClick={() => setSelectedAltBait(alt)}
                          className={`min-h-[36px] px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors cursor-pointer ${
                            active
                              ? 'bg-emerald-500/20 border-emerald-500 text-emerald-200'
                              : 'bg-[#040d16] border-slate-800 text-slate-300 hover:border-slate-600'
                          }`}
                        >
                          {alt.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons Footer */}
          <div className="bg-[#071421] border border-slate-800/90 rounded-2xl p-4 space-y-2.5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <button
                type="button"
                disabled={savingKit}
                onClick={() => void handleSaveKitToDb()}
                className={`min-h-[48px] px-4 py-2.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer ${
                  justSavedKitId || isCurrentKitAlreadySaved
                    ? 'bg-emerald-500/20 border border-emerald-500/60 text-emerald-200'
                    : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950'
                }`}
              >
                {justSavedKitId || isCurrentKitAlreadySaved ? (
                  <>
                    <BookmarkCheck className="w-4 h-4" />
                    <span>Salvo nos Meus Kits</span>
                  </>
                ) : (
                  <>
                    <Bookmark className="w-4 h-4" />
                    <span>{savingKit ? 'Salvando...' : 'Salvar Kit no Banco'}</span>
                  </>
                )}
              </button>

              {onApplyKitToProfile && (
                <button
                  type="button"
                  onClick={() => {
                    onApplyKitToProfile({
                      ...recommendation,
                      baitAndHook: activeBait,
                    });
                    setAppliedToProfile(true);
                  }}
                  className={`min-h-[48px] px-4 py-2.5 rounded-xl border font-semibold text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer ${
                    appliedToProfile
                      ? 'bg-cyan-500/15 border-cyan-500/50 text-cyan-200'
                      : 'bg-[#040d16] border-slate-700 text-slate-100 hover:border-emerald-500/50'
                  }`}
                >
                  {appliedToProfile ? (
                    <>
                      <Check className="w-4 h-4 text-cyan-300" />
                      <span>Enviado ao Meu Perfil</span>
                    </>
                  ) : (
                    <>
                      <Scale className="w-4 h-4 text-emerald-400" />
                      <span>Usar no Meu Perfil</span>
                    </>
                  )}
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="min-h-[44px] px-3 py-2 rounded-xl border border-slate-800 text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800/60 cursor-pointer"
              >
                Alterar Contexto
              </button>
              <button
                type="button"
                onClick={() => setStep(1)}
                className="min-h-[44px] px-3 py-2 rounded-xl border border-slate-800 text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800/60 cursor-pointer"
              >
                Escolher Outro Peixe
              </button>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
