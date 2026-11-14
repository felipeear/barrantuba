import fs from 'fs';
import path from 'path';
import { eq, inArray, sql } from 'drizzle-orm';
import { db, withDbRetry } from './index.ts';
import { baitPhotosTable, speciesBaitGuidesTable } from './schema.ts';

export interface BaitSeedItem {
  baitId: string;
  baitName: string;
  category: string;
  file: string;
}

export interface ResolvedSpeciesBaitItem {
  name: string;
  baitId: string;
  image: string;
  category: string;
  reason: string;
}

export interface SpeciesBaitGuideResponse {
  speciesId: string;
  speciesName: string;
  scientificName: string;
  baits: ResolvedSpeciesBaitItem[];
  researchSummary: string;
  sourceLabel: string;
  updatedAt: string;
}

export const BAIT_SEED_CATALOG: BaitSeedItem[] = [
  {
    baitId: 'zara_topwater',
    baitName: 'Isca de Superfície (Zara / Stick)',
    category: 'Superfície',
    file: 'lure_zara_topwater_3d.png',
  },
  {
    baitId: 'popper',
    baitName: 'Popper de Superfície',
    category: 'Superfície',
    file: 'bait_popper_3d.png',
  },
  {
    baitId: 'plug_minnow',
    baitName: 'Plug Meia-água / Barbela',
    category: 'Meia-Água',
    file: 'lure_plug_minnow_3d.png',
  },
  {
    baitId: 'camarao_soft',
    baitName: 'Camarão Soft / Jig Head',
    category: 'Crustáceo & Soft',
    file: 'lure_soft_shrimp_3d.png',
  },
  {
    baitId: 'camarao_vivo',
    baitName: 'Camarão Vivo / Rosa',
    category: 'Crustáceo Natural',
    file: 'bait_camarao_vivo_3d.png',
  },
  {
    baitId: 'spinnerbait',
    baitName: 'Spinnerbait',
    category: 'Vibratória & Anti-enrosco',
    file: 'bait_spinnerbait_3d.png',
  },
  {
    baitId: 'jig_pena',
    baitName: 'Jig de Pena / Penacho',
    category: 'Jig & Fly',
    file: 'bait_jig_pena_3d.png',
  },
  {
    baitId: 'colher_metal_jig',
    baitName: 'Jig Head / Jumping Jig / Spinner',
    category: 'Jig & Metal',
    file: 'lure_metal_jig_3d.png',
  },
  {
    baitId: 'colher_prateada',
    baitName: 'Colher Prateada / Metálica',
    category: 'Metal & Brilho',
    file: 'bait_colher_3d.png',
  },
  {
    baitId: 'frog_sapinho',
    baitName: 'Frog / Sapinho Anti-enrosco',
    category: 'Superfície Anti-enrosco',
    file: 'lure_frog_bait_3d.png',
  },
  {
    baitId: 'massa_racao',
    baitName: 'Massa de Pesca / Ração',
    category: 'Massa & Ração',
    file: 'bait_massa_racao_3d.png',
  },
  {
    baitId: 'pao_pesca',
    baitName: 'Pão / Chuveirinho',
    category: 'Massa & Pão',
    file: 'bait_pao_3d.png',
  },
  {
    baitId: 'bichinho_laranja',
    baitName: 'Bichinho da Laranja / Larvas',
    category: 'Larva Natural',
    file: 'bait_larva_bichinho_3d.png',
  },
  {
    baitId: 'minhoca',
    baitName: 'Minhoca / Anelídeo',
    category: 'Isca Natural de Fundo',
    file: 'bait_minhoca_worm_3d.png',
  },
  {
    baitId: 'milho_verde',
    baitName: 'Milho / Sementes / Frutas',
    category: 'Grão & Fruto',
    file: 'bait_milho_corn_3d.png',
  },
  {
    baitId: 'sardinha_fresca',
    baitName: 'Sardinha Fresca',
    category: 'Peixe-Isca Marinho',
    file: 'bait_sardinha_3d.png',
  },
  {
    baitId: 'lambari_sardinha',
    baitName: 'Peixe-isca (Lambari / Tuvira)',
    category: 'Peixe-Isca Natural',
    file: 'bait_lambari_sardinha_3d.png',
  },
];

export function matchBaitNameTo3DPngFile(baitName: string): string {
  const n = String(baitName || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

  if (/spinnerbait/.test(n)) return 'bait_spinnerbait_3d.png';
  if (/frog|sapinho/.test(n)) return 'lure_frog_bait_3d.png';
  if (/camarao/.test(n) && /soft|artificial/.test(n) && !/vivo|viva/.test(n)) return 'lure_soft_shrimp_3d.png';
  if (/camarao|crustaceo|tatui|corrupto|caramujo|marisco|caranguejo|siri|lula|polvo/.test(n)) return 'bait_camarao_vivo_3d.png';
  if (/bichinho|bicho\s+da\s+laranja|larva|tenebrio|gafanhoto|grilo/.test(n)) return 'bait_larva_bichinho_3d.png';
  if (/minhoc(a|ao|uinha|ucu)|mussum|verme/.test(n)) return 'bait_minhoca_worm_3d.png';
  if (/\bpao\b/.test(n)) return 'bait_pao_3d.png';
  if (/mass(a|inha)|racao|pellet|chuveirinho|farinha|boilie|queijo/.test(n)) return 'bait_massa_racao_3d.png';
  if (/milho|fruta|fruto|semente|batata|abobora|banana/.test(n)) return 'bait_milho_corn_3d.png';
  if (/sardinha/.test(n)) return 'bait_sardinha_3d.png';
  if (/lambari|tuvira|peixe\s*(inteiro|-?isca)|manjuba|carne|figado|sarapo/.test(n)) return 'bait_lambari_sardinha_3d.png';
  if (/popper/.test(n)) return 'bait_popper_3d.png';
  if (/zara|stick|firestick|superficie|helice/.test(n)) return 'lure_zara_topwater_3d.png';
  if (/colher|spoon/.test(n)) return 'bait_colher_3d.png';
  if (/jig.*(pena|penacho|bucktail)|mosca|\bfly\b/.test(n)) return 'bait_jig_pena_3d.png';
  if (/jumping\s*jig|jig\s*metal|micro-?jig|jig\b|spinner/.test(n)) return 'lure_metal_jig_3d.png';
  if (/plug|meia-?agua|inna|brava|crank|twitch|minnow|barbela|micro-?isca|shad|swimbait/.test(n)) return 'lure_plug_minnow_3d.png';

  return 'lure_plug_minnow_3d.png';
}

export function buildBaitPhotoUrl(
  baitId: string,
  updatedAt?: string,
  baitName?: string
): string {
  const params = new URLSearchParams();
  if (updatedAt) params.set('v', updatedAt);
  if (baitName && baitId.startsWith('exact_')) params.set('name', baitName);
  const qs = params.toString();
  return `/api/bait-photos/${encodeURIComponent(baitId)}/image${qs ? `?${qs}` : ''}`;
}

export function normalizeExactBaitId(baitName: string): string {
  const slug = String(baitName || 'isca')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 72);
  return `exact_${slug || 'isca'}`;
}

