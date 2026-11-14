// Biological Species × Fishing Tackle Crossing & Balancing Engine
// Zero asset imports in this file so both Vite client and Node/tsx server can share exact tables & rules.

export type TackleEnvironmentGroup = 'Água Doce' | 'Costeira' | 'Alto Mar';
export type TackleHabitat = 'rio' | 'lago' | 'mar' | 'mangue';
export type FeedingBehavior = 'predador' | 'onívoro' | 'herbívoro';
export type SwimDepth = 'superfície' | 'meia-água' | 'fundo';
export type MouthType = 'dura' | 'sensível';
export type StructureLevel = 'alta' | 'média' | 'baixa';
export type FishingMode = 'barranco' | 'embarcado';
export type BaitPreference = 'artificial' | 'natural';

export type RodAction = 'rápida' | 'média' | 'lenta';
export type ReelKind = 'carretilha' | 'molinete';
export type LineKind = 'multifilamento' | 'monofilamento' | 'fluorocarbono';
export type BaitKind =
  | 'artificial de superfície'
  | 'artificial de meia-água'
  | 'artificial de fundo'
  | 'jig'
  | 'natural';

export interface TackleSpecies {
  id: string;
  popularName: string;
  scientificName: string;
  habitats: TackleHabitat[];
  environmentGroup: TackleEnvironmentGroup;
  avgWeightKg: number;
  weightRangeLabel: string;
  feedingBehavior: FeedingBehavior;
  swimDepth: SwimDepth;
  mouthType: MouthType;
  structureLevel: StructureLevel;
  structureNote: string;
  fightingStyle: string;
  speciesPhotoId: string;
}

export interface TackleRod {
  id: string;
  name: string;
  lengthFt: number;
  lengthLabel: string;
  lineMinLb: number;
  lineMaxLb: number;
  action: RodAction;
  castingMinG: number;
  castingMaxG: number;
  reelType: ReelKind;
  powerClass: 'Ultra-Light' | 'Leve' | 'Média-Leve' | 'Média' | 'Média-Pesada' | 'Pesada';
  idealEnvironments: FishingMode[];
  notes: string;
}

export interface TackleReel {
  id: string;
  name: string;
  type: ReelKind;
  lineCapacity: string;
  maxDragKg: number;
  gearRatio: string;
  recoverySpeed: 'rápido' | 'médio' | 'força';
  lineClassMinLb: number;
  lineClassMaxLb: number;
  notes: string;
}

export interface TackleLineAndLeader {
  id: string;
  lineName: string;
  lineType: LineKind;
  strengthLb: number;
  diameterMm: number;
  leaderType: 'fluorocarbono' | 'monofilamento' | 'aço revestido' | 'dispensável';
  leaderStrengthLb: number;
  leaderDiameterMm: number;
  leaderNote: string;
  recommendedForMouth: MouthType[];
  minFishWeightKg: number;
  maxFishWeightKg: number;
}

export interface TackleBaitAndHook {
  id: string;
  name: string;
  baitKind: BaitKind;
  isArtificial: boolean;
  subType: string;
  targetFeeding: FeedingBehavior[];
  swimDepth: SwimDepth;
  weightG: number;
  hookSize: string;
  rigWeight: string;
  baitPhotoId: string;
  preferredEnvironments?: TackleEnvironmentGroup[];
  notes: string;
}

export interface TackleCatalog {
  species: TackleSpecies[];
  rods: TackleRod[];
  reels: TackleReel[];
  lines: TackleLineAndLeader[];
  baits: TackleBaitAndHook[];
}

export interface SavedTackleKit {
  id: string;
  userId: string;
  speciesId: string;
  speciesName: string;
  fishingMode: FishingMode;
  baitPreference: BaitPreference;
  kitData: TackleKitRecommendation;
  createdAt: string;
}

export interface TackleKitRecommendation {
  species: TackleSpecies;
  fishingMode: FishingMode;
  baitPreference: BaitPreference;
  balanceSummary: {
    baseWeightKg: number;
    baseWeightLb: number;
    safetyFactor: number;
    targetResistanceLb: number;
    preferredAction: RodAction;
    targetDragKg: number;
    structureNote: string;
    formulaText: string;
  };
  rod: TackleRod;
  rodReason: string;
  reel: TackleReel;
  reelReason: string;
  lineAndLeader: TackleLineAndLeader;
  lineReason: string;
  leaderReason: string;
  baitAndHook: TackleBaitAndHook;
  baitReason: string;
  alternativeBaits: TackleBaitAndHook[];
}

