import { Component, ReactNode, useState, useEffect, useCallback, useRef } from 'react';
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
  Story,
  FeedComment
} from './types';
import { storage, apiSync, INITIAL_USERS } from './services/storageService';
import { prefetchSpotsLocationSpecies } from './services/cityWeatherService';
import { Navbar } from './components/Navbar';
import { InteractiveMap } from './components/InteractiveMap';
import { SpotDetailModal } from './components/SpotDetailModal';
import { NewSpotModal } from './components/NewSpotModal';
import { NewCatchModal } from './components/NewCatchModal';
import { ActiveFishersView } from './components/ActiveFishersView';
import { CatchLogView } from './components/CatchLogView';
import { LeaderboardView } from './components/LeaderboardView';
import { WeatherBiteTimeView } from './components/WeatherBiteTimeView';
import { TournamentsView } from './components/TournamentsView';
import { AdminPanel } from './components/AdminPanel';
import { AuthScreen } from './components/AuthScreen';
import { AnglerProfile } from './components/profile/AnglerProfile';
import { NewPublicationModal } from './components/profile/NewPublicationModal';
import { CatchDetailsModal } from './components/profile/CatchDetailsModal';
import { FeedView } from './components/FeedView';
import { TackleRecommendationView } from './components/TackleRecommendationView';
import { TackleKitRecommendation } from './services/tackleRecommendationEngine';

class AppErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error: unknown) {
    console.error('Erro inesperado na interface:', error);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen w-full bg-[#05111a] text-white flex items-center justify-center p-6">
          <div className="max-w-sm w-full bg-[#071625] border border-emerald-500/30 rounded-3xl p-6 text-center space-y-4 shadow-2xl">
            <h2 className="text-lg font-black">Ops! Algo precisou ser recarregado</h2>
            <p className="text-xs text-slate-400">
              Clique abaixo para restaurar a tela sem perder os dados salvos no banco.
            </p>
            <button
              type="button"
              onClick={() => {
                this.setState({ hasError: false });
              }}
              className="w-full py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs cursor-pointer"
            >
              Voltar ao aplicativo
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  return (
    <AppErrorBoundary>
      <AppContent />
    </AppErrorBoundary>
  );
}

function AppContent() {
  // Authentication
  const [currentUser, setCurrentUser] = useState<User | null>(() => storage.getCurrentUser());

  // Database states
  const [users, setUsers] = useState<User[]>(() => storage.getUsers());
  const [spots, setSpots] = useState<FishingSpot[]>(() => storage.getSpots());
  const [catches, setCatches] = useState<FishCatch[]>(() => storage.getCatches());
  const [activeSessions, setActiveSessions] = useState<ActiveFishingSession[]>(() => storage.getSessions());
  const [messages, setMessages] = useState<ChatMessage[]>(() => storage.getMessages());
  const [tournaments, setTournaments] = useState<Tournament[]>(() => storage.getTournaments());
  const [notifications, setNotifications] = useState<AppNotification[]>(() => storage.getNotifications());
  const [achievements, setAchievements] = useState<Achievement[]>(() => storage.getAchievements());
  const [feedPosts, setFeedPosts] = useState<FeedPost[]>(() => storage.getFeedPosts());
  const [stories, setStories] = useState<Story[]>(() => storage.getStories());

  // View & Modal states
  const [activeTab, setActiveTab] = useState<string>('map');
  const [selectedSpot, setSelectedSpot] = useState<FishingSpot | null>(null);
  const [showNewSpotModal, setShowNewSpotModal] = useState(false);
  const [pickedLatLng, setPickedLatLng] = useState<{ lat: number; lng: number } | null>(null);
  const [showNewCatchModal, setShowNewCatchModal] = useState(false);
  const [preselectedCatchSpotId, setPreselectedCatchSpotId] = useState<string | undefined>();
  const [selectedCatchForModal, setSelectedCatchForModal] = useState<FishCatch | null>(null);
  const [viewingProfileUser, setViewingProfileUser] = useState<User | null>(null);

  // Club logo state - prioritized with safe fallback
  const [clubLogo, setClubLogo] = useState<string>(() => {
    const saved = storage.getClubLogo();
    if (saved && !saved.startsWith('verify_logo') && saved.trim() !== '') return saved;
    return '/assets/barrantuba_logo_crest.jpg';
  });

  // Track in-flight saves so background sync/polling never overwrites unsaved or freshly-saved items
  const activeSaveCountRef = useRef(0);
  const mutationEpochRef = useRef(0);

  const runTrackedMutation = useCallback(async <T,>(fn: () => Promise<T>): Promise<T> => {
    activeSaveCountRef.current += 1;
    mutationEpochRef.current += 1;
    try {
      const result = await fn();
      mutationEpochRef.current += 1;
      return result;
    } finally {
      activeSaveCountRef.current = Math.max(0, activeSaveCountRef.current - 1);
    }
  }, []);

  const handleUpdateLogo = async (newLogo: string): Promise<boolean> => {
    setClubLogo(newLogo);
    storage.saveClubLogo(newLogo);
    const ok = await runTrackedMutation(() => apiSync.postClubLogo(newLogo));
    return ok;
  };

  // Full database synchronization helper (PostgreSQL -> UI + localStorage cache)
  const syncRemoteData = useCallback(async () => {
    const startEpoch = mutationEpochRef.current;
    if (activeSaveCountRef.current > 0) return;

    const remote = await apiSync.syncAllFromDatabase();
    if (activeSaveCountRef.current > 0 || startEpoch !== mutationEpochRef.current) return;

    if (remote.spots !== undefined) setSpots(remote.spots);
    if (remote.catches !== undefined) setCatches(remote.catches);
    if (remote.users && remote.users.length > 0) {
      setUsers(remote.users);
      const storedUser = storage.getCurrentUser();
      if (storedUser) {
        const matched = remote.users.find(
          u => u.id === storedUser.id || u.email.toLowerCase() === storedUser.email.toLowerCase()
        );
        if (matched) {
          const merged = { ...storedUser, ...matched };
          setCurrentUser(merged);
          storage.setCurrentUser(merged);
        }
      }
    }
    if (remote.sessions !== undefined) setActiveSessions(remote.sessions);
    if (remote.messages !== undefined) setMessages(remote.messages);
    if (remote.tournaments !== undefined) setTournaments(remote.tournaments);
    if (remote.notifications !== undefined) setNotifications(remote.notifications);
    if (remote.clubLogo) setClubLogo(remote.clubLogo);
    if (remote.achievements && remote.achievements.length > 0) setAchievements(remote.achievements);
    if (remote.feedPosts !== undefined) setFeedPosts(remote.feedPosts);
    if (remote.stories !== undefined) {
      const now = Date.now();
      const valid = remote.stories.filter(s => {
        const diff = now - new Date(s.createdAt).getTime();
        return Number.isNaN(diff) || diff < 24 * 3600 * 1000;
      });
      setStories(valid);
    }
  }, []);

  // Synchronize state with Cloud SQL PostgreSQL on mount & keep flushed on reconnect/focus/60s interval
  useEffect(() => {
    // Fast priority fetch for club logo so it's loaded instantly from PostgreSQL for all devices/networks
    fetch(`/api/settings/club_logo?t=${Date.now()}`, { cache: 'no-store' })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.value && typeof data.value === 'string' && data.value.trim() && !data.value.startsWith('verify_logo')) {
          setClubLogo(data.value);
          storage.saveClubLogo(data.value);
        }
      })
      .catch(() => {});

