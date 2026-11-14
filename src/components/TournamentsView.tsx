import { useState, useRef } from 'react';
import { Tournament, User } from '../types';
import {
  Trophy,
  Calendar,
  MapPin,
  Users,
  Award,
  Plus,
  Check,
  AlertCircle,
  X,
  Camera,
  Loader2,
  Trash2,
  Maximize2,
  Pencil,
  Ruler,
  Phone,
  Clock,
  FileText,
} from 'lucide-react';

interface TournamentsViewProps {
  tournaments: Tournament[];
  currentUser: User | null;
  onRegisterTournament: (tournamentId: string) => void;
  onCreateTournament?: (tourn: Tournament) => Promise<{ ok: boolean; error?: string } | void> | void;
  onDeleteTournament?: (tournamentId: string) => void;
}

const DEFAULT_RULES = [
  'Uso obrigatório de iscas artificiais (exceto categorias liberadas pela organização)',
  'Modalidade 100% Pesque & Solte com medição oficial em régua homologada',
  'Colete salva-vidas homologado obrigatório durante navegação',
  'Pontuação calculada pela soma dos 3 maiores peixes válidos',
];

const DEFAULT_PRIZES = [
  '1º Lugar: Carretilha + Troféu Oficial Barrantuba',
  '2º Lugar: Vara Carbono 17lb + Medalha',
  '3º Lugar: Kit de Iscas Artificiais + Medalha',
];

