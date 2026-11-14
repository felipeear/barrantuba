import { useState, useMemo } from 'react';
import { User, FeedPost, Story, FeedCategory } from '../types';
import { 
  Heart, 
  MessageCircle, 
  Share2, 
  Bookmark, 
  Plus, 
  Search, 
  MoreVertical, 
  Image as ImageIcon, 
  ChevronLeft,
  ChevronRight, 
  UserPlus, 
  UserCheck, 
  Compass,
  X
} from 'lucide-react';
import { CreatePostModal } from './feed/CreatePostModal';
import { CreateStoryModal } from './feed/CreateStoryModal';
import { StoryViewerModal } from './feed/StoryViewerModal';
import { PostCommentsModal } from './feed/PostCommentsModal';

interface FeedViewProps {
  currentUser: User;
  users: User[];
  posts: FeedPost[];
  stories: Story[];
  onSavePost: (post: FeedPost) => Promise<{ ok: boolean; error?: string } | void> | void;
  onDeletePost?: (postId: string) => void;
  onToggleLikePost: (postId: string) => void;
  onAddCommentPost: (postId: string, text: string) => void;
  onToggleSavePost: (postId: string) => void;
  onSharePostCount?: (postId: string) => void;
  onSaveStory: (story: Story) => Promise<{ ok: boolean; error?: string } | void> | void;
  onToggleFollow: (targetUserId: string) => void;
  onViewUserProfile: (userId: string) => void;
}

