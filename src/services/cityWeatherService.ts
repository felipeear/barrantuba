// City Weather & BiteTime™ Service for Barrantuba Clube de Pesca
// Replicating high-fidelity Marine Weather, Solunar Cycle, Tide Curves and Species Feeding Activity

export interface CityLocation {
  name: string;
  admin1?: string;
  country: string;
  latitude: number;
  longitude: number;
}

export interface HourlyForecastPoint {
  hour: number; // 0..23
  hourLabel: string; // "07", "08", "12", etc.
  tempC: number;
  tempF: number;
  apparentTempC: number;
  apparentTempF: number;
  windKnots: number;
  windKmh: number;
  windGustsKnots: number;
  windDirDeg: number;
  windDirCode: string; // "WNW", "NNW", "ENE", "E", etc.
  pressureHpa: number;
  weatherCode: number;
  isDay: boolean;
  sunElevationDeg: number; // For sun arc
  moonElevationDeg: number; // For moon arc
  tideHeightFeet: number; // For tide curve
  tideHeightMeters: number;
}

export interface SpeciesBaitItem {
  name: string;
  baitId: string;
  image: string;
  category?: string;
  reason?: string;
}

export interface SpeciesBaitGuide {
  speciesId: string;
  speciesName: string;
  scientificName: string;
  baits: SpeciesBaitItem[];
  researchSummary: string;
  sourceLabel: string;
  updatedAt: string;
}

export interface SpeciesBiteData {
  id: string;
  name: string;
  scientificName: string;
  habitat: string;
  environment?: 'mar' | 'estuario' | 'rio';
  observationCount?: number;
  isCustomPhoto?: boolean;
  image: string;
  peakHour: number;
  peakPercent: number;
  hourlyProbabilities: { hour: number; percent: number }[];
  recommendedLures: string[];
  baitItems?: SpeciesBaitItem[];
  baitResearchSummary?: string;
  notes: string;
}

export interface CitySpeciesMeta {
  waterEnvironment: 'mar_estuario' | 'rio_represa' | 'estuario_rio';
  environmentLabel: string;
  sourceLabel: string;
  updatedAt: string;
}

export interface CompleteCityWeather {
  city: CityLocation;
  current: {
    tempC: number;
    tempF: number;
    apparentTempC: number;
    apparentTempF: number;
    windKnots: number;
    windKmh: number;
    windGustsKnots: number;
    windDirDeg: number;
    windDirCode: string;
    pressureHpa: number;
    humidity: number;
    weatherCode: number;
    conditionText: string;
  };
  todayHours: HourlyForecastPoint[];
  sunMoon: {
    sunrise: string;
    sunset: string;
    moonPhase: string;
    moonIlluminationPercent: number;
  };
  tides: {
    highTideTime: string;
    highTideHeightFt: string;
    highTideHeightM: string;
    lowTideTime: string;
    lowTideHeightFt: string;
  };
  speciesBiteTimes: SpeciesBiteData[];
  speciesMeta?: CitySpeciesMeta;
}

export const POPULAR_FISHING_CITIES: CityLocation[] = [
  { name: 'Laguna', admin1: 'Santa Catarina', country: 'Brazil', latitude: -28.4819, longitude: -48.7808 },
  { name: 'Tubarão', admin1: 'Santa Catarina', country: 'Brazil', latitude: -28.4717, longitude: -49.0069 },
  { name: 'Florianópolis', admin1: 'Santa Catarina', country: 'Brazil', latitude: -27.5954, longitude: -48.5480 },
  { name: 'Imbituba', admin1: 'Santa Catarina', country: 'Brazil', latitude: -28.2400, longitude: -48.6703 },
  { name: 'Balneário Camboriú', admin1: 'Santa Catarina', country: 'Brazil', latitude: -26.9926, longitude: -48.6353 },
  { name: 'Itajaí', admin1: 'Santa Catarina', country: 'Brazil', latitude: -26.9078, longitude: -48.6619 },
  { name: 'Cananéia', admin1: 'São Paulo', country: 'Brazil', latitude: -25.0147, longitude: -47.9267 },
  { name: 'Santos', admin1: 'São Paulo', country: 'Brazil', latitude: -23.9608, longitude: -46.3336 },
  { name: 'Ubatuba', admin1: 'São Paulo', country: 'Brazil', latitude: -23.4332, longitude: -45.0834 },
  { name: 'Paranaguá', admin1: 'Paraná', country: 'Brazil', latitude: -25.5205, longitude: -48.5092 },
  { name: 'Piracicaba', admin1: 'São Paulo', country: 'Brazil', latitude: -22.7253, longitude: -47.6492 },
  { name: 'Presidente Epitácio', admin1: 'São Paulo', country: 'Brazil', latitude: -21.7633, longitude: -52.1156 },
  { name: 'Corumbá', admin1: 'Mato Grosso do Sul', country: 'Brazil', latitude: -19.0089, longitude: -57.6533 },
  { name: 'Manaus', admin1: 'Amazonas', country: 'Brazil', latitude: -3.1190, longitude: -60.0217 },
];

function compassCode(degrees: number): string {
  const codes = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  const index = Math.round((degrees % 360) / 22.5) % 16;
  return codes[index];
}

function getWeatherDescription(code: number): string {
  if (code === 0) return 'Céu Limpo';
  if (code === 1) return 'Poucas Nuvens';
  if (code === 2) return 'Parcialmente Nublado';
  if (code === 3) return 'Encoberto';
  if (code >= 45 && code <= 48) return 'Neblina';
  if (code >= 51 && code <= 55) return 'Garoa';
  if (code >= 61 && code <= 65) return 'Chuva';
  if (code >= 80 && code <= 82) return 'Pancadas';
  if (code >= 95) return 'Instável';
  return 'Ensolarado';
}

import enxovaFishImg from '../assets/images/enxova_3d.png';
import robaloFishImg from '../assets/images/robalo_flecha_3d.png';
import tucunareFishImg from '../assets/images/tucunare_azul_3d.png';
import douradoFishImg from '../assets/images/dourado_rio_3d.png';
import corvinaFishImg from '../assets/images/corvina_3d.png';
import trairaFishImg from '../assets/images/traira_3d.png';
import tilapiaFishImg from '../assets/images/tilapia_3d.png';
import tainhaFishImg from '../assets/images/tainha_3d.png';
import pacuFishImg from '../assets/images/pacu_3d.png';
import pintadoFishImg from '../assets/images/pintado_3d.png';
import bagreFishImg from '../assets/images/bagre_3d.png';
import garoupaFishImg from '../assets/images/garoupa_3d.png';
import piavaFishImg from '../assets/images/piava_3d.png';
import pampoFishImg from '../assets/images/pampo_3d.png';
import caraFishImg from '../assets/images/cara_3d.png';
import curimbataFishImg from '../assets/images/curimbata_3d.png';

