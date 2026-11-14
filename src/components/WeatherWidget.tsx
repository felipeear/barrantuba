import { useState, useEffect } from 'react';
import { fetchSpotWeather, getWindCompass } from '../services/weatherService';
import { SpotWeather } from '../types';
import { Wind, Compass, Gauge, Droplets, Thermometer, RefreshCw, AlertCircle, CheckCircle2 } from 'lucide-react';

interface WeatherWidgetProps {
  lat: number;
  lon: number;
  spotName?: string;
  compact?: boolean;
}

export function WeatherWidget({ lat, lon, spotName, compact = false }: WeatherWidgetProps) {
  const [weather, setWeather] = useState<SpotWeather | null>(null);
  const [loading, setLoading] = useState(true);

  const loadWeather = async () => {
    setLoading(true);
    const data = await fetchSpotWeather(lat, lon);
    setWeather(data);
    setLoading(false);
  };

  useEffect(() => {
    loadWeather();
  }, [lat, lon]);

  if (loading && !weather) {
    return (
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 flex items-center justify-center gap-3 text-slate-400 text-sm">
        <RefreshCw className="w-4 h-4 animate-spin text-emerald-400" />
        <span>Consultando satélite e vento ao vivo...</span>
      </div>
    );
  }

  if (!weather) return null;

  const getActivityBadge = (index: SpotWeather['fishActivityIndex']) => {
    switch (index) {
      case 'Excelente':
        return {
          bg: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
          icon: <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
        };
      case 'Muito Boa':
        return {
          bg: 'bg-teal-500/15 text-teal-400 border-teal-500/30',
          icon: <CheckCircle2 className="w-4 h-4 text-teal-400 shrink-0" />
        };
      case 'Estável':
        return {
          bg: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
          icon: <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
        };
      case 'Fraca':
      default:
        return {
          bg: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
          icon: <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
        };
    }
  };

  const activityStyle = getActivityBadge(weather.fishActivityIndex);

  if (compact) {
    return (
      <div className="flex items-center gap-3 text-xs bg-slate-900/90 border border-slate-800/80 rounded-lg px-3 py-2 text-slate-300">
        <div className="flex items-center gap-1.5 text-amber-300 font-medium">
          <Thermometer className="w-3.5 h-3.5" />
          <span>{weather.temperature}°C</span>
        </div>
        <span className="text-slate-600">·</span>
        <div className="flex items-center gap-1.5 text-cyan-300 font-medium">
          <Wind className="w-3.5 h-3.5" />
          <span>{weather.windSpeed} km/h</span>
          <span className="text-slate-400 text-[10px]">({getWindCompass(weather.windDirectionDeg).split(' ')[0]})</span>
        </div>
        <span className="text-slate-600">·</span>
        <div className="flex items-center gap-1.5 text-emerald-400">
          <Gauge className="w-3.5 h-3.5" />
          <span>{weather.surfacePressure} hPa</span>
        </div>
        <span className="text-slate-600">·</span>
        <span className="text-emerald-400 font-medium">Atividade: {weather.fishActivityIndex}</span>
      </div>
    );
  }

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 text-slate-200">
      <div className="flex items-center justify-between gap-3 mb-3 pb-2.5 border-b border-slate-800">
        <div>
          <div className="text-xs uppercase tracking-wider text-slate-400 font-semibold">Clima & Vento em Tempo Real</div>
          {spotName && <div className="text-sm font-medium text-slate-100">{spotName}</div>}
        </div>
        <button
          onClick={loadWeather}
          title="Atualizar clima"
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-emerald-400' : ''}`} />
        </button>
      </div>

      {/* Grid of Weather Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-3.5">
        <div className="bg-slate-950/60 border border-slate-800/80 rounded-lg p-2.5">
          <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1">
            <Thermometer className="w-3.5 h-3.5 text-amber-400" />
            <span>Temperatura</span>
          </div>
          <div className="text-lg font-bold text-slate-100 font-mono-numbers">
            {weather.temperature}°C
          </div>
          <div className="text-[11px] text-slate-400 truncate">{weather.conditionText}</div>
        </div>

        <div className="bg-slate-950/60 border border-slate-800/80 rounded-lg p-2.5">
          <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1">
            <Wind className="w-3.5 h-3.5 text-cyan-400" />
            <span>Vento & Rajadas</span>
          </div>
          <div className="text-lg font-bold text-slate-100 font-mono-numbers flex items-baseline gap-1">
            <span>{weather.windSpeed}</span>
            <span className="text-xs font-normal text-slate-400">km/h</span>
          </div>
          <div className="text-[11px] text-slate-400">Rajadas {weather.windGusts} km/h</div>
        </div>

        <div className="bg-slate-950/60 border border-slate-800/80 rounded-lg p-2.5">
          <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1">
            <Compass className="w-3.5 h-3.5 text-teal-400" />
            <span>Direção do Vento</span>
          </div>
          <div className="text-sm font-bold text-slate-100 truncate">
            {getWindCompass(weather.windDirectionDeg)}
          </div>
          <div className="text-[11px] text-slate-400 font-mono-numbers">
            Azimute {weather.windDirectionDeg}°
          </div>
        </div>

        <div className="bg-slate-950/60 border border-slate-800/80 rounded-lg p-2.5">
          <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1">
            <Gauge className="w-3.5 h-3.5 text-emerald-400" />
            <span>Pressão (Barômetro)</span>
          </div>
          <div className="text-lg font-bold text-slate-100 font-mono-numbers flex items-baseline gap-1">
            <span>{weather.surfacePressure}</span>
            <span className="text-xs font-normal text-slate-400">hPa</span>
          </div>
          <div className="text-[11px] text-slate-400 flex items-center gap-1">
            <Droplets className="w-3 h-3 text-sky-400" /> Umidade {weather.humidity}%
          </div>
        </div>
      </div>

      {/* Fish Activity Analysis for Anglers */}
      <div className={`border rounded-lg p-3 ${activityStyle.bg}`}>
        <div className="flex items-center gap-2 mb-1">
          {activityStyle.icon}
          <div className="text-xs font-semibold uppercase tracking-wide">
            Índice de Atividade do Peixe: <span className="underline decoration-emerald-500/50">{weather.fishActivityIndex}</span>
          </div>
        </div>
        <p className="text-xs text-slate-300 leading-relaxed pl-6">
          {weather.fishActivityReason}
        </p>
      </div>
    </div>
  );
}
