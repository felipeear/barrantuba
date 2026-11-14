import { 
  User, 
  FishingSpot, 
  FishCatch, 
  ActiveFishingSession, 
  ChatMessage, 
  Tournament, 
  AppNotification,
  Achievement,
  FeedPost,
  Story
} from '../types';
import {
  DEFAULT_TACKLE_CATALOG,
  SavedTackleKit,
  TackleCatalog,
} from './tackleRecommendationEngine';

// Default Club Logo: can be customized by administrator
export const DEFAULT_CLUB_LOGO = '/assets/barrantuba_logo_crest.jpg';
export const BARRANTUBA_LOGO = DEFAULT_CLUB_LOGO;
export const HERO_DAWN_IMAGE = '/src/assets/images/barrantuba_dawn_boat_1793877701562.jpg';
export const TROPHY_FISH_IMAGE = '/src/assets/images/tucunare_trophy_fish_1793877702286.jpg';
export const SPOT_RIVER_IMAGE = '/src/assets/images/spot_curva_rio_1793877703444.jpg';

// Bot IDs that must never appear in users, stories, or feed posts
export const BOT_USER_IDS = new Set(['user_pescaparana', 'user_aventura_sc', 'user_eventos']);
export const BOT_POST_IDS = new Set(['post_corrida_cdl', 'post_pesca_corvina', 'post_aventura_sc']);
export const BOT_STORY_IDS = new Set(['story_felipeear', 'story_eventos', 'story_aventura', 'story_pesca']);

// Initial Users: Only real system administrator account (zero bot users)
export const INITIAL_USERS: (User & { passwordHash: string })[] = [
  {
    id: 'user_admin',
    name: 'Felipinho',
    handle: '@felipeear',
    email: 'felipinhotb@gmail.com',
    role: 'admin',
    isVerified: true,
    avatar: DEFAULT_CLUB_LOGO,
    subtitle: 'Pescador esportivo • Barrantuba 🎣',
    phone: '(48) 99876-5432',
    city: 'Barrantuba • Santa Catarina',
    passwordHash: 'barrantuba123',
    followersCount: 0,
    followingCount: 0,
    followers: [],
    following: [],
    savedCatchIds: [],
    savedPostIds: [],
    isPrivate: false,
    equipment: {
      rods: 'Vara Custom Venator 17lb ação rápida',
      reels: 'Carretilha Shimano Curado DC e Molinete Stradic 3000',
      lines: 'Multifilamento 8X 30lb + Leader Fluorocarbon 0.47mm',
      boatOrKayak: 'Bass Boat 18ft c/ Mercury 115hp e Motor Elétrico Minnkota',
      favoriteLures: 'Zaras de superfície, Sticks e Meia-água 90'
    },
    customEquipment: [],
    preferredSpecies: ['Tucunaré Azul', 'Robalo Flecha', 'Dourado do Rio'],
    joinedDate: '2026-01-01',
    bio: 'Pescador esportivo membro do Barrantuba.'
  }
];

// Clean empty database for catches - starts 100% clean and zeroed out
export const INITIAL_CATCHES: FishCatch[] = [];

export const INITIAL_SPOTS: FishingSpot[] = [];
export const INITIAL_ACTIVE_SESSIONS: ActiveFishingSession[] = [];
export const INITIAL_TOURNAMENTS: Tournament[] = [];
export const INITIAL_CHAT_MESSAGES: ChatMessage[] = [];
export const INITIAL_NOTIFICATIONS: AppNotification[] = [];

// Clean empty database for feed posts & stories - 100% real registered members only
export const INITIAL_FEED_POSTS: FeedPost[] = [];
export const INITIAL_STORIES: Story[] = [];

// Rich default catalog of records, medals, and trophies for anglers
export const DEFAULT_ACHIEVEMENTS: Achievement[] = [
  {
    id: 'ach_record_1',
    title: 'Troféu do Barrantuba',
    description: 'Capture um peixe acima de 5,0 kg com pesque e solte comprovado.',
    icon: '🏆',
    unlocked: false,
    value: '0/5 kg',
    category: 'record'
  },
  {
    id: 'ach_record_2',
    title: 'Gigante dos Rios',
    description: 'Fisgue um exemplar monstruoso com mais de 8,0 kg.',
    icon: '⚡',
    unlocked: false,
    value: '0/8 kg',
    category: 'record'
  },
  {
    id: 'ach_medal_1',
    title: 'Guardião do Pesque & Solte',
    description: 'Solte peixes com vida preservando o ecossistema do Barrantuba.',
    icon: '🌊',
    unlocked: false,
    value: '0/1 soltura',
    category: 'community'
  },
  {
    id: 'ach_medal_2',
    title: 'Medalha de Ouro: Conservação',
    description: 'Realize 10 ou mais capturas com soltura comprovada.',
    icon: '🥇',
    unlocked: false,
    value: '0/10 solturas',
    category: 'community'
  },
  {
    id: 'ach_tech_1',
    title: 'Mestre da Superfície',
    description: 'Capture 3 ou mais peixes utilizando iscas de superfície (Zara, Poppers, Sticks).',
    icon: '🔥',
    unlocked: false,
    value: '0/3 peixes',
    category: 'technique'
  },
  {
    id: 'ach_tech_2',
    title: 'Especialista de Fundo & Jig',
    description: 'Fisgue peixes na meia-água ou no fundo utilizando jigs e camarões soft.',
    icon: '⚓',
    unlocked: false,
    value: '0/2 peixes',
    category: 'technique'
  },
  {
    id: 'ach_spec_1',
    title: 'Biodiversidade Aquática',
    description: 'Registre 3 ou mais espécies diferentes de peixes no clube.',
    icon: '🎖️',
    unlocked: false,
    value: '0/3 espécies',
    category: 'species'
  },
  {
    id: 'ach_spec_2',
    title: 'Rei do Tucunaré',
    description: 'Cadastre 5 ou mais tucunarés (Azul, Amarelo ou Paca) no clube.',
    icon: '👑',
    unlocked: false,
    value: '0/5 peixes',
    category: 'species'
  },
  {
    id: 'ach_spec_3',
    title: 'Flecha Dourada (Robalo)',
    description: 'Capture um Robalo Flecha de respeito com mais de 50 cm.',
    icon: '🎯',
    unlocked: false,
    value: '0/50 cm',
    category: 'species'
  },
  {
    id: 'ach_comm_1',
    title: 'Explorador dos Rios',
    description: 'Pesque em 2 ou mais pontos catalogados no mapa oficial.',
    icon: '🗺️',
    unlocked: false,
    value: '0/2 pontos',
    category: 'community'
  },
  {
    id: 'ach_comm_2',
    title: 'Fotógrafo dos Troféus',
    description: 'Publique 5 ou mais fotos de troféus na galeria da comunidade.',
    icon: '📸',
    unlocked: false,
    value: '0/5 fotos',
    category: 'community'
  },
  {
    id: 'ach_comm_3',
    title: 'Pescador da Madrugada',
    description: 'Fisgue peixes durante a alvorada antes das 08:00 da manhã.',
    icon: '🌅',
    unlocked: false,
    value: '0/1 peixe',
    category: 'technique'
  }
];