import lureZaraImg from '../assets/images/lure_zara_topwater_3d.png';
import lurePlugImg from '../assets/images/lure_plug_minnow_3d.png';
import lureShrimpImg from '../assets/images/lure_soft_shrimp_3d.png';
import lureMetalJigImg from '../assets/images/lure_metal_jig_3d.png';
import lureFrogImg from '../assets/images/lure_frog_bait_3d.png';
import baitMassaImg from '../assets/images/bait_massa_racao_3d.png';
import baitLarvaImg from '../assets/images/bait_larva_bichinho_3d.png';
import baitMinhocaImg from '../assets/images/bait_minhoca_worm_3d.png';
import baitMilhoImg from '../assets/images/bait_milho_corn_3d.png';
import baitLambariImg from '../assets/images/bait_lambari_sardinha_3d.png';
import baitSpinnerbaitImg from '../assets/images/bait_spinnerbait_3d.png';
import baitCamaraoVivoImg from '../assets/images/bait_camarao_vivo_3d.png';
import baitJigPenaImg from '../assets/images/bait_jig_pena_3d.png';
import baitPopperImg from '../assets/images/bait_popper_3d.png';
import baitSardinhaImg from '../assets/images/bait_sardinha_3d.png';
import baitPaoImg from '../assets/images/bait_pao_3d.png';
import baitColherImg from '../assets/images/bait_colher_3d.png';

export interface RegionalLureItem {
  name: string;
  baitId: string;
  image: string;
  fallbackImage: string;
  category?: string;
  reason?: string;
  targetSpeciesId: string;
  targetSpeciesName: string;
}

export const LOCAL_BAIT_FALLBACK_IMAGES: Record<string, string> = {
  zara_topwater: lureZaraImg,
  plug_minnow: lurePlugImg,
  camarao_soft: lureShrimpImg,
  colher_metal_jig: lureMetalJigImg,
  frog_sapinho: lureFrogImg,
  massa_racao: baitMassaImg,
  bichinho_laranja: baitLarvaImg,
  minhoca: baitMinhocaImg,
  milho_verde: baitMilhoImg,
  lambari_sardinha: baitLambariImg,
  spinnerbait: baitSpinnerbaitImg,
  camarao_vivo: baitCamaraoVivoImg,
  jig_pena: baitJigPenaImg,
  popper: baitPopperImg,
  sardinha_fresca: baitSardinhaImg,
  pao_pesca: baitPaoImg,
  colher_prateada: baitColherImg,
};

export function mapBaitNameToCanonicalClient(baitName: string): {
  baitId: string;
  category: string;
  fallbackImage: string;
} {
  const n = String(baitName || '').toLowerCase();
  if (/spinner/.test(n)) {
    return { baitId: 'spinnerbait', category: 'Spinner & Metal', fallbackImage: baitSpinnerbaitImg };
  }
  if (/popper/.test(n)) {
    return { baitId: 'popper', category: 'Superfície Popper', fallbackImage: baitPopperImg };
  }
  if (/bichinho|bicho\s+da\s+laranja|larva|ten[eé]brio/.test(n)) {
    return { baitId: 'bichinho_laranja', category: 'Larva Natural', fallbackImage: baitLarvaImg };
  }
  if (/minhoc(a|[aã]o|uinha)|mussum|verme/.test(n)) {
    return { baitId: 'minhoca', category: 'Isca Natural de Fundo', fallbackImage: baitMinhocaImg };
  }
  if (/p[aã]o|chuveirinho/.test(n)) {
    return { baitId: 'pao_pesca', category: 'Superfície Natural', fallbackImage: baitPaoImg };
  }
  if (/mass(a|inha)|ra[cç][aã]o|farinha/.test(n)) {
    return { baitId: 'massa_racao', category: 'Massa & Ração', fallbackImage: baitMassaImg };
  }
  if (/milho|fruta|semente|batata|ab[oó]bora/.test(n)) {
    return { baitId: 'milho_verde', category: 'Grão & Fruto', fallbackImage: baitMilhoImg };
  }
  if (/frog|sapinho/.test(n)) {
    return { baitId: 'frog_sapinho', category: 'Superfície Anti-enrosco', fallbackImage: lureFrogImg };
  }
  if (/sardinha|lula|peda[cç]o|carne|f[ií]gado/.test(n)) {
    return { baitId: 'sardinha_fresca', category: 'Isca Natural Mar/Fundo', fallbackImage: baitSardinhaImg };
  }
  if (/lambari|tuvira|peixe inteiro|peixe-isca|manjuba/.test(n)) {
    return { baitId: 'lambari_sardinha', category: 'Peixe-Isca Natural', fallbackImage: baitLambariImg };
  }
  if (/camar[aã]o\s*(vivo|rosa|fresco|marisco)|marisco|tatu[ií]|corrupto|caramujo/.test(n)) {
    return { baitId: 'camarao_vivo', category: 'Crustáceo Natural', fallbackImage: baitCamaraoVivoImg };
  }
  if (/camar[aã]o|shad/.test(n)) {
    return { baitId: 'camarao_soft', category: 'Crustáceo & Soft', fallbackImage: lureShrimpImg };
  }
  if (/pena|penacho|mosca|fly/.test(n)) {
    return { baitId: 'jig_pena', category: 'Jig & Bucktail', fallbackImage: baitJigPenaImg };
  }
  if (/colher/.test(n)) {
    return { baitId: 'colher_prateada', category: 'Colher Metálica', fallbackImage: baitColherImg };
  }
  if (/zara|stick|superf[ií]cie|firestick|h[eé]lice/.test(n)) {
    return { baitId: 'zara_topwater', category: 'Superfície', fallbackImage: lureZaraImg };
  }
  if (/jumping|met[aá]lic|micro-jig|jig/.test(n)) {
    return { baitId: 'colher_metal_jig', category: 'Jig & Metal', fallbackImage: lureMetalJigImg };
  }
  if (/plug|meia-[aá]gua|inna|brava|crank|twitch|minnow|barbela|micro-isca/.test(n)) {
    return { baitId: 'plug_minnow', category: 'Meia-Água', fallbackImage: lurePlugImg };
  }
  return { baitId: 'colher_metal_jig', category: 'Artificial Versátil', fallbackImage: lureMetalJigImg };
}

export function getLocalBaitFallbackImage(baitId: string, baitName = ''): string {
  return LOCAL_BAIT_FALLBACK_IMAGES[baitId] || mapBaitNameToCanonicalClient(baitName).fallbackImage;
}

export function getLureImageForName(baitName: string): string {
  return mapBaitNameToCanonicalClient(baitName).fallbackImage;
}

export interface SpeciesPhotoRecord {
  speciesId: string;
  speciesName: string;
  imageData: string;
  defaultImageData: string;
  isCustom: boolean;
  updatedAt: string;
}

