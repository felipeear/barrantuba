import { and, eq, ne } from 'drizzle-orm';
import { db, withDbRetry } from './index.ts';
import { citySpeciesCacheTable, speciesPhotosTable, spotsTable, speciesBaitGuidesTable, baitPhotosTable } from './schema.ts';
import { buildSpeciesPhotoUrl, loadLocalSpeciesImageDataUrl, matchSpeciesTo3DPngFile } from './queries.ts';
import {
  buildBaitPhotoUrl,
  mapBaitNameToCanonicalId,
  normalizeExactBaitId,
  prewarmSpeciesBaitGuides,
  resolveExactBaitPhotosBatch,
  type ResolvedSpeciesBaitItem,
} from './baitResolver.ts';

export type WaterEnvironment = 'mar_estuario' | 'rio_represa' | 'estuario_rio';

export interface CitySpeciesResolvedItem {
  id: string;
  taxonId: number;
  name: string;
  scientificName: string;
  habitat: string;
  environment: 'mar' | 'estuario' | 'rio';
  observationCount: number;
  image: string;
  isCustomPhoto: boolean;
  feedingPattern: 'diurnal' | 'crepuscular' | 'nocturnal' | 'tidal';
  recommendedLures: string[];
  baitItems?: ResolvedSpeciesBaitItem[];
  baitResearchSummary?: string;
  notes: string;
}

export interface CitySpeciesResponse {
  cityKey: string;
  cityName: string;
  latitude: number;
  longitude: number;
  waterEnvironment: WaterEnvironment;
  environmentLabel: string;
  sourceLabel: string;
  species: CitySpeciesResolvedItem[];
  updatedAt: string;
}

interface FishProfileRule {
  match: RegExp;
  canonicalId?: string;
  ptName: string;
  environment: 'mar' | 'estuario' | 'rio';
  habitat: string;
  sportScore: number;
  feedingPattern: 'diurnal' | 'crepuscular' | 'nocturnal' | 'tidal';
  lures: string[];
  notes: string;
}

// Strict aquarium / pet ornamental species that should NOT appear as wild fishing targets
const AQUARIUM_EXCLUDE_RE =
  /Cyprinus rubrofuscus|Carassius auratus|Poecilia reticulata|Betta splendens|Xiphophorus|Danio rerio|Pterophyllum|Paracheirodon|Symphysodon|Astronotus ocellatus aquarium/i;

// Strictly marine genera/species (excluded when a city is strictly inland freshwater)
const STRICTLY_MARINE_RE =
  /\b(Chilomycterus|Balistes|Aluterus|Abudefduf|Chaetodon|Pomacanthus|Sphoeroides|Diplodus|Chaetodipterus|Hyporthodus|Epinephelus|Anisotremus|Trichiurus|Micropogonias|Genidens|Pomatomus|Lutjanus|Seriola|Scomberomorus|Coryphaena|Caranx|Trachinotus|Cynoscion|Paralichthys|Menticirrhus|Sciaenidae|Haemulon|Mycteroperca|Sparisoma|Acanthurus|Stegastes|Thalassoma|Haemulidae|Opsanus)\b/i;