export const INITIAL_TACKLE_SPECIES: TackleSpecies[] = [
  {
    id: 'tucunare_azul',
    popularName: 'Tucunaré Azul',
    scientificName: 'Cichla piquiti',
    habitats: ['rio', 'lago'],
    environmentGroup: 'Água Doce',
    avgWeightKg: 3.2,
    weightRangeLabel: '1,5 a 5,5 kg',
    feedingBehavior: 'predador',
    swimDepth: 'superfície',
    mouthType: 'dura',
    structureLevel: 'alta',
    structureNote: 'Estruturas submersas, galhadas e bicos de ilhas exigem reserva de potência.',
    fightingStyle: 'Explosão violenta na superfície e corrida curta rumo aos troncos.',
    speciesPhotoId: 'tucunare',
  },
  {
    id: 'robalo_flecha',
    popularName: 'Robalo Flecha',
    scientificName: 'Centropomus undecimalis',
    habitats: ['rio', 'mar', 'mangue'],
    environmentGroup: 'Costeira',
    avgWeightKg: 4.5,
    weightRangeLabel: '2,0 a 9,0 kg',
    feedingBehavior: 'predador',
    swimDepth: 'meia-água',
    mouthType: 'dura',
    structureLevel: 'alta',
    structureNote: 'Raízes de mangue, pilares de pontes e pedras cortantes exigem 2,0x de segurança.',
    fightingStyle: 'Arrancada forte com saltos e cabeçadas tentando cortar a linha nas raízes.',
    speciesPhotoId: 'robalo',
  },
  {
    id: 'dourado_rio',
    popularName: 'Dourado',
    scientificName: 'Salminus brasiliensis',
    habitats: ['rio'],
    environmentGroup: 'Água Doce',
    avgWeightKg: 6.5,
    weightRangeLabel: '3,0 a 14,0 kg',
    feedingBehavior: 'predador',
    swimDepth: 'meia-água',
    mouthType: 'dura',
    structureLevel: 'alta',
    structureNote: 'Corredeiras, pedrais e mandíbula óssea com dentes exigem fisgada seca e leader reforçado.',
    fightingStyle: 'Saltos acrobáticos em corredeiras fortes e sacudidas de cabeça intensas.',
    speciesPhotoId: 'dourado',
  },
  {
    id: 'pintado_rio',
    popularName: 'Pintado',
    scientificName: 'Pseudoplatystoma corruscans',
    habitats: ['rio'],
    environmentGroup: 'Água Doce',
    avgWeightKg: 12.0,
    weightRangeLabel: '6,0 a 25,0 kg',
    feedingBehavior: 'predador',
    swimDepth: 'fundo',
    mouthType: 'dura',
    structureLevel: 'alta',
    structureNote: 'Poços profundos, barrancos submersos e troncos pesados no leito do rio.',
    fightingStyle: 'Tração pesada constante rente ao fundo, testando drag e resistência da vara.',
    speciesPhotoId: 'pseudoplatystoma_corruscans',
  },
  {
    id: 'traira',
    popularName: 'Traíra',
    scientificName: 'Hoplias malabaricus',
    habitats: ['rio', 'lago'],
    environmentGroup: 'Água Doce',
    avgWeightKg: 1.8,
    weightRangeLabel: '0,8 a 3,5 kg',
    feedingBehavior: 'predador',
    swimDepth: 'superfície',
    mouthType: 'dura',
    structureLevel: 'alta',
    structureNote: 'Vegetação aquática densa, aguapés e boca extremamente óssea e dentada.',
    fightingStyle: 'Ataque fulminante entre a vegetação e giros rápidos para se livrar do anzol.',
    speciesPhotoId: 'hoplias_malabaricus',
  },
  {
    id: 'tilapia_nilo',
    popularName: 'Tilápia do Nilo',
    scientificName: 'Oreochromis niloticus',
    habitats: ['rio', 'lago'],
    environmentGroup: 'Água Doce',
    avgWeightKg: 1.4,
    weightRangeLabel: '0,6 a 3,0 kg',
    feedingBehavior: 'onívoro',
    swimDepth: 'meia-água',
    mouthType: 'sensível',
    structureLevel: 'baixa',
    structureNote: 'Águas abertas ou margens limpas; lábios delicados rasgam se a vara for rígida demais.',
    fightingStyle: 'Briga em círculos constantes usando a largura do corpo contra a linha.',
    speciesPhotoId: 'oreochromis_niloticus',
  },
  {
    id: 'piapara',
    popularName: 'Piapara / Piava',
    scientificName: 'Megaleporinus obtusidens',
    habitats: ['rio'],
    environmentGroup: 'Água Doce',
    avgWeightKg: 2.2,
    weightRangeLabel: '1,0 a 4,0 kg',
    feedingBehavior: 'onívoro',
    swimDepth: 'fundo',
    mouthType: 'sensível',
    structureLevel: 'média',
    structureNote: 'Corredeiras médias e lajes de pedra; boca pequena exige sensibilidade para detectar o toque.',
    fightingStyle: 'Arrancadas rápidas aproveitando a correnteza do rio com boca delicada.',
    speciesPhotoId: 'megaleporinus_obtusidens',
  },
  {
    id: 'pacu',
    popularName: 'Pacu',
    scientificName: 'Piaractus mesopotamicus',
    habitats: ['rio', 'lago'],
    environmentGroup: 'Água Doce',
    avgWeightKg: 4.0,
    weightRangeLabel: '2,0 a 8,0 kg',
    feedingBehavior: 'herbívoro',
    swimDepth: 'meia-água',
    mouthType: 'sensível',
    structureLevel: 'média',
    structureNote: 'Margens arborizadas onde caem frutos e sementes; dentes fortes porém lábio lateral sensível.',
    fightingStyle: 'Arrancadas potentes e tomadas de linha prolongadas em meia-água.',
    speciesPhotoId: 'piaractus_mesopotamicus',
  },
  {
    id: 'curimbata',
    popularName: 'Curimbatá',
    scientificName: 'Prochilodus lineatus',
    habitats: ['rio', 'lago'],
    environmentGroup: 'Água Doce',
    avgWeightKg: 2.0,
    weightRangeLabel: '1,0 a 4,0 kg',
    feedingBehavior: 'herbívoro',
    swimDepth: 'fundo',
    mouthType: 'sensível',
    structureLevel: 'baixa',
    structureNote: 'Fundos lodosos e arenosos de remansos; boca carnosa e muito frágil.',
    fightingStyle: 'Nado pesado contínuo exigindo fricção bem regulada para não rasgar o lábio.',
    speciesPhotoId: 'prochilodus_lineatus',
  },
  {
    id: 'cara',
    popularName: 'Cará',
    scientificName: 'Geophagus brasiliensis',
    habitats: ['rio', 'lago'],
    environmentGroup: 'Água Doce',
    avgWeightKg: 0.6,
    weightRangeLabel: '0,2 a 1,2 kg',
    feedingBehavior: 'onívoro',
    swimDepth: 'fundo',
    mouthType: 'sensível',
    structureLevel: 'baixa',
    structureNote: 'Margens calmas e fundos de areia; ideal para conjuntos ultra-leves.',
    fightingStyle: 'Toques sutis e corridas curtas vibrantes em equipamento ultra-light.',
    speciesPhotoId: 'geophagus_brasiliensis',
  },
  {
    id: 'corvina',
    popularName: 'Corvina',
    scientificName: 'Micropogonias furnieri',
    habitats: ['mar', 'mangue'],
    environmentGroup: 'Costeira',
    avgWeightKg: 2.5,
    weightRangeLabel: '1,0 a 5,0 kg',
    feedingBehavior: 'onívoro',
    swimDepth: 'fundo',
    mouthType: 'sensível',
    structureLevel: 'baixa',
    structureNote: 'Canais de areia, lama e praias de arrebentação sem muitos obstáculos cortantes.',
    fightingStyle: 'Cabeçadas características no fundo, exigindo vara com boa flexibilidade de ponta.',
    speciesPhotoId: 'corvina',
  },
  {
    id: 'tainha',
    popularName: 'Tainha',
    scientificName: 'Mugil liza',
    habitats: ['mar', 'mangue', 'rio'],
    environmentGroup: 'Costeira',
    avgWeightKg: 2.3,
    weightRangeLabel: '1,0 a 4,5 kg',
    feedingBehavior: 'herbívoro',
    swimDepth: 'superfície',
    mouthType: 'sensível',
    structureLevel: 'baixa',
    structureNote: 'Canais estuarinos, costeiras e águas abertas; boca extremamente delicada.',
    fightingStyle: 'Nado veloz em cardume e saltos longos quando fisgada em águas abertas.',
    speciesPhotoId: 'mugil_liza',
  },
  {
    id: 'bagre_marinho',
    popularName: 'Bagre',
    scientificName: 'Genidens barbus',
    habitats: ['rio', 'mar', 'mangue'],
    environmentGroup: 'Costeira',
    avgWeightKg: 3.5,
    weightRangeLabel: '1,5 a 7,0 kg',
    feedingBehavior: 'onívoro',
    swimDepth: 'fundo',
    mouthType: 'dura',
    structureLevel: 'média',
    structureNote: 'Canais de estuário, bocas de barra e fundos rochosos/arenosos.',
    fightingStyle: 'Resistência firme próxima ao leito aproveitando a força da maré.',
    speciesPhotoId: 'rhamdia_quelen',
  },
  {
    id: 'pampo',
    popularName: 'Pampo',
    scientificName: 'Trachinotus carolinus',
    habitats: ['mar'],
    environmentGroup: 'Costeira',
    avgWeightKg: 1.8,
    weightRangeLabel: '0,8 a 3,8 kg',
    feedingBehavior: 'onívoro',
    swimDepth: 'meia-água',
    mouthType: 'sensível',
    structureLevel: 'baixa',
    structureNote: 'Zona de arrebentação das praias e canais costeiros arenosos.',
    fightingStyle: 'Briga lateral intensa usando ondas e correntes de retorno.',
    speciesPhotoId: 'trachinotus_carolinus',
  },
  {
    id: 'enxova',
    popularName: 'Enxova',
    scientificName: 'Pomatomus saltatrix',
    habitats: ['mar'],
    environmentGroup: 'Alto Mar',
    avgWeightKg: 4.8,
    weightRangeLabel: '2,0 a 9,5 kg',
    feedingBehavior: 'predador',
    swimDepth: 'superfície',
    mouthType: 'dura',
    structureLevel: 'alta',
    structureNote: 'Lajes e costões oceânicos; dentição extremamente afiada exige proteção reforçada.',
    fightingStyle: 'Corridas fulminantes, saltos vigorosos e ataques cortantes.',
    speciesPhotoId: 'enxova',
  },
  {
    id: 'garoupa',
    popularName: 'Garoupa',
    scientificName: 'Epinephelus marginatus',
    habitats: ['mar'],
    environmentGroup: 'Alto Mar',
    avgWeightKg: 7.5,
    weightRangeLabel: '3,5 a 16,0 kg',
    feedingBehavior: 'predador',
    swimDepth: 'fundo',
    mouthType: 'dura',
    structureLevel: 'alta',
    structureNote: 'Tocas em parcel e pedras profundas; se entocar, rompe conjuntos subdimensionados.',
    fightingStyle: 'Explosão inicial potente buscando refúgio imediato nas locas de pedra.',
    speciesPhotoId: 'epinephelus_marginatus',
  },
];

