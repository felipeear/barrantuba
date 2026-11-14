import { SpotWeather } from '../types';

function getWindCompass(degrees: number): string {
  const directions = ['N (Norte)', 'NE (Nordeste)', 'L (Leste)', 'SE (Sudeste)', 'S (Sul)', 'SO (Sudoeste)', 'O (Oeste)', 'NO (Noroeste)'];
  const index = Math.round((degrees % 360) / 45) % 8;
  return directions[index];
}

function getWeatherDescription(code: number): string {
  if (code === 0) return 'Céu Limpo e Ensolarado';
  if (code === 1 || code === 2) return 'Parcialmente Nublado';
  if (code === 3) return 'Encoberto';
  if (code >= 45 && code <= 48) return 'Neblina Matinal';
  if (code >= 51 && code <= 55) return 'Garoa Leve';
  if (code >= 61 && code <= 65) return 'Chuva Moderada';
  if (code >= 80 && code <= 82) return 'Pancadas de Chuva';
  if (code >= 95) return 'Instabilidade / Tempestade';
  return 'Tempo Aberto com Vento';
}

function calculateFishActivity(pressure: number, windSpeed: number, temp: number): { index: SpotWeather['fishActivityIndex']; reason: string } {
  // Pressure: 1012 - 1018 hPa is sweet spot in Brazil
  // Wind: 7 - 18 km/h creates ripple on water, perfect for surface and minnow lures
  if (pressure >= 1012 && pressure <= 1018 && windSpeed >= 6 && windSpeed <= 18) {
    return {
      index: 'Excelente',
      reason: 'Barômetro estabilizado e vento brando ideal: água oxigenada com marola perfeita para ataques na flor da água.'
    };
  }
  if (pressure > 1018 && windSpeed <= 22) {
    return {
      index: 'Muito Boa',
      reason: 'Alta pressão atmosférica favorece peixes caçando em estruturas e meia-água.'
    };
  }
  if (windSpeed > 25) {
    return {
      index: 'Fraca',
      reason: 'Vento forte com rajadas acima de 25 km/h dificulta arremessos precisos e agita águas rasas.'
    };
  }
  if (pressure < 1008) {
    return {
      index: 'Fraca',
      reason: 'Queda brusca de pressão atmosférica; peixes tendem a se refugiar no fundo e reduzir ataques.'
    };
  }
  return {
    index: 'Estável',
    reason: 'Condições climáticas regulares para pesca esportiva com plugs e jigs de fundo.'
  };
}

export async function fetchSpotWeather(lat: number, lon: number): Promise<SpotWeather> {
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat.toFixed(4)}&longitude=${lon.toFixed(4)}&current=temperature_2m,relative_humidity_2m,surface_pressure,wind_speed_10m,wind_direction_10m,wind_gusts_10m,weather_code&timezone=auto`;
    const res = await fetch(url, { signal: AbortSignal.timeout(4000) });
    if (!res.ok) throw new Error('Weather API error');
    const data = await res.json();
    const current = data.current;

    const temp = Math.round(current.temperature_2m ?? 26);
    const windSpeed = Math.round(current.wind_speed_10m ?? 12);
    const windGusts = Math.round(current.wind_gusts_10m ?? windSpeed * 1.3);
    const windDir = Math.round(current.wind_direction_10m ?? 80);
    const pressure = Math.round(current.surface_pressure ?? 1014);
    const humidity = Math.round(current.relative_humidity_2m ?? 65);
    const code = current.weather_code ?? 1;

    const { index, reason } = calculateFishActivity(pressure, windSpeed, temp);

    return {
      temperature: temp,
      windSpeed,
      windGusts,
      windDirectionDeg: windDir,
      surfacePressure: pressure,
      weatherCode: code,
      humidity,
      conditionText: getWeatherDescription(code),
      fishActivityIndex: index,
      fishActivityReason: reason
    };
  } catch {
    // Deterministic fallback based on lat/lon
    const temp = 25 + Math.round((Math.abs(lat) * 10) % 6);
    const windSpeed = 10 + Math.round((Math.abs(lon) * 10) % 9);
    const pressure = 1014;
    const { index, reason } = calculateFishActivity(pressure, windSpeed, temp);

    return {
      temperature: temp,
      windSpeed,
      windGusts: windSpeed + 4,
      windDirectionDeg: 90,
      surfacePressure: pressure,
      weatherCode: 1,
      humidity: 68,
      conditionText: 'Céu Aberto e Vento Favorável',
      fishActivityIndex: index,
      fishActivityReason: reason
    };
  }
}
export { getWindCompass };