    void syncRemoteData();

    const handleReconnectOrFocus = () => {
      if (typeof navigator !== 'undefined' && navigator.onLine === false) return;
      void syncRemoteData();
    };
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        handleReconnectOrFocus();
      }
    };

    window.addEventListener('online', handleReconnectOrFocus);
    window.addEventListener('focus', handleReconnectOrFocus);
    document.addEventListener('visibilitychange', handleVisibility);
    const interval = setInterval(handleReconnectOrFocus, 60000);

    return () => {
      window.removeEventListener('online', handleReconnectOrFocus);
      window.removeEventListener('focus', handleReconnectOrFocus);
      document.removeEventListener('visibilitychange', handleVisibility);
      clearInterval(interval);
    };
  }, [syncRemoteData]);

  // Re-sync when logging in as a user
  useEffect(() => {
    if (currentUser?.id) {
      void syncRemoteData();
    }
  }, [currentUser?.id, syncRemoteData]);

  // Refresh users, feed posts, stories, and catches whenever entering the Feed tab
  useEffect(() => {
    if (activeTab !== 'feed' || !currentUser?.id) return;
    let cancelled = false;

    const refreshFeed = async () => {
      const startEpoch = mutationEpochRef.current;
      if (activeSaveCountRef.current > 0) return;

      const remote = await apiSync.refreshFeedAndUsers();
      if (cancelled || activeSaveCountRef.current > 0 || startEpoch !== mutationEpochRef.current) return;

      if (remote.users && remote.users.length > 0) {
        setUsers(remote.users);
        const me = remote.users.find(
          u => u.id === currentUser.id || u.email.toLowerCase() === currentUser.email.toLowerCase()
        );
        if (me) {
          setCurrentUser(prev => {
            if (!prev) return prev;
            const merged = { ...prev, ...me };
            storage.setCurrentUser(merged);
            return merged;
          });
        }
      }
      if (remote.feedPosts !== undefined) setFeedPosts(remote.feedPosts);
      if (remote.stories !== undefined) setStories(remote.stories);
      if (remote.catches !== undefined) setCatches(remote.catches);
    };

    refreshFeed();
    const interval = setInterval(refreshFeed, 15000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [activeTab, currentUser?.id]);

  // Sync state changes to local storage cache + prefetch online species for registered spots
  useEffect(() => {
    storage.saveSpots(spots);
    if (spots.length > 0) {
      void prefetchSpotsLocationSpecies(spots);
    }
  }, [spots]);

  useEffect(() => {
    storage.saveCatches(catches);
  }, [catches]);

  useEffect(() => {
    storage.saveSessions(activeSessions);
  }, [activeSessions]);

  useEffect(() => {
    storage.saveMessages(messages);
  }, [messages]);

  useEffect(() => {
    storage.saveTournaments(tournaments);
  }, [tournaments]);

  useEffect(() => {
    storage.saveNotifications(notifications);
  }, [notifications]);

  useEffect(() => {
    storage.saveAchievements(achievements);
  }, [achievements]);

  useEffect(() => {
    storage.saveFeedPosts(feedPosts);
  }, [feedPosts]);

  useEffect(() => {
    storage.saveStories(stories);
  }, [stories]);

  useEffect(() => {
    const stored = storage.getUsers();
    const merged = users.map(u => {
      const match = stored.find(s => s.id === u.id);
      return { ...u, passwordHash: (u as any).passwordHash || match?.passwordHash || 'barrantuba123' };
    });
    storage.saveUsers(merged);
  }, [users]);

  // Auth Handlers
  const handleLoginSuccess = (user: User) => {
    setCurrentUser(user);
    storage.setCurrentUser(user);
    setUsers(prev => {
      const exists = prev.some(
        u => u.id === user.id || u.email.toLowerCase() === user.email.toLowerCase()
      );
      return exists
        ? prev.map(u =>
            u.id === user.id || u.email.toLowerCase() === user.email.toLowerCase()
              ? { ...u, ...user }
              : u
          )
        : [...prev, user];
    });
    void syncRemoteData();
  };

  const handleLogout = () => {
    setCurrentUser(null);
    storage.setCurrentUser(null);
  };

  // Spot Handlers
  const handleSaveSpot = (newSpot: FishingSpot) => {
    const updated = [newSpot, ...spots];
    setSpots(updated);
    setSelectedSpot(newSpot);
    setActiveTab('map');
    // Save to PostgreSQL database
    void runTrackedMutation(() => apiSync.postSpot(newSpot));

    // Push notification
    const notif: AppNotification = {
      id: `notif_${Date.now()}`,
      title: '📍 Novo Ponto Cadastrado!',
      message: `${newSpot.createdByUserName} cadastrou o ponto "${newSpot.name}" no Barrantuba.`,
      type: 'admin',
      timestamp: new Date().toISOString(),
      read: false,
      linkTab: 'map'
    };
    setNotifications(prev => [notif, ...prev]);
    void runTrackedMutation(() => apiSync.postNotification(notif));
  };

  const handleDeleteSpot = (spotId: string) => {
    setSpots(prev => prev.filter(s => s.id !== spotId));
    if (selectedSpot?.id === spotId) setSelectedSpot(null);
    void runTrackedMutation(() => apiSync.deleteSpot(spotId));
  };

  // Catch Handlers (Awaited PostgreSQL persistence + Feed mirror)
  const handleSaveCatch = async (newCatch: FishCatch): Promise<{ ok: boolean; error?: string }> => {
    activeSaveCountRef.current += 1;
    mutationEpochRef.current += 1;

    try {
      const linkedPostId = `feed_catch_${newCatch.id}`;
      const existingPost = feedPosts.find(p => p.id === linkedPostId);
      const authorUser = users.find(u => u.id === newCatch.userId) || currentUser;
      const mediaList =
        newCatch.mediaUrls && newCatch.mediaUrls.length > 0
          ? newCatch.mediaUrls
          : newCatch.photoUrl
            ? [newCatch.photoUrl]
            : newCatch.videoUrl
              ? [newCatch.videoUrl]
              : [];
      const linkedPost: FeedPost = {
        id: linkedPostId,
        userId: newCatch.userId,
        userName: authorUser?.name || newCatch.userName,
        userAvatar: authorUser?.avatar || newCatch.userAvatar,
        userHandle: authorUser?.handle || `@${(newCatch.userName || 'pescador').toLowerCase().replace(/\s+/g, '')}`,
        createdAt: existingPost?.createdAt || newCatch.capturedAt || new Date().toISOString(),
        category: 'Pesca',
        text:
          newCatch.description?.trim() ||
          `Pescaria de ${newCatch.species} (${Number(newCatch.weightKg || 0).toFixed(2)}kg)${newCatch.baitUsed ? ` com ${newCatch.baitUsed}` : ''}${newCatch.spotName ? ` em ${newCatch.spotName}` : ''}.`,
        mediaUrls: mediaList,
        mediaType: !newCatch.photoUrl && newCatch.videoUrl ? 'video' : 'image',
        hashtags: ['#Pesca', newCatch.released ? '#PesqueESolte' : '#Trofeu', '#Barrantuba'],
        likes: existingPost?.likes || [newCatch.userId],
        likesCount: existingPost?.likesCount || 1,
        comments: existingPost?.comments || [],
        commentsCount: existingPost?.commentsCount || 0,
        sharesCount: existingPost?.sharesCount || 0,
        savedBy: existingPost?.savedBy || []
      };

      const [catchRes, postRes] = await Promise.all([
        apiSync.postCatch(newCatch),
        apiSync.postFeedPost(linkedPost)
      ]);

      if (!catchRes.ok) {
        return { ok: false, error: catchRes.error || 'Falha ao salvar captura no banco de dados.' };
      }
      if (!postRes.ok) {
        // Catch saved; retry/report feed failure cleanly
        return { ok: false, error: postRes.error || 'Falha ao publicar captura no Feed do banco de dados.' };
      }

      setCatches(prev => {
        const exists = prev.some(c => c.id === newCatch.id);
        return exists ? prev.map(c => (c.id === newCatch.id ? newCatch : c)) : [newCatch, ...prev];
      });

      const savedPost = postRes.post || linkedPost;
      setFeedPosts(prev => {
        const exists = prev.some(p => p.id === savedPost.id);
        return exists ? prev.map(p => (p.id === savedPost.id ? savedPost : p)) : [savedPost, ...prev];
      });

      if (newCatch.weightKg >= 4.0) {
        const trophyNotif: AppNotification = {
          id: `notif_trophy_${Date.now()}`,
          title: '🏆 Troféu Fisgado no Barrantuba!',
          message: `${newCatch.userName} registrou um(a) ${newCatch.species} de ${newCatch.weightKg}kg usando ${newCatch.baitUsed}!`,
          type: 'trophy',
          timestamp: new Date().toISOString(),
          read: false,
          linkTab: 'catches'
        };
        setNotifications(prev => [trophyNotif, ...prev]);
        apiSync.postNotification(trophyNotif);
      }

      mutationEpochRef.current += 1;
      return { ok: true };
    } finally {
      activeSaveCountRef.current = Math.max(0, activeSaveCountRef.current - 1);
    }
  };

  const handleDeleteCatch = (catchId: string) => {
    setCatches(prev => prev.filter(c => c.id !== catchId));
    void runTrackedMutation(() => apiSync.deleteCatch(catchId));
    handleDeletePost(`feed_catch_${catchId}`);
  };

  const handleToggleLike = (catchId: string) => {
    if (!currentUser) return;
    let targetUpdatedCatch: FishCatch | null = null;

    setCatches(prev => prev.map(c => {
      if (c.id === catchId) {
        const currentLikes = Array.isArray(c.likes) ? c.likes : [];
        const hasLiked = currentLikes.includes(currentUser.id);
        const newLikes = hasLiked
          ? currentLikes.filter(id => id !== currentUser.id)
          : [...currentLikes, currentUser.id];
        const updated = {
          ...c,
          likes: newLikes,
          likesCount: newLikes.length
        };
        targetUpdatedCatch = updated;
        return updated;
      }
      return c;
    }));

    if (targetUpdatedCatch) {
      const catchToSave = targetUpdatedCatch;
      void runTrackedMutation(() => apiSync.postCatch(catchToSave));
    }

    setSelectedCatchForModal(prev => {
      if (prev && prev.id === catchId && currentUser) {
        const currentLikes = Array.isArray(prev.likes) ? prev.likes : [];
        const hasLiked = currentLikes.includes(currentUser.id);
        const newLikes = hasLiked
          ? currentLikes.filter(id => id !== currentUser.id)
          : [...currentLikes, currentUser.id];
        return {
          ...prev,
          likes: newLikes,
          likesCount: newLikes.length
        };
      }
      return prev;
    });
  };

  // Live Fishing Session Handlers
  const handleStartSession = (session: ActiveFishingSession) => {
    // Remove previous session if same user had one
    const filtered = activeSessions.filter(s => s.userId !== session.userId);
    const updated = [session, ...filtered];
    setActiveSessions(updated);
    void runTrackedMutation(() => apiSync.postSession(session));

    // Send notification
    const notif: AppNotification = {
      id: `notif_live_${Date.now()}`,
      title: '🎣 Parceiro na Água!',
      message: `${session.userName} começou a pescar agora em "${session.spotName}". Junte-se à pescaria!`,
      type: 'active_fisher',
      timestamp: new Date().toISOString(),
      read: false,
      linkTab: 'active'
    };
    setNotifications(prev => [notif, ...prev]);
    void runTrackedMutation(() => apiSync.postNotification(notif));
  };

  const handleEndSession = (sessionId: string) => {
    setActiveSessions(prev => prev.filter(s => s.id !== sessionId));
    void runTrackedMutation(() => apiSync.deleteSession(sessionId));
  };

  // Chat Handlers
  const handleSendMessage = (msg: ChatMessage) => {
    setMessages(prev => [...prev, msg]);
    void runTrackedMutation(() => apiSync.postMessage(msg));
  };

  const handleDeleteMessage = (msgId: string) => {
    setMessages(prev => prev.filter(m => m.id !== msgId));
    void runTrackedMutation(() => apiSync.deleteMessage(msgId));
  };

  // Tournament Handlers
  const handleRegisterTournament = (tournamentId: string) => {
    if (!currentUser) return;
    const target = tournaments.find(t => t.id === tournamentId);
    if (!target) return;
    const isRegistered = target.registeredUserIds.includes(currentUser.id);
    const updatedTourn: Tournament = {
      ...target,
      registeredUserIds: isRegistered
        ? target.registeredUserIds.filter(id => id !== currentUser.id)
        : [...target.registeredUserIds, currentUser.id]
    };
    setTournaments(prev => prev.map(t => (t.id === tournamentId ? updatedTourn : t)));
    void runTrackedMutation(() => apiSync.postTournament(updatedTourn));
  };

  const handleCreateTournament = async (
    newTourn: Tournament
  ): Promise<{ ok: boolean; error?: string }> => {
    const wasExisting = tournaments.some(t => t.id === newTourn.id);
    const res = await runTrackedMutation(() => apiSync.postTournament(newTourn));
    if (!res.ok) {
      return {
        ok: false,
        error: res.error || 'Não foi possível salvar o torneio no banco de dados.',
      };
    }

    const savedTournament = res.data || newTourn;
    setTournaments(prev => {
      const exists = prev.some(t => t.id === savedTournament.id);
      return exists
        ? prev.map(t => (t.id === savedTournament.id ? savedTournament : t))
        : [savedTournament, ...prev];
    });

    if (!wasExisting) {
      // Send broadcast notification only on newly published tournaments
      const notif: AppNotification = {
        id: `notif_tourn_${Date.now()}`,
        title: '🏆 Novo Torneio Publicado!',
        message: `O torneio "${savedTournament.title}" está aberto para inscrições no Barrantuba. Participe!`,
        type: 'tournament',
        timestamp: new Date().toISOString(),
        read: false,
        linkTab: 'tournaments'
      };
      setNotifications(prev => [notif, ...prev]);
      void runTrackedMutation(() => apiSync.postNotification(notif));
    }
    return { ok: true };
  };

  const handleDeleteTournament = (tournamentId: string) => {
    setTournaments(prev => prev.filter(t => t.id !== tournamentId));
    void runTrackedMutation(() => apiSync.deleteTournament(tournamentId));
  };

  // Notifications
  const handleMarkNotificationRead = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    void runTrackedMutation(() => apiSync.markNotificationRead(id));
  };

  // Profile Update (awaits PostgreSQL confirmation before confirming to UI)
  const handleSaveProfile = async (
    updatedUser: User
  ): Promise<{ ok: boolean; error?: string; user?: User }> => {
    const storedUsers = storage.getUsers();
    const existing = storedUsers.find(
      u => u.id === updatedUser.id || u.email.toLowerCase() === updatedUser.email.toLowerCase()
    );
    const passwordHash =
      existing?.passwordHash || (updatedUser as any).passwordHash || 'barrantuba123';
    const userToSave = {
      ...updatedUser,
      passwordHash,
    };

    const res = await runTrackedMutation(() => apiSync.postUser(userToSave));
    if (!res.ok) {
      return {
        ok: false,
        error: res.error || 'Não foi possível gravar as alterações no banco de dados. Tente novamente.',
      };
    }

    const rawSaved = res.data && typeof res.data === 'object' ? res.data : updatedUser;
    const { passwordHash: _ignoredHash, ...cleanServerFields } = rawSaved as User & {
      passwordHash?: string;
    };
    const canonicalUser: User = {
      ...updatedUser,
      ...cleanServerFields,
    };

    setCurrentUser(canonicalUser);
    storage.setCurrentUser(canonicalUser);

    setUsers(prev => {
      const exists = prev.some(
        u =>
          u.id === canonicalUser.id ||
          u.id === updatedUser.id ||
          u.email.toLowerCase() === canonicalUser.email.toLowerCase()
      );
      return exists
        ? prev.map(u =>
            u.id === canonicalUser.id ||
            u.id === updatedUser.id ||
            u.email.toLowerCase() === canonicalUser.email.toLowerCase()
              ? { ...u, ...canonicalUser }
              : u
          )
        : [...prev, canonicalUser];
    });

    const userWithHash = { ...canonicalUser, passwordHash };
    const existsInStored = storedUsers.some(
      u =>
        u.id === canonicalUser.id ||
        u.id === updatedUser.id ||
        u.email.toLowerCase() === canonicalUser.email.toLowerCase()
    );
    const updatedList = existsInStored
      ? storedUsers.map(u =>
          u.id === canonicalUser.id ||
          u.id === updatedUser.id ||
          u.email.toLowerCase() === canonicalUser.email.toLowerCase()
            ? { ...u, ...userWithHash }
            : u
        )
      : [...storedUsers, userWithHash];
    storage.saveUsers(updatedList);

    // Reflect updated name/avatar/handle across authored local collections immediately
    const targetIds = new Set([updatedUser.id, canonicalUser.id]);
    setFeedPosts(prev =>
      prev.map(p =>
        targetIds.has(p.userId)
          ? {
              ...p,
              userName: canonicalUser.name,
              userAvatar: canonicalUser.avatar,
              userHandle: canonicalUser.handle || p.userHandle,
            }
          : p
      )
    );
    setStories(prev =>
      prev.map(s =>
        targetIds.has(s.userId)
          ? {
              ...s,
              userName: canonicalUser.name,
              userAvatar: canonicalUser.avatar,
              userHandle: canonicalUser.handle || s.userHandle,
            }
          : s
      )
    );
    setCatches(prev =>
      prev.map(c =>
        targetIds.has(c.userId)
          ? {
              ...c,
              userName: canonicalUser.name,
              userAvatar: canonicalUser.avatar,
            }
          : c
      )
    );
    setActiveSessions(prev =>
      prev.map(s =>
        targetIds.has(s.userId)
          ? {
              ...s,
              userName: canonicalUser.name,
              userAvatar: canonicalUser.avatar,
            }
          : s
      )
    );
    setMessages(prev =>
      prev.map(m =>
        targetIds.has(m.userId)
          ? {
              ...m,
              userName: canonicalUser.name,
              userAvatar: canonicalUser.avatar,
            }
          : m
      )
    );

    return { ok: true, user: canonicalUser };
  };

  // Admin Actions
  const handleUpdateUserRole = async (userId: string, newRole: 'admin' | 'member') => {
    let targetToSave: User | null = null;
    const updatedUsers = users.map(u => {
      if (u.id === userId) {
        targetToSave = { ...u, role: newRole };
        return targetToSave;
      }
      return u;
    });
    setUsers(updatedUsers);

    const stored = storage.getUsers();
    const withPasswords = updatedUsers.map(u => {
      const match = stored.find(s => s.id === u.id);
      return { ...u, passwordHash: match?.passwordHash || 'pesca123' };
    });
    storage.saveUsers(withPasswords);

    if (currentUser?.id === userId) {
      const updatedSelf = { ...currentUser, role: newRole };
      setCurrentUser(updatedSelf);
      storage.setCurrentUser(updatedSelf);
    }

    if (targetToSave) {
      const userToSave = targetToSave;
      await runTrackedMutation(() => apiSync.postUser(userToSave));
    }
  };

  const handleUpdateAchievements = async (newAchievements: Achievement[]) => {
    setAchievements(newAchievements);
    storage.saveAchievements(newAchievements);
    await runTrackedMutation(() => apiSync.postAchievements(newAchievements));
  };

  // Feed, Stories, Bookmark & Follow Handlers (all persisted atomically to PostgreSQL)
  const handleSavePost = async (newPost: FeedPost): Promise<{ ok: boolean; error?: string }> => {
    activeSaveCountRef.current += 1;
    mutationEpochRef.current += 1;

    try {
      const res = await apiSync.postFeedPost(newPost);
      if (!res.ok) {
        return { ok: false, error: res.error || 'Falha ao salvar publicação no banco de dados.' };
      }
      const savedPost = res.post || newPost;
      setFeedPosts(prev => {
        const exists = prev.some(p => p.id === savedPost.id);
        return exists ? prev.map(p => (p.id === savedPost.id ? savedPost : p)) : [savedPost, ...prev];
      });
      mutationEpochRef.current += 1;
      return { ok: true };
    } finally {
      activeSaveCountRef.current = Math.max(0, activeSaveCountRef.current - 1);
    }
  };

  const handleDeletePost = (postId: string) => {
    setFeedPosts(prev => prev.filter(p => p.id !== postId));
    void runTrackedMutation(() => apiSync.deleteFeedPost(postId));
  };

  const handleToggleLikePost = (postId: string) => {
    if (!currentUser) return;
    setFeedPosts(prev =>
      prev.map(p => {
        if (p.id !== postId) return p;
        const currentLikes = Array.isArray(p.likes) ? p.likes : [];
        const hasLiked = currentLikes.includes(currentUser.id);
        const newLikes = hasLiked
          ? currentLikes.filter(id => id !== currentUser.id)
          : [...currentLikes, currentUser.id];
        return {
          ...p,
          likes: newLikes,
          likesCount: newLikes.length
        };
      })
    );
    const uid = currentUser.id;
    void runTrackedMutation(() => apiSync.toggleLikeFeedPost(postId, uid)).then(serverPost => {
      if (serverPost) {
        setFeedPosts(prev => prev.map(p => (p.id === serverPost.id ? serverPost : p)));
      }
    });
  };

  const handleAddCommentPost = (postId: string, text: string) => {
    if (!currentUser || !text.trim()) return;
    const newComment: FeedComment = {
      id: `fcomm_${Date.now()}`,
      postId,
      userId: currentUser.id,
      userName: currentUser.name,
      userHandle: currentUser.handle || `@${currentUser.name.toLowerCase().replace(/\s+/g, '')}`,
      userAvatar: currentUser.avatar,
      text: text.trim(),
      createdAt: new Date().toISOString()
    };

    setFeedPosts(prev =>
      prev.map(p => {
        if (p.id !== postId) return p;
        const existingComments = Array.isArray(p.comments) ? p.comments : [];
        const updatedComments = [...existingComments, newComment];
        return {
          ...p,
          comments: updatedComments,
          commentsCount: updatedComments.length
        };
      })
    );
    void runTrackedMutation(() => apiSync.addCommentFeedPost(postId, newComment)).then(serverPost => {
      if (serverPost) {
        setFeedPosts(prev => prev.map(p => (p.id === serverPost.id ? serverPost : p)));
      }
    });
  };

  const handleSharePostCount = (postId: string) => {
    setFeedPosts(prev =>
      prev.map(p => (p.id === postId ? { ...p, sharesCount: (p.sharesCount || 0) + 1 } : p))
    );
    void runTrackedMutation(() => apiSync.shareFeedPost(postId)).then(serverPost => {
      if (serverPost) {
        setFeedPosts(prev => prev.map(p => (p.id === serverPost.id ? serverPost : p)));
      }
    });
  };

  const handleToggleSavePost = (postId: string) => {
    if (!currentUser) return;
    const currentSaved = Array.isArray(currentUser.savedPostIds) ? currentUser.savedPostIds : [];
    const alreadySaved = currentSaved.includes(postId);
    const updatedSavedIds = alreadySaved
      ? currentSaved.filter(id => id !== postId)
      : [postId, ...currentSaved];

    const stored = storage.getUsers();
    const passwordHash = stored.find(u => u.id === currentUser.id)?.passwordHash || 'barrantuba123';

    const updatedUser: User = {
      ...currentUser,
      savedPostIds: updatedSavedIds
    };

    setCurrentUser(updatedUser);
    storage.setCurrentUser(updatedUser);
    storage.saveSavedPostIds(updatedSavedIds);
    setUsers(prev => prev.map(u => (u.id === currentUser.id ? { ...u, savedPostIds: updatedSavedIds } : u)));
    void runTrackedMutation(() => apiSync.postUser({ ...updatedUser, passwordHash }));
  };

  const handleSaveStory = async (newStory: Story): Promise<{ ok: boolean; error?: string }> => {
    activeSaveCountRef.current += 1;
    mutationEpochRef.current += 1;

    try {
      const res = await apiSync.postStory(newStory);
      if (!res.ok) {
        return { ok: false, error: res.error || 'Falha ao salvar Story no banco de dados.' };
      }
      const savedStory = res.story || newStory;
      const now = Date.now();
      setStories(prev => {
        const validExisting = prev.filter(s => {
          if (s.id === savedStory.id) return false;
          const diff = now - new Date(s.createdAt).getTime();
          return Number.isNaN(diff) || diff < 24 * 3600 * 1000;
        });
        return [savedStory, ...validExisting];
      });
      mutationEpochRef.current += 1;
      return { ok: true };
    } finally {
      activeSaveCountRef.current = Math.max(0, activeSaveCountRef.current - 1);
    }
  };

  const handleToggleFollow = async (targetUserId: string) => {
    if (!currentUser || targetUserId === currentUser.id) return;

    const currentFollowing = Array.isArray(currentUser.following) ? currentUser.following : [];
    const isCurrentlyFollowing = currentFollowing.includes(targetUserId);

    const newFollowing = isCurrentlyFollowing
      ? currentFollowing.filter(id => id !== targetUserId)
      : [...currentFollowing, targetUserId];

    const updatedCurrentUser: User = {
      ...currentUser,
      following: newFollowing,
      followingCount: newFollowing.length
    };

    setCurrentUser(updatedCurrentUser);
    storage.setCurrentUser(updatedCurrentUser);

    setUsers(prev =>
      prev.map(u => {
        if (u.id === currentUser.id) {
          return {
            ...u,
            following: newFollowing,
            followingCount: newFollowing.length
          };
        }
        if (u.id === targetUserId) {
          const targetFollowers = Array.isArray(u.followers) ? u.followers : [];
          const newTargetFollowers = isCurrentlyFollowing
            ? targetFollowers.filter(id => id !== currentUser.id)
            : targetFollowers.includes(currentUser.id)
              ? targetFollowers
              : [...targetFollowers, currentUser.id];
          return {
            ...u,
            followers: newTargetFollowers,
            followersCount: newTargetFollowers.length
          };
        }
        return u;
      })
    );

    const res = await runTrackedMutation(() => apiSync.toggleFollow(currentUser.id, targetUserId));
    if (res && res.follower && res.target) {
      setCurrentUser(prev => {
        if (!prev || prev.id !== res.follower.id) return prev;
        const merged = { ...prev, ...res.follower };
        storage.setCurrentUser(merged);
        return merged;
      });
      setUsers(prev =>
        prev.map(u => {
          if (u.id === res.follower.id) return { ...u, ...res.follower };
          if (u.id === res.target.id) return { ...u, ...res.target };
          return u;
        })
      );
    }
  };

  const handleViewUserProfile = (userId: string) => {
    if (currentUser && userId === currentUser.id) {
      setViewingProfileUser(null);
      setActiveTab('profile');
      return;
    }
    const foundUser = users.find(u => u.id === userId) || INITIAL_USERS.find(u => u.id === userId);
    if (foundUser) {
      setViewingProfileUser(foundUser);
      setActiveTab('profile');
    }
  };

  const handleDeleteUser = (userId: string) => {
    setUsers(prev => prev.filter(u => u.id !== userId));
    void runTrackedMutation(() => apiSync.deleteUser(userId));
  };

  const handleBroadcastNotification = (notif: AppNotification) => {
    setNotifications(prev => [notif, ...prev]);
    void runTrackedMutation(() => apiSync.postNotification(notif));
  };

  const handleResetAllData = () => {
    storage.resetAllData();
    window.location.reload();
  };

  // If user is not logged in, render the Auth / Registration Screen
  if (!currentUser) {
    return (
      <div className="min-h-screen w-full bg-[#03080e] flex items-center justify-center sm:p-2">
        <div className="w-full sm:max-w-[430px] h-[100dvh] sm:h-[890px] sm:max-h-[96vh] bg-[#05111a] text-slate-100 flex flex-col relative overflow-hidden sm:rounded-[44px] sm:border-[8px] sm:border-slate-800/90 sm:shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9)] overflow-y-auto no-scrollbar">
          <AuthScreen onLoginSuccess={handleLoginSuccess} clubLogo={clubLogo} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-[#03080e] flex items-center justify-center sm:p-2">
      {/* Mobile Frame Container matching circled screenshot */}
      <div className="w-full sm:max-w-[430px] h-[100dvh] sm:h-[890px] sm:max-h-[96vh] bg-[#05111a] text-slate-100 flex flex-col relative overflow-hidden sm:rounded-[44px] sm:border-[8px] sm:border-slate-800/90 sm:shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9)]">
        {/* Top Navigation Bar */}
        <Navbar
          activeTab={activeTab}
          setActiveTab={(tab) => {
            if (tab === 'profile') {
              setViewingProfileUser(null);
            }
            setActiveTab(tab);
          }}
          currentUser={currentUser}
          notifications={notifications}
          activeSessions={activeSessions}
          clubLogo={clubLogo}
          onOpenProfile={() => {
            setViewingProfileUser(null);
            setActiveTab('profile');
          }}
          onLogout={handleLogout}
          onOpenFishingModal={() => {
            setActiveTab('active');
          }}
          onMarkNotificationRead={handleMarkNotificationRead}
        />

        {/* Main Content Area: Map is flexible/zoomable inside; other views scroll vertically */}
        {activeTab === 'map' ? (
          <main className="flex-1 w-full h-full relative overflow-hidden flex flex-col pb-16">
            <div className="flex-1 w-full h-full relative overflow-hidden">
              <InteractiveMap
                spots={spots}
                activeSessions={activeSessions}
                selectedSpotId={selectedSpot?.id}
                onSelectSpot={(spot) => setSelectedSpot(spot)}
                onOpenNewSpot={(latLng) => {
                  setPickedLatLng(latLng || null);
                  setShowNewSpotModal(true);
                }}
                onJoinSession={(_session) => {
                  setActiveTab('active');
                }}
              />
            </div>
          </main>
        ) : (
          <main className="flex-1 w-full overflow-y-auto no-scrollbar p-2 sm:p-3 pb-24">
            {activeTab === 'feed' && (
              <FeedView
                currentUser={currentUser}
                users={users}
                posts={feedPosts}
                stories={stories}
                onSavePost={handleSavePost}
                onDeletePost={handleDeletePost}
                onToggleLikePost={handleToggleLikePost}
                onAddCommentPost={handleAddCommentPost}
                onToggleSavePost={handleToggleSavePost}
                onSharePostCount={handleSharePostCount}
                onSaveStory={handleSaveStory}
                onToggleFollow={handleToggleFollow}
                onViewUserProfile={handleViewUserProfile}
              />
            )}

            {activeTab === 'catches' && (
              <CatchLogView
                catches={catches}
                currentUser={currentUser}
                onOpenNewCatch={() => {
                  setPreselectedCatchSpotId(undefined);
                  setShowNewCatchModal(true);
                }}
                onSelectCatch={(fish) => {
                  setSelectedCatchForModal(fish);
                }}
                onDeleteCatch={handleDeleteCatch}
                onToggleLike={handleToggleLike}
                onViewUserProfile={handleViewUserProfile}
                onOpenSpot={(spotId) => {
                  const sp = spots.find(s => s.id === spotId);
                  if (sp) {
                    setSelectedSpot(sp);
                    setActiveTab('map');
                  }
                }}
              />
            )}

            {activeTab === 'active' && (
              <ActiveFishersView
                sessions={activeSessions}
                spots={spots}
                currentUser={currentUser}
                onStartSession={handleStartSession}
                onEndSession={handleEndSession}
                onOpenMapToSpot={(spotId) => {
                  const sp = spots.find(s => s.id === spotId);
                  if (sp) {
                    setSelectedSpot(sp);
                    setActiveTab('map');
                  }
                }}
                onOpenChatWithFisher={(_session) => {
                  setActiveTab('active');
                }}
              />
            )}

            {activeTab === 'ranking' && (
              <LeaderboardView
                catches={catches}
                users={users}
              />
            )}

            {activeTab === 'weather' && (
              <WeatherBiteTimeView currentUser={currentUser} />
            )}

            {activeTab === 'tackle' && (
              <TackleRecommendationView
                currentUser={currentUser}
                onApplyKitToProfile={(kit: TackleKitRecommendation) => {
                  const leaderStr =
                    kit.lineAndLeader.leaderType === 'dispensável'
                      ? ''
                      : ` + Leader ${kit.lineAndLeader.leaderType} ${kit.lineAndLeader.leaderDiameterMm.toFixed(2).replace('.', ',')}mm`;
                  const updatedUser: User = {
                    ...currentUser,
                    equipment: {
                      ...currentUser.equipment,
                      rods: `${kit.rod.name} (${kit.rod.lineMinLb}-${kit.rod.lineMaxLb}lb, ação ${kit.rod.action})`,
                      reels: `${kit.reel.name} (Drag ${kit.reel.maxDragKg}kg, ${kit.reel.gearRatio})`,
                      lines: `${kit.lineAndLeader.lineName}${leaderStr}`,
                      favoriteLures: `${kit.baitAndHook.name} (${kit.baitAndHook.hookSize})`,
                    },
                  };
                  void handleSaveProfile(updatedUser);
                }}
              />
            )}

            {activeTab === 'profile' && (() => {
              const resolvedProfileUser = viewingProfileUser
                ? (users.find(u => u.id === viewingProfileUser.id) || viewingProfileUser)
                : currentUser;
              return (
                <AnglerProfile
                  currentUser={currentUser}
                  profileUser={resolvedProfileUser}
                  isViewingOtherProfile={resolvedProfileUser.id !== currentUser.id}
                  onBackToOwnProfile={() => setViewingProfileUser(null)}
                  catches={catches}
                  feedPosts={feedPosts}
                  spots={spots}
                  users={users}
                  achievements={achievements}
                  onSaveProfile={handleSaveProfile}
                  onSaveCatch={handleSaveCatch}
                  onToggleLike={handleToggleLike}
                  onDeleteCatch={handleDeleteCatch}
                  onToggleFollow={handleToggleFollow}
                  onViewUserProfile={handleViewUserProfile}
                  onOpenFeedTab={() => setActiveTab('feed')}
                  onLogout={handleLogout}
                />
              );
            })()}

            {activeTab === 'tournaments' && (
              <TournamentsView
                tournaments={tournaments}
                currentUser={currentUser}
                onRegisterTournament={handleRegisterTournament}
                onCreateTournament={handleCreateTournament}
                onDeleteTournament={handleDeleteTournament}
              />
            )}

            {activeTab === 'admin' && currentUser.role === 'admin' && (
              <AdminPanel
                currentUser={currentUser}
                users={users}
                spots={spots}
                catches={catches}
                tournaments={tournaments}
                activeSessions={activeSessions}
                clubLogo={clubLogo}
                achievements={achievements}
                onUpdateAchievements={handleUpdateAchievements}
                onUpdateLogo={handleUpdateLogo}
                onUpdateUserRole={handleUpdateUserRole}
                onDeleteUser={handleDeleteUser}
                onDeleteSpot={handleDeleteSpot}
                onDeleteCatch={handleDeleteCatch}
                onEndSession={handleEndSession}
                onBroadcastNotification={handleBroadcastNotification}
                onResetAllData={handleResetAllData}
              />
            )}
          </main>
        )}

        {/* Spot Detail Modal */}
        {selectedSpot && (
          <SpotDetailModal
            spot={selectedSpot}
            currentUser={currentUser}
            catches={catches}
            activeSessions={activeSessions}
            onClose={() => setSelectedSpot(null)}
            onStartFishingHere={(spot) => {
              const newSession: ActiveFishingSession = {
                id: `session_${currentUser.id}_${Date.now()}`,
                userId: currentUser.id,
                userName: currentUser.name,
                userAvatar: currentUser.avatar,
                spotId: spot.id,
                spotName: spot.name,
                latitude: spot.latitude,
                longitude: spot.longitude,
                startedAt: new Date().toISOString(),
                notes: 'Pescando neste ponto com isca de superfície. Quem quiser encostar, é só avisar!',
                targetSpecies: spot.targetSpecies,
                contactPhone: currentUser.phone
              };
              handleStartSession(newSession);
              setSelectedSpot(null);
              setActiveTab('active');
            }}
            onRegisterCatchHere={(spot) => {
              setPreselectedCatchSpotId(spot.id);
              setSelectedSpot(null);
              setShowNewCatchModal(true);
            }}
            onDeleteSpot={handleDeleteSpot}
            onJoinSession={(_session) => {
              setSelectedSpot(null);
              setActiveTab('active');
            }}
          />
        )}

        {/* New Spot Modal */}
        {showNewSpotModal && (
          <NewSpotModal
            initialLatLng={pickedLatLng}
            currentUser={currentUser}
            onClose={() => {
              setShowNewSpotModal(false);
              setPickedLatLng(null);
            }}
            onSave={handleSaveSpot}
          />
        )}

        {/* New Catch / Publication Modal matching Image 2 */}
        {showNewCatchModal && (
          <NewPublicationModal
            spots={spots}
            initialSpotId={preselectedCatchSpotId}
            currentUser={currentUser}
            onClose={() => setShowNewCatchModal(false)}
            onSaveCatch={handleSaveCatch}
          />
        )}

        {/* Catch Details Modal with Media Carousel, Likes, and Live Comments */}
        {selectedCatchForModal && (
          <CatchDetailsModal
            fishCatch={selectedCatchForModal}
            currentUser={currentUser}
            onClose={() => setSelectedCatchForModal(null)}
            onToggleLike={handleToggleLike}
            onViewUserProfile={(userId) => {
              setSelectedCatchForModal(null);
              handleViewUserProfile(userId);
            }}
            onAddComment={(catchId, comment) => {
              setCatches(prev => prev.map(c => {
                if (c.id === catchId) {
                  const updated = {
                    ...c,
                    comments: [...(c.comments || []), comment]
                  };
                  void runTrackedMutation(() => apiSync.postCatch(updated));
                  return updated;
                }
                return c;
              }));
              if (selectedCatchForModal.id === catchId) {
                setSelectedCatchForModal(prev => prev ? {
                  ...prev,
                  comments: [...(prev.comments || []), comment]
                } : null);
              }
            }}
            onDeleteCatch={handleDeleteCatch}
          />
        )}
      </div>
    </div>
  );
}
