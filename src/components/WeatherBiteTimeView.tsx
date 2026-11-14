import { useState, useEffect, useRef } from 'react';
import { 
  Search, 
  Info, 
  X, 
  Sun, 
  CloudSun, 
  Cloud, 
  Compass, 
  Gauge, 
  Wind, 
  Moon, 
  Waves, 
  ArrowUpRight, 
  ArrowRight, 
  ArrowDownRight, 
  ArrowDown, 
  ArrowDownLeft, 
  ArrowLeft, 
  ArrowUpLeft, 
  ArrowUp, 
  MapPin, 
  Sparkles, 
  Fish, 
  Check, 
  Loader2,
  Camera,
  Upload,
  RefreshCw
} from 'lucide-react';
import { User } from '../types';
import { 
  CityLocation, 
  CitySpeciesMeta,
  SpeciesBiteData,
  CompleteCityWeather, 
  POPULAR_FISHING_CITIES, 
  fetchCompleteCityWeather, 
  fetchRealCitySpecies,
  getCachedRealCitySpecies,
  searchCitiesGeocoding, 
  getDeterministicCityWeather,
  fetchSpeciesPhotosFromDb,
  saveSpeciesPhotoToDb,
  revertSpeciesPhotoInDb,
  getCachedDbSpeciesPhotos,
  getCustomSpeciesFlags,
  DEFAULT_FISH_IMAGES,
  mapBaitNameToCanonicalClient,
  getCachedExactBaitPhoto,
  fetchExactBaitPhotoOnline,
  prefetchExactBaitPhotos,
  getDirectExactBaitImageUrl
} from '../services/cityWeatherService';

interface WeatherBiteTimeViewProps {
  currentUser?: User | null;
}

