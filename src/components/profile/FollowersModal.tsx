import { useState } from 'react';
import { X, Search, ShieldCheck } from 'lucide-react';
import { User } from '../../types';

interface FollowersModalProps {
  initialTab?: 'followers' | 'following';
  currentUser: User;
  profileUser?: User;
  users: User[];
  onClose: () => void;
  onToggleFollow: (targetUserId: string) => void;
  onViewUserProfile?: (userId: string) => void;
}

export function FollowersModal({
  initialTab = 'followers',
  currentUser,
  profileUser,
  users,
  onClose,
  onToggleFollow,
  onViewUserProfile
}: FollowersModalProps) {
  const [activeTab, setActiveTab] = useState<'followers' | 'following'>(initialTab);
  const [search, setSearch] = useState('');

  const targetUser = profileUser || currentUser;
  const targetFollowers = targetUser.followers || [];
  const targetFollowing = targetUser.following || [];
  const currentFollowing = currentUser.following || [];

  const filteredMembers = users.filter(m => {
    if (m.id === targetUser.id && !search.trim()) {
      // Keep lists focused on other members unless searching
      if (activeTab === 'followers') return targetFollowers.includes(m.id);
      return targetFollowing.includes(m.id);
    }

    if (!search.trim()) {
      if (activeTab === 'followers') {
        return targetFollowers.includes(m.id);
      } else {
        return targetFollowing.includes(m.id);
      }
    }

    const q = search.toLowerCase().replace('@', '').trim();
    const matchesSearch =
      m.name.toLowerCase().includes(q) ||
      (m.handle && m.handle.toLowerCase().includes(q)) ||
      (m.city && m.city.toLowerCase().includes(q));

    return matchesSearch && m.id !== currentUser.id;
  });

  const followersCount = Math.max(targetFollowers.length, targetUser.followersCount || 0);
  const followingCount = Math.max(targetFollowing.length, targetUser.followingCount || 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-[400px] bg-[#07131e] border border-slate-800 rounded-3xl shadow-2xl overflow-hidden my-auto flex flex-col text-slate-100 max-h-[82vh]">
        
        {/* Header Tabs */}
        <div className="border-b border-slate-800 bg-[#040e17] flex items-center justify-between px-3 pt-2">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setActiveTab('followers')}
              className={`pb-3 pt-2 text-xs font-bold transition-all relative cursor-pointer ${
                activeTab === 'followers' ? 'text-emerald-400' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {followersCount} {followersCount === 1 ? 'Seguidor' : 'Seguidores'}
              {activeTab === 'followers' && (
                <div className="absolute bottom-0 inset-x-0 h-0.5 bg-emerald-400 rounded-full" />
              )}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('following')}
              className={`pb-3 pt-2 text-xs font-bold transition-all relative cursor-pointer ${
                activeTab === 'following' ? 'text-emerald-400' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {followingCount} Seguindo
              {activeTab === 'following' && (
                <div className="absolute bottom-0 inset-x-0 h-0.5 bg-emerald-400 rounded-full" />
              )}
            </button>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Input */}
        <div className="p-3 border-b border-slate-800/80 bg-[#05111c]">
          <div className="flex items-center gap-2 bg-[#071827] border border-slate-700/80 rounded-xl px-3 py-2 text-slate-200">
            <Search className="w-4 h-4 text-slate-400 shrink-0" />
            <input
              type="text"
              placeholder="Buscar pescadores do clube por nome..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-transparent text-xs text-white placeholder-slate-500 focus:outline-none w-full"
            />
          </div>
        </div>

        {/* Members List */}
        <div className="p-3 overflow-y-auto divide-y divide-slate-800/60 flex-1 space-y-2">
          {filteredMembers.length === 0 ? (
            <div className="py-10 text-center text-xs text-slate-500">
              {search.trim()
                ? `Nenhum membro encontrado para "${search}".`
                : activeTab === 'followers'
                  ? 'Nenhum seguidor listado ainda. Use a busca acima para encontrar amigos!'
                  : 'Não está seguindo ninguém ainda. Busque parceiros de pesca acima!'}
            </div>
          ) : (
            filteredMembers.map(member => {
              const isSelf = member.id === currentUser.id;
              const isFollowing = currentFollowing.includes(member.id);

              return (
                <div key={member.id} className="pt-2 flex items-center justify-between gap-3">
                  <div
                    onClick={() => {
                      if (onViewUserProfile) {
                        onClose();
                        onViewUserProfile(member.id);
                      }
                    }}
                    className="flex items-center gap-2.5 min-w-0 flex-1 cursor-pointer group"
                  >
                    <img
                      src={member.avatar}
                      alt={member.name}
                      className="w-10 h-10 rounded-full object-cover ring-1 ring-emerald-500/50 shrink-0"
                    />
                    <div className="min-w-0">
                      <div className="font-bold text-xs text-white group-hover:text-emerald-300 truncate flex items-center gap-1">
                        <span>{member.name}</span>
                        {(member.isVerified || member.role === 'admin') && (
                          <ShieldCheck className="w-3 h-3 text-emerald-400 shrink-0" />
                        )}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono truncate">
                        {member.handle || `@${member.name.toLowerCase().replace(/\s+/g, '')}`}
                      </div>
                      <div className="text-[10px] text-slate-500 truncate">
                        {member.subtitle || member.bio || 'Membro Barrantuba'}
                      </div>
                    </div>
                  </div>

                  {!isSelf && (
                    <button
                      type="button"
                      onClick={() => onToggleFollow(member.id)}
                      className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all shrink-0 cursor-pointer ${
                        isFollowing
                          ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                          : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-md shadow-emerald-500/20'
                      }`}
                    >
                      {isFollowing ? 'Seguindo' : 'Seguir'}
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
