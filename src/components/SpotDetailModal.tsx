import { useEffect, useMemo, useState } from 'react';
import { FishingSpot, FishCatch, ActiveFishingSession, User } from '../types';
import { WeatherWidget } from './WeatherWidget';
import {
  SpeciesBiteData,
  SpeciesBaitGuide,
  CitySpeciesMeta,
  deriveEfficientLuresForSpecies,
  fetchSpeciesBaitsOnline,
  fetchSpotLocationSpecies,
  getCachedSpeciesBaitGuide,
  getCachedSpotLocationSpecies,
  getDirectExactBaitImageUrl,
  mapBaitNameToCanonicalClient,
} from '../services/cityWeatherService';
import { X, MapPin, Fish, Anchor, Trash2, Edit2, Radio, UserPlus, Sparkles } from 'lucide-react';

interface SpotDetailModalProps {
  spot: FishingSpot;
  currentUser: User | null;
  catches: FishCatch[];
  activeSessions: ActiveFishingSession[];
  onClose: () => void;
  onStartFishingHere: (spot: FishingSpot) => void;
  onRegisterCatchHere: (spot: FishingSpot) => void;
  onDeleteSpot?: (spotId: string) => void;
  onEditSpot?: (spot: FishingSpot) => void;
  onJoinSession?: (session: ActiveFishingSession) => void;
}

const WATER_TYPE_LABELS: Record<string, string> = {
  river: 'RIO',
  dam: 'REPRESA',
  sea: 'MAR ABERTO',
  lagoon: 'LAGOA',
  estuary: 'ESTUÁRIO',
};

const ACCESS_TYPE_LABELS: Record<string, string> = {
  boat: 'BARCO',
  shore: 'BARRANCO',
  kayak: 'CAIAQUE',
  wading: 'VADEIO',
};