export function WeatherBiteTimeView({ currentUser }: WeatherBiteTimeViewProps) {
  const isAdmin = currentUser?.role === 'admin';

  const [selectedCity, setSelectedCity] = useState<CityLocation>(() => {
    const saved = localStorage.getItem('barrantuba_weather_city');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // fallback
      }
    }
    return POPULAR_FISHING_CITIES[0]; // Laguna, Santa Catarina, Brazil
  });

  const [weatherData, setWeatherData] = useState<CompleteCityWeather>(() => 
    getDeterministicCityWeather(selectedCity)
  );
  const [loading, setLoading] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState<'clima' | 'bitetime'>('clima');
  const [selectedHour, setSelectedHour] = useState<number>(() => new Date().getHours());
  
  // Real species photos persisted in PostgreSQL (species_photos)
  const [dbSpeciesPhotos, setDbSpeciesPhotos] = useState<Record<string, string>>(() => getCachedDbSpeciesPhotos());
  const [customSpeciesFlags, setCustomSpeciesFlags] = useState<Record<string, boolean>>(() => getCustomSpeciesFlags());
  const [savingSpeciesId, setSavingSpeciesId] = useState<string | null>(null);
  const [speciesPhotoError, setSpeciesPhotoError] = useState<string | null>(null);
  const [imgFallbackStage, setImgFallbackStage] = useState<Record<string, number>>({});
  const editingSpeciesRef = useRef<{ id: string; name: string } | null>(null);
  const adminFishFileInputRef = useRef<HTMLInputElement>(null);

  // Online city-specific real fish species state (hydrated synchronously from cache when available for 0ms render)
  const [citySpeciesList, setCitySpeciesList] = useState<SpeciesBiteData[]>(() => {
    const cached = getCachedRealCitySpecies(selectedCity, 1015);
    return cached ? cached.speciesBiteTimes : [];
  });
  const [citySpeciesMeta, setCitySpeciesMeta] = useState<CitySpeciesMeta | null>(() => {
    const cached = getCachedRealCitySpecies(selectedCity, 1015);
    return cached ? cached.speciesMeta : null;
  });
  const [loadingCitySpecies, setLoadingCitySpecies] = useState<boolean>(false);
  const [citySpeciesError, setCitySpeciesError] = useState<string | null>(null);

  // Search Modal state
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<CityLocation[]>(POPULAR_FISHING_CITIES);
  const [isSearching, setIsSearching] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Info Modal state
  const [isInfoOpen, setIsInfoOpen] = useState(false);

  // Bait Image Preview Modal state (when clicking a recommended bait inside BiteTime™)
  const [previewBait, setPreviewBait] = useState<{
    name: string;
    baitId: string;
    image: string;
    fallbackImage: string;
    category: string;
    reason?: string;
    speciesName: string;
    sourceLabel?: string;
    isLoadingOnline?: boolean;
  } | null>(null);
  const [previewBaitUseFallback, setPreviewBaitUseFallback] = useState(false);
  const baitFetchAbortRef = useRef<AbortController | null>(null);

  const openRecommendedBaitPreview = (lure: string, species: SpeciesBiteData) => {
    baitFetchAbortRef.current?.abort();
    const matchedItem = species.baitItems?.find(
      b => b.name.toLowerCase() === lure.toLowerCase()
    );
    const mapped = mapBaitNameToCanonicalClient(lure);
    const cachedExact = getCachedExactBaitPhoto(lure);

    setPreviewBaitUseFallback(false);

    if (cachedExact) {
      setPreviewBait({
        name: lure,
        baitId: cachedExact.baitId,
        image: cachedExact.image,
        fallbackImage: mapped.fallbackImage,
        category: matchedItem?.category || cachedExact.category || mapped.category,
        reason: matchedItem?.reason,
        speciesName: species.name,
        sourceLabel: cachedExact.sourceLabel,
        isLoadingOnline: false,
      });
      return;
    }

    // Immediate single-request direct binary stream if clicked before background prefetch completed
    const direct = getDirectExactBaitImageUrl(lure);
    const directImage = matchedItem?.image || direct.imageUrl;

    setPreviewBait({
      name: lure,
      baitId: matchedItem?.baitId || direct.baitId,
      image: directImage,
      fallbackImage: mapped.fallbackImage,
      category: matchedItem?.category || mapped.category,
      reason: matchedItem?.reason,
      speciesName: species.name,
      sourceLabel: 'Foto real on-line • PostgreSQL',
      isLoadingOnline: false,
    });

    const controller = new AbortController();
    baitFetchAbortRef.current = controller;

    fetchExactBaitPhotoOnline(lure, false, controller.signal)
      .then((resolved) => {
        if (controller.signal.aborted) return;
        setPreviewBait(prev =>
          prev && prev.name === lure
            ? {
                ...prev,
                baitId: resolved.baitId,
                category: prev.category || resolved.category,
                sourceLabel: resolved.sourceLabel,
                isLoadingOnline: false,
              }
            : prev
        );
      })
      .catch(() => {
        // image element already streams directly or falls back cleanly onError
      });
  };

  // Automatically prefetch & preload exact online bait images into PostgreSQL + browser cache
  // as soon as city species hydrate, so clicking any recommended bait opens at 0ms without delay.
  useEffect(() => {
    if (!citySpeciesList || citySpeciesList.length === 0) return;
    const allLures: string[] = [];
    for (const sp of citySpeciesList) {
      for (const lure of sp.recommendedLures || []) {
        allLures.push(lure);
      }
    }
    if (allLures.length > 0) {
      void prefetchExactBaitPhotos(allLures);
    }
  }, [citySpeciesList]);

  // Load persisted real fish species photos metadata from PostgreSQL
  useEffect(() => {
    let cancelled = false;
    fetchSpeciesPhotosFromDb()
      .then(({ photosBySpecies, customFlags }) => {
        if (!cancelled) {
          setDbSpeciesPhotos(photosBySpecies);
          setCustomSpeciesFlags(customFlags);
          setImgFallbackStage({});
        }
      })
      .catch(() => {
        // silent fallback to existing cache
      });
    return () => {
      cancelled = true;
    };
  }, [activeSubTab]);

  // Real-time online weather fetch from Open-Meteo API
  useEffect(() => {
    let isCancelled = false;
    setLoading(true);

    fetchCompleteCityWeather(selectedCity).then(data => {
      if (!isCancelled) {
        setWeatherData(data);
        setLoading(false);
      }
    }).catch(() => {
      if (!isCancelled) setLoading(false);
    });

    localStorage.setItem('barrantuba_weather_city', JSON.stringify(selectedCity));

    return () => {
      isCancelled = true;
    };
  }, [selectedCity]);

  // Automatically identify real river/sea fish species online whenever selected city changes
  const loadOnlineSpeciesForCity = async (city: CityLocation, pressure: number, forceRefresh = false) => {
    const cachedImmediate = forceRefresh ? null : getCachedRealCitySpecies(city, pressure);
    if (cachedImmediate && cachedImmediate.speciesBiteTimes.length > 0) {
      setCitySpeciesList(cachedImmediate.speciesBiteTimes);
      setCitySpeciesMeta(cachedImmediate.speciesMeta);
      setLoadingCitySpecies(false);
    } else {
      setLoadingCitySpecies(true);
      if (!forceRefresh) {
        setCitySpeciesList([]);
        setCitySpeciesMeta(null);
      }
    }
    setCitySpeciesError(null);

    try {
      const { speciesBiteTimes, speciesMeta } = await fetchRealCitySpecies(city, pressure, forceRefresh);
      setCitySpeciesList(speciesBiteTimes);
      setCitySpeciesMeta(speciesMeta);
      setDbSpeciesPhotos(prev => {
        const next = { ...prev };
        for (const s of speciesBiteTimes) {
          if (s.image) next[s.id] = s.image;
        }
        return next;
      });
      setCustomSpeciesFlags(prev => {
        const next = { ...prev };
        for (const s of speciesBiteTimes) {
          next[s.id] = Boolean(s.isCustomPhoto);
        }
        return next;
      });
      setImgFallbackStage({});
    } catch (err: any) {
      if (err?.name === 'AbortError' || /abort/i.test(String(err?.message || ''))) return;
      setCitySpeciesError(err?.message || 'Não foi possível consultar as espécies on-line desta cidade.');
    } finally {
      setLoadingCitySpecies(false);
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    const cachedImmediate = getCachedRealCitySpecies(selectedCity, weatherData.current.pressureHpa);
    if (cachedImmediate && cachedImmediate.speciesBiteTimes.length > 0) {
      setCitySpeciesList(cachedImmediate.speciesBiteTimes);
      setCitySpeciesMeta(cachedImmediate.speciesMeta);
      setLoadingCitySpecies(false);
    } else {
      setCitySpeciesList([]);
      setCitySpeciesMeta(null);
      setLoadingCitySpecies(true);
    }
    setCitySpeciesError(null);

    fetchRealCitySpecies(selectedCity, weatherData.current.pressureHpa, false, controller.signal)
      .then(({ speciesBiteTimes, speciesMeta }) => {
        if (!active) return;
        setCitySpeciesList(speciesBiteTimes);
        setCitySpeciesMeta(speciesMeta);
        setDbSpeciesPhotos(prev => {
          const next = { ...prev };
          for (const s of speciesBiteTimes) {
            if (s.image) next[s.id] = s.image;
          }
          return next;
        });
        setCustomSpeciesFlags(prev => {
          const next = { ...prev };
          for (const s of speciesBiteTimes) {
            next[s.id] = Boolean(s.isCustomPhoto);
          }
          return next;
        });
        setImgFallbackStage({});
      })
      .catch(err => {
        if (!active) return;
        if (err?.name === 'AbortError' || /abort/i.test(String(err?.message || ''))) return;
        if (!cachedImmediate) {
          setCitySpeciesError(err?.message || 'Não foi possível identificar peixes reais on-line.');
        }
      })
      .finally(() => {
        if (active) setLoadingCitySpecies(false);
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [selectedCity.name, selectedCity.latitude, selectedCity.longitude]);

  // Live city search debouncing
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults(POPULAR_FISHING_CITIES);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      const res = await searchCitiesGeocoding(searchQuery);
      setSearchResults(res);
      setIsSearching(false);
    }, 350);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    if (isSearchOpen) {
      setTimeout(() => searchInputRef.current?.focus(), 150);
    }
  }, [isSearchOpen]);

  const currentHourPoint = weatherData.todayHours[selectedHour] || weatherData.todayHours[0];

  // Helper for arrow icon according to direction deg
  const renderWindArrow = (deg: number, className = "w-3.5 h-3.5") => {
    const norm = (deg + 360) % 360;
    if (norm >= 337.5 || norm < 22.5) return <ArrowDown className={className} />;
    if (norm >= 22.5 && norm < 67.5) return <ArrowDownLeft className={className} />;
    if (norm >= 67.5 && norm < 112.5) return <ArrowLeft className={className} />;
    if (norm >= 112.5 && norm < 157.5) return <ArrowUpLeft className={className} />;
    if (norm >= 157.5 && norm < 202.5) return <ArrowUp className={className} />;
    if (norm >= 202.5 && norm < 247.5) return <ArrowUpRight className={className} />;
    if (norm >= 247.5 && norm < 292.5) return <ArrowRight className={className} />;
    return <ArrowDownRight className={className} />;
  };

  // Admin Photo Upload Handler (persists directly in PostgreSQL)
  const handleAdminPhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const target = editingSpeciesRef.current;
    e.target.value = '';
    if (!file || !target) return;

    setSpeciesPhotoError(null);
    setSavingSpeciesId(target.id);

    const reader = new FileReader();
    reader.onload = (event) => {
      const rawUrl = event.target?.result as string;
      const img = new Image();
      img.onload = async () => {
        try {
          const maxDim = 960;
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
          let finalDataUrl = rawUrl;
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            finalDataUrl = canvas.toDataURL('image/jpeg', 0.86);
          }

          const result = await saveSpeciesPhotoToDb(target.id, target.name, finalDataUrl);
          if (!result.ok || !result.photo) {
            setSpeciesPhotoError(result.error || 'Erro ao salvar foto do peixe no banco de dados.');
          } else {
            const newUrl = result.photo!.imageData;
            setDbSpeciesPhotos(prev => ({ ...prev, [target.id]: newUrl }));
            setCustomSpeciesFlags(prev => ({ ...prev, [target.id]: true }));
            setCitySpeciesList(prev =>
              prev.map(s => (s.id === target.id ? { ...s, image: newUrl, isCustomPhoto: true } : s))
            );
            setImgFallbackStage(prev => ({ ...prev, [target.id]: 0 }));
          }
        } catch (err: any) {
          setSpeciesPhotoError(err?.message || 'Falha inesperada ao gravar foto no banco.');
        } finally {
          setSavingSpeciesId(null);
          editingSpeciesRef.current = null;
        }
      };
      img.onerror = () => {
        setSavingSpeciesId(null);
        editingSpeciesRef.current = null;
        setSpeciesPhotoError('Não foi possível processar a imagem selecionada.');
      };
      img.src = rawUrl;
    };
    reader.onerror = () => {
      setSavingSpeciesId(null);
      editingSpeciesRef.current = null;
      setSpeciesPhotoError('Erro ao ler arquivo de imagem.');
    };
    reader.readAsDataURL(file);
  };

  const handleRevertSpeciesPhoto = async (speciesId: string) => {
    setSpeciesPhotoError(null);
    setSavingSpeciesId(speciesId);
    try {
      const result = await revertSpeciesPhotoInDb(speciesId);
      if (!result.ok || !result.photo) {
        setSpeciesPhotoError(result.error || 'Erro ao restaurar foto original no banco de dados.');
      } else {
        const restoredUrl = result.photo!.imageData;
        setDbSpeciesPhotos(prev => ({ ...prev, [speciesId]: restoredUrl }));
        setCustomSpeciesFlags(prev => ({ ...prev, [speciesId]: false }));
        setCitySpeciesList(prev =>
          prev.map(s => (s.id === speciesId ? { ...s, image: restoredUrl, isCustomPhoto: false } : s))
        );
        setImgFallbackStage(prev => ({ ...prev, [speciesId]: 0 }));
      }
    } finally {
      setSavingSpeciesId(null);
    }
  };

  // Real Celsius temperature curve calculations
  const tempsC = weatherData.todayHours.map(pt => pt.tempC);
  const minTempC = Math.min(...tempsC) - 1;
  const maxTempC = Math.max(...tempsC) + 1;
  const tempRange = Math.max(4, maxTempC - minTempC);

  const guideLines = [
    Math.round(maxTempC),
    Math.round(maxTempC - tempRange * 0.25),
    Math.round(maxTempC - tempRange * 0.5),
    Math.round(maxTempC - tempRange * 0.75),
    Math.round(minTempC)
  ];

  // SVG Points for temperature curve
  const curvePoints = weatherData.todayHours.map((pt, idx) => {
    const x = (idx / 23) * 100;
    const y = 88 - ((pt.tempC - minTempC) / tempRange) * 70;
    return { x, y, tempC: pt.tempC };
  });

  const pathD = curvePoints.reduce((acc, pt, i, arr) => {
    if (i === 0) return `M ${pt.x.toFixed(1)},${pt.y.toFixed(1)}`;
    const prev = arr[i - 1];
    const cx = ((prev.x + pt.x) / 2).toFixed(1);
    return `${acc} C ${cx},${prev.y.toFixed(1)} ${cx},${pt.y.toFixed(1)} ${pt.x.toFixed(1)},${pt.y.toFixed(1)}`;
  }, '');

  return (
    <div className="w-full min-h-screen bg-[#040e17] text-slate-100 flex flex-col pb-28 select-none">
      {/* Hidden File Input for Admin Fish Photo Upload */}
      <input
        ref={adminFishFileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleAdminPhotoSelect}
      />

      {/* Top Header Bar matching Screenshot: [ 🔍 ] City Name & State [ ⓘ ] */}
      <div className="w-full bg-[#040e17] pt-3 pb-2 px-4 flex items-center justify-between border-b border-slate-900/60 sticky top-0 z-30 backdrop-blur-md">
        {/* Search City Button */}
        <button
          type="button"
          onClick={() => setIsSearchOpen(true)}
          className="w-10 h-10 rounded-full bg-[#0c1c2c] border border-slate-800 flex items-center justify-center text-slate-200 hover:text-white hover:bg-slate-800 transition-all active:scale-95 cursor-pointer shadow-sm"
          title="Buscar Cidade de Pesca"
        >
          <Search className="w-5 h-5 stroke-[2.5]" />
        </button>

        {/* City & State Center */}
        <div 
          onClick={() => setIsSearchOpen(true)}
          className="flex flex-col items-center cursor-pointer group text-center"
        >
          <div className="flex items-center gap-1.5 font-black text-xl text-white tracking-tight leading-tight group-hover:text-emerald-400 transition-colors">
            <span>{selectedCity.name}</span>
            {loading && <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400" />}
          </div>
          <div className="text-[11px] text-slate-400 font-medium">
            {selectedCity.admin1 ? `${selectedCity.admin1}, ` : ''}{selectedCity.country}
          </div>
        </div>

        {/* Info Icon Button */}
        <button
          type="button"
          onClick={() => setIsInfoOpen(true)}
          className="w-10 h-10 rounded-full bg-[#0c1c2c] border border-slate-800 flex items-center justify-center text-slate-200 hover:text-white hover:bg-slate-800 transition-all active:scale-95 cursor-pointer shadow-sm"
          title="Informações sobre o Clima e BiteTime"
        >
          <Info className="w-5 h-5 stroke-[2]" />
        </button>
      </div>

      <div className="w-full max-w-xl mx-auto px-1 pt-2 space-y-3.5">
        {/* Sub-navigation pill toggle: [ Clima ] | [ BiteTime™ ] */}
        <div className="w-full p-1 bg-[#091827] rounded-full border border-slate-800/80 flex shadow-inner">
          <button
            type="button"
            onClick={() => setActiveSubTab('clima')}
            className={`flex-1 py-2 rounded-full text-xs font-bold transition-all cursor-pointer ${
              activeSubTab === 'clima'
                ? 'bg-white text-slate-950 shadow-md font-extrabold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Clima
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab('bitetime')}
            className={`flex-1 py-2 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1 ${
              activeSubTab === 'bitetime'
                ? 'bg-white text-slate-950 shadow-md font-extrabold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <span>BiteTime™</span>
          </button>
        </div>

        {/* SUBTAB 1: CLIMA (Real live internet weather in Celsius °C) */}
        {activeSubTab === 'clima' && (
          <div className="space-y-4 animate-fade-in">
            {/* Top Metric Cards Row: Temp | Wind | Barometer */}
            <div className="grid grid-cols-3 gap-2 bg-[#071523] border border-slate-800/90 rounded-2xl p-3 shadow-lg">
              {/* Real Temperature in Celsius (°C) */}
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Sun className="w-7 h-7 text-amber-400 fill-amber-400" />
                    <Cloud className="w-4 h-4 text-white/90 fill-white/90 absolute -bottom-1 -right-1" />
                  </div>
                  <div>
                    <div className="text-xl sm:text-2xl font-black text-white leading-none tracking-tight">
                      {weatherData.current.tempC}°C
                    </div>
                  </div>
                </div>
                <div className="text-[10px] text-slate-400 mt-2 truncate">
                  A sensação é {weatherData.current.apparentTempC}°C
                </div>
              </div>

              {/* Wind Metric Card (knots & km/h real online) */}
              <div className="flex flex-col border-l border-slate-800/80 pl-2.5">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-slate-800 flex items-center justify-center text-white shrink-0">
                    {renderWindArrow(weatherData.current.windDirDeg, "w-4 h-4 text-slate-100")}
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs sm:text-sm font-black text-white leading-none truncate">
                      {weatherData.current.windKnots} Nó (kn)
                    </div>
                    <div className="text-[10px] font-bold text-slate-300 mt-0.5">
                      {weatherData.current.windDirCode} • {weatherData.current.windKmh} km/h
                    </div>
                  </div>
                </div>
                <div className="text-[10px] text-slate-400 mt-2 truncate">
                  Rajadas {weatherData.current.windGustsKnots} Nó (kn)
                </div>
              </div>

              {/* Barometer / Pressure Metric Card (hPa real online) */}
              <div className="flex flex-col border-l border-slate-800/80 pl-2.5">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-cyan-500 via-emerald-400 to-rose-500 p-0.5 flex items-center justify-center shrink-0">
                    <div className="w-full h-full bg-[#071523] rounded-full flex items-center justify-center">
                      <Gauge className="w-3.5 h-3.5 text-emerald-400" />
                    </div>
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm sm:text-base font-black text-white leading-none">
                      {weatherData.current.pressureHpa}
                    </div>
                  </div>
                </div>
                <div className="text-[10px] text-slate-400 mt-2 truncate">
                  Hectopascais
                </div>
              </div>
            </div>

            {/* Timeline: Hoje with Slider dot and Hours bar */}
            <div className="space-y-1.5 pt-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-white">Hoje</span>
                <div className="w-2.5 h-2.5 rounded-full bg-white shadow ring-2 ring-emerald-500/30"></div>
                <span className="text-[10px] text-slate-400 font-mono ml-auto">
                  {weatherData.current.conditionText} • Umidade {weatherData.current.humidity}%
                </span>
              </div>

              {/* Scrollable Hours Line */}
              <div className="overflow-x-auto pb-1 flex items-center gap-5 text-xs text-slate-400 font-mono no-scrollbar">
                {weatherData.todayHours.map(pt => (
                  <button
                    key={pt.hour}
                    type="button"
                    onClick={() => setSelectedHour(pt.hour)}
                    className={`cursor-pointer transition-colors ${
                      selectedHour === pt.hour ? 'text-white font-bold underline decoration-emerald-400 decoration-2' : 'hover:text-slate-200'
                    }`}
                  >
                    {pt.hourLabel}
                  </button>
                ))}
              </div>
            </div>

            {/* Real Celsius Temperature Curve Chart */}
            <div className="relative bg-[#06121d] border border-slate-800/90 rounded-2xl p-3 overflow-hidden shadow-lg">
              <div className="relative h-44 w-full">
                {/* Horizontal guide lines in Celsius */}
                <div className="absolute inset-0 flex flex-col justify-between pointer-events-none text-[10px] text-slate-500 font-mono">
                  {guideLines.map((tempLabel, i) => (
                    <div key={i} className="border-b border-slate-800/80 pb-0.5 flex justify-between pr-2">
                      <span>{tempLabel}°C</span>
                    </div>
                  ))}
                </div>

                {/* SVG Curve for Temperature */}
                <svg className="absolute inset-0 w-full h-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 100 100">
                  <defs>
                    <linearGradient id="realTempGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.25" />
                      <stop offset="100%" stopColor="#f43f5e" stopOpacity="0" />
                    </linearGradient>
                  </defs>

                  {/* Selected Hour Column */}
                  <rect
                    x={`${(selectedHour / 24) * 100}%`}
                    y="0"
                    width="4.16%"
                    height="100%"
                    fill="#0284c7"
                    opacity="0.3"
                  />

                  {/* Shaded Area under Curve */}
                  <path
                    d={`${pathD} L 100,100 L 0,100 Z`}
                    fill="url(#realTempGradient)"
                  />

                  {/* Red Temperature Curve */}
                  <path
                    d={pathD}
                    fill="none"
                    stroke="#f43f5e"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  />
                </svg>

                {/* Weather icons & Celsius labels along the curve */}
                <div className="absolute inset-0 flex justify-between items-center pointer-events-none px-1">
                  {weatherData.todayHours.filter((_, idx) => idx % 2 === 1).map((pt, i) => (
                    <div 
                      key={i} 
                      className="flex flex-col items-center"
                      style={{
                        transform: `translateY(${-25 + Math.sin((i / 6) * Math.PI) * -12}px)`
                      }}
                    >
                      <Sun className="w-5 h-5 text-amber-400 fill-amber-400 drop-shadow-md" />
                      <span className="text-[9px] font-mono font-bold text-white mt-0.5">
                        {pt.tempC}°
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Wind Arrows and Speeds beneath temperature chart */}
              <div className="pt-3 border-t border-slate-800/70">
                <div className="flex items-center justify-between w-full text-[10px] text-slate-300 gap-1">
                  {weatherData.todayHours.slice(6, 17).filter((_, idx) => idx % 2 === 0).map((pt, i) => (
                    <div key={i} className="flex flex-col items-center gap-0.5 flex-1 min-w-0">
                      <div className="text-slate-400">{renderWindArrow(pt.windDirDeg, "w-3 h-3 text-slate-300")}</div>
                      <div className="font-bold text-[9px] truncate">{pt.windKnots} kn</div>
                      <div className="text-[9px] text-slate-400">{pt.windDirCode}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Section: Pressão atmosférica */}
            <div className="bg-[#06121d] border border-slate-800/90 rounded-2xl p-4 shadow-lg space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white tracking-wide">Pressão atmosférica</span>
                <span className="text-[11px] text-emerald-400 font-mono font-bold">
                  {currentHourPoint.pressureHpa} hPa (Tempo Real)
                </span>
              </div>

              <div className="relative h-20 w-full">
                <div className="absolute inset-0 flex flex-col justify-between pointer-events-none text-[9px] text-slate-500 font-mono">
                  <div className="border-b border-slate-800 pb-0.5">1020 hPa</div>
                  <div className="border-b border-slate-800 pb-0.5">1010 hPa</div>
                </div>

                <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none" viewBox="0 0 100 100">
                  <rect
                    x={`${(selectedHour / 24) * 100}%`}
                    y="0"
                    width="4.16%"
                    height="100%"
                    fill="#0284c7"
                    opacity="0.3"
                  />
                  <path
                    d="M 0,55 C 25,52 50,56 75,65 L 100,68"
                    fill="none"
                    stroke="#10b981"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  />
                </svg>
              </div>
            </div>

            {/* Section: Fase do sol e da lua */}
            <div className="bg-[#06121d] border border-slate-800/90 rounded-2xl p-4 shadow-lg space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white tracking-wide">Fase do sol e da lua</span>
                <span className="text-[10px] text-amber-300 font-medium">
                  {weatherData.sunMoon.moonPhase}
                </span>
              </div>

              <div className="relative h-28 w-full bg-[#030b12] rounded-xl overflow-hidden border border-slate-800/60 p-2">
                <div className="absolute top-1/2 left-0 right-0 border-b border-slate-800/90" />
                <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 60" preserveAspectRatio="none">
                  <rect
                    x={`${(selectedHour / 24) * 100}%`}
                    y="0"
                    width="4.16%"
                    height="100%"
                    fill="#0284c7"
                    opacity="0.3"
                  />
                  <path
                    d="M 5,45 Q 50,5 95,45"
                    fill="none"
                    stroke="#fbbf24"
                    strokeWidth="2"
                    strokeDasharray="1 1"
                  />
                  <path
                    d="M 5,30 Q 50,55 95,30"
                    fill="none"
                    stroke="#ffffff"
                    strokeWidth="1.5"
                    opacity="0.7"
                  />
                  <circle cx="15" cy="35" r="4.5" fill="#facc15" filter="drop-shadow(0 0 4px #fbbf24)" />
                  <circle cx="14" cy="27" r="3" fill="#cbd5e1" opacity="0.9" />
                </svg>

                <div className="absolute bottom-1.5 left-3 text-[10px] text-slate-400 font-mono">
                  Nascer: {weatherData.sunMoon.sunrise}
                </div>
                <div className="absolute bottom-1.5 right-3 text-[10px] text-slate-400 font-mono">
                  Pôr do sol: {weatherData.sunMoon.sunset}
                </div>
              </div>
            </div>

            {/* Section: Marés */}
            <div className="bg-[#06121d] border border-slate-800/90 rounded-2xl p-4 shadow-lg space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white tracking-wide">Marés</span>
                <span className="text-[10px] text-cyan-400 font-semibold flex items-center gap-1">
                  <Waves className="w-3.5 h-3.5" />
                  <span>Maré de {selectedCity.name}</span>
                </span>
              </div>

              <div className="relative h-24 w-full bg-[#030b12] rounded-xl overflow-hidden border border-slate-800/60">
                <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 50" preserveAspectRatio="none">
                  <rect
                    x={`${(selectedHour / 24) * 100}%`}
                    y="0"
                    width="4.16%"
                    height="100%"
                    fill="#0284c7"
                    opacity="0.35"
                  />
                  <path
                    d="M 0,40 Q 25,48 50,22 T 100,35 L 100,50 L 0,50 Z"
                    fill="url(#tideGrad)"
                  />
                  <path
                    d="M 0,40 Q 25,48 50,22 T 100,35"
                    fill="none"
                    stroke="#0ea5e9"
                    strokeWidth="2"
                  />
                  <defs>
                    <linearGradient id="tideGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="#0284c7" stopOpacity="0.8" />
                      <stop offset="100%" stopColor="#0369a1" stopOpacity="0.2" />
                    </linearGradient>
                  </defs>
                  <circle cx="62" cy="28" r="2" fill="#ffffff" />
                </svg>

                <div className="absolute top-2 right-12 text-center pointer-events-none">
                  <div className="text-[11px] font-bold text-white leading-tight">
                    Alto: {weatherData.tides.highTideTime}
                  </div>
                  <div className="text-[10px] text-slate-300 font-medium">
                    {weatherData.tides.highTideHeightM} ({weatherData.tides.highTideHeightFt})
                  </div>
                </div>
              </div>
            </div>

            <div className="text-center text-[10px] text-slate-500 pt-2 pb-6">
              Dados meteorológicos reais obtidos via Open-Meteo para {selectedCity.name}, {selectedCity.admin1}.
            </div>
          </div>
        )}

        {/* SUBTAB 2: BITETIME™ with Real Fish Photos & Admin Upload */}
        {activeSubTab === 'bitetime' && (
          <div className="space-y-4 animate-fade-in">
            {/* Online Water Environment & Real City Species Banner */}
            <div className="p-3.5 bg-[#071523] border border-slate-800/90 rounded-2xl text-xs text-slate-300 leading-relaxed shadow-md space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border ${
                      citySpeciesMeta?.waterEnvironment === 'mar_estuario'
                        ? 'bg-cyan-500/15 text-cyan-300 border-cyan-500/40'
                        : citySpeciesMeta?.waterEnvironment === 'estuario_rio'
                        ? 'bg-teal-500/15 text-teal-300 border-teal-500/40'
                        : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40'
                    }`}
                  >
                    {citySpeciesMeta?.waterEnvironment === 'mar_estuario' ? (
                      <Waves className="w-3.5 h-3.5" />
                    ) : (
                      <Fish className="w-3.5 h-3.5" />
                    )}
                    <span>
                      {loadingCitySpecies
                        ? `Analisando águas de ${selectedCity.name}...`
                        : citySpeciesMeta?.environmentLabel || `Espécies de ${selectedCity.name}`}
                    </span>
                  </span>

                  {!loadingCitySpecies && citySpeciesList.length > 0 && (
                    <span className="text-[11px] font-semibold text-slate-400">
                      {citySpeciesList.length} peixes reais encontrados
                    </span>
                  )}
                </div>

                <button
                  type="button"
                  disabled={loadingCitySpecies}
                  onClick={() =>
                    loadOnlineSpeciesForCity(selectedCity, weatherData.current.pressureHpa, true)
                  }
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-[11px] font-semibold text-emerald-300 transition-colors cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className={`w-3 h-3 ${loadingCitySpecies ? 'animate-spin' : ''}`} />
                  <span>Atualizar on-line</span>
                </button>
              </div>

              <p className="text-[11px] text-slate-400">
                Mostrando somente os peixes reais identificados on-line nos rios ou no mar da região de{' '}
                <strong className="text-slate-200">{selectedCity.name}</strong>, com fotos e dados gravados no banco de dados.
              </p>
            </div>

            {/* Time Selector "Hoje" & Hours */}
            <div className="space-y-1.5 pt-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-white">Hoje</span>
                <div className="w-2.5 h-2.5 rounded-full bg-white shadow ring-2 ring-emerald-500/30"></div>
                <span className="text-[10px] text-slate-400 font-mono ml-auto">
                  Horário Ativo: {String(selectedHour).padStart(2, '0')}:00h
                </span>
              </div>

              {/* Scrollable Hours Line */}
              <div className="overflow-x-auto pb-1 flex items-center gap-5 text-xs text-slate-400 font-mono no-scrollbar">
                {weatherData.todayHours.map(pt => (
                  <button
                    key={pt.hour}
                    type="button"
                    onClick={() => setSelectedHour(pt.hour)}
                    className={`cursor-pointer transition-colors ${
                      selectedHour === pt.hour ? 'text-white font-bold underline decoration-emerald-400 decoration-2' : 'hover:text-slate-200'
                    }`}
                  >
                    {pt.hourLabel}
                  </button>
                ))}
              </div>
            </div>

            {/* Inline Error Alert for DB Photo Persistence or City Online Resolution */}
            {(speciesPhotoError || citySpeciesError) && (
              <div className="p-3 bg-rose-950/60 border border-rose-500/40 rounded-xl text-xs text-rose-200 flex items-center justify-between gap-2">
                <span>{speciesPhotoError || citySpeciesError}</span>
                <button
                  type="button"
                  onClick={() => {
                    setSpeciesPhotoError(null);
                    setCitySpeciesError(null);
                  }}
                  className="text-rose-300 hover:text-white p-1"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Loading City Species Spinner */}
            {loadingCitySpecies && citySpeciesList.length === 0 ? (
              <div className="bg-[#06121d] border border-slate-800/90 rounded-2xl p-8 flex flex-col items-center justify-center text-center gap-3">
                <Loader2 className="w-7 h-7 text-emerald-400 animate-spin" />
                <div className="text-sm font-bold text-white">
                  Identificando on-line os peixes reais de {selectedCity.name}...
                </div>
                <div className="text-xs text-slate-400 max-w-xs">
                  Verificando se a região possui rios, represas ou mar aberto e buscando ocorrências reais da fauna local.
                </div>
              </div>
            ) : citySpeciesList.length === 0 ? (
              <div className="bg-[#06121d] border border-slate-800/90 rounded-2xl p-6 text-center space-y-3">
                <Fish className="w-8 h-8 text-slate-500 mx-auto" />
                <p className="text-xs text-slate-300">
                  Nenhuma ocorrência de peixe identificada on-line para {selectedCity.name} no momento.
                </p>
                <button
                  type="button"
                  onClick={() => loadOnlineSpeciesForCity(selectedCity, weatherData.current.pressureHpa, true)}
                  className="px-4 py-2 rounded-xl bg-emerald-500 text-slate-950 font-bold text-xs cursor-pointer"
                >
                  Tentar novamente on-line
                </button>
              </div>
            ) : (
            /* Species Bite Activity Cards with Real Photos */
            <div className="space-y-4">
              {citySpeciesList.map(species => {
                const dbImg = dbSpeciesPhotos[species.id];
                const fallbackBundled = DEFAULT_FISH_IMAGES[species.id];
                const failStage = imgFallbackStage[species.id] || 0;
                const currentImg =
                  failStage === 0
                    ? dbImg || species.image || fallbackBundled
                    : failStage === 1
                    ? species.image || fallbackBundled
                    : '';
                const isCustom = Boolean(customSpeciesFlags[species.id]);
                const isSavingThis = savingSpeciesId === species.id;

                return (
                  <div
                    key={species.id}
                    className="bg-[#06121d] border border-slate-800/90 rounded-2xl p-4 shadow-lg space-y-3"
                  >
                    {/* Card Header: Species Name & 3D Transparent PNG Fish Artwork */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h4 className="text-base font-extrabold text-white tracking-tight">
                            {species.name}
                          </h4>
                          {species.environment && (
                            <span
                              className={`text-[9px] px-1.5 py-0.5 rounded font-bold border ${
                                species.environment === 'mar'
                                  ? 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30'
                                  : species.environment === 'estuario'
                                  ? 'bg-teal-500/15 text-teal-300 border-teal-500/30'
                                  : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                              }`}
                            >
                              {species.environment === 'mar'
                                ? 'Mar'
                                : species.environment === 'estuario'
                                ? 'Estuário'
                                : 'Rio'}
                            </span>
                          )}
                          {species.observationCount && (
                            <span className="text-[9px] bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded font-mono">
                              {species.observationCount} reg.
                            </span>
                          )}
                          {isCustom && (
                            <span className="text-[9px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-1.5 py-0.5 rounded font-bold">
                              Foto Admin
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-400 italic mt-0.5">
                          {species.scientificName} • {species.habitat}
                        </p>
                      </div>

                      {/* Real 3D Transparent PNG Fish Image with DB Persistence & Admin Upload Option */}
                      <div className="flex flex-col items-end gap-1.5 shrink-0">
                        <div className="relative w-32 h-20 rounded-xl flex items-center justify-center overflow-hidden border border-slate-700/80 shadow-md group bg-gradient-to-b from-slate-800/35 to-slate-900/60 p-1">
                          {currentImg ? (
                            <img
                              src={currentImg}
                              alt={`Imagem 3D de ${species.name}`}
                              referrerPolicy="no-referrer"
                              onError={() => {
                                setImgFallbackStage(prev => ({
                                  ...prev,
                                  [species.id]: (prev[species.id] || 0) + 1,
                                }));
                              }}
                              className="w-full h-full object-contain drop-shadow-[0_10px_16px_rgba(0,0,0,0.75)]"
                            />
                          ) : (
                            <Fish className="w-8 h-8 text-slate-400" />
                          )}

                          {isSavingThis && (
                            <div className="absolute inset-0 bg-slate-950/80 flex items-center justify-center">
                              <Loader2 className="w-5 h-5 text-emerald-400 animate-spin" />
                            </div>
                          )}

                          {/* Admin Overlay Upload Button (desktop hover) */}
                          {isAdmin && !isSavingThis && (
                            <button
                              type="button"
                              onClick={() => {
                                editingSpeciesRef.current = { id: species.id, name: species.name };
                                adminFishFileInputRef.current?.click();
                              }}
                              className="absolute inset-0 bg-slate-950/70 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-white text-[9px] font-bold transition-opacity cursor-pointer"
                              title="Trocar foto do peixe da sua galeria"
                            >
                              <Camera className="w-4 h-4 text-emerald-400 mb-0.5" />
                              <span>Trocar Foto</span>
                            </button>
                          )}
                        </div>

                        {/* Admin Actions Row (accessible on mobile touchscreens) */}
                        {isAdmin && (
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              disabled={isSavingThis}
                              onClick={() => {
                                editingSpeciesRef.current = { id: species.id, name: species.name };
                                adminFishFileInputRef.current?.click();
                              }}
                              className="text-[10px] text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1 cursor-pointer disabled:opacity-50"
                            >
                              <Camera className="w-3 h-3" />
                              <span>Trocar foto</span>
                            </button>
                            {isCustom && (
                              <button
                                type="button"
                                disabled={isSavingThis}
                                onClick={() => handleRevertSpeciesPhoto(species.id)}
                                className="text-[10px] text-slate-400 hover:text-rose-400 flex items-center gap-0.5 cursor-pointer disabled:opacity-50"
                              >
                                <RefreshCw className="w-2.5 h-2.5" />
                                <span>Original</span>
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Species local fishing tip */}
                    {species.notes && (
                      <p className="text-[11px] text-slate-300/90 leading-snug">
                        {species.notes}
                      </p>
                    )}

                    {/* Hourly Activity Bar Chart (05h..21h covers dawn, day & dusk/night peaks) */}
                    <div className="relative pt-2">
                      {/* Y-Axis guide lines (21%, 11%, 1%) */}
                      <div className="absolute left-0 top-0 bottom-6 flex flex-col justify-between text-[9px] text-slate-500 font-mono pointer-events-none pr-2">
                        <span>21%</span>
                        <span>11%</span>
                        <span>1%</span>
                      </div>

                      {/* Bars Grid */}
                      <div className="ml-8 h-28 flex items-end justify-between border-b border-slate-800 gap-0.5 pb-1">
                        {species.hourlyProbabilities.slice(5, 22).map((item, idx) => {
                          const isPeak = item.hour === species.peakHour;
                          const isCurrent = item.hour === selectedHour;
                          const heightPercent = Math.min(100, Math.max(8, (item.percent / 25) * 100));

                          return (
                            <div 
                              key={item.hour} 
                              onClick={() => setSelectedHour(item.hour)}
                              className="flex-1 flex flex-col items-center h-full justify-end cursor-pointer group"
                            >
                              <div
                                style={{ height: `${heightPercent}%` }}
                                className={`w-full rounded-xs transition-all ${
                                  isPeak 
                                    ? 'bg-[#d4e157] shadow-lg shadow-lime-500/20 ring-1 ring-lime-300' 
                                    : isCurrent 
                                    ? 'bg-cyan-500' 
                                    : 'bg-slate-700/80 group-hover:bg-slate-500'
                                }`}
                              />
                              <span className="text-[8px] font-mono text-slate-500 mt-1 h-3">
                                {idx % 2 === 0 ? String(item.hour).padStart(2, '0') : ''}
                              </span>
                            </div>
                          );
                        })}
                      </div>

                      {/* Peak Hour Callout "Tente em: 12" */}
                      <div className="flex items-center justify-center pt-1 text-[11px] font-bold text-slate-200">
                        <span className="text-lime-400 font-black mr-1.5">●</span>
                        <span>Tente em: {String(species.peakHour).padStart(2, '0')}h</span>
                        <span className="text-[10px] text-slate-400 font-normal ml-1">
                          ({species.peakPercent}% de chances de ataque)
                        </span>
                      </div>

                      {/* Recommended baits for this species (clickable to view bait photo) */}
                      <div className="mt-2.5 pt-2 border-t border-slate-800/60 flex flex-wrap items-center gap-1.5 text-[10px]">
                        <span className="text-slate-400 font-semibold">Iscas recomendadas:</span>
                        {species.recommendedLures.map((lure, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => openRecommendedBaitPreview(lure, species)}
                            title="Toque para ver a imagem real on-line desta isca"
                            className="bg-slate-900 hover:bg-emerald-950/60 border border-slate-700/80 hover:border-emerald-500/60 text-emerald-300 hover:text-emerald-200 px-2.5 py-1 rounded-lg font-mono inline-flex items-center gap-1 transition-all cursor-pointer active:scale-95"
                          >
                            <span>{lure}</span>
                            <Search className="w-2.5 h-2.5 text-emerald-400/80 shrink-0" />
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            )}

            <div className="text-center text-[10px] text-slate-500 pt-2 pb-6">
              {citySpeciesMeta?.sourceLabel
                ? `${citySpeciesMeta.sourceLabel} • Gravado no PostgreSQL.`
                : 'O BiteTime™ calcula janelas de ataque com base na fauna real da cidade e dados meteorológicos.'}
            </div>
          </div>
        )}
      </div>

      {/* MODAL 1: SEARCH CITY */}
      {isSearchOpen && (
        <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-3 sm:p-5 bg-slate-950/85 backdrop-blur-md animate-fade-in">
          <div className="relative w-full max-w-md bg-[#071421] border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] mt-12 sm:mt-0">
            {/* Header */}
            <div className="p-4 border-b border-slate-800 bg-[#040e17] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Search className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-black text-white uppercase tracking-wider">
                  Pesquisar Cidade de Pesca
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsSearchOpen(false)}
                className="p-1 rounded-full text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Search Input */}
            <div className="p-4 border-b border-slate-800/80 bg-[#06121d]">
              <div className="relative">
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Digite a cidade (Ex: Laguna, Santos, Tubarão...)"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-2xl pl-10 pr-10 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3.5 top-3 text-slate-400 hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* City Results List */}
            <div className="overflow-y-auto p-3 space-y-1 divide-y divide-slate-800/40 flex-1">
              <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider px-2 py-1">
                {searchQuery.trim() ? 'Resultados Online' : 'Principais Regiões Pesqueiras'}
              </div>

              {isSearching ? (
                <div className="py-8 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
                  <span>Buscando dados meteorológicos da cidade...</span>
                </div>
              ) : searchResults.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  Nenhuma cidade encontrada para "{searchQuery}".
                </div>
              ) : (
                searchResults.map((city, idx) => {
                  const isCurrent = city.name.toLowerCase() === selectedCity.name.toLowerCase();
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setSelectedCity(city);
                        setIsSearchOpen(false);
                        setSearchQuery('');
                      }}
                      className={`w-full px-3 py-2.5 rounded-xl text-left flex items-center justify-between transition-all cursor-pointer ${
                        isCurrent
                          ? 'bg-emerald-950/40 border border-emerald-500/50 text-white font-bold'
                          : 'hover:bg-slate-900 text-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <MapPin className={`w-4 h-4 ${isCurrent ? 'text-emerald-400' : 'text-slate-500'}`} />
                        <div>
                          <div className="text-xs font-bold text-white flex items-center gap-1.5">
                            <span>{city.name}</span>
                            {isCurrent && (
                              <span className="text-[9px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.2 rounded-full font-bold">
                                Ativa
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            {city.admin1 ? `${city.admin1}, ` : ''}{city.country}
                          </div>
                        </div>
                      </div>
                      {isCurrent && <Check className="w-4 h-4 text-emerald-400" />}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: INFO MODAL */}
      {isInfoOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in">
          <div className="relative w-full max-w-md bg-[#071421] border border-slate-800 rounded-3xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Info className="w-5 h-5 text-emerald-400" />
                <h3 className="text-sm font-black text-white uppercase tracking-wider">
                  Como Funciona o Clima & BiteTime™
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsInfoOpen(false)}
                className="p-1 rounded-full text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-300 leading-relaxed max-h-[65vh] overflow-y-auto pr-1">
              <p>
                <strong className="text-white">Dados Reais em Tempo Real:</strong> As informações de temperatura em graus Celsius (°C), sensação térmica, umidade, velocidade e rajadas de vento e pressão em hectopascais são consultadas diretamente online para a cidade selecionada.
              </p>
              <p>
                <strong className="text-white">Pressão Atmosférica (Barômetro):</strong> A faixa entre <span className="text-emerald-400 font-bold">1012 e 1018 hPa</span> é a mais propícia para a caça ativa dos peixes predadores.
              </p>
              <p>
                <strong className="text-white">Fotos dos Peixes & Moderação Admin:</strong> As espécies utilizam fotos reais e o administrador do Barrantuba pode customizar a foto de qualquer peixe pegando uma imagem da sua própria galeria do celular.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setIsInfoOpen(false)}
              className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs transition-colors cursor-pointer"
            >
              Entendido
            </button>
          </div>
        </div>
      )}

      {/* MODAL 3: RECOMMENDED BAIT IMAGE PREVIEW */}
      {previewBait && (
        <div
          onClick={() => {
            baitFetchAbortRef.current?.abort();
            setPreviewBait(null);
          }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-sm bg-[#071421] border border-slate-700/80 rounded-3xl p-5 shadow-2xl space-y-4"
          >
            <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-800">
              <div className="min-w-0">
                <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 mb-0.5">
                  {previewBait.category} • Para {previewBait.speciesName}
                </div>
                <h3 className="text-base font-extrabold text-white leading-snug">
                  {previewBait.name}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  baitFetchAbortRef.current?.abort();
                  setPreviewBait(null);
                }}
                aria-label="Fechar visualização da isca"
                className="p-1.5 rounded-full bg-slate-800/80 text-slate-300 hover:text-white transition-colors cursor-pointer shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-[#0e1b2d] border border-slate-700/70 rounded-2xl p-4 min-h-44 flex flex-col items-center justify-center gap-2 overflow-hidden">
              {previewBait.isLoadingOnline ? (
                <div className="flex flex-col items-center justify-center gap-2.5 py-6 text-center">
                  <Loader2 className="w-7 h-7 text-emerald-400 animate-spin" />
                  <span className="text-xs font-semibold text-slate-300">
                    Buscando foto real on-line de &ldquo;{previewBait.name}&rdquo;...
                  </span>
                </div>
              ) : (
                <img
                  src={previewBaitUseFallback || !previewBait.image ? previewBait.fallbackImage : previewBait.image}
                  alt={previewBait.name}
                  referrerPolicy="no-referrer"
                  onError={() => setPreviewBaitUseFallback(true)}
                  className="w-full max-h-52 object-contain rounded-xl drop-shadow-[0_14px_20px_rgba(0,0,0,0.8)]"
                />
              )}
            </div>

            {previewBait.sourceLabel && (
              <div className="text-[10px] text-slate-400 text-center">
                {previewBait.sourceLabel}
              </div>
            )}

            {previewBait.reason && (
              <p className="text-xs text-slate-300 leading-relaxed bg-[#06121d] border border-slate-800 rounded-xl px-3 py-2.5">
                {previewBait.reason}
              </p>
            )}

            <button
              type="button"
              onClick={() => {
                baitFetchAbortRef.current?.abort();
                setPreviewBait(null);
              }}
              className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs transition-colors cursor-pointer"
            >
              Fechar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