// Storage Keys (v2 for clean start without legacy bot data)
const KEYS = {
  USERS: 'barrantuba_users_v2',
  CURRENT_USER: 'barrantuba_current_user_v2',
  SPOTS: 'barrantuba_spots_v2',
  CATCHES: 'barrantuba_catches_v2',
  SESSIONS: 'barrantuba_sessions_v2',
  MESSAGES: 'barrantuba_messages_v2',
  TOURNAMENTS: 'barrantuba_tournaments_v2',
  NOTIFICATIONS: 'barrantuba_notifications_v2',
  CLUB_LOGO: 'barrantuba_club_logo_v2',
  ACHIEVEMENTS: 'barrantuba_achievements_v2',
  FEED_POSTS: 'barrantuba_feed_posts_v2',
  STORIES: 'barrantuba_stories_v2',
  SAVED_POST_IDS: 'barrantuba_saved_post_ids_v2',
};

function safeSetItem(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch (err) {
    console.warn(`localStorage write skipped for "${key}":`, err);
  }
}

export const storage = {
  getUsers(): (User & { passwordHash: string })[] {
    const raw = localStorage.getItem(KEYS.USERS);
    if (!raw) {
      safeSetItem(KEYS.USERS, JSON.stringify(INITIAL_USERS));
      return INITIAL_USERS;
    }
    try {
      const parsed: (User & { passwordHash: string })[] = JSON.parse(raw);
      let changed = false;

      // Remove any legacy bot accounts
      const realUsers = parsed
        .filter((u) => {
          if (BOT_USER_IDS.has(u.id)) {
            changed = true;
            return false;
          }
          return true;
        })
        .map((u) => {
          const rawFollowers = Array.isArray(u.followers) ? u.followers : [];
          const rawFollowing = Array.isArray(u.following) ? u.following : [];
          const cleanFollowers = rawFollowers.filter(id => !BOT_USER_IDS.has(id));
          const cleanFollowing = rawFollowing.filter(id => !BOT_USER_IDS.has(id));
          if (cleanFollowers.length !== rawFollowers.length || cleanFollowing.length !== rawFollowing.length) {
            changed = true;
            return {
              ...u,
              followers: cleanFollowers,
              following: cleanFollowing,
              followersCount: cleanFollowers.length,
              followingCount: cleanFollowing.length
            };
          }
          return u;
        });

      // Ensure admin always exists in users
      if (!realUsers.some((u) => u.email.toLowerCase() === 'felipinhotb@gmail.com')) {
        realUsers.unshift(INITIAL_USERS[0]);
        changed = true;
      }

      if (changed) {
        safeSetItem(KEYS.USERS, JSON.stringify(realUsers));
      }
      return realUsers;
    } catch {
      return INITIAL_USERS;
    }
  },

  saveUsers(users: (User & { passwordHash: string })[]) {
    safeSetItem(KEYS.USERS, JSON.stringify(users));
  },

  getCurrentUser(): User | null {
    const raw = localStorage.getItem(KEYS.CURRENT_USER);
    if (!raw) {
      // Must return null so visitor sees the landing / login page first!
      return null;
    }
    try {
      const user: User = JSON.parse(raw);
      let changed = false;
      if (user.followersCount === 2400) {
        user.followersCount = 0;
        user.followingCount = 0;
        user.followers = [];
        user.following = [];
        changed = true;
      }
      const rawFollowers = Array.isArray(user.followers) ? user.followers : [];
      const rawFollowing = Array.isArray(user.following) ? user.following : [];
      const cleanFollowers = rawFollowers.filter(id => !BOT_USER_IDS.has(id));
      const cleanFollowing = rawFollowing.filter(id => !BOT_USER_IDS.has(id));
      if (cleanFollowers.length !== rawFollowers.length || cleanFollowing.length !== rawFollowing.length) {
        user.followers = cleanFollowers;
        user.following = cleanFollowing;
        user.followersCount = cleanFollowers.length;
        user.followingCount = cleanFollowing.length;
        changed = true;
      }
      if (changed) {
        safeSetItem(KEYS.CURRENT_USER, JSON.stringify(user));
      }
      return user;
    } catch {
      return null;
    }
  },

  setCurrentUser(user: User | null) {
    try {
      if (user) {
        safeSetItem(KEYS.CURRENT_USER, JSON.stringify(user));
      } else {
        localStorage.removeItem(KEYS.CURRENT_USER);
      }
    } catch {}
  },

  getSpots(): FishingSpot[] {
    const raw = localStorage.getItem(KEYS.SPOTS);
    if (!raw) {
      safeSetItem(KEYS.SPOTS, JSON.stringify(INITIAL_SPOTS));
      return INITIAL_SPOTS;
    }
    try {
      return JSON.parse(raw);
    } catch {
      return INITIAL_SPOTS;
    }
  },

  saveSpots(spots: FishingSpot[]) {
    safeSetItem(KEYS.SPOTS, JSON.stringify(spots));
  },

  getCatches(): FishCatch[] {
    const raw = localStorage.getItem(KEYS.CATCHES);
    if (!raw) {
      safeSetItem(KEYS.CATCHES, JSON.stringify(INITIAL_CATCHES));
      return INITIAL_CATCHES;
    }
    try {
      const parsed = JSON.parse(raw);
      // Filter out test seed trophies so user starts completely zeroed out
      const cleaned = parsed.filter((c: FishCatch) => !['catch_trophy_1', 'catch_trophy_2', 'catch_trophy_3'].includes(c.id));
      if (cleaned.length !== parsed.length) {
        safeSetItem(KEYS.CATCHES, JSON.stringify(cleaned));
      }
      return cleaned;
    } catch {
      return INITIAL_CATCHES;
    }
  },

  saveCatches(catches: FishCatch[]) {
    safeSetItem(KEYS.CATCHES, JSON.stringify(catches));
  },

  getSessions(): ActiveFishingSession[] {
    const raw = localStorage.getItem(KEYS.SESSIONS);
    if (!raw) {
      safeSetItem(KEYS.SESSIONS, JSON.stringify(INITIAL_ACTIVE_SESSIONS));
      return INITIAL_ACTIVE_SESSIONS;
    }
    try {
      return JSON.parse(raw);
    } catch {
      return INITIAL_ACTIVE_SESSIONS;
    }
  },

  saveSessions(sessions: ActiveFishingSession[]) {
    safeSetItem(KEYS.SESSIONS, JSON.stringify(sessions));
  },

  getMessages(): ChatMessage[] {
    const raw = localStorage.getItem(KEYS.MESSAGES);
    if (!raw) {
      safeSetItem(KEYS.MESSAGES, JSON.stringify(INITIAL_CHAT_MESSAGES));
      return INITIAL_CHAT_MESSAGES;
    }
    try {
      return JSON.parse(raw);
    } catch {
      return INITIAL_CHAT_MESSAGES;
    }
  },

  saveMessages(messages: ChatMessage[]) {
    safeSetItem(KEYS.MESSAGES, JSON.stringify(messages));
  },

  getTournaments(): Tournament[] {
    const raw = localStorage.getItem(KEYS.TOURNAMENTS);
    if (!raw) {
      safeSetItem(KEYS.TOURNAMENTS, JSON.stringify(INITIAL_TOURNAMENTS));
      return INITIAL_TOURNAMENTS;
    }
    try {
      return JSON.parse(raw);
    } catch {
      return INITIAL_TOURNAMENTS;
    }
  },

  saveTournaments(tournaments: Tournament[]) {
    safeSetItem(KEYS.TOURNAMENTS, JSON.stringify(tournaments));
  },

  getNotifications(): AppNotification[] {
    const raw = localStorage.getItem(KEYS.NOTIFICATIONS);
    if (!raw) {
      safeSetItem(KEYS.NOTIFICATIONS, JSON.stringify(INITIAL_NOTIFICATIONS));
      return INITIAL_NOTIFICATIONS;
    }
    try {
      return JSON.parse(raw);
    } catch {
      return INITIAL_NOTIFICATIONS;
    }
  },

  saveNotifications(notifications: AppNotification[]) {
    safeSetItem(KEYS.NOTIFICATIONS, JSON.stringify(notifications));
  },

  getClubLogo(): string {
    const custom = localStorage.getItem(KEYS.CLUB_LOGO);
    if (custom && !custom.startsWith('verify_logo') && custom.trim() !== '') return custom;
    return DEFAULT_CLUB_LOGO;
  },

  saveClubLogo(logoUrl: string) {
    safeSetItem(KEYS.CLUB_LOGO, logoUrl);
  },

  getAchievements(): Achievement[] {
    const raw = localStorage.getItem(KEYS.ACHIEVEMENTS);
    if (!raw) {
      safeSetItem(KEYS.ACHIEVEMENTS, JSON.stringify(DEFAULT_ACHIEVEMENTS));
      return DEFAULT_ACHIEVEMENTS;
    }
    try {
      return JSON.parse(raw);
    } catch {
      return DEFAULT_ACHIEVEMENTS;
    }
  },

  saveAchievements(list: Achievement[]) {
    safeSetItem(KEYS.ACHIEVEMENTS, JSON.stringify(list));
  },

  getFeedPosts(): FeedPost[] {
    const raw = localStorage.getItem(KEYS.FEED_POSTS);
    if (!raw) {
      safeSetItem(KEYS.FEED_POSTS, JSON.stringify(INITIAL_FEED_POSTS));
      return INITIAL_FEED_POSTS;
    }
    try {
      const parsed: FeedPost[] = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      // Remove any bot posts or posts/comments authored by bot accounts
      const cleaned = parsed
        .filter(p => !BOT_POST_IDS.has(p.id) && !BOT_USER_IDS.has(p.userId))
        .map(p => ({
          ...p,
          likes: Array.isArray(p.likes) ? p.likes.filter(id => !BOT_USER_IDS.has(id)) : [],
          comments: Array.isArray(p.comments) ? p.comments.filter(c => !BOT_USER_IDS.has(c.userId)) : []
        }));
      if (cleaned.length !== parsed.length) {
        safeSetItem(KEYS.FEED_POSTS, JSON.stringify(cleaned));
      }
      return cleaned;
    } catch {
      return [];
    }
  },

  saveFeedPosts(posts: FeedPost[]) {
    safeSetItem(KEYS.FEED_POSTS, JSON.stringify(posts));
  },

  getStories(): Story[] {
    const raw = localStorage.getItem(KEYS.STORIES);
    if (!raw) {
      safeSetItem(KEYS.STORIES, JSON.stringify(INITIAL_STORIES));
      return INITIAL_STORIES;
    }
    try {
      const parsed: Story[] = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      // Filter out bot stories and stories older than 24h
      const now = Date.now();
      const valid = parsed.filter(s => {
        if (BOT_STORY_IDS.has(s.id) || BOT_USER_IDS.has(s.userId)) return false;
        const diff = now - new Date(s.createdAt).getTime();
        return diff < 24 * 3600 * 1000;
      });
      if (valid.length !== parsed.length) {
        safeSetItem(KEYS.STORIES, JSON.stringify(valid));
      }
      return valid;
    } catch {
      return [];
    }
  },

  saveStories(stories: Story[]) {
    safeSetItem(KEYS.STORIES, JSON.stringify(stories));
  },

  getSavedPostIds(): string[] {
    const raw = localStorage.getItem(KEYS.SAVED_POST_IDS);
    if (!raw) return [];
    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  },

  saveSavedPostIds(ids: string[]) {
    safeSetItem(KEYS.SAVED_POST_IDS, JSON.stringify(ids));
  },

  resetAllData() {
    Object.values(KEYS).forEach(k => localStorage.removeItem(k));
  }
};

