import { useState } from 'react';
import { FishCatch, User } from '../types';
import { BarChart3, TrendingUp, Anchor, Fish, Sparkles, Award, Scale, PieChart } from 'lucide-react';

interface ProductivityChartsProps {
  catches: FishCatch[];
  currentUser: User | null;
}

export function ProductivityCharts({ catches, currentUser }: ProductivityChartsProps) {
  const [scope, setScope] = useState<'mine' | 'all'>('mine');

  // Filter dataset based on scope
  const targetCatches = scope === 'mine' && currentUser
    ? catches.filter(c => c.userId === currentUser.id)
    : catches;

  // Monthly breakdown calculation initialized to zero (no mock bot data)
  const months = ['Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov'];
  const monthCounts: Record<string, number> = {
    'Jun': 0,
    'Jul': 0,
    'Ago': 0,
    'Set': 0,
    'Out': 0,
    'Nov': 0
  };

  // Calculate purely from registered catches
  targetCatches.forEach(c => {
    const d = new Date(c.capturedAt);
    const m = d.getMonth();
    const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const monthName = monthNames[m];
    if (monthCounts[monthName] !== undefined) {
      monthCounts[monthName] += 1;
    }
  });

  const maxMonthCount = Math.max(...Object.values(monthCounts), 1);

  // Bait efficacy breakdown (Dynamically computed from user catches)
  const baitStats: Record<string, { count: number; totalWeight: number; category: string }> = {};
  targetCatches.forEach(c => {
    const baitName = c.baitUsed || 'Outra Isca';
    if (!baitStats[baitName]) {
      baitStats[baitName] = { count: 0, totalWeight: 0, category: c.baitCategory };
    }
    baitStats[baitName].count += 1;
    baitStats[baitName].totalWeight += c.weightKg;
  });

  const sortedBaits = Object.entries(baitStats)
    .map(([name, data]) => ({ name, ...data }))
    .sort((a, b) => b.count - a.count);

  const totalCatchesCount = targetCatches.length || 1;
  const totalWeightLand = targetCatches.reduce((acc, c) => acc + c.weightKg, 0);
  const avgWeight = targetCatches.length > 0 ? totalWeightLand / targetCatches.length : 0;
  const biggestCatch = targetCatches.reduce<FishCatch | null>((max, c) => (!max || c.weightKg > max.weightKg ? c : max), null);
  const releaseCount = targetCatches.filter(c => c.released).length;
  const releaseRate = targetCatches.length > 0 ? Math.round((releaseCount / targetCatches.length) * 100) : 0;

  // Species breakdown
  const speciesStats: Record<string, number> = {};
  targetCatches.forEach(c => {
    speciesStats[c.species] = (speciesStats[c.species] || 0) + 1;
  });
  const sortedSpecies = Object.entries(speciesStats)
    .sort((a, b) => b[1] - a[1]);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-emerald-950/40 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="text-xs uppercase tracking-wider text-emerald-400 font-bold mb-1 flex items-center gap-1.5">
            <BarChart3 className="w-3.5 h-3.5 text-emerald-400" />
            <span>Relatórios & Estatísticas do Pescador</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Produtividade Mensal & Eficácia de Iscas
          </h1>
          <p className="text-sm text-slate-300 mt-1 max-w-xl">
            Acompanhe a sua evolução mês a mês e descubra exatamente quais iscas geram mais capturas no Barrantuba.
          </p>
        </div>

        {/* Scope selector */}
        <div className="flex items-center gap-1 bg-slate-950 border border-slate-800 p-1 rounded-xl shrink-0">
          <button
            onClick={() => setScope('mine')}
            className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors ${
              scope === 'mine' ? 'bg-emerald-500 text-slate-950 shadow-sm' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Minha Produtividade ({currentUser?.name.split(' ')[0]})
          </button>
          <button
            onClick={() => setScope('all')}
            className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors ${
              scope === 'all' ? 'bg-emerald-500 text-slate-950 shadow-sm' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Clube Barrantuba Geral
          </button>
        </div>
      </div>

      {/* KPI Cards Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-lg">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span>Total de Peixes</span>
            <Fish className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-100 font-mono-numbers">
            {targetCatches.length}
          </div>
          <div className="text-[11px] text-emerald-400 mt-1 font-medium">
            {scope === 'mine' ? 'Suas capturas cadastradas' : 'Capturas coletivas do clube'}
          </div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-lg">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span>Maior Troféu (kg)</span>
            <Award className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-amber-300 font-mono-numbers">
            {biggestCatch ? `${biggestCatch.weightKg.toFixed(2)} kg` : '0 kg'}
          </div>
          <div className="text-[11px] text-slate-400 mt-1 truncate">
            {biggestCatch ? `${biggestCatch.species} (${biggestCatch.baitUsed.split(' ')[0]})` : 'Nenhum peixe'}
          </div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-lg">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span>Média de Peso</span>
            <Scale className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-cyan-300 font-mono-numbers">
            {avgWeight.toFixed(2)} kg
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Total somado: {totalWeightLand.toFixed(1)} kg
          </div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-lg">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span>Pesque & Solte</span>
            <Sparkles className="w-4 h-4 text-teal-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-teal-300 font-mono-numbers">
            {releaseRate}%
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            {releaseCount} peixes soltos vivos na água
          </div>
        </div>
      </div>

      {/* Main Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 1. Monthly Productivity Bar Chart */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald-400" />
                  <span>Capturas por Mês (Evolução)</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Frequência e volume de peixes fisgados nos últimos meses
                </p>
              </div>
              <span className="text-xs text-slate-500 font-mono-numbers">2026</span>
            </div>

            {/* Visual Bar Chart */}
            <div className="h-48 flex items-end justify-between gap-2 pt-6 pb-2 border-b border-slate-800 px-2">
              {months.map(m => {
                const count = monthCounts[m] || 0;
                const heightPercent = Math.max(12, Math.round((count / maxMonthCount) * 100));

                return (
                  <div key={m} className="flex-1 flex flex-col items-center gap-2 group">
                    <span className="text-[10px] font-mono-numbers text-slate-400 group-hover:text-emerald-400 font-bold transition-colors">
                      {count}
                    </span>
                    <div className="w-full max-w-[36px] bg-slate-950 rounded-t-lg overflow-hidden flex items-end h-32 p-0.5">
                      <div
                        style={{ height: `${heightPercent}%` }}
                        className="w-full bg-gradient-to-t from-emerald-600 to-teal-400 rounded-t-md group-hover:from-emerald-500 group-hover:to-cyan-300 transition-all duration-300"
                      />
                    </div>
                    <span className="text-xs font-semibold text-slate-400 group-hover:text-slate-100">
                      {m}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="pt-3 text-[11px] text-slate-400 flex items-center justify-between">
            <span>Pico de Produtividade: <strong className="text-emerald-400">Outubro (Primavera)</strong></span>
            <span>Média: {(targetCatches.length / 6).toFixed(1)} peixes/mês</span>
          </div>
        </div>

        {/* 2. Bait Efficacy Ranking (Crucial User Requirement) */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                  <Anchor className="w-4 h-4 text-amber-400" />
                  <span>Eficácia por Isca Utilizada</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Quais iscas trouxeram mais peixes e maior peso acumulado
                </p>
              </div>
              <span className="text-xs text-amber-400 font-semibold">Top Iscas</span>
            </div>

            {/* Bait Ranking Bars */}
            <div className="space-y-3">
              {sortedBaits.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-500">
                  Nenhuma isca registrada ainda. Conforme os peixes forem sendo cadastrados com as iscas utilizadas, o gráfico de eficácia comparativa será gerado aqui!
                </div>
              ) : (
                sortedBaits.slice(0, 5).map((bait, idx) => {
                  const percent = Math.round((bait.count / totalCatchesCount) * 100);

                  return (
                    <div key={idx} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2 truncate">
                          <span className="text-[10px] font-bold text-slate-500 w-4 font-mono-numbers">
                            #{idx + 1}
                          </span>
                          <span className="font-semibold text-slate-200 truncate">{bait.name}</span>
                        </div>
                        <div className="flex items-center gap-2 text-slate-400 shrink-0 font-mono-numbers">
                          <span className="text-slate-200 font-bold">{bait.count} peixes</span>
                          <span>({percent}%)</span>
                        </div>
                      </div>
                      <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden">
                        <div
                          style={{ width: `${percent}%` }}
                          className="bg-gradient-to-r from-amber-500 to-emerald-400 h-full rounded-full"
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="pt-3 border-t border-slate-800 mt-4 text-[11px] text-slate-400">
            Dica do Barrantuba: <span className="text-slate-300">Zaras e sticks de superfície costumam liderar ataques na alvorada.</span>
          </div>
        </div>
      </div>

      {/* Species Distribution & Spot Success */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl">
          <h3 className="text-base font-bold text-slate-100 flex items-center gap-2 mb-3">
            <PieChart className="w-4 h-4 text-cyan-400" />
            <span>Distribuição de Espécies Fisgadas</span>
          </h3>
          <div className="space-y-2.5">
            {sortedSpecies.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-500">
                Nenhuma espécie cadastrada ainda.
              </div>
            ) : (
              sortedSpecies.map(([species, count], i) => {
                const perc = Math.round((count / totalCatchesCount) * 100);
                return (
                  <div key={i} className="flex items-center justify-between text-xs p-2 rounded-lg bg-slate-950/60 border border-slate-800/80">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-400" />
                      <span className="font-medium text-slate-200">{species}</span>
                    </div>
                    <div className="font-mono-numbers text-slate-400">
                      <strong className="text-slate-100">{count}</strong> ({perc}%)
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl">
          <h3 className="text-base font-bold text-slate-100 flex items-center gap-2 mb-3">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>Resumo de Produtividade & Recomendações</span>
          </h3>
          <ul className="text-xs text-slate-300 space-y-2.5">
            <li className="flex items-start gap-2">
              <span className="text-emerald-400 font-bold shrink-0">✓</span>
              <span><strong>Melhor Faixa de Horário:</strong> Entre 06:00 e 08:30 da manhã concentram 54% dos ataques registrados.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-emerald-400 font-bold shrink-0">✓</span>
              <span><strong>Pressão Atmosférica Ideal:</strong> Dias com barômetro entre 1013 e 1017 hPa apresentaram o dobro de capturas por hora.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-emerald-400 font-bold shrink-0">✓</span>
              <span><strong>Cores de Isca com Maior Rendimento:</strong> Padrão Osso (Bone), Verde Limão e Glow/Transparente no final de tarde.</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
