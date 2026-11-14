import { useState, useEffect } from 'react';
import { 
  User, 
  FishCatch, 
  FishingSpot, 
  EquipmentItem, 
  CatchComment,
  Achievement,
  FeedPost
} from '../../types';
import { 
  Plus, 
  Menu, 
  ShieldCheck, 
  MapPin, 
  LayoutGrid, 
  Fish, 
  Bookmark, 
  Trophy, 
  Heart, 
  MessageCircle, 
  Camera, 
  Wrench, 
  Scale, 
  Ruler, 
  Share2, 
  Sliders, 
  Award, 
  Sparkles, 
  UserCheck, 
  Anchor,
  Compass,
  CheckCircle2,
  Lock,
  ChevronRight,
  EyeOff
} from 'lucide-react';
import { NewPublicationModal } from './NewPublicationModal';
import { CatchDetailsModal } from './CatchDetailsModal';
import { EquipmentModal } from './EquipmentModal';
import { FollowersModal } from './FollowersModal';
import { EditProfileModal } from './EditProfileModal';
import { DEFAULT_ACHIEVEMENTS } from '../../services/storageService';

interface AnglerProfileProps {
  currentUser: User;
  profileUser?: User;
  viewingUser?: User;
  isViewingOtherProfile?: boolean;
  catches: FishCatch[];
  feedPosts?: FeedPost[];
  spots: FishingSpot[];
  users: User[];
  achievements?: Achievement[];
  onBackToOwnProfile?: () => void;
  onSaveProfile: (updated: User) => Promise<{ ok: boolean; error?: string; user?: User } | void> | void;
  onSaveCatch: (newCatch: FishCatch) => Promise<{ ok: boolean; error?: string } | void> | void;
  onToggleLike: (catchId: string) => void;
  onDeleteCatch?: (catchId: string) => void;
  onToggleFollow?: (targetUserId: string) => void;
  onViewUserProfile?: (userId: string) => void;
  onOpenFeedTab?: () => void;
  onLogout?: () => void;
}