export const INITIAL_TACKLE_RODS: TackleRod[] = [
  {
    id: 'rod_ul_mol_56',
    name: 'Vara Ultra-Light Carbono 5\'6" (1,68m)',
    lengthFt: 5.6,
    lengthLabel: '5\'6" (1,68m)',
    lineMinLb: 2,
    lineMaxLb: 8,
    action: 'lenta',
    castingMinG: 1,
    castingMaxG: 7,
    reelType: 'molinete',
    powerClass: 'Ultra-Light',
    idealEnvironments: ['barranco', 'embarcado'],
    notes: 'Ponta macia que protege lábios delicados e maximiza arremessos de micro-iscas.',
  },
  {
    id: 'rod_light_mol_66',
    name: 'Vara Leve Costeira/Rio 6\'6" (1,98m)',
    lengthFt: 6.6,
    lengthLabel: '6\'6" (1,98m)',
    lineMinLb: 6,
    lineMaxLb: 14,
    action: 'média',
    castingMinG: 5,
    castingMaxG: 18,
    reelType: 'molinete',
    powerClass: 'Leve',
    idealEnvironments: ['barranco', 'embarcado'],
    notes: 'Equilíbrio entre sensibilidade na ponta e alcance de arremesso em margens limpas.',
  },
  {
    id: 'rod_med_mol_76_barranco',
    name: 'Vara Praia / Costão 7\'6" (2,28m)',
    lengthFt: 7.6,
    lengthLabel: '7\'6" (2,28m)',
    lineMinLb: 8,
    lineMaxLb: 20,
    action: 'média',
    castingMinG: 12,
    castingMaxG: 45,
    reelType: 'molinete',
    powerClass: 'Média',
    idealEnvironments: ['barranco'],
    notes: 'Comprimento ampliado para vencer ondas, pedras da margem e lançar chumbadas médias.',
  },
  {
    id: 'rod_surf_mol_90_barranco',
    name: 'Vara Long-Cast Barranco/Praia 9\'0" (2,74m)',
    lengthFt: 9.0,
    lengthLabel: '9\'0" (2,74m)',
    lineMinLb: 12,
    lineMaxLb: 30,
    action: 'média',
    castingMinG: 25,
    castingMaxG: 90,
    reelType: 'molinete',
    powerClass: 'Média-Pesada',
    idealEnvironments: ['barranco'],
    notes: 'Ideal para barranco, praias e canais fundos com isca natural e chumbada.',
  },
  {
    id: 'rod_fast_car_58_14',
    name: 'Vara Carbono IM8 Rápida 5\'8" (1,73m)',
    lengthFt: 5.8,
    lengthLabel: '5\'8" (1,73m)',
    lineMinLb: 8,
    lineMaxLb: 17,
    action: 'rápida',
    castingMinG: 7,
    castingMaxG: 24,
    reelType: 'carretilha',
    powerClass: 'Média-Leve',
    idealEnvironments: ['embarcado'],
    notes: 'Excelente precisão em arremessos curtos entre galhadas e trabalho de zaras/poppers.',
  },
  {
    id: 'rod_fast_car_60_20',
    name: 'Vara Esportiva Rápida 6\'0" (1,83m)',
    lengthFt: 6.0,
    lengthLabel: '6\'0" (1,83m)',
    lineMinLb: 10,
    lineMaxLb: 20,
    action: 'rápida',
    castingMinG: 10,
    castingMaxG: 32,
    reelType: 'carretilha',
    powerClass: 'Média',
    idealEnvironments: ['embarcado', 'barranco'],
    notes: 'Blank rápido de resposta imediata para cravar o anzol em predadores de boca dura.',
  },
  {
    id: 'rod_fast_car_66_25',
    name: 'Vara Versátil Predadores 6\'6" (1,98m)',
    lengthFt: 6.6,
    lengthLabel: '6\'6" (1,98m)',
    lineMinLb: 12,
    lineMaxLb: 25,
    action: 'rápida',
    castingMinG: 12,
    castingMaxG: 42,
    reelType: 'carretilha',
    powerClass: 'Média-Pesada',
    idealEnvironments: ['barranco', 'embarcado'],
    notes: 'Braço de alavanca extra para arremessos de margem e controle de peixes em estruturas.',
  },
  {
    id: 'rod_fast_car_70_35',
    name: 'Vara Força Bruta Rápida 7\'0" (2,13m)',
    lengthFt: 7.0,
    lengthLabel: '7\'0" (2,13m)',
    lineMinLb: 17,
    lineMaxLb: 35,
    action: 'rápida',
    castingMinG: 18,
    castingMaxG: 65,
    reelType: 'carretilha',
    powerClass: 'Média-Pesada',
    idealEnvironments: ['barranco', 'embarcado'],
    notes: 'Reserva de torque para segurar grandes predadores em corredeiras, costões e mangues.',
  },
  {
    id: 'rod_heavy_car_66_50',
    name: 'Vara Pesada Fundo/Jigging 6\'6" (1,98m)',
    lengthFt: 6.6,
    lengthLabel: '6\'6" (1,98m)',
    lineMinLb: 25,
    lineMaxLb: 55,
    action: 'rápida',
    castingMinG: 35,
    castingMaxG: 140,
    reelType: 'carretilha',
    powerClass: 'Pesada',
    idealEnvironments: ['embarcado', 'barranco'],
    notes: 'Construção tubular maciça para arrancar peixes de fundo de tocas e poços profundos.',
  },
  {
    id: 'rod_heavy_mol_70_60',
    name: 'Vara Offshore / Poço Profundo 7\'0" (2,13m)',
    lengthFt: 7.0,
    lengthLabel: '7\'0" (2,13m)',
    lineMinLb: 30,
    lineMaxLb: 65,
    action: 'rápida',
    castingMinG: 45,
    castingMaxG: 180,
    reelType: 'molinete',
    powerClass: 'Pesada',
    idealEnvironments: ['embarcado', 'barranco'],
    notes: 'Suporta chumbadas pesadas e jigs profundos com alavanca segura para peixes acima de 10kg.',
  },
  {
    id: 'rod_med_car_66_20',
    name: 'Vara Ação Média Espera/Boia 6\'6" (1,98m)',
    lengthFt: 6.6,
    lengthLabel: '6\'6" (1,98m)',
    lineMinLb: 10,
    lineMaxLb: 22,
    action: 'média',
    castingMinG: 10,
    castingMaxG: 45,
    reelType: 'carretilha',
    powerClass: 'Média',
    idealEnvironments: ['barranco', 'embarcado'],
    notes: 'Amortecimento progressivo que acompanha corridas fortes de peixes de boca sensível.',
  },
];

