import { useState } from 'react';
import { FishCatch, User } from '../types';
import { Trophy, Medal, Crown, Fish, Scale, Sparkles, Award } from 'lucide-react';

interface LeaderboardViewProps {
  catches: FishCatch[];
  users: User[];
  onOpenUserDetail?: (user: User) => void;
}

export function LeaderboardView({ catches, users, onOpenUserDetail }: LeaderboardViewProps) {
  const [filterSpecies, setFilterSpecies] = useState('all');

  // Filter catches if species filter chosen
  const filteredCatches = filterSpecies === 'all'
    ? catches
    : catches.filter(c => c.species.toLowerCase().includes(filterSpecies.toLowerCase()));

  // Calculate points and stats per user
  const userStats = users.map(user => {
    const userCatches = filteredCatches.filter(c => c.userId === user.id);
    const totalCatches = userCatches.length;
    const totalWeight = userCatches.reduce((acc, c) => acc + c.weightKg, 0);
    const biggestFish = userCatches.reduce<FishCatch | null>((max, c) => (!max || c.weightKg > max.weightKg ? c : max), null);
    
    // Points formula: 10 pts per kg + 15 pts bonus for each catch + 20 pts for catch & release
    let points = 0;
    userCatches.forEach(c => {
      points += Math.round(c.weightKg * 10);
      points += 15;
      if (c.released) points += 20;
      if (c.weightKg >= 4.0) points += 30; // trophy bonus
    });

    return {
      user,
      totalCatches,
      totalWeight,
      biggestFish,
      points
    };
  }).sort((a, b) => b.points - a.points);

  const top3 = userStats.slice(0, 3);
  const remaining = userStats.slice(3);

  return (
    <div className="space-y-4 w-full overflow-hidden">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-amber-950/40 border border-slate-800 rounded-2xl p-4 shadow-xl flex flex-col gap-3">
        <div>
          <div className="text-[11px] uppercase tracking-wider text-amber-400 font-bold mb-1 flex items-center gap-1.5">
            <Trophy className="w-3.5 h-3.5 text-amber-400" />
            <span>Ranking Oficial Barrantuba 2026</span>
          </div>
          <h1 className="text-lg font-extrabold text-white tracking-tight">
            Hall dos Mestres da Pesca
          </h1>
          <p className="text-xs text-slate-300 mt-1 leading-relaxed">
            Pontuação calculada com base em peso aferido, soltura com vida (+20 pts) e troféus registrados.
          </p>
        </div>

        {/* Filter */}
        <select
          value={filterSpecies}
          onChange={(e) => setFilterSpecies(e.target.value)}
          className="bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-amber-500 shrink-0"
        >
          <option value="all">Todas as Espécies (Geral)</option>
          <option value="tucunaré">Ranking Especial Tucunarés</option>
          <option value="robalo">Ranking Especial Robalos</option>
          <option value="dourado">Ranking Especial Dourados</option>
          <option value="pintado">Ranking Peixes de Couro</option>
        </select>
      </div>

      {/* Season Announcement when no catches registered yet */}
      {catches.length === 0 ? (
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-8 text-center text-slate-400">
          <Trophy className="w-12 h-12 text-amber-500/50 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-200 mb-1">A Temporada Barrantuba 2026 Começou!</h3>
          <p className="text-xs max-w-md mx-auto text-slate-400">
            Nenhuma captura foi registrada ainda. O primeiro membro que registrar um peixe no aplicativo assumirá a liderança do ranking com pontuação por peso e bônus de pesque & solte!
          </p>
        </div>
      ) : top3.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
          {/* 2nd Place */}
          {top3[1] && (
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col items-center text-center relative order-2 md:order-1 mt-0 md:mt-4">
              <div className="w-10 h-10 rounded-full bg-slate-800 border-2 border-slate-400 flex items-center justify-center text-slate-200 font-bold text-sm mb-3 shadow-md">
                2º
              </div>
              <img
                src={top3[1].user.avatar}
                alt={top3[1].user.name}
                className="w-20 h-20 rounded-2xl object-cover border-2 border-slate-400 shadow-xl mb-3"
              />
              <h3 className="font-bold text-slate-100 text-base">{top3[1].user.name}</h3>
              <div className="text-xs text-slate-400 mt-0.5">{top3[1].user.preferredSpecies.slice(0, 2).join(' · ')}</div>
              
              <div className="mt-4 pt-3 border-t border-slate-800 w-full flex items-center justify-around text-xs">
                <div>
                  <div className="text-slate-500 text-[10px]">PONTOS</div>
                  <div className="font-bold text-slate-200 font-mono-numbers text-base">{top3[1].points}</div>
                </div>
                <div>
                  <div className="text-slate-500 text-[10px]">CAPTURAS</div>
                  <div className="font-bold text-slate-200 font-mono-numbers text-base">{top3[1].totalCatches}</div>
                </div>
                <div>
                  <div className="text-slate-500 text-[10px]">MAIOR</div>
                  <div className="font-bold text-slate-200 font-mono-numbers text-base">
                    {top3[1].biggestFish ? `${top3[1].biggestFish.weightKg}kg` : '-'}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 1st Place (Champion) */}
          {top3[0] && (
            <div className="bg-gradient-to-b from-amber-950/40 via-slate-900 to-slate-900 border-2 border-amber-500/60 rounded-2xl p-6 shadow-2xl flex flex-col items-center text-center relative order-1 md:order-2">
              <div className="absolute -top-3.5 bg-amber-500 text-slate-950 px-3 py-0.5 rounded-full text-xs font-black tracking-wider uppercase flex items-center gap-1 shadow-lg">
                <Crown className="w-3.5 h-3.5 fill-slate-950" />
                <span>Líder Barrantuba</span>
              </div>

              <div className="w-12 h-12 rounded-full bg-amber-500 border-2 border-amber-300 flex items-center justify-center text-slate-950 font-black text-base mb-3 shadow-lg">
                1º
              </div>
              <img
                src={top3[0].user.avatar}
                alt={top3[0].user.name}
                className="w-24 h-24 rounded-2xl object-cover border-4 border-amber-400 shadow-2xl mb-3"
              />
              <h3 className="font-extrabold text-white text-lg">{top3[0].user.name}</h3>
              <div className="text-xs text-amber-300 font-medium mt-0.5">Mestre Pescador do Mês</div>

              <div className="mt-4 pt-3 border-t border-slate-800 w-full flex items-center justify-around text-xs">
                <div>
                  <div className="text-amber-400/80 text-[10px] font-bold">PONTOS</div>
                  <div className="font-extrabold text-amber-300 font-mono-numbers text-xl">{top3[0].points}</div>
                </div>
                <div>
                  <div className="text-slate-400 text-[10px]">PEIXES</div>
                  <div className="font-bold text-slate-100 font-mono-numbers text-lg">{top3[0].totalCatches}</div>
                </div>
                <div>
                  <div className="text-slate-400 text-[10px]">MAIOR TROFÉU</div>
                  <div className="font-bold text-emerald-400 font-mono-numbers text-lg">
                    {top3[0].biggestFish ? `${top3[0].biggestFish.weightKg}kg` : '-'}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 3rd Place */}
          {top3[2] && (
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col items-center text-center relative order-3 mt-0 md:mt-6">
              <div className="w-10 h-10 rounded-full bg-amber-900/60 border-2 border-amber-700 flex items-center justify-center text-amber-200 font-bold text-sm mb-3 shadow-md">
                3º
              </div>
              <img
                src={top3[2].user.avatar}
                alt={top3[2].user.name}
                className="w-20 h-20 rounded-2xl object-cover border-2 border-amber-700 shadow-xl mb-3"
              />
              <h3 className="font-bold text-slate-100 text-base">{top3[2].user.name}</h3>
              <div className="text-xs text-slate-400 mt-0.5">{top3[2].user.preferredSpecies.slice(0, 2).join(' · ')}</div>

              <div className="mt-4 pt-3 border-t border-slate-800 w-full flex items-center justify-around text-xs">
                <div>
                  <div className="text-slate-500 text-[10px]">PONTOS</div>
                  <div className="font-bold text-slate-200 font-mono-numbers text-base">{top3[2].points}</div>
                </div>
                <div>
                  <div className="text-slate-500 text-[10px]">CAPTURAS</div>
                  <div className="font-bold text-slate-200 font-mono-numbers text-base">{top3[2].totalCatches}</div>
                </div>
                <div>
                  <div className="text-slate-500 text-[10px]">MAIOR</div>
                  <div className="font-bold text-slate-200 font-mono-numbers text-base">
                    {top3[2].biggestFish ? `${top3[2].biggestFish.weightKg}kg` : '-'}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Full Leaderboard List (Mobile-First, Zero Horizontal Scroll) */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="p-3.5 border-b border-slate-800 flex items-center justify-between gap-2">
          <h3 className="text-sm font-bold text-slate-100 flex items-center gap-1.5">
            <Medal className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Tabela Geral</span>
          </h3>
          <span className="text-[11px] text-slate-400 font-mono-numbers shrink-0">{userStats.length} membros</span>
        </div>

        <div className="divide-y divide-slate-800/60">
          {userStats.map((item, index) => (
            <div
              key={item.user.id}
              onClick={() => onOpenUserDetail?.(item.user)}
              className="p-3 flex items-center justify-between gap-2.5 hover:bg-slate-800/40 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                <div className="w-7 text-center font-extrabold text-sm font-mono-numbers shrink-0">
                  {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`}
                </div>
                <img
                  src={item.user.avatar}
                  alt={item.user.name}
                  className="w-9 h-9 rounded-full object-cover border border-slate-700 shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <div className="font-bold text-xs text-slate-100 flex items-center gap-1 truncate">
                    <span className="truncate">{item.user.name}</span>
                    {item.user.role === 'admin' && (
                      <span className="text-[9px] bg-amber-500/20 text-amber-300 px-1.5 py-0.2 rounded font-semibold shrink-0">
                        Admin
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] text-slate-400 truncate">
                    {item.totalCatches} {item.totalCatches === 1 ? 'captura' : 'capturas'}
                    {item.biggestFish ? ` • Maior: ${item.biggestFish.weightKg.toFixed(2)}kg` : ''}
                  </div>
                </div>
              </div>

              <div className="text-right shrink-0">
                <span className="text-sm font-extrabold text-amber-400 font-mono-numbers block leading-none">
                  {item.points} pts
                </span>
                <span className="text-[9px] text-slate-500">pontuação</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