const BRAZILIAN_FISH_PROFILES: FishProfileRule[] = [
  {
    match: /\bPomatomus saltatrix\b/i,
    canonicalId: 'enxova',
    ptName: 'Enxova',
    environment: 'mar',
    habitat: 'Costões e Canais com Correnteza',
    sportScore: 100,
    feedingPattern: 'tidal',
    lures: ['Colher metálica 40g', 'Jig de penacho 28g', 'Plug de meia-água 110'],
    notes: 'Predador marinho voraz que caça em cardume nas correntes de maré enchente e costeiras.'
  },
  {
    match: /\bCentropomus\b/i,
    canonicalId: 'robalo',
    ptName: 'Robalo Flecha',
    environment: 'estuario',
    habitat: 'Galhadas, Pilares de Pontes e Bocas de Barra',
    sportScore: 100,
    feedingPattern: 'crepuscular',
    lures: ['Camarão Soft no Jig 15g', 'Stick de superfície 90', 'Plug Meia-água 90'],
    notes: 'Caçador de emboscada em estuários, mangues e rios costeiros na virada de maré e aurora.'
  },
  {
    match: /\bCrenicichla\b/i,
    ptName: 'Jacundá / Joana',
    environment: 'rio',
    habitat: 'Margens com Pedras e Galhadas',
    sportScore: 84,
    feedingPattern: 'diurnal',
    lures: ['Micro-jig', 'Spinner pequeno', 'Minhoca'],
    notes: 'Ciclídeo territorial rápido e agressivo muito comum em rios e represas do Sul e Sudeste.'
  },
  {
    match: /\bCichla\b/i,
    canonicalId: 'tucunare',
    ptName: 'Tucunaré Azul',
    environment: 'rio',
    habitat: 'Bicos de Pedra, Troncos Submersos e Represas',
    sportScore: 100,
    feedingPattern: 'diurnal',
    lures: ['Zara Spook 9cm', 'Jig de Pena', 'Spinnerbait 1/2oz'],
    notes: 'Predador visual de águas claras e represas; atividade explode com sol e águas aquecidas.'
  },
  {
    match: /\bSalminus\b/i,
    canonicalId: 'dourado',
    ptName: 'Dourado do Rio',
    environment: 'rio',
    habitat: 'Corredeiras, Gargantas e Saídas de Pedral',
    sportScore: 100,
    feedingPattern: 'diurnal',
    lures: ['Plug Inna 90/110', 'Colher prateada', 'Tuvira no chicote'],
    notes: 'O rei do rio caça nos refluxos de corredeira onde os peixes forrageiros ficam atordoados.'
  },
  {
    match: /Micropogonias furnieri/i,
    canonicalId: 'corvina',
    ptName: 'Corvina',
    environment: 'mar',
    habitat: 'Poções de Fundo, Canais e Baías Costeiras',
    sportScore: 98,
    feedingPattern: 'nocturnal',
    lures: ['Camarão Vivo no Maruseigo', 'Jig Head 21g com Shad', 'Sardinha Fresca'],
    notes: 'Peixe de fundo muito ativo em canais costeiros e praias fundas no entardecer e maré cheia.'
  },
  {
    match: /Hoplias/i,
    ptName: 'Traíra',
    environment: 'rio',
    habitat: 'Lagoas Marginais, Vegetação e Remansos de Rio',
    sportScore: 94,
    feedingPattern: 'crepuscular',
    lures: ['Frog / Sapinho anti-enrosco', 'Spinnerbait', 'Lambari vivo'],
    notes: 'Predadora territorial de emboscada entre aguapés, galhadas e margens rasas.'
  },
  {
    match: /Arapaima gigas/i,
    ptName: 'Pirarucu',
    environment: 'rio',
    habitat: 'Lagos de Várzea e Rios Calmos',
    sportScore: 98,
    feedingPattern: 'diurnal',
    lures: ['Plug grande de meia-água', 'Jig pesado', 'Isca natural de fundo'],
    notes: 'Gigante amazônico que sobe periodicamente para respirar na superfície.'
  },
  {
    match: /Colossoma macropomum/i,
    ptName: 'Tambaqui',
    environment: 'rio',
    habitat: 'Igapós, Rios e Lagos Alagados',
    sportScore: 95,
    feedingPattern: 'diurnal',
    lures: ['Massa especial', 'Frutas da várzea', 'Isca de fundo com bico'],
    notes: 'Peixe de força bruta que procura sementes e frutas caídas na água.'
  },
  {
    match: /Piaractus mesopotamicus|Mylossoma|Myloplus/i,
    ptName: 'Pacu / Caranha',
    environment: 'rio',
    habitat: 'Remansos de Rio com Árvores Frutíferas',
    sportScore: 93,
    feedingPattern: 'diurnal',
    lures: ['Milho cozido', 'Semente / Fruta', 'Bolinha de massa no anzol encastoado'],
    notes: 'Habita margens sombreadas esperando frutos, folhas e pequenos crustáceos.'
  },
  {
    match: /Pseudoplatystoma/i,
    ptName: 'Pintado / Surubim',
    environment: 'rio',
    habitat: 'Canal Principal e Poções Profundos de Rio',
    sportScore: 98,
    feedingPattern: 'nocturnal',
    lures: ['Tuvira viva', 'Mussum', 'Isca de meia-água profunda'],
    notes: 'Grande bagre caçador noturno que patrulha os poços e bocas de corixos.'
  },
  {
    match: /Pygocentrus|Serrasalmus/i,
    ptName: 'Piranha-Vermelha',
    environment: 'rio',
    habitat: 'Corixos, Lagoas e Margens de Rios',
    sportScore: 84,
    feedingPattern: 'diurnal',
    lures: ['Pedaço de carne/peixe no aço', 'Spinner pequeno', 'Lambari'],
    notes: 'Cardumes ativos durante o dia; exige empate de aço flexível.'
  },
  {
    match: /Rhamdia quelen/i,
    ptName: 'Jundiá',
    environment: 'rio',
    habitat: 'Fundo de Rios e Córregos com Pedras',
    sportScore: 86,
    feedingPattern: 'nocturnal',
    lures: ['Minhoca', 'Fígado bovino', 'Lambari no fundo'],
    notes: 'Muito ativo após o pôr do sol e em águas turvas após chuva.'
  },
  {
    match: /Genidens/i,
    ptName: 'Bagre-Marinho',
    environment: 'estuario',
    habitat: 'Canais Estuarinos, Baías e Costões Arenosos',
    sportScore: 82,
    feedingPattern: 'nocturnal',
    lures: ['Camarão morto', 'Lula', 'Sardinha no fundo'],
    notes: 'Comum em águas salobras e praias de canal buscando alimento junto ao fundo.'
  },
  {
    match: /Hyporthodus|Epinephelus|Mycteroperca/i,
    ptName: 'Cherne / Garoupa',
    environment: 'mar',
    habitat: 'Lajes Submersas, Ilhas e Costões Rochosos',
    sportScore: 97,
    feedingPattern: 'tidal',
    lures: ['Jumping Jig 60g', 'Camarão vivo no fundo', 'Peixe inteiro'],
    notes: 'Peixe de toca e estrutura rochosa; ataca iscas trabalhadas próximas às pedras.'
  },
  {
    match: /Mugil/i,
    ptName: 'Tainha',
    environment: 'estuario',
    habitat: 'Estuários, Lagoas Costeiras e Arrebentação',
    sportScore: 88,
    feedingPattern: 'tidal',
    lures: ['Massa de farinha com sardinha', 'Pão amassado no chumbo leve'],
    notes: 'Forma grandes cardumes na entrada das barras e lagoas costeiras.'
  },
  {
    match: /Trichiurus lepturus/i,
    ptName: 'Peixe-Espada',
    environment: 'mar',
    habitat: 'Píeres, Canais Fundos e Baías Iluminadas',
    sportScore: 90,
    feedingPattern: 'nocturnal',
    lures: ['Sardinha com aço', 'Jig metálico luminoso', 'Plug longo prateado'],
    notes: 'Sobe na coluna d’água à noite atraído por pequenos peixes sob luzes costeiras.'
  },
  {
    match: /Diplodus/i,
    ptName: 'Marimbá / Sargo',
    environment: 'mar',
    habitat: 'Costões Rochosos e Quebra-mares',
    sportScore: 83,
    feedingPattern: 'tidal',
    lures: ['Camarão pequeno', 'Corrupto / Tatuí', 'Marisco'],
    notes: 'Alimenta-se junto às pedras batidas pela espuma das ondas.'
  },
  {
    match: /Chaetodipterus faber/i,
    ptName: 'Peixe-Enxada',
    environment: 'mar',
    habitat: 'Lajes, Naufrágios e Pilares Marinhos',
    sportScore: 82,
    feedingPattern: 'diurnal',
    lures: ['Camarão descascado no anzol fino', 'Micro-jig'],
    notes: 'Vive em cardumes sobre estruturas costeiras e costões.'
  },
  {
    match: /Balistes|Aluterus/i,
    ptName: 'Peixe-Porco',
    environment: 'mar',
    habitat: 'Parcéis, Costões e Lajes de Fundo',
    sportScore: 82,
    feedingPattern: 'diurnal',
    lures: ['Camarão duro no anzol pequeno', 'Lula firme'],
    notes: 'Belisca a isca com precisão perto do fundo rochoso.'
  },
  {
    match: /Anisotremus/i,
    ptName: 'Salema / Sargo-de-Beiço',
    environment: 'mar',
    habitat: 'Costões Rochosos e Parcel',
    sportScore: 84,
    feedingPattern: 'diurnal',
    lures: ['Camarão vivo', 'Marisco', 'Lula em tiras'],
    notes: 'Habitante clássico de pedras costeiras do litoral brasileiro.'
  },
  {
    match: /Cynoscion/i,
    ptName: 'Pescada',
    environment: 'mar',
    habitat: 'Canais de Baía e Praias de Fundo Arenoso',
    sportScore: 95,
    feedingPattern: 'crepuscular',
    lures: ['Camarão vivo no fundo', 'Shad soft 9cm', 'Jig Head 14g'],
    notes: 'Cardumes muito produtivos ao amanhecer e na troca de maré.'
  },
  {
    match: /Trachinotus/i,
    ptName: 'Pampo',
    environment: 'mar',
    habitat: 'Praias de Tombo e Arrebentação',
    sportScore: 92,
    feedingPattern: 'tidal',
    lures: ['Tatuí (tatuíra)', 'Corrupto', 'Camarão rosa'],
    notes: 'Excelente brigador de pesca de praia nos canais da arrebentação.'
  },
  {
    match: /Prochilodus lineatus/i,
    ptName: 'Curimbatá',
    environment: 'rio',
    habitat: 'Leito de Rios com Fundo Lodoso e Corredeiras',
    sportScore: 85,
    feedingPattern: 'diurnal',
    lures: ['Massa azeda / soja', 'Chuveirinho leve'],
    notes: 'Espécie nativa migradora fundamental nos rios do Sudeste e Sul.'
  },
  {
    match: /Acestrorhynchus/i,
    ptName: 'Peixe-Cachorro',
    environment: 'rio',
    habitat: 'Rios, Remansos e Braços de Represa',
    sportScore: 87,
    feedingPattern: 'diurnal',
    lures: ['Colher pequena', 'Plug fino de meia-água', 'Lambari'],
    notes: 'Predador veloz de rios das bacias do Paraná e Uruguai.'
  },
  {
    match: /\b(Schizodon|Leporinus|Megaleporinus)\b/i,
    ptName: 'Piava / Piau',
    environment: 'rio',
    habitat: 'Pedrais e Corredeiras de Rio',
    sportScore: 88,
    feedingPattern: 'diurnal',
    lures: ['Milho azedo', 'Caramujo', 'Minhoca no chumbo fino'],
    notes: 'Famoso pela puxada firme perto de pedras e troncos no rio.'
  },
  {
    match: /\bOreochromis niloticus\b/i,
    ptName: 'Tilápia-do-Nilo',
    environment: 'rio',
    habitat: 'Represas, Lagoas e Remansos de Rio',
    sportScore: 85,
    feedingPattern: 'diurnal',
    lures: ['Massa de ração', 'Bichinho da laranja', 'Ultra-light spinner'],
    notes: 'Muito ativa em horas mais quentes do dia próxima às margens.'
  },
  {
    match: /Cyprinus carpio/i,
    ptName: 'Carpa',
    environment: 'rio',
    habitat: 'Lagos, Represas e Rios de Água Lenta',
    sportScore: 86,
    feedingPattern: 'diurnal',
    lures: ['Chuveirinho com massa doce', 'Milho verde', 'Batata cozida'],
    notes: 'Peixe de fundo resistente em águas calmas e represadas.'
  },
  {
    match: /Hypostomus|Hemiancistrus|Loricariidae/i,
    ptName: 'Cascudo',
    environment: 'rio',
    habitat: 'Fundo Pedregoso e Lajes de Rio',
    sportScore: 76,
    feedingPattern: 'nocturnal',
    lures: ['Massa no fundo', 'Pedaço de abóbora / batata'],
    notes: 'Peixe de couro e placas ósseas que vive aderido a pedras na correnteza.'
  },
  {
    match: /Astyanax|Psalidodon/i,
    ptName: 'Lambari',
    environment: 'rio',
    habitat: 'Margens de Rios, Riachos e Represas',
    sportScore: 78,
    feedingPattern: 'diurnal',
    lures: ['Bicho da laranja no anzol mosquito', 'Massinha leve', 'Micro-fly'],
    notes: 'Abundante em águas limpas e excelente peixe-isca natural para predadores.'
  },
  {
    match: /Geophagus/i,
    ptName: 'Cará / Acará',
    environment: 'rio',
    habitat: 'Lagoas, Estuários Calmos e Margens Arenosas',
    sportScore: 77,
    feedingPattern: 'diurnal',
    lures: ['Minhoca pequena', 'Massa leve', 'Micro-isca'],
    notes: 'Frequente em águas calmas e rasas de rios e lagoas costeiras.'
  },
  {
    match: /Osteoglossum bicirrhosum/i,
    ptName: 'Aruanã',
    environment: 'rio',
    habitat: 'Igapós e Lagos Amazônicos',
    sportScore: 93,
    feedingPattern: 'diurnal',
    lures: ['Popper / Zara de superfície', 'Mosca grande (Fly)'],
    notes: 'Predador de superfície conhecido por saltos acrobáticos espetaculares.'
  },
  {
    match: /Chilomycterus|Sphoeroides/i,
    ptName: 'Baiacu',
    environment: 'mar',
    habitat: 'Canais Costeiros, Mangues e Fundos Rasos',
    sportScore: 45,
    feedingPattern: 'diurnal',
    lures: ['Camarão no fundo (Cuidado: espécie venenosa)'],
    notes: 'Muito registrado na costa; manusear com cuidado e devolver à água (espécie tóxica).'
  },
  {
    match: /Abudefduf/i,
    ptName: 'Castanheta-das-Rochas',
    environment: 'mar',
    habitat: 'Poças de Maré e Costões Rochosos',
    sportScore: 40,
    feedingPattern: 'diurnal',
    lures: ['Pequenos crustáceos e algas (peixe ornamental de costão)'],
    notes: 'Espécie costeira comum em rochas e mergulho de superfície.'
  }
];