export const INITIAL_TACKLE_REELS: TackleReel[] = [
  {
    id: 'reel_mol_1000',
    name: 'Molinete Compacto 1000',
    type: 'molinete',
    lineCapacity: '140m / 0,18mm',
    maxDragKg: 3.5,
    gearRatio: '5.2:1',
    recoverySpeed: 'médio',
    lineClassMinLb: 2,
    lineClassMaxLb: 10,
    notes: 'Leve e macio para pesca ultra-light e linhas finas.',
  },
  {
    id: 'reel_mol_2500',
    name: 'Molinete Esportivo 2500',
    type: 'molinete',
    lineCapacity: '180m / 0,25mm',
    maxDragKg: 6.0,
    gearRatio: '6.0:1',
    recoverySpeed: 'rápido',
    lineClassMinLb: 6,
    lineClassMaxLb: 16,
    notes: 'Versátil para água doce e estuários com ajuste fino de fricção.',
  },
  {
    id: 'reel_mol_4000',
    name: 'Molinete Costeiro 4000',
    type: 'molinete',
    lineCapacity: '220m / 0,33mm',
    maxDragKg: 9.0,
    gearRatio: '5.6:1',
    recoverySpeed: 'médio',
    lineClassMinLb: 12,
    lineClassMaxLb: 30,
    notes: 'Carretel largo ideal para arremessos de barranco, praia e rochas.',
  },
  {
    id: 'reel_mol_6000',
    name: 'Molinete Heavy Offshore 6000',
    type: 'molinete',
    lineCapacity: '260m / 0,42mm',
    maxDragKg: 15.0,
    gearRatio: '4.9:1',
    recoverySpeed: 'força',
    lineClassMinLb: 25,
    lineClassMaxLb: 65,
    notes: 'Engrenagens reforçadas e freio lacrado para água salgada e peixes de grande porte.',
  },
  {
    id: 'reel_car_low_72',
    name: 'Carretilha Perfil Baixo High-Speed 7.2:1',
    type: 'carretilha',
    lineCapacity: '135m / 0,28mm',
    maxDragKg: 6.5,
    gearRatio: '7.2:1',
    recoverySpeed: 'rápido',
    lineClassMinLb: 8,
    lineClassMaxLb: 22,
    notes: 'Recolhimento ágil ideal para trabalho contínuo de zaras, poppers e recolhimento rápido.',
  },
  {
    id: 'reel_car_low_81',
    name: 'Carretilha Perfil Baixo Turbo 8.1:1',
    type: 'carretilha',
    lineCapacity: '150m / 0,30mm',
    maxDragKg: 8.5,
    gearRatio: '8.1:1',
    recoverySpeed: 'rápido',
    lineClassMinLb: 12,
    lineClassMaxLb: 35,
    notes: 'Tira a folga da linha instantaneamente em fisgadas rápidas e arranca o peixe da galhada.',
  },
  {
    id: 'reel_car_power_64',
    name: 'Carretilha Power Torque 6.4:1',
    type: 'carretilha',
    lineCapacity: '185m / 0,35mm',
    maxDragKg: 11.0,
    gearRatio: '6.4:1',
    recoverySpeed: 'médio',
    lineClassMinLb: 15,
    lineClassMaxLb: 40,
    notes: 'Combina força de recolhimento com precisão para plugs profundos e espera.',
  },
  {
    id: 'reel_car_round_56',
    name: 'Carretilha Perfil Alto Heavy 5.6:1',
    type: 'carretilha',
    lineCapacity: '250m / 0,45mm',
    maxDragKg: 16.0,
    gearRatio: '5.6:1',
    recoverySpeed: 'força',
    lineClassMinLb: 25,
    lineClassMaxLb: 65,
    notes: 'Alta capacidade de linha e torque máximo para peixes de fundo como Pintado e Garoupa.',
  },
];

