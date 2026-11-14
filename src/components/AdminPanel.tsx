import { useState, useRef, useEffect, useMemo } from 'react';
import { User, FishingSpot, FishCatch, Tournament, ActiveFishingSession, AppNotification } from '../types';
import { 
  ShieldCheck, 
  Users, 
  MapPin, 
  Fish, 
  Trophy, 
  Radio, 
  Bell, 
  Trash2, 
  Edit3, 
  Download, 
  RotateCcw, 
  AlertTriangle, 
  CheckCircle2, 
  Image as ImageIcon, 
  Upload, 
  RefreshCw,
  Search,
  Plus,
  Check,
  Camera,
  Loader2,
  Target
} from 'lucide-react';
import { BARRANTUBA_LOGO } from '../services/storageService';
import { Achievement } from '../types';
import {
  SpeciesPhotoRecord,
  BaitPhotoAdminRecord,
  fetchSpeciesPhotosFromDb,
  saveSpeciesPhotoToDb,
  revertSpeciesPhotoInDb,
  fetchBaitPhotosFromDb,
  saveBaitPhotoToDb,
  revertBaitPhotoInDb,
} from '../services/cityWeatherService';

function compressGalleryImageFile(file: File, maxDim = 900, quality = 0.86): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Não foi possível ler o arquivo selecionado.'));
    reader.onload = () => {
      const rawDataUrl = String(reader.result || '');
      if (!rawDataUrl.startsWith('data:image/')) {
        reject(new Error('Selecione um arquivo de imagem válido (JPG, PNG ou WebP).'));
        return;
      }

      const img = new Image();
      img.onload = () => {
        try {
          const w = img.naturalWidth || img.width;
          const h = img.naturalHeight || img.height;
          if (!w || !h) {
            resolve(rawDataUrl);
            return;
          }
          const scale = Math.min(1, maxDim / Math.max(w, h));
          const targetW = Math.max(1, Math.round(w * scale));
          const targetH = Math.max(1, Math.round(h * scale));

          const canvas = document.createElement('canvas');
          canvas.width = targetW;
          canvas.height = targetH;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(rawDataUrl);
            return;
          }
          ctx.drawImage(img, 0, 0, targetW, targetH);

          // Preserve PNG if already a small PNG (e.g., transparent lure cutout), otherwise compact JPEG
          const isPng = file.type === 'image/png' && file.size < 450 * 1024;
          const out = isPng
            ? canvas.toDataURL('image/png')
            : canvas.toDataURL('image/jpeg', quality);
          resolve(out || rawDataUrl);
        } catch {
          resolve(rawDataUrl);
        }
      };
      img.onerror = () => resolve(rawDataUrl);
      img.src = rawDataUrl;
    };
    reader.readAsDataURL(file);
  });
}

interface AdminPanelProps {
  currentUser: User;
  users: User[];
  spots: FishingSpot[];
  catches: FishCatch[];
  tournaments: Tournament[];
  activeSessions: ActiveFishingSession[];
  clubLogo: string;
  achievements?: Achievement[];
  onUpdateAchievements?: (achievements: Achievement[]) => void;
  onUpdateLogo: (newLogo: string) => Promise<boolean | void> | boolean | void;
  onUpdateUserRole: (userId: string, newRole: 'admin' | 'member') => void;
  onDeleteUser: (userId: string) => void;
  onDeleteSpot: (spotId: string) => void;
  onDeleteCatch: (catchId: string) => void;
  onEndSession: (sessionId: string) => void;
  onBroadcastNotification: (notif: AppNotification) => void;
  onResetAllData: () => void;
}