// Durable PostgreSQL Outbox & Retry Engine (prevents silent data loss across network blips or idle DB wakeups)
const PENDING_OPS_KEY = 'barrantuba_pending_db_ops_v1';

type OutboxEntity =
  | 'spots'
  | 'catches'
  | 'users'
  | 'sessions'
  | 'messages'
  | 'tournaments'
  | 'notifications'
  | 'feedPosts'
  | 'stories'
  | 'settings'
  | 'tackleKits';

interface PendingDbOp {
  opKey: string;
  entity: OutboxEntity;
  url: string;
  method: 'POST' | 'DELETE' | 'PATCH';
  body?: unknown;
  createdAt: string;
}

async function fetchWithRetry(
  url: string,
  init?: RequestInit,
  maxAttempts = 3
): Promise<Response> {
  let lastError: unknown;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const res = await fetch(url, init);
      if (res.status < 500 || attempt === maxAttempts - 1) {
        return res;
      }
      lastError = new Error(`HTTP ${res.status}`);
    } catch (err) {
      lastError = err;
      if (attempt === maxAttempts - 1) {
        throw err;
      }
    }
    await new Promise(resolve => setTimeout(resolve, 250 * Math.pow(2.5, attempt)));
  }
  throw lastError instanceof Error ? lastError : new Error('Falha de rede');
}