function slugifySpeciesId(scientificName: string): string {
  return scientificName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');
}

function getDefaultLuresForEnv(env: 'mar' | 'estuario' | 'rio'): string[] {
  if (env === 'mar') return ['Camarão no Jig Head', 'Jig metálico', 'Sardinha fresca'];
  if (env === 'estuario') return ['Camarão Soft 9cm', 'Plug meia-água', 'Camarão vivo'];
  return ['Lambari / Tuvira', 'Minhoca / Massa no fundo', 'Plug pequeno meia-água'];
}

function getDefaultHabitatForEnv(env: 'mar' | 'estuario' | 'rio'): string {
  if (env === 'mar') return 'Costões, Praias e Canais Marinhos';
  if (env === 'estuario') return 'Estuários, Mangues e Bocas de Barra';
  return 'Rios, Corredeiras e Represas Locais';
}

async function fetchImageAsDataUrl(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
    if (!res.ok) return null;
    const contentType = res.headers.get('content-type') || 'image/jpeg';
    if (!contentType.startsWith('image/')) return null;
    const arrayBuf = await res.arrayBuffer();
    if (arrayBuf.byteLength < 1000) return null;
    const base64 = Buffer.from(arrayBuf).toString('base64');
    return `data:${contentType.split(';')[0]};base64,${base64}`;
  } catch {
    return null;
  }
}