export function mapBaitNameToCanonicalId(baitName: string): {
  baitId: string;
  category: string;
} {
  const n = String(baitName || '').toLowerCase();

  // Order matters: check natural/organic & specific lures before generic fallbacks
  if (/spinnerbait/.test(n)) {
    return { baitId: 'spinnerbait', category: 'Vibratória & Anti-enrosco' };
  }
  if (/bichinho|bicho\s+da\s+laranja|larva|ten[eé]brio/.test(n)) {
    return { baitId: 'bichinho_laranja', category: 'Larva Natural' };
  }
  if (/minhoc(a|[aã]o|uinha)|mussum|verme/.test(n)) {
    return { baitId: 'minhoca', category: 'Isca Natural de Fundo' };
  }
  if (/\bp[aã]o\b/.test(n)) {
    return { baitId: 'pao_pesca', category: 'Massa & Pão' };
  }
  if (/mass(a|inha)|ra[cç][aã]o|chuveirinho|farinha/.test(n)) {
    return { baitId: 'massa_racao', category: 'Massa & Ração' };
  }
  if (/milho|fruta|semente|batata|ab[oó]bora/.test(n)) {
    return { baitId: 'milho_verde', category: 'Grão & Fruto' };
  }
  if (/frog|sapinho/.test(n)) {
    return { baitId: 'frog_sapinho', category: 'Superfície Anti-enrosco' };
  }
  if (/sardinha/.test(n)) {
    return { baitId: 'sardinha_fresca', category: 'Peixe-Isca Marinho' };
  }
  if (/lambari|tuvira|peixe inteiro|carne|f[ií]gado|peixe-isca|manjuba/.test(n)) {
    return { baitId: 'lambari_sardinha', category: 'Peixe-Isca Natural' };
  }
  if (/camar[aã]o/.test(n) && /soft|artificial/.test(n) && !/vivo|viva/.test(n)) {
    return { baitId: 'camarao_soft', category: 'Crustáceo & Soft' };
  }
  if (/camar[aã]o|shad|lula|marisco|tatu[ií]|corrupto|caramujo/.test(n)) {
    return { baitId: 'camarao_vivo', category: 'Crustáceo Natural' };
  }
  if (/popper/.test(n)) {
    return { baitId: 'popper', category: 'Superfície' };
  }
  if (/zara|stick|superf[ií]cie|firestick|h[eé]lice/.test(n)) {
    return { baitId: 'zara_topwater', category: 'Superfície' };
  }
  if (/colher|spoon/.test(n)) {
    return { baitId: 'colher_prateada', category: 'Metal & Brilho' };
  }
  if (/jig.*(pena|penacho)|mosca|fly/.test(n)) {
    return { baitId: 'jig_pena', category: 'Jig & Fly' };
  }
  if (/jumping|met[aá]lic|spinner|micro-jig|jig\b/.test(n)) {
    return { baitId: 'colher_metal_jig', category: 'Jig & Metal' };
  }
  if (/plug|meia-[aá]gua|inna|brava|crank|twitch|minnow|barbela|micro-isca/.test(n)) {
    return { baitId: 'plug_minnow', category: 'Meia-Água' };
  }

  return { baitId: 'plug_minnow', category: 'Artificial Versátil' };
}

const localBaitDataUrlCache = new Map<string, string>();

function loadLocalBaitImageDataUrl(filename: string): string | null {
  const cached = localBaitDataUrlCache.get(filename);
  if (cached) return cached;
  try {
    const filePath = path.resolve(process.cwd(), 'src', 'assets', 'images', filename);
    if (!fs.existsSync(filePath)) return null;
    const buffer = fs.readFileSync(filePath);
    const mime = filename.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg';
    const dataUrl = `data:${mime};base64,${buffer.toString('base64')}`;
    localBaitDataUrlCache.set(filename, dataUrl);
    return dataUrl;
  } catch (err) {
    console.warn(`Could not read bait seed image ${filename}:`, err);
    return null;
  }
}

function decodeDataUrlToBinary(dataUrl: string): { contentType: string; buffer: Buffer } | null {
  const match = /^data:(image\/[a-zA-Z0-9+.-]+);base64,(.+)$/.exec(dataUrl);
  if (!match) return null;
  return {
    contentType: match[1],
    buffer: Buffer.from(match[2], 'base64'),
  };
}

export async function ensureBaitPhotosSeeded() {
  try {
    const existingRows = await withDbRetry(
      () =>
        db
          .select({
            baitId: baitPhotosTable.baitId,
            baitName: baitPhotosTable.baitName,
            imagePrefix: sql<string>`LEFT(${baitPhotosTable.imageData}, 30)`,
            sourceLabel: baitPhotosTable.sourceLabel,
          })
          .from(baitPhotosTable),
      'ensureBaitPhotosSeeded'
    );

    const existingMap = new Map(existingRows.map(r => [r.baitId, r]));
    const nowIso = new Date().toISOString();

    for (const item of BAIT_SEED_CATALOG) {
      const dataUrl = loadLocalBaitImageDataUrl(item.file);
      if (!dataUrl) continue;

      const prev = existingMap.get(item.baitId);
      if (!prev) {
        await db
          .insert(baitPhotosTable)
          .values({
            baitId: item.baitId,
            baitName: item.baitName,
            category: item.category,
            imageData: dataUrl,
            sourceLabel: 'Modelo 3D Transparente (PNG) • PostgreSQL',
            updatedAt: nowIso,
          })
          .onConflictDoNothing({ target: baitPhotosTable.baitId });
      } else {
        const isCustom = String(prev.sourceLabel || '').toLowerCase().includes('personalizada');
        if (!isCustom && !String(prev.imagePrefix || '').startsWith('data:image/png;base64,')) {
          await db
            .update(baitPhotosTable)
            .set({
              baitName: item.baitName,
              category: item.category,
              imageData: dataUrl,
              sourceLabel: 'Modelo 3D Transparente (PNG) • PostgreSQL',
              updatedAt: nowIso,
            })
            .where(eq(baitPhotosTable.baitId, item.baitId));
        }
      }
    }

    // Batch-upgrade all non-custom exact_* bait rows in PostgreSQL grouped by target 3D PNG file
    const upgradeGroups = new Map<string, string[]>();
    for (const row of existingRows) {
      if (!row.baitId.startsWith('exact_')) continue;
      const isCustom = String(row.sourceLabel || '').toLowerCase().includes('personalizada');
      if (isCustom) continue;
      if (String(row.imagePrefix || '').startsWith('data:image/png;base64,')) continue;

      const pngFile = matchBaitNameTo3DPngFile(row.baitName);
      const list = upgradeGroups.get(pngFile) || [];
      list.push(row.baitId);
      upgradeGroups.set(pngFile, list);
    }

    for (const [pngFile, ids] of upgradeGroups.entries()) {
      const dataUrl = loadLocalBaitImageDataUrl(pngFile);
      if (!dataUrl || ids.length === 0) continue;
      await db
        .update(baitPhotosTable)
        .set({
          imageData: dataUrl,
          sourceLabel: 'Modelo 3D Transparente (PNG) • PostgreSQL',
          updatedAt: nowIso,
        })
        .where(inArray(baitPhotosTable.baitId, ids));
    }
  } catch (err) {
    console.error('ensureBaitPhotosSeeded error:', err);
  }
}

const ONLINE_FETCH_HEADERS = {
  'User-Agent': 'BarrantubaClubePesca/1.0 (https://barrantuba.app; contato@barrantuba.app)',
};

const inFlightExactBaitResolutions = new Map<
  string,
  Promise<{
    baitId: string;
    baitName: string;
    category: string;
    image: string;
    sourceLabel: string;
    updatedAt: string;
  }>
>();