export function AdminPanel({
  currentUser,
  users,
  spots,
  catches,
  tournaments,
  activeSessions,
  clubLogo,
  achievements = [],
  onUpdateAchievements,
  onUpdateLogo,
  onUpdateUserRole,
  onDeleteUser,
  onDeleteSpot,
  onDeleteCatch,
  onEndSession,
  onBroadcastNotification,
  onResetAllData
}: AdminPanelProps) {
  const [activeTab, setActiveTab] = useState<'members' | 'spots' | 'catches' | 'achievements' | 'photos' | 'broadcast' | 'logo'>('members');
  const [memberSearch, setMemberSearch] = useState('');
  const [roleToastMsg, setRoleToastMsg] = useState('');

  // Achievements management state
  const [achievList, setAchievList] = useState<Achievement[]>(achievements);
  const [showAchievModal, setShowAchievModal] = useState(false);
  const [editingAchiev, setEditingAchiev] = useState<Achievement | null>(null);
  const [achievTitle, setAchievTitle] = useState('');
  const [achievDesc, setAchievDesc] = useState('');
  const [achievIcon, setAchievIcon] = useState('🏆');
  const [achievCategory, setAchievCategory] = useState<'record' | 'species' | 'community' | 'technique'>('record');
  const [achievValue, setAchievValue] = useState('');
  const [achievSuccessMsg, setAchievSuccessMsg] = useState('');

  // Species & Bait custom photo management state
  const [photoSubTab, setPhotoSubTab] = useState<'species' | 'baits'>('species');
  const [speciesPhotoList, setSpeciesPhotoList] = useState<SpeciesPhotoRecord[]>([]);
  const [baitPhotoList, setBaitPhotoList] = useState<BaitPhotoAdminRecord[]>([]);
  const [isLoadingPhotos, setIsLoadingPhotos] = useState(false);
  const [photoSearch, setPhotoSearch] = useState('');
  const [busyPhotoKey, setBusyPhotoKey] = useState<string | null>(null);
  const [photoFeedback, setPhotoFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [customNewBaitName, setCustomNewBaitName] = useState('');
  const [photoCacheBust, setPhotoCacheBust] = useState<number>(() => Date.now());
  const galleryInputRef = useRef<HTMLInputElement | null>(null);
  const pendingUploadTargetRef = useRef<
    | { kind: 'species'; speciesId: string; speciesName: string }
    | { kind: 'bait'; baitId?: string; baitName: string; category?: string }
    | null
  >(null);

  const loadSpeciesAndBaitPhotos = async () => {
    setIsLoadingPhotos(true);
    try {
      const [speciesRes, baitsRes] = await Promise.all([
        fetchSpeciesPhotosFromDb(),
        fetchBaitPhotosFromDb(),
      ]);
      setSpeciesPhotoList(speciesRes.records || []);
      setBaitPhotoList(baitsRes || []);
      setPhotoCacheBust(Date.now());
    } catch (err: any) {
      setPhotoFeedback({
        type: 'error',
        text: err?.message || 'Erro ao carregar catálogo de fotos do banco de dados.',
      });
    } finally {
      setIsLoadingPhotos(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'photos' && speciesPhotoList.length === 0 && baitPhotoList.length === 0) {
      void loadSpeciesAndBaitPhotos();
    }
  }, [activeTab]);

  // Deduplicate subspecies sharing identical Portuguese display names (e.g., Traíra / Tainha)
  const groupedSpeciesList = useMemo(() => {
    const CANONICAL_PRIORITY = new Set(['enxova', 'robalo', 'tucunare', 'dourado', 'corvina']);
    const byName = new Map<string, SpeciesPhotoRecord>();
    for (const r of speciesPhotoList) {
      const key = String(r.speciesName || r.speciesId).trim().toLowerCase();
      const prev = byName.get(key);
      if (!prev) {
        byName.set(key, r);
      } else if (
        (r.isCustom && !prev.isCustom) ||
        (!prev.isCustom && CANONICAL_PRIORITY.has(r.speciesId))
      ) {
        byName.set(key, r);
      }
    }
    const q = photoSearch.trim().toLowerCase();
    return Array.from(byName.values())
      .filter(s => !q || s.speciesName.toLowerCase().includes(q) || s.speciesId.toLowerCase().includes(q))
      .sort((a, b) => a.speciesName.localeCompare(b.speciesName, 'pt-BR'));
  }, [speciesPhotoList, photoSearch]);

  // Prioritize exact_ per-name baits (used across BiteTime & Spot Details), keeping canonical fallbacks secondary
  const filteredBaitList = useMemo(() => {
    const q = photoSearch.trim().toLowerCase();
    const exactOrCustom = baitPhotoList.filter(b => b.baitId.startsWith('exact_') || b.isCustom);
    const baseList = exactOrCustom.length > 0 ? exactOrCustom : baitPhotoList;
    return baseList
      .filter(
        b =>
          !q ||
          b.baitName.toLowerCase().includes(q) ||
          b.category.toLowerCase().includes(q) ||
          b.baitId.toLowerCase().includes(q)
      )
      .sort((a, b) => a.baitName.localeCompare(b.baitName, 'pt-BR'));
  }, [baitPhotoList, photoSearch]);

  const triggerGalleryUpload = (
    target:
      | { kind: 'species'; speciesId: string; speciesName: string }
      | { kind: 'bait'; baitId?: string; baitName: string; category?: string }
  ) => {
    pendingUploadTargetRef.current = target;
    galleryInputRef.current?.click();
  };

  const handleGalleryFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    const target = pendingUploadTargetRef.current;
    pendingUploadTargetRef.current = null;
    if (!file || !target) return;

    const busyKey =
      target.kind === 'species'
        ? `species_${target.speciesId}`
        : `bait_${target.baitId || target.baitName}`;
    setBusyPhotoKey(busyKey);
    setPhotoFeedback(null);

    try {
      const compressedDataUrl = await compressGalleryImageFile(file);
      if (target.kind === 'species') {
        const res = await saveSpeciesPhotoToDb(target.speciesId, target.speciesName, compressedDataUrl);
        if (!res.ok || !res.photo) {
          throw new Error(res.error || 'Falha ao salvar foto da espécie.');
        }
        setPhotoFeedback({
          type: 'success',
          text: `Foto de "${target.speciesName}" atualizada pela galeria e salva no banco de dados!`,
        });
      } else {
        const res = await saveBaitPhotoToDb({
          baitId: target.baitId,
          baitName: target.baitName,
          category: target.category,
          imageData: compressedDataUrl,
        });
        if (!res.ok || !res.photo) {
          throw new Error(res.error || 'Falha ao salvar foto da isca.');
        }
        setCustomNewBaitName('');
        setPhotoFeedback({
          type: 'success',
          text: `Foto da isca "${target.baitName}" atualizada pela galeria e salva no banco de dados!`,
        });
      }
      await loadSpeciesAndBaitPhotos();
      setTimeout(() => setPhotoFeedback(null), 5000);
    } catch (err: any) {
      setPhotoFeedback({
        type: 'error',
        text: err?.message || 'Não foi possível enviar a imagem selecionada.',
      });
    } finally {
      setBusyPhotoKey(null);
    }
  };

  const handleRevertSpecies = async (sp: SpeciesPhotoRecord) => {
    setBusyPhotoKey(`species_${sp.speciesId}`);
    setPhotoFeedback(null);
    try {
      const res = await revertSpeciesPhotoInDb(sp.speciesId);
      if (!res.ok) throw new Error(res.error || 'Falha ao restaurar foto da espécie.');
      setPhotoFeedback({
        type: 'success',
        text: `Foto original de "${sp.speciesName}" restaurada no banco de dados!`,
      });
      await loadSpeciesAndBaitPhotos();
      setTimeout(() => setPhotoFeedback(null), 4500);
    } catch (err: any) {
      setPhotoFeedback({
        type: 'error',
        text: err?.message || 'Erro ao restaurar foto da espécie.',
      });
    } finally {
      setBusyPhotoKey(null);
    }
  };

  const handleRevertBait = async (bait: BaitPhotoAdminRecord) => {
    setBusyPhotoKey(`bait_${bait.baitId}`);
    setPhotoFeedback(null);
    try {
      const res = await revertBaitPhotoInDb(bait.baitId, bait.baitName);
      if (!res.ok) throw new Error(res.error || 'Falha ao restaurar foto da isca.');
      setPhotoFeedback({
        type: 'success',
        text: `Foto real on-line de "${bait.baitName}" restaurada no banco de dados!`,
      });
      await loadSpeciesAndBaitPhotos();
      setTimeout(() => setPhotoFeedback(null), 4500);
    } catch (err: any) {
      setPhotoFeedback({
        type: 'error',
        text: err?.message || 'Erro ao restaurar foto da isca.',
      });
    } finally {
      setBusyPhotoKey(null);
    }
  };

  const [announcementTitle, setAnnouncementTitle] = useState('');
  const [announcementMsg, setAnnouncementMsg] = useState('');
  const [broadcastSuccess, setBroadcastSuccess] = useState(false);

  // Logo management state
  const [customLogoUrl, setCustomLogoUrl] = useState(clubLogo || '/assets/barrantuba_logo_crest.jpg');
  const [logoSuccessMsg, setLogoSuccessMsg] = useState('');
  const [logoErrorMsg, setLogoErrorMsg] = useState('');
  const [galleryFileLoaded, setGalleryFileLoaded] = useState(false);
  const [isSavingLogo, setIsSavingLogo] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleBroadcast = (e: React.FormEvent) => {
    e.preventDefault();
    if (!announcementTitle.trim() || !announcementMsg.trim()) return;

    const notif: AppNotification = {
      id: `notif_admin_${Date.now()}`,
      title: `📢 ${announcementTitle.trim()}`,
      message: announcementMsg.trim(),
      type: 'admin',
      timestamp: new Date().toISOString(),
      read: false
    };

    onBroadcastNotification(notif);
    setAnnouncementTitle('');
    setAnnouncementMsg('');
    setBroadcastSuccess(true);
    setTimeout(() => setBroadcastSuccess(false), 3500);
  };

  const handleExportData = () => {
    const backup = {
      exportedAt: new Date().toISOString(),
      club: 'Barrantuba Clube de Pesca',
      users,
      spots,
      catches,
      tournaments
    };
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `backup_barrantuba_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-amber-950/40 via-slate-900 to-slate-900 border-2 border-amber-500/50 rounded-2xl p-6 shadow-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-amber-400 font-bold text-xs uppercase tracking-wider mb-1">
            <ShieldCheck className="w-4 h-4 text-amber-400" />
            <span>Painel de Controle do Administrador</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Gerenciamento Geral do Barrantuba
          </h1>
          <p className="text-sm text-slate-300 mt-1 max-w-xl">
            Como administrador ({currentUser.email}), você tem poder total para editar, moderar ou remover pontos, peixes, membros e torneios em todo o aplicativo.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportData}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors"
          >
            <Download className="w-4 h-4 text-cyan-400" />
            <span>Exportar Backup (JSON)</span>
          </button>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4">
          <div className="text-xs text-slate-400 mb-1 flex items-center justify-between">
            <span>Membros</span>
            <Users className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-slate-100 font-mono-numbers">{users.length}</div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4">
          <div className="text-xs text-slate-400 mb-1 flex items-center justify-between">
            <span>Pontos de Pesca</span>
            <MapPin className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-bold text-slate-100 font-mono-numbers">{spots.length}</div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4">
          <div className="text-xs text-slate-400 mb-1 flex items-center justify-between">
            <span>Peixes Registrados</span>
            <Fish className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-slate-100 font-mono-numbers">{catches.length}</div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4">
          <div className="text-xs text-slate-400 mb-1 flex items-center justify-between">
            <span>Pescando Agora</span>
            <Radio className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-2xl font-bold text-slate-100 font-mono-numbers">{activeSessions.length}</div>
        </div>
      </div>

      {/* Admin Tabs */}
      <div className="flex items-center gap-1.5 p-1 bg-slate-900 border border-slate-800 rounded-xl overflow-x-auto max-w-full">
        <button
          onClick={() => setActiveTab('members')}
          className={`px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors flex items-center gap-1.5 ${
            activeTab === 'members' ? 'bg-amber-500 text-slate-950 shadow-sm font-bold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>Membros ({users.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('achievements')}
          className={`px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors flex items-center gap-1.5 ${
            activeTab === 'achievements' ? 'bg-amber-500 text-slate-950 shadow-sm font-bold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Trophy className="w-3.5 h-3.5" />
          <span>Recordes & Troféus ({achievList.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('spots')}
          className={`px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors flex items-center gap-1.5 ${
            activeTab === 'spots' ? 'bg-amber-500 text-slate-950 shadow-sm font-bold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <MapPin className="w-3.5 h-3.5" />
          <span>Pontos ({spots.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('catches')}
          className={`px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors flex items-center gap-1.5 ${
            activeTab === 'catches' ? 'bg-amber-500 text-slate-950 shadow-sm font-bold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Fish className="w-3.5 h-3.5" />
          <span>Capturas ({catches.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('photos')}
          className={`px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors flex items-center gap-1.5 ${
            activeTab === 'photos' ? 'bg-amber-500 text-slate-950 shadow-sm font-bold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Camera className="w-3.5 h-3.5" />
          <span>Espécies & Iscas</span>
        </button>
        <button
          onClick={() => setActiveTab('broadcast')}
          className={`px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors flex items-center gap-1.5 ${
            activeTab === 'broadcast' ? 'bg-amber-500 text-slate-950 shadow-sm font-bold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Bell className="w-3.5 h-3.5" />
          <span>Comunicado</span>
        </button>
        <button
          onClick={() => setActiveTab('logo')}
          className={`px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors flex items-center gap-1.5 ${
            activeTab === 'logo' ? 'bg-amber-500 text-slate-950 shadow-sm font-bold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <ImageIcon className="w-3.5 h-3.5" />
          <span>Logo</span>
        </button>
      </div>

      {/* Tab 1: Members Management */}
      {activeTab === 'members' && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden shadow-xl space-y-0">
          <div className="p-4 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-1.5">
                <Users className="w-4 h-4 text-emerald-400" />
                <span>Membros Cadastrados ({users.length})</span>
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Selecione qualquer membro para conceder ou remover permissões de Administrador do clube
              </p>
            </div>
          </div>

          {/* Search bar */}
          <div className="p-3 bg-slate-950/80 border-b border-slate-800 flex items-center gap-2">
            <Search className="w-4 h-4 text-slate-400 shrink-0" />
            <input
              type="text"
              placeholder="Buscar por nome, usuário @handle ou email..."
              value={memberSearch}
              onChange={(e) => setMemberSearch(e.target.value)}
              className="bg-transparent text-xs text-white placeholder-slate-500 focus:outline-none w-full"
            />
          </div>

          {/* Toast message upon role change */}
          {roleToastMsg && (
            <div className="p-3 bg-emerald-950/90 border-b border-emerald-500/50 text-emerald-300 text-xs font-bold flex items-center gap-2 animate-in fade-in">
              <Check className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{roleToastMsg}</span>
            </div>
          )}

          {/* Members List */}
          <div className="divide-y divide-slate-800/60">
            {users
              .filter(u => {
                if (!memberSearch.trim()) return true;
                const q = memberSearch.toLowerCase();
                return u.name.toLowerCase().includes(q) ||
                  u.email.toLowerCase().includes(q) ||
                  (u.handle && u.handle.toLowerCase().includes(q));
              })
              .map(u => {
                const isCurrent = u.id === currentUser.id;
                return (
                  <div key={u.id} className="p-3.5 hover:bg-slate-800/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      <img
                        src={u.avatar}
                        alt={u.name}
                        className="w-10 h-10 rounded-full object-cover border border-slate-700 shrink-0 ring-1 ring-slate-800"
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-bold text-xs text-white truncate">{u.name}</span>
                          {u.handle && (
                            <span className="text-[10px] text-emerald-400 font-mono font-medium">{u.handle}</span>
                          )}
                          {isCurrent && (
                            <span className="text-[9px] bg-slate-800 text-slate-400 px-1.5 py-0.2 rounded font-semibold">
                              (Você)
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-400 truncate mt-0.5">{u.email}</div>
                        {u.city && (
                          <div className="text-[10px] text-slate-500 truncate">{u.city}</div>
                        )}
                      </div>
                    </div>

                    {/* Role Selector & Actions */}
                    <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-slate-400 hidden xs:inline">Cargo:</span>
                        <select
                          value={u.role}
                          disabled={isCurrent}
                          onChange={(e) => {
                            const newRole = e.target.value as 'admin' | 'member';
                            onUpdateUserRole(u.id, newRole);
                            setRoleToastMsg(`Permissão de "${u.name}" alterada para "${newRole === 'admin' ? 'Administrador' : 'Membro'}" com sucesso no banco de dados!`);
                            setTimeout(() => setRoleToastMsg(''), 4500);
                          }}
                          className={`text-xs font-bold px-3 py-1.5 rounded-xl border focus:outline-none transition-colors cursor-pointer ${
                            u.role === 'admin'
                              ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                              : 'bg-slate-950 text-slate-300 border-slate-700'
                          } ${isCurrent ? 'opacity-70 cursor-not-allowed' : ''}`}
                        >
                          <option value="member" className="bg-slate-900 text-slate-200">Membro Pescador</option>
                          <option value="admin" className="bg-slate-900 text-amber-300">★ Administrador</option>
                        </select>
                      </div>

                      {!isCurrent && (
                        <button
                          onClick={() => {
                            if (confirm(`Tem certeza que deseja excluir a conta de "${u.name}"?`)) {
                              onDeleteUser(u.id);
                            }
                          }}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-950/40 transition-colors"
                          title="Excluir membro"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* Tab: Achievements / Recordes / Medalhas / Troféus (Requested by User) */}
      {activeTab === 'achievements' && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden shadow-xl space-y-4 p-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
            <div>
              <div className="flex items-center gap-1.5 text-xs uppercase tracking-wider text-amber-400 font-bold mb-0.5">
                <Trophy className="w-4 h-4" />
                <span>Gestão Oficial de Conquistas do Barrantuba</span>
              </div>
              <h3 className="text-base font-extrabold text-white">
                Recordes, Medalhas & Troféus ({achievList.length})
              </h3>
              <p className="text-xs text-slate-300 mt-0.5 max-w-xl">
                Crie e configure os troféus exibidos no Perfil dos pescadores. Todas as alterações são salvas diretamente no banco de dados.
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                setEditingAchiev(null);
                setAchievTitle('');
                setAchievDesc('');
                setAchievIcon('🏆');
                setAchievCategory('record');
                setAchievValue('');
                setShowAchievModal(true);
              }}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-lg transition-transform active:scale-95 shrink-0 cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>Criar Nova Conquista</span>
            </button>
          </div>

          {achievSuccessMsg && (
            <div className="p-3 bg-emerald-950/90 border border-emerald-500/50 text-emerald-300 text-xs font-bold rounded-xl flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{achievSuccessMsg}</span>
            </div>
          )}

          {/* Achievements Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {achievList.map((ach) => (
              <div 
                key={ach.id} 
                className="bg-[#061423] border border-slate-800 rounded-2xl p-3.5 flex items-start gap-3.5 shadow-md justify-between"
              >
                <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-2xl flex items-center justify-center shrink-0">
                  {ach.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-[10px] uppercase font-bold text-amber-400 tracking-wider">
                      {ach.category === 'record' ? 'Recorde' : ach.category === 'species' ? 'Espécie' : ach.category === 'technique' ? 'Técnica' : 'Medalha'}
                    </span>
                    <span className="text-[10px] font-black text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full shrink-0">
                      Meta: {ach.value || 'Geral'}
                    </span>
                  </div>
                  <h4 className="text-xs font-bold text-white truncate mt-1">{ach.title}</h4>
                  <p className="text-[11px] text-slate-400 mt-1 leading-snug line-clamp-2">{ach.description}</p>
                </div>

                <div className="flex items-center gap-1 shrink-0 self-start">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingAchiev(ach);
                      setAchievTitle(ach.title);
                      setAchievDesc(ach.description);
                      setAchievIcon(ach.icon);
                      setAchievCategory(ach.category);
                      setAchievValue(ach.value || '');
                      setShowAchievModal(true);
                    }}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
                    title="Editar conquista"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm(`Excluir a conquista "${ach.title}"?`)) {
                        const updated = achievList.filter(a => a.id !== ach.id);
                        setAchievList(updated);
                        onUpdateAchievements?.(updated);
                        setAchievSuccessMsg('Conquista removida do banco de dados!');
                        setTimeout(() => setAchievSuccessMsg(''), 4000);
                      }
                    }}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-950/40"
                    title="Excluir conquista"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Create / Edit Achievement Modal */}
          {showAchievModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-950/80 backdrop-blur-sm">
              <div className="w-full max-w-md bg-[#071421] border border-slate-800 rounded-3xl p-5 shadow-2xl space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <Trophy className="w-4 h-4 text-amber-400" />
                    <h3 className="text-sm font-bold text-white">
                      {editingAchiev ? 'Editar Conquista / Troféu' : 'Criar Nova Conquista / Troféu'}
                    </h3>
                  </div>
                  <button
                    onClick={() => setShowAchievModal(false)}
                    className="text-slate-400 hover:text-white text-xs font-bold"
                  >
                    ✕
                  </button>
                </div>

                <div className="space-y-3 text-xs">
                  <div>
                    <label className="text-slate-400 font-semibold block mb-1">Título do Troféu / Conquista *</label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: Troféu Rei do Tucunaré"
                      value={achievTitle}
                      onChange={(e) => setAchievTitle(e.target.value)}
                      className="w-full bg-[#05111c] border border-slate-700 rounded-xl p-2.5 text-white focus:outline-none focus:border-amber-400"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-slate-400 font-semibold block mb-1">Categoria</label>
                      <select
                        value={achievCategory}
                        onChange={(e) => setAchievCategory(e.target.value as any)}
                        className="w-full bg-[#05111c] border border-slate-700 rounded-xl p-2.5 text-white focus:outline-none focus:border-amber-400"
                      >
                        <option value="record">Recorde de Peso</option>
                        <option value="species">Espécie / Troféu</option>
                        <option value="community">Medalha Comunitária</option>
                        <option value="technique">Técnica de Pesca</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-slate-400 font-semibold block mb-1">Meta / Valor</label>
                      <input
                        type="text"
                        placeholder="Ex: 5 kg ou 3 peixes"
                        value={achievValue}
                        onChange={(e) => setAchievValue(e.target.value)}
                        className="w-full bg-[#05111c] border border-slate-700 rounded-xl p-2.5 text-white focus:outline-none focus:border-amber-400"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-slate-400 font-semibold block mb-1">Ícone / Emoji</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={achievIcon}
                        onChange={(e) => setAchievIcon(e.target.value)}
                        className="w-16 text-center text-lg bg-[#05111c] border border-slate-700 rounded-xl p-2 text-white"
                      />
                      <div className="flex gap-1.5 flex-wrap">
                        {['🏆', '🥇', '⚡', '👑', '🎯', '🌊', '📸', '⚓', '🌅', '🎣', '🎖️', '💎'].map(emoji => (
                          <button
                            key={emoji}
                            type="button"
                            onClick={() => setAchievIcon(emoji)}
                            className="p-1 rounded-lg hover:bg-slate-800 text-base"
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="text-slate-400 font-semibold block mb-1">Descrição</label>
                    <textarea
                      rows={2}
                      placeholder="Descreva o que o pescador precisa fazer para desbloquear..."
                      value={achievDesc}
                      onChange={(e) => setAchievDesc(e.target.value)}
                      className="w-full bg-[#05111c] border border-slate-700 rounded-xl p-2.5 text-white focus:outline-none focus:border-amber-400 resize-none"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      if (!achievTitle.trim()) return;
                      let updated: Achievement[];
                      if (editingAchiev) {
                        updated = achievList.map(a => a.id === editingAchiev.id ? {
                          ...a,
                          title: achievTitle.trim(),
                          description: achievDesc.trim(),
                          icon: achievIcon,
                          category: achievCategory,
                          value: achievValue.trim()
                        } : a);
                      } else {
                        const newAch: Achievement = {
                          id: `ach_custom_${Date.now()}`,
                          title: achievTitle.trim(),
                          description: achievDesc.trim(),
                          icon: achievIcon,
                          category: achievCategory,
                          value: achievValue.trim(),
                          unlocked: false
                        };
                        updated = [newAch, ...achievList];
                      }

                      setAchievList(updated);
                      onUpdateAchievements?.(updated);
                      setShowAchievModal(false);
                      setAchievSuccessMsg('Conquista salva com sucesso no banco de dados!');
                      setTimeout(() => setAchievSuccessMsg(''), 4000);
                    }}
                    className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-lg transition-transform"
                  >
                    Salvar Conquista no Banco de Dados
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab: Species & Bait Photos Management (Gallery / PC Upload) */}
      {activeTab === 'photos' && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden shadow-xl space-y-4 p-4 sm:p-5">
          {/* Hidden shared gallery/PC file picker */}
          <input
            ref={galleryInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleGalleryFileChange}
          />

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
            <div>
              <div className="flex items-center gap-1.5 text-xs uppercase tracking-wider text-emerald-400 font-bold mb-0.5">
                <Camera className="w-4 h-4" />
                <span>Personalização de Imagens • Galeria do Celular ou PC</span>
              </div>
              <h3 className="text-base font-extrabold text-white">
                Fotos das Espécies Alvo e das Iscas
              </h3>
              <p className="text-xs text-slate-300 mt-0.5 max-w-2xl">
                Escolha uma imagem da galeria do celular ou do computador para atualizar qualquer peixe alvo ou isca no BiteTime™ e nos detalhes dos pontos de pesca. Tudo é salvo no PostgreSQL.
              </p>
            </div>

            <button
              type="button"
              onClick={() => void loadSpeciesAndBaitPhotos()}
              disabled={isLoadingPhotos}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors shrink-0 self-start sm:self-center cursor-pointer disabled:opacity-60"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-cyan-400 ${isLoadingPhotos ? 'animate-spin' : ''}`} />
              <span>Atualizar Lista</span>
            </button>
          </div>

          {/* Sub-tabs: Espécies Alvo vs Iscas + Search */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="inline-flex items-center gap-1 p-1 bg-slate-950 border border-slate-800 rounded-xl self-start">
              <button
                type="button"
                onClick={() => {
                  setPhotoSubTab('species');
                  setPhotoSearch('');
                }}
                className={`px-3.5 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                  photoSubTab === 'species'
                    ? 'bg-emerald-500 text-slate-950 shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Fish className="w-3.5 h-3.5" />
                <span>Espécies Alvo ({groupedSpeciesList.length})</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setPhotoSubTab('baits');
                  setPhotoSearch('');
                }}
                className={`px-3.5 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                  photoSubTab === 'baits'
                    ? 'bg-amber-500 text-slate-950 shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Target className="w-3.5 h-3.5" />
                <span>Iscas ({filteredBaitList.length})</span>
              </button>
            </div>

            <div className="flex items-center gap-2 bg-slate-950/90 border border-slate-800 rounded-xl px-3 py-2 flex-1 max-w-sm">
              <Search className="w-4 h-4 text-slate-400 shrink-0" />
              <input
                type="text"
                placeholder={photoSubTab === 'species' ? 'Buscar espécie alvo (ex: Tucunaré, Robalo)...' : 'Buscar isca (ex: Sardinha, Camarão, Zara)...'}
                value={photoSearch}
                onChange={(e) => setPhotoSearch(e.target.value)}
                className="bg-transparent text-xs text-white placeholder-slate-500 focus:outline-none w-full"
              />
            </div>
          </div>

          {photoFeedback && (
            <div
              className={`p-3 rounded-xl border text-xs font-bold flex items-center gap-2 ${
                photoFeedback.type === 'success'
                  ? 'bg-emerald-950/80 border-emerald-500/50 text-emerald-300'
                  : 'bg-rose-950/80 border-rose-500/50 text-rose-300'
              }`}
            >
              {photoFeedback.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              )}
              <span>{photoFeedback.text}</span>
            </div>
          )}

          {isLoadingPhotos && speciesPhotoList.length === 0 && baitPhotoList.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center text-slate-400 gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-emerald-400" />
              <span className="text-xs">Carregando espécies e iscas do banco de dados...</span>
            </div>
          ) : photoSubTab === 'species' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {groupedSpeciesList.map((sp) => {
                const isBusy = busyPhotoKey === `species_${sp.speciesId}`;
                const previewSrc = `${sp.imageData}${sp.imageData.includes('?') ? '&' : '?'}t=${photoCacheBust}`;
                return (
                  <div
                    key={sp.speciesId}
                    className="bg-[#061423] border border-slate-800 rounded-2xl p-3 flex flex-col gap-3 shadow-md"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-20 h-16 rounded-xl bg-gradient-to-b from-slate-800/40 to-slate-950 border border-slate-800 overflow-hidden shrink-0 flex items-center justify-center p-1">
                        <img
                          src={previewSrc}
                          alt={sp.speciesName}
                          className="w-full h-full object-contain drop-shadow-[0_6px_10px_rgba(0,0,0,0.7)]"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-extrabold text-white truncate">
                          {sp.speciesName}
                        </div>
                        <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              sp.isCustom
                                ? 'bg-amber-500/15 text-amber-300 border border-amber-500/40'
                                : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                            }`}
                          >
                            {sp.isCustom ? 'Personalizada (Galeria)' : 'Padrão / On-line'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() =>
                          triggerGalleryUpload({
                            kind: 'species',
                            speciesId: sp.speciesId,
                            speciesName: sp.speciesName,
                          })
                        }
                        className="flex-1 py-2 px-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-[11px] flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-60"
                      >
                        {isBusy ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Upload className="w-3.5 h-3.5" />
                        )}
                        <span>{isBusy ? 'Salvando...' : 'Alterar Foto (Galeria/PC)'}</span>
                      </button>

                      {sp.isCustom && (
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => void handleRevertSpecies(sp)}
                          className="py-2 px-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-[11px] font-semibold flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-60"
                          title="Restaurar foto original"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Padrão</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}

              {groupedSpeciesList.length === 0 && (
                <div className="col-span-full py-8 text-center text-xs text-slate-400">
                  Nenhuma espécie encontrada para "{photoSearch}".
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {/* Quick bar to upload photo for a custom/new bait name */}
              <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl flex flex-col sm:flex-row sm:items-center gap-2">
                <span className="text-[11px] font-bold text-slate-300 shrink-0">
                  Cadastrar ou alterar isca por nome:
                </span>
                <input
                  type="text"
                  placeholder="Digite o nome exato da isca (ex: Camarão Soft 12cm)..."
                  value={customNewBaitName}
                  onChange={(e) => setCustomNewBaitName(e.target.value)}
                  className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                />
                <button
                  type="button"
                  disabled={!customNewBaitName.trim() || Boolean(busyPhotoKey)}
                  onClick={() =>
                    triggerGalleryUpload({
                      kind: 'bait',
                      baitName: customNewBaitName.trim(),
                    })
                  }
                  className="px-3.5 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-[11px] flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50 shrink-0"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Escolher Foto (Galeria/PC)</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {filteredBaitList.map((bait) => {
                  const isBusy = busyPhotoKey === `bait_${bait.baitId}`;
                  const previewSrc = `${bait.image}${bait.image.includes('?') ? '&' : '?'}t=${photoCacheBust}`;
                  return (
                    <div
                      key={bait.baitId}
                      className="bg-[#061423] border border-slate-800 rounded-2xl p-3 flex flex-col gap-3 shadow-md"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-20 h-16 rounded-xl bg-gradient-to-b from-slate-800/40 to-slate-950 border border-slate-800 overflow-hidden shrink-0 flex items-center justify-center p-1">
                          <img
                            src={previewSrc}
                            alt={bait.baitName}
                            className="w-full h-full object-contain drop-shadow-[0_6px_10px_rgba(0,0,0,0.7)]"
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-extrabold text-white line-clamp-2">
                            {bait.baitName}
                          </div>
                          <div className="text-[10px] text-slate-400 truncate mt-0.5">
                            {bait.category}
                          </div>
                          <div className="mt-1">
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                bait.isCustom
                                  ? 'bg-amber-500/15 text-amber-300 border border-amber-500/40'
                                  : 'bg-cyan-500/10 text-cyan-300 border border-cyan-500/30'
                              }`}
                            >
                              {bait.isCustom ? 'Personalizada (Galeria)' : 'On-line / Banco'}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() =>
                            triggerGalleryUpload({
                              kind: 'bait',
                              baitId: bait.baitId,
                              baitName: bait.baitName,
                              category: bait.category,
                            })
                          }
                          className="flex-1 py-2 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-[11px] flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-60"
                        >
                          {isBusy ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Upload className="w-3.5 h-3.5" />
                          )}
                          <span>{isBusy ? 'Salvando...' : 'Alterar Foto (Galeria/PC)'}</span>
                        </button>

                        {bait.isCustom && (
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => void handleRevertBait(bait)}
                            className="py-2 px-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-[11px] font-semibold flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-60"
                            title="Restaurar foto real on-line"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>Padrão</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}

                {filteredBaitList.length === 0 && (
                  <div className="col-span-full py-8 text-center text-xs text-slate-400">
                    Nenhuma isca encontrada para "{photoSearch}".
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Spots Management */}
      {activeTab === 'spots' && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="p-4 border-b border-slate-800 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-100">
              Controle de Todos os Pontos de Pesca
            </h3>
            <span className="text-xs text-slate-400">Você pode remover ou moderar qualquer ponto</span>
          </div>

          <div className="divide-y divide-slate-800/80">
            {spots.map(s => (
              <div key={s.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-800/30">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-100 text-sm">{s.name}</span>
                    <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded uppercase">
                      {s.waterType} · {s.accessType}
                    </span>
                  </div>
                  <div className="text-xs text-slate-400 mt-1 line-clamp-1">{s.structureNotes}</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    Cadastrado por: {s.createdByUserName} · Coords: {s.latitude.toFixed(4)}, {s.longitude.toFixed(4)}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => {
                      if (confirm(`Excluir permanentemente o ponto "${s.name}"?`)) {
                        onDeleteSpot(s.id);
                      }
                    }}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-rose-950/40 hover:bg-rose-950/70 border border-rose-800/50 text-rose-300 text-xs font-semibold"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Excluir Ponto</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 3: Catches Management */}
      {activeTab === 'catches' && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="p-4 border-b border-slate-800 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-100">
              Moderação de Peixes Registrados
            </h3>
            <span className="text-xs text-slate-400">Exclua capturas irregulares ou duplicadas</span>
          </div>

          <div className="divide-y divide-slate-800/80">
            {catches.map(c => (
              <div key={c.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-800/30">
                <div className="flex items-center gap-3">
                  <img
                    src={c.photoUrl}
                    alt={c.species}
                    className="w-12 h-12 rounded-lg object-cover border border-slate-700"
                  />
                  <div>
                    <div className="font-bold text-slate-100 text-sm flex items-center gap-2">
                      <span>{c.species}</span>
                      <span className="text-xs text-amber-400 font-mono-numbers font-normal">
                        ({c.weightKg} kg · {c.lengthCm} cm)
                      </span>
                    </div>
                    <div className="text-xs text-slate-300">
                      Isca: <strong className="text-amber-300">{c.baitUsed}</strong> · Ponto: {c.spotName}
                    </div>
                    <div className="text-[11px] text-slate-500">
                      Pescador: {c.userName} em {new Date(c.capturedAt).toLocaleDateString('pt-BR')}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => {
                      if (confirm(`Excluir a captura do ${c.species} (${c.weightKg}kg)?`)) {
                        onDeleteCatch(c.id);
                      }
                    }}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-rose-950/40 hover:bg-rose-950/70 border border-rose-800/50 text-rose-300 text-xs font-semibold"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Excluir Captura</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 4: Broadcast Announcement */}
      {activeTab === 'broadcast' && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl">
          <div className="mb-4">
            <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <Bell className="w-4 h-4 text-amber-400" />
              <span>Enviar Comunicado Oficial do Administrador</span>
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Esta notificação aparecerá para todos os membros do grupo Barrantuba no sininho de avisos.
            </p>
          </div>

          {broadcastSuccess && (
            <div className="mb-4 p-3 bg-emerald-950/60 border border-emerald-500/50 rounded-xl text-emerald-300 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Comunicado transmitido com sucesso para todos os membros do Barrantuba!</span>
            </div>
          )}

          <form onSubmit={handleBroadcast} className="space-y-4 max-w-xl">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Título do Comunicado
              </label>
              <input
                type="text"
                required
                placeholder="Ex: Condições perfeitas na represa neste fim de semana!"
                value={announcementTitle}
                onChange={(e) => setAnnouncementTitle(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Mensagem do Comunicado
              </label>
              <textarea
                rows={3}
                required
                placeholder="Digite as orientações, datas de mutirão de limpeza, regras ou avisos do clube..."
                value={announcementMsg}
                onChange={(e) => setAnnouncementMsg(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500"
              />
            </div>

            <button
              type="submit"
              className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-lg transition-transform active:scale-95 flex items-center gap-2"
            >
              <Bell className="w-4 h-4" />
              <span>Publicar Comunicado Geral</span>
            </button>
          </form>
        </div>
      )}

      {/* Tab 5: Club Logo Management */}
      {activeTab === 'logo' && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
          <div className="border-b border-slate-800 pb-4">
            <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <ImageIcon className="w-4 h-4 text-emerald-400" />
              <span>Personalizar Logotipo do Barrantuba</span>
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Como administrador, você pode trocar a imagem do logotipo do clube. Ela será atualizada instantaneamente na tela inicial de login e na barra de navegação de todos os pescadores.
            </p>
          </div>

          {logoSuccessMsg && (
            <div className="p-3 bg-emerald-950/70 border border-emerald-500/60 rounded-xl text-emerald-300 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{logoSuccessMsg}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
            {/* Live Preview Box */}
            <div className="p-6 bg-slate-950/80 border border-slate-800 rounded-2xl flex flex-col items-center justify-center text-center">
              <span className="text-xs font-semibold text-slate-400 mb-4 uppercase tracking-wider">
                Pré-visualização do Logo
              </span>

              <div className="relative mb-3 group">
                <div className="absolute -inset-1 rounded-full bg-gradient-to-tr from-emerald-500 via-teal-400 to-cyan-500 opacity-80 blur-sm"></div>
                <div className="relative w-32 h-32 rounded-full p-1 bg-gradient-to-tr from-emerald-500 to-cyan-400 shadow-2xl flex items-center justify-center overflow-hidden">
                  <img
                    src={customLogoUrl || clubLogo || '/assets/barrantuba_logo_crest.jpg'}
                    alt="Pré-visualização do Logo"
                    onError={(e) => {
                      const target = e.currentTarget;
                      if (!target.src.endsWith('/assets/barrantuba_logo_crest.jpg')) {
                        target.src = '/assets/barrantuba_logo_crest.jpg';
                      }
                    }}
                    className="w-full h-full rounded-full object-cover bg-slate-950"
                  />
                </div>
              </div>

              <div className="text-lg font-black text-white uppercase tracking-tight">
                Barrantuba
              </div>
              <div className="text-[11px] text-emerald-400 font-bold uppercase tracking-widest mt-0.5">
                Clube de Pesca Esportiva
              </div>
            </div>

            {/* Upload & Options Form */}
            <div className="space-y-4">
              {/* Option A: Upload file from device */}
              <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-xl space-y-2.5">
                <div className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                  <Upload className="w-4 h-4 text-cyan-400" />
                  <span>Opção 1: Enviar Imagem do seu Celular ou Computador</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Envie um arquivo PNG, JPG, JPEG ou WebP diretamente do seu dispositivo:
                </p>

                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setLogoSuccessMsg('');
                      setLogoErrorMsg('');
                      const reader = new FileReader();
                      reader.onload = (event) => {
                        const raw = event.target?.result as string;
                        if (!raw) return;
                        const img = new Image();
                        img.onload = () => {
                          const canvas = document.createElement('canvas');
                          const maxDim = 512;
                          let w = img.naturalWidth || img.width || maxDim;
                          let h = img.naturalHeight || img.height || maxDim;
                          if (w > maxDim || h > maxDim) {
                            if (w > h) {
                              h = Math.round((h * maxDim) / w);
                              w = maxDim;
                            } else {
                              w = Math.round((w * maxDim) / h);
                              h = maxDim;
                            }
                          }
                          canvas.width = w;
                          canvas.height = h;
                          const ctx = canvas.getContext('2d');
                          if (ctx) {
                            ctx.drawImage(img, 0, 0, w, h);
                            const compressed = canvas.toDataURL('image/jpeg', 0.88);
                            setCustomLogoUrl(compressed);
                            setGalleryFileLoaded(true);
                          } else {
                            setCustomLogoUrl(raw);
                            setGalleryFileLoaded(true);
                          }
                        };
                        img.onerror = () => {
                          setCustomLogoUrl(raw);
                          setGalleryFileLoaded(true);
                        };
                        img.src = raw;
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                />

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <Upload className="w-4 h-4 text-cyan-400" />
                  <span>Escolher Foto da Galeria do Celular ou PC</span>
                </button>

                {galleryFileLoaded && (
                  <div className="flex items-center gap-2 text-[11px] font-bold text-emerald-300 bg-emerald-500/15 border border-emerald-500/40 px-3 py-2 rounded-xl">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Foto carregada com sucesso! Clique em "Salvar Novo Logotipo" abaixo para gravar no banco.</span>
                  </div>
                )}
              </div>

              {/* Option B: Enter image URL */}
              <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-xl space-y-2">
                <div className="text-xs font-bold text-slate-200">
                  Opção 2: Ou Cole a URL da Imagem da Web
                </div>
                <input
                  type="url"
                  placeholder="https://exemplo.com/logo-barrantuba.png"
                  value={customLogoUrl}
                  onChange={(e) => setCustomLogoUrl(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Option C: Presets */}
              <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-xl space-y-2">
                <div className="text-xs font-bold text-slate-200">
                  Opção 3: Logos Oficiais Disponíveis
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setCustomLogoUrl('/assets/barrantuba_logo_crest.jpg')}
                    className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-emerald-500/50 flex items-center gap-2.5 text-left transition-colors cursor-pointer"
                  >
                    <img
                      src="/assets/barrantuba_logo_crest.jpg"
                      alt="Brasão Oficial Barrantuba"
                      className="w-9 h-9 rounded-full object-cover border border-slate-700 shrink-0"
                    />
                    <div className="min-w-0">
                      <div className="text-[11px] font-bold text-slate-200 truncate">
                        Brasão Oficial Barrantuba
                      </div>
                      <div className="text-[10px] text-emerald-400">Padrão do Clube</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setCustomLogoUrl(BARRANTUBA_LOGO)}
                    className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-emerald-500/50 flex items-center gap-2.5 text-left transition-colors cursor-pointer"
                  >
                    <img
                      src={BARRANTUBA_LOGO}
                      alt="Emblema Alta Definição"
                      className="w-9 h-9 rounded-full object-cover border border-slate-700 shrink-0"
                    />
                    <div className="min-w-0">
                      <div className="text-[11px] font-bold text-slate-200 truncate">
                        Emblema Alta Definição
                      </div>
                      <div className="text-[10px] text-slate-400">Design Circular</div>
                    </div>
                  </button>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  disabled={isSavingLogo || !customLogoUrl.trim()}
                  onClick={async () => {
                    if (customLogoUrl.trim()) {
                      setIsSavingLogo(true);
                      setLogoSuccessMsg('');
                      setLogoErrorMsg('');
                      try {
                        const ok = await onUpdateLogo(customLogoUrl.trim());
                        if (ok !== false) {
                          setLogoSuccessMsg('✓ Alteração salva de verdade no banco de dados! O novo logotipo foi gravado no PostgreSQL e está ativo para todos os membros que acessarem o Barrantuba em qualquer celular, computador, 5G ou Wi-Fi.');
                          setGalleryFileLoaded(false);
                          setTimeout(() => setLogoSuccessMsg(''), 8000);
                        } else {
                          setLogoErrorMsg('Não foi possível gravar no banco de dados. Verifique a conexão e tente novamente.');
                        }
                      } catch (err: any) {
                        setLogoErrorMsg(err?.message || 'Erro ao salvar logotipo no banco.');
                      } finally {
                        setIsSavingLogo(false);
                      }
                    }
                  }}
                  className="flex-1 min-h-[44px] py-3 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-slate-950 font-black text-xs shadow-xl transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                >
                  {isSavingLogo ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                      <span>Gravando no Banco de Dados...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Salvar Novo Logotipo</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  disabled={isSavingLogo}
                  onClick={async () => {
                    setIsSavingLogo(true);
                    setLogoSuccessMsg('');
                    setLogoErrorMsg('');
                    setCustomLogoUrl('/assets/barrantuba_logo_crest.jpg');
                    try {
                      await onUpdateLogo('/assets/barrantuba_logo_crest.jpg');
                      setLogoSuccessMsg('✓ Logotipo restaurado para o brasão oficial padrão do Barrantuba com sucesso no banco de dados!');
                      setGalleryFileLoaded(false);
                      setTimeout(() => setLogoSuccessMsg(''), 8000);
                    } catch (err: any) {
                      setLogoErrorMsg(err?.message || 'Erro ao restaurar logotipo.');
                    } finally {
                      setIsSavingLogo(false);
                    }
                  }}
                  className="px-3.5 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-60"
                  title="Restaurar Logo Padrão"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Padrão</span>
                </button>
              </div>

              {/* Prominent Save Feedback right below the action buttons */}
              {logoSuccessMsg && (
                <div className="p-4 bg-emerald-950/80 border-2 border-emerald-500 rounded-2xl text-emerald-200 text-xs font-bold flex items-start gap-3 animate-in fade-in duration-200 shadow-2xl">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                  <div className="leading-relaxed">
                    {logoSuccessMsg}
                  </div>
                </div>
              )}

              {logoErrorMsg && (
                <div className="p-4 bg-rose-950/80 border border-rose-500 rounded-2xl text-rose-200 text-xs font-bold flex items-start gap-3 animate-in fade-in duration-200 shadow-2xl">
                  <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                  <div className="leading-relaxed">
                    {logoErrorMsg}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      <div className="p-4 bg-slate-950/60 border border-rose-950 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="text-xs font-bold text-rose-400 flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Zona de Restauração</span>
          </div>
          <div className="text-[11px] text-slate-400">
            Deseja restaurar os dados originais padrão de demonstração do Barrantuba?
          </div>
        </div>

        <button
          onClick={() => {
            if (confirm('Atenção: Isso restaurará os pontos, peixes e torneios para o estado inicial padrão. Deseja prosseguir?')) {
              onResetAllData();
            }
          }}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-rose-400 hover:bg-rose-950/40 border border-rose-800/40"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Restaurar Padrões de Fábrica</span>
        </button>
      </div>
    </div>
  );
}