export function FeedView({
  currentUser,
  users,
  posts,
  stories,
  onSavePost,
  onDeletePost,
  onToggleLikePost,
  onAddCommentPost,
  onToggleSavePost,
  onSharePostCount,
  onSaveStory,
  onToggleFollow,
  onViewUserProfile
}: FeedViewProps) {
  // Feed Filters
  const [activeTab, setActiveTab] = useState<'following' | 'explore'>('following');
  const [selectedCategory, setSelectedCategory] = useState<string>('Todas');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);

  // Modals state
  const [showCreatePostModal, setShowCreatePostModal] = useState(false);
  const [showCreateStoryModal, setShowCreateStoryModal] = useState(false);
  const [viewingStoryIndex, setViewingStoryIndex] = useState<number | null>(null);
  const [activeCommentsPost, setActiveCommentsPost] = useState<FeedPost | null>(null);
  const [activePostMenuId, setActivePostMenuId] = useState<string | null>(null);
  const [postSlideIndices, setPostSlideIndices] = useState<Record<string, number>>({});

  // Double click like feedback
  const [likedAnimPostId, setLikedAnimPostId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  // Map of real registered members for live avatar/name hydration
  const realUsersMap = useMemo(() => {
    const map = new Map<string, User>();
    users.forEach(u => map.set(u.id, u));
    map.set(currentUser.id, currentUser);
    return map;
  }, [users, currentUser]);

  // Connected real members: people I follow + my followers + self (bidirectional visibility on Feed)
  const connectedUserIds = useMemo(() => {
    const ids = new Set<string>([currentUser.id]);
    (currentUser.following || []).forEach(id => ids.add(id));
    (currentUser.followers || []).forEach(id => ids.add(id));
    users.forEach(u => {
      if (u.following?.includes(currentUser.id) || u.followers?.includes(currentUser.id)) {
        ids.add(u.id);
      }
    });
    return ids;
  }, [currentUser.id, currentUser.following, currentUser.followers, users]);

  // 24h valid stories strictly from real registered members in the system
  // On 'Seguindo' tab: shows stories from followed members + followers + own stories
  // On 'Explorar' tab: shows stories from all real registered members
  const validStories = useMemo(() => {
    const now = Date.now();
    const followingIds = new Set(currentUser.following || []);
    const last24h = stories
      .filter(st => {
        if (!realUsersMap.has(st.userId)) return false;
        if (activeTab === 'following' && !connectedUserIds.has(st.userId)) {
          return false;
        }
        const ageMs = now - new Date(st.createdAt).getTime();
        return Number.isNaN(ageMs) || ageMs < 24 * 3600 * 1000;
      })
      .map(st => {
        const author = realUsersMap.get(st.userId);
        return author
          ? {
              ...st,
              userName: author.name,
              userHandle: author.handle || `@${author.name.toLowerCase().replace(/\s+/g, '')}`,
              userAvatar: author.avatar
            }
          : st;
      });

    return last24h.sort((a, b) => {
      if (a.userId === currentUser.id && b.userId !== currentUser.id) return -1;
      if (b.userId === currentUser.id && a.userId !== currentUser.id) return 1;
      const aFollowed = followingIds.has(a.userId) || connectedUserIds.has(a.userId);
      const bFollowed = followingIds.has(b.userId) || connectedUserIds.has(b.userId);
      if (aFollowed && !bFollowed) return -1;
      if (bFollowed && !aFollowed) return 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [stories, realUsersMap, currentUser.following, currentUser.id, activeTab, connectedUserIds]);

  // Search Members by name or @handle
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase().replace('@', '').trim();
    return users.filter(u => 
      u.id !== currentUser.id && (
        u.name.toLowerCase().includes(q) || 
        (u.handle && u.handle.toLowerCase().includes(q))
      )
    );
  }, [searchQuery, users, currentUser.id]);

  // Filtered Posts strictly from real registered members (Connected vs Explore + Category)
  const filteredPosts = useMemo(() => {
    let result = posts
      .filter(p => realUsersMap.has(p.userId))
      .map(p => {
        const author = realUsersMap.get(p.userId);
        const hydratedComments = (p.comments || [])
          .filter(c => realUsersMap.has(c.userId))
          .map(c => {
            const cAuthor = realUsersMap.get(c.userId);
            return cAuthor
              ? {
                  ...c,
                  userName: cAuthor.name,
                  userHandle: cAuthor.handle || `@${cAuthor.name.toLowerCase().replace(/\s+/g, '')}`,
                  userAvatar: cAuthor.avatar
                }
              : c;
          });
        return {
          ...p,
          userName: author?.name || p.userName,
          userHandle: author?.handle || p.userHandle,
          userAvatar: author?.avatar || p.userAvatar,
          comments: hydratedComments
        };
      });

    // Tab filtering: Following & Followers vs Explore
    if (activeTab === 'following') {
      // Include posts from followed real users + followers + own posts
      result = result.filter(p => connectedUserIds.has(p.userId));
    }

    // Category filtering
    if (selectedCategory !== 'Todas') {
      result = result.filter(p => p.category === selectedCategory);
    }

    // Sort chronologically (most recent first)
    return result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [posts, realUsersMap, activeTab, selectedCategory, connectedUserIds]);

  // Double click photo to like
  const handleDoubleClickPhoto = (postId: string) => {
    setLikedAnimPostId(postId);
    setTimeout(() => setLikedAnimPostId(null), 900);
    onToggleLikePost(postId);
  };

  // Share post action
  const handleSharePost = async (post: FeedPost) => {
    onSharePostCount?.(post.id);
    const shareText = `Confira a publicação de ${post.userName} no Barrantuba Clube de Pesca: "${post.text.slice(0, 80)}..."`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Barrantuba - Publicação de ${post.userName}`,
          text: shareText,
          url: window.location.href
        });
      } catch {}
    } else {
      navigator.clipboard?.writeText?.(`${shareText} - ${window.location.href}`);
      showToast('Link da publicação copiado!');
    }
  };

  // Calculate friendly time ago in PT-BR
  const formatTimeAgo = (dateStr: string) => {
    try {
      const diffMs = Date.now() - new Date(dateStr).getTime();
      const diffMin = Math.floor(diffMs / (60 * 1000));
      if (diffMin < 1) return 'Agora';
      if (diffMin < 60) return `Há ${diffMin} min`;
      const diffHrs = Math.floor(diffMin / 60);
      if (diffHrs < 24) return `Há ${diffHrs} ${diffHrs === 1 ? 'hora' : 'horas'}`;
      const diffDays = Math.floor(diffHrs / 24);
      if (diffDays === 1) return 'Há 1 dia';
      return `Há ${diffDays} dias`;
    } catch {
      return 'Há 2 horas';
    }
  };

  const isUserFollowing = (userId: string) => {
    return currentUser.following?.includes(userId) ?? false;
  };

  return (
    <div className="w-full flex flex-col space-y-3.5 select-none animate-fade-in pb-16">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-emerald-500 text-slate-950 font-black text-xs px-4 py-2 rounded-full shadow-2xl animate-bounce">
          {toastMessage}
        </div>
      )}

      {/* 1. Member Search Bar (Busca de Pescadores) */}
      <div className="relative">
        <div className="relative flex items-center">
          <Search className="absolute left-3.5 w-4 h-4 text-emerald-400 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onFocus={() => setShowSearchDropdown(true)}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setShowSearchDropdown(true);
            }}
            placeholder="Buscar parceiros de pesca por nome ou @..."
            className="w-full bg-[#071524] border border-slate-800 focus:border-emerald-500/80 rounded-2xl pl-10 pr-9 py-2.5 text-xs text-white placeholder-slate-500 outline-none transition-all shadow-inner"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setShowSearchDropdown(false);
              }}
              className="absolute right-3 p-1 rounded-full text-slate-400 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Search Results Dropdown */}
        {showSearchDropdown && searchQuery.trim() && (
          <div className="absolute top-12 inset-x-0 z-40 bg-[#071728] border border-emerald-500/30 rounded-2xl shadow-2xl p-2 max-h-72 overflow-y-auto space-y-1">
            {searchResults.length === 0 ? (
              <div className="p-4 text-center text-xs text-slate-400">
                Nenhum membro encontrado com "{searchQuery}".
              </div>
            ) : (
              searchResults.map(u => {
                const following = isUserFollowing(u.id);
                return (
                  <div 
                    key={u.id}
                    className="p-2 rounded-xl bg-[#091e33] hover:bg-[#0c2642] flex items-center justify-between gap-2 transition-colors"
                  >
                    <div 
                      onClick={() => {
                        setShowSearchDropdown(false);
                        onViewUserProfile(u.id);
                      }}
                      className="flex items-center gap-2.5 min-w-0 flex-1 cursor-pointer"
                    >
                      <img 
                        src={u.avatar} 
                        alt={u.name} 
                        className="w-9 h-9 rounded-full object-cover ring-1 ring-emerald-400/80 shrink-0" 
                      />
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-white truncate flex items-center gap-1">
                          <span>{u.name}</span>
                          {u.role === 'admin' && (
                            <span className="text-[9px] bg-amber-500/20 text-amber-300 px-1 rounded font-mono">
                              ADMIN
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-emerald-400 font-mono truncate">
                          {u.handle || `@${u.name.toLowerCase()}`}
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        onToggleFollow(u.id);
                        showToast(following ? `Deixou de seguir ${u.name}` : `Agora você segue ${u.name}!`);
                      }}
                      className={`px-3 py-1.5 rounded-xl text-[11px] font-extrabold transition-all cursor-pointer flex items-center gap-1 shrink-0 ${
                        following
                          ? 'bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700'
                          : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-md shadow-emerald-500/20'
                      }`}
                    >
                      {following ? (
                        <>
                          <UserCheck className="w-3.5 h-3.5" />
                          <span>Seguindo</span>
                        </>
                      ) : (
                        <>
                          <UserPlus className="w-3.5 h-3.5" />
                          <span>Seguir</span>
                        </>
                      )}
                    </button>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* 2. Top Stories Carousel matching Image 2 */}
      <div className="relative bg-[#05131f] border border-slate-800/80 rounded-3xl p-3 shadow-md">
        <div className="flex items-center gap-3 overflow-x-auto no-scrollbar py-0.5">
          {/* "+ Criar Story" Button */}
          <div 
            onClick={() => setShowCreateStoryModal(true)}
            className="flex flex-col items-center gap-1.5 cursor-pointer shrink-0 group select-none"
          >
            <div className="relative w-16 h-16 rounded-full p-0.5 ring-2 ring-emerald-400 ring-offset-2 ring-offset-[#05131f] bg-[#071929] flex items-center justify-center transition-transform group-hover:scale-105 overflow-hidden">
              <img 
                src={currentUser.avatar} 
                alt={currentUser.name} 
                className="w-full h-full object-cover rounded-full opacity-60 group-hover:opacity-80 transition-opacity" 
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-7 h-7 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center shadow-lg shadow-emerald-500/40">
                  <Plus className="w-4 h-4 stroke-[3]" />
                </div>
              </div>
            </div>
            <span className="text-[11px] font-bold text-slate-200 tracking-tight leading-none group-hover:text-emerald-400">
              Criar Story
            </span>
          </div>

          {/* Members Stories list (24h active, real registered members only) */}
          {validStories.length === 0 ? (
            <div className="flex-1 flex items-center pl-1 pr-2">
              <p className="text-[11px] text-slate-400 leading-snug">
                {activeTab === 'following'
                  ? 'Nenhum story ativo nas últimas 24h dos membros que você segue ou seus seguidores. Publique o seu!'
                  : 'Nenhum story ativo nas últimas 24h. Publique o seu ou aguarde os membros do clube!'}
              </p>
            </div>
          ) : (
            <>
              {validStories.map((st, idx) => (
                <div
                  key={st.id}
                  onClick={() => setViewingStoryIndex(idx)}
                  className="flex flex-col items-center gap-1.5 cursor-pointer shrink-0 group select-none"
                >
                  <div className="w-16 h-16 rounded-full p-0.5 ring-2 ring-emerald-400 ring-offset-2 ring-offset-[#05131f] transition-transform group-hover:scale-105 bg-slate-900 overflow-hidden shadow-md">
                    <img
                      src={st.userAvatar}
                      alt={st.userName}
                      className="w-full h-full object-cover rounded-full"
                    />
                  </div>
                  <span className="text-[11px] font-semibold text-slate-300 tracking-tight leading-none group-hover:text-white max-w-[68px] truncate text-center">
                    {st.userName}
                  </span>
                </div>
              ))}

              {/* "Ver mais" Arrow Button when there are active stories */}
              {validStories.length > 3 && (
                <div 
                  onClick={() => setViewingStoryIndex(0)}
                  className="flex flex-col items-center gap-1.5 cursor-pointer shrink-0 select-none group"
                >
                  <div className="w-16 h-16 rounded-full border border-slate-700 bg-slate-900/80 hover:bg-slate-800 flex items-center justify-center text-slate-400 group-hover:text-white transition-all shadow-inner">
                    <ChevronRight className="w-6 h-6 stroke-[2.2]" />
                  </div>
                  <span className="text-[11px] font-semibold text-slate-400 tracking-tight leading-none group-hover:text-slate-200">
                    Ver mais
                  </span>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* 3. Create Publication Quick Bar (Peskar / Instagram Style) */}
      <div 
        onClick={() => setShowCreatePostModal(true)}
        className="bg-[#071624] border border-emerald-500/25 hover:border-emerald-500/50 rounded-2xl p-3 flex items-center gap-3 cursor-pointer shadow-md transition-all group"
      >
        <img 
          src={currentUser.avatar} 
          alt={currentUser.name} 
          className="w-9 h-9 rounded-full object-cover ring-2 ring-emerald-400/80 shrink-0" 
        />
        <div className="flex-1 bg-[#05101a] border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-400 group-hover:text-slate-200 transition-colors">
          Compartilhe sua pescaria, aventura ou treino...
        </div>
        <div className="w-8 h-8 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0 group-hover:bg-emerald-500 group-hover:text-slate-950 transition-colors">
          <ImageIcon className="w-4 h-4" />
        </div>
      </div>

      {/* 4. Filter Tabs: "Seguindo" vs "Explorar" + Categories Pills */}
      <div className="space-y-2">
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
          {/* Main Feed Tab Buttons */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('following')}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                activeTab === 'following'
                  ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                  : 'bg-slate-900/80 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              Seguindo ({currentUser.following?.length || 0})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('explore')}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                activeTab === 'explore'
                  ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                  : 'bg-slate-900/80 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              Explorar Comunidade
            </button>
          </div>

          <button
            type="button"
            onClick={() => setShowCreatePostModal(true)}
            className="flex items-center gap-1 text-[11px] font-extrabold text-emerald-400 hover:text-emerald-300 transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 stroke-[3]" />
            <span>Publicar</span>
          </button>
        </div>

        {/* Category Pills (Pesca, Corrida, Aventura, Eventos...) */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
          {[
            'Todas',
            'Pesca',
            'Corrida',
            'Aventura',
            'Eventos',
            'Equipamentos',
            'Geral'
          ].map(cat => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`px-2.5 py-1 rounded-xl text-[11px] font-bold whitespace-nowrap transition-all cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-emerald-500/20 border border-emerald-400 text-emerald-300 shadow-sm'
                  : 'bg-slate-900/80 text-slate-400 border border-slate-800 hover:border-slate-700 hover:text-white'
              }`}
            >
              {cat === 'Todas' ? '🔥 Todas' : cat === 'Pesca' ? '🎣 Pesca' : cat === 'Corrida' ? '🏃 Corrida' : cat === 'Aventura' ? '🌲 Aventura' : cat === 'Eventos' ? '🏆 Eventos' : cat}
            </button>
          ))}
        </div>
      </div>

      {/* 5. Feed Publications List */}
      <div className="space-y-4">
        {filteredPosts.length === 0 ? (
          <div className="p-8 bg-[#061423] border border-slate-800 rounded-3xl text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
              <Compass className="w-6 h-6 stroke-[1.8]" />
            </div>
            <div>
              <h4 className="text-sm font-extrabold text-white">Nenhuma publicação por aqui ainda</h4>
              <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
                {activeTab === 'following'
                  ? 'Nenhuma publicação de quem você segue ou dos seus seguidores nesta categoria ainda. Mude para "Explorar Comunidade" para ver todos os membros!'
                  : 'Seja o primeiro pescador a postar nessa categoria no Barrantuba!'}
              </p>
            </div>
            {activeTab === 'following' ? (
              <button
                type="button"
                onClick={() => setActiveTab('explore')}
                className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs transition-all cursor-pointer"
              >
                Ver no Explorar
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setShowCreatePostModal(true)}
                className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs transition-all cursor-pointer"
              >
                Criar Publicação Agora
              </button>
            )}
          </div>
        ) : (
          filteredPosts.map(post => {
            const hasLiked = post.likes?.includes(currentUser.id) ?? false;
            const isSaved = currentUser.savedPostIds?.includes(post.id) ?? false;
            const isAuthor = post.userId === currentUser.id;
            const followingAuthor = isUserFollowing(post.userId);

            return (
              <article 
                key={post.id}
                className="bg-[#071524] border border-slate-800/90 rounded-3xl p-3.5 space-y-3 shadow-xl transition-all"
              >
                {/* Post Header matching Image 2 */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <img
                      src={post.userAvatar}
                      alt={post.userName}
                      onClick={() => onViewUserProfile(post.userId)}
                      className="w-10 h-10 rounded-full object-cover ring-2 ring-emerald-400/80 cursor-pointer hover:scale-105 transition-transform shrink-0"
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span 
                          onClick={() => onViewUserProfile(post.userId)}
                          className="font-extrabold text-xs sm:text-sm text-white hover:text-emerald-400 cursor-pointer truncate"
                        >
                          {post.userName}
                        </span>
                        {!isAuthor && !followingAuthor && (
                          <button
                            type="button"
                            onClick={() => {
                              onToggleFollow(post.userId);
                              showToast(`Agora você segue ${post.userName}!`);
                            }}
                            className="text-[10px] font-black text-emerald-400 hover:text-emerald-300 cursor-pointer"
                          >
                            • Seguir
                          </button>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-400 font-medium flex items-center gap-1.5">
                        <span>{formatTimeAgo(post.createdAt)}</span>
                        <span>•</span>
                        <span className="text-slate-300 font-semibold">{post.category}</span>
                      </div>
                    </div>
                  </div>

                  {/* 3-dots Menu Button */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setActivePostMenuId(activePostMenuId === post.id ? null : post.id)}
                      className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-slate-850/80 transition-colors cursor-pointer"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>

                    {activePostMenuId === post.id && (
                      <div className="absolute right-0 mt-1 w-44 bg-[#081b2d] border border-slate-800 rounded-2xl shadow-2xl py-1.5 z-30">
                        <button
                          type="button"
                          onClick={() => {
                            setActivePostMenuId(null);
                            handleSharePost(post);
                          }}
                          className="w-full text-left px-3.5 py-2 text-xs text-slate-200 hover:bg-slate-800/80 flex items-center gap-2"
                        >
                          <Share2 className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Compartilhar</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setActivePostMenuId(null);
                            onToggleSavePost(post.id);
                            showToast(isSaved ? 'Removido dos salvos' : 'Publicação salva com sucesso!');
                          }}
                          className="w-full text-left px-3.5 py-2 text-xs text-slate-200 hover:bg-slate-800/80 flex items-center gap-2"
                        >
                          <Bookmark className="w-3.5 h-3.5 text-amber-400" />
                          <span>{isSaved ? 'Remover dos salvos' : 'Salvar publicação'}</span>
                        </button>
                        {(isAuthor || currentUser.role === 'admin') && onDeletePost && (
                          <button
                            type="button"
                            onClick={() => {
                              setActivePostMenuId(null);
                              onDeletePost(post.id);
                              showToast('Publicação excluída.');
                            }}
                            className="w-full text-left px-3.5 py-2 text-xs text-rose-400 hover:bg-rose-950/40 flex items-center gap-2 border-t border-slate-800 mt-1 cursor-pointer"
                          >
                            <span>Excluir publicação</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Post Text & Hashtags */}
                <div className="space-y-1">
                  <p className="text-xs sm:text-sm text-slate-100 font-medium leading-relaxed whitespace-pre-line">
                    {post.text}
                  </p>
                  {post.hashtags && post.hashtags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-0.5">
                      {post.hashtags.map(tag => (
                        <span 
                          key={tag}
                          className="text-[11px] font-bold text-emerald-400 hover:underline cursor-pointer"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Media Image / Video matching Image 2 with rounded corners & multi-photo carousel */}
                {post.mediaUrls && post.mediaUrls.length > 0 && (() => {
                  const slideIdx = postSlideIndices[post.id] || 0;
                  const safeIdx = Math.min(slideIdx, post.mediaUrls.length - 1);
                  const hasMultiple = post.mediaType !== 'video' && post.mediaUrls.length > 1;
                  return (
                    <div 
                      onDoubleClick={() => handleDoubleClickPhoto(post.id)}
                      className="relative w-full rounded-2xl overflow-hidden border border-slate-800/80 bg-black cursor-pointer group shadow-lg"
                    >
                      {post.mediaType === 'video' ? (
                        <video 
                          src={post.mediaUrls[0]} 
                          controls 
                          playsInline 
                          className="w-full max-h-[420px] object-cover" 
                        />
                      ) : (
                        <img 
                          src={post.mediaUrls[safeIdx]} 
                          alt="Foto da publicação" 
                          className="w-full max-h-[420px] object-cover transition-transform group-hover:scale-[1.01]" 
                        />
                      )}

                      {hasMultiple && (
                        <>
                          {safeIdx > 0 && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setPostSlideIndices(prev => ({ ...prev, [post.id]: safeIdx - 1 }));
                              }}
                              className="absolute left-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-black/60 text-white hover:bg-black/80 cursor-pointer"
                            >
                              <ChevronLeft className="w-4 h-4" />
                            </button>
                          )}
                          {safeIdx < post.mediaUrls.length - 1 && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setPostSlideIndices(prev => ({ ...prev, [post.id]: safeIdx + 1 }));
                              }}
                              className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-black/60 text-white hover:bg-black/80 cursor-pointer"
                            >
                              <ChevronRight className="w-4 h-4" />
                            </button>
                          )}
                          <div className="absolute bottom-2.5 inset-x-0 flex items-center justify-center gap-1.5 pointer-events-none">
                            {post.mediaUrls.map((_, i) => (
                              <span
                                key={i}
                                className={`h-1.5 rounded-full transition-all ${
                                  i === safeIdx ? 'w-4 bg-emerald-400' : 'w-1.5 bg-white/50'
                                }`}
                              />
                            ))}
                          </div>
                        </>
                      )}

                      {/* Double Click Heart Animation */}
                      {likedAnimPostId === post.id && (
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none animate-ping">
                          <Heart className="w-20 h-20 text-emerald-400 fill-emerald-400 drop-shadow-2xl" />
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* Interactions Action Bar matching Image 2: Heart, Comment, Share, Bookmark */}
                <div className="flex items-center justify-between pt-1 text-slate-300">
                  <div className="flex items-center gap-4">
                    {/* Like button */}
                    <button
                      type="button"
                      onClick={() => onToggleLikePost(post.id)}
                      className="flex items-center gap-1.5 transition-colors cursor-pointer group"
                    >
                      <Heart 
                        className={`w-5 h-5 transition-transform group-active:scale-125 ${
                          hasLiked ? 'text-emerald-400 fill-emerald-400' : 'text-slate-400 hover:text-emerald-400'
                        }`} 
                      />
                      <span className={`text-xs font-black ${hasLiked ? 'text-emerald-400' : 'text-slate-300'}`}>
                        {post.likesCount || 0}
                      </span>
                    </button>

                    {/* Comments button */}
                    <button
                      type="button"
                      onClick={() => setActiveCommentsPost(post)}
                      className="flex items-center gap-1.5 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
                    >
                      <MessageCircle className="w-5 h-5" />
                      <span className="text-xs font-black text-slate-300">
                        {post.comments?.length || post.commentsCount || 0}
                      </span>
                    </button>

                    {/* Share button */}
                    <button
                      type="button"
                      onClick={() => handleSharePost(post)}
                      className="flex items-center gap-1.5 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
                    >
                      <Share2 className="w-5 h-5" />
                      <span className="text-xs font-black text-slate-300">
                        {post.sharesCount || 0}
                      </span>
                    </button>
                  </div>

                  {/* Bookmark / Save button */}
                  <button
                    type="button"
                    onClick={() => {
                      onToggleSavePost(post.id);
                      showToast(isSaved ? 'Removido dos salvos' : 'Publicação salva!');
                    }}
                    className={`p-1 transition-colors cursor-pointer ${
                      isSaved ? 'text-emerald-400' : 'text-slate-400 hover:text-white'
                    }`}
                    title={isSaved ? 'Salvo' : 'Salvar publicação'}
                  >
                    <Bookmark className={`w-5 h-5 ${isSaved ? 'fill-emerald-400' : ''}`} />
                  </button>
                </div>

                {/* Comments preview snippet */}
                {post.comments && post.comments.length > 0 && (
                  <div className="pt-1 border-t border-slate-800/60">
                    <button
                      type="button"
                      onClick={() => setActiveCommentsPost(post)}
                      className="text-[11px] text-slate-400 hover:text-slate-200 font-semibold cursor-pointer block"
                    >
                      Ver todos os {post.comments.length} comentários...
                    </button>
                    <div className="text-[11px] text-slate-300 truncate mt-0.5">
                      <span className="font-bold text-white mr-1">
                        {post.comments[post.comments.length - 1].userName}:
                      </span>
                      {post.comments[post.comments.length - 1].text}
                    </div>
                  </div>
                )}
              </article>
            );
          })
        )}
      </div>

      {/* Modals */}
      {showCreatePostModal && (
        <CreatePostModal
          currentUser={currentUser}
          onClose={() => setShowCreatePostModal(false)}
          onSavePost={async (newPost) => {
            const res = await onSavePost(newPost);
            if (!res || res.ok !== false) {
              showToast('Publicado com sucesso no Feed!');
            }
            return res;
          }}
        />
      )}

      {showCreateStoryModal && (
        <CreateStoryModal
          currentUser={currentUser}
          onClose={() => setShowCreateStoryModal(false)}
          onSaveStory={async (newStory) => {
            const res = await onSaveStory(newStory);
            if (!res || res.ok !== false) {
              showToast('Story de 24h publicado com sucesso!');
            }
            return res;
          }}
        />
      )}

      {viewingStoryIndex !== null && validStories.length > 0 && (
        <StoryViewerModal
          stories={validStories}
          initialIndex={Math.min(viewingStoryIndex, validStories.length - 1)}
          currentUser={currentUser}
          onClose={() => setViewingStoryIndex(null)}
          onViewUserProfile={onViewUserProfile}
        />
      )}

      {activeCommentsPost && (
        <PostCommentsModal
          post={activeCommentsPost}
          currentUser={currentUser}
          onClose={() => setActiveCommentsPost(null)}
          onViewUserProfile={onViewUserProfile}
          onAddComment={(postId, text) => {
            onAddCommentPost(postId, text);
            // Update active modal post reference
            setActiveCommentsPost(prev => {
              if (!prev || prev.id !== postId) return prev;
              const newComm = {
                id: `comm_${currentUser.id}_${Date.now()}`,
                postId,
                userId: currentUser.id,
                userName: currentUser.name,
                userHandle: currentUser.handle || `@${currentUser.name.toLowerCase()}`,
                userAvatar: currentUser.avatar,
                text,
                createdAt: new Date().toISOString()
              };
              return {
                ...prev,
                comments: [...(prev.comments || []), newComm],
                commentsCount: (prev.comments?.length || 0) + 1
              };
            });
            showToast('Comentário publicado!');
          }}
        />
      )}
    </div>
  );
}