async function fetchInatPhotoUrl(taxonQuery: string): Promise<string | null> {
  try {
    const url = `https://api.inaturalist.org/v1/taxa?q=${encodeURIComponent(taxonQuery)}&per_page=1`;
    const res = await fetch(url, {
      headers: ONLINE_FETCH_HEADERS,
      signal: AbortSignal.timeout(5500),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const photo = data?.results?.[0]?.default_photo;
    return photo?.medium_url || photo?.url || null;
  } catch {
    return null;
  }
}

async function fetchWikimediaFileUrl(
  fileTitle: string,
  wikiHost: 'commons.wikimedia.org' | 'en.wikipedia.org' | 'pt.wikipedia.org' = 'commons.wikimedia.org'
): Promise<string | null> {
  try {
    const url = `https://${wikiHost}/w/api.php?action=query&titles=${encodeURIComponent(fileTitle)}&prop=imageinfo&iiprop=url|mime|thumburl&iiurlwidth=640&format=json`;
    const res = await fetch(url, {
      headers: ONLINE_FETCH_HEADERS,
      signal: AbortSignal.timeout(5500),
    });
    if (!res.ok) return null;
    const ct = res.headers.get('content-type') || '';
    if (!ct.includes('json')) return null;
    const data = await res.json();
    const pages = Object.values(data?.query?.pages || {}) as any[];
    const info = pages[0]?.imageinfo?.[0];
    if (!info) return null;
    if (info.mime && !/^image\/(jpeg|png|webp)$/i.test(info.mime)) return null;
    return info.thumburl || info.url || null;
  } catch {
    return null;
  }
}

async function fetchWikiPageSummaryImage(
  lang: 'en' | 'pt',
  pageTitleOrQuery: string,
  useSearch = false
): Promise<string | null> {
  try {
    if (!useSearch) {
      const url = `https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(pageTitleOrQuery)}`;
      const res = await fetch(url, {
        headers: ONLINE_FETCH_HEADERS,
        signal: AbortSignal.timeout(5500),
      });
      if (res.ok) {
        const ct = res.headers.get('content-type') || '';
        if (ct.includes('json')) {
          const data = await res.json();
          if (data?.thumbnail?.source) return data.thumbnail.source;
        }
      }
    }

    const searchUrl = `https://${lang}.wikipedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(pageTitleOrQuery)}&gsrlimit=3&prop=pageimages&piprop=thumbnail&pithumbsize=640&format=json`;
    const sRes = await fetch(searchUrl, {
      headers: ONLINE_FETCH_HEADERS,
      signal: AbortSignal.timeout(5500),
    });
    if (!sRes.ok) return null;
    const sCt = sRes.headers.get('content-type') || '';
    if (!sCt.includes('json')) return null;
    const sData = await sRes.json();
    const pages = Object.values(sData?.query?.pages || {}) as any[];
    pages.sort((a, b) => (a.index || 99) - (b.index || 99));
    for (const p of pages) {
      if (p?.thumbnail?.source && !/\.svg/i.test(p.thumbnail.source)) {
        return p.thumbnail.source;
      }
    }
    return null;
  } catch {
    return null;
  }
}

async function findOnlineImageForExactBait(baitName: string): Promise<{
  imageUrl: string | null;
  sourceLabel: string;
}> {
  const n = String(baitName || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

  // 0. Check artificial soft shrimp lure BEFORE natural shrimp & BEFORE generic jig
  if (/camarao/.test(n) && /soft|artificial|jig\s*head/.test(n) && !/vivo|viva/.test(n)) {
    return { imageUrl: null, sourceLabel: 'Banco Barrantuba (PostgreSQL)' };
  }

  // 0b. Check dough / pellet baits BEFORE sardine/fish keywords (e.g. "Massa de farinha com sardinha")
  if (/racao|pellet/.test(n)) {
    const url = await fetchWikimediaFileUrl('File:Fish Food pellets.jpg');
    if (url) return { imageUrl: url, sourceLabel: 'Foto real on-line (Wikimedia Commons) • PostgreSQL' };
  }
  if (/\bpao\b/.test(n)) {
    const url = await fetchWikimediaFileUrl('File:Assorted bread.jpg');
    if (url) return { imageUrl: url, sourceLabel: 'Foto real on-line (Wikimedia Commons) • PostgreSQL' };
  }
  if (/minhoc(a|ao|uinha|ucu)/.test(n)) {
    const url = await fetchInatPhotoUrl('Lumbricus terrestris');
    if (url) return { imageUrl: url, sourceLabel: 'Foto real on-line (iNaturalist) • PostgreSQL' };
  }
  if (/\bmassinha\b|\bmassa\b|chuveirinho|farinha|boilie/.test(n)) {
    const url = await fetchWikimediaFileUrl('File:Boilies.jpg');
    if (url) return { imageUrl: url, sourceLabel: 'Foto real on-line (Wikimedia Commons) • PostgreSQL' };
  }

  // 1. Live / Natural Organism Baits -> iNaturalist & Wikipedia exact real biological photos
  if (/caramujo/.test(n)) {
    const url = await fetchInatPhotoUrl('Pomacea canaliculata');
    if (url) return { imageUrl: url, sourceLabel: 'Foto real on-line (iNaturalist) • PostgreSQL' };
  }
  if (/camarao|crustaceo/.test(n)) {
    const url = await fetchInatPhotoUrl('Penaeus vannamei');
    if (url) return { imageUrl: url, sourceLabel: 'Foto real on-line (iNaturalist) • PostgreSQL' };
  }
  if (/sardinha/.test(n)) {
    const url = await fetchWikiPageSummaryImage('en', 'Sardine');
    if (url) return { imageUrl: url, sourceLabel: 'Foto real on-line (Wikipedia) • PostgreSQL' };
    const inatUrl = await fetchInatPhotoUrl('Sardinella brasiliensis');
    if (inatUrl) return { imageUrl: inatUrl, sourceLabel: 'Foto real on-line (iNaturalist) • PostgreSQL' };
  }
  if (/lambari|piaba|peixe inteiro|peixe-isca/.test(n)) {
    const url = await fetchInatPhotoUrl('Astyanax altiparanae');
    if (url) return { imageUrl: url, sourceLabel: 'Foto real on-line (iNaturalist) • PostgreSQL' };
  }
  if (/manjuba|manjubinha/.test(n)) {
    const url = await fetchInatPhotoUrl('Anchoviella lepidentostole');
    if (url) return { imageUrl: url, sourceLabel: 'Foto real on-line (iNaturalist) • PostgreSQL' };
  }
  if (/tuvira|sarapo/.test(n)) {
    const url = await fetchInatPhotoUrl('Gymnotus carapo');
    if (url) return { imageUrl: url, sourceLabel: 'Foto real on-line (iNaturalist) • PostgreSQL' };
  }
  if (/mussum/.test(n)) {
    const url = await fetchInatPhotoUrl('Synbranchus marmoratus');
    if (url) return { imageUrl: url, sourceLabel: 'Foto real on-line (iNaturalist) • PostgreSQL' };
  }
  if (/verme|isca natural|isca de fundo/.test(n)) {
    const url = await fetchInatPhotoUrl('Lumbricus terrestris');
    if (url) return { imageUrl: url, sourceLabel: 'Foto real on-line (iNaturalist) • PostgreSQL' };
  }
  if (/bichinho|bicho\s+da\s+laranja|larva|tenebrio/.test(n)) {
    const url = await fetchInatPhotoUrl('Galleria mellonella');
    if (url) return { imageUrl: url, sourceLabel: 'Foto real on-line (iNaturalist) • PostgreSQL' };
  }
  if (/tatui/.test(n)) {
    const url = await fetchInatPhotoUrl('Emerita brasiliensis');
    if (url) return { imageUrl: url, sourceLabel: 'Foto real on-line (iNaturalist) • PostgreSQL' };
  }
  if (/corrupto/.test(n)) {
    const url = await fetchInatPhotoUrl('Callichirus major');
    if (url) return { imageUrl: url, sourceLabel: 'Foto real on-line (iNaturalist) • PostgreSQL' };
  }
  if (/lula/.test(n)) {
    const url = await fetchInatPhotoUrl('Doryteuthis plei');
    if (url) return { imageUrl: url, sourceLabel: 'Foto real on-line (iNaturalist) • PostgreSQL' };
  }
  if (/caranguejo|siri/.test(n)) {
    const url = await fetchInatPhotoUrl('Callinectes sapidus');
    if (url) return { imageUrl: url, sourceLabel: 'Foto real on-line (iNaturalist) • PostgreSQL' };
  }
  if (/marisco|mexilhao/.test(n)) {
    const url = await fetchInatPhotoUrl('Perna perna');
    if (url) return { imageUrl: url, sourceLabel: 'Foto real on-line (iNaturalist) • PostgreSQL' };
  }
  if (/polvo/.test(n)) {
    const url = await fetchInatPhotoUrl('Octopus vulgaris');
    if (url) return { imageUrl: url, sourceLabel: 'Foto real on-line (iNaturalist) • PostgreSQL' };
  }
  if (/gafanhoto|grilo/.test(n)) {
    const url = await fetchInatPhotoUrl('Schistocerca');
    if (url) return { imageUrl: url, sourceLabel: 'Foto real on-line (iNaturalist) • PostgreSQL' };
  }

  // 2. Specific Fishing Lures & Natural/Food Bait Types -> Verified Wikimedia Commons & Wikipedia real photos
  if (/spinnerbait/.test(n)) {
    const url = await fetchWikimediaFileUrl('File:Spinnerbait.JPG', 'en.wikipedia.org');
    if (url) return { imageUrl: url, sourceLabel: 'Foto real on-line (Wikipedia) • PostgreSQL' };
  }
  if (/spinner/.test(n)) {
    const url = await fetchWikiPageSummaryImage('en', 'Spinnerbait');
    if (url) return { imageUrl: url, sourceLabel: 'Foto real on-line (Wikipedia) • PostgreSQL' };
  }
  if (/jig/.test(n) && /pena|penacho|bucktail/.test(n)) {
    const url = await fetchWikimediaFileUrl('File:Jigs1.jpg');
    if (url) return { imageUrl: url, sourceLabel: 'Foto real on-line (Wikimedia Commons) • PostgreSQL' };
  }
  if (/jig/.test(n) && /shad|twister|grub/.test(n)) {
    const url = await fetchWikimediaFileUrl('File:Jig-Twister lure 2009 G1.jpg');
    if (url) return { imageUrl: url, sourceLabel: 'Foto real on-line (Wikimedia Commons) • PostgreSQL' };
  }
  if (/jig/.test(n)) {
    const url = await fetchWikimediaFileUrl('File:SaltwaterJigHook.jpg');
    if (url) return { imageUrl: url, sourceLabel: 'Foto real on-line (Wikimedia Commons) • PostgreSQL' };
  }
  if (/colher|spoon/.test(n)) {
    const url = await fetchWikimediaFileUrl('File:Little Cleo lure P5300030.jpg');
    if (url) return { imageUrl: url, sourceLabel: 'Foto real on-line (Wikimedia Commons) • PostgreSQL' };
  }
  if (/popper/.test(n)) {
    const url = await fetchWikimediaFileUrl('File:GT Poppers - Fishing Lures by Robert Stone.jpg');
    if (url) return { imageUrl: url, sourceLabel: 'Foto real on-line (Wikimedia Commons) • PostgreSQL' };
  }
  if (/frog|sapinho/.test(n)) {
    const url = await fetchWikimediaFileUrl('File:Scum frog.jpg');
    if (url) return { imageUrl: url, sourceLabel: 'Foto real on-line (Wikimedia Commons) • PostgreSQL' };
  }
  if (/swimbait|\bshad\b/.test(n)) {
    const url = await fetchWikimediaFileUrl('File:Rainbow Trout Swimbait.JPG');
    if (url) return { imageUrl: url, sourceLabel: 'Foto real on-line (Wikimedia Commons) • PostgreSQL' };
  }
  if (/mosca|\bfly\b/.test(n)) {
    const url = await fetchWikimediaFileUrl('File:ClassicTriumphBassFly.jpg');
    if (url) return { imageUrl: url, sourceLabel: 'Foto real on-line (Wikimedia Commons) • PostgreSQL' };
  }
  if (/zara|stick|firestick|superficie|helice/.test(n)) {
    const url = await fetchWikimediaFileUrl('File:Zwei Wobbler für das Angeln an der Oberfläche.jpg');
    if (url) return { imageUrl: url, sourceLabel: 'Foto real on-line (Wikimedia Commons) • PostgreSQL' };
  }
  if (/plug|meia-agua|inna|brava|crank|twitch|minnow|barbela|micro-isca/.test(n)) {
    const url = /inna|brava|minnow/.test(n)
      ? await fetchWikimediaFileUrl('File:Rapala fishing plug SSR 9 made in Finland.jpg')
      : await fetchWikimediaFileUrl('File:Assorted cranks.JPG');
    if (url) return { imageUrl: url, sourceLabel: 'Foto real on-line (Wikimedia Commons) • PostgreSQL' };
  }
  if (/milho/.test(n)) {
    const url = await fetchWikimediaFileUrl('File:VegCorn.jpg');
    if (url) return { imageUrl: url, sourceLabel: 'Foto real on-line (Wikimedia Commons) • PostgreSQL' };
  }
  if (/abobora/.test(n)) {
    const url = await fetchWikiPageSummaryImage('en', 'Pumpkin');
    if (url) return { imageUrl: url, sourceLabel: 'Foto real on-line (Wikipedia) • PostgreSQL' };
  }
  if (/batata/.test(n)) {
    const url = await fetchWikiPageSummaryImage('en', 'Potato');
    if (url) return { imageUrl: url, sourceLabel: 'Foto real on-line (Wikipedia) • PostgreSQL' };
  }
  if (/frut|semente/.test(n)) {
    const url = await fetchWikimediaFileUrl('File:Fruit bowl.jpg');
    if (url) return { imageUrl: url, sourceLabel: 'Foto real on-line (Wikimedia Commons) • PostgreSQL' };
  }
  if (/queijo/.test(n)) {
    const url = await fetchWikimediaFileUrl('File:Hartkaese HardCheeses.jpg');
    if (url) return { imageUrl: url, sourceLabel: 'Foto real on-line (Wikimedia Commons) • PostgreSQL' };
  }
  if (/figado/.test(n)) {
    const url = /frango/.test(n)
      ? await fetchWikimediaFileUrl('File:Preparing Chicken Liver 01.JPG')
      : await fetchWikimediaFileUrl('File:Raw veal liver, 2010.jpg');
    if (url) return { imageUrl: url, sourceLabel: 'Foto real on-line (Wikimedia Commons) • PostgreSQL' };
  }
  if (/pedaco|carne/.test(n)) {
    const url = await fetchWikimediaFileUrl('File:Raw frozen barramundi fillet cropped.jpg');
    if (url) return { imageUrl: url, sourceLabel: 'Foto real on-line (Wikimedia Commons) • PostgreSQL' };
  }
  if (/banana/.test(n)) {
    const url = await fetchWikimediaFileUrl('File:Bananas (Alabama Extension).jpg');
    if (url) return { imageUrl: url, sourceLabel: 'Foto real on-line (Wikimedia Commons) • PostgreSQL' };
  }

  // 3. Strict English fishing-lure Wikipedia search only (never blind Portuguese homonyms)
  const cleanedSearch = baitName
    .replace(/\b\d+(\.\d+)?\s*(g|gr|cm|mm|oz|lb)\b/gi, '')
    .replace(/\b\d+\/\d+\b/g, '')
    .replace(/\b(no\s+jig|no\s+chicote|no\s+maruseigo|fresca|fresco|vivo|viva|cozido|cozida)\b/gi, '')
    .trim();

  if (cleanedSearch.length >= 3) {
    const enImg = await fetchWikiPageSummaryImage('en', `${cleanedSearch} fishing lure`, true);
    if (enImg && !/president|politician|singer|dolphin|aircraft|tiger|portrait/i.test(enImg)) {
      return { imageUrl: enImg, sourceLabel: 'Foto real on-line (Wikipedia) • PostgreSQL' };
    }
  }

  return { imageUrl: null, sourceLabel: 'Banco Barrantuba (PostgreSQL)' };
}

export async function resolveExactBaitPhotoOnline(
  baitName: string,
  forceRefresh = false
): Promise<{
  baitId: string;
  baitName: string;
  category: string;
  image: string;
  sourceLabel: string;
  updatedAt: string;
}> {
  const cleanName = String(baitName || '').trim() || 'Isca';
  const exactBaitId = normalizeExactBaitId(cleanName);
  const canonical = mapBaitNameToCanonicalId(cleanName);
  const pngFile = matchBaitNameTo3DPngFile(cleanName);

  // 1. Return immediately if already stored in PostgreSQL bait_photos (and either custom OR already 3D PNG)
  if (!forceRefresh) {
    try {
      const existing = await withDbRetry(
        () =>
          db
            .select({
              baitId: baitPhotosTable.baitId,
              baitName: baitPhotosTable.baitName,
              category: baitPhotosTable.category,
              sourceLabel: baitPhotosTable.sourceLabel,
              updatedAt: baitPhotosTable.updatedAt,
              imageData: baitPhotosTable.imageData,
            })
            .from(baitPhotosTable)
            .where(eq(baitPhotosTable.baitId, exactBaitId)),
        `resolveExactBait:${exactBaitId}`
      );

      if (existing.length > 0 && existing[0].imageData?.startsWith('data:image/')) {
        const isCustom = String(existing[0].sourceLabel || '').toLowerCase().includes('personalizada');
        if (isCustom || existing[0].imageData.startsWith('data:image/png;base64,')) {
          return {
            baitId: exactBaitId,
            baitName: cleanName,
            category: existing[0].category || canonical.category,
            image: buildBaitPhotoUrl(exactBaitId, existing[0].updatedAt, cleanName),
            sourceLabel: existing[0].sourceLabel || 'Modelo 3D Transparente (PNG) • PostgreSQL',
            updatedAt: existing[0].updatedAt,
          };
        }
      }
    } catch (err) {
      console.warn('resolveExactBaitPhotoOnline DB read fallback:', err);
    }
  }

  const inflightKey = `${exactBaitId}_${forceRefresh ? 'refresh' : 'std'}`;
  const activeTask = inFlightExactBaitResolutions.get(inflightKey);
  if (activeTask) return activeTask;

  const task = (async () => {
    try {
      // Use dedicated 3D transparent PNG studio render matching the bait name
      let finalDataUrl: string | null = loadLocalBaitImageDataUrl(pngFile);
      let finalSource = 'Modelo 3D Transparente (PNG) • PostgreSQL';

      if (!finalDataUrl) {
        const { imageUrl, sourceLabel } = await findOnlineImageForExactBait(cleanName);
        if (imageUrl) {
          finalSource = sourceLabel;
          try {
            const imgRes = await fetch(imageUrl, {
              headers: ONLINE_FETCH_HEADERS,
              signal: AbortSignal.timeout(7000),
            });
            if (imgRes.ok) {
              const rawCt = (imgRes.headers.get('content-type') || 'image/jpeg').split(';')[0].trim();
              if (/^image\/(jpeg|jpg|png|webp)$/i.test(rawCt)) {
                const arr = await imgRes.arrayBuffer();
                if (arr.byteLength > 1500) {
                  const ct = rawCt === 'image/jpg' ? 'image/jpeg' : rawCt;
                  finalDataUrl = `data:${ct};base64,${Buffer.from(arr).toString('base64')}`;
                }
              }
            }
          } catch (downloadErr) {
            console.warn(`Bait image download fallback for "${cleanName}":`, downloadErr);
          }
        }
      }

      const nowIso = new Date().toISOString();
      if (finalDataUrl) {
        try {
          // Respect Admin custom upload if already customized
          const currentRow = await db
            .select({ sourceLabel: baitPhotosTable.sourceLabel, updatedAt: baitPhotosTable.updatedAt })
            .from(baitPhotosTable)
            .where(eq(baitPhotosTable.baitId, exactBaitId));

          const isAlreadyCustom =
            !forceRefresh &&
            currentRow[0] &&
            String(currentRow[0].sourceLabel || '').toLowerCase().includes('personalizada');

          if (isAlreadyCustom) {
            return {
              baitId: exactBaitId,
              baitName: cleanName,
              category: canonical.category,
              image: buildBaitPhotoUrl(exactBaitId, currentRow[0].updatedAt, cleanName),
              sourceLabel: currentRow[0].sourceLabel,
              updatedAt: currentRow[0].updatedAt,
            };
          }

          await withDbRetry(
            () =>
              db
                .insert(baitPhotosTable)
                .values({
                  baitId: exactBaitId,
                  baitName: cleanName,
                  category: canonical.category,
                  imageData: finalDataUrl!,
                  sourceLabel: finalSource,
                  updatedAt: nowIso,
                })
                .onConflictDoUpdate({
                  target: baitPhotosTable.baitId,
                  set: {
                    baitName: cleanName,
                    category: canonical.category,
                    imageData: finalDataUrl!,
                    sourceLabel: finalSource,
                    updatedAt: nowIso,
                  },
                }),
            `saveExactBait:${exactBaitId}`
          );
        } catch (dbErr) {
          console.warn('Failed saving exact bait photo in PostgreSQL:', dbErr);
        }

        return {
          baitId: exactBaitId,
          baitName: cleanName,
          category: canonical.category,
          image: buildBaitPhotoUrl(exactBaitId, nowIso, cleanName),
          sourceLabel: finalSource,
          updatedAt: nowIso,
        };
      }

      return {
        baitId: canonical.baitId,
        baitName: cleanName,
        category: canonical.category,
        image: buildBaitPhotoUrl(canonical.baitId),
        sourceLabel: 'Modelo 3D Transparente (PNG) • PostgreSQL',
        updatedAt: nowIso,
      };
    } finally {
      inFlightExactBaitResolutions.delete(inflightKey);
    }
  })();

  inFlightExactBaitResolutions.set(inflightKey, task);
  return task;
}

export async function dbGetBaitPhotoBinary(
  baitId: string,
  baitNameHint?: string
): Promise<{ contentType: string; buffer: Buffer; updatedAt: string } | null> {
  try {
    const rows = await withDbRetry(
      () =>
        db
          .select()
          .from(baitPhotosTable)
          .where(eq(baitPhotosTable.baitId, baitId)),
      `dbGetBaitPhotoBinary:${baitId}`
    );

    const row = rows[0];
    if (row?.imageData?.startsWith('data:image/')) {
      const isCustom = String(row.sourceLabel || '').toLowerCase().includes('personalizada');
      if (isCustom || row.imageData.startsWith('data:image/png;base64,')) {
        const decoded = decodeDataUrlToBinary(row.imageData);
        if (decoded) return { ...decoded, updatedAt: row.updatedAt };
      }
      // Auto-upgrade legacy non-PNG cached image on-the-fly without overwriting custom uploads
      const pngFile = matchBaitNameTo3DPngFile(baitNameHint || row.baitName || baitId);
      const pngDataUrl = loadLocalBaitImageDataUrl(pngFile);
      if (pngDataUrl) {
        const decoded = decodeDataUrlToBinary(pngDataUrl);
        if (decoded) {
          const nowIso = new Date().toISOString();
          void db
            .update(baitPhotosTable)
            .set({
              imageData: pngDataUrl,
              sourceLabel: 'Modelo 3D Transparente (PNG) • PostgreSQL',
              updatedAt: nowIso,
            })
            .where(eq(baitPhotosTable.baitId, baitId))
            .catch(() => {});
          return { ...decoded, updatedAt: nowIso };
        }
      }
      const decoded = decodeDataUrlToBinary(row.imageData);
      if (decoded) return { ...decoded, updatedAt: row.updatedAt };
    }

    // If an exact_ baitId is requested and not yet cached, resolve & persist as 3D PNG on-demand
    if (baitId.startsWith('exact_') && baitNameHint) {
      const resolved = await resolveExactBaitPhotoOnline(baitNameHint);
      const savedRows = await db
        .select()
        .from(baitPhotosTable)
        .where(eq(baitPhotosTable.baitId, resolved.baitId));
      if (savedRows[0]?.imageData?.startsWith('data:image/')) {
        const decoded = decodeDataUrlToBinary(savedRows[0].imageData);
        if (decoded) return { ...decoded, updatedAt: savedRows[0].updatedAt };
      }
    }

    // Fallback to local 3D PNG seed file and save to DB if missing
    const seedCfg = BAIT_SEED_CATALOG.find(b => b.baitId === baitId);
    const fallbackFile = seedCfg?.file || matchBaitNameTo3DPngFile(baitNameHint || baitId);
    const dataUrl = loadLocalBaitImageDataUrl(fallbackFile);
    if (dataUrl) {
      const decoded = decodeDataUrlToBinary(dataUrl);
      if (decoded) {
        const nowIso = new Date().toISOString();
        if (seedCfg) {
          void db
            .insert(baitPhotosTable)
            .values({
              baitId: seedCfg.baitId,
              baitName: seedCfg.baitName,
              category: seedCfg.category,
              imageData: dataUrl,
              sourceLabel: 'Modelo 3D Transparente (PNG) • PostgreSQL',
              updatedAt: nowIso,
            })
            .onConflictDoNothing({ target: baitPhotosTable.baitId })
            .catch(() => {});
        }
        return { ...decoded, updatedAt: nowIso };
      }
    }
    return null;
  } catch (err) {
    console.error('dbGetBaitPhotoBinary error:', err);
    return null;
  }
}

interface OnlineResearchSignals {
  summaryText: string;
  sourceLabel: string;
  mentionsPlanktonOrFeed: boolean;
  mentionsInsectsOrLarvae: boolean;
  mentionsWorms: boolean;
  mentionsCrustaceansOrShrimp: boolean;
  mentionsFishPredator: boolean;
  mentionsFruitsOrSeeds: boolean;
}

async function fetchWikipediaSummary(lang: 'pt' | 'en', query: string): Promise<string | null> {
  try {
    const searchUrl = `https://${lang}.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&srlimit=1&format=json`;
    const sr = await fetch(searchUrl, {
      headers: { 'User-Agent': 'BarrantubaPesca/1.0 (https://barrantuba.app)' },
      signal: AbortSignal.timeout(4500),
    });
    if (!sr.ok) return null;
    const sJson = await sr.json();
    const title = sJson?.query?.search?.[0]?.title;
    if (!title) return null;

    const extUrl = `https://${lang}.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(title)}&prop=extracts&explaintext=1&exchars=1600&format=json`;
    const er = await fetch(extUrl, {
      headers: { 'User-Agent': 'BarrantubaPesca/1.0 (https://barrantuba.app)' },
      signal: AbortSignal.timeout(4500),
    });
    if (!er.ok) return null;
    const eJson = await er.json();
    const pages = Object.values(eJson?.query?.pages || {}) as any[];
    const extract = pages[0]?.extract;
    return typeof extract === 'string' && extract.length > 20 ? extract : null;
  } catch {
    return null;
  }
}

async function researchSpeciesOnlineDiet(
  speciesName: string,
  scientificName: string
): Promise<OnlineResearchSignals> {
  const [ptText, sciText] = await Promise.all([
    fetchWikipediaSummary('pt', `${speciesName} peixe`),
    scientificName ? fetchWikipediaSummary('en', scientificName) : Promise.resolve(null),
  ]);

  const combined = `${ptText || ''}\n${sciText || ''}`.trim();
  const lower = combined.toLowerCase();

  const mentionsPlanktonOrFeed = /pl[âa]ncton|ra[cç][aã]o|detritos|algas|on[ií]vor|omnivor|herb[ií]vor|detritiv/.test(lower);
  const mentionsInsectsOrLarvae = /inseto|insect|larva|zoopl[âa]ncton|invertebrad/.test(lower);
  const mentionsWorms = /verme|minhoca|anel[ií]deo|worm|benthic|fundo/.test(lower);
  const mentionsCrustaceansOrShrimp = /crust[aá]ceo|camar[aã]o|shrimp|crab|caranguejo|mollusc|molusco/.test(lower);
  const mentionsFishPredator = /pisc[ií]vor|predador|predator|carn[ií]vor|peixes menores|small fish|emboscada|ambush/.test(lower);
  const mentionsFruitsOrSeeds = /fruto|fruta|semente|fruit|seed|vegeta/.test(lower);

  let snippet = '';
  if (ptText) {
    const cleanSentences = ptText
      .replace(/\s+/g, ' ')
      .split(/(?<=[.!?])\s+/)
      .filter(s => /aliment|dieta|come|peixe|habitat|pesca|predador|on[ií]vor|ra[cç][aã]o|pl[âa]ncton|camar[aã]o|inset/i.test(s));
    snippet = cleanSentences.slice(0, 2).join(' ').slice(0, 240);
  }

  return {
    summaryText: snippet,
    sourceLabel: ptText || sciText ? 'Pesquisa on-line (Wikipedia + iNaturalist + PostgreSQL)' : 'Base Ictiológica Barrantuba (PostgreSQL)',
    mentionsPlanktonOrFeed,
    mentionsInsectsOrLarvae,
    mentionsWorms,
    mentionsCrustaceansOrShrimp,
    mentionsFishPredator,
    mentionsFruitsOrSeeds,
  };
}

// Curated Brazilian sport-fishing bait enrichment per canonical species (combined with online research)
const SPECIES_ONLINE_BAIT_EXTRAS: Record<string, Array<{ name: string; reason: string }>> = {
  oreochromis_niloticus: [
    { name: 'Massa de ração', reason: 'Peixe onívoro habituado a ração extrusada e massas à base de farelo.' },
    { name: 'Bichinho da laranja', reason: 'Larva macia altamente atrativa para tilápias em margens e represas.' },
    { name: 'Milho verde cozido', reason: 'Grão doce e macio muito eficiente na ceva de fundo ou meia-água.' },
    { name: 'Minhoca', reason: 'Isca natural clássica para captura de exemplares maiores no fundo.' },
  ],
  robalo: [
    { name: 'Camarão Soft no Jig 15g', reason: 'Imita o camarão em suspensão nas galhadas e bocas de barra.' },
    { name: 'Camarão Vivo', reason: 'Alimento principal do robalo em estuários e rios costeiros.' },
    { name: 'Plug Meia-água 90', reason: 'Trabalhado em toques erráticos perto de pilares e pedras.' },
    { name: 'Stick de superfície 90', reason: 'Explosões na superfície ao amanhecer e virada de maré.' },
  ],
  hoplias: [
    { name: 'Frog / Sapinho anti-enrosco', reason: 'Trabalha por cima de aguapés e galhadas onde a traíra embosca.' },
    { name: 'Lambari vivo', reason: 'Peixe forrageiro natural mais procurado pela traíra nas margens.' },
    { name: 'Spinnerbait', reason: 'Vibração forte em águas turvas ou vegetação submersa.' },
    { name: 'Plug de meia-água', reason: 'Eficiente em águas abertas e bordas de lagoas.' },
  ],
  hoplias_malabaricus: [
    { name: 'Frog / Sapinho anti-enrosco', reason: 'Trabalha por cima de aguapés e galhadas onde a traíra embosca.' },
    { name: 'Lambari vivo', reason: 'Peixe forrageiro natural mais procurado pela traíra nas margens.' },
    { name: 'Spinnerbait', reason: 'Vibração forte em águas turvas ou vegetação submersa.' },
    { name: 'Plug de meia-água', reason: 'Eficiente em águas abertas e bordas de lagoas.' },
  ],
  tucunare: [
    { name: 'Zara Spook Jr 9cm', reason: 'Nado em Z na superfície que desperta ataques territoriais.' },
    { name: 'Plug Meia-água Brava 90', reason: 'Ideal quando o tucunaré está manhoso abaixo da superfície.' },
    { name: 'Jig de Pena', reason: 'Indispensável para bater no fundo e pontas de pedra.' },
    { name: 'Spinnerbait 1/2oz', reason: 'Excelente entre estruturas e troncos submersos.' },
  ],
  dourado: [
    { name: 'Plug Inna 90/110', reason: 'Nado firme em corredeiras fortes e saídas de pedral.' },
    { name: 'Colher prateada', reason: 'Brilho intenso que simula lambaris atordoados na correnteza.' },
    { name: 'Tuvira no chicote', reason: 'Isca viva irresistível nos grandes poços e gargantas de rio.' },
    { name: 'Zara de superfície', reason: 'Ataques espetaculares fora da corredeira ao entardecer.' },
  ],
  corvina: [
    { name: 'Camarão Vivo no Maruseigo', reason: 'Presa natural de fundo que atrai grandes cardumes.' },
    { name: 'Jig Head 21g com Shad', reason: 'Permite tatear o fundo dos canais com correnteza.' },
    { name: 'Sardinha Fresca', reason: 'Alto poder de cheiro em pesca de fundo em canais e baías.' },
  ],
  enxova: [
    { name: 'Colher metálica 40g', reason: 'Arremessos longos em costões e recolhimento rápido.' },
    { name: 'Jig de penacho 28g', reason: 'Muito eficiente nos rebojos e correntes de maré enchente.' },
    { name: 'Plug de meia-água 110', reason: 'Simula tainhotas e sardinhas fugindo na costeira.' },
    { name: 'Sardinha fresca', reason: 'Excelente na pesca de fundo ou boia em costeiras.' },
  ],
};

function buildBaitListFromSignals(params: {
  speciesId: string;
  speciesName: string;
  environment: 'mar' | 'estuario' | 'rio';
  baseLures?: string[];
  signals: OnlineResearchSignals;
}): ResolvedSpeciesBaitItem[] {
  const { speciesId, environment, baseLures = [], signals } = params;
  const nowIso = new Date().toISOString();

  const rawEntries: Array<{ name: string; reason: string }> = [];
  const seen = new Set<string>();

  const pushUnique = (name: string, reason: string) => {
    const clean = String(name || '').trim();
    if (!clean) return;
    const key = clean.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    rawEntries.push({ name: clean, reason });
  };

  // 1. Curated online profile for this exact speciesId
  const curated = SPECIES_ONLINE_BAIT_EXTRAS[speciesId];
  if (curated) {
    for (const c of curated) pushUnique(c.name, c.reason);
  }

  // 2. Existing species lures from BRAZILIAN_FISH_PROFILES
  for (const lure of baseLures) {
    pushUnique(lure, 'Recomendação específica para os hábitos alimentares desta espécie.');
  }

  // 3. Online biological research signals (especially useful for dynamically discovered iNaturalist species!)
  if (rawEntries.length < 2) {
    if (signals.mentionsFishPredator) {
      if (environment === 'mar') {
        pushUnique('Colher metálica', 'Identificado hábito predador marinho na pesquisa on-line.');
        pushUnique('Plug de meia-água', 'Simula peixes forrageiros perseguidos por predadores costeiros.');
        pushUnique('Sardinha fresca', 'Isca natural oleosa de alta atratividade para predadores.');
      } else if (environment === 'estuario') {
        pushUnique('Camarão Soft no Jig', 'Alta eficiência para predadores de estuário e mangue.');
        pushUnique('Plug de meia-água', 'Trabalho errático próximo a galhadas e pilares.');
      } else {
        pushUnique('Plug de meia-água', 'Identificado hábito piscívoro na pesquisa on-line.');
        pushUnique('Lambari vivo', 'Peixe-isca natural de alta eficiência para predadores de rio.');
        pushUnique('Colher metálica', 'Atrai predadores pelo brilho e vibração.');
      }
    }
    if (signals.mentionsCrustaceansOrShrimp) {
      pushUnique(
        environment === 'rio' ? 'Caramujo / Crustáceo' : 'Camarão Vivo',
        'Dieta rica em crustáceos conforme dados biológicos on-line.'
      );
      if (environment !== 'rio') {
        pushUnique('Camarão Soft no Jig', 'Imita camarões naturais junto ao fundo.');
      }
    }
    if (signals.mentionsPlanktonOrFeed) {
      pushUnique('Massa de ração', 'Espécie de hábito onívoro/planctófago confirmada on-line.');
    }
    if (signals.mentionsFruitsOrSeeds) {
      pushUnique('Milho verde cozido', 'Espécie com dieta de grãos, sementes e frutos.');
    }
    if (signals.mentionsInsectsOrLarvae) {
      pushUnique('Bichinho da laranja', 'Consome insetos e larvas conforme pesquisa on-line.');
    }
    if (signals.mentionsWorms) {
      pushUnique('Minhoca', 'Alimenta-se de vermes e organismos junto ao substrato.');
    }
  }

  // Ensure minimum 2 relevant environment baits if still under 2
  if (rawEntries.length < 2) {
    if (environment === 'mar') {
      pushUnique('Camarão Vivo no Jig Head', 'Isca coringa para espécies costeiras marinhas.');
      pushUnique('Sardinha fresca', 'Atrai grande variedade de peixes de fundo e meia-água no mar.');
    } else if (environment === 'estuario') {
      pushUnique('Camarão Soft', 'Isca padrão para água salobra e estuários.');
      pushUnique('Plug meia-água', 'Eficiente em canais de maré.');
    } else {
      pushUnique('Minhoca', 'Isca natural universal para peixes de rio e represa.');
      pushUnique('Massa de pesca', 'Atrativa para espécies onívoras de água doce.');
    }
  }

  return rawEntries.slice(0, 4).map(entry => {
    const mapped = mapBaitNameToCanonicalId(entry.name);
    const exactId = normalizeExactBaitId(entry.name);
    return {
      name: entry.name,
      baitId: exactId,
      image: buildBaitPhotoUrl(exactId, nowIso, entry.name),
      category: mapped.category,
      reason: entry.reason,
    };
  });
}

export async function resolveSpeciesBaitsOnline(params: {
  speciesId: string;
  speciesName: string;
  scientificName?: string;
  environment?: 'mar' | 'estuario' | 'rio';
  baseLures?: string[];
  forceRefresh?: boolean;
}): Promise<SpeciesBaitGuideResponse> {
  const {
    speciesId,
    speciesName,
    scientificName = '',
    environment = 'rio',
    baseLures = [],
    forceRefresh = false,
  } = params;

  // 1. Check Cloud SQL PostgreSQL cache (species_bait_guides)
  if (!forceRefresh) {
    try {
      const rows = await db
        .select()
        .from(speciesBaitGuidesTable)
        .where(eq(speciesBaitGuidesTable.speciesId, speciesId));

      if (rows.length > 0) {
        const cached = rows[0];
        const ageMs = Date.now() - new Date(cached.updatedAt).getTime();
        const baitsList = Array.isArray(cached.baitsData)
          ? (cached.baitsData as ResolvedSpeciesBaitItem[])
          : [];

        if (!Number.isNaN(ageMs) && ageMs < 7 * 24 * 3600 * 1000 && baitsList.length > 0) {
          // Ensure every bait points to its exact per-name baitId & image URL
          const normalizedBaits = baitsList.map(b => {
            const mapped = mapBaitNameToCanonicalId(b.name);
            const exactId = normalizeExactBaitId(b.name);
            return {
              ...b,
              baitId: exactId,
              category: b.category || mapped.category,
              image: buildBaitPhotoUrl(exactId, cached.updatedAt, b.name),
            };
          });
          return {
            speciesId: cached.speciesId,
            speciesName: cached.speciesName,
            scientificName: cached.scientificName,
            baits: normalizedBaits,
            researchSummary: cached.researchSummary,
            sourceLabel: cached.sourceLabel,
            updatedAt: cached.updatedAt,
          };
        }
      }
    } catch (err) {
      console.warn('species_bait_guides read fallback:', err);
    }
  }

  // 2. Research online Wikipedia/iNaturalist biological diet + build exact baits
  const signals = await researchSpeciesOnlineDiet(speciesName, scientificName);
  const baits = buildBaitListFromSignals({
    speciesId,
    speciesName,
    environment,
    baseLures,
    signals,
  });

  const nowIso = new Date().toISOString();
  const researchSummary =
    signals.summaryText ||
    `Iscas selecionadas pela biologia alimentar de ${speciesName}${scientificName ? ` (${scientificName})` : ''} em ambiente de ${environment === 'mar' ? 'mar aberto' : environment === 'estuario' ? 'estuário' : 'rio e represa'}.`;

  // 3. Persist to Cloud SQL PostgreSQL (species_bait_guides)
  try {
    await db
      .insert(speciesBaitGuidesTable)
      .values({
        speciesId,
        speciesName,
        scientificName: scientificName || speciesName,
        baitsData: baits,
        researchSummary,
        sourceLabel: signals.sourceLabel,
        updatedAt: nowIso,
      })
      .onConflictDoUpdate({
        target: speciesBaitGuidesTable.speciesId,
        set: {
          speciesName,
          scientificName: scientificName || speciesName,
          baitsData: baits,
          researchSummary,
          sourceLabel: signals.sourceLabel,
          updatedAt: nowIso,
        },
      });
  } catch (err) {
    console.warn('Failed to save species_bait_guides in PostgreSQL:', err);
  }

  return {
    speciesId,
    speciesName,
    scientificName: scientificName || speciesName,
    baits,
    researchSummary,
    sourceLabel: signals.sourceLabel,
    updatedAt: nowIso,
  };
}

export async function resolveExactBaitPhotosBatch(names: string[]): Promise<
  Array<{
    baitId: string;
    baitName: string;
    category: string;
    image: string;
    sourceLabel: string;
    updatedAt: string;
  }>
> {
  const uniqueNames: string[] = [];
  const seenIds = new Set<string>();
  for (const raw of names || []) {
    const clean = String(raw || '').trim();
    if (!clean) continue;
    const id = normalizeExactBaitId(clean);
    if (seenIds.has(id)) continue;
    seenIds.add(id);
    uniqueNames.push(clean);
  }
  if (uniqueNames.length === 0) return [];

  const targetIds = uniqueNames.map(n => normalizeExactBaitId(n));
  const cachedById = new Map<
    string,
    {
      baitId: string;
      baitName: string;
      category: string;
      image: string;
      sourceLabel: string;
      updatedAt: string;
    }
  >();

  try {
    const rows = await db
      .select({
        baitId: baitPhotosTable.baitId,
        baitName: baitPhotosTable.baitName,
        category: baitPhotosTable.category,
        sourceLabel: baitPhotosTable.sourceLabel,
        updatedAt: baitPhotosTable.updatedAt,
      })
      .from(baitPhotosTable)
      .where(inArray(baitPhotosTable.baitId, targetIds));

    for (const row of rows) {
      cachedById.set(row.baitId, {
        baitId: row.baitId,
        baitName: row.baitName,
        category: row.category,
        image: buildBaitPhotoUrl(row.baitId, row.updatedAt, row.baitName),
        sourceLabel: row.sourceLabel || 'Foto real on-line • PostgreSQL',
        updatedAt: row.updatedAt,
      });
    }
  } catch (err) {
    console.warn('resolveExactBaitPhotosBatch DB lookup warning:', err);
  }

  const missingNames = uniqueNames.filter(n => !cachedById.has(normalizeExactBaitId(n)));
  const results: Array<{
    baitId: string;
    baitName: string;
    category: string;
    image: string;
    sourceLabel: string;
    updatedAt: string;
  }> = [];

  // Return already-cached DB items immediately and resolve missing ones in polite chunks of 3
  for (const n of uniqueNames) {
    const hit = cachedById.get(normalizeExactBaitId(n));
    if (hit) results.push(hit);
  }

  for (let i = 0; i < missingNames.length; i += 3) {
    const chunk = missingNames.slice(i, i + 3);
    const resolvedChunk = await Promise.all(
      chunk.map(name => resolveExactBaitPhotoOnline(name).catch(() => null))
    );
    for (const item of resolvedChunk) {
      if (item) results.push(item);
    }
    if (i + 3 < missingNames.length) {
      await new Promise(resolve => setTimeout(resolve, 120));
    }
  }

  return results;
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

const CUSTOM_BAIT_SOURCE_LABEL = 'Foto personalizada (Admin) • PostgreSQL';

export async function dbGetBaitPhotos(): Promise<BaitPhotoAdminRecord[]> {
  try {
    await ensureBaitPhotosSeeded();
    const rows = await db
      .select({
        baitId: baitPhotosTable.baitId,
        baitName: baitPhotosTable.baitName,
        category: baitPhotosTable.category,
        sourceLabel: baitPhotosTable.sourceLabel,
        updatedAt: baitPhotosTable.updatedAt,
      })
      .from(baitPhotosTable);

    return rows
      .map(r => ({
        baitId: r.baitId,
        baitName: r.baitName,
        category: r.category,
        image: buildBaitPhotoUrl(r.baitId, r.updatedAt, r.baitName),
        sourceLabel: r.sourceLabel || 'Banco Barrantuba (PostgreSQL)',
        isCustom: String(r.sourceLabel || '').toLowerCase().includes('personalizada'),
        updatedAt: r.updatedAt,
      }))
      .sort((a, b) => a.baitName.localeCompare(b.baitName, 'pt-BR'));
  } catch (err) {
    console.error('dbGetBaitPhotos error:', err);
    throw new Error('Falha ao consultar fotos das iscas no PostgreSQL.', { cause: err });
  }
}

export async function dbSaveBaitPhoto(params: {
  baitId?: string;
  baitName: string;
  category?: string;
  imageData: string;
}): Promise<BaitPhotoAdminRecord> {
  try {
    const cleanName = String(params.baitName || '').trim();
    if (!cleanName || !params.imageData || !params.imageData.startsWith('data:image/')) {
      throw new Error('Nome da isca e imagem válida são obrigatórios.');
    }

    const mapped = mapBaitNameToCanonicalId(cleanName);
    const targetBaitId = String(params.baitId || '').trim() || normalizeExactBaitId(cleanName);
    const resolvedCategory = String(params.category || '').trim() || mapped.category;
    const nowIso = new Date().toISOString();

    const saved = await db
      .insert(baitPhotosTable)
      .values({
        baitId: targetBaitId,
        baitName: cleanName,
        category: resolvedCategory,
        imageData: params.imageData,
        sourceLabel: CUSTOM_BAIT_SOURCE_LABEL,
        updatedAt: nowIso,
      })
      .onConflictDoUpdate({
        target: baitPhotosTable.baitId,
        set: {
          baitName: cleanName,
          category: resolvedCategory,
          imageData: params.imageData,
          sourceLabel: CUSTOM_BAIT_SOURCE_LABEL,
          updatedAt: nowIso,
        },
      })
      .returning({
        baitId: baitPhotosTable.baitId,
        baitName: baitPhotosTable.baitName,
        category: baitPhotosTable.category,
        sourceLabel: baitPhotosTable.sourceLabel,
        updatedAt: baitPhotosTable.updatedAt,
      });

    // Also update exact_ variant or sibling row with identical Portuguese bait name
    await db
      .update(baitPhotosTable)
      .set({
        imageData: params.imageData,
        sourceLabel: CUSTOM_BAIT_SOURCE_LABEL,
        updatedAt: nowIso,
      })
      .where(sql`lower(trim(${baitPhotosTable.baitName})) = lower(trim(${cleanName}))`);

    const row = saved[0];
    return {
      baitId: row.baitId,
      baitName: row.baitName,
      category: row.category,
      image: buildBaitPhotoUrl(row.baitId, row.updatedAt, row.baitName),
      sourceLabel: row.sourceLabel,
      isCustom: true,
      updatedAt: row.updatedAt,
    };
  } catch (err) {
    console.error('dbSaveBaitPhoto error:', err);
    throw new Error('Falha ao salvar foto personalizada da isca no PostgreSQL.', { cause: err });
  }
}

export async function dbRevertBaitPhoto(
  baitId: string,
  baitNameHint?: string
): Promise<BaitPhotoAdminRecord> {
  try {
    const existing = await withDbRetry(
      () =>
        db
          .select({
            baitId: baitPhotosTable.baitId,
            baitName: baitPhotosTable.baitName,
            category: baitPhotosTable.category,
          })
          .from(baitPhotosTable)
          .where(eq(baitPhotosTable.baitId, baitId)),
      `dbRevertBaitPhoto:${baitId}`
    );

    const cleanName = existing[0]?.baitName || baitNameHint || baitId;
    const nowIso = new Date().toISOString();

    const seedCfg = BAIT_SEED_CATALOG.find(b => b.baitId === baitId);
    if (seedCfg) {
      const localDataUrl = loadLocalBaitImageDataUrl(seedCfg.file);
      if (localDataUrl) {
        await db
          .insert(baitPhotosTable)
          .values({
            baitId: seedCfg.baitId,
            baitName: seedCfg.baitName,
            category: seedCfg.category,
            imageData: localDataUrl,
            sourceLabel: 'Modelo 3D Transparente (PNG) • PostgreSQL',
            updatedAt: nowIso,
          })
          .onConflictDoUpdate({
            target: baitPhotosTable.baitId,
            set: {
              imageData: localDataUrl,
              sourceLabel: 'Modelo 3D Transparente (PNG) • PostgreSQL',
              updatedAt: nowIso,
            },
          });

        return {
          baitId: seedCfg.baitId,
          baitName: seedCfg.baitName,
          category: seedCfg.category,
          image: buildBaitPhotoUrl(seedCfg.baitId, nowIso, seedCfg.baitName),
          sourceLabel: 'Modelo 3D Transparente (PNG) • PostgreSQL',
          isCustom: false,
          updatedAt: nowIso,
        };
      }
    }

    const resolved = await resolveExactBaitPhotoOnline(cleanName, true);
    return {
      baitId: resolved.baitId,
      baitName: resolved.baitName,
      category: resolved.category,
      image: resolved.image,
      sourceLabel: resolved.sourceLabel,
      isCustom: false,
      updatedAt: resolved.updatedAt,
    };
  } catch (err) {
    console.error('dbRevertBaitPhoto error:', err);
    throw new Error('Falha ao restaurar foto original da isca no PostgreSQL.', { cause: err });
  }
}

export async function prewarmSpeciesBaitGuides(
  speciesItems: Array<{
    id: string;
    name: string;
    scientificName: string;
    environment: 'mar' | 'estuario' | 'rio';
    recommendedLures: string[];
  }>
) {
  try {
    await ensureBaitPhotosSeeded();
    const allLureNames: string[] = [];
    for (const sp of speciesItems) {
      const guide = await resolveSpeciesBaitsOnline({
        speciesId: sp.id,
        speciesName: sp.name,
        scientificName: sp.scientificName,
        environment: sp.environment,
        baseLures: sp.recommendedLures,
      }).catch(() => null);
      if (guide?.baits) {
        for (const b of guide.baits) allLureNames.push(b.name);
      }
      for (const l of sp.recommendedLures || []) allLureNames.push(l);
    }
    if (allLureNames.length > 0) {
      await resolveExactBaitPhotosBatch(allLureNames);
    }
  } catch {
    // non-fatal background prewarm
  }
}