function readPendingOps(): PendingDbOp[] {
  try {
    const raw = localStorage.getItem(PENDING_OPS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writePendingOps(ops: PendingDbOp[]): void {
  try {
    if (ops.length === 0) {
      localStorage.removeItem(PENDING_OPS_KEY);
    } else {
      localStorage.setItem(PENDING_OPS_KEY, JSON.stringify(ops));
    }
  } catch (err) {
    console.warn('Could not persist pending DB outbox:', err);
  }
}

function enqueuePendingOp(op: Omit<PendingDbOp, 'createdAt'>, conflictOpKeys: string[] = []): void {
  const existing = readPendingOps().filter(
    item => item.opKey !== op.opKey && !conflictOpKeys.includes(item.opKey)
  );
  existing.push({ ...op, createdAt: new Date().toISOString() });
  // Bound queue to avoid overflowing localStorage if extremely large media payloads fail offline
  const bounded = existing.slice(-40);
  writePendingOps(bounded);
}

function removePendingOp(opKey: string): void {
  const existing = readPendingOps();
  const filtered = existing.filter(item => item.opKey !== opKey);
  if (filtered.length !== existing.length) {
    writePendingOps(filtered);
  }
}

function hasPendingOpsForEntity(entity: OutboxEntity): boolean {
  return readPendingOps().some(op => op.entity === entity);
}

let flushInFlight: Promise<number> | null = null;

// Real-time synchronization layer with Cloud SQL PostgreSQL
export const apiSync = {
  getPendingOpsCount(): number {
    return readPendingOps().length;
  },

  async flushPendingOps(): Promise<number> {
    if (flushInFlight) return flushInFlight;

    flushInFlight = (async () => {
      const queue = readPendingOps();
      if (queue.length === 0) return 0;

      const remaining: PendingDbOp[] = [];
      let flushedCount = 0;

      for (let i = 0; i < queue.length; i++) {
        const op = queue[i];
        try {
          const res = await fetchWithRetry(
            op.url,
            {
              method: op.method,
              headers: op.body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
              body: op.body !== undefined ? JSON.stringify(op.body) : undefined,
            },
            2
          );
          if (res.ok || res.status === 404 || (res.status >= 400 && res.status < 500)) {
            flushedCount += 1;
          } else {
            remaining.push(op);
          }
        } catch {
          // Network still unavailable: preserve current and subsequent queued ops
          remaining.push(...queue.slice(i));
          break;
        }
      }

      writePendingOps(remaining);
      return flushedCount;
    })().finally(() => {
      flushInFlight = null;
    });

    return flushInFlight;
  },

  async syncAllFromDatabase(): Promise<{
    spots?: FishingSpot[];
    catches?: FishCatch[];
    users?: (User & { passwordHash: string })[];
    sessions?: ActiveFishingSession[];
    messages?: ChatMessage[];
    tournaments?: Tournament[];
    notifications?: AppNotification[];
    clubLogo?: string;
    achievements?: Achievement[];
    feedPosts?: FeedPost[];
    stories?: Story[];
  }> {
    try {
      await apiSync.flushPendingOps();

      const getJson = (url: string) =>
        fetchWithRetry(url, undefined, 2).then(r => (r.ok ? r.json() : null));

      const [
        resSpots,
        resCatches,
        resUsers,
        resSessions,
        resMessages,
        resTournaments,
        resNotifications,
        resLogo,
        resAchiev,
        resFeed,
        resStories
      ] = await Promise.allSettled([
        getJson('/api/spots'),
        getJson('/api/catches'),
        getJson('/api/users'),
        getJson('/api/sessions'),
        getJson('/api/messages'),
        getJson('/api/tournaments'),
        getJson('/api/notifications'),
        getJson('/api/settings/club_logo'),
        getJson('/api/settings/achievements_config'),
        getJson('/api/feed-posts'),
        getJson('/api/stories'),
      ]);

      const result: any = {};

      if (resSpots.status === 'fulfilled' && Array.isArray(resSpots.value) && !hasPendingOpsForEntity('spots')) {
        result.spots = resSpots.value;
        storage.saveSpots(resSpots.value);
      }

      if (resCatches.status === 'fulfilled' && Array.isArray(resCatches.value) && !hasPendingOpsForEntity('catches')) {
        result.catches = resCatches.value;
        storage.saveCatches(resCatches.value);
      }

      if (resUsers.status === 'fulfilled' && Array.isArray(resUsers.value) && resUsers.value.length > 0 && !hasPendingOpsForEntity('users')) {
        const cleanedUsers = (resUsers.value as (User & { passwordHash: string })[])
          .filter((u) => !BOT_USER_IDS.has(u.id))
          .map((u) => {
            const rawFollowers = Array.isArray(u.followers) ? u.followers : [];
            const rawFollowing = Array.isArray(u.following) ? u.following : [];
            const cleanFollowers = rawFollowers.filter(id => !BOT_USER_IDS.has(id));
            const cleanFollowing = rawFollowing.filter(id => !BOT_USER_IDS.has(id));
            return {
              ...u,
              followers: cleanFollowers,
              following: cleanFollowing,
              followersCount: cleanFollowers.length,
              followingCount: cleanFollowing.length
            };
          });
        result.users = cleanedUsers;
        storage.saveUsers(cleanedUsers);
      }

      if (resSessions.status === 'fulfilled' && Array.isArray(resSessions.value) && !hasPendingOpsForEntity('sessions')) {
        result.sessions = resSessions.value;
        storage.saveSessions(resSessions.value);
      }

      if (resMessages.status === 'fulfilled' && Array.isArray(resMessages.value) && !hasPendingOpsForEntity('messages')) {
        result.messages = resMessages.value;
        storage.saveMessages(resMessages.value);
      }

      if (resTournaments.status === 'fulfilled' && Array.isArray(resTournaments.value) && !hasPendingOpsForEntity('tournaments')) {
        result.tournaments = resTournaments.value;
        storage.saveTournaments(resTournaments.value);
      }

      if (resNotifications.status === 'fulfilled' && Array.isArray(resNotifications.value) && !hasPendingOpsForEntity('notifications')) {
        result.notifications = resNotifications.value;
        storage.saveNotifications(resNotifications.value);
      }

      if (resLogo.status === 'fulfilled' && resLogo.value?.value && !hasPendingOpsForEntity('settings')) {
        const val = resLogo.value.value;
        if (typeof val === 'string' && val.trim() && !val.startsWith('verify_logo')) {
          result.clubLogo = val;
          storage.saveClubLogo(val);
        }
      }

      if (resAchiev.status === 'fulfilled' && resAchiev.value?.value && !hasPendingOpsForEntity('settings')) {
        try {
          const parsed = JSON.parse(resAchiev.value.value);
          if (Array.isArray(parsed) && parsed.length > 0) {
            result.achievements = parsed;
            storage.saveAchievements(parsed);
          }
        } catch {}
      }

      if (resFeed.status === 'fulfilled' && Array.isArray(resFeed.value) && !hasPendingOpsForEntity('feedPosts')) {
        const cleaned = (resFeed.value as FeedPost[])
          .filter(p => !BOT_POST_IDS.has(p.id) && !BOT_USER_IDS.has(p.userId))
          .map(p => ({
            ...p,
            likes: Array.isArray(p.likes) ? p.likes.filter(id => !BOT_USER_IDS.has(id)) : [],
            comments: Array.isArray(p.comments) ? p.comments.filter(c => !BOT_USER_IDS.has(c.userId)) : []
          }));
        result.feedPosts = cleaned;
        storage.saveFeedPosts(cleaned);
      }

      if (resStories.status === 'fulfilled' && Array.isArray(resStories.value) && !hasPendingOpsForEntity('stories')) {
        const now = Date.now();
        const cleaned = (resStories.value as Story[]).filter(s => {
          if (BOT_STORY_IDS.has(s.id) || BOT_USER_IDS.has(s.userId)) return false;
          const diff = now - new Date(s.createdAt).getTime();
          return Number.isNaN(diff) || diff < 24 * 3600 * 1000;
        });
        result.stories = cleaned;
        storage.saveStories(cleaned);
      }

      return result;
    } catch (err) {
      console.warn('apiSync error (will rely on local storage):', err);
      return {};
    }
  },

  async refreshFeedAndUsers(): Promise<{
    users?: (User & { passwordHash: string })[];
    feedPosts?: FeedPost[];
    stories?: Story[];
    catches?: FishCatch[];
  }> {
    try {
      await apiSync.flushPendingOps();

      const getJson = (url: string) =>
        fetchWithRetry(url, undefined, 2).then(r => (r.ok ? r.json() : null));

      const [resUsers, resFeed, resStories, resCatches] = await Promise.allSettled([
        getJson('/api/users'),
        getJson('/api/feed-posts'),
        getJson('/api/stories'),
        getJson('/api/catches'),
      ]);
      const result: any = {};
      if (resUsers.status === 'fulfilled' && Array.isArray(resUsers.value) && resUsers.value.length > 0 && !hasPendingOpsForEntity('users')) {
        const cleanedUsers = (resUsers.value as (User & { passwordHash: string })[])
          .filter((u) => !BOT_USER_IDS.has(u.id))
          .map((u) => {
            const rawFollowers = Array.isArray(u.followers) ? u.followers : [];
            const rawFollowing = Array.isArray(u.following) ? u.following : [];
            const cleanFollowers = rawFollowers.filter(id => !BOT_USER_IDS.has(id));
            const cleanFollowing = rawFollowing.filter(id => !BOT_USER_IDS.has(id));
            return {
              ...u,
              followers: cleanFollowers,
              following: cleanFollowing,
              followersCount: cleanFollowers.length,
              followingCount: cleanFollowing.length
            };
          });
        result.users = cleanedUsers;
        storage.saveUsers(cleanedUsers);
      }
      if (resFeed.status === 'fulfilled' && Array.isArray(resFeed.value) && !hasPendingOpsForEntity('feedPosts')) {
        const cleanedFeed = (resFeed.value as FeedPost[])
          .filter(p => !BOT_POST_IDS.has(p.id) && !BOT_USER_IDS.has(p.userId))
          .map(p => ({
            ...p,
            likes: Array.isArray(p.likes) ? p.likes.filter(id => !BOT_USER_IDS.has(id)) : [],
            comments: Array.isArray(p.comments) ? p.comments.filter(c => !BOT_USER_IDS.has(c.userId)) : []
          }));
        result.feedPosts = cleanedFeed;
        storage.saveFeedPosts(cleanedFeed);
      }
      if (resStories.status === 'fulfilled' && Array.isArray(resStories.value) && !hasPendingOpsForEntity('stories')) {
        const now = Date.now();
        const cleanedStories = (resStories.value as Story[]).filter(s => {
          if (BOT_STORY_IDS.has(s.id) || BOT_USER_IDS.has(s.userId)) return false;
          const diff = now - new Date(s.createdAt).getTime();
          return Number.isNaN(diff) || diff < 24 * 3600 * 1000;
        });
        result.stories = cleanedStories;
        storage.saveStories(cleanedStories);
      }
      if (resCatches.status === 'fulfilled' && Array.isArray(resCatches.value) && !hasPendingOpsForEntity('catches')) {
        result.catches = resCatches.value;
        storage.saveCatches(resCatches.value);
      }
      return result;
    } catch {
      return {};
    }
  },

  async postSpot(spot: FishingSpot): Promise<{ ok: boolean; error?: string }> {
    const opKey = `upsert:spot:${spot.id}`;
    try {
      const res = await fetchWithRetry('/api/spots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(spot)
      });
      if (!res.ok) {
        if (res.status >= 500) {
          enqueuePendingOp({ opKey, entity: 'spots', url: '/api/spots', method: 'POST', body: spot }, [`delete:spot:${spot.id}`]);
        }
        const msg = res.status === 413 ? 'A foto do ponto é muito grande.' : 'Erro ao salvar ponto no banco.';
        return { ok: false, error: msg };
      }
      removePendingOp(opKey);
      return { ok: true };
    } catch (err) {
      console.warn('Failed to save spot to PostgreSQL (queued for sync):', err);
      enqueuePendingOp({ opKey, entity: 'spots', url: '/api/spots', method: 'POST', body: spot }, [`delete:spot:${spot.id}`]);
      return { ok: false, error: 'Sem conexão com o servidor ao salvar ponto.' };
    }
  },

  async deleteSpot(spotId: string): Promise<boolean> {
    const opKey = `delete:spot:${spotId}`;
    const url = `/api/spots/${encodeURIComponent(spotId)}`;
    try {
      const res = await fetchWithRetry(url, { method: 'DELETE' });
      if (!res.ok && res.status >= 500) {
        enqueuePendingOp({ opKey, entity: 'spots', url, method: 'DELETE' }, [`upsert:spot:${spotId}`]);
        return false;
      }
      if (res.ok) removePendingOp(opKey);
      return res.ok;
    } catch (err) {
      console.warn('Failed to delete spot from PostgreSQL (queued for sync):', err);
      enqueuePendingOp({ opKey, entity: 'spots', url, method: 'DELETE' }, [`upsert:spot:${spotId}`]);
      return false;
    }
  },

  async postCatch(fishCatch: FishCatch): Promise<{ ok: boolean; data?: any; error?: string }> {
    const opKey = `upsert:catch:${fishCatch.id}`;
    try {
      const res = await fetchWithRetry('/api/catches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fishCatch)
      });
      if (!res.ok) {
        if (res.status === 413) {
          return { ok: false, error: 'A foto ou vídeo da captura é muito grande para enviar. Tente reduzir o arquivo.' };
        }
        if (res.status >= 500) {
          enqueuePendingOp({ opKey, entity: 'catches', url: '/api/catches', method: 'POST', body: fishCatch }, [`delete:catch:${fishCatch.id}`]);
        }
        let serverError = `Erro ao salvar captura no banco (HTTP ${res.status}).`;
        try {
          const body = await res.json();
          if (body?.error) serverError = String(body.error);
        } catch {}
        return { ok: false, error: serverError };
      }
      removePendingOp(opKey);
      const data = await res.json().catch(() => null);
      return { ok: true, data };
    } catch (err) {
      console.warn('Failed to save catch to PostgreSQL (queued for sync):', err);
      enqueuePendingOp({ opKey, entity: 'catches', url: '/api/catches', method: 'POST', body: fishCatch }, [`delete:catch:${fishCatch.id}`]);
      return { ok: false, error: 'Sem conexão com o banco de dados ao salvar captura.' };
    }
  },

  async deleteCatch(catchId: string): Promise<boolean> {
    const opKey = `delete:catch:${catchId}`;
    const url = `/api/catches/${encodeURIComponent(catchId)}`;
    try {
      const res = await fetchWithRetry(url, { method: 'DELETE' });
      if (!res.ok && res.status >= 500) {
        enqueuePendingOp({ opKey, entity: 'catches', url, method: 'DELETE' }, [`upsert:catch:${catchId}`]);
        return false;
      }
      if (res.ok) removePendingOp(opKey);
      return res.ok;
    } catch (err) {
      console.warn('Failed to delete catch from PostgreSQL (queued for sync):', err);
      enqueuePendingOp({ opKey, entity: 'catches', url, method: 'DELETE' }, [`upsert:catch:${catchId}`]);
      return false;
    }
  },

  async postUser(user: User & { passwordHash?: string }): Promise<{ ok: boolean; data?: any; error?: string }> {
    const opKey = `upsert:user:${user.id}`;
    try {
      const res = await fetchWithRetry('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(user)
      });
      if (!res.ok) {
        if (res.status === 413) {
          return { ok: false, error: 'A foto de perfil é muito grande. Escolha uma imagem menor.' };
        }
        if (res.status >= 500) {
          enqueuePendingOp({ opKey, entity: 'users', url: '/api/users', method: 'POST', body: user }, [`delete:user:${user.id}`]);
        }
        let serverError = `Erro ao salvar usuário no banco (HTTP ${res.status}).`;
        try {
          const body = await res.json();
          if (body?.error) serverError = String(body.error);
        } catch {}
        return { ok: false, error: serverError };
      }
      removePendingOp(opKey);
      const data = await res.json().catch(() => null);
      return { ok: true, data };
    } catch (err) {
      console.warn('Failed to save user to PostgreSQL (queued for sync):', err);
      enqueuePendingOp({ opKey, entity: 'users', url: '/api/users', method: 'POST', body: user }, [`delete:user:${user.id}`]);
      return { ok: false, error: 'Sem conexão com o banco de dados ao salvar membro.' };
    }
  },

  async deleteUser(userId: string): Promise<boolean> {
    const opKey = `delete:user:${userId}`;
    const url = `/api/users/${encodeURIComponent(userId)}`;
    try {
      const res = await fetchWithRetry(url, { method: 'DELETE' });
      if (!res.ok && res.status >= 500) {
        enqueuePendingOp({ opKey, entity: 'users', url, method: 'DELETE' }, [`upsert:user:${userId}`]);
        return false;
      }
      if (res.ok) removePendingOp(opKey);
      return res.ok;
    } catch (err) {
      console.warn('Failed to delete user from PostgreSQL (queued for sync):', err);
      enqueuePendingOp({ opKey, entity: 'users', url, method: 'DELETE' }, [`upsert:user:${userId}`]);
      return false;
    }
  },

  async toggleFollow(followerId: string, targetUserId: string): Promise<{ isFollowing: boolean; follower: User; target: User } | null> {
    const opKey = `follow:${followerId}:${targetUserId}`;
    const body = { followerId, targetUserId };
    try {
      const res = await fetchWithRetry('/api/users/follow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      if (!res.ok) {
        if (res.status >= 500) {
          enqueuePendingOp({ opKey, entity: 'users', url: '/api/users/follow', method: 'POST', body });
        }
        return null;
      }
      removePendingOp(opKey);
      return await res.json();
    } catch (err) {
      console.warn('Failed to toggle follow in PostgreSQL (queued for sync):', err);
      enqueuePendingOp({ opKey, entity: 'users', url: '/api/users/follow', method: 'POST', body });
      return null;
    }
  },

  async postSession(session: ActiveFishingSession): Promise<{ ok: boolean; error?: string }> {
    const opKey = `upsert:session:${session.id}`;
    try {
      const res = await fetchWithRetry('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(session)
      });
      if (!res.ok && res.status >= 500) {
        enqueuePendingOp({ opKey, entity: 'sessions', url: '/api/sessions', method: 'POST', body: session }, [`delete:session:${session.id}`]);
      } else if (res.ok) {
        removePendingOp(opKey);
      }
      return { ok: res.ok };
    } catch (err) {
      console.warn('Failed to save active session to PostgreSQL (queued for sync):', err);
      enqueuePendingOp({ opKey, entity: 'sessions', url: '/api/sessions', method: 'POST', body: session }, [`delete:session:${session.id}`]);
      return { ok: false, error: 'Falha ao salvar sessão ativa.' };
    }
  },

  async deleteSession(sessionId: string): Promise<boolean> {
    const opKey = `delete:session:${sessionId}`;
    const url = `/api/sessions/${encodeURIComponent(sessionId)}`;
    try {
      const res = await fetchWithRetry(url, { method: 'DELETE' });
      if (!res.ok && res.status >= 500) {
        enqueuePendingOp({ opKey, entity: 'sessions', url, method: 'DELETE' }, [`upsert:session:${sessionId}`]);
        return false;
      }
      if (res.ok) removePendingOp(opKey);
      return res.ok;
    } catch (err) {
      console.warn('Failed to delete active session from PostgreSQL (queued for sync):', err);
      enqueuePendingOp({ opKey, entity: 'sessions', url, method: 'DELETE' }, [`upsert:session:${sessionId}`]);
      return false;
    }
  },

  async postMessage(msg: ChatMessage): Promise<{ ok: boolean; error?: string }> {
    const opKey = `upsert:message:${msg.id}`;
    try {
      const res = await fetchWithRetry('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(msg)
      });
      if (!res.ok && res.status >= 500) {
        enqueuePendingOp({ opKey, entity: 'messages', url: '/api/messages', method: 'POST', body: msg }, [`delete:message:${msg.id}`]);
      } else if (res.ok) {
        removePendingOp(opKey);
      }
      return { ok: res.ok };
    } catch (err) {
      console.warn('Failed to save message to PostgreSQL (queued for sync):', err);
      enqueuePendingOp({ opKey, entity: 'messages', url: '/api/messages', method: 'POST', body: msg }, [`delete:message:${msg.id}`]);
      return { ok: false, error: 'Falha ao enviar mensagem.' };
    }
  },

  async deleteMessage(msgId: string): Promise<boolean> {
    const opKey = `delete:message:${msgId}`;
    const url = `/api/messages/${encodeURIComponent(msgId)}`;
    try {
      const res = await fetchWithRetry(url, { method: 'DELETE' });
      if (!res.ok && res.status >= 500) {
        enqueuePendingOp({ opKey, entity: 'messages', url, method: 'DELETE' }, [`upsert:message:${msgId}`]);
        return false;
      }
      if (res.ok) removePendingOp(opKey);
      return res.ok;
    } catch (err) {
      console.warn('Failed to delete message from PostgreSQL (queued for sync):', err);
      enqueuePendingOp({ opKey, entity: 'messages', url, method: 'DELETE' }, [`upsert:message:${msgId}`]);
      return false;
    }
  },

  async postTournament(tournament: Tournament): Promise<{ ok: boolean; data?: Tournament; error?: string }> {
    const opKey = `upsert:tournament:${tournament.id}`;
    try {
      const res = await fetchWithRetry('/api/tournaments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tournament)
      });
      if (!res.ok) {
        if (res.status === 413) {
          return { ok: false, error: 'A foto do torneio é muito grande. Escolha uma imagem menor.' };
        }
        if (res.status >= 500) {
          enqueuePendingOp({ opKey, entity: 'tournaments', url: '/api/tournaments', method: 'POST', body: tournament }, [`delete:tournament:${tournament.id}`]);
        }
        let serverError = `Erro ao salvar torneio no banco (HTTP ${res.status}).`;
        try {
          const body = await res.json();
          if (body?.error) serverError = String(body.error);
        } catch {}
        return { ok: false, error: serverError };
      }
      removePendingOp(opKey);
      const data = await res.json().catch(() => undefined);
      return { ok: true, data };
    } catch (err) {
      console.warn('Failed to save tournament to PostgreSQL (queued for sync):', err);
      enqueuePendingOp({ opKey, entity: 'tournaments', url: '/api/tournaments', method: 'POST', body: tournament }, [`delete:tournament:${tournament.id}`]);
      return { ok: false, error: 'Sem conexão com o banco de dados ao salvar torneio.' };
    }
  },

  async deleteTournament(tournamentId: string): Promise<boolean> {
    const opKey = `delete:tournament:${tournamentId}`;
    const url = `/api/tournaments/${encodeURIComponent(tournamentId)}`;
    try {
      const res = await fetchWithRetry(url, { method: 'DELETE' });
      if (!res.ok && res.status >= 500) {
        enqueuePendingOp({ opKey, entity: 'tournaments', url, method: 'DELETE' }, [`upsert:tournament:${tournamentId}`]);
        return false;
      }
      if (res.ok) removePendingOp(opKey);
      return res.ok;
    } catch (err) {
      console.warn('Failed to delete tournament from PostgreSQL (queued for sync):', err);
      enqueuePendingOp({ opKey, entity: 'tournaments', url, method: 'DELETE' }, [`upsert:tournament:${tournamentId}`]);
      return false;
    }
  },

  async postNotification(notif: AppNotification): Promise<{ ok: boolean; error?: string }> {
    const opKey = `upsert:notif:${notif.id}`;
    try {
      const res = await fetchWithRetry('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(notif)
      });
      if (!res.ok && res.status >= 500) {
        enqueuePendingOp({ opKey, entity: 'notifications', url: '/api/notifications', method: 'POST', body: notif });
      } else if (res.ok) {
        removePendingOp(opKey);
      }
      return { ok: res.ok };
    } catch (err) {
      console.warn('Failed to save notification to PostgreSQL (queued for sync):', err);
      enqueuePendingOp({ opKey, entity: 'notifications', url: '/api/notifications', method: 'POST', body: notif });
      return { ok: false, error: 'Falha ao salvar notificação.' };
    }
  },

  async markNotificationRead(notifId: string): Promise<boolean> {
    const opKey = `read:notif:${notifId}`;
    const url = `/api/notifications/${encodeURIComponent(notifId)}/read`;
    try {
      const res = await fetchWithRetry(url, { method: 'PATCH' });
      if (!res.ok && res.status >= 500) {
        enqueuePendingOp({ opKey, entity: 'notifications', url, method: 'PATCH' });
        return false;
      }
      if (res.ok) removePendingOp(opKey);
      return res.ok;
    } catch (err) {
      console.warn('Failed to mark notification read in PostgreSQL (queued for sync):', err);
      enqueuePendingOp({ opKey, entity: 'notifications', url, method: 'PATCH' });
      return false;
    }
  },

  async postClubLogo(logoUrl: string): Promise<boolean> {
    const opKey = 'setting:club_logo';
    const body = { key: 'club_logo', value: logoUrl };
    try {
      const res = await fetchWithRetry('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      if (!res.ok && res.status >= 500) {
        enqueuePendingOp({ opKey, entity: 'settings', url: '/api/settings', method: 'POST', body });
        return false;
      }
      if (res.ok) removePendingOp(opKey);
      return res.ok;
    } catch (err) {
      console.warn('Failed to save club logo to PostgreSQL (queued for sync):', err);
      enqueuePendingOp({ opKey, entity: 'settings', url: '/api/settings', method: 'POST', body });
      return false;
    }
  },

  async postAchievements(achievements: Achievement[]): Promise<boolean> {
    const opKey = 'setting:achievements_config';
    const body = { key: 'achievements_config', value: JSON.stringify(achievements) };
    try {
      const res = await fetchWithRetry('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      if (!res.ok && res.status >= 500) {
        enqueuePendingOp({ opKey, entity: 'settings', url: '/api/settings', method: 'POST', body });
        return false;
      }
      if (res.ok) removePendingOp(opKey);
      return res.ok;
    } catch (err) {
      console.warn('Failed to save achievements configuration to PostgreSQL (queued for sync):', err);
      enqueuePendingOp({ opKey, entity: 'settings', url: '/api/settings', method: 'POST', body });
      return false;
    }
  },

  async postFeedPost(post: FeedPost): Promise<{ ok: boolean; post?: FeedPost; error?: string }> {
    const opKey = `upsert:post:${post.id}`;
    try {
      const res = await fetchWithRetry('/api/feed-posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(post)
      });
      if (!res.ok) {
        if (res.status === 413) {
          return { ok: false, error: 'As fotos ou vídeo da publicação excedem o limite do servidor. Escolha arquivos menores.' };
        }
        if (res.status >= 500) {
          enqueuePendingOp({ opKey, entity: 'feedPosts', url: '/api/feed-posts', method: 'POST', body: post }, [`delete:post:${post.id}`]);
        }
        let serverError = `Erro ao publicar no Feed (HTTP ${res.status}).`;
        try {
          const body = await res.json();
          if (body?.error) serverError = String(body.error);
        } catch {}
        return { ok: false, error: serverError };
      }
      removePendingOp(opKey);
      const payload = await res.json();
      return { ok: true, post: payload?.post || payload };
    } catch (err) {
      console.warn('Failed to save feed post to PostgreSQL (queued for sync):', err);
      enqueuePendingOp({ opKey, entity: 'feedPosts', url: '/api/feed-posts', method: 'POST', body: post }, [`delete:post:${post.id}`]);
      return { ok: false, error: 'Sem conexão com o servidor ao salvar publicação no Feed.' };
    }
  },

  async deleteFeedPost(postId: string): Promise<boolean> {
    const opKey = `delete:post:${postId}`;
    const url = `/api/feed-posts/${encodeURIComponent(postId)}`;
    try {
      const res = await fetchWithRetry(url, { method: 'DELETE' });
      if (!res.ok && res.status >= 500) {
        enqueuePendingOp({ opKey, entity: 'feedPosts', url, method: 'DELETE' }, [`upsert:post:${postId}`]);
        return false;
      }
      if (res.ok) removePendingOp(opKey);
      return res.ok;
    } catch (err) {
      console.warn('Failed to delete feed post from PostgreSQL (queued for sync):', err);
      enqueuePendingOp({ opKey, entity: 'feedPosts', url, method: 'DELETE' }, [`upsert:post:${postId}`]);
      return false;
    }
  },

  async toggleLikeFeedPost(postId: string, userId: string): Promise<FeedPost | null> {
    const opKey = `like:post:${postId}:${userId}`;
    const url = `/api/feed-posts/${encodeURIComponent(postId)}/like`;
    const body = { userId };
    try {
      const res = await fetchWithRetry(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      if (!res.ok) {
        if (res.status >= 500) enqueuePendingOp({ opKey, entity: 'feedPosts', url, method: 'POST', body });
        return null;
      }
      removePendingOp(opKey);
      const payload = await res.json();
      return payload?.post || null;
    } catch (err) {
      console.warn('Failed to like feed post in PostgreSQL (queued for sync):', err);
      enqueuePendingOp({ opKey, entity: 'feedPosts', url, method: 'POST', body });
      return null;
    }
  },

  async addCommentFeedPost(postId: string, comment: any): Promise<FeedPost | null> {
    const opKey = `comment:post:${postId}:${comment?.id || Date.now()}`;
    const url = `/api/feed-posts/${encodeURIComponent(postId)}/comment`;
    try {
      const res = await fetchWithRetry(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(comment)
      });
      if (!res.ok) {
        if (res.status >= 500) enqueuePendingOp({ opKey, entity: 'feedPosts', url, method: 'POST', body: comment });
        return null;
      }
      removePendingOp(opKey);
      const payload = await res.json();
      return payload?.post || null;
    } catch (err) {
      console.warn('Failed to comment feed post in PostgreSQL (queued for sync):', err);
      enqueuePendingOp({ opKey, entity: 'feedPosts', url, method: 'POST', body: comment });
      return null;
    }
  },

  async shareFeedPost(postId: string): Promise<FeedPost | null> {
    const opKey = `share:post:${postId}`;
    const url = `/api/feed-posts/${encodeURIComponent(postId)}/share`;
    try {
      const res = await fetchWithRetry(url, { method: 'POST' });
      if (!res.ok) {
        if (res.status >= 500) enqueuePendingOp({ opKey, entity: 'feedPosts', url, method: 'POST' });
        return null;
      }
      removePendingOp(opKey);
      const payload = await res.json();
      return payload?.post || null;
    } catch (err) {
      console.warn('Failed to share feed post in PostgreSQL (queued for sync):', err);
      enqueuePendingOp({ opKey, entity: 'feedPosts', url, method: 'POST' });
      return null;
    }
  },

  async postStory(story: Story): Promise<{ ok: boolean; story?: Story; error?: string }> {
    const opKey = `upsert:story:${story.id}`;
    try {
      const res = await fetchWithRetry('/api/stories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(story)
      });
      if (!res.ok) {
        if (res.status === 413) {
          return { ok: false, error: 'A foto ou vídeo do Story é muito grande. Escolha um arquivo menor.' };
        }
        if (res.status >= 500) {
          enqueuePendingOp({ opKey, entity: 'stories', url: '/api/stories', method: 'POST', body: story }, [`delete:story:${story.id}`]);
        }
        let serverError = `Erro ao salvar Story no banco (HTTP ${res.status}).`;
        try {
          const body = await res.json();
          if (body?.error) serverError = String(body.error);
        } catch {}
        return { ok: false, error: serverError };
      }
      removePendingOp(opKey);
      const payload = await res.json();
      return { ok: true, story: payload?.story || payload };
    } catch (err) {
      console.warn('Failed to save story to PostgreSQL (queued for sync):', err);
      enqueuePendingOp({ opKey, entity: 'stories', url: '/api/stories', method: 'POST', body: story }, [`delete:story:${story.id}`]);
      return { ok: false, error: 'Sem conexão com o servidor ao salvar Story.' };
    }
  },

  async deleteStory(storyId: string): Promise<boolean> {
    const opKey = `delete:story:${storyId}`;
    const url = `/api/stories/${encodeURIComponent(storyId)}`;
    try {
      const res = await fetchWithRetry(url, { method: 'DELETE' });
      if (!res.ok && res.status >= 500) {
        enqueuePendingOp({ opKey, entity: 'stories', url, method: 'DELETE' }, [`upsert:story:${storyId}`]);
        return false;
      }
      if (res.ok) removePendingOp(opKey);
      return res.ok;
    } catch (err) {
      console.warn('Failed to delete story from PostgreSQL (queued for sync):', err);
      enqueuePendingOp({ opKey, entity: 'stories', url, method: 'DELETE' }, [`upsert:story:${storyId}`]);
      return false;
    }
  },

  async fetchTackleCatalog(): Promise<TackleCatalog> {
    const cacheKey = 'barrantuba_tackle_catalog_v1';
    try {
      const res = await fetchWithRetry('/api/tackle/catalog', undefined, 2);
      if (res.ok) {
        const data = (await res.json()) as TackleCatalog;
        if (data?.species?.length && data?.rods?.length) {
          try {
            localStorage.setItem(cacheKey, JSON.stringify(data));
          } catch {}
          return data;
        }
      }
    } catch {
      // fall through to cache/default
    }
    try {
      const raw = localStorage.getItem(cacheKey);
      if (raw) {
        const parsed = JSON.parse(raw) as TackleCatalog;
        if (parsed?.species?.length) return parsed;
      }
    } catch {}
    return DEFAULT_TACKLE_CATALOG;
  },

  async fetchSavedTackleKits(userId?: string): Promise<SavedTackleKit[]> {
    const cacheKey = `barrantuba_saved_tackle_kits_v1_${userId || 'all'}`;
    try {
      await apiSync.flushPendingOps();
      const query = userId ? `?userId=${encodeURIComponent(userId)}` : '';
      const res = await fetchWithRetry(`/api/tackle/kits${query}`, undefined, 2);
      if (res.ok && !hasPendingOpsForEntity('tackleKits')) {
        const kits = (await res.json()) as SavedTackleKit[];
        if (Array.isArray(kits)) {
          try {
            localStorage.setItem(cacheKey, JSON.stringify(kits));
          } catch {}
          return kits;
        }
      }
    } catch {
      // fall through to local cache
    }
    try {
      const raw = localStorage.getItem(cacheKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
      }
    } catch {}
    return [];
  },

  async postTackleKit(kit: SavedTackleKit): Promise<boolean> {
    const cacheKey = `barrantuba_saved_tackle_kits_v1_${kit.userId || 'all'}`;
    try {
      const raw = localStorage.getItem(cacheKey);
      const curr: SavedTackleKit[] = raw ? JSON.parse(raw) : [];
      const next = [kit, ...curr.filter(k => k.id !== kit.id)];
      localStorage.setItem(cacheKey, JSON.stringify(next));
    } catch {}

    const opKey = `upsert:tackleKit:${kit.id}`;
    try {
      const res = await fetchWithRetry('/api/tackle/kits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(kit),
      });
      if (!res.ok) {
        if (res.status >= 500) {
          enqueuePendingOp({ opKey, entity: 'tackleKits', url: '/api/tackle/kits', method: 'POST', body: kit }, [`delete:tackleKit:${kit.id}`]);
        }
        return false;
      }
      removePendingOp(opKey);
      return true;
    } catch (err) {
      console.warn('Failed to save tackle kit to PostgreSQL (queued for sync):', err);
      enqueuePendingOp({ opKey, entity: 'tackleKits', url: '/api/tackle/kits', method: 'POST', body: kit }, [`delete:tackleKit:${kit.id}`]);
      return false;
    }
  },

  async deleteTackleKit(kitId: string, userId?: string): Promise<boolean> {
    const cacheKey = `barrantuba_saved_tackle_kits_v1_${userId || 'all'}`;
    try {
      const raw = localStorage.getItem(cacheKey);
      if (raw) {
        const curr: SavedTackleKit[] = JSON.parse(raw);
        localStorage.setItem(cacheKey, JSON.stringify(curr.filter(k => k.id !== kitId)));
      }
    } catch {}

    const opKey = `delete:tackleKit:${kitId}`;
    const url = `/api/tackle/kits/${encodeURIComponent(kitId)}`;
    try {
      const res = await fetchWithRetry(url, { method: 'DELETE' });
      if (!res.ok && res.status >= 500) {
        enqueuePendingOp({ opKey, entity: 'tackleKits', url, method: 'DELETE' }, [`upsert:tackleKit:${kitId}`]);
        return false;
      }
      if (res.ok) removePendingOp(opKey);
      return res.ok;
    } catch (err) {
      console.warn('Failed to delete tackle kit from PostgreSQL (queued for sync):', err);
      enqueuePendingOp({ opKey, entity: 'tackleKits', url, method: 'DELETE' }, [`upsert:tackleKit:${kitId}`]);
      return false;
    }
  }
};