function toLocalDateTimeInput(isoOrString: string | undefined, fallback: string): string {
  if (!isoOrString) return fallback;
  const parsed = new Date(isoOrString);
  if (Number.isNaN(parsed.getTime())) return fallback;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${parsed.getFullYear()}-${pad(parsed.getMonth() + 1)}-${pad(parsed.getDate())}T${pad(
    parsed.getHours()
  )}:${pad(parsed.getMinutes())}`;
}

function toIsoSafe(localValue: string, fallbackIso: string): string {
  const parsed = new Date(localValue);
  if (Number.isNaN(parsed.getTime())) return fallbackIso;
  return parsed.toISOString();
}

function formatScheduleRange(startIso: string, endIso: string): string {
  const start = new Date(startIso);
  const end = new Date(endIso);
  if (Number.isNaN(start.getTime())) return '';
  const dateStr = start.toLocaleDateString('pt-BR');
  const startTime = start.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  if (Number.isNaN(end.getTime())) return `${dateStr} · ${startTime}`;
  const endDateStr = end.toLocaleDateString('pt-BR');
  const endTime = end.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  if (dateStr === endDateStr) {
    return `${dateStr} · ${startTime}–${endTime}`;
  }
  return `${dateStr} ${startTime} – ${endDateStr} ${endTime}`;
}

function getStatusInfo(status: Tournament['status']): { label: string; colorClass: string } {
  if (status === 'active') {
    return { label: 'Em Andamento', colorClass: 'text-emerald-400' };
  }
  if (status === 'completed') {
    return { label: 'Encerrado', colorClass: 'text-slate-400' };
  }
  return { label: 'Inscrições Abertas', colorClass: 'text-amber-400' };
}

function compressTournamentBanner(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const objectUrl =
      typeof URL !== 'undefined' && URL.createObjectURL ? URL.createObjectURL(file) : null;

    const processImage = (img: HTMLImageElement, cleanup?: () => void) => {
      try {
        const canvas = document.createElement('canvas');
        const maxDim = 1080;
        let width = img.naturalWidth || img.width || maxDim;
        let height = img.naturalHeight || img.height || maxDim;

        if (width > height) {
          if (width > maxDim) {
            height = Math.max(1, Math.round((height * maxDim) / width));
            width = maxDim;
          }
        } else if (height > maxDim) {
          width = Math.max(1, Math.round((width * maxDim) / height));
          height = maxDim;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          cleanup?.();
          reject(new Error('Falha ao preparar o editor de imagem.'));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        let compressed = canvas.toDataURL('image/jpeg', 0.84);
        if (compressed.length > 380_000) {
          compressed = canvas.toDataURL('image/jpeg', 0.68);
        }
        cleanup?.();
        resolve(compressed);
      } catch (err) {
        cleanup?.();
        reject(err instanceof Error ? err : new Error('Falha ao processar a imagem.'));
      }
    };

    const loadViaFileReader = () => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        if (!result) {
          reject(new Error('Arquivo de imagem vazio.'));
          return;
        }
        const img = new Image();
        img.onload = () => processImage(img);
        img.onerror = () =>
          reject(new Error('Formato de imagem não suportado. Tente selecionar uma foto JPG ou PNG.'));
        img.src = result;
      };
      reader.onerror = () => reject(new Error('Não foi possível ler a imagem selecionada.'));
      reader.readAsDataURL(file);
    };

    if (objectUrl) {
      const img = new Image();
      img.onload = () => processImage(img, () => URL.revokeObjectURL(objectUrl));
      img.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        loadViaFileReader();
      };
      img.src = objectUrl;
    } else {
      loadViaFileReader();
    }
  });
}

export function TournamentsView({
  tournaments,
  currentUser,
  onRegisterTournament,
  onCreateTournament,
  onDeleteTournament,
}: TournamentsViewProps) {
  const bannerInputRef = useRef<HTMLInputElement>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingTournament, setEditingTournament] = useState<Tournament | null>(null);

  const [title, setTitle] = useState('');
  const [status, setStatus] = useState<Tournament['status']>('upcoming');
  const [modality, setModality] = useState('Pesca Esportiva · Embarcado / Caiaque / Barranco');
  const [description, setDescription] = useState('');
  const [scoringSystem, setScoringSystem] = useState(
    'Soma dos 3 maiores exemplares (medição mínima de 30cm)'
  );
  const [spotName, setSpotName] = useState('Represa Central & Bico da Ilha');
  const [startDate, setStartDate] = useState('2026-11-28T06:00');
  const [endDate, setEndDate] = useState('2026-11-28T17:00');
  const [entryFee, setEntryFee] = useState('R$ 50,00 por pescador');
  const [maxParticipants, setMaxParticipants] = useState<number>(30);
  const [organizerContact, setOrganizerContact] = useState('');
  const [targetSpeciesInput, setTargetSpeciesInput] = useState('Tucunaré Azul, Robalo Flecha');
  const [prizesInput, setPrizesInput] = useState(DEFAULT_PRIZES.join('\n'));
  const [rulesInput, setRulesInput] = useState(DEFAULT_RULES.join('\n'));
  const [bannerUrl, setBannerUrl] = useState<string>('');

  const [isProcessingBanner, setIsProcessingBanner] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [previewBanner, setPreviewBanner] = useState<{ url: string; title: string } | null>(null);

  const isAdmin = currentUser?.role === 'admin';

  const openCreateModal = () => {
    setEditingTournament(null);
    setTitle('');
    setStatus('upcoming');
    setModality('Pesca Esportiva · Embarcado / Caiaque / Barranco');
    setDescription('');
    setScoringSystem('Soma dos 3 maiores exemplares (medição mínima de 30cm)');
    setSpotName('Represa Central & Bico da Ilha');
    setStartDate('2026-11-28T06:00');
    setEndDate('2026-11-28T17:00');
    setEntryFee('R$ 50,00 por pescador');
    setMaxParticipants(30);
    setOrganizerContact('');
    setTargetSpeciesInput('Tucunaré Azul, Robalo Flecha');
    setPrizesInput(DEFAULT_PRIZES.join('\n'));
    setRulesInput(DEFAULT_RULES.join('\n'));
    setBannerUrl('');
    setSaveError(null);
    setShowModal(true);
  };

  const openEditModal = (tourn: Tournament) => {
    setEditingTournament(tourn);
    setTitle(tourn.title || '');
    setStatus(tourn.status || 'upcoming');
    setModality(tourn.modality || '');
    setDescription(tourn.description || '');
    setScoringSystem(tourn.scoringSystem || '');
    setSpotName(tourn.spotName || 'Barrantuba');
    setStartDate(toLocalDateTimeInput(tourn.startDate, '2026-11-28T06:00'));
    setEndDate(toLocalDateTimeInput(tourn.endDate, '2026-11-28T17:00'));
    setEntryFee(tourn.entryFee || 'Gratuita');
    setMaxParticipants(Number(tourn.maxParticipants) || 30);
    setOrganizerContact(tourn.organizerContact || '');
    setTargetSpeciesInput((tourn.targetSpecies || []).join(', '));
    setPrizesInput((tourn.prizes || []).join('\n'));
    setRulesInput((tourn.rules || []).join('\n'));
    setBannerUrl(tourn.bannerUrl || '');
    setSaveError(null);
    setShowModal(true);
  };

  const handleBannerChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setSaveError(null);
    setIsProcessingBanner(true);
    try {
      const compressed = await compressTournamentBanner(file);
      setBannerUrl(compressed);
    } catch (err: any) {
      setSaveError(err?.message || 'Não foi possível carregar esta foto da galeria.');
    } finally {
      setIsProcessingBanner(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !onCreateTournament || isSaving || isProcessingBanner) return;

    if (!title.trim()) {
      setSaveError('Informe o título do torneio.');
      return;
    }

    const parsedMax = Math.max(2, Math.min(500, Number(maxParticipants) || 30));
    const parsedSpecies = targetSpeciesInput
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    const parsedPrizes = prizesInput
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);
    const parsedRules = rulesInput
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);

    setIsSaving(true);
    setSaveError(null);

    const isEditing = Boolean(editingTournament);
    const nowIso = new Date().toISOString();

    const payload: Tournament = {
      id: editingTournament ? editingTournament.id : `tourn_${Date.now()}`,
      title: title.trim(),
      description: description.trim(),
      startDate: toIsoSafe(startDate, editingTournament?.startDate || nowIso),
      endDate: toIsoSafe(endDate, editingTournament?.endDate || nowIso),
      spotName: spotName.trim() || 'Barrantuba',
      targetSpecies: parsedSpecies,
      prizes: parsedPrizes,
      entryFee: entryFee.trim() || 'Gratuita',
      rules: parsedRules,
      registeredUserIds: editingTournament
        ? editingTournament.registeredUserIds
        : [currentUser.id],
      maxParticipants: parsedMax,
      bannerUrl: bannerUrl || undefined,
      status,
      modality: modality.trim(),
      scoringSystem: scoringSystem.trim(),
      organizerContact: organizerContact.trim(),
      createdByUserId: editingTournament?.createdByUserId || currentUser.id,
      createdAt: editingTournament?.createdAt || nowIso,
    };

    try {
      const res = await onCreateTournament(payload);
      if (res && res.ok === false) {
        setSaveError(
          res.error ||
            (isEditing
              ? 'Erro ao atualizar torneio no banco de dados.'
              : 'Erro ao publicar torneio no banco de dados.')
        );
        return;
      }
      setEditingTournament(null);
      setShowModal(false);
    } catch (err: any) {
      setSaveError(
        err?.message ||
          (isEditing
            ? 'Erro ao atualizar torneio no banco de dados.'
            : 'Erro ao publicar torneio no banco de dados.')
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-amber-950/40 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="text-xs uppercase tracking-wider text-amber-400 font-bold mb-1 flex items-center gap-1.5">
            <Trophy className="w-3.5 h-3.5 text-amber-400" />
            <span>Circuito & Torneios Barrantuba</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Torneios Locais & Competições
          </h1>
          <p className="text-sm text-slate-300 mt-1 max-w-xl">
            Inscreva-se nos torneios locais de pesca esportiva do Barrantuba, dispute troféus e
            premiações com seus parceiros!
          </p>
        </div>

        {isAdmin && (
          <button
            type="button"
            onClick={openCreateModal}
            className="flex items-center gap-2 min-h-[44px] px-5 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-xl transition-transform active:scale-95 shrink-0 cursor-pointer whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            <span>Publicar Novo Torneio</span>
          </button>
        )}
      </div>

      {/* Tournaments Grid / Empty State */}
      {tournaments.length === 0 ? (
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-12 text-center text-slate-400">
          <Trophy className="w-12 h-12 text-slate-700 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-200 mb-1">
            Nenhum torneio agendado no momento
          </h3>
          <p className="text-xs max-w-md mx-auto mb-4 text-slate-400">
            O circuito do Barrantuba está pronto. O administrador pode publicar novos torneios
            locais com foto, modalidades, regras e premiações a qualquer instante!
          </p>
          {isAdmin && (
            <button
              type="button"
              onClick={openCreateModal}
              className="min-h-[44px] px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-xl shadow-lg cursor-pointer"
            >
              Publicar Primeiro Torneio
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {tournaments.map((tourn) => {
            const isRegistered = currentUser && tourn.registeredUserIds.includes(currentUser.id);
            const isConfirmingDelete = confirmDeleteId === tourn.id;
            const statusInfo = getStatusInfo(tourn.status);
            const isFull =
              tourn.registeredUserIds.length >= (Number(tourn.maxParticipants) || 30) &&
              !isRegistered;
            const isCompleted = tourn.status === 'completed' && !isRegistered;

            return (
              <div
                key={tourn.id}
                className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden shadow-xl flex flex-col justify-between hover:border-slate-700 transition-colors"
              >
                <div>
                  {/* Tournament Cover Photo (when uploaded from gallery) */}
                  {tourn.bannerUrl && (
                    <div
                      onClick={() =>
                        setPreviewBanner({ url: tourn.bannerUrl!, title: tourn.title })
                      }
                      className="relative w-full h-48 sm:h-52 bg-slate-950 overflow-hidden cursor-pointer group border-b border-slate-800"
                    >
                      <img
                        src={tourn.bannerUrl}
                        alt={`Foto do torneio ${tourn.title}`}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-300"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/20 to-transparent" />
                      <span className="absolute bottom-3 right-3 inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-950/80 text-slate-200 text-[11px] font-semibold backdrop-blur-sm border border-slate-700/70">
                        <Maximize2 className="w-3.5 h-3.5 text-amber-400" />
                        <span>Ampliar foto</span>
                      </span>
                    </div>
                  )}

                  <div className="p-6">
                    {/* Status & Schedule */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pb-3 mb-3 border-b border-slate-800 text-xs">
                      <div
                        className={`flex items-center gap-1.5 font-bold uppercase tracking-wider ${statusInfo.colorClass}`}
                      >
                        <Trophy className="w-3.5 h-3.5 shrink-0" />
                        <span>{statusInfo.label}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-slate-400 tabular-nums">
                        <Calendar className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                        <span>{formatScheduleRange(tourn.startDate, tourn.endDate)}</span>
                      </div>
                    </div>

                    <h3 className="text-xl font-extrabold text-white tracking-tight mb-1.5">
                      {tourn.title}
                    </h3>

                    {tourn.modality && (
                      <div className="text-xs font-semibold text-cyan-300 mb-2">
                        {tourn.modality}
                      </div>
                    )}

                    {tourn.description && (
                      <p className="text-xs text-slate-300 leading-relaxed mb-4">
                        {tourn.description}
                      </p>
                    )}

                    {/* Spot, Entry fee & Scoring */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4 text-xs">
                      <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3">
                        <div className="text-slate-400 font-semibold mb-1 flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          <span>Local da Largada:</span>
                        </div>
                        <div className="text-slate-200 font-bold">{tourn.spotName}</div>
                      </div>

                      <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3">
                        <div className="text-slate-400 font-semibold mb-1 flex items-center gap-1.5">
                          <Award className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                          <span>Taxa de Inscrição:</span>
                        </div>
                        <div className="text-emerald-400 font-bold">{tourn.entryFee}</div>
                      </div>
                    </div>

                    {(tourn.scoringSystem || tourn.organizerContact) && (
                      <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3 mb-4 space-y-1.5 text-xs">
                        {tourn.scoringSystem && (
                          <div className="flex items-start gap-2 text-slate-200">
                            <Ruler className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                            <div>
                              <span className="text-slate-400 font-semibold">Pontuação: </span>
                              <span>{tourn.scoringSystem}</span>
                            </div>
                          </div>
                        )}
                        {tourn.organizerContact && (
                          <div className="flex items-start gap-2 text-slate-200">
                            <Phone className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                            <div>
                              <span className="text-slate-400 font-semibold">Organização: </span>
                              <span className="tabular-nums">{tourn.organizerContact}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Species */}
                    {tourn.targetSpecies && tourn.targetSpecies.length > 0 && (
                      <div className="mb-4">
                        <div className="text-xs font-semibold text-slate-400 mb-1">
                          Espécies Alvo Válidas
                        </div>
                        <p className="text-xs font-semibold text-emerald-300">
                          {tourn.targetSpecies.join(' · ')}
                        </p>
                      </div>
                    )}

                    {/* Prizes */}
                    {tourn.prizes && tourn.prizes.length > 0 && (
                      <div className="bg-amber-950/20 border border-amber-500/20 rounded-xl p-3.5 mb-4 text-xs">
                        <div className="font-bold text-amber-300 mb-2 flex items-center gap-1.5">
                          <Trophy className="w-4 h-4 text-amber-400" />
                          <span>Premiações Confirmadas:</span>
                        </div>
                        <ul className="space-y-1 text-slate-300">
                          {tourn.prizes.map((prz, idx) => (
                            <li key={idx} className="flex items-start gap-2">
                              <span className="text-amber-400 font-bold">★</span>
                              <span>{prz}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Full Tournament Rules */}
                    {tourn.rules && tourn.rules.length > 0 && (
                      <div className="text-xs text-slate-300 bg-slate-950/50 border border-slate-800/80 rounded-xl p-3.5">
                        <div className="font-bold text-slate-200 mb-2 flex items-center gap-1.5">
                          <FileText className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          <span>Regulamento do Torneio:</span>
                        </div>
                        <div className="space-y-1.5 text-[11px] leading-relaxed">
                          {tourn.rules.map((r, i) => (
                            <div key={i} className="flex items-start gap-2">
                              <span className="text-emerald-400 font-bold shrink-0">✓</span>
                              <span>{r}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Inscription & Admin Actions */}
                <div className="px-6 py-4 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-xs text-slate-400 tabular-nums">
                    <Users className="w-4 h-4 text-slate-500" />
                    <span>
                      <strong className="text-slate-200">{tourn.registeredUserIds.length}</strong>{' '}
                      / {tourn.maxParticipants} inscritos
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {isAdmin && (
                      <button
                        type="button"
                        onClick={() => openEditModal(tourn)}
                        className="min-h-[40px] flex items-center gap-1.5 text-xs font-semibold text-amber-300 hover:text-amber-200 px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/30 hover:bg-amber-500/20 cursor-pointer whitespace-nowrap"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                        <span>Editar</span>
                      </button>
                    )}

                    {isAdmin && onDeleteTournament && (
                      isConfirmingDelete ? (
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              onDeleteTournament(tourn.id);
                              setConfirmDeleteId(null);
                            }}
                            className="min-h-[40px] text-xs font-bold text-white px-3 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 cursor-pointer whitespace-nowrap"
                          >
                            Confirmar
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(null)}
                            className="min-h-[40px] text-xs text-slate-300 hover:text-white px-2.5 py-2 rounded-xl bg-slate-800 cursor-pointer whitespace-nowrap"
                          >
                            Cancelar
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(tourn.id)}
                          className="min-h-[40px] text-xs text-rose-400 hover:text-rose-300 px-3 py-2 rounded-xl bg-rose-950/30 border border-rose-800/40 cursor-pointer whitespace-nowrap"
                        >
                          Excluir
                        </button>
                      )
                    )}

                    <button
                      type="button"
                      disabled={isFull || isCompleted}
                      onClick={() => onRegisterTournament(tourn.id)}
                      className={`min-h-[44px] flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all shadow-md whitespace-nowrap ${
                        isRegistered
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/50 cursor-pointer'
                          : isFull || isCompleted
                            ? 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
                            : 'bg-amber-500 hover:bg-amber-400 text-slate-950 active:scale-95 cursor-pointer'
                      }`}
                    >
                      {isRegistered ? (
                        <>
                          <Check className="w-4 h-4 text-emerald-400" />
                          <span>Inscrição Confirmada</span>
                        </>
                      ) : isCompleted ? (
                        <>
                          <Clock className="w-4 h-4" />
                          <span>Torneio Encerrado</span>
                        </>
                      ) : isFull ? (
                        <>
                          <Users className="w-4 h-4" />
                          <span>Vagas Esgotadas</span>
                        </>
                      ) : (
                        <>
                          <Trophy className="w-4 h-4" />
                          <span>Garantir Minha Vaga</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Fullscreen Photo Preview Modal */}
      {previewBanner && (
        <div
          onClick={() => setPreviewBanner(null)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-2xl w-full bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl"
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
              <span className="text-sm font-bold text-white truncate">{previewBanner.title}</span>
              <button
                type="button"
                onClick={() => setPreviewBanner(null)}
                className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
                aria-label="Fechar foto"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <img
              src={previewBanner.url}
              alt={previewBanner.title}
              referrerPolicy="no-referrer"
              className="w-full max-h-[75vh] object-contain bg-slate-950"
            />
          </div>
        </div>
      )}

      {/* Admin Modal to Create or Edit Tournament */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
          <div className="relative w-full max-w-[500px] bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col">
            <div className="flex items-center justify-between px-4 sm:px-5 py-4 border-b border-slate-800 shrink-0 bg-slate-950/60">
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                <Trophy className="w-5 h-5 text-amber-400 shrink-0" />
                <span>
                  {editingTournament
                    ? 'Editar Informações do Torneio'
                    : 'Publicar Novo Torneio de Pesca'}
                </span>
              </h2>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
                aria-label="Fechar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={handleSubmit}
              className="p-4 sm:p-5 space-y-4 text-xs overflow-y-auto flex-1"
            >
              {/* Mobile Gallery Photo Picker */}
              <div className="space-y-2">
                <label className="block font-semibold text-slate-300">
                  Foto / Cartaz do Torneio (Galeria do Celular)
                </label>

                <input
                  ref={bannerInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleBannerChange}
                  className="hidden"
                />

                {bannerUrl ? (
                  <div className="space-y-2">
                    <div className="relative w-full h-40 rounded-xl overflow-hidden border border-amber-500/40 bg-slate-950">
                      <img
                        src={bannerUrl}
                        alt="Prévia da foto do torneio"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={isProcessingBanner || isSaving}
                        onClick={() => bannerInputRef.current?.click()}
                        className="flex-1 min-h-[44px] px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 font-bold flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60"
                      >
                        <Camera className="w-4 h-4 text-amber-400" />
                        <span>{isProcessingBanner ? 'Processando...' : 'Trocar Foto'}</span>
                      </button>
                      <button
                        type="button"
                        disabled={isProcessingBanner || isSaving}
                        onClick={() => setBannerUrl('')}
                        className="min-h-[44px] px-3.5 py-2 rounded-xl bg-rose-950/50 hover:bg-rose-900/60 border border-rose-800/50 text-rose-300 font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                        <span>Remover</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    disabled={isProcessingBanner || isSaving}
                    onClick={() => bannerInputRef.current?.click()}
                    className="w-full min-h-[112px] rounded-2xl border-2 border-dashed border-slate-700 hover:border-amber-500 bg-slate-950/70 hover:bg-slate-950 transition-colors flex flex-col items-center justify-center gap-1.5 p-4 text-center cursor-pointer disabled:opacity-60"
                  >
                    {isProcessingBanner ? (
                      <>
                        <Loader2 className="w-6 h-6 text-amber-400 animate-spin" />
                        <span className="font-bold text-slate-200">
                          Processando foto selecionada...
                        </span>
                      </>
                    ) : (
                      <>
                        <div className="w-10 h-10 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center">
                          <Camera className="w-5 h-5" />
                        </div>
                        <span className="font-bold text-slate-100">
                          Escolher Foto da Galeria do Celular
                        </span>
                        <span className="text-[11px] text-slate-400">
                          Toque para adicionar o cartaz ou foto do torneio
                        </span>
                      </>
                    )}
                  </button>
                )}
              </div>

              {/* Título & Situação */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block font-semibold text-slate-300 mb-1">
                    Título do Torneio *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: 2º Desafio Rei do Tucunaré Barrantuba"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-sm text-slate-100 focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">
                    Situação
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as Tournament['status'])}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-100 focus:outline-none focus:border-amber-500 min-h-[42px]"
                  >
                    <option value="upcoming">Inscrições Abertas</option>
                    <option value="active">Em Andamento</option>
                    <option value="completed">Encerrado</option>
                  </select>
                </div>
              </div>

              {/* Modalidade / Categoria */}
              <div>
                <label className="block font-semibold text-slate-300 mb-1">
                  Modalidade / Categoria
                </label>
                <input
                  type="text"
                  placeholder="Ex: Pesca Esportiva · Embarcado, Caiaque ou Barranco"
                  value={modality}
                  onChange={(e) => setModality(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-100 focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Descrição Geral */}
              <div>
                <label className="block font-semibold text-slate-300 mb-1">
                  Descrição Geral & Programação *
                </label>
                <textarea
                  rows={2}
                  required
                  placeholder="Programação do café da manhã, largada, confraternização e informações gerais..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-100 focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Critério de Pontuação */}
              <div>
                <label className="block font-semibold text-slate-300 mb-1">
                  Critério de Pontuação & Medição
                </label>
                <input
                  type="text"
                  placeholder="Ex: Soma dos 3 maiores exemplares · Medição mínima 30cm"
                  value={scoringSystem}
                  onChange={(e) => setScoringSystem(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-100 focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Horários */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">
                    Data & Hora de Início
                  </label>
                  <input
                    type="datetime-local"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-100 focus:outline-none focus:border-amber-500 tabular-nums"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">
                    Data & Hora de Término
                  </label>
                  <input
                    type="datetime-local"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-100 focus:outline-none focus:border-amber-500 tabular-nums"
                  />
                </div>
              </div>

              {/* Local, Taxa, Vagas, Contato */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">
                    Local / Ponto de Largada
                  </label>
                  <input
                    type="text"
                    value={spotName}
                    onChange={(e) => setSpotName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-100 focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">
                    Valor da Inscrição
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: R$ 80,00 ou Gratuita"
                    value={entryFee}
                    onChange={(e) => setEntryFee(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-100 focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">
                    Limite de Vagas
                  </label>
                  <input
                    type="number"
                    min={2}
                    max={500}
                    value={maxParticipants}
                    onChange={(e) => setMaxParticipants(Number(e.target.value) || 30)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-100 focus:outline-none focus:border-amber-500 tabular-nums"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">
                    Contato da Organização (WhatsApp)
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: (62) 99999-9999 · Diretoria"
                    value={organizerContact}
                    onChange={(e) => setOrganizerContact(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-100 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Espécies */}
              <div>
                <label className="block font-semibold text-slate-300 mb-1">
                  Espécies Alvo Válidas (separar por vírgula)
                </label>
                <input
                  type="text"
                  placeholder="Ex: Tucunaré Azul, Tucunaré Amarelo, Traíra"
                  value={targetSpeciesInput}
                  onChange={(e) => setTargetSpeciesInput(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-100 focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Premiações (1 por linha para não quebrar valores como R$ 1.500,00) */}
              <div>
                <label className="block font-semibold text-slate-300 mb-1">
                  Premiações Confirmadas (1 prêmio por linha)
                </label>
                <textarea
                  rows={3}
                  placeholder={'1º Lugar: Troféu + R$ 1.500,00\n2º Lugar: Carretilha + Medalha'}
                  value={prizesInput}
                  onChange={(e) => setPrizesInput(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-100 focus:outline-none focus:border-amber-500 leading-relaxed"
                />
              </div>

              {/* Regulamento Completo Editável */}
              <div>
                <label className="block font-semibold text-slate-300 mb-1">
                  Regulamento do Torneio (1 regra por linha)
                </label>
                <textarea
                  rows={5}
                  placeholder={'Digite cada regra do torneio em uma linha...\nEx: Permitido apenas isca artificial\nProibido pesca com rede ou tarrafa'}
                  value={rulesInput}
                  onChange={(e) => setRulesInput(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-100 focus:outline-none focus:border-amber-500 leading-relaxed"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Você pode adicionar, alterar ou remover quantas regras quiser. Cada linha vira um
                  item do regulamento oficial.
                </p>
              </div>

              {saveError && (
                <div className="p-3 rounded-xl bg-rose-950/80 border border-rose-500/60 text-rose-200 text-xs flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <span>{saveError}</span>
                </div>
              )}

              <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="min-h-[44px] px-4 py-2 text-slate-400 hover:text-white cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSaving || isProcessingBanner}
                  className="min-h-[44px] px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-60 text-slate-950 font-bold flex items-center gap-2 cursor-pointer whitespace-nowrap"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Salvando...</span>
                    </>
                  ) : (
                    <span>
                      {editingTournament
                        ? 'Salvar Alterações do Torneio'
                        : 'Publicar e Notificar Membros'}
                    </span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