async function upgradeExternalPhotoToBase64(speciesId: string, externalUrl: string) {
  try {
    const dataUrl = await fetchImageAsDataUrl(externalUrl);
    if (!dataUrl) return;
    await db
      .update(speciesPhotosTable)
      .set({
        imageData: dataUrl,
        defaultImageData: dataUrl,
      })
      .where(and(eq(speciesPhotosTable.speciesId, speciesId), ne(speciesPhotosTable.isCustom, 'true')));
  } catch {
    // non-fatal background upgrade
  }
}

async function fetchInatObservations(lat: number, lon: number, radiusKm: number): Promise<any[]> {
  const url = `https://api.inaturalist.org/v1/observations/species_counts?taxon_id=47178&lat=${lat.toFixed(4)}&lng=${lon.toFixed(4)}&radius=${radiusKm}&locale=pt-BR&per_page=35`;
  const res = await fetch(url, { signal: AbortSignal.timeout(7000) });
  if (!res.ok) throw new Error(`iNaturalist retornou HTTP ${res.status}`);
  const data = await res.json();
  return Array.isArray(data?.results) ? data.results : [];
}

async function detectCoastalWaveHeight(lat: number, lon: number): Promise<number | null> {
  try {
    const url = `https://marine-api.open-meteo.com/v1/marine?latitude=${lat.toFixed(4)}&longitude=${lon.toFixed(4)}&current=wave_height`;
    const res = await fetch(url, { signal: AbortSignal.timeout(4500) });
    if (!res.ok) return null;
    const data = await res.json();
    return typeof data?.current?.wave_height === 'number' ? data.current.wave_height : null;
  } catch {
    return null;
  }
}