export const INITIAL_TACKLE_LINES: TackleLineAndLeader[] = [
  {
    id: 'line_mono_8',
    lineName: 'Monofilamento Soft 8 lb (0,23mm)',
    lineType: 'monofilamento',
    strengthLb: 8,
    diameterMm: 0.23,
    leaderType: 'dispensável',
    leaderStrengthLb: 8,
    leaderDiameterMm: 0.23,
    leaderNote: 'A própria elasticidade da linha absorve arrancadas de peixes ultra-leves.',
    recommendedForMouth: ['sensível'],
    minFishWeightKg: 0.1,
    maxFishWeightKg: 2.2,
  },
  {
    id: 'line_mono_14',
    lineName: 'Monofilamento Nylon 14 lb (0,30mm)',
    lineType: 'monofilamento',
    strengthLb: 14,
    diameterMm: 0.30,
    leaderType: 'fluorocarbono',
    leaderStrengthLb: 16,
    leaderDiameterMm: 0.33,
    leaderNote: 'Leader curto de fluorocarbono garante invisibilidade em águas claras.',
    recommendedForMouth: ['sensível', 'dura'],
    minFishWeightKg: 1.0,
    maxFishWeightKg: 3.5,
  },
  {
    id: 'line_multi_16',
    lineName: 'Multifilamento 4x 16 lb (0,18mm)',
    lineType: 'multifilamento',
    strengthLb: 16,
    diameterMm: 0.18,
    leaderType: 'fluorocarbono',
    leaderStrengthLb: 20,
    leaderDiameterMm: 0.37,
    leaderNote: 'Zero elasticidade na linha principal + fluorocarbono 0,37mm contra abrasão.',
    recommendedForMouth: ['dura', 'sensível'],
    minFishWeightKg: 1.0,
    maxFishWeightKg: 4.0,
  },
  {
    id: 'line_multi_25',
    lineName: 'Multifilamento 8x 25 lb (0,23mm)',
    lineType: 'multifilamento',
    strengthLb: 25,
    diameterMm: 0.23,
    leaderType: 'fluorocarbono',
    leaderStrengthLb: 30,
    leaderDiameterMm: 0.47,
    leaderNote: 'Multifilamento macio para arremessos longos com leader 0,47mm anti-abrasão.',
    recommendedForMouth: ['dura', 'sensível'],
    minFishWeightKg: 2.0,
    maxFishWeightKg: 6.5,
  },
  {
    id: 'line_multi_35',
    lineName: 'Multifilamento 8x 35 lb (0,28mm)',
    lineType: 'multifilamento',
    strengthLb: 35,
    diameterMm: 0.28,
    leaderType: 'fluorocarbono',
    leaderStrengthLb: 40,
    leaderDiameterMm: 0.57,
    leaderNote: 'Alta resistência a estruturas de mangue, pedras e galhadas submersas.',
    recommendedForMouth: ['dura'],
    minFishWeightKg: 3.5,
    maxFishWeightKg: 9.0,
  },
  {
    id: 'line_multi_40_aco',
    lineName: 'Multifilamento 8x 40 lb (0,32mm)',
    lineType: 'multifilamento',
    strengthLb: 40,
    diameterMm: 0.32,
    leaderType: 'aço revestido',
    leaderStrengthLb: 45,
    leaderDiameterMm: 0.60,
    leaderNote: 'Empate flexível de aço ou fluoro pesado impede o corte por dentes afiados.',
    recommendedForMouth: ['dura'],
    minFishWeightKg: 4.0,
    maxFishWeightKg: 11.0,
  },
  {
    id: 'line_multi_60',
    lineName: 'Multifilamento 8x Heavy 60 lb (0,40mm)',
    lineType: 'multifilamento',
    strengthLb: 60,
    diameterMm: 0.40,
    leaderType: 'fluorocarbono',
    leaderStrengthLb: 65,
    leaderDiameterMm: 0.75,
    leaderNote: 'Máxima proteção contra atrito com rochas, parcel e estruturas de grande fundo.',
    recommendedForMouth: ['dura'],
    minFishWeightKg: 6.5,
    maxFishWeightKg: 30.0,
  },
  {
    id: 'line_fluoro_12',
    lineName: 'Fluorocarbono Integral 12 lb (0,28mm)',
    lineType: 'fluorocarbono',
    strengthLb: 12,
    diameterMm: 0.28,
    leaderType: 'dispensável',
    leaderStrengthLb: 12,
    leaderDiameterMm: 0.28,
    leaderNote: 'Refração quase invisível na água e alta resistência à abrasão para peixes ariscos.',
    recommendedForMouth: ['sensível'],
    minFishWeightKg: 0.8,
    maxFishWeightKg: 3.5,
  },
];