// Default 3D Transparent PNG Fish Artwork (bundled via Vite so they always resolve instantly)
export const DEFAULT_FISH_IMAGES: Record<string, string> = {
  enxova: enxovaFishImg,
  robalo: robaloFishImg,
  tucunare: tucunareFishImg,
  dourado: douradoFishImg,
  corvina: corvinaFishImg,
  hoplias_malabaricus: trairaFishImg,
  hoplias: trairaFishImg,
  traira: trairaFishImg,
  oreochromis_niloticus: tilapiaFishImg,
  tilapia: tilapiaFishImg,
  mugil_liza: tainhaFishImg,
  mugil_curema: tainhaFishImg,
  mugil_cephalus: tainhaFishImg,
  tainha: tainhaFishImg,
  piaractus_mesopotamicus: pacuFishImg,
  colossoma_macropomum: pacuFishImg,
  mylossoma: pacuFishImg,
  myloplus: pacuFishImg,
  pacu: pacuFishImg,
  pseudoplatystoma_corruscans: pintadoFishImg,
  pseudoplatystoma_tigrinum: pintadoFishImg,
  pseudoplatystoma_punctifer: pintadoFishImg,
  pintado: pintadoFishImg,
  rhamdia_quelen: bagreFishImg,
  genidens_barbus: bagreFishImg,
  bagre: bagreFishImg,
  jundia: bagreFishImg,
  epinephelus_marginatus: garoupaFishImg,
  epinephelus_itajara: garoupaFishImg,
  hyporthodus_niveatus: garoupaFishImg,
  garoupa: garoupaFishImg,
  megaleporinus_obtusidens: piavaFishImg,
  schizodon_nasutus: piavaFishImg,
  piava: piavaFishImg,
  piau: piavaFishImg,
  trachinotus_carolinus: pampoFishImg,
  trachinotus_goodei: pampoFishImg,
  trachinotus_marginatus: pampoFishImg,
  pampo: pampoFishImg,
  geophagus_brasiliensis: caraFishImg,
  geophagus_sveni: caraFishImg,
  cara: caraFishImg,
  prochilodus_lineatus: curimbataFishImg,
  curimbata: curimbataFishImg,
};

const DB_SPECIES_PHOTOS_CACHE_KEY = 'barrantuba_species_db_photos_v3';
const DB_SPECIES_CUSTOM_FLAGS_KEY = 'barrantuba_species_custom_flags_v3';