export function AnglerProfile({
  currentUser,
  profileUser: propProfileUser,
  viewingUser,
  isViewingOtherProfile: _propIsViewingOther,
  catches,
  feedPosts = [],
  spots,
  users,
  achievements = [],
  onBackToOwnProfile,
  onSaveProfile,
  onSaveCatch,
  onToggleLike,
  onDeleteCatch,
  onToggleFollow,
  onViewUserProfile,
  onOpenFeedTab,
  onLogout
}: AnglerProfileProps) {
  const profileUser = propProfileUser || viewingUser || currentUser;
  const isOwnProfile = profileUser.id === currentUser.id;

  // Active subtab inside profile: 'publicacoes' | 'capturas' | 'equipamentos' | 'conquistas'
  const [activeSubTab, setActiveSubTab] = useState<'publicacoes' | 'capturas' | 'equipamentos' | 'conquistas'>('publicacoes');

  // Modals
  const [showNewPublication, setShowNewPublication] = useState(false);
  const [selectedCatchForDetails, setSelectedCatchForDetails] = useState<FishCatch | null>(null);
  const [showEquipmentModal, setShowEquipmentModal] = useState(false);
  const [showFollowersModal, setShowFollowersModal] = useState(false);
  const [followersModalTab, setFollowersModalTab] = useState<'followers' | 'following'>('followers');
  const [showEditProfileModal, setShowEditProfileModal] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [shareToast, setShareToast] = useState<string | null>(null);

  // Filter catches & standalone feed posts belonging to this user (avoid duplicating mirrored feed_catch_ items)
  const userCatches = catches.filter(c => c.userId === profileUser.id);
  const userFeedPosts = feedPosts.filter(
    p => p.userId === profileUser.id && !p.id.startsWith('feed_catch_')
  );

  // Dynamic Real Statistics
  const totalPublications = userCatches.length + userFeedPosts.length;

  const followersCount = Math.max(profileUser.followers?.length ?? 0, profileUser.followersCount ?? 0);
  const followingCount = Math.max(profileUser.following?.length ?? 0, profileUser.followingCount ?? 0);
  const followersDisplay = followersCount >= 1000 
    ? `${(followersCount / 1000).toFixed(1).replace('.', ',')}k` 
    : `${followersCount}`;
  const followingDisplay = followingCount >= 1000 
    ? `${(followingCount / 1000).toFixed(1).replace('.', ',')}k` 
    : `${followingCount}`;

  // Largest fish record: starts at 0,0 kg if no catches
  const maxWeightNum = userCatches.length > 0 
    ? Math.max(...userCatches.map(c => Number(c.weightKg) || 0)) 
    : 0;
  const maxWeightCatch = maxWeightNum > 0 ? maxWeightNum.toFixed(1).replace('.', ',') : '0,0';

  // Total fish caught: starts at 0 peixes
  const totalFishCaught = userCatches.length;

  // Unique species count: starts at 0 tipos
  const uniqueSpeciesCount = new Set(
    userCatches.map(c => c.species.trim().toLowerCase()).filter(Boolean)
  ).size;

  // Live following status from currentUser.following
  const isFollowing = currentUser.following?.includes(profileUser.id) ?? false;
  const [achievementCategory, setAchievementCategory] = useState<'all' | 'record' | 'species' | 'community' | 'technique'>('all');

  // Equipment list synchronized with PostgreSQL profileUser changes
  const [equipmentList, setEquipmentList] = useState<EquipmentItem[]>(() => {
    return profileUser.customEquipment || [];
  });

  useEffect(() => {
    setEquipmentList(profileUser.customEquipment || []);
  }, [profileUser.id, profileUser.customEquipment]);

  const handleAddEquipment = async (item: EquipmentItem) => {
    const prevList = equipmentList;
    const updated = [item, ...equipmentList];
    setEquipmentList(updated);
    const updatedUser = { ...profileUser, customEquipment: updated };
    const res = await onSaveProfile(updatedUser);
    if (res && res.ok === false) {
      setEquipmentList(prevList);
    }
  };

  const handleAddComment = (catchId: string, comment: CatchComment) => {
    const targetCatch = catches.find(c => c.id === catchId);
    if (!targetCatch) return;

    const existingComments = targetCatch.comments || [];
    const updatedCatch: FishCatch = {
      ...targetCatch,
      comments: [...existingComments, comment]
    };

    onSaveCatch(updatedCatch);
    if (selectedCatchForDetails?.id === catchId) {
      setSelectedCatchForDetails(updatedCatch);
    }
  };

  const handleToggleLikeModal = (catchId: string) => {
    onToggleLike(catchId);
    if (selectedCatchForDetails && selectedCatchForDetails.id === catchId) {
      const currentLikes = Array.isArray(selectedCatchForDetails.likes) ? selectedCatchForDetails.likes : [];
      const hasLiked = currentLikes.includes(currentUser.id);
      const newLikes = hasLiked
        ? currentLikes.filter(id => id !== currentUser.id)
        : [...currentLikes, currentUser.id];
      setSelectedCatchForDetails(prev => prev ? {
        ...prev,
        likes: newLikes,
        likesCount: newLikes.length
      } : null);
    }
  };

  const [achievFilter, setAchievFilter] = useState<'all' | 'record' | 'species' | 'community' | 'technique'>('all');

  const trophyUnlocked = userCatches.some(c => c.weightKg >= 5.0);
  const surfaceCount = userCatches.filter(c => 
    c.baitCategory === 'superficie' || 
    c.baitUsed?.toLowerCase().includes('zara') || 
    c.baitUsed?.toLowerCase().includes('superf')
  ).length;
  const releasedCount = userCatches.filter(c => c.released).length;
  const distinctSpots = new Set(userCatches.map(c => c.spotId).filter(id => id && id !== 'spot_private')).size;
  const tucunareCount = userCatches.filter(c => c.species.toLowerCase().includes('tucun')).length;
  const robaloCount = userCatches.filter(c => c.species.toLowerCase().includes('robal')).length;
  const bigFish8kg = userCatches.some(c => c.weightKg >= 8.0);
  const totalCatchesCount = userCatches.length;

  const baseList = achievements && achievements.length > 0 ? achievements : DEFAULT_ACHIEVEMENTS;

  const evaluatedAchievements: Achievement[] = baseList.map(item => {
    let unlocked = false;
    let currentValue = item.value || '';

    if (item.id === 'ach_record_1' || item.title.toLowerCase().includes('barrantuba')) {
      unlocked = trophyUnlocked;
      currentValue = trophyUnlocked ? `${maxWeightCatch} kg` : `${maxWeightCatch}/5 kg`;
    } else if (item.id === 'ach_record_2' || item.title.toLowerCase().includes('gigante')) {
      unlocked = bigFish8kg;
      currentValue = bigFish8kg ? `${maxWeightCatch} kg` : `${maxWeightCatch}/8 kg`;
    } else if (item.id === 'ach_medal_1' || (item.title.toLowerCase().includes('guardião') && !item.title.toLowerCase().includes('ouro'))) {
      unlocked = releasedCount > 0;
      currentValue = `${releasedCount} solturas`;
    } else if (item.id === 'ach_medal_2' || item.title.toLowerCase().includes('ouro')) {
      unlocked = releasedCount >= 10;
      currentValue = `${releasedCount}/10 solturas`;
    } else if (item.category === 'technique' || item.title.toLowerCase().includes('superfície')) {
      unlocked = surfaceCount >= 3;
      currentValue = `${surfaceCount}/3 peixes`;
    } else if (item.id === 'ach_spec_1' || item.title.toLowerCase().includes('biodiversidade')) {
      unlocked = uniqueSpeciesCount >= 3;
      currentValue = `${uniqueSpeciesCount}/3 espécies`;
    } else if (item.title.toLowerCase().includes('tucunaré')) {
      unlocked = tucunareCount >= 3;
      currentValue = `${tucunareCount}/3 peixes`;
    } else if (item.title.toLowerCase().includes('robalo')) {
      unlocked = robaloCount >= 1;
      currentValue = `${robaloCount}/1 peixes`;
    } else if (item.title.toLowerCase().includes('explorador') || item.title.toLowerCase().includes('mapa')) {
      unlocked = distinctSpots >= 2;
      currentValue = `${distinctSpots}/2 pontos`;
    } else if (item.title.toLowerCase().includes('fotógrafo') || item.title.toLowerCase().includes('galeria')) {
      unlocked = totalCatchesCount >= 5;
      currentValue = `${totalCatchesCount}/5 fotos`;
    } else {
      unlocked = totalCatchesCount > 0;
      currentValue = unlocked ? 'Conquistado' : (item.value || 'Em progresso');
    }

    return {
      ...item,
      unlocked,
      value: currentValue,
      dateUnlocked: unlocked ? 'Conquistado' : undefined
    };
  });

  return (
    <div className="w-full max-w-xl mx-auto bg-[#040e17] text-slate-100 min-h-screen pb-24 select-none">
      
      {/* 1. Header Bar matching Image 1: "Perfil" + Plus + Menu */}
      <div className="sticky top-0 z-30 bg-[#040e17]/95 backdrop-blur-xl border-b border-slate-800/80 px-4 py-3 flex items-center justify-between">
        {!isOwnProfile ? (
          <div className="flex items-center gap-2 min-w-0">
            <button
              type="button"
              onClick={onBackToOwnProfile}
              className="px-2.5 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 hover:text-white transition-colors cursor-pointer flex items-center gap-1 shrink-0"
              title="Voltar ao meu perfil"
            >
              <span>← Voltar</span>
            </button>
            <h1 className="text-base font-black text-white tracking-tight truncate">
              Perfil de {profileUser.name}
            </h1>
          </div>
        ) : (
          <h1 className="text-xl font-black text-white tracking-tight">
            Perfil
          </h1>
        )}

        <div className="flex items-center gap-2">
          {/* '+' Button: Nova publicação only if isOwnProfile */}
          {isOwnProfile && (
            <button
              type="button"
              onClick={() => setShowNewPublication(true)}
              className="p-1.5 rounded-lg border border-slate-700/80 hover:border-emerald-500 bg-[#071827] text-slate-200 hover:text-white transition-colors cursor-pointer"
              title="Nova publicação"
            >
              <Plus className="w-5 h-5" />
            </button>
          )}

          {/* '=' Hamburger Menu */}
          {isOwnProfile && (
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                className="p-1.5 rounded-lg border border-slate-700/80 hover:border-slate-500 bg-[#071827] text-slate-200 hover:text-white transition-colors cursor-pointer"
                title="Menu de opções"
              >
                <Menu className="w-5 h-5" />
              </button>

            {/* Dropdown Options */}
            {showProfileMenu && (
              <div className="absolute right-0 mt-2 w-56 bg-[#071421] border border-slate-800 rounded-2xl shadow-2xl py-2 z-50">
                <button
                  type="button"
                  onClick={() => {
                    setShowProfileMenu(false);
                    setShowEditProfileModal(true);
                  }}
                  className="w-full text-left px-4 py-2.5 text-xs text-slate-200 hover:bg-slate-800/60 flex items-center gap-2"
                >
                  <Sliders className="w-4 h-4 text-emerald-400" />
                  <span>Editar dados do perfil</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowProfileMenu(false);
                    setShowEquipmentModal(true);
                  }}
                  className="w-full text-left px-4 py-2.5 text-xs text-slate-200 hover:bg-slate-800/60 flex items-center gap-2"
                >
                  <Wrench className="w-4 h-4 text-cyan-400" />
                  <span>Cadastrar novo equipamento</span>
                </button>

                {onLogout && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowProfileMenu(false);
                      onLogout();
                    }}
                    className="w-full text-left px-4 py-2.5 text-xs text-rose-400 hover:bg-rose-950/30 flex items-center gap-2 border-t border-slate-800/80 mt-1"
                  >
                    <span>Sair do aplicativo</span>
                  </button>
                )}
              </div>
            )}
            </div>
          )}
        </div>
      </div>

      <div className="p-4 space-y-4">
        
        {/* 2. Profile Header zone matching Image 1 */}
        <div className="flex items-center gap-4">
          {/* Big Profile Avatar with glowing green ring matching Image 1 */}
          <div 
            onClick={() => isOwnProfile && setShowEditProfileModal(true)}
            className="relative cursor-pointer group shrink-0"
          >
            <div className="w-20 h-20 sm:w-22 sm:h-22 rounded-full p-0.5 ring-2 ring-emerald-400/90 shadow-lg shadow-emerald-500/10 overflow-hidden bg-slate-900">
              <img
                src={profileUser.avatar}
                alt={profileUser.name}
                className="w-full h-full rounded-full object-cover group-hover:scale-105 transition-transform"
              />
            </div>
            {isOwnProfile && (
              <div className="absolute -bottom-1 -right-1 p-1 rounded-full bg-emerald-500 text-slate-950 shadow-md">
                <Camera className="w-3 h-3 stroke-[2.5]" />
              </div>
            )}
          </div>

          {/* Name, handle and Verified Badge matching Image 1 */}
          <div className="min-w-0 flex-1">
            <h2 className="text-lg sm:text-xl font-black text-white tracking-tight truncate leading-tight">
              {profileUser.name}
            </h2>
            <div className="text-xs text-slate-400 font-mono tracking-tight mt-0.5 truncate">
              {profileUser.handle || '@felipinho_pesca'}
            </div>
            <div className="mt-1.5 inline-flex items-center gap-1 bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 rounded-full">
              <span className="text-[10px] font-bold text-emerald-400 tracking-wide">
                Pescador verificado
              </span>
            </div>
          </div>
        </div>

        {/* 3. Counters Row matching Image 1: 128 Publicações | 2,4k Seguidores | 386 Seguindo */}
        <div className="grid grid-cols-3 py-2 text-center border-y border-slate-800/60 my-2">
          <div>
            <div className="text-base sm:text-lg font-black text-white">
              {totalPublications}
            </div>
            <div className="text-[11px] text-slate-400 font-medium">
              Publicações
            </div>
          </div>

          <div 
            onClick={() => {
              setFollowersModalTab('followers');
              setShowFollowersModal(true);
            }}
            className="cursor-pointer hover:opacity-80 transition-opacity"
          >
            <div className="text-base sm:text-lg font-black text-white">
              {followersDisplay}
            </div>
            <div className="text-[11px] text-slate-400 font-medium">
              Seguidores
            </div>
          </div>

          <div 
            onClick={() => {
              setFollowersModalTab('following');
              setShowFollowersModal(true);
            }}
            className="cursor-pointer hover:opacity-80 transition-opacity"
          >
            <div className="text-base sm:text-lg font-black text-white">
              {followingDisplay}
            </div>
            <div className="text-[11px] text-slate-400 font-medium">
              Seguindo
            </div>
          </div>
        </div>

        {/* 4. Bio Section matching Image 1 */}
        <div className="space-y-1 text-xs">
          <div className="font-bold text-white flex items-center gap-1.5">
            <span>{profileUser.subtitle || 'Pescador esportivo 🎣'}</span>
          </div>
          <p className="text-slate-300 leading-relaxed">
            {profileUser.bio || 'Apaixonado por pesca esportiva, tucunarés e grandes capturas.'}
          </p>
          <div className="flex items-center gap-1 text-[11px] text-emerald-400 font-medium pt-0.5">
            <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
            <span>{profileUser.city || 'Barrantuba • Santa Catarina'}</span>
          </div>
        </div>

        {/* 5. Action Buttons matching Image 1 */}
        {shareToast && (
          <div className="bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold px-3 py-2 rounded-xl text-center">
            {shareToast}
          </div>
        )}
        <div className="flex items-center gap-2 pt-1">
          {isOwnProfile ? (
            <button
              type="button"
              onClick={() => setShowEditProfileModal(true)}
              className="flex-1 py-2.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 active:scale-98 text-slate-950 font-black text-xs shadow-md shadow-emerald-500/20 transition-all cursor-pointer text-center"
            >
              Editar Perfil
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                if (onToggleFollow) {
                  onToggleFollow(profileUser.id);
                }
              }}
              className={`flex-1 py-2.5 px-4 rounded-xl font-black text-xs shadow-md transition-all cursor-pointer text-center ${
                isFollowing 
                  ? 'bg-slate-800 text-slate-200 border border-slate-700 hover:bg-slate-700' 
                  : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/20'
              }`}
            >
              {isFollowing ? 'Seguindo ✓' : 'Seguir'}
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              if (navigator.share) {
                navigator.share({
                  title: `${profileUser.name} no Barrantuba`,
                  text: `Conheça o perfil de pesca esportiva de ${profileUser.name} no Barrantuba!`,
                  url: window.location.href
                });
              } else {
                navigator.clipboard?.writeText?.(window.location.href);
                setShareToast('Link do perfil copiado!');
                setTimeout(() => setShareToast(null), 2000);
              }
            }}
            className="flex-1 py-2.5 px-4 rounded-xl bg-[#071827] hover:bg-[#092238] border border-slate-700/80 text-white font-bold text-xs transition-colors cursor-pointer text-center"
          >
            Compartilhar
          </button>

          {isOwnProfile && (
            <button
              type="button"
              onClick={() => setShowEditProfileModal(true)}
              className="p-2.5 rounded-xl bg-[#071827] hover:bg-[#092238] border border-slate-700/80 text-slate-300 hover:text-white transition-colors cursor-pointer"
              title="Ajustes do perfil"
            >
              <Sliders className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* 6. Section "Conquistas do pescador" matching Image 1 */}
        <div className="pt-2 space-y-2">
          <h3 className="text-xs font-black text-slate-200 tracking-wide uppercase">
            Conquistas do pescador
          </h3>

          <div className="grid grid-cols-3 gap-2">
            {/* Recorde */}
            <div className="bg-[#061423] border border-slate-800 rounded-2xl p-3 flex flex-col items-center text-center shadow-md">
              <Trophy className="w-5 h-5 text-amber-400 mb-1" />
              <span className="text-[10px] text-slate-400 font-medium">Recorde</span>
              <span className="text-xs font-black text-emerald-400 mt-0.5">
                {maxWeightCatch} kg
              </span>
            </div>

            {/* Capturas */}
            <div className="bg-[#061423] border border-slate-800 rounded-2xl p-3 flex flex-col items-center text-center shadow-md">
              <Fish className="w-5 h-5 text-cyan-400 mb-1" />
              <span className="text-[10px] text-slate-400 font-medium">Capturas</span>
              <span className="text-xs font-black text-cyan-300 mt-0.5">
                {totalFishCaught} peixes
              </span>
            </div>

            {/* Espécies */}
            <div className="bg-[#061423] border border-slate-800 rounded-2xl p-3 flex flex-col items-center text-center shadow-md">
              <Award className="w-5 h-5 text-amber-500 mb-1" />
              <span className="text-[10px] text-slate-400 font-medium">Espécies</span>
              <span className="text-xs font-black text-amber-400 mt-0.5">
                {uniqueSpeciesCount} tipos
              </span>
            </div>
          </div>
        </div>

        {/* 7. Four Sub-Tabs navigation icons matching Image 1:
            Grid | Fish | Bookmark | Trophy */}
        <div className="grid grid-cols-4 border-b border-slate-800 pt-3">
          {/* Publicações (Grid) */}
          <button
            type="button"
            onClick={() => setActiveSubTab('publicacoes')}
            className={`py-3 flex flex-col items-center justify-center transition-colors relative cursor-pointer ${
              activeSubTab === 'publicacoes' ? 'text-emerald-400' : 'text-slate-500 hover:text-slate-300'
            }`}
            title="Publicações em grade"
          >
            <LayoutGrid className="w-5 h-5" />
            {activeSubTab === 'publicacoes' && (
              <div className="absolute bottom-0 inset-x-2 h-0.5 bg-emerald-400 rounded-full shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
            )}
          </button>

          {/* Capturas (Fish) */}
          <button
            type="button"
            onClick={() => setActiveSubTab('capturas')}
            className={`py-3 flex flex-col items-center justify-center transition-colors relative cursor-pointer ${
              activeSubTab === 'capturas' ? 'text-emerald-400' : 'text-slate-500 hover:text-slate-300'
            }`}
            title="Diário de peixes"
          >
            <Fish className="w-5 h-5" />
            {activeSubTab === 'capturas' && (
              <div className="absolute bottom-0 inset-x-2 h-0.5 bg-emerald-400 rounded-full shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
            )}
          </button>

          {/* Equipamentos (Bookmark / Tackle) */}
          <button
            type="button"
            onClick={() => setActiveSubTab('equipamentos')}
            className={`py-3 flex flex-col items-center justify-center transition-colors relative cursor-pointer ${
              activeSubTab === 'equipamentos' ? 'text-emerald-400' : 'text-slate-500 hover:text-slate-300'
            }`}
            title="Equipamentos do pescador"
          >
            <Bookmark className="w-5 h-5" />
            {activeSubTab === 'equipamentos' && (
              <div className="absolute bottom-0 inset-x-2 h-0.5 bg-emerald-400 rounded-full shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
            )}
          </button>

          {/* Conquistas (Trophy) */}
          <button
            type="button"
            onClick={() => setActiveSubTab('conquistas')}
            className={`py-3 flex flex-col items-center justify-center transition-colors relative cursor-pointer ${
              activeSubTab === 'conquistas' ? 'text-emerald-400' : 'text-slate-500 hover:text-slate-300'
            }`}
            title="Conquistas e medalhas"
          >
            <Trophy className="w-5 h-5" />
            {activeSubTab === 'conquistas' && (
              <div className="absolute bottom-0 inset-x-2 h-0.5 bg-emerald-400 rounded-full shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
            )}
          </button>
        </div>

        {/* 8. Sub-Tabs Content */}
        
        {/* Tab 1: Publicações (3-Column Photo Grid matching Image 1: Feed Posts + Catch Photos) */}
        {activeSubTab === 'publicacoes' && (
          <div>
            {userCatches.length === 0 && userFeedPosts.length === 0 ? (
              <div className="p-8 text-center text-slate-500 bg-[#061423] rounded-2xl border border-slate-800">
                <Camera className="w-10 h-10 mx-auto text-slate-600 mb-2" />
                <p className="text-xs font-bold text-slate-300">Nenhuma publicação ainda</p>
                {isOwnProfile && (
                  <>
                    <p className="text-[11px] text-slate-500 mt-1 mb-3">Toque no botão &ldquo;+&rdquo; no topo para publicar sua primeira captura!</p>
                    <button
                      onClick={() => setShowNewPublication(true)}
                      className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs cursor-pointer"
                    >
                      Nova Publicação
                    </button>
                  </>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-1 sm:gap-1.5">
                {userFeedPosts.map((post) => (
                  <div
                    key={post.id}
                    onClick={() => onOpenFeedTab?.()}
                    className="relative aspect-square bg-slate-900 overflow-hidden rounded-md group cursor-pointer border border-slate-800 hover:border-emerald-500/80 transition-all"
                  >
                    {post.mediaUrls && post.mediaUrls.length > 0 ? (
                      post.mediaType === 'video' ? (
                        <video src={post.mediaUrls[0]} className="w-full h-full object-cover" />
                      ) : (
                        <img
                          src={post.mediaUrls[0]}
                          alt={post.category}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      )
                    ) : (
                      <div className="w-full h-full p-2 flex items-center justify-center bg-[#071828] text-[10px] text-slate-300 text-center leading-tight">
                        {(post.text || '').slice(0, 50)}
                      </div>
                    )}

                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity p-1.5 flex flex-col justify-end">
                      <span className="text-[10px] font-black text-emerald-300 truncate leading-none">
                        {post.category}
                      </span>
                      <div className="flex items-center gap-2 text-[9px] text-white font-bold mt-1">
                        <span className="flex items-center gap-0.5">
                          <Heart className="w-2.5 h-2.5 fill-emerald-400 text-emerald-400" /> {post.likesCount || 0}
                        </span>
                        <span className="flex items-center gap-0.5">
                          <MessageCircle className="w-2.5 h-2.5" /> {post.comments?.length || post.commentsCount || 0}
                        </span>
                      </div>
                    </div>

                    {post.mediaUrls && post.mediaUrls.length > 1 && (
                      <span className="absolute top-1 right-1 p-0.5 rounded bg-black/60 text-white">
                        <LayoutGrid className="w-3 h-3" />
                      </span>
                    )}
                  </div>
                ))}

                {userCatches.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => setSelectedCatchForDetails(item)}
                    className="relative aspect-square bg-slate-900 overflow-hidden rounded-md group cursor-pointer border border-slate-800 hover:border-emerald-500/80 transition-all"
                  >
                    <img
                      src={item.photoUrl}
                      alt={item.species}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />

                    {/* Dark gradient overlay with likes and species on hover */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity p-1.5 flex flex-col justify-end">
                      <span className="text-[10px] font-black text-white truncate leading-none">
                        {item.species}
                      </span>
                      <div className="flex items-center gap-2 text-[9px] text-emerald-400 font-bold mt-1">
                        <span className="flex items-center gap-0.5">
                          <Heart className="w-2.5 h-2.5 fill-emerald-400" /> {item.likesCount || 0}
                        </span>
                        <span className="text-slate-300">{item.weightKg}kg</span>
                      </div>
                    </div>

                    {/* Multiple photos indicator if >1 */}
                    {item.mediaUrls && item.mediaUrls.length > 1 && (
                      <span className="absolute top-1 right-1 p-0.5 rounded bg-black/60 text-white">
                        <LayoutGrid className="w-3 h-3" />
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Capturas (Detailed Fish Diary) */}
        {activeSubTab === 'capturas' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300">Diário Técnico de Peixes</span>
              <button
                onClick={() => setShowNewPublication(true)}
                className="text-xs font-bold text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> Registrar Peixe
              </button>
            </div>

            {userCatches.map(fish => (
              <div 
                key={fish.id}
                onClick={() => setSelectedCatchForDetails(fish)}
                className="bg-[#061423] border border-slate-800 rounded-2xl p-3 flex gap-3 hover:border-slate-700 cursor-pointer transition-colors"
              >
                <img
                  src={fish.photoUrl}
                  alt={fish.species}
                  className="w-20 h-20 rounded-xl object-cover shrink-0 border border-slate-800"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-black text-white truncate">{fish.species}</h4>
                    <span className="text-xs font-black text-emerald-400">{fish.weightKg} kg</span>
                  </div>
                  <div className="text-[11px] text-cyan-300 font-medium truncate mt-0.5">
                    Isca: {fish.baitUsed}
                  </div>
                  <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-1 truncate">
                    {fish.isLocationPrivate ? (
                      <>
                        <EyeOff className="w-3 h-3 text-amber-400 shrink-0" />
                        <span>Local Privado</span>
                      </>
                    ) : (
                      <>
                        <MapPin className="w-3 h-3 text-emerald-400 shrink-0" />
                        <span>{fish.spotName}</span>
                      </>
                    )}
                  </div>
                  <div className="text-[9px] text-slate-500 mt-1">
                    {fish.capturedAt && !Number.isNaN(new Date(fish.capturedAt).getTime())
                      ? new Date(fish.capturedAt).toLocaleDateString('pt-BR')
                      : 'Hoje'} • {fish.released ? 'Solto com vida 🌊' : 'Conservado'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Tab 3: Equipamentos (Varas, Carretilhas, Iscas, Barcos, Motores, Acessórios) */}
        {activeSubTab === 'equipamentos' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-white block">Equipamentos Cadastrados</span>
                <span className="text-[10px] text-slate-400 block">Varas, carretilhas, iscas favoritas e embarcação</span>
              </div>
              <button
                type="button"
                onClick={() => setShowEquipmentModal(true)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-md transition-all cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>Adicionar</span>
              </button>
            </div>

            <div className="space-y-2.5">
              {equipmentList.map(item => (
                <div key={item.id} className="bg-[#061423] border border-slate-800 rounded-2xl p-3 flex gap-3 items-center">
                  {item.photoUrl ? (
                    <img 
                      src={item.photoUrl} 
                      alt={item.name} 
                      className="w-16 h-16 rounded-xl object-cover shrink-0 border border-slate-700" 
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-xl bg-slate-800 text-slate-400 flex items-center justify-center shrink-0">
                      <Wrench className="w-6 h-6 text-emerald-400" />
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider">
                        {item.category}
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono">{item.brand}</span>
                    </div>
                    <h4 className="text-xs font-extrabold text-white truncate mt-0.5">{item.name}</h4>
                    <p className="text-[11px] text-slate-400 line-clamp-2 mt-0.5 leading-tight">{item.specs}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 4: Conquistas (Recordes, Medalhas e Troféus) */}
        {activeSubTab === 'conquistas' && (() => {
          // Dynamic unlock evaluation based on current member's stats
          const evaluated = achievements.map(ach => {
            let isUnlocked = ach.unlocked ?? false;
            let statusText = 'Em progresso';

            if (ach.id === 'ach_first_catch') {
              isUnlocked = totalFishCaught >= 1;
              statusText = totalFishCaught >= 1 ? 'Concluído (1/1)' : '0/1 captura';
            } else if (ach.id === 'ach_monster_record') {
              isUnlocked = maxWeightNum >= 10;
              statusText = `${maxWeightCatch} / 10,0 kg`;
            } else if (ach.id === 'ach_gold_weight') {
              isUnlocked = maxWeightNum >= 5;
              statusText = `${maxWeightCatch} / 5,0 kg`;
            } else if (ach.id === 'ach_species_collector') {
              isUnlocked = uniqueSpeciesCount >= 3;
              statusText = `${uniqueSpeciesCount} / 3 espécies`;
            } else if (ach.id === 'ach_peacock_master') {
              const count = userCatches.filter(c => c.species.toLowerCase().includes('tucun')).length;
              isUnlocked = count >= 1;
              statusText = count > 0 ? `${count} capturado(s)` : '0 capturados';
            } else if (ach.id === 'ach_snook_hunter') {
              const count = userCatches.filter(c => c.species.toLowerCase().includes('robal')).length;
              isUnlocked = count >= 1;
              statusText = count > 0 ? `${count} capturado(s)` : '0 capturados';
            } else if (ach.id === 'ach_wolf_fish') {
              const count = userCatches.filter(c => c.species.toLowerCase().includes('tra')).length;
              isUnlocked = count >= 1;
              statusText = count > 0 ? `${count} capturado(s)` : '0 capturados';
            } else if (ach.id === 'ach_topwater_master') {
              const count = userCatches.filter(c => (c.baitUsed || '').toLowerCase().includes('superf')).length;
              isUnlocked = count >= 1;
              statusText = count > 0 ? `${count} na superfície` : '0 capturas';
            } else if (ach.id === 'ach_jig_expert') {
              const count = userCatches.filter(c => (c.baitUsed || '').toLowerCase().includes('jig') || (c.baitUsed || '').toLowerCase().includes('fundo')).length;
              isUnlocked = count >= 1;
              statusText = count > 0 ? `${count} no jig/fundo` : '0 capturas';
            } else {
              // Admin custom achievement or unlocked by default
              if (ach.unlocked !== false) {
                isUnlocked = true;
                statusText = 'Desbloqueado';
              }
            }

            return { ...ach, isUnlocked, statusText };
          });

          const filtered = evaluated.filter(ach => {
            if (achievementCategory === 'all') return true;
            return ach.category === achievementCategory;
          });

          const totalUnlocked = evaluated.filter(a => a.isUnlocked).length;

          return (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Trophy className="w-3.5 h-3.5 text-amber-400" />
                    Recordes, Medalhas & Troféus
                  </h3>
                  <p className="text-[10px] text-slate-400 mt-0.5">Catálogo de conquistas do clube Barrantuba</p>
                </div>
                <span className="text-[10px] text-amber-400 font-extrabold bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full">
                  {totalUnlocked} de {evaluated.length}
                </span>
              </div>

              {/* Categorias Filter Tabs */}
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
                {[
                  { id: 'all', label: 'Todos' },
                  { id: 'record', label: '🏆 Recordes' },
                  { id: 'species', label: '🐟 Espécies' },
                  { id: 'community', label: '⭐ Clube' },
                  { id: 'technique', label: '🎯 Técnicas' },
                ].map(cat => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setAchievementCategory(cat.id as any)}
                    className={`px-2.5 py-1 rounded-xl text-[11px] font-bold whitespace-nowrap transition-all cursor-pointer ${
                      achievementCategory === cat.id
                        ? 'bg-amber-400 text-slate-950 shadow-sm'
                        : 'bg-slate-900/80 text-slate-400 border border-slate-800 hover:text-white'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>

              <div className="space-y-2.5">
                {filtered.map(ach => (
                  <div 
                    key={ach.id} 
                    className={`rounded-2xl p-3.5 flex items-center gap-3.5 border transition-all ${
                      ach.isUnlocked
                        ? 'bg-gradient-to-r from-[#071929] to-[#04121e] border-amber-500/30 shadow-md'
                        : 'bg-[#040e17]/80 border-slate-800/70 opacity-75'
                    }`}
                  >
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shrink-0 border ${
                      ach.isUnlocked
                        ? 'bg-gradient-to-br from-amber-500/20 to-amber-600/10 border-amber-400/40 text-amber-300 shadow-inner'
                        : 'bg-slate-900 border-slate-800 text-slate-500 grayscale'
                    }`}>
                      {ach.icon}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <h4 className={`text-xs font-bold truncate ${ach.isUnlocked ? 'text-white' : 'text-slate-400'}`}>
                            {ach.title}
                          </h4>
                          {ach.isUnlocked && (
                            <span className="text-[9px] bg-emerald-500/20 text-emerald-400 font-bold px-1.5 py-0.2 rounded-md shrink-0">
                              ✓
                            </span>
                          )}
                        </div>
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-full shrink-0 ${
                          ach.isUnlocked
                            ? 'text-amber-300 bg-amber-500/15 border border-amber-500/30'
                            : 'text-slate-500 bg-slate-800/80 border border-slate-700/50'
                        }`}>
                          {ach.value}
                        </span>
                      </div>

                      <p className="text-[11px] text-slate-400 mt-1 leading-snug">{ach.description}</p>
                      
                      <div className="flex items-center justify-between text-[10px] mt-1.5">
                        <span className={`font-medium ${ach.isUnlocked ? 'text-emerald-400' : 'text-slate-500'}`}>
                          {ach.statusText}
                        </span>
                        {ach.isUnlocked && (
                          <span className="text-[9px] text-slate-500 font-mono">
                            Desbloqueado
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })()}
      </div>

      {/* 9. Submodals */}
      {showNewPublication && (
        <NewPublicationModal
          currentUser={currentUser}
          spots={spots}
          onClose={() => setShowNewPublication(false)}
          onSaveCatch={onSaveCatch}
        />
      )}

      {selectedCatchForDetails && (
        <CatchDetailsModal
          fishCatch={selectedCatchForDetails}
          currentUser={currentUser}
          onClose={() => setSelectedCatchForDetails(null)}
          onToggleLike={handleToggleLikeModal}
          onAddComment={handleAddComment}
          onDeleteCatch={onDeleteCatch}
        />
      )}

      {showEquipmentModal && (
        <EquipmentModal
          userId={profileUser.id}
          onClose={() => setShowEquipmentModal(false)}
          onSave={handleAddEquipment}
        />
      )}

      {showFollowersModal && (
        <FollowersModal
          initialTab={followersModalTab}
          currentUser={currentUser}
          profileUser={profileUser}
          users={users}
          onClose={() => setShowFollowersModal(false)}
          onViewUserProfile={onViewUserProfile}
          onToggleFollow={(targetId) => {
            if (onToggleFollow) {
              onToggleFollow(targetId);
            } else {
              const currentFollowing = currentUser.following || [];
              const isCurrentlyFollowing = currentFollowing.includes(targetId);
              const updatedFollowing = isCurrentlyFollowing
                ? currentFollowing.filter(id => id !== targetId)
                : [...currentFollowing, targetId];

              const updatedUser: User = {
                ...currentUser,
                following: updatedFollowing,
                followingCount: updatedFollowing.length
              };
              onSaveProfile(updatedUser);
            }
          }}
        />
      )}

      {showEditProfileModal && (
        <EditProfileModal
          user={currentUser}
          onClose={() => setShowEditProfileModal(false)}
          onSaveProfile={onSaveProfile}
        />
      )}
    </div>
  );
}