export const INITIAL_TACKLE_BAITS: TackleBaitAndHook[] = [
  {
    id: 'bait_popper_90',
    name: 'Popper 90 Superfície',
    baitKind: 'artificial de superfície',
    isArtificial: true,
    subType: 'Popper',
    targetFeeding: ['predador'],
    swimDepth: 'superfície',
    weightG: 16,
    hookSize: 'Garateia #4 reforçada 3X',
    rigWeight: 'Sem chumbo (flutuante)',
    baitPhotoId: 'popper',
    notes: 'Boca côncava gera estouros na flor d’água que atraem predadores territorialistas.',
  },
  {
    id: 'bait_zara_stick_95',
    name: 'Stick / Zara 95 Superfície',
    baitKind: 'artificial de superfície',
    isArtificial: true,
    subType: 'Stick / Zara',
    targetFeeding: ['predador'],
    swimDepth: 'superfície',
    weightG: 14,
    hookSize: 'Garateia #4',
    rigWeight: 'Sem chumbo (flutuante)',
    baitPhotoId: 'zara_topwater',
    notes: 'Nado em zigue-zague errático imitando peixe ferido na superfície.',
  },
  {
    id: 'bait_frog_antienrosco',
    name: 'Frog / Sapinho Anti-Enrosco',
    baitKind: 'artificial de superfície',
    isArtificial: true,
    subType: 'Frog',
    targetFeeding: ['predador'],
    swimDepth: 'superfície',
    weightG: 12,
    hookSize: 'Anzol Duplo #3/0 acoplado',
    rigWeight: 'Lastro interno 12g',
    baitPhotoId: 'frog_sapinho',
    notes: 'Desliza sobre vegetação e galhadas sem enroscar.',
  },
  {
    id: 'bait_plug_minnow',
    name: 'Plug Meia-Água Minnow 90',
    baitKind: 'artificial de meia-água',
    isArtificial: true,
    subType: 'Plug Minnow',
    targetFeeding: ['predador'],
    swimDepth: 'meia-água',
    weightG: 15,
    hookSize: 'Garateia #4 reforçada',
    rigWeight: 'Barbela média (1,2m a 2m)',
    baitPhotoId: 'plug_minnow',
    notes: 'Trabalha na coluna intermediária onde predadores emboscam cardumes.',
  },
  {
    id: 'bait_spinnerbait',
    name: 'Spinnerbait Dupla Lâmina',
    baitKind: 'artificial de meia-água',
    isArtificial: true,
    subType: 'Spinnerbait',
    targetFeeding: ['predador', 'onívoro'],
    swimDepth: 'meia-água',
    weightG: 18,
    hookSize: 'Anzol Simples #3/0',
    rigWeight: 'Cabeça lastrada 14g',
    baitPhotoId: 'spinnerbait',
    notes: 'Vibração e brilho contínuo ideais para águas turvas ou peixes menos agressivos.',
  },
  {
    id: 'bait_camarao_soft_jig',
    name: 'Camarão Soft + Jig Head',
    baitKind: 'jig',
    isArtificial: true,
    subType: 'Soft Bait com Jig Head',
    targetFeeding: ['predador', 'onívoro'],
    swimDepth: 'meia-água',
    weightG: 14,
    hookSize: 'Anzol Jig Head #2/0',
    rigWeight: 'Cabeça de chumbo 10g a 15g',
    baitPhotoId: 'camarao_soft',
    notes: 'Apresentação natural rente ao fundo e raízes com movimento sutil.',
  },
  {
    id: 'bait_metal_jig_40',
    name: 'Metal Jig / Jig de Pena Fundo',
    baitKind: 'jig',
    isArtificial: true,
    subType: 'Jig de Fundo',
    targetFeeding: ['predador', 'onívoro'],
    swimDepth: 'fundo',
    weightG: 45,
    hookSize: 'Assist Hook #3/0 ou #4/0',
    rigWeight: 'Corpo metálico 40g a 60g',
    baitPhotoId: 'colher_metal_jig',
    notes: 'Afundamento rápido para atingir lajes profundas e poços de predadores de fundo.',
  },
  {
    id: 'bait_colher_prateada',
    name: 'Colher Ondulante / Micro-Jig',
    baitKind: 'artificial de fundo',
    isArtificial: true,
    subType: 'Colher Metálica',
    targetFeeding: ['predador', 'onívoro', 'herbívoro'],
    swimDepth: 'meia-água',
    weightG: 10,
    hookSize: 'Garateia #6 ou Anzol #1',
    rigWeight: 'Corpo metálico 10g',
    baitPhotoId: 'colher_prateada',
    notes: 'Reflexo metálico compacto eficiente inclusive para onívoros e herbívoros oportunistas.',
  },
  {
    id: 'bait_nat_tuvira_fundo',
    name: 'Sardinha / Tuvira no Fundo',
    baitKind: 'natural',
    isArtificial: false,
    subType: 'Peixe-Isca com Chumbada',
    targetFeeding: ['predador'],
    swimDepth: 'fundo',
    weightG: 50,
    hookSize: 'Circle Hook #6/0 ou #7/0',
    rigWeight: 'Chumbada oliva 40g a 80g',
    baitPhotoId: 'sardinha_fresca',
    notes: 'Libera odor intenso no leito, imbatível para grandes peixes de fundo.',
  },
  {
    id: 'bait_nat_lambari_vivo',
    name: 'Lambari Vivo com Boia de Controle',
    baitKind: 'natural',
    isArtificial: false,
    subType: 'Peixe Vivo',
    targetFeeding: ['predador'],
    swimDepth: 'superfície',
    weightG: 20,
    hookSize: 'Anzol Maruseigo #16 ou Circle #2/0',
    rigWeight: 'Boia torpedinho 15g (ou livre)',
    baitPhotoId: 'lambari_sardinha',
    notes: 'Movimento natural contínuo atrai predadores mesmo em dias de pressão instável.',
  },
  {
    id: 'bait_nat_camarao_vivo',
    name: 'Camarão Vivo / Fresco',
    baitKind: 'natural',
    isArtificial: false,
    subType: 'Crustáceo Natural',
    targetFeeding: ['predador', 'onívoro'],
    swimDepth: 'meia-água',
    weightG: 18,
    hookSize: 'Anzol Chinu #6 ou Offset #1/0',
    rigWeight: 'Boia 12g ou Chumbo 10g',
    baitPhotoId: 'camarao_vivo',
    notes: 'Isca universal mais produtiva para espécies costeiras, de mangue e estuários.',
  },
  {
    id: 'bait_nat_massa_boia',
    name: 'Massa / Ração com Boia Cevadeira',
    baitKind: 'natural',
    isArtificial: false,
    subType: 'Massa e Ração',
    targetFeeding: ['onívoro', 'herbívoro'],
    swimDepth: 'meia-água',
    weightG: 35,
    hookSize: 'Anzol Chinu #4 ou #5',
    rigWeight: 'Boia cevadeira / controle 30g',
    baitPhotoId: 'massa_racao',
    notes: 'Mantém a isca suspensa na camada intermediária onde herbívoros e onívoros patrulham.',
  },
  {
    id: 'bait_nat_pao_superficie',
    name: 'Pão Flutuante na Superfície',
    baitKind: 'natural',
    isArtificial: false,
    subType: 'Isca de Superfície Natural',
    targetFeeding: ['herbívoro', 'onívoro'],
    swimDepth: 'superfície',
    weightG: 15,
    hookSize: 'Anzol Chinu #5 ou Garateia #10',
    rigWeight: 'Boia de arremesso 15g',
    baitPhotoId: 'pao_pesca',
    notes: 'Flutuação natural para espécies que sugam alimento na película d’água.',
  },
  {
    id: 'bait_nat_milho_fundo',
    name: 'Milho / Grão Cozido no Fundo',
    baitKind: 'natural',
    isArtificial: false,
    subType: 'Grão Natural',
    targetFeeding: ['herbívoro', 'onívoro'],
    swimDepth: 'fundo',
    weightG: 20,
    hookSize: 'Anzol Chinu #4',
    rigWeight: 'Chumbada oliva 15g a 25g',
    baitPhotoId: 'milho_verde',
    notes: 'Textura firme resiste a pequenos peixes e atinge espécies de fundo como Piapara e Pacu.',
  },
  {
    id: 'bait_nat_minhoca_fundo',
    name: 'Minhocuçu / Minhoca no Fundo',
    baitKind: 'natural',
    isArtificial: false,
    subType: 'Anelídeo de Fundo',
    targetFeeding: ['onívoro', 'predador'],
    swimDepth: 'fundo',
    weightG: 25,
    hookSize: 'Anzol Maruseigo #12 ou #14',
    rigWeight: 'Chumbada oliva 20g',
    baitPhotoId: 'minhoca',
    notes: 'Movimento orgânico contínuo no leito de rios, canais e lagos.',
  },
  {
    id: 'bait_nat_bichinho_laranja',
    name: 'Bichinho da Laranja / Larva',
    baitKind: 'natural',
    isArtificial: false,
    subType: 'Larva Natural',
    targetFeeding: ['onívoro', 'herbívoro'],
    swimDepth: 'meia-água',
    weightG: 5,
    hookSize: 'Anzol Mosquito / Chinu #2',
    rigWeight: 'Micro-boia 4g ou chumbo 3g',
    baitPhotoId: 'bichinho_laranja',
    notes: 'Apresentação delicada para peixes de boca sensível como Tilápia, Cará e Piava.',
  },
];