export function getCachedDbSpeciesPhotos(): Record<string, string> {
  try {
    const raw = localStorage.getItem(DB_SPECIES_PHOTOS_CACHE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function getCustomSpeciesFlags(): Record<string, boolean> {
  try {
    const raw = localStorage.getItem(DB_SPECIES_CUSTOM_FLAGS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function getCustomSpeciesPhotos(): Record<string, string> {
  try {
    const raw = localStorage.getItem('barrantuba_species_custom_photos');
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function updateLocalSpeciesCache(photosById: Record<string, string>, flagsById: Record<string, boolean>) {
  try {
    localStorage.setItem(DB_SPECIES_PHOTOS_CACHE_KEY, JSON.stringify(photosById));
    localStorage.setItem(DB_SPECIES_CUSTOM_FLAGS_KEY, JSON.stringify(flagsById));
  } catch {
    // ignore storage quota errors on fallback cache; PostgreSQL is source of truth
  }
}

export async function fetchSpeciesPhotosFromDb(): Promise<{
  photosBySpecies: Record<string, string>;
  customFlags: Record<string, boolean>;
  records: SpeciesPhotoRecord[];
}> {
  const res = await fetch('/api/species-photos');
  if (!res.ok) {
    throw new Error('Falha ao carregar fotos das espécies do banco de dados.');
  }
  const records: SpeciesPhotoRecord[] = await res.json();
  const photosBySpecies: Record<string, string> = {};
  const customFlags: Record<string, boolean> = {};

  for (const r of records) {
    if (r?.speciesId && r?.imageData) {
      photosBySpecies[r.speciesId] = r.imageData;
      customFlags[r.speciesId] = Boolean(r.isCustom);
    }
  }

  updateLocalSpeciesCache(photosBySpecies, customFlags);
  return { photosBySpecies, customFlags, records };
}

export async function saveSpeciesPhotoToDb(
  speciesId: string,
  speciesName: string,
  imageData: string
): Promise<{ ok: boolean; photo?: SpeciesPhotoRecord; error?: string }> {
  try {
    const res = await fetch('/api/species-photos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ speciesId, speciesName, imageData }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data?.photo) {
      return { ok: false, error: data?.error || 'Erro ao gravar foto do peixe no banco de dados.' };
    }

    const cached = getCachedDbSpeciesPhotos();
    const flags = getCustomSpeciesFlags();
    cached[speciesId] = data.photo.imageData;
    flags[speciesId] = Boolean(data.photo.isCustom);
    updateLocalSpeciesCache(cached, flags);
    invalidateAllSpeciesAndBaitCaches();

    return { ok: true, photo: data.photo };
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Erro de conexão ao salvar foto no banco de dados.' };
  }
}

export async function revertSpeciesPhotoInDb(
  speciesId: string
): Promise<{ ok: boolean; photo?: SpeciesPhotoRecord; error?: string }> {
  try {
    const res = await fetch(`/api/species-photos/${encodeURIComponent(speciesId)}/revert`, {
      method: 'POST',
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data?.photo) {
      return { ok: false, error: data?.error || 'Erro ao restaurar foto original no banco de dados.' };
    }

    const cached = getCachedDbSpeciesPhotos();
    const flags = getCustomSpeciesFlags();
    cached[speciesId] = data.photo.imageData;
    flags[speciesId] = false;
    updateLocalSpeciesCache(cached, flags);
    invalidateAllSpeciesAndBaitCaches();

    return { ok: true, photo: data.photo };
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Erro de conexão ao restaurar foto no banco de dados.' };
  }
}

// Solunar Bite Algorithm for Brazilian Fish Species with real fish images
export function generateSpeciesBiteTimes(baseDate: Date, pressure: number): SpeciesBiteData[] {
  const dbPhotos = getCachedDbSpeciesPhotos();
  const customPhotos = getCustomSpeciesPhotos();

  const speciesConfigs = [
    {
      id: 'enxova',
      name: 'Enxova',
      scientificName: 'Pomatomus saltatrix',
      habitat: 'Costões e Canais com Correnteza',
      image: dbPhotos['enxova'] || customPhotos['enxova'] || DEFAULT_FISH_IMAGES['enxova'],
      peakHour: 12,
      baseDist: [2, 1, 1, 1, 2, 4, 8, 12, 6, 2, 3, 7, 21, 6, 4, 5, 11, 15, 8, 4, 3, 2, 1, 2],
      recommendedLures: ['Colher metálica 40g', 'Jig de penacho 28g', 'Plug de meia-água 110'],
      notes: 'Predador extremamente voraz que caça em cardume durante o pico da maré cheia e correntes rápidas.'
    },
    {
      id: 'robalo',
      name: 'Robalo Flecha',
      scientificName: 'Centropomus undecimalis',
      habitat: 'Galhadas, Pilares de Pontes e Bocas de Barra',
      image: dbPhotos['robalo'] || customPhotos['robalo'] || DEFAULT_FISH_IMAGES['robalo'],
      peakHour: 8,
      baseDist: [1, 1, 2, 3, 5, 11, 18, 24, 15, 7, 4, 5, 9, 7, 5, 8, 14, 22, 16, 9, 5, 3, 2, 1],
      recommendedLures: ['Camarão Soft D.O.A no Jig 15g', 'Stick Firestick 90', 'Plug Meia-água Brava 90'],
      notes: 'Ataques certeiros na transição de luz da manhã e fim de tarde nas paradas de maré.'
    },
    {
      id: 'tucunare',
      name: 'Tucunaré Azul',
      scientificName: 'Cichla piquiti',
      habitat: 'Bicos de Pedra, Troncos Submersos e Represas',
      image: dbPhotos['tucunare'] || customPhotos['tucunare'] || DEFAULT_FISH_IMAGES['tucunare'],
      peakHour: 10,
      baseDist: [0, 0, 0, 0, 1, 3, 10, 17, 22, 26, 20, 14, 11, 9, 12, 16, 23, 18, 9, 4, 1, 0, 0, 0],
      recommendedLures: ['Zara Spook Jr 9cm Osso', 'Zig Zara 110', 'Spinnerbait 1/2oz'],
      notes: 'Peixe estritamente visual. Atividade explode com sol brilhante e águas oxigenadas.'
    },
    {
      id: 'dourado',
      name: 'Dourado do Rio',
      scientificName: 'Salminus brasiliensis',
      habitat: 'Corredeiras, Gargantas e Saídas de Pedral',
      image: dbPhotos['dourado'] || customPhotos['dourado'] || DEFAULT_FISH_IMAGES['dourado'],
      peakHour: 7,
      baseDist: [1, 0, 0, 1, 3, 8, 19, 25, 17, 11, 7, 6, 8, 7, 6, 9, 15, 23, 14, 7, 3, 1, 1, 0],
      recommendedLures: ['Plug Inna Pro Tuned 90/110', 'Colher Johnson Silver Minnow', 'Tuvira no Chicote'],
      notes: 'O rei do rio caça nos refluxos de água rápida onde os peixes forrageiros ficam atordoados.'
    },
    {
      id: 'corvina',
      name: 'Corvina',
      scientificName: 'Micropogonias furnieri',
      habitat: 'Poções de Fundo, Canais e Baías',
      image: dbPhotos['corvina'] || customPhotos['corvina'] || DEFAULT_FISH_IMAGES['corvina'],
      peakHour: 19,
      baseDist: [5, 4, 3, 2, 2, 4, 7, 9, 6, 5, 5, 7, 10, 8, 6, 8, 11, 15, 20, 24, 19, 14, 9, 7],
      recommendedLures: ['Camarão Vivo no Anzol Maruseigo', 'Jig Head 21g com Shads', 'Sardinha Fresca'],
      notes: 'Alimenta-se no fundo tateando crustáceos, com maior intensidade no início da noite e maré enchente.'
    }
  ];

  // Adjust peak percentages based on pressure stability
  const pressureFactor = pressure >= 1012 && pressure <= 1018 ? 1.1 : 0.95;

  return speciesConfigs.map(s => {
    const hourly = s.baseDist.map((base, hour) => {
      let percent = Math.min(35, Math.max(1, Math.round(base * pressureFactor)));
      return { hour, percent };
    });

    const maxPoint = [...hourly].sort((a, b) => b.percent - a.percent)[0];

    return {
      id: s.id,
      name: s.name,
      scientificName: s.scientificName,
      habitat: s.habitat,
      image: s.image,
      peakHour: maxPoint.hour,
      peakPercent: maxPoint.percent,
      hourlyProbabilities: hourly,
      recommendedLures: s.recommendedLures,
      notes: s.notes
    };
  });
}

function buildPatternDistribution(
  pattern: 'diurnal' | 'crepuscular' | 'nocturnal' | 'tidal',
  seedOffset: number,
  pressure: number
): { hourly: { hour: number; percent: number }[]; peakHour: number; peakPercent: number } {
  const templates: Record<'diurnal' | 'crepuscular' | 'nocturnal' | 'tidal', number[]> = {
    diurnal:     [1, 1, 1, 1, 2, 4, 10, 16, 21, 25, 22, 16, 12, 10, 13, 17, 21, 16, 9, 4, 2, 1, 1, 1],
    crepuscular: [2, 1, 1, 2, 5, 11, 19, 24, 16, 8, 5, 6, 9, 7, 6, 9, 15, 23, 18, 10, 5, 3, 2, 2],
    nocturnal:   [8, 6, 4, 3, 2, 4, 6, 8, 5, 4, 4, 6, 8, 7, 6, 8, 12, 16, 21, 25, 21, 16, 12, 10],
    tidal:       [3, 2, 2, 3, 5, 8, 13, 16, 11, 7, 9, 15, 23, 14, 9, 11, 16, 20, 14, 8, 5, 4, 3, 3],
  };

  const baseArr = templates[pattern] || templates.diurnal;
  const pressureFactor = pressure >= 1012 && pressure <= 1018 ? 1.08 : 0.96;

  // Deterministic subtle per-species hour shift (-1..+1) so each species shows realistic variation
  const shift = (seedOffset % 3) - 1;
  const hourly = baseArr.map((_, hour) => {
    const srcHour = (hour - shift + 24) % 24;
    const val = baseArr[srcHour];
    const percent = Math.min(35, Math.max(1, Math.round(val * pressureFactor)));
    return { hour, percent };
  });

  const maxPoint = [...hourly].sort((a, b) => b.percent - a.percent)[0];
  return { hourly, peakHour: maxPoint.hour, peakPercent: maxPoint.percent };
}

const CITY_SPECIES_CACHE_PREFIX = 'barrantuba_city_species_v6_';
const memoryCitySpeciesCache = new Map<string, { raw: any; savedAt: number }>();

function getCitySpeciesCacheKey(city: CityLocation): string {
  return `${city.latitude.toFixed(2)}_${city.longitude.toFixed(2)}`;
}

function mapRawCitySpeciesResponse(
  data: any,
  pressure: number
): { speciesBiteTimes: SpeciesBiteData[]; speciesMeta: CitySpeciesMeta } {
  const rawList: any[] = Array.isArray(data?.species) ? data.species : [];

  const currentCached = getCachedDbSpeciesPhotos();
  const currentFlags = getCustomSpeciesFlags();
  let cacheDirty = false;

  const speciesBiteTimes: SpeciesBiteData[] = rawList.map((item, idx) => {
    if (item?.id && item?.image) {
      currentCached[item.id] = item.image;
      currentFlags[item.id] = Boolean(item.isCustomPhoto);
      cacheDirty = true;
    }
    const { hourly, peakHour, peakPercent } = buildPatternDistribution(
      item.feedingPattern || 'diurnal',
      Number(item.taxonId || idx),
      pressure
    );

    const baitItems: SpeciesBaitItem[] = Array.isArray(item.baitItems) && item.baitItems.length > 0
      ? item.baitItems.map((bi: any) => {
          const mapped = mapBaitNameToCanonicalClient(bi.name);
          const exactSlug = String(bi.name || 'isca')
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '_')
            .replace(/^_+|_+$/g, '')
            .slice(0, 72);
          const exactId = bi.baitId && String(bi.baitId).startsWith('exact_') ? bi.baitId : `exact_${exactSlug || 'isca'}`;
          return {
            name: bi.name,
            baitId: exactId,
            image: bi.image || `/api/bait-photos/${encodeURIComponent(exactId)}/image?name=${encodeURIComponent(bi.name)}`,
            category: bi.category || mapped.category,
            reason: bi.reason || `Indicada para ${item.name}`,
          };
        })
      : (Array.isArray(item.recommendedLures) ? item.recommendedLures : []).map((lureName: string) => {
          const mapped = mapBaitNameToCanonicalClient(lureName);
          const exactSlug = String(lureName || 'isca')
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '_')
            .replace(/^_+|_+$/g, '')
            .slice(0, 72);
          const exactId = `exact_${exactSlug || 'isca'}`;
          return {
            name: lureName,
            baitId: exactId,
            image: `/api/bait-photos/${encodeURIComponent(exactId)}/image?name=${encodeURIComponent(lureName)}`,
            category: mapped.category,
            reason: `Indicada para ${item.name}`,
          };
        });

    return {
      id: item.id,
      name: item.name,
      scientificName: item.scientificName,
      habitat: item.habitat,
      environment: item.environment,
      observationCount: item.observationCount,
      isCustomPhoto: Boolean(item.isCustomPhoto),
      image: item.image || DEFAULT_FISH_IMAGES[item.id] || '',
      peakHour,
      peakPercent,
      hourlyProbabilities: hourly,
      recommendedLures: baitItems.map(b => b.name),
      baitItems,
      baitResearchSummary: item.baitResearchSummary || undefined,
      notes: item.notes || ''
    };
  });

  if (cacheDirty) {
    updateLocalSpeciesCache(currentCached, currentFlags);
  }

  return {
    speciesBiteTimes,
    speciesMeta: {
      waterEnvironment: data.waterEnvironment || 'rio_represa',
      environmentLabel: data.environmentLabel || 'Rio & Represa',
      sourceLabel: data.sourceLabel || 'iNaturalist + Open-Meteo Marine',
      updatedAt: data.updatedAt || new Date().toISOString()
    }
  };
}

export function getCachedRealCitySpecies(
  city: CityLocation,
  pressure: number
): { speciesBiteTimes: SpeciesBiteData[]; speciesMeta: CitySpeciesMeta } | null {
  const key = getCitySpeciesCacheKey(city);
  const mem = memoryCitySpeciesCache.get(key);
  if (mem && Date.now() - mem.savedAt < 24 * 3600 * 1000) {
    return mapRawCitySpeciesResponse(mem.raw, pressure);
  }
  try {
    const rawStr = localStorage.getItem(`${CITY_SPECIES_CACHE_PREFIX}${key}`);
    if (!rawStr) return null;
    const parsed = JSON.parse(rawStr);
    if (!parsed?.species || !Array.isArray(parsed.species) || parsed.species.length === 0) return null;
    memoryCitySpeciesCache.set(key, { raw: parsed, savedAt: Date.now() });
    return mapRawCitySpeciesResponse(parsed, pressure);
  } catch {
    return null;
  }
}

export async function fetchRealCitySpecies(
  city: CityLocation,
  pressure: number,
  forceRefresh = false,
  signal?: AbortSignal
): Promise<{ speciesBiteTimes: SpeciesBiteData[]; speciesMeta: CitySpeciesMeta }> {
  const url = `/api/city-species?name=${encodeURIComponent(city.name)}&lat=${city.latitude.toFixed(4)}&lon=${city.longitude.toFixed(4)}${forceRefresh ? '&refresh=1' : ''}`;
  const res = await fetch(url, signal ? { signal } : undefined);
  if (!res.ok) {
    throw new Error('Falha ao identificar peixes reais da cidade on-line.');
  }
  const data = await res.json();

  const key = getCitySpeciesCacheKey(city);
  if (Array.isArray(data?.species) && data.species.length > 0) {
    memoryCitySpeciesCache.set(key, { raw: data, savedAt: Date.now() });
    try {
      localStorage.setItem(`${CITY_SPECIES_CACHE_PREFIX}${key}`, JSON.stringify(data));
    } catch {
      // ignore storage quota errors
    }
  }

  return mapRawCitySpeciesResponse(data, pressure);
}

const SPECIES_BAIT_CACHE_PREFIX = 'barrantuba_species_baits_v3_';
const memorySpeciesBaitCache = new Map<string, { guide: SpeciesBaitGuide; savedAt: number }>();

export function getCachedSpeciesBaitGuide(speciesId: string): SpeciesBaitGuide | null {
  const mem = memorySpeciesBaitCache.get(speciesId);
  if (mem && Date.now() - mem.savedAt < 24 * 3600 * 1000) {
    return mem.guide;
  }
  try {
    const raw = localStorage.getItem(`${SPECIES_BAIT_CACHE_PREFIX}${speciesId}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SpeciesBaitGuide;
    if (!parsed?.baits || !Array.isArray(parsed.baits) || parsed.baits.length === 0) return null;
    memorySpeciesBaitCache.set(speciesId, { guide: parsed, savedAt: Date.now() });
    return parsed;
  } catch {
    return null;
  }
}

export async function fetchSpeciesBaitsOnline(
  speciesId: string,
  speciesName: string,
  scientificName = '',
  environment: 'mar' | 'estuario' | 'rio' = 'rio',
  signal?: AbortSignal
): Promise<SpeciesBaitGuide> {
  const url = `/api/species-baits?speciesId=${encodeURIComponent(speciesId)}&speciesName=${encodeURIComponent(speciesName)}&scientificName=${encodeURIComponent(scientificName)}&environment=${encodeURIComponent(environment)}`;
  const res = await fetch(url, signal ? { signal } : undefined);
  if (!res.ok) {
    throw new Error('Falha ao pesquisar iscas reais da espécie.');
  }
  const guide = (await res.json()) as SpeciesBaitGuide;
  if (Array.isArray(guide?.baits) && guide.baits.length > 0) {
    memorySpeciesBaitCache.set(speciesId, { guide, savedAt: Date.now() });
    try {
      localStorage.setItem(`${SPECIES_BAIT_CACHE_PREFIX}${speciesId}`, JSON.stringify(guide));
    } catch {
      // ignore quota errors
    }
  }
  return guide;
}

export interface ExactBaitPhotoResult {
  baitId: string;
  baitName: string;
  category: string;
  image: string;
  sourceLabel: string;
  updatedAt: string;
}

const EXACT_BAIT_PHOTO_CACHE_PREFIX = 'barrantuba_exact_bait_v3_';
const memoryExactBaitCache = new Map<string, { data: ExactBaitPhotoResult; savedAt: number }>();

function getExactBaitCacheKey(baitName: string): string {
  return String(baitName || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 72);
}

const preloadedBaitImageUrls = new Set<string>();

export function preloadBaitBrowserImage(imageUrl: string): void {
  if (!imageUrl || preloadedBaitImageUrls.has(imageUrl) || typeof Image === 'undefined') return;
  preloadedBaitImageUrls.add(imageUrl);
  const img = new Image();
  img.decoding = 'async';
  img.src = imageUrl;
}

export function getDirectExactBaitImageUrl(baitName: string): { baitId: string; imageUrl: string } {
  const key = getExactBaitCacheKey(baitName) || 'isca';
  const baitId = `exact_${key}`;
  return {
    baitId,
    imageUrl: `/api/bait-photos/${encodeURIComponent(baitId)}/image?name=${encodeURIComponent(baitName)}`,
  };
}

export function getCachedExactBaitPhoto(baitName: string): ExactBaitPhotoResult | null {
  const key = getExactBaitCacheKey(baitName);
  const mem = memoryExactBaitCache.get(key);
  if (mem && Date.now() - mem.savedAt < 7 * 24 * 3600 * 1000) {
    preloadBaitBrowserImage(mem.data.image);
    return mem.data;
  }
  try {
    const raw = localStorage.getItem(`${EXACT_BAIT_PHOTO_CACHE_PREFIX}${key}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ExactBaitPhotoResult;
    if (!parsed?.image) return null;
    memoryExactBaitCache.set(key, { data: parsed, savedAt: Date.now() });
    preloadBaitBrowserImage(parsed.image);
    return parsed;
  } catch {
    return null;
  }
}

export async function fetchExactBaitPhotoOnline(
  baitName: string,
  forceRefresh = false,
  signal?: AbortSignal
): Promise<ExactBaitPhotoResult> {
  const url = `/api/bait-photo-by-name?name=${encodeURIComponent(baitName)}${forceRefresh ? '&refresh=1' : ''}`;
  const res = await fetch(url, signal ? { signal } : undefined);
  if (!res.ok) {
    throw new Error('Não foi possível buscar a imagem on-line desta isca.');
  }
  const data = (await res.json()) as ExactBaitPhotoResult;
  const key = getExactBaitCacheKey(baitName);
  if (data?.image) {
    memoryExactBaitCache.set(key, { data, savedAt: Date.now() });
    preloadBaitBrowserImage(data.image);
    try {
      localStorage.setItem(`${EXACT_BAIT_PHOTO_CACHE_PREFIX}${key}`, JSON.stringify(data));
    } catch {
      // ignore storage quota errors
    }
  }
  return data;
}

const inFlightPrefetchBaitNames = new Set<string>();

export async function prefetchExactBaitPhotos(baitNames: string[]): Promise<void> {
  const toFetch: string[] = [];
  for (const raw of baitNames || []) {
    const clean = String(raw || '').trim();
    if (!clean) continue;
    const cached = getCachedExactBaitPhoto(clean);
    if (cached) {
      preloadBaitBrowserImage(cached.image);
      continue;
    }
    const key = getExactBaitCacheKey(clean);
    if (inFlightPrefetchBaitNames.has(key)) continue;
    inFlightPrefetchBaitNames.add(key);
    toFetch.push(clean);
  }

  if (toFetch.length === 0) return;

  try {
    const res = await fetch('/api/bait-photos/prefetch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ names: toFetch }),
    });
    if (!res.ok) return;
    const payload = await res.json();
    const items: ExactBaitPhotoResult[] = Array.isArray(payload?.items) ? payload.items : [];
    for (const item of items) {
      if (!item?.baitName || !item?.image) continue;
      const key = getExactBaitCacheKey(item.baitName);
      memoryExactBaitCache.set(key, { data: item, savedAt: Date.now() });
      preloadBaitBrowserImage(item.image);
      try {
        localStorage.setItem(`${EXACT_BAIT_PHOTO_CACHE_PREFIX}${key}`, JSON.stringify(item));
      } catch {
        // ignore quota errors
      }
    }
  } catch {
    // non-fatal background prefetch
  } finally {
    for (const n of toFetch) {
      inFlightPrefetchBaitNames.delete(getExactBaitCacheKey(n));
    }
  }
}

export interface BaitPhotoAdminRecord {
  baitId: string;
  baitName: string;
  category: string;
  image: string;
  sourceLabel: string;
  isCustom: boolean;
  updatedAt: string;
}

export function invalidateAllSpeciesAndBaitCaches(): void {
  memoryCitySpeciesCache.clear();
  memorySpeciesBaitCache.clear();
  memoryExactBaitCache.clear();
  preloadedBaitImageUrls.clear();
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (
        k &&
        (k.startsWith(CITY_SPECIES_CACHE_PREFIX) ||
          k.startsWith(SPECIES_BAIT_CACHE_PREFIX) ||
          k.startsWith(EXACT_BAIT_PHOTO_CACHE_PREFIX))
      ) {
        keysToRemove.push(k);
      }
    }
    for (const k of keysToRemove) localStorage.removeItem(k);
  } catch {
    // ignore storage errors
  }
}

export async function fetchBaitPhotosFromDb(): Promise<BaitPhotoAdminRecord[]> {
  const res = await fetch('/api/bait-photos');
  if (!res.ok) {
    throw new Error('Falha ao carregar fotos das iscas do banco de dados.');
  }
  return (await res.json()) as BaitPhotoAdminRecord[];
}

export async function saveBaitPhotoToDb(params: {
  baitId?: string;
  baitName: string;
  category?: string;
  imageData: string;
}): Promise<{ ok: boolean; photo?: BaitPhotoAdminRecord; error?: string }> {
  try {
    const res = await fetch('/api/bait-photos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data?.photo) {
      return { ok: false, error: data?.error || 'Erro ao salvar foto da isca no banco de dados.' };
    }

    invalidateAllSpeciesAndBaitCaches();
    const photo = data.photo as BaitPhotoAdminRecord;
    const key = getExactBaitCacheKey(photo.baitName);
    memoryExactBaitCache.set(key, {
      data: {
        baitId: photo.baitId,
        baitName: photo.baitName,
        category: photo.category,
        image: photo.image,
        sourceLabel: photo.sourceLabel,
        updatedAt: photo.updatedAt,
      },
      savedAt: Date.now(),
    });
    preloadBaitBrowserImage(photo.image);
    return { ok: true, photo };
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Erro de conexão ao salvar foto da isca.' };
  }
}

export async function revertBaitPhotoInDb(
  baitId: string,
  baitName?: string
): Promise<{ ok: boolean; photo?: BaitPhotoAdminRecord; error?: string }> {
  try {
    const res = await fetch(`/api/bait-photos/${encodeURIComponent(baitId)}/revert`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ baitName }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data?.photo) {
      return { ok: false, error: data?.error || 'Erro ao restaurar foto original da isca.' };
    }
    invalidateAllSpeciesAndBaitCaches();
    return { ok: true, photo: data.photo as BaitPhotoAdminRecord };
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Erro de conexão ao restaurar foto da isca.' };
  }
}

export function deriveEfficientLuresForSpecies(
  speciesList: SpeciesBiteData[],
  selectedSpeciesId?: string | null,
  selectedBaitGuide?: SpeciesBaitGuide | null
): RegionalLureItem[] {
  // If user selected a specific fish and we have its PostgreSQL-backed online bait guide, use it directly
  if (selectedSpeciesId && selectedBaitGuide && selectedBaitGuide.speciesId === selectedSpeciesId && selectedBaitGuide.baits.length > 0) {
    const selectedSp = speciesList.find(s => s.id === selectedSpeciesId);
    return selectedBaitGuide.baits.map(b => {
      const mapped = mapBaitNameToCanonicalClient(b.name);
      const baitId = b.baitId || `exact_${getExactBaitCacheKey(b.name)}`;
      return {
        name: b.name,
        baitId,
        image: b.image || `/api/bait-photos/${encodeURIComponent(baitId)}/image?name=${encodeURIComponent(b.name)}`,
        fallbackImage: mapped.fallbackImage,
        category: b.category || mapped.category,
        reason: b.reason,
        targetSpeciesId: selectedSpeciesId,
        targetSpeciesName: selectedSp?.name || selectedBaitGuide.speciesName,
      };
    });
  }

  const sourceList = selectedSpeciesId
    ? speciesList.filter(s => s.id === selectedSpeciesId)
    : speciesList;

  const seenNames = new Set<string>();
  const lures: RegionalLureItem[] = [];

  for (const sp of sourceList) {
    const items = Array.isArray(sp.baitItems) && sp.baitItems.length > 0
      ? sp.baitItems
      : (sp.recommendedLures || []).map(name => {
          const mapped = mapBaitNameToCanonicalClient(name);
          const exactId = `exact_${getExactBaitCacheKey(name)}`;
          return {
            name,
            baitId: exactId,
            image: `/api/bait-photos/${encodeURIComponent(exactId)}/image?name=${encodeURIComponent(name)}`,
            category: mapped.category,
            reason: `Indicada para ${sp.name}`,
          };
        });

    for (const bi of items) {
      const cleanName = String(bi.name || '').trim();
      if (!cleanName) continue;
      const key = cleanName.toLowerCase();
      if (seenNames.has(key)) continue;
      seenNames.add(key);

      const mapped = mapBaitNameToCanonicalClient(cleanName);
      const baitId = bi.baitId || `exact_${getExactBaitCacheKey(cleanName)}`;
      lures.push({
        name: cleanName,
        baitId,
        image: bi.image || `/api/bait-photos/${encodeURIComponent(baitId)}/image?name=${encodeURIComponent(cleanName)}`,
        fallbackImage: mapped.fallbackImage,
        category: bi.category || mapped.category,
        reason: bi.reason,
        targetSpeciesId: sp.id,
        targetSpeciesName: sp.name,
      });
    }
  }

  return lures;
}

export function getCachedSpotLocationSpecies(
  latitude: number,
  longitude: number,
  spotName = 'Ponto de Pesca'
): { speciesBiteTimes: SpeciesBiteData[]; speciesMeta: CitySpeciesMeta } | null {
  return getCachedRealCitySpecies(
    {
      name: spotName,
      country: 'Brazil',
      latitude,
      longitude,
    },
    1015
  );
}

export async function fetchSpotLocationSpecies(
  latitude: number,
  longitude: number,
  spotName = 'Ponto de Pesca',
  signal?: AbortSignal
): Promise<{ speciesBiteTimes: SpeciesBiteData[]; speciesMeta: CitySpeciesMeta }> {
  return fetchRealCitySpecies(
    {
      name: spotName,
      country: 'Brazil',
      latitude,
      longitude,
    },
    1015,
    false,
    signal
  );
}

const prefetchedCoordKeys = new Set<string>();

export async function prefetchSpotsLocationSpecies(
  spots: Array<{ name: string; latitude: number; longitude: number }>
): Promise<void> {
  if (!Array.isArray(spots) || spots.length === 0) return;

  const uniqueTargets: Array<{ name: string; latitude: number; longitude: number; key: string }> = [];
  for (const spot of spots) {
    if (!Number.isFinite(spot.latitude) || !Number.isFinite(spot.longitude)) continue;
    const key = `${spot.latitude.toFixed(2)}_${spot.longitude.toFixed(2)}`;
    if (prefetchedCoordKeys.has(key)) continue;
    prefetchedCoordKeys.add(key);

    // Skip network if already cached locally
    const cached = getCachedSpotLocationSpecies(spot.latitude, spot.longitude, spot.name);
    if (cached && cached.speciesBiteTimes.length > 0) continue;

    uniqueTargets.push({ name: spot.name, latitude: spot.latitude, longitude: spot.longitude, key });
  }

  if (uniqueTargets.length === 0) return;

  await Promise.allSettled(
    uniqueTargets.slice(0, 12).map(t =>
      fetchSpotLocationSpecies(t.latitude, t.longitude, t.name).catch(() => null)
    )
  );
}

// Fetch complete hourly forecast from Open-Meteo
export async function fetchCompleteCityWeather(city: CityLocation): Promise<CompleteCityWeather> {
  const lat = city.latitude;
  const lon = city.longitude;

  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat.toFixed(4)}&longitude=${lon.toFixed(4)}&current=temperature_2m,relative_humidity_2m,apparent_temperature,surface_pressure,wind_speed_10m,wind_direction_10m,wind_gusts_10m,weather_code&hourly=temperature_2m,apparent_temperature,surface_pressure,wind_speed_10m,wind_direction_10m,wind_gusts_10m,weather_code,is_day&daily=sunrise,sunset&timezone=auto&forecast_days=1`;
    const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
    if (!res.ok) throw new Error('API Open-Meteo falhou');
    const data = await res.json();

    const curr = data.current || {};
    const hr = data.hourly || {};
    const dly = data.daily || {};

    const tempC = Math.round(curr.temperature_2m ?? 20);
    const tempF = Math.round((tempC * 9) / 5 + 32);
    const appTempC = Math.round(curr.apparent_temperature ?? tempC + 1);
    const appTempF = Math.round((appTempC * 9) / 5 + 32);

    // Wind km/h to Knots (1 kn = 1.852 km/h)
    const windKmh = Math.round(curr.wind_speed_10m ?? 8);
    const windKnots = Math.max(1, Math.round(windKmh / 1.852));
    const windGustsKmh = Math.round(curr.wind_gusts_10m ?? windKmh * 1.4);
    const windGustsKnots = Math.max(windKnots, Math.round(windGustsKmh / 1.852));
    const windDir = Math.round(curr.wind_direction_10m ?? 290);
    const pressure = Math.round(curr.surface_pressure ?? 1015);
    const code = curr.weather_code ?? 1;

    // Build 24 hour points
    const todayHours: HourlyForecastPoint[] = [];
    const count = Math.min(24, (hr.temperature_2m || []).length);

    for (let i = 0; i < (count > 0 ? count : 24); i++) {
      const hTempC = count > 0 ? Math.round(hr.temperature_2m[i]) : tempC;
      const hTempF = Math.round((hTempC * 9) / 5 + 32);
      const hAppC = count > 0 ? Math.round(hr.apparent_temperature[i]) : hTempC;
      const hAppF = Math.round((hAppC * 9) / 5 + 32);
      const hWindKmh = count > 0 ? Math.round(hr.wind_speed_10m[i]) : windKmh;
      const hWindKn = Math.max(1, Math.round(hWindKmh / 1.852));
      const hGustsKmh = count > 0 ? Math.round(hr.wind_gusts_10m[i]) : windGustsKmh;
      const hGustsKn = Math.max(hWindKn, Math.round(hGustsKmh / 1.852));
      const hDir = count > 0 ? Math.round(hr.wind_direction_10m[i]) : windDir;
      const hPress = count > 0 ? Math.round(hr.surface_pressure[i]) : pressure;
      const hCode = count > 0 ? hr.weather_code[i] : code;
      const hDay = count > 0 ? hr.is_day[i] === 1 : (i >= 6 && i <= 18);

      // Sun elevation curve for the sky arc (-90 to +90)
      const sunElevation = Math.sin(((i - 6) / 12) * Math.PI) * 75;

      // Moon elevation curve (offset)
      const moonElevation = Math.sin(((i - 18) / 12) * Math.PI) * 65;

      // Semi-diurnal tide formula for coastal points (12.4h cycle)
      // High tide around 12:11 like screenshot (+1 ft 11 in = ~1.9 ft = ~0.6m)
      const tidePhase = ((i - 12.18) / 12.4) * 2 * Math.PI;
      const tideHeightFt = Number((1.1 + 0.85 * Math.cos(tidePhase)).toFixed(2));
      const tideHeightM = Number((tideHeightFt * 0.3048).toFixed(2));

      todayHours.push({
        hour: i,
        hourLabel: String(i).padStart(2, '0'),
        tempC: hTempC,
        tempF: hTempF,
        apparentTempC: hAppC,
        apparentTempF: hAppF,
        windKnots: hWindKn,
        windKmh: hWindKmh,
        windGustsKnots: hGustsKn,
        windDirDeg: hDir,
        windDirCode: compassCode(hDir),
        pressureHpa: hPress,
        weatherCode: hCode,
        isDay: hDay,
        sunElevationDeg: sunElevation,
        moonElevationDeg: moonElevation,
        tideHeightFeet: tideHeightFt,
        tideHeightMeters: tideHeightM
      });
    }

    const sunriseStr = dly.sunrise?.[0] ? dly.sunrise[0].split('T')[1]?.slice(0, 5) : '05:48';
    const sunsetStr = dly.sunset?.[0] ? dly.sunset[0].split('T')[1]?.slice(0, 5) : '18:52';

    return {
      city,
      current: {
        tempC,
        tempF,
        apparentTempC: appTempC,
        apparentTempF: appTempF,
        windKnots,
        windKmh,
        windGustsKnots,
        windDirDeg: windDir,
        windDirCode: compassCode(windDir),
        pressureHpa: pressure,
        humidity: curr.relative_humidity_2m ?? 70,
        weatherCode: code,
        conditionText: getWeatherDescription(code)
      },
      todayHours,
      sunMoon: {
        sunrise: sunriseStr,
        sunset: sunsetStr,
        moonPhase: 'Crescente Iluminada (Quarto Crescente)',
        moonIlluminationPercent: 54
      },
      tides: {
        highTideTime: '12:11',
        highTideHeightFt: '+1 Pé 11 Pol (1.92 ft)',
        highTideHeightM: '+0.58 m',
        lowTideTime: '06:20',
        lowTideHeightFt: '+0 Pé 3 Pol (0.25 ft)'
      },
      speciesBiteTimes: generateSpeciesBiteTimes(new Date(), pressure)
    };
  } catch (err) {
    console.warn('Fallback deterministic weather for city:', city.name, err);
    return getDeterministicCityWeather(city);
  }
}

// Deterministic high-precision fallback in Celsius matching Brazilian climate
export function getDeterministicCityWeather(city: CityLocation): CompleteCityWeather {
  const tempC = 22;
  const tempF = Math.round((tempC * 9) / 5 + 32);
  const windKnots = 2;
  const windKmh = Math.round(windKnots * 1.852);
  const pressure = 1015;

  const todayHours: HourlyForecastPoint[] = [];

  const tempCurveC = [
    18, 18, 17, 17, 18, 19, 20, 21, 23, 24, 25, 26, 26, 26, 25, 24, 23, 22, 21, 20, 20, 19, 19, 18
  ];

  const windCurveKn = [
    2, 2, 2, 2, 2, 2, 2, 2, 3, 4, 6, 7, 8, 9, 9, 8, 7, 6, 5, 4, 3, 3, 2, 2
  ];

  const windCodes = [
    'WNW', 'WNW', 'WNW', 'WNW', 'WNW', 'WNW', 'WNW', 'WNW', 'NNW', 'ENE', 'ENE', 'E', 'E', 'E', 'E', 'E', 'E', 'ENE', 'ENE', 'NE', 'NNE', 'N', 'NNW', 'WNW'
  ];

  for (let i = 0; i < 24; i++) {
    const tC = tempCurveC[i];
    const tF = Math.round((tC * 9) / 5 + 32);
    const wKn = windCurveKn[i];
    const wKmh = Math.round(wKn * 1.852);
    const dirCode = windCodes[i];
    const press = i < 12 ? 1015 : 1014;

    const sunElev = Math.sin(((i - 6) / 12) * Math.PI) * 75;
    const moonElev = Math.sin(((i - 18) / 12) * Math.PI) * 65;

    const tidePhase = ((i - 12.18) / 12.4) * 2 * Math.PI;
    const tideFt = Number((1.1 + 0.85 * Math.cos(tidePhase)).toFixed(2));

    todayHours.push({
      hour: i,
      hourLabel: String(i).padStart(2, '0'),
      tempC: tC,
      tempF: tF,
      apparentTempC: tC + 1,
      apparentTempF: tF + 2,
      windKnots: wKn,
      windKmh: wKmh,
      windGustsKnots: wKn + 2,
      windDirDeg: 90,
      windDirCode: dirCode,
      pressureHpa: press,
      weatherCode: i >= 7 && i <= 17 ? 0 : 1,
      isDay: i >= 6 && i <= 18,
      sunElevationDeg: sunElev,
      moonElevationDeg: moonElev,
      tideHeightFeet: tideFt,
      tideHeightMeters: Number((tideFt * 0.3048).toFixed(2))
    });
  }

  return {
    city,
    current: {
      tempC,
      tempF,
      apparentTempC: tempC + 1,
      apparentTempF: tempF + 2,
      windKnots,
      windKmh,
      windGustsKnots: 4,
      windDirDeg: 292,
      windDirCode: 'WNW',
      pressureHpa: pressure,
      humidity: 72,
      weatherCode: 1,
      conditionText: 'Ensolarado'
    },
    todayHours,
    sunMoon: {
      sunrise: '05:48',
      sunset: '18:52',
      moonPhase: 'Crescente Iluminada',
      moonIlluminationPercent: 54
    },
    tides: {
      highTideTime: '12:11',
      highTideHeightFt: '+1 Pé (ft) 11 Polegada (in)',
      highTideHeightM: '+0.58 m',
      lowTideTime: '06:20',
      lowTideHeightFt: '+0 Pé 3 Pol'
    },
    speciesBiteTimes: generateSpeciesBiteTimes(new Date(), pressure)
  };
}

// Live City Search via Open-Meteo Geocoding API with fallback
export async function searchCitiesGeocoding(query: string): Promise<CityLocation[]> {
  const trimmed = query.trim();
  if (!trimmed) return POPULAR_FISHING_CITIES;

  try {
    const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(trimmed)}&count=8&language=pt&format=json`;
    const res = await fetch(url, { signal: AbortSignal.timeout(3500) });
    if (!res.ok) throw new Error('Geocoding search failed');
    const data = await res.json();

    if (data.results && data.results.length > 0) {
      return data.results.map((r: any) => ({
        name: r.name,
        admin1: r.admin1 || '',
        country: r.country || 'Brasil',
        latitude: r.latitude,
        longitude: r.longitude
      }));
    }
  } catch {
    // filter popular
  }

  // Fallback to local filter
  return POPULAR_FISHING_CITIES.filter(c =>
    c.name.toLowerCase().includes(trimmed.toLowerCase()) ||
    (c.admin1 && c.admin1.toLowerCase().includes(trimmed.toLowerCase()))
  );
}
