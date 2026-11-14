import { useState } from 'react';
import { FishCatch, User } from '../types';
import { Fish, Search, Heart, Wind, Thermometer, Anchor, Trash2, Sparkles, MessageCircle } from 'lucide-react';

interface CatchLogViewProps {
  catches: FishCatch[];
  currentUser: User | null;
  onOpenNewCatch?: () => void;
  onDeleteCatch?: (catchId: string) => void;
  onToggleLike?: (catchId: string) => void;
  onOpenSpot?: (spotId: string) => void;
  onSelectCatch?: (fish: FishCatch) => void;
  onViewUserProfile?: (userId: string) => void;
}

export function CatchLogView({
  catches,
  currentUser,
  onOpenNewCatch: _onOpenNewCatch,
  onDeleteCatch,
  onToggleLike,
  onOpenSpot,
  onSelectCatch,
  onViewUserProfile
}: CatchLogViewProps) {
  const [search, setSearch] = useState('');
  const [filterSpecies, setFilterSpecies] = useState('all');
  const [onlyMine, setOnlyMine] = useState(false);

  const filteredCatches = catches.filter(c => {
    if (onlyMine && currentUser && c.userId !== currentUser.id) return false;
    if (filterSpecies !== 'all' && c.species !== filterSpecies) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const match = c.species.toLowerCase().includes(q) ||
        c.userName.toLowerCase().includes(q) ||
        c.spotName.toLowerCase().includes(q) ||
        c.baitUsed.toLowerCase().includes(q);
      if (!match) return false;
    }
    return true;
  });

  // Extract unique species for filter
  const speciesList = Array.from(new Set(catches.map(c => c.species)));

  return (
    <div className="space-y-6">
      {/* Header Banner - Exclusively showcasing members catches */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-cyan-950/40 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="text-xs uppercase tracking-wider text-emerald-400 font-bold mb-1 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            <span>Mural Oficial de Capturas dos Membros</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Galeria de Troféus dos Membros
          </h1>
          <p className="text-sm text-slate-300 mt-1 max-w-2xl">
            Mural exclusivo para visualização dos peixes fisgados pelos membros do Barrantuba, com peso, comprimento, ponto e isca utilizada.
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/80 border border-slate-800 p-3 rounded-2xl">
        <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-500 shrink-0" />
          <input
            type="text"
            placeholder="Buscar por peixe, pescador, isca..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-transparent text-xs text-slate-100 placeholder-slate-500 focus:outline-none w-full"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={filterSpecies}
            onChange={(e) => setFilterSpecies(e.target.value)}
            className="bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-emerald-500"
          >
            <option value="all">Todas as Espécies ({catches.length})</option>
            {speciesList.map(sp => (
              <option key={sp} value={sp}>{sp}</option>
            ))}
          </select>

          {currentUser && (
            <button
              onClick={() => setOnlyMine(!onlyMine)}
              className={`px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${
                onlyMine
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/50'
                  : 'bg-slate-950 border border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              Minhas Capturas
            </button>
          )}
        </div>
      </div>

      {/* Catches Grid */}
      {filteredCatches.length === 0 ? (
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-12 text-center text-slate-400 text-sm">
          <Fish className="w-12 h-12 text-slate-700 mx-auto mb-3" />
          <div className="font-bold text-slate-200 text-base mb-1">
            {catches.length === 0 ? 'Nenhum peixe cadastrado no diário ainda' : 'Nenhuma captura encontrada para os filtros selecionados'}
          </div>
          <p className="text-xs text-slate-400 max-w-md mx-auto mb-4">
            {catches.length === 0
              ? 'O diário de capturas do Barrantuba está limpo e pronto para receber os troféus fisgados pelos membros.'
              : 'Tente alterar o termo de busca ou selecionar outra espécie.'}
          </p>
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-400 text-xs font-medium">
            <span>Para cadastrar seus troféus e fotos, acesse a aba <strong>Perfil</strong> e toque em <strong>+</strong></span>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredCatches.map(fish => {
            const canDelete = currentUser && (currentUser.role === 'admin' || currentUser.id === fish.userId);

            return (
              <div
                key={fish.id}
                className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden shadow-xl flex flex-col justify-between hover:border-slate-700 transition-colors"
              >
                {/* Photo with Overlay - Clickable to open photo, info, likes & comments */}
                <div 
                  onClick={() => onSelectCatch?.(fish)}
                  className="relative h-52 w-full overflow-hidden bg-slate-950 group cursor-pointer"
                  title="Clique para ver foto ampliada, curtir e comentar"
                >
                  <img
                    src={fish.photoUrl}
                    alt={fish.species}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-black/40 group-hover:from-slate-950/90 transition-colors" />

                  {/* Solto com Vida badge */}
                  {fish.released && (
                    <span className="absolute top-3 left-3 bg-emerald-950/80 backdrop-blur-md border border-emerald-500/40 text-emerald-300 text-[11px] font-semibold px-2.5 py-1 rounded-lg">
                      ✓ Pesque & Solte
                    </span>
                  )}

                  {/* Click to open badge on hover */}
                  <span className="absolute top-3 right-3 bg-slate-950/80 backdrop-blur-md border border-slate-700 text-slate-200 text-[10px] font-bold px-2 py-1 rounded-lg opacity-85 group-hover:opacity-100 group-hover:border-emerald-500/60 transition-all flex items-center gap-1">
                    <MessageCircle className="w-3 h-3 text-cyan-400" />
                    <span>Ver Detalhes</span>
                  </span>

                  {/* Weight & Length Banner */}
                  <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-white">
                    <div>
                      <div className="text-xl font-extrabold font-mono-numbers drop-shadow-md">
                        {fish.weightKg.toFixed(2)} kg
                      </div>
                      {fish.lengthCm > 0 && (
                        <div className="text-xs text-slate-300 font-mono-numbers">
                          {fish.lengthCm} cm
                        </div>
                      )}
                    </div>

                    {/* Weather at catch time */}
                    {fish.weatherTemp && (
                      <div className="flex items-center gap-2 text-xs bg-slate-950/80 backdrop-blur-md px-2.5 py-1 rounded-lg border border-slate-800 text-slate-300">
                        <span className="flex items-center gap-1 text-amber-300">
                          <Thermometer className="w-3 h-3" />
                          <span>{fish.weatherTemp}°C</span>
                        </span>
                        {fish.windSpeedKm && (
                          <span className="flex items-center gap-1 text-cyan-300">
                            <Wind className="w-3 h-3" />
                            <span>{fish.windSpeedKm} km/h</span>
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Card Content */}
                <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                  <div>
                    {/* Species & Spot */}
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <h3 
                        onClick={() => onSelectCatch?.(fish)}
                        className="text-lg font-bold text-slate-100 hover:text-emerald-300 transition-colors cursor-pointer truncate"
                      >
                        {fish.species}
                      </h3>
                    </div>

                    <button
                      onClick={() => onOpenSpot && onOpenSpot(fish.spotId)}
                      className="text-xs text-cyan-400 hover:underline truncate block text-left mb-2.5"
                    >
                      Ponto: {fish.spotName}
                    </button>

                    {/* Prominent Bait Section */}
                    <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-2.5">
                      <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-slate-400 font-semibold mb-1">
                        <Anchor className="w-3.5 h-3.5 text-amber-400" />
                        <span>Isca Utilizada:</span>
                      </div>
                      <div className="text-xs font-bold text-amber-300 truncate">
                        {fish.baitUsed}
                      </div>
                      {fish.technique && (
                        <div className="text-[11px] text-slate-400 mt-1 line-clamp-1 italic">
                          "{fish.technique}"
                        </div>
                      )}
                    </div>

                    {/* Fisherman Notes */}
                    {fish.notes && (
                      <p className="text-xs text-slate-300 mt-2.5 line-clamp-2 leading-relaxed">
                        {fish.notes}
                      </p>
                    )}
                  </div>

                  {/* Footer with Member info and actions */}
                  <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2">
                    {/* Member Profile Clickable Link */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onViewUserProfile?.(fish.userId);
                      }}
                      className="flex items-center gap-2 min-w-0 text-left group/author cursor-pointer"
                      title={`Ver perfil completo de ${fish.userName}`}
                    >
                      <img
                        src={fish.userAvatar}
                        alt={fish.userName}
                        className="w-7 h-7 rounded-full object-cover border border-slate-700 group-hover/author:ring-2 group-hover/author:ring-emerald-400 transition-all shrink-0"
                      />
                      <div className="truncate">
                        <div className="text-xs font-semibold text-slate-200 group-hover/author:text-emerald-300 transition-colors truncate">
                          {fish.userName}
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono-numbers">
                          {new Date(fish.capturedAt).toLocaleDateString('pt-BR')}
                        </div>
                      </div>
                    </button>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => onToggleLike && onToggleLike(fish.id)}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-slate-950 border border-slate-800 text-xs text-rose-400 hover:bg-rose-950/40 transition-colors cursor-pointer"
                        title="Curtir peixe"
                      >
                        <Heart className={`w-3.5 h-3.5 ${fish.likes?.includes(currentUser?.id || '') ? 'fill-rose-500 text-rose-500' : 'fill-rose-500/20'}`} />
                        <span className="font-mono-numbers text-[11px] font-bold">{fish.likesCount || 0}</span>
                      </button>

                      <button
                        onClick={() => onSelectCatch ? onSelectCatch(fish) : onOpenSpot?.(fish.spotId)}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                        title="Ver detalhes e comentários"
                      >
                        <MessageCircle className="w-3.5 h-3.5 text-cyan-400" />
                        <span className="font-mono-numbers text-[11px] font-bold">{fish.comments?.length || 0}</span>
                      </button>

                      {canDelete && onDeleteCatch && (
                        <button
                          onClick={() => {
                            if (confirm('Excluir este registro de peixe?')) {
                              onDeleteCatch(fish.id);
                            }
                          }}
                          title="Excluir captura (Admin)"
                          className="p-1 rounded-lg text-slate-500 hover:text-rose-400 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