export const DEFAULT_TACKLE_CATALOG: TackleCatalog = {
  species: INITIAL_TACKLE_SPECIES,
  rods: INITIAL_TACKLE_RODS,
  reels: INITIAL_TACKLE_REELS,
  lines: INITIAL_TACKLE_LINES,
  baits: INITIAL_TACKLE_BAITS,
};

function getSafetyFactor(species: TackleSpecies): number {
  if (species.structureLevel === 'alta') return 2.0;
  if (species.structureLevel === 'média') return 1.75;
  return 1.5;
}

export function recommendTackleKit(
  species: TackleSpecies,
  fishingMode: FishingMode,
  baitPreference: BaitPreference,
  catalog: TackleCatalog = DEFAULT_TACKLE_CATALOG
): TackleKitRecommendation {
  const safetyFactor = getSafetyFactor(species);
  const baseWeightLb = species.avgWeightKg * 2.20462;
  const rawTargetLb = baseWeightLb * safetyFactor;
  const targetResistanceLb = Math.max(6, Math.round(rawTargetLb));
  const preferredAction: RodAction = species.mouthType === 'dura' ? 'rápida' : 'média';
  const targetDragKg = Number(
    Math.max(2.5, Math.min(16, species.avgWeightKg * (species.structureLevel === 'alta' ? 0.95 : 0.7))).toFixed(1)
  );

  // 1. Bait selection: cross feedingBehavior + swimDepth + baitPreference
  const preferredBaitsPool = catalog.baits.filter(
    b => b.isArtificial === (baitPreference === 'artificial')
  );
  const scoredBaits = (preferredBaitsPool.length > 0 ? preferredBaitsPool : catalog.baits)
    .map(bait => {
      let score = 0;
      if (bait.swimDepth === species.swimDepth) score += 45;
      else if (
        (species.swimDepth === 'superfície' && bait.swimDepth === 'meia-água') ||
        (species.swimDepth === 'fundo' && bait.swimDepth === 'meia-água')
      ) {
        score += 18;
      }
      if (bait.targetFeeding.includes(species.feedingBehavior)) score += 40;
      else if (bait.targetFeeding.includes('onívoro')) score += 15;

      // Environment synergy tweaks
      if (species.environmentGroup === 'Costeira' && /camar/i.test(bait.name)) score += 14;
      if (species.environmentGroup === 'Alto Mar' && bait.weightG >= 20) score += 12;
      if (species.popularName === 'Traíra' && bait.id === 'bait_frog_antienrosco') score += 20;
      if (species.popularName === 'Tucunaré Azul' && (bait.id === 'bait_popper_90' || bait.id === 'bait_zara_stick_95')) score += 16;
      if (species.popularName === 'Pacu' && bait.id === 'bait_nat_massa_boia') score += 16;
      if (species.popularName === 'Tilápia do Nilo' && bait.id === 'bait_nat_bichinho_laranja') score += 14;

      return { bait, score };
    })
    .sort((a, b) => b.score - a.score);

  const baitAndHook = scoredBaits[0]?.bait || catalog.baits[0];
  const alternativeBaits = scoredBaits.slice(1, 3).map(s => s.bait);

  // 2. Rod selection: resistance range >= targetResistanceLb, mouth action rule, casting weight, barranco vs embarcado
  const scoredRods = catalog.rods
    .map(rod => {
      let score = 0;

      // Resistance fit
      if (targetResistanceLb >= rod.lineMinLb && targetResistanceLb <= rod.lineMaxLb) {
        score += 45;
      } else {
        const dist =
          targetResistanceLb < rod.lineMinLb
            ? rod.lineMinLb - targetResistanceLb
            : targetResistanceLb - rod.lineMaxLb;
        score += Math.max(-35, 25 - dist * 2.5);
      }

      // Mouth action rule
      if (species.mouthType === 'dura') {
        if (rod.action === 'rápida') score += 35;
        else if (rod.action === 'média') score += 12;
      } else {
        if (rod.action === 'média' || rod.action === 'lenta') score += 35;
        else score -= 10;
      }

      // Fishing mode length ergonomics
      if (rod.idealEnvironments.includes(fishingMode)) score += 20;
      if (fishingMode === 'barranco' && rod.lengthFt >= 6.6) score += 15;
      if (fishingMode === 'embarcado' && rod.lengthFt <= 6.6) score += 12;

      // Casting weight harmony with selected bait
      if (baitAndHook.weightG >= rod.castingMinG && baitAndHook.weightG <= rod.castingMaxG) {
        score += 18;
      } else if (baitAndHook.weightG <= rod.castingMaxG + 10) {
        score += 6;
      } else {
        score -= 12;
      }

      // Artificial bait casting convenience
      if (baitPreference === 'artificial' && rod.reelType === 'carretilha' && targetResistanceLb >= 10) {
        score += 8;
      }
      if (baitPreference === 'natural' && fishingMode === 'barranco' && rod.reelType === 'molinete') {
        score += 10;
      }

      return { rod, score };
    })
    .sort((a, b) => b.score - a.score);

  const rod = scoredRods[0]?.rod || catalog.rods[0];

  // 3. Reel selection matching rod.reelType + drag >= targetDragKg + line class
  const scoredReels = catalog.reels
    .filter(r => r.type === rod.reelType)
    .map(reel => {
      let score = 0;
      if (reel.maxDragKg >= targetDragKg) {
        const surplus = reel.maxDragKg - targetDragKg;
        score += Math.max(15, 45 - surplus * 2.2);
      } else {
        score -= (targetDragKg - reel.maxDragKg) * 8;
      }

      if (targetResistanceLb >= reel.lineClassMinLb && targetResistanceLb <= reel.lineClassMaxLb) {
        score += 35;
      } else {
        const dist =
          targetResistanceLb < reel.lineClassMinLb
            ? reel.lineClassMinLb - targetResistanceLb
            : targetResistanceLb - reel.lineClassMaxLb;
        score -= dist * 1.8;
      }

      // Speed match: surface/active -> rápido; bottom/heavy -> força/médio
      if (baitPreference === 'artificial' && species.swimDepth === 'superfície' && reel.recoverySpeed === 'rápido') {
        score += 15;
      }
      if (species.swimDepth === 'fundo' && (reel.recoverySpeed === 'força' || reel.recoverySpeed === 'médio')) {
        score += 12;
      }

      return { reel, score };
    })
    .sort((a, b) => b.score - a.score);

  const reel = scoredReels[0]?.reel || catalog.reels[0];

  // 4. Line & Leader selection matching targetResistanceLb + rod max line + mouth/abrasion
  const scoredLines = catalog.lines
    .map(line => {
      let score = 0;
      if (line.strengthLb >= targetResistanceLb && line.strengthLb <= rod.lineMaxLb + 8) {
        score += 45;
      } else if (line.strengthLb >= targetResistanceLb) {
        score += Math.max(10, 35 - (line.strengthLb - rod.lineMaxLb));
      } else {
        score -= (targetResistanceLb - line.strengthLb) * 4;
      }

      if (line.recommendedForMouth.includes(species.mouthType)) score += 20;
      if (species.avgWeightKg >= line.minFishWeightKg && species.avgWeightKg <= line.maxFishWeightKg) {
        score += 15;
      }
      if ((species.popularName === 'Dourado' || species.popularName === 'Enxova' || species.popularName === 'Traíra') && line.leaderType === 'aço revestido') {
        score += 12;
      }

      return { line, score };
    })
    .sort((a, b) => b.score - a.score);

  const lineAndLeader = scoredLines[0]?.line || catalog.lines[0];

  // Explanations in clear Portuguese
  const safetyReason =
    species.structureLevel === 'alta'
      ? `2,0x (presença de estruturas como ${species.structureNote.toLowerCase().replace(/\.$/, '')})`
      : species.structureLevel === 'média'
        ? '1,75x (presença moderada de correnteza ou obstáculos)'
        : '1,5x (águas abertas com poucos obstáculos)';

  const actionReason =
    species.mouthType === 'dura'
      ? 'Ação Rápida priorizada porque a espécie possui boca dura/óssea, exigindo resposta seca na fisgada.'
      : `Ação ${rod.action.charAt(0).toUpperCase() + rod.action.slice(1)} selecionada porque a espécie tem boca sensível, amortecendo as arrancadas para não rasgar o lábio.`;

  const modeReason =
    fishingMode === 'barranco'
      ? `Comprimento de ${rod.lengthLabel} favorece arremessos longos de margem e ajuda a livrar pedras e vegetação.`
      : `Comprimento de ${rod.lengthLabel} entrega precisão e ergonomia para trabalhar embarcado ou em caiaque.`;

  const rodReason = `${actionReason} ${modeReason} Libragem ${rod.lineMinLb}–${rod.lineMaxLb} lb e casting até ${rod.castingMaxG}g acomodam com folga a resistência alvo de ${targetResistanceLb} lb.`;

  const reelReason = `${reel.type === 'carretilha' ? 'Carretilha' : 'Molinete'} com drag máximo de ${reel.maxDragKg} kg (cobre o freio indicado de ${targetDragKg} kg) e recolhimento ${reel.gearRatio} (${reel.recoverySpeed}), equilibrado com a vara e capacidade ${reel.lineCapacity}.`;

  const lineReason = `Linha ${lineAndLeader.lineType} de ${lineAndLeader.strengthLb} lb (${lineAndLeader.diameterMm.toFixed(2).replace('.', ',')} mm) atende ao cálculo de segurança (${targetResistanceLb} lb) sem comprometer o arremesso.`;

  const leaderReason =
    lineAndLeader.leaderType === 'dispensável'
      ? `Sem necessidade obrigatória de leader: ${lineAndLeader.leaderNote}`
      : `Leader em ${lineAndLeader.leaderType} ${lineAndLeader.leaderDiameterMm.toFixed(2).replace('.', ',')} mm (${lineAndLeader.leaderStrengthLb} lb): ${lineAndLeader.leaderNote}`;

  const baitReason = `Cruzamento entre hábito ${species.feedingBehavior} e zona de ${species.swimDepth} usando isca ${baitPreference === 'artificial' ? 'artificial' : 'natural'}: ${baitAndHook.notes} Montagem indicada com ${baitAndHook.hookSize} e ${baitAndHook.rigWeight}.`;

  return {
    species,
    fishingMode,
    baitPreference,
    balanceSummary: {
      baseWeightKg: species.avgWeightKg,
      baseWeightLb: Number(baseWeightLb.toFixed(1)),
      safetyFactor,
      targetResistanceLb,
      preferredAction,
      targetDragKg,
      structureNote: species.structureNote,
      formulaText: `${species.avgWeightKg.toFixed(1).replace('.', ',')} kg (${baseWeightLb.toFixed(1).replace('.', ',')} lb) × fator ${safetyReason} = ${targetResistanceLb} lb alvo`,
    },
    rod,
    rodReason,
    reel,
    reelReason,
    lineAndLeader,
    lineReason,
    leaderReason,
    baitAndHook,
    baitReason,
    alternativeBaits,
  };
}
