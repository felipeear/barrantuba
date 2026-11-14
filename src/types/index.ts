export type UserRole = 'admin' | 'member';

export interface CatchComment {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  text: string;
  createdAt: string;
}

export type EquipmentCategory = 
  | 'vara' 
  | 'carretilha' 
  | 'molinete' 
  | 'linha' 
  | 'lider' 
  | 'isca' 
  | 'barco' 
  | 'motor' 
  | 'acessorio';

export interface EquipmentItem {
  id: string;
  userId: string;
  category: EquipmentCategory;
  name: string;
  brand: string;
  specs: string;
  photoUrl?: string;
  createdAt: string;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlocked: boolean;
  value?: string;
  category: 'record' | 'species' | 'community' | 'technique';
  dateUnlocked?: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar: string;
  phone?: string;
  city?: string;
  handle?: string; // e.g. "@felipinho_pesca"
  isVerified?: boolean;
  subtitle?: string; // e.g. "Pescador esportivo 🎣"
  followersCount?: number;
  followingCount?: number;
  followers?: string[]; // userIds
  following?: string[]; // userIds
  savedCatchIds?: string[]; // bookmarked catches
  savedPostIds?: string[]; // bookmarked feed posts
  isPrivate?: boolean;
  equipment: {
    rods: string; // e.g. "Varas 14lb e 17lb ação rápida"
    reels: string; // e.g. "Carretilha Shimano Curado DC e Molinete 3000"
    lines: string; // e.g. "Multifilamento 30lb 8x + Leader Fluorocarbon 0.45mm"
    boatOrKayak: string; // e.g. "Barco Alumínio 5.5m com motor 30HP" ou "Caiaque Hunter Fishing"
    favoriteLures: string; // e.g. "Zaras de superfície, Sticks e Meia-água 90"
  };
  customEquipment?: EquipmentItem[];
  preferredSpecies: string[]; // e.g. ["Tucunaré Azul", "Robalo Flecha", "Dourado"]
  joinedDate: string;
  bio?: string;
}

export type WaterType = 'rio' | 'represa' | 'mar' | 'manguezal' | 'lagoa';
export type AccessType = 'barco' | 'barranco' | 'caiaque' | 'todos';

export interface FishingSpot {
  id: string;
  name: string;
  description: string;
  latitude: number;
  longitude: number;
  waterType: WaterType;
  accessType: AccessType;
  structureNotes: string; // e.g. "Pedral submerso, bico de ilha, troncos caídos"
  recommendedBaits: string[];
  targetSpecies: string[];
  depthMeters?: number;
  rating: number; // 1 to 5
  imageUrl?: string;
  createdByUserId: string;
  createdByUserName: string;
  createdAt: string;
}

export type BaitCategory = 
  | 'superficie' 
  | 'meia_agua' 
  | 'fundo_jig' 
  | 'soft_camarao' 
  | 'isca_viva' 
  | 'isca_natural';

export interface FishCatch {
  id: string;
  spotId: string;
  spotName: string;
  userId: string;
  userName: string;
  userAvatar: string;
  species: string;
  weightKg: number;
  lengthCm: number;
  baitUsed: string; // e.g. "Zara Spook Jr 9cm Osso"
  baitCategory: BaitCategory;
  technique: string; // e.g. "Toques rápidos de ponta de vara", "Trabalho lento de fundo"
  photoUrl: string;
  mediaUrls?: string[]; // up to 10 photos
  videoUrl?: string; // optional video
  capturedAt: string; // ISO date
  weatherTemp?: number;
  windSpeedKm?: number;
  windDirection?: string;
  released: boolean; // Pesque e solte
  notes?: string;
  description?: string;
  likesCount?: number;
  likes?: string[]; // user IDs who liked
  comments?: CatchComment[];
  sharesCount?: number;
  isLocationPrivate?: boolean; // Hide exact coordinates
  taggedUsers?: string[]; // tagged anglers
}

export interface ActiveFishingSession {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  spotId: string;
  spotName: string;
  latitude: number;
  longitude: number;
  startedAt: string; // ISO date
  notes: string; // e.g. "Estou no bico da ilha usando isca de superfície, quem quiser colar tem vaga no barco!"
  targetSpecies: string[];
  contactPhone?: string;
}

export interface ChatMessage {
  id: string;
  channelId: string; // 'geral' | 'fim-de-semana' | 'iscas-dicas'
  userId: string;
  userName: string;
  userAvatar: string;
  text: string;
  timestamp: string;
  spotPin?: {
    id: string;
    name: string;
    lat: number;
    lng: number;
  };
  sharedCatch?: {
    species: string;
    weightKg: number;
    baitUsed: string;
    photoUrl: string;
  };
}

export interface Tournament {
  id: string;
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  spotName: string;
  modality?: string;
  scoringSystem?: string;
  organizerContact?: string;
  targetSpecies: string[];
  prizes: string[];
  entryFee: string; // e.g. "R$ 50,00 + 1kg de alimento"
  rules: string[];
  registeredUserIds: string[];
  maxParticipants: number;
  bannerUrl?: string;
  status: 'upcoming' | 'active' | 'completed';
  createdByUserId: string;
  createdAt: string;
}

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: 'tournament' | 'active_fisher' | 'trophy' | 'admin';
  timestamp: string;
  read: boolean;
  linkTab?: string;
}

export interface SpotWeather {
  temperature: number;
  windSpeed: number; // km/h
  windGusts: number; // km/h
  windDirectionDeg: number;
  surfacePressure: number; // hPa
  weatherCode: number;
  humidity: number;
  conditionText: string;
  fishActivityIndex: 'Excelente' | 'Muito Boa' | 'Estável' | 'Fraca';
  fishActivityReason: string;
}

export type FeedCategory = 'Pesca' | 'Corrida' | 'Aventura' | 'Eventos' | 'Equipamentos' | 'Geral';

export interface FeedComment {
  id: string;
  postId: string;
  userId: string;
  userName: string;
  userAvatar: string;
  userHandle?: string;
  text: string;
  createdAt: string;
}

export interface FeedPost {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  userHandle?: string;
  createdAt: string; // ISO date string
  category: FeedCategory;
  text: string;
  mediaUrls: string[]; // images or videos
  mediaType?: 'image' | 'video';
  hashtags: string[];
  likes: string[]; // user IDs
  likesCount: number;
  comments: FeedComment[];
  commentsCount: number;
  sharesCount: number;
  savedBy?: string[]; // user IDs who bookmarked
}

export interface Story {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  userHandle?: string;
  category?: string;
  mediaUrl: string;
  mediaType: 'image' | 'video';
  caption?: string;
  createdAt: string; // ISO date string
  viewedBy?: string[]; // user IDs who viewed
}

