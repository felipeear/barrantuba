import { useState, useEffect } from 'react';
import { ActiveFishingSession, FishingSpot, User } from '../types';
import { WeatherWidget } from './WeatherWidget';
import { Radio, Users, MapPin, Clock, MessageSquare, Plus, Check, Phone, Navigation } from 'lucide-react';

interface ActiveFishersViewProps {
  sessions: ActiveFishingSession[];
  spots: FishingSpot[];
  currentUser: User | null;
  onStartSession: (session: ActiveFishingSession) => void;
  onEndSession: (sessionId: string) => void;
  onOpenMapToSpot: (spotId: string) => void;
  onOpenChatWithFisher: (session: ActiveFishingSession) => void;
}

export function ActiveFishersView({
  sessions,
  spots,
  currentUser,
  onStartSession,
  onEndSession,
  onOpenMapToSpot,
  onOpenChatWithFisher
}: ActiveFishersViewProps) {
  const [showStartModal, setShowStartModal] = useState(false);
  const [selectedSpotId, setSelectedSpotId] = useState(spots[0]?.id || '');
  const [sessionNotes, setSessionNotes] = useState('Estou aqui pescando! Quem quiser encostar, traz iscas de superfície.');
  const [targetSpeciesInput, setTargetSpeciesInput] = useState('Tucunaré Azul, Robalo');
  const [contactPhone, setContactPhone] = useState(currentUser?.phone || '');

  // Current user's active session
  const myActiveSession = currentUser ? sessions.find(s => s.userId === currentUser.id) : null;

  // Real-time ticking timer for duration
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30000); // update every 30s
    return () => clearInterval(timer);
  }, []);

  const formatElapsed = (startedAt: string) => {
    const start = new Date(startedAt).getTime();
    const diffMinutes = Math.max(1, Math.floor((now - start) / (1000 * 60)));
    const hours = Math.floor(diffMinutes / 60);
    const mins = diffMinutes % 60;
    if (hours > 0) return `${hours}h ${mins}m`;
    return `${mins}m`;
  };

  const handleStartSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    const targetSpot = spots.find(s => s.id === selectedSpotId);
    if (!targetSpot) return;

    const newSession: ActiveFishingSession = {
      id: `session_${currentUser.id}_${Date.now()}`,
      userId: currentUser.id,
      userName: currentUser.name,
      userAvatar: currentUser.avatar,
      spotId: targetSpot.id,
      spotName: targetSpot.name,
      latitude: targetSpot.latitude,
      longitude: targetSpot.longitude,
      startedAt: new Date().toISOString(),
      notes: sessionNotes.trim(),
      targetSpecies: targetSpeciesInput.split(',').map(s => s.trim()).filter(Boolean),
      contactPhone: contactPhone.trim()
    };

    onStartSession(newSession);
    setShowStartModal(false);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-emerald-950/40 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs uppercase tracking-wider mb-1">
            <Radio className="w-4 h-4 animate-pulse" />
            <span>Radar de Presença em Tempo Real</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Parceiros na Água Agora
          </h1>
          <p className="text-sm text-slate-300 mt-1 max-w-xl">
            Veja quais membros do Barrantuba estão pescando neste exato momento, confira o ponto, o clima e junte-se à pescaria!
          </p>
        </div>

        {myActiveSession ? (
          <div className="bg-emerald-500/10 border border-emerald-500/40 rounded-xl p-3.5 flex items-center gap-3">
            <div>
              <div className="text-xs font-bold text-emerald-400">Você está na água!</div>
              <div className="text-xs text-slate-200">{myActiveSession.spotName} · há {formatElapsed(myActiveSession.startedAt)}</div>
            </div>
            <button
              onClick={() => onEndSession(myActiveSession.id)}
              className="px-3 py-1.5 bg-rose-500 hover:bg-rose-400 text-slate-950 font-bold rounded-lg text-xs transition-colors shrink-0"
            >
              Finalizar Pescaria
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowStartModal(true)}
            className="flex items-center gap-2 px-5 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm shadow-xl transition-transform active:scale-95 shrink-0"
          >
            <Radio className="w-4 h-4 animate-pulse" />
            <span>Estou Pescando Agora!</span>
          </button>
        )}
      </div>

      {/* Sessions Grid */}
      {sessions.length === 0 ? (
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-12 text-center text-slate-400">
          <Radio className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-slate-200 mb-1">Nenhum parceiro na água neste instante</h3>
          <p className="text-xs max-w-md mx-auto mb-4">
            Seja o primeiro a avisar os companheiros do Barrantuba! Quando você avisa que está no ponto, seus amigos podem se juntar e trocar dicas.
          </p>
          <button
            onClick={() => setShowStartModal(true)}
            className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold rounded-xl"
          >
            Avisar que Estou no Ponto
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {sessions.map(session => {
            const isMe = currentUser?.id === session.userId;
            const spot = spots.find(s => s.id === session.spotId);

            return (
              <div
                key={session.id}
                className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl relative overflow-hidden flex flex-col justify-between"
              >
                {/* Live Top Ribbon */}
                <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800/80">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                    <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                      Pescando Ao Vivo
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-slate-400 font-mono-numbers">
                    <Clock className="w-3.5 h-3.5 text-slate-500" />
                    <span>Na água há {formatElapsed(session.startedAt)}</span>
                  </div>
                </div>

                {/* Member & Spot Details */}
                <div className="flex items-start gap-4 mb-4">
                  <img
                    src={session.userAvatar}
                    alt={session.userName}
                    className="w-14 h-14 rounded-2xl object-cover border-2 border-emerald-500 shadow-lg shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-bold text-white truncate">{session.userName}</h3>
                      {isMe && (
                        <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded font-semibold">
                          Você
                        </span>
                      )}
                    </div>

                    <button
                      onClick={() => onOpenMapToSpot(session.spotId)}
                      className="text-xs text-cyan-400 hover:underline flex items-center gap-1 font-medium mt-0.5 text-left truncate"
                    >
                      <MapPin className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{session.spotName}</span>
                    </button>

                    {/* Target species tags */}
                    {session.targetSpecies.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {session.targetSpecies.map((sp, idx) => (
                          <span
                            key={idx}
                            className="text-[10px] bg-slate-950 text-slate-300 border border-slate-800 px-2 py-0.5 rounded-md"
                          >
                            {sp}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Fisher's Note */}
                <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3 text-xs text-slate-300 italic mb-4">
                  "{session.notes}"
                </div>

                {/* Live Weather Compact */}
                <div className="mb-4">
                  <WeatherWidget lat={session.latitude} lon={session.longitude} compact />
                </div>

                {/* Action Buttons */}
                <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-3">
                  <button
                    onClick={() => onOpenMapToSpot(session.spotId)}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 transition-colors"
                  >
                    <Navigation className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Ver no Mapa</span>
                  </button>

                  {isMe ? (
                    <button
                      onClick={() => onEndSession(session.id)}
                      className="px-3.5 py-2 rounded-xl text-xs font-bold text-rose-300 bg-rose-950/40 hover:bg-rose-950/70 border border-rose-800/40 transition-colors"
                    >
                      Encerrar Sessão
                    </button>
                  ) : (
                    <button
                      onClick={() => onOpenChatWithFisher(session)}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold shadow-lg transition-transform active:scale-95"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>Juntar-se à Pescaria</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal to Start Session */}
      {showStartModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
          <div className="relative w-full max-w-[410px] bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-4 sm:p-5 overflow-hidden">
            <h2 className="text-lg font-bold text-white flex items-center gap-2 mb-1">
              <Radio className="w-5 h-5 text-emerald-400 animate-pulse" />
              <span>Registrar Presença no Ponto (Pescando Agora)</span>
            </h2>
            <p className="text-xs text-slate-400 mb-5">
              Seu ponto e status aparecerão no radar e no mapa em tempo real para os membros do Barrantuba.
            </p>

            <form onSubmit={handleStartSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Selecione o Ponto Onde Você Está *
                </label>
                <select
                  value={selectedSpotId}
                  onChange={(e) => setSelectedSpotId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-emerald-500"
                >
                  {spots.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.waterType.toUpperCase()} · {s.accessType})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Espécies Que Está Buscando Hoje
                </label>
                <input
                  type="text"
                  placeholder="Ex: Tucunaré Azul, Robalo Flecha..."
                  value={targetSpeciesInput}
                  onChange={(e) => setTargetSpeciesInput(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Recado para os Parceiros (Tem vaga? Como tá a água?)
                </label>
                <textarea
                  rows={2}
                  value={sessionNotes}
                  onChange={(e) => setSessionNotes(e.target.value)}
                  placeholder="Ex: Estou de barco no meio da curva, água transparente! Quem quiser vir tem vaga."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Telefone / WhatsApp de Contato
                </label>
                <input
                  type="text"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  placeholder="(11) 99999-9999"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-100 font-mono-numbers focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowStartModal(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-slate-200"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-lg transition-transform active:scale-95 flex items-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  <span>Publicar no Radar do Barrantuba</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