export function SpotDetailModal({
  spot,
  currentUser,
  catches,
  activeSessions,
  onClose,
  onStartFishingHere,
  onRegisterCatchHere,
  onDeleteSpot,
  onEditSpot,
  onJoinSession
}: SpotDetailModalProps) {
  const spotCatches = catches.filter(c => c.spotId === spot.id);
  const activeFishersHere = activeSessions.filter(s => s.spotId === spot.id);
  const canManage = currentUser && (currentUser.role === 'admin' || currentUser.id === spot.createdByUserId);

  // Instantaneous synchronous hydration from in-memory + localStorage cache
  const initialCached = useMemo(
    () => getCachedSpotLocationSpecies(spot.latitude, spot.longitude, spot.name),
    [spot.latitude, spot.longitude, spot.name]
  );

  const [regionalSpecies, setRegionalSpecies] = useState<SpeciesBiteData[]>(
    () => initialCached?.speciesBiteTimes || []
  );
  const [speciesMeta, setSpeciesMeta] = useState<CitySpeciesMeta | null>(
    () => initialCached?.speciesMeta || null
  );
  const [isLoadingOnline, setIsLoadingOnline] = useState<boolean>(
    () => !initialCached || initialCached.speciesBiteTimes.length === 0
  );
  const [selectedSpeciesId, setSelectedSpeciesId] = useState<string | null>(null);
  const [selectedBaitGuide, setSelectedBaitGuide] = useState<SpeciesBaitGuide | null>(null);
  const [showAllLures, setShowAllLures] = useState(false);
  const [showAllSpecies, setShowAllSpecies] = useState(false);
  const [failedFishImages, setFailedFishImages] = useState<Record<string, boolean>>({});
  const [fallbackBaitImages, setFallbackBaitImages] = useState<Record<string, boolean>>({});
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Sync instantly when switching spots & refresh online regional data silently in background
  useEffect(() => {
    const cachedNow = getCachedSpotLocationSpecies(spot.latitude, spot.longitude, spot.name);
    if (cachedNow && cachedNow.speciesBiteTimes.length > 0) {
      setRegionalSpecies(cachedNow.speciesBiteTimes);
      setSpeciesMeta(cachedNow.speciesMeta);
      setIsLoadingOnline(false);
    } else {
      setRegionalSpecies([]);
      setSpeciesMeta(null);
      setIsLoadingOnline(true);
    }
    setSelectedSpeciesId(null);
    setSelectedBaitGuide(null);
    setShowAllLures(false);
    setShowAllSpecies(false);
    setConfirmDelete(false);

    const controller = new AbortController();
    fetchSpotLocationSpecies(spot.latitude, spot.longitude, spot.name, controller.signal)
      .then((res) => {
        if (res.speciesBiteTimes.length > 0) {
          setRegionalSpecies(res.speciesBiteTimes);
          setSpeciesMeta(res.speciesMeta);
        }
      })
      .catch((err: any) => {
        if (err?.name === 'AbortError' || /abort/i.test(String(err?.message || ''))) {
          return;
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setIsLoadingOnline(false);
        }
      });

    return () => {
      controller.abort();
    };
  }, [spot.id, spot.latitude, spot.longitude, spot.name]);

  // Whenever user selects a fish species, hydrate & fetch online researched baits saved in PostgreSQL
  useEffect(() => {
    if (!selectedSpeciesId) {
      setSelectedBaitGuide(null);
      return;
    }

    const sp = regionalSpecies.find(s => s.id === selectedSpeciesId);
    if (!sp) return;

    const cachedGuide = getCachedSpeciesBaitGuide(sp.id);
    if (cachedGuide) {
      setSelectedBaitGuide(cachedGuide);
    } else {
      setSelectedBaitGuide(null);
    }

    const controller = new AbortController();
    fetchSpeciesBaitsOnline(
      sp.id,
      sp.name,
      sp.scientificName,
      sp.environment || 'rio',
      controller.signal
    )
      .then((guide) => {
        setSelectedBaitGuide(guide);
      })
      .catch((err: any) => {
        if (err?.name === 'AbortError' || /abort/i.test(String(err?.message || ''))) {
          return;
        }
      });

    return () => {
      controller.abort();
    };
  }, [selectedSpeciesId, regionalSpecies]);

  // Derive efficient lures dynamically from the real fish present at this spot's coordinates
  const efficientLures = useMemo(() => {
    const derived = deriveEfficientLuresForSpecies(
      regionalSpecies,
      selectedSpeciesId,
      selectedBaitGuide
    );
    if (derived.length > 0) return derived;

    // Fallback only if online species list hasn't returned any items and spot has saved baits
    if (!isLoadingOnline && Array.isArray(spot.recommendedBaits) && spot.recommendedBaits.length > 0) {
      return spot.recommendedBaits.map((bait) => {
        const mapped = mapBaitNameToCanonicalClient(bait);
        const direct = getDirectExactBaitImageUrl(bait);
        return {
          name: bait,
          baitId: direct.baitId,
          image: direct.imageUrl,
          fallbackImage: mapped.fallbackImage,
          category: mapped.category,
          reason: `Indicada para ${spot.targetSpecies?.[0] || 'este ponto'}`,
          targetSpeciesId: 'registered',
          targetSpeciesName: spot.targetSpecies?.[0] || 'Região',
        };
      });
    }
    return [];
  }, [
    regionalSpecies,
    selectedSpeciesId,
    selectedBaitGuide,
    isLoadingOnline,
    spot.recommendedBaits,
    spot.targetSpecies,
  ]);

  // When a specific fish is tapped, show all of its researched baits immediately; otherwise show top 2
  const visibleLures = selectedSpeciesId
    ? efficientLures
    : showAllLures
    ? efficientLures
    : efficientLures.slice(0, 2);
  const visibleSpecies = showAllSpecies ? regionalSpecies : regionalSpecies.slice(0, 4);

  const selectedSpeciesObj = selectedSpeciesId
    ? regionalSpecies.find(s => s.id === selectedSpeciesId) || null
    : null;

  const waterLabel = WATER_TYPE_LABELS[spot.waterType] || String(spot.waterType || 'RIO').toUpperCase();
  const accessLabel = ACCESS_TYPE_LABELS[spot.accessType] || String(spot.accessType || 'BARCO').toUpperCase();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/85 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-[415px] bg-[#081220] border border-slate-800 rounded-3xl shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Header with spot cover photo & crisp mobile overlay matching design */}
        <div className="relative h-56 w-full overflow-hidden bg-slate-950 shrink-0">
          <img
            src={spot.imageUrl || '/src/assets/images/spot_curva_rio_1793877703444.jpg'}
            alt={spot.name}
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover opacity-75"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#081220] via-[#081220]/50 to-transparent" />

          {/* Close button */}
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar janela"
            className="absolute top-3.5 right-3.5 p-2.5 rounded-2xl bg-slate-800/80 border border-slate-600/60 text-slate-100 hover:bg-slate-700 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Spot titles & action buttons */}
          <div className="absolute bottom-3.5 left-4 right-4 flex flex-col gap-2.5">
            <div>
              <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-emerald-400 font-extrabold uppercase tracking-wider mb-1">
                <span>{waterLabel}</span>
                <span className="text-slate-400">·</span>
                <span>ACESSO: {accessLabel}</span>
                {spot.depthMeters ? (
                  <>
                    <span className="text-slate-400">·</span>
                    <span className="font-mono-numbers">PROFUNDIDADE: {spot.depthMeters}M</span>
                  </>
                ) : null}
              </div>
              <h2 className="text-2xl font-extrabold text-white tracking-tight leading-tight line-clamp-2">
                {spot.name}
              </h2>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => onStartFishingHere(spot)}
                className="flex-1 flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs shadow-lg transition-transform active:scale-95 cursor-pointer"
              >
                <Radio className="w-3.5 h-3.5 animate-pulse shrink-0" />
                <span className="truncate">Pescando Aqui Agora!</span>
              </button>
              <button
                type="button"
                onClick={() => onRegisterCatchHere(spot)}
                className="flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-[#0e1b2d]/95 hover:bg-slate-800 text-slate-100 font-semibold text-xs border border-slate-600/70 transition-colors cursor-pointer shrink-0"
              >
                <Fish className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                <span>Registrar Peixe</span>
              </button>
            </div>
          </div>
        </div>

        {/* Scrollable Content Body */}
        <div className="p-4 overflow-y-auto space-y-5 flex-1">
          {/* Estruturas Submersas & Dicas — Exact Card Layout Matching Reference */}
          <div className="bg-[#0c1728] border border-slate-700/60 rounded-2xl p-4 space-y-4 shadow-lg">
            <div className="flex items-center justify-between gap-2">
              <div className="text-xs uppercase tracking-wider text-slate-300 font-bold flex items-center gap-1.5">
                <Anchor className="w-4 h-4 text-cyan-400 shrink-0" />
                <span>ESTRUTURAS SUBMERSAS & DICAS</span>
              </div>
              {speciesMeta?.environmentLabel && (
                <span className="text-[10px] font-bold text-emerald-400">
                  {speciesMeta.environmentLabel.split(' ')[0]}
                </span>
              )}
            </div>

            <p className="text-sm text-slate-100 leading-relaxed">
              {spot.structureNotes || 'Estrutura natural com boa oxigenação e refúgio de peixes.'}
            </p>

            {/* Iscas Mais Eficientes Aqui (Matched accurately to bait name & online species research) */}
            <div>
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="text-sm font-bold text-slate-200 leading-snug">
                  Iscas Mais Eficientes Aqui:
                  {selectedSpeciesObj && (
                    <span className="ml-1.5 text-xs font-bold text-emerald-400">
                      ({selectedSpeciesObj.name})
                    </span>
                  )}
                </div>
                {selectedSpeciesObj && (
                  <button
                    type="button"
                    onClick={() => setSelectedSpeciesId(null)}
                    className="text-[11px] font-semibold text-cyan-400 hover:text-cyan-300 cursor-pointer shrink-0"
                  >
                    Ver todas
                  </button>
                )}
              </div>

              {isLoadingOnline && efficientLures.length === 0 ? (
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="h-[112px] rounded-xl bg-[#0e1b2d] border border-slate-700/60 animate-pulse" />
                  <div className="h-[112px] rounded-xl bg-[#0e1b2d] border border-slate-700/60 animate-pulse" />
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-2.5">
                    {visibleLures.map((lure, idx) => {
                      const imgSrc = fallbackBaitImages[lure.baitId] ? lure.fallbackImage : lure.image;
                      return (
                        <div
                          key={`${lure.baitId}-${lure.name}-${idx}`}
                          title={lure.reason || `Ideal para ${lure.targetSpeciesName}`}
                          className="bg-[#0e1b2d] border border-slate-700/75 rounded-xl p-2.5 flex flex-col items-center justify-between gap-1.5 min-h-[112px]"
                        >
                          <div className="text-xs font-semibold text-slate-100 text-center leading-tight line-clamp-2">
                            {lure.name}
                          </div>
                          <img
                            src={imgSrc}
                            alt={lure.name}
                            referrerPolicy="no-referrer"
                            onError={() =>
                              setFallbackBaitImages(prev => ({ ...prev, [lure.baitId]: true }))
                            }
                            className="w-full h-14 object-contain p-0.5 rounded-lg drop-shadow-[0_8px_14px_rgba(0,0,0,0.75)]"
                          />
                        </div>
                      );
                    })}
                  </div>

                  {/* Online research rationale note when a fish species is selected */}
                  {selectedSpeciesObj && (selectedBaitGuide?.researchSummary || selectedSpeciesObj.baitResearchSummary) && (
                    <div className="mt-2.5 bg-[#091423] border border-slate-800 rounded-xl px-3 py-2 text-[11px] text-slate-300 leading-relaxed">
                      <span className="text-emerald-400 font-bold">Pesquisa on-line: </span>
                      {selectedBaitGuide?.researchSummary || selectedSpeciesObj.baitResearchSummary}
                    </div>
                  )}

                  {!selectedSpeciesId && efficientLures.length > 2 && (
                    <button
                      type="button"
                      onClick={() => setShowAllLures(v => !v)}
                      className="mt-2 w-full text-center text-[11px] font-semibold text-slate-400 hover:text-emerald-400 transition-colors cursor-pointer"
                    >
                      {showAllLures
                        ? 'Mostrar menos iscas'
                        : `Ver mais ${efficientLures.length - 2} iscas eficientes da região`}
                    </button>
                  )}
                </>
              )}
            </div>

            {/* Espécies Alvo (Real online fish identified for this exact spot location) */}
            <div>
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="text-sm font-bold text-slate-200">Espécies Alvo:</div>
                {regionalSpecies.length > 0 && (
                  <span className="text-[10px] font-medium text-emerald-400/90">
                    Toque para ver isca
                  </span>
                )}
              </div>

              {isLoadingOnline && regionalSpecies.length === 0 ? (
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="h-[108px] rounded-xl bg-[#062920]/70 border border-emerald-500/30 animate-pulse" />
                  <div className="h-[108px] rounded-xl bg-[#062920]/70 border border-emerald-500/30 animate-pulse" />
                </div>
              ) : regionalSpecies.length > 0 ? (
                <>
                  <div className="grid grid-cols-2 gap-2.5">
                    {visibleSpecies.map((sp) => {
                      const isSelected = selectedSpeciesId === sp.id;
                      const imageBroken = failedFishImages[sp.id] || !sp.image;
                      return (
                        <button
                          key={sp.id}
                          type="button"
                          onClick={() => setSelectedSpeciesId(prev => (prev === sp.id ? null : sp.id))}
                          className={`bg-[#062920] rounded-xl p-2.5 flex flex-col items-center justify-between gap-1.5 min-h-[108px] text-center transition-all cursor-pointer ${
                            isSelected
                              ? 'border-2 border-emerald-400 ring-2 ring-emerald-400/25'
                              : 'border border-emerald-500/45 hover:border-emerald-400/80'
                          }`}
                        >
                          <div className="w-full h-14 flex items-center justify-center overflow-hidden rounded-lg">
                            {imageBroken ? (
                              <Fish className="w-8 h-8 text-emerald-300/80" />
                            ) : (
                              <img
                                src={sp.image}
                                alt={sp.name}
                                referrerPolicy="no-referrer"
                                onError={() => setFailedFishImages(prev => ({ ...prev, [sp.id]: true }))}
                                className="w-full h-full object-contain p-0.5 rounded-lg drop-shadow-[0_8px_14px_rgba(0,0,0,0.75)]"
                              />
                            )}
                          </div>
                          <div className="text-xs font-bold text-white leading-tight line-clamp-2">
                            {sp.name}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                  {regionalSpecies.length > 4 && (
                    <button
                      type="button"
                      onClick={() => setShowAllSpecies(v => !v)}
                      className="mt-2 w-full text-center text-[11px] font-semibold text-emerald-400 hover:text-emerald-300 transition-colors cursor-pointer"
                    >
                      {showAllSpecies
                        ? 'Mostrar menos espécies'
                        : `Ver todas as ${regionalSpecies.length} espécies reais desta localização`}
                    </button>
                  )}
                </>
              ) : (
                <div className="grid grid-cols-2 gap-2.5">
                  {(spot.targetSpecies || []).slice(0, 4).map((spName, idx) => (
                    <div
                      key={`${spName}-${idx}`}
                      className="bg-[#062920] border border-emerald-500/45 rounded-xl p-2.5 flex flex-col items-center justify-center gap-1.5 min-h-[84px] text-center"
                    >
                      <Fish className="w-7 h-7 text-emerald-300/80" />
                      <div className="text-xs font-bold text-white leading-tight">{spName}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Active Fishers Alert */}
          {activeFishersHere.length > 0 && (
            <div className="bg-emerald-950/40 border border-emerald-500/40 rounded-2xl p-4">
              <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm mb-2">
                <Radio className="w-4 h-4 animate-pulse" />
                <span>{activeFishersHere.length} parceiro(s) pescando neste ponto agora!</span>
              </div>
              <div className="space-y-2">
                {activeFishersHere.map(session => (
                  <div
                    key={session.id}
                    className="flex items-center justify-between gap-3 bg-slate-900/80 p-3 rounded-xl border border-slate-800"
                  >
                    <div className="flex items-center gap-3">
                      <img
                        src={session.userAvatar}
                        alt={session.userName}
                        referrerPolicy="no-referrer"
                        className="w-9 h-9 rounded-full object-cover border border-emerald-500"
                      />
                      <div>
                        <div className="font-semibold text-slate-100 text-xs">{session.userName}</div>
                        <div className="text-[11px] text-slate-400">{session.notes}</div>
                      </div>
                    </div>
                    {onJoinSession && (
                      <button
                        type="button"
                        onClick={() => onJoinSession(session)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/40 rounded-lg text-xs font-semibold cursor-pointer"
                      >
                        <UserPlus className="w-3.5 h-3.5" />
                        <span>Falar</span>
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Live Weather Widget */}
          <WeatherWidget lat={spot.latitude} lon={spot.longitude} spotName={spot.name} />

          {/* About this spot */}
          <div className="bg-[#0c1728] border border-slate-800/90 rounded-2xl p-4">
            <div className="text-xs uppercase tracking-wider text-slate-400 font-semibold mb-2">
              Sobre este Ponto de Pesca
            </div>
            <p className="text-sm text-slate-300 leading-relaxed">
              {spot.description || 'Ponto cadastrado pela comunidade de pesca esportiva Barrantuba.'}
            </p>
            <div className="mt-4 pt-3 border-t border-slate-800/80 text-xs text-slate-400 flex items-center justify-between">
              <span>Cadastrado por: <strong className="text-slate-200">{spot.createdByUserName}</strong></span>
              <span className="font-mono-numbers">{spot.createdAt}</span>
            </div>
          </div>

          {/* Coordinates & Location info */}
          <div className="flex items-center justify-between gap-3 p-3.5 bg-[#0c1728]/80 border border-slate-800/70 rounded-2xl text-xs text-slate-400">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-rose-400 shrink-0" />
              <span className="font-mono-numbers">
                Lat: {spot.latitude.toFixed(5)} · Lng: {spot.longitude.toFixed(5)}
              </span>
            </div>
            <a
              href={`https://www.google.com/maps?q=${spot.latitude},${spot.longitude}`}
              target="_blank"
              rel="noreferrer"
              className="text-emerald-400 hover:underline font-medium shrink-0"
            >
              Abrir no GPS
            </a>
          </div>

          {/* Recent Catches at this spot */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <Fish className="w-4 h-4 text-emerald-400" />
                <span>Capturas Neste Ponto ({spotCatches.length})</span>
              </h3>
              <button
                type="button"
                onClick={() => onRegisterCatchHere(spot)}
                className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>+ Adicionar Captura</span>
              </button>
            </div>

            {spotCatches.length === 0 ? (
              <div className="bg-[#0c1728]/60 border border-dashed border-slate-800 rounded-2xl p-6 text-center text-slate-400 text-xs">
                Ainda não há peixes registrados para este ponto. Seja o primeiro membro do Barrantuba a fisgar um troféu aqui!
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3">
                {spotCatches.map(fish => (
                  <div
                    key={fish.id}
                    className="flex gap-3 bg-[#0c1728] border border-slate-800/90 rounded-2xl p-3 hover:border-slate-700 transition-colors"
                  >
                    <img
                      src={fish.photoUrl}
                      alt={fish.species}
                      referrerPolicy="no-referrer"
                      className="w-20 h-20 rounded-xl object-cover shrink-0 border border-slate-800"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-bold text-slate-100 text-sm truncate">{fish.species}</span>
                        {fish.released && (
                          <span className="text-[10px] text-emerald-400 font-semibold">Pesque & Solte</span>
                        )}
                      </div>
                      <div className="text-xs text-slate-300 font-mono-numbers font-medium my-0.5">
                        {fish.weightKg} kg · {fish.lengthCm} cm
                      </div>
                      <div className="text-xs text-amber-300 truncate font-medium">
                        Isca: <span className="text-slate-200">{fish.baitUsed}</span>
                      </div>
                      <div className="text-[11px] text-slate-400 truncate mt-1">
                        Pescador: {fish.userName}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Admin / Creator Controls */}
          {canManage && (
            <div className="pt-4 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2">
              <div className="text-[11px] text-slate-500">
                {currentUser?.role === 'admin' ? 'Administrador do Barrantuba' : 'Criador deste ponto'}
              </div>
              <div className="flex items-center gap-2">
                {onEditSpot && (
                  <button
                    type="button"
                    onClick={() => onEditSpot(spot)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 cursor-pointer"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>Editar Ponto</span>
                  </button>
                )}
                {onDeleteSpot && !confirmDelete && (
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-rose-400 hover:text-rose-300 bg-rose-950/30 hover:bg-rose-950/50 border border-rose-800/40 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Excluir Ponto</span>
                  </button>
                )}
                {onDeleteSpot && confirmDelete && (
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        onDeleteSpot(spot.id);
                        onClose();
                      }}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 cursor-pointer"
                    >
                      Confirmar
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDelete(false)}
                      className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 cursor-pointer"
                    >
                      Cancelar
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