async function detectCityElevation(lat: number, lon: number): Promise<number | null> {
  try {
    const url = `https://api.open-meteo.com/v1/elevation?latitude=${lat.toFixed(4)}&longitude=${lon.toFixed(4)}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(4500) });
    if (!res.ok) return null;
    const data = await res.json();
    return Array.isArray(data?.elevation) && typeof data.elevation[0] === 'number' ? data.elevation[0] : null;
  } catch {
    return null;
  }
}

export async function resolveCitySpeciesOnline(params: {
  cityName: string;
  latitude: number;
  longitude: number;
  forceRefresh?: boolean;
}): Promise<CitySpeciesResponse> {
  const { cityName, latitude, longitude, forceRefresh = false } = params;
  const cityKey = `${latitude.toFixed(2)}_${longitude.toFixed(2)}`;

  // 1. Check PostgreSQL cache (within 24h) unless forced refresh — zero heavy image blob transfers!
  if (!forceRefresh) {
    try {
      const [cachedRows, photoMetaRows, baitGuideRows, baitPhotoMetaRows] = await Promise.all([
        db
          .select()
          .from(citySpeciesCacheTable)
          .where(eq(citySpeciesCacheTable.cityKey, cityKey)),
        db
          .select({
            speciesId: speciesPhotosTable.speciesId,
            isCustom: speciesPhotosTable.isCustom,
            updatedAt: speciesPhotosTable.updatedAt,
          })
          .from(speciesPhotosTable),
        db
          .select({
            speciesId: speciesBaitGuidesTable.speciesId,
            baitsData: speciesBaitGuidesTable.baitsData,
            researchSummary: speciesBaitGuidesTable.researchSummary,
            updatedAt: speciesBaitGuidesTable.updatedAt,
          })
          .from(speciesBaitGuidesTable),
        db
          .select({
            baitId: baitPhotosTable.baitId,
            updatedAt: baitPhotosTable.updatedAt,
          })
          .from(baitPhotosTable),
      ]);

      if (cachedRows.length > 0) {
        const cached = cachedRows[0];
        const ageMs = Date.now() - new Date(cached.updatedAt).getTime();
        const cachedList = Array.isArray(cached.speciesData) ? (cached.speciesData as CitySpeciesResolvedItem[]) : [];

        if (!Number.isNaN(ageMs) && ageMs < 24 * 3600 * 1000 && cachedList.length > 0) {
          const photoMetaMap = new Map(photoMetaRows.map(p => [p.speciesId, p]));
          const baitGuideMap = new Map(baitGuideRows.map(b => [b.speciesId, b]));
          const baitPhotoVersionMap = new Map(baitPhotoMetaRows.map(bp => [bp.baitId, bp.updatedAt]));

          const hydrated = cachedList.map(sp => {
            const pMeta = photoMetaMap.get(sp.id);
            const version = pMeta?.updatedAt || cached.updatedAt;
            const bGuide = baitGuideMap.get(sp.id);

            let baitItems: ResolvedSpeciesBaitItem[];
            if (bGuide && Array.isArray(bGuide.baitsData) && bGuide.baitsData.length > 0) {
              baitItems = (bGuide.baitsData as ResolvedSpeciesBaitItem[]).map(bi => {
                const mapped = mapBaitNameToCanonicalId(bi.name);
                const exactId = normalizeExactBaitId(bi.name);
                const baitVer = baitPhotoVersionMap.get(exactId) || bGuide.updatedAt;
                return {
                  ...bi,
                  baitId: exactId,
                  category: bi.category || mapped.category,
                  image: buildBaitPhotoUrl(exactId, baitVer, bi.name),
                };
              });
            } else {
              baitItems = (sp.recommendedLures || []).map(lureName => {
                const mapped = mapBaitNameToCanonicalId(lureName);
                const exactId = normalizeExactBaitId(lureName);
                const baitVer = baitPhotoVersionMap.get(exactId) || cached.updatedAt;
                return {
                  name: lureName,
                  baitId: exactId,
                  category: mapped.category,
                  image: buildBaitPhotoUrl(exactId, baitVer, lureName),
                  reason: `Indicada para ${sp.name}`,
                };
              });
            }

            return {
              ...sp,
              image: buildSpeciesPhotoUrl(sp.id, version),
              isCustomPhoto: pMeta ? pMeta.isCustom === 'true' : Boolean(sp.isCustomPhoto),
              recommendedLures: baitItems.map(b => b.name),
              baitItems,
              baitResearchSummary: bGuide?.researchSummary || sp.baitResearchSummary,
            };
          });

          // Ensure any missing species bait guides & exact bait photos get persisted in PostgreSQL asynchronously
          const missingGuides = hydrated.filter(h => !baitGuideMap.has(h.id));
          if (missingGuides.length > 0) {
            void prewarmSpeciesBaitGuides(missingGuides);
          } else {
            const allLures = hydrated.flatMap(h => h.recommendedLures || []);
            if (allLures.length > 0) {
              void resolveExactBaitPhotosBatch(allLures);
            }
          }

          const env = cached.waterEnvironment as WaterEnvironment;
          return {
            cityKey,
            cityName: cached.cityName,
            latitude: cached.latitude,
            longitude: cached.longitude,
            waterEnvironment: env,
            environmentLabel:
              env === 'mar_estuario'
                ? 'Mar & Costeira / Estuário'
                : env === 'estuario_rio'
                ? 'Rio & Estuário Costeiro'
                : 'Rio & Represa (Água Doce)',
            sourceLabel: cached.sourceLabel,
            species: hydrated,
            updatedAt: cached.updatedAt,
          };
        }
      }
    } catch (err) {
      console.warn('city_species_cache read fallback:', err);
    }
  }

  // 2. Live online check: Wave/Elevation + Local iNaturalist species observations in parallel
  const [waveHeight, elevation, rawTight] = await Promise.all([
    detectCoastalWaveHeight(latitude, longitude),
    detectCityElevation(latitude, longitude),
    fetchInatObservations(latitude, longitude, 18).catch(() => []),
  ]);

  const countSportRecognized = (list: any[]) =>
    list.filter((r: any) => BRAZILIAN_FISH_PROFILES.some(p => p.match.test(r?.taxon?.name || ''))).length;

  let rawObs = rawTight;
  let usedRadius = 18;

  if (rawObs.length < 6 || countSportRecognized(rawObs) < 4) {
    usedRadius = 60;
    const expanded = await fetchInatObservations(latitude, longitude, 60).catch(() => []);
    if (expanded.length > rawObs.length) rawObs = expanded;
  }

  // Determine whether the city itself is inland freshwater vs coastal sea
  const hasMarineGrid = waveHeight !== null;
  const isHighElevation = elevation !== null && elevation > 30;
  const tightMarineCount = rawTight.filter((r: any) => STRICTLY_MARINE_RE.test(r?.taxon?.name || '')).length;
  const tightFreshCount = rawTight.filter(
    (r: any) =>
      r?.taxon?.name &&
      !STRICTLY_MARINE_RE.test(r.taxon.name) &&
      !AQUARIUM_EXCLUDE_RE.test(r.taxon.name)
  ).length;

  let waterEnvironment: WaterEnvironment = 'rio_represa';
  if (hasMarineGrid && !isHighElevation) {
    if (tightMarineCount >= 2) {
      waterEnvironment = 'mar_estuario';
    } else if (tightFreshCount >= 2) {
      waterEnvironment = 'estuario_rio';
    } else {
      waterEnvironment = 'mar_estuario';
    }
  }

  // 3. Transform raw online observations -> filtered, deduplicated, Portuguese-enriched fishing species
  const seenIds = new Set<string>();
  const seenNames = new Set<string>();
  const candidates: Array<{
    id: string;
    taxonId: number;
    name: string;
    scientificName: string;
    habitat: string;
    environment: 'mar' | 'estuario' | 'rio';
    observationCount: number;
    externalPhotoUrl: string | null;
    score: number;
    feedingPattern: 'diurnal' | 'crepuscular' | 'nocturnal' | 'tidal';
    recommendedLures: string[];
    notes: string;
  }> = [];

  for (const row of rawObs) {
    const taxon = row?.taxon;
    if (!taxon?.name) continue;
    const sciName = String(taxon.name);
    if (AQUARIUM_EXCLUDE_RE.test(sciName)) continue;

    // Exclude strictly ocean reef/pelagic fish when city is strictly inland freshwater
    const isStrictlyMarine = STRICTLY_MARINE_RE.test(sciName);
    if (waterEnvironment === 'rio_represa' && isStrictlyMarine) continue;

    // Prefer actual species (or named genera with photo) that have a real photo
    const photoUrl: string | null = taxon.default_photo?.medium_url || taxon.default_photo?.url || null;
    if (!photoUrl) continue;

    const rule = BRAZILIAN_FISH_PROFILES.find(p => p.match.test(sciName));
    if (!rule && taxon.rank !== 'species') continue;

    const id = rule?.canonicalId || slugifySpeciesId(sciName);
    if (seenIds.has(id)) continue;

    const ptNameRaw = rule?.ptName || taxon.preferred_common_name || sciName;
    const formattedName =
      ptNameRaw.charAt(0).toUpperCase() + ptNameRaw.slice(1);
    const normalizedNameKey = formattedName.toLowerCase();
    if (seenNames.has(normalizedNameKey)) continue;

    seenIds.add(id);
    seenNames.add(normalizedNameKey);

    const env: 'mar' | 'estuario' | 'rio' =
      rule?.environment ||
      (isStrictlyMarine ? 'mar' : waterEnvironment === 'mar_estuario' ? 'estuario' : 'rio');

    const baseSportScore = rule?.sportScore ?? (taxon.preferred_common_name ? 68 : 52);
    const countBoost = Math.min(20, Number(row.count || 1) * 2);

    candidates.push({
      id,
      taxonId: Number(taxon.id || 0),
      name: formattedName,
      scientificName: sciName,
      habitat: rule?.habitat || getDefaultHabitatForEnv(env),
      environment: env,
      observationCount: Number(row.count || 1),
      externalPhotoUrl: photoUrl,
      score: baseSportScore + countBoost,
      feedingPattern: rule?.feedingPattern || (env === 'mar' ? 'tidal' : 'diurnal'),
      recommendedLures: rule?.lures || getDefaultLuresForEnv(env),
      notes:
        rule?.notes ||
        `Espécie real registrada na região de ${cityName} (${row.count || 1} ocorrências observadas).`,
    });
  }

  // Sort by fishing relevance + real observations, pick top 8 real species for the city
  candidates.sort((a, b) => b.score - a.score);
  const selected = candidates.slice(0, 8);

  // 4. Register any brand-new species photo rows immediately in PostgreSQL without blocking on S3 downloads,
  // and return ultra-fast /api/species-photos/:id/image URLs while base64 caching runs asynchronously in background.
  const nowIso = new Date().toISOString();
  const existingPhotoRows = await db
    .select({
      speciesId: speciesPhotosTable.speciesId,
      isCustom: speciesPhotosTable.isCustom,
      updatedAt: speciesPhotosTable.updatedAt,
    })
    .from(speciesPhotosTable);
  const existingPhotoMap = new Map(existingPhotoRows.map(r => [r.speciesId, r]));

  const resolvedSpecies: CitySpeciesResolvedItem[] = await Promise.all(
    selected.map(async c => {
      const existing = existingPhotoMap.get(c.id);
      let version = existing?.updatedAt || nowIso;
      const isCustom = existing?.isCustom === 'true';

      if (!existing) {
        const pngFile = matchSpeciesTo3DPngFile(c.id, c.name);
        const local3DPng = pngFile ? loadLocalSpeciesImageDataUrl(pngFile) : null;
        const initialData = local3DPng || c.externalPhotoUrl;
        if (initialData) {
          await withDbRetry(
            () =>
              db
                .insert(speciesPhotosTable)
                .values({
                  speciesId: c.id,
                  speciesName: c.name,
                  imageData: initialData,
                  defaultImageData: initialData,
                  isCustom: 'false',
                  updatedAt: nowIso,
                })
                .onConflictDoNothing({ target: speciesPhotosTable.speciesId }),
            `insertSpeciesPhoto:${c.id}`
          );

          if (!local3DPng && c.externalPhotoUrl) {
            // Upgrade remote URL -> base64 data URL in PostgreSQL asynchronously
            void upgradeExternalPhotoToBase64(c.id, c.externalPhotoUrl);
          }
        }
      }

      const baitItems: ResolvedSpeciesBaitItem[] = c.recommendedLures.map(lureName => {
        const mapped = mapBaitNameToCanonicalId(lureName);
        const exactId = normalizeExactBaitId(lureName);
        return {
          name: lureName,
          baitId: exactId,
          category: mapped.category,
          image: buildBaitPhotoUrl(exactId, nowIso, lureName),
          reason: `Indicada para ${c.name}`,
        };
      });

      return {
        id: c.id,
        taxonId: c.taxonId,
        name: c.name,
        scientificName: c.scientificName,
        habitat: c.habitat,
        environment: c.environment,
        observationCount: c.observationCount,
        image: buildSpeciesPhotoUrl(c.id, version),
        isCustomPhoto: isCustom,
        feedingPattern: c.feedingPattern,
        recommendedLures: c.recommendedLures,
        baitItems,
        notes: c.notes,
      };
    })
  );

  // Trigger background online diet research & PostgreSQL persistence for all resolved species
  if (resolvedSpecies.length > 0) {
    void prewarmSpeciesBaitGuides(resolvedSpecies);
  }

  const sourceLabel = `Identificado on-line via iNaturalist + Open-Meteo Marine (raio ${usedRadius} km)`;
  const environmentLabel =
    waterEnvironment === 'mar_estuario'
      ? 'Mar & Costeira / Estuário'
      : waterEnvironment === 'estuario_rio'
      ? 'Rio & Estuário Costeiro'
      : 'Rio & Represa (Água Doce)';

  // 5. Save lightweight resolved city species list in PostgreSQL (city_species_cache)
  if (resolvedSpecies.length > 0) {
    try {
      await withDbRetry(
        () =>
          db
            .insert(citySpeciesCacheTable)
            .values({
              cityKey,
              cityName,
              latitude,
              longitude,
              waterEnvironment,
              speciesData: resolvedSpecies,
              sourceLabel,
              updatedAt: nowIso,
            })
            .onConflictDoUpdate({
              target: citySpeciesCacheTable.cityKey,
              set: {
                cityName,
                latitude,
                longitude,
                waterEnvironment,
                speciesData: resolvedSpecies,
                sourceLabel,
                updatedAt: nowIso,
              },
            }),
        `saveCitySpeciesCache:${cityKey}`
      );
    } catch (err) {
      console.warn('Falha ao gravar city_species_cache:', err);
    }
  } else {
    // Fallback to any previously cached entry in PostgreSQL even if older than 24h
    try {
      const staleRows = await withDbRetry(
        () => db.select().from(citySpeciesCacheTable).where(eq(citySpeciesCacheTable.cityKey, cityKey)),
        `staleCityCache:${cityKey}`
      );
      if (staleRows.length > 0 && Array.isArray(staleRows[0].speciesData) && (staleRows[0].speciesData as any[]).length > 0) {
        const stale = staleRows[0];
        const env = stale.waterEnvironment as WaterEnvironment;
        return {
          cityKey,
          cityName: stale.cityName,
          latitude: stale.latitude,
          longitude: stale.longitude,
          waterEnvironment: env,
          environmentLabel:
            env === 'mar_estuario'
              ? 'Mar & Costeira / Estuário'
              : env === 'estuario_rio'
              ? 'Rio & Estuário Costeiro'
              : 'Rio & Represa (Água Doce)',
          sourceLabel: stale.sourceLabel,
          species: stale.speciesData as CitySpeciesResolvedItem[],
          updatedAt: stale.updatedAt,
        };
      }
    } catch {}
  }

  return {
    cityKey,
    cityName,
    latitude,
    longitude,
    waterEnvironment,
    environmentLabel,
    sourceLabel,
    species: resolvedSpecies,
    updatedAt: nowIso,
  };
}

const POPULAR_PREWARM_CITIES = [
  { cityName: 'Laguna', latitude: -28.4819, longitude: -48.7808 },
  { cityName: 'Tubarão', latitude: -28.4717, longitude: -49.0069 },
  { cityName: 'Florianópolis', latitude: -27.5954, longitude: -48.5480 },
  { cityName: 'Imbituba', latitude: -28.2400, longitude: -48.6703 },
  { cityName: 'Balneário Camboriú', latitude: -26.9926, longitude: -48.6353 },
  { cityName: 'Itajaí', latitude: -26.9078, longitude: -48.6619 },
  { cityName: 'Cananéia', latitude: -25.0147, longitude: -47.9267 },
  { cityName: 'Santos', latitude: -23.9608, longitude: -46.3336 },
  { cityName: 'Ubatuba', latitude: -23.4332, longitude: -45.0834 },
  { cityName: 'Paranaguá', latitude: -25.5205, longitude: -48.5092 },
  { cityName: 'Piracicaba', latitude: -22.7253, longitude: -47.6492 },
  { cityName: 'Presidente Epitácio', latitude: -21.7633, longitude: -52.1156 },
  { cityName: 'Corumbá', latitude: -19.0089, longitude: -57.6533 },
  { cityName: 'Manaus', latitude: -3.1190, longitude: -60.0217 },
];

export async function prewarmPopularCities() {
  try {
    for (const c of POPULAR_PREWARM_CITIES) {
      await resolveCitySpeciesOnline({
        cityName: c.cityName,
        latitude: c.latitude,
        longitude: c.longitude,
        forceRefresh: false,
      }).catch(() => {});
    }

    // Also pre-warm all registered fishing spots in PostgreSQL so opening "Ver Detalhes" is instant
    const spotRows = await db
      .select({
        name: spotsTable.name,
        latitude: spotsTable.latitude,
        longitude: spotsTable.longitude,
      })
      .from(spotsTable)
      .catch(() => []);

    for (const s of spotRows) {
      if (Number.isFinite(s.latitude) && Number.isFinite(s.longitude)) {
        await resolveCitySpeciesOnline({
          cityName: s.name || 'Ponto de Pesca',
          latitude: Number(s.latitude),
          longitude: Number(s.longitude),
          forceRefresh: false,
        }).catch(() => {});
      }
    }
  } catch (err) {
    console.warn('Prewarm popular cities background notice:', err);
  }
}

