import React, { useState } from 'react';
import { User, AppNotification, ActiveFishingSession } from '../types';
import { BARRANTUBA_LOGO } from '../services/storageService';
import { 
  MapPin, 
  Fish, 
  Radio, 
  Trophy, 
  CloudSun,
  Bell, 
  ShieldCheck, 
  LogOut, 
  User as UserIcon,
  Calendar,
  MoreHorizontal,
  X,
  ChevronRight,
  Compass,
  SlidersHorizontal
} from 'lucide-react';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  currentUser: User;
  notifications: AppNotification[];
  activeSessions: ActiveFishingSession[];
  clubLogo: string;
  onOpenProfile: () => void;
  onLogout: () => void;
  onOpenFishingModal: () => void;
  onMarkNotificationRead: (id: string) => void;
}

function FeedIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg 
      className={className} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2.2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    >
      <rect width="18" height="18" x="3" y="3" rx="4" />
      <path d="M7 8h10" />
      <path d="M7 12h10" />
      <path d="M7 16h6" />
    </svg>
  );
}

export function Navbar({
  activeTab,
  setActiveTab,
  currentUser,
  notifications,
  activeSessions,
  clubLogo,
  onOpenProfile,
  onLogout,
  onOpenFishingModal,
  onMarkNotificationRead
}: NavbarProps) {
  const [showNotifications, setShowNotifications] = useState(false);
  const [showMoreDrawer, setShowMoreDrawer] = useState(false);

  const unreadCount = notifications.filter(n => !n.read).length;
  const mySession = activeSessions.find(s => s.userId === currentUser.id);
  const isAdmin = currentUser.role === 'admin';

  // Primary bottom navigation items: Mapa, Feed, Clima, Ranking, Perfil
  const primaryTabs: { id: string; label: string; icon: React.ReactNode; badge?: number | null }[] = [
    { id: 'map', label: 'Mapa', icon: <MapPin className="w-5 h-5" /> },
    { 
      id: 'feed', 
      label: 'Feed', 
      icon: <FeedIcon className="w-5 h-5" />
    },
    { id: 'weather', label: 'Clima', icon: <CloudSun className="w-5 h-5" /> },
    { id: 'ranking', label: 'Ranking', icon: <Trophy className="w-5 h-5" /> },
    { 
      id: 'profile', 
      label: 'Perfil', 
      icon: (
        <div className="w-5 h-5 rounded-full overflow-hidden ring-1 ring-emerald-400/80">
          <img 
            src={currentUser.avatar} 
            alt={currentUser.name} 
            className="w-full h-full object-cover" 
          />
        </div>
      )
    },
  ];

  // Secondary items accessed via "Mais"
  const secondaryTabs = [
    { id: 'tackle', label: 'Kit Ideal · Equipamentos', icon: <SlidersHorizontal className="w-5 h-5 text-emerald-400" />, desc: 'Cruze a biologia do peixe com vara, carretilha, linha e isca ideais' },
    { id: 'catches', label: 'Capturas dos Membros', icon: <Fish className="w-5 h-5 text-emerald-400" />, desc: 'Galeria técnica de peixes fisgados no clube' },
    { 
      id: 'active', 
      label: 'Ao Vivo na Água', 
      icon: <Radio className="w-5 h-5 text-emerald-400" />, 
      desc: 'Pescadores em tempo real nos pontos de pesca' 
    },
    { id: 'tournaments', label: 'Torneios do Clube', icon: <Calendar className="w-5 h-5 text-cyan-400" />, desc: 'Competições, datas e inscrições oficiais' },
  ];

  if (isAdmin) {
    secondaryTabs.unshift({
      id: 'admin',
      label: 'Painel do Administrador',
      icon: <ShieldCheck className="w-5 h-5 text-amber-400" />,
      desc: 'Moderação de membros, pontos, peixes e logotipo'
    });
  }

  const isMoreActive = ['tackle', 'catches', 'active', 'tournaments', 'admin'].includes(activeTab);

  const handleConfirmLogout = () => {
    setShowMoreDrawer(false);
    onLogout();
  };

  return (
    <>
      {/* Top Header - Peskar Clean Style (No navigation options on top) */}
      <header className="sticky top-0 z-40 bg-[#07131e]/95 backdrop-blur-xl border-b border-emerald-500/15 shadow-md w-full overflow-hidden">
        <div className="w-full max-w-7xl mx-auto px-2 sm:px-4 h-14 flex items-center justify-between gap-1.5">
          {/* Brand Zone */}
          <div 
            onClick={() => setActiveTab('map')}
            className="flex items-center gap-2 cursor-pointer shrink min-w-0 group select-none"
          >
            <div className="relative shrink-0">
              <div className="absolute -inset-0.5 rounded-full bg-emerald-500/40 blur-xs group-hover:bg-emerald-400/60 transition-all"></div>
              <img
                src={clubLogo || BARRANTUBA_LOGO}
                alt="Barrantuba Logo"
                onError={(e) => {
                  const target = e.currentTarget;
                  if (!target.src.endsWith('/assets/barrantuba_logo_crest.jpg')) {
                    target.src = '/assets/barrantuba_logo_crest.jpg';
                  }
                }}
                className="relative w-8 h-8 rounded-full object-cover border border-emerald-400/60 shadow-md bg-slate-950"
              />
            </div>
            <div className="min-w-0">
              <div className="font-black text-xs sm:text-sm tracking-tight text-white uppercase flex items-center gap-1 leading-none truncate">
                <span className="truncate">Barrantuba</span>
                {isAdmin && (
                  <span className="text-[8px] bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold px-1 py-0.2 rounded-full shrink-0">
                    Admin
                  </span>
                )}
              </div>
              <div className="hidden xs:block text-[8px] text-emerald-400 font-bold tracking-widest uppercase mt-0.5 leading-none">
                Clube de Pesca
              </div>
            </div>
          </div>

          {/* Right Action Icons: Fishing Status + Notifs + Profile + Logout */}
          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            {/* Active Fishing Session Quick Button */}
            {mySession ? (
              <button
                type="button"
                onClick={() => setActiveTab('active')}
                className="flex items-center gap-1 px-2 py-1 sm:px-2.5 sm:py-1.5 rounded-full bg-emerald-500/20 border border-emerald-500/50 text-emerald-300 text-[10px] sm:text-[11px] font-bold hover:bg-emerald-500/30 transition-all cursor-pointer"
                title="Você está pescando agora!"
              >
                <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse shrink-0" />
                <span className="hidden sm:inline">Pescando em {mySession.spotName.split(' ')[0]}</span>
                <span className="sm:hidden">Pescando</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={onOpenFishingModal}
                className="flex items-center gap-1 px-2 py-1 sm:px-2.5 sm:py-1.5 rounded-full bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-slate-950 text-[10px] sm:text-[11px] font-black shadow-md shadow-emerald-500/20 transition-all cursor-pointer"
                title="Registrar que estou pescando agora"
              >
                <Radio className="w-3.5 h-3.5 stroke-[2.5] shrink-0" />
                <span className="hidden sm:inline">Pescar</span>
              </button>
            )}

            {/* Notifications Bell */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-1.5 sm:p-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-850/80 transition-colors"
                title="Notificações"
              >
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-[#07131e] animate-pulse" />
                )}
              </button>

              {/* Dropdown Notifications */}
              {showNotifications && (
                <div className="absolute right-0 mt-2 w-72 sm:w-80 bg-[#071421] border border-slate-800 rounded-2xl shadow-2xl overflow-hidden z-50">
                  <div className="p-3 border-b border-slate-800 bg-[#040e17] flex items-center justify-between">
                    <div className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                      <Bell className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Notificações</span>
                    </div>
                    <span className="text-[10px] text-emerald-400 font-mono font-bold bg-emerald-500/15 px-2 py-0.5 rounded-full">
                      {unreadCount} novas
                    </span>
                  </div>

                  <div className="max-h-80 overflow-y-auto divide-y divide-slate-800/60">
                    {notifications.length === 0 ? (
                      <div className="p-5 text-center text-xs text-slate-500">
                        Nenhuma notificação no momento.
                      </div>
                    ) : (
                      notifications.map(notif => (
                        <div
                          key={notif.id}
                          onClick={() => {
                            onMarkNotificationRead(notif.id);
                            if (notif.linkTab) {
                              setActiveTab(notif.linkTab);
                              setShowNotifications(false);
                            }
                          }}
                          className={`p-3 text-xs cursor-pointer transition-colors ${
                            notif.read ? 'bg-[#071421]/60 text-slate-400' : 'bg-emerald-950/20 text-slate-100 font-medium hover:bg-slate-800/50'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-1 mb-1">
                            <span className="font-bold text-slate-100">{notif.title}</span>
                            <span className="text-[10px] text-slate-500 font-mono">
                              {new Date(notif.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-300 leading-relaxed">
                            {notif.message}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Member Profile Avatar */}
            <div
              onClick={onOpenProfile}
              className="flex items-center p-0.5 rounded-full bg-slate-900 border border-slate-800 hover:border-emerald-500/50 cursor-pointer transition-all shrink-0"
              title="Abrir Meu Perfil"
            >
              <img
                src={currentUser.avatar}
                alt={currentUser.name}
                className="w-7 h-7 rounded-full object-cover border border-emerald-500/40"
              />
            </div>

            {/* Direct Logout Button */}
            <button
              type="button"
              onClick={handleConfirmLogout}
              className="flex items-center gap-1 p-1.5 sm:px-2.5 sm:py-1.5 rounded-full bg-rose-950/50 hover:bg-rose-900/60 border border-rose-500/40 text-rose-300 hover:text-white text-xs font-bold transition-all cursor-pointer shadow-sm active:scale-95 shrink-0"
              title="Desconectar e Sair da Conta"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline text-[11px]">Sair</span>
            </button>
          </div>
        </div>
      </header>

      {/* Peskar-Style Bottom Navigation Dock (All System Options at the Bottom) */}
      <nav className="absolute bottom-0 inset-x-0 z-40 bg-[#06121d]/95 backdrop-blur-xl border-t border-emerald-500/20 py-1.5 px-1 shadow-[0_-10px_35px_rgba(0,0,0,0.6)] safe-area-pb w-full">
        <div className="w-full flex items-center justify-around gap-0.5">
          {primaryTabs.map(tab => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setActiveTab(tab.id);
                  setShowMoreDrawer(false);
                }}
                className={`relative flex-1 min-w-0 flex flex-col items-center justify-center py-1.5 px-1 rounded-2xl transition-all cursor-pointer select-none ${
                  isActive
                    ? 'text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 font-bold shadow-md shadow-emerald-500/10 scale-105'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60 font-medium'
                }`}
              >
                <div className="relative">
                  {tab.icon}
                  {tab.badge && (
                    <span className="absolute -top-1 -right-2 flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500"></span>
                    </span>
                  )}
                </div>
                <span className="text-[10px] mt-1 tracking-tight leading-none whitespace-nowrap">
                  {tab.label}
                </span>
              </button>
            );
          })}

          {/* "Mais" Menu Button */}
          <button
            type="button"
            onClick={() => setShowMoreDrawer(!showMoreDrawer)}
            className={`flex-1 min-w-0 flex flex-col items-center justify-center py-1.5 px-1 rounded-2xl transition-all cursor-pointer select-none ${
              isMoreActive || showMoreDrawer
                ? 'text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 font-bold scale-105'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60 font-medium'
            }`}
          >
            <MoreHorizontal className="w-5 h-5" />
            <span className="text-[10px] mt-1 tracking-tight leading-none whitespace-nowrap">
              Mais
            </span>
          </button>
        </div>
      </nav>

      {/* Bottom Sheet / Drawer for "Mais" Options (Peskar Style) */}
      {showMoreDrawer && (
        <div className="absolute inset-0 z-50 flex items-end justify-center bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div 
            className="w-full max-w-[430px] bg-[#071421] border-t border-emerald-500/30 rounded-t-3xl p-4 shadow-2xl max-h-[80vh] overflow-y-auto space-y-3 pb-20"
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Compass className="w-5 h-5 text-emerald-400" />
                <h3 className="text-sm font-black text-white uppercase tracking-wider">
                  Menu & Recursos do Barrantuba
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowMoreDrawer(false)}
                className="p-1.5 rounded-full bg-slate-900 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* List of secondary features */}
            <div className="space-y-2">
              {secondaryTabs.map(item => {
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setActiveTab(item.id);
                      setShowMoreDrawer(false);
                    }}
                    className={`w-full p-3.5 rounded-2xl text-left border flex items-center justify-between transition-all ${
                      isActive 
                        ? 'bg-emerald-950/40 border-emerald-500/60 text-white' 
                        : 'bg-[#091827] border-slate-800/80 text-slate-300 hover:border-slate-700 hover:bg-slate-900'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                        {item.icon}
                      </div>
                      <div>
                        <div className="font-bold text-xs text-white flex items-center gap-2">
                          <span>{item.label}</span>
                          {item.id === 'admin' && (
                            <span className="text-[9px] bg-amber-500/20 text-amber-300 px-1.5 py-0.2 rounded font-bold border border-amber-500/30">
                              ADMIN
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          {item.desc}
                        </div>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-500" />
                  </button>
                );
              })}

              {/* Profile Link in Drawer */}
              <button
                type="button"
                onClick={() => {
                  setShowMoreDrawer(false);
                  onOpenProfile();
                }}
                className="w-full p-3.5 rounded-2xl text-left border bg-[#091827] border-slate-800/80 text-slate-300 hover:border-slate-700 hover:bg-slate-900 flex items-center justify-between transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                    <UserIcon className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div>
                    <div className="font-bold text-xs text-white">
                      Meu Perfil & Equipamentos
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      Varas, carretilhas, linhas e espécies favoritas
                    </div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-500" />
              </button>

              {/* Logout Option in Drawer */}
              <button
                type="button"
                onClick={handleConfirmLogout}
                className="w-full p-3.5 rounded-2xl text-left border bg-rose-950/30 border-rose-900/60 text-rose-300 hover:bg-rose-950/60 flex items-center justify-between transition-all mt-4"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-rose-950/80 border border-rose-800/60 text-rose-400">
                    <LogOut className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-bold text-xs text-rose-200">
                      Desconectar / Sair do Aplicativo
                    </div>
                    <div className="text-[11px] text-rose-400/80 mt-0.5">
                      Finaliza sua sessão e volta para a tela de login
                    </div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-rose-400" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
