import { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import { FishingSpot, ActiveFishingSession } from '../types';
import { MapPin, Navigation, Plus, Search, Radio, Compass, Layers, Check, Loader2, X } from 'lucide-react';
import { fetchSpotLocationSpecies, getCachedSpotLocationSpecies } from '../services/cityWeatherService';

interface InteractiveMapProps {
  spots: FishingSpot[];
  activeSessions: ActiveFishingSession[];
  selectedSpotId?: string | null;
  onSelectSpot: (spot: FishingSpot) => void;
  onOpenNewSpot: (latLng?: { lat: number; lng: number }) => void;
  onJoinSession?: (session: ActiveFishingSession) => void;
}

type MapLayerType = 'osm' | 'satellite' | 'topo';

// Free, reliable tile providers that require NO API KEY whatsoever
const TILE_PROVIDERS: Record<MapLayerType, { url: string; attribution: string; maxZoom: number; label: string }> = {
  osm: {
    label: 'Mapa OpenStreetMap',
    url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a> contributors',
    maxZoom: 19
  },
  satellite: {
    label: 'Satélite Aéreo (Esri)',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
    maxZoom: 19
  },
  topo: {
    label: 'Relevo & Topografia',
    url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
    attribution: 'Map data: &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, SRTM | Map style: &copy; <a href="https://opentopomap.org">OpenTopoMap</a>',
    maxZoom: 17
  }
};

export function InteractiveMap({
  spots,
  activeSessions,
  selectedSpotId,
  onSelectSpot,
  onOpenNewSpot,
  onJoinSession
}: InteractiveMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const currentTileLayerRef = useRef<L.TileLayer | null>(null);
  const markersGroupRef = useRef<L.LayerGroup | null>(null);
  const userLocationLayerRef = useRef<L.LayerGroup | null>(null);

  const [activeLayer, setActiveLayer] = useState<MapLayerType>('osm');
  const [showLayerMenu, setShowLayerMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [isPickingLocation, setIsPickingLocation] = useState(false);
  const [pickedLatLng, setPickedLatLng] = useState<{ lat: number; lng: number } | null>(null);
  const [locatingUser, setLocatingUser] = useState(false);
  const [userGpsLocation, setUserGpsLocation] = useState<{ lat: number; lng: number } | null>(null);

  // Switch Tile Layer smoothly
  const changeTileLayer = useCallback((layerKey: MapLayerType) => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (currentTileLayerRef.current) {
      map.removeLayer(currentTileLayerRef.current);
    }

    const provider = TILE_PROVIDERS[layerKey];
    const newTileLayer = L.tileLayer(provider.url, {
      attribution: provider.attribution,
      maxZoom: provider.maxZoom,
      subdomains: layerKey === 'topo' ? 'abc' : ''
    });

    newTileLayer.addTo(map);
    currentTileLayerRef.current = newTileLayer;
    setActiveLayer(layerKey);
    setShowLayerMenu(false);
  }, []);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return;

    // Default center in Brazil (Sao Paulo / Barrantuba region: -23.522, -46.732)
    // If spots exist, center on the first spot
    const initialCenter: [number, number] = spots.length > 0 
      ? [spots[0].latitude, spots[0].longitude] 
      : [-23.5245, -46.7321];

    const map = L.map(mapContainerRef.current, {
      center: initialCenter,
      zoom: spots.length > 0 ? 13 : 12,
      zoomControl: false,
    });

    // Add standard OpenStreetMap tiles - NO API KEY REQUIRED
    const osmProvider = TILE_PROVIDERS.osm;
    const tileLayer = L.tileLayer(osmProvider.url, {
      attribution: osmProvider.attribution,
      maxZoom: osmProvider.maxZoom
    }).addTo(map);

    currentTileLayerRef.current = tileLayer;

    // Zoom control at bottom right to keep top clear for search
    L.control.zoom({ position: 'bottomright' }).addTo(map);

    const markersGroup = L.layerGroup().addTo(map);
    markersGroupRef.current = markersGroup;

    const userLocGroup = L.layerGroup().addTo(map);
    userLocationLayerRef.current = userLocGroup;

    mapInstanceRef.current = map;

    // Automatically navigate directly to user's current live location on login/open
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude, longitude, accuracy } = pos.coords;
          setUserGpsLocation({ lat: latitude, lng: longitude });

          if (userLocationLayerRef.current) {
            userLocationLayerRef.current.clearLayers();

            L.circle([latitude, longitude], {
              radius: Math.min(accuracy, 200),
              color: '#38bdf8',
              fillColor: '#0284c7',
              fillOpacity: 0.15,
              weight: 1
            }).addTo(userLocationLayerRef.current);

            const userIcon = L.divIcon({
              className: 'user-gps-marker',
              html: `
                <div style="
                  position: relative;
                  width: 24px;
                  height: 24px;
                  background-color: #0284c7;
                  border: 3px solid #ffffff;
                  border-radius: 50%;
                  box-shadow: 0 0 16px rgba(2, 132, 199, 0.9);
                ">
                  <span style="
                    position: absolute;
                    inset: -6px;
                    border-radius: 50%;
                    background: rgba(56, 189, 248, 0.5);
                    animation: ping 1.8s cubic-bezier(0, 0, 0.2, 1) infinite;
                  "></span>
                </div>
              `,
              iconSize: [24, 24],
              iconAnchor: [12, 12]
            });

            L.marker([latitude, longitude], { icon: userIcon })
              .bindPopup(`
                <div style="font-family: 'Plus Jakarta Sans', system-ui; padding: 4px; text-align: center;">
                  <strong style="color: #0284c7; font-size: 13px;">Sua Localização Atual</strong>
                  <div style="font-size: 11px; color: #64748b; margin-top: 2px;">
                    Lat: ${latitude.toFixed(4)}, Lng: ${longitude.toFixed(4)}
                  </div>
                </div>
              `)
              .addTo(userLocationLayerRef.current);
          }

          map.flyTo([latitude, longitude], 15, { duration: 1.5 });
        },
        (err) => {
          console.log('Auto-locate initial GPS permission status:', err.message);
        },
        { enableHighAccuracy: true, timeout: 8000 }
      );
    }

    // Force size calculation to prevent partial grey tiles
    setTimeout(() => {
      map.invalidateSize();
    }, 150);

    // Map click for picking spot coordinates
    map.on('click', (e: L.LeafletMouseEvent) => {
      setPickedLatLng({ lat: e.latlng.lat, lng: e.latlng.lng });
    });

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Handle User Geolocation (GPS)
  const handleLocateUser = () => {
    if (!navigator.geolocation) {
      alert('Seu navegador não possui suporte a geolocalização GPS.');
      return;
    }

    setLocatingUser(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        setUserGpsLocation({ lat: latitude, lng: longitude });
        setLocatingUser(false);

        const map = mapInstanceRef.current;
        const userLocLayer = userLocationLayerRef.current;
        if (!map || !userLocLayer) return;

        userLocLayer.clearLayers();

        // Accuracy circle
        L.circle([latitude, longitude], {
          radius: Math.min(accuracy, 200),
          color: '#38bdf8',
          fillColor: '#0284c7',
          fillOpacity: 0.15,
          weight: 1
        }).addTo(userLocLayer);

        // User pulsed marker
        const userIcon = L.divIcon({
          className: 'user-gps-marker',
          html: `
            <div style="
              position: relative;
              width: 22px;
              height: 22px;
              background-color: #0284c7;
              border: 3px solid #ffffff;
              border-radius: 50%;
              box-shadow: 0 0 14px rgba(2, 132, 199, 0.8);
            ">
              <span style="
                position: absolute;
                inset: -6px;
                border-radius: 50%;
                background: rgba(56, 189, 248, 0.4);
                animation: ping 1.8s cubic-bezier(0, 0, 0.2, 1) infinite;
              "></span>
            </div>
          `,
          iconSize: [22, 22],
          iconAnchor: [11, 11]
        });

        L.marker([latitude, longitude], { icon: userIcon })
          .bindPopup(`
            <div style="font-family: 'Plus Jakarta Sans', system-ui; padding: 4px; text-align: center;">
              <strong style="color: #0284c7; font-size: 13px;">Sua Localização Atual</strong>
              <div style="font-size: 11px; color: #64748b; margin-top: 2px;">
                Lat: ${latitude.toFixed(4)}, Lng: ${longitude.toFixed(4)}
              </div>
            </div>
          `)
          .addTo(userLocLayer);

        map.flyTo([latitude, longitude], 15, { duration: 1.5 });
      },
      (err) => {
        setLocatingUser(false);
        console.warn('Geolocation error:', err);
        alert('Não foi possível obter a sua localização GPS. Verifique se a permissão de localização foi autorizada no navegador.');
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  // Render & Update Spots and Active Fishermen Markers
  useEffect(() => {
    const map = mapInstanceRef.current;
    const markersGroup = markersGroupRef.current;
    if (!map || !markersGroup) return;

    markersGroup.clearLayers();

    // Filter spots
    const filteredSpots = spots.filter(spot => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = !q || 
        spot.name.toLowerCase().includes(q) ||
        spot.targetSpecies.some(s => s.toLowerCase().includes(q)) ||
        spot.structureNotes.toLowerCase().includes(q) ||
        spot.createdByUserName.toLowerCase().includes(q);
      
      if (!matchesSearch) return false;
      if (filterType === 'all') return true;
      if (filterType === 'active_only') {
        return activeSessions.some(s => s.spotId === spot.id);
      }
      return spot.waterType === filterType;
    });

    // Add Markers for Fishing Spots
    filteredSpots.forEach(spot => {
      const isSelected = spot.id === selectedSpotId;
      const hasActiveFishers = activeSessions.some(s => s.spotId === spot.id);

      // Color scheme based on water type
      let borderColor = '#0284c7'; // default blue
      let badgeLabel = 'Rio';
      if (spot.waterType === 'rio') {
        borderColor = '#0ea5e9';
        badgeLabel = 'Rio';
      } else if (spot.waterType === 'represa') {
        borderColor = '#10b981';
        badgeLabel = 'Represa';
      } else if (spot.waterType === 'manguezal') {
        borderColor = '#f59e0b';
        badgeLabel = 'Manguezal';
      } else if (spot.waterType === 'mar') {
        borderColor = '#3b82f6';
        badgeLabel = 'Mar';
      } else if (spot.waterType === 'lagoa') {
        borderColor = '#14b8a6';
        badgeLabel = 'Lagoa';
      }

      if (hasActiveFishers) {
        borderColor = '#10b981';
      }

      const spotIcon = L.divIcon({
        className: 'custom-spot-marker',
        html: `
          <div style="
            position: relative;
            display: flex;
            align-items: center;
            justify-content: center;
            width: ${isSelected ? '44px' : '38px'};
            height: ${isSelected ? '44px' : '38px'};
            border-radius: 50%;
            background: #0f172a;
            border: 3px solid ${isSelected ? '#34d399' : borderColor};
            box-shadow: 0 4px 14px rgba(0,0,0,0.5);
            cursor: pointer;
            transition: transform 0.2s;
          ">
            ${hasActiveFishers ? `
              <span style="
                position: absolute;
                top: -3px;
                right: -3px;
                width: 12px;
                height: 12px;
                background-color: #10b981;
                border: 2px solid #0f172a;
                border-radius: 50%;
                display: inline-block;
                animation: pulse 1.5s infinite;
              "></span>
            ` : ''}
            <span style="font-size: 18px; line-height: 1;">🐟</span>
          </div>
        `,
        iconSize: [isSelected ? 44 : 38, isSelected ? 44 : 38],
        iconAnchor: [isSelected ? 22 : 19, isSelected ? 22 : 19]
      });

      const marker = L.marker([spot.latitude, spot.longitude], { icon: spotIcon });

      // Rich Informational Popup with real online regional species
      const cachedRegional = getCachedSpotLocationSpecies(spot.latitude, spot.longitude, spot.name);
      const displaySpeciesNames =
        cachedRegional && cachedRegional.speciesBiteTimes.length > 0
          ? cachedRegional.speciesBiteTimes.slice(0, 3).map(s => s.name)
          : spot.targetSpecies.slice(0, 3);

      const speciesBadges = displaySpeciesNames.map(sp =>
        `<span style="display:inline-block; background:#064e3b; color:#6ee7b7; border: 1px solid rgba(16,185,129,0.3); border-radius:4px; padding:2px 6px; font-size:10px; margin-right:4px; margin-top:2px;">${sp}</span>`
      ).join('');

      const popupHtml = `
        <div style="font-family: 'Plus Jakarta Sans', system-ui, sans-serif; width: 240px; color: #f8fafc; padding: 2px;">
          ${spot.imageUrl ? `
            <div style="width: 100%; height: 95px; border-radius: 8px; overflow: hidden; margin-bottom: 8px; background: #020617;">
              <img src="${spot.imageUrl}" alt="${spot.name}" style="width: 100%; height: 100%; object-fit: cover;" />
            </div>
          ` : ''}
          <div style="font-size: 14px; font-weight: 800; color: #f8fafc; line-height: 1.2; margin-bottom: 4px;">
            ${spot.name}
          </div>
          <div style="display: flex; align-items: center; gap: 6px; font-size: 11px; color: #38bdf8; font-weight: 600; margin-bottom: 6px;">
            <span>${badgeLabel.toUpperCase()}</span>
            <span style="color: #64748b;">·</span>
            <span style="color: #cbd5e1;">Acesso: ${spot.accessType.toUpperCase()}</span>
            ${spot.depthMeters ? `<span style="color:#64748b;">·</span><span style="color:#10b981;">${spot.depthMeters}m</span>` : ''}
          </div>

          <div style="font-size: 11px; color: #94a3b8; margin-bottom: 6px; line-height: 1.3;">
            ${spot.structureNotes || 'Estrutura com boa incidência de peixes predadores.'}
          </div>

          <div style="margin-bottom: 8px;">
            <div style="font-size: 10px; color: #64748b; font-weight: 700; text-transform: uppercase;">Espécies Alvo da Região:</div>
            <div style="display: flex; flex-wrap: wrap; margin-top: 2px;">
              ${speciesBadges || '<span style="font-size:10px; color:#94a3b8;">Identificando fauna local...</span>'}
            </div>
          </div>

          <div style="border-top: 1px solid #1e293b; padding-top: 6px; font-size: 10px; color: #64748b; display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
            <span>Cadastrado por: <strong style="color: #e2e8f0;">${spot.createdByUserName}</strong></span>
            <span>${spot.createdAt}</span>
          </div>

          ${hasActiveFishers ? `
            <div style="background: rgba(16, 185, 129, 0.15); border: 1px solid rgba(16, 185, 129, 0.3); border-radius: 6px; padding: 4px 8px; font-size: 11px; color: #34d399; font-weight: 700; text-align: center; margin-bottom: 6px;">
              🎣 Parceiro pescando aqui agora!
            </div>
          ` : ''}

          <button id="btn-view-spot-${spot.id}" style="
            width: 100%;
            background: #10b981;
            color: #022c22;
            border: none;
            border-radius: 8px;
            padding: 7px 10px;
            font-size: 11px;
            font-weight: 800;
            cursor: pointer;
            transition: background 0.2s;
          ">
            Ver Detalhes & Clima ao Vivo
          </button>
        </div>
      `;

      marker.bindPopup(popupHtml, { maxWidth: 260 });

      // Handle popup button click
      marker.on('popupopen', () => {
        void fetchSpotLocationSpecies(spot.latitude, spot.longitude, spot.name).catch(() => null);
        const btn = document.getElementById(`btn-view-spot-${spot.id}`);
        if (btn) {
          btn.onclick = () => {
            onSelectSpot(spot);
          };
        }
      });

      marker.on('click', () => {
        void fetchSpotLocationSpecies(spot.latitude, spot.longitude, spot.name).catch(() => null);
        // center on marker
        map.panTo([spot.latitude, spot.longitude]);
      });

      marker.addTo(markersGroup);
    });

    // Add Live Active Fishermen Markers
    activeSessions.forEach(session => {
      const fisherIcon = L.divIcon({
        className: 'custom-live-fisher-marker',
        html: `
          <div style="
            position: relative;
            display: flex;
            align-items: center;
            justify-content: center;
            width: 44px;
            height: 44px;
            cursor: pointer;
          ">
            <span style="
              position: absolute;
              inset: 0;
              border-radius: 50%;
              background: rgba(16, 185, 129, 0.35);
              border: 1px solid #10b981;
              animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;
            "></span>
            <img 
              src="${session.userAvatar}" 
              alt="${session.userName}"
              style="
                width: 34px;
                height: 34px;
                border-radius: 50%;
                border: 2px solid #10b981;
                object-fit: cover;
                z-index: 2;
                box-shadow: 0 4px 10px rgba(0,0,0,0.6);
              "
            />
            <span style="
              position: absolute;
              bottom: -4px;
              right: -2px;
              background: #0f172a;
              border: 1px solid #10b981;
              border-radius: 6px;
              padding: 0 3px;
              font-size: 10px;
              z-index: 3;
            ">🎣</span>
          </div>
        `,
        iconSize: [44, 44],
        iconAnchor: [22, 22]
      });

      const marker = L.marker([session.latitude + 0.0004, session.longitude + 0.0004], { icon: fisherIcon });
      marker.bindPopup(`
        <div style="font-family: 'Plus Jakarta Sans', system-ui; padding: 4px; color: #f8fafc; width: 200px;">
          <div style="font-weight: 800; font-size: 13px; color: #34d399;">${session.userName}</div>
          <div style="font-size: 11px; color: #cbd5e1; margin-top: 2px;">
            Pescando em: <strong>${session.spotName}</strong>
          </div>
          <div style="font-size: 11px; color: #94a3b8; margin-top: 4px; font-style: italic;">
            "${session.notes}"
          </div>
          ${onJoinSession ? `
            <button id="btn-join-fisher-${session.id}" style="
              margin-top: 8px;
              width: 100%;
              background: #10b981;
              color: #022c22;
              border: none;
              border-radius: 6px;
              padding: 5px;
              font-size: 11px;
              font-weight: 700;
              cursor: pointer;
            ">
              Falar com Pescador no Chat
            </button>
          ` : ''}
        </div>
      `, { maxWidth: 220 });

      marker.on('popupopen', () => {
        const btn = document.getElementById(`btn-join-fisher-${session.id}`);
        if (btn && onJoinSession) {
          btn.onclick = () => onJoinSession(session);
        }
      });

      marker.addTo(markersGroup);
    });

    // If a coordinate is picked by user, show target marker
    if (pickedLatLng) {
      const pickIcon = L.divIcon({
        className: 'custom-pick-icon',
        html: `
          <div style="
            display: flex;
            align-items: center;
            justify-content: center;
            width: 36px;
            height: 36px;
            background: #ef4444;
            color: white;
            border-radius: 50%;
            border: 3px solid white;
            box-shadow: 0 4px 14px rgba(0,0,0,0.6);
            font-size: 18px;
          ">📍</div>
        `,
        iconSize: [36, 36],
        iconAnchor: [18, 36]
      });

      const pickMarker = L.marker([pickedLatLng.lat, pickedLatLng.lng], {
        icon: pickIcon,
        zIndexOffset: 1000,
      })
        .bindPopup(`
          <div style="font-family: 'Plus Jakarta Sans', system-ui; padding: 6px 4px; color: #f8fafc; text-align: center; min-width: 180px;">
            <div style="font-weight: 800; font-size: 13px; color: #f87171; margin-bottom: 2px;">Coordenada Marcada</div>
            <div style="font-size: 11px; color: #94a3b8; font-family: monospace; margin: 4px 0 8px 0; background: #0f172a; padding: 4px 6px; border-radius: 6px;">
              ${pickedLatLng.lat.toFixed(5)}, ${pickedLatLng.lng.toFixed(5)}
            </div>
            <button id="btn-confirm-picked-pin" style="
              width: 100%;
              background: #10b981;
              color: #022c22;
              border: none;
              border-radius: 8px;
              padding: 8px 12px;
              font-size: 12px;
              font-weight: 800;
              cursor: pointer;
              box-shadow: 0 2px 10px rgba(16, 185, 129, 0.4);
            ">
              Cadastrar Este Ponto
            </button>
          </div>
        `, { maxWidth: 220 })
        .addTo(markersGroup);

      // Auto-open popup on coordinate selection so the user immediately sees the action
      pickMarker.openPopup();

      const attachConfirmHandler = () => {
        const btn = document.getElementById('btn-confirm-picked-pin');
        if (btn) {
          btn.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            onOpenNewSpot(pickedLatLng);
            setIsPickingLocation(false);
          };
        }
      };

      pickMarker.on('popupopen', attachConfirmHandler);
      setTimeout(attachConfirmHandler, 50);

      pickMarker.on('click', () => {
        pickMarker.openPopup();
        setTimeout(attachConfirmHandler, 50);
      });
    }
  }, [spots, activeSessions, selectedSpotId, searchQuery, filterType, pickedLatLng, onSelectSpot, onOpenNewSpot, onJoinSession]);

  return (
    <div className="relative w-full h-full min-h-[500px] flex flex-col rounded-2xl overflow-hidden border border-slate-800 bg-slate-950 shadow-2xl">
      {/* Top Floating Control Bar */}
      <div className="absolute top-2 left-2 right-2 sm:top-4 sm:left-4 sm:right-4 z-20 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
        {/* Search & Filter pills */}
        <div className="flex items-center gap-1.5 pointer-events-auto bg-slate-900/95 backdrop-blur-md border border-slate-800 p-1 sm:p-1.5 rounded-xl shadow-xl max-w-full overflow-hidden">
          <div className="flex items-center gap-1.5 px-2 py-1 text-slate-300">
            <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <input
              type="text"
              placeholder="Buscar ponto, peixe..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent text-[11px] sm:text-xs text-slate-100 placeholder-slate-500 focus:outline-none w-28 sm:w-52"
            />
          </div>

          <div className="h-4 w-px bg-slate-800" />

          {/* Filter tabs */}
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar max-w-[200px] sm:max-w-none">
            <button
              onClick={() => setFilterType('all')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                filterType === 'all' ? 'bg-emerald-500 text-slate-950' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Todos ({spots.length})
            </button>
            <button
              onClick={() => setFilterType('active_only')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
                filterType === 'active_only' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' : 'text-slate-400 hover:text-emerald-400'
              }`}
            >
              <Radio className="w-3 h-3 text-emerald-400" />
              <span>Ao Vivo ({activeSessions.length})</span>
            </button>
            <button
              onClick={() => setFilterType('rio')}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                filterType === 'rio' ? 'bg-slate-800 text-slate-100' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Rios
            </button>
            <button
              onClick={() => setFilterType('represa')}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                filterType === 'represa' ? 'bg-slate-800 text-slate-100' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Represas
            </button>
            <button
              onClick={() => setFilterType('manguezal')}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                filterType === 'manguezal' ? 'bg-slate-800 text-slate-100' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Manguezais
            </button>
          </div>
        </div>

        {/* Right Floating Actions: Layer Selector + GPS Locate + Cadastrar Ponto */}
        <div className="flex items-center gap-2 pointer-events-auto ml-auto">
          {/* Layer Selector */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowLayerMenu(!showLayerMenu)}
              title="Trocar Camada do Mapa"
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900/95 backdrop-blur-md border border-slate-800 text-slate-200 hover:text-white shadow-xl text-xs font-semibold transition-colors"
            >
              <Layers className="w-4 h-4 text-emerald-400" />
              <span className="hidden sm:inline">Camadas</span>
            </button>

            {showLayerMenu && (
              <div className="absolute right-0 mt-2 w-52 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl overflow-hidden z-30 p-1.5 space-y-1">
                {(['osm', 'satellite', 'topo'] as MapLayerType[]).map(key => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => changeTileLayer(key)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium flex items-center justify-between transition-colors ${
                      activeLayer === key ? 'bg-emerald-500/20 text-emerald-300 font-bold' : 'text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <span>{TILE_PROVIDERS[key].label}</span>
                    {activeLayer === key && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* GPS Current Location button */}
          <button
            type="button"
            onClick={handleLocateUser}
            disabled={locatingUser}
            title="Minha Localização GPS Atual"
            className="flex items-center justify-center w-9 h-9 rounded-xl bg-slate-900/95 backdrop-blur-md border border-slate-800 text-slate-200 hover:text-emerald-400 hover:border-emerald-500/40 shadow-xl transition-colors disabled:opacity-50"
          >
            {locatingUser ? (
              <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
            ) : (
              <Navigation className="w-4 h-4" />
            )}
          </button>

          {/* Cadastrar Ponto Novo button */}
          <button
            type="button"
            onClick={() => {
              if (pickedLatLng) {
                onOpenNewSpot(pickedLatLng);
                setIsPickingLocation(false);
              } else if (isPickingLocation) {
                onOpenNewSpot();
                setIsPickingLocation(false);
              } else {
                setIsPickingLocation(true);
              }
            }}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-extrabold shadow-xl transition-all cursor-pointer ${
              pickedLatLng
                ? 'bg-emerald-500 text-slate-950 hover:bg-emerald-400 ring-2 ring-emerald-400/50 shadow-emerald-500/30'
                : isPickingLocation
                ? 'bg-amber-500 text-slate-950 hover:bg-amber-400 ring-2 ring-amber-400/50'
                : 'bg-emerald-500 text-slate-950 hover:bg-emerald-400'
            }`}
          >
            {pickedLatLng ? (
              <>
                <MapPin className="w-4 h-4" />
                <span>Cadastrar Este Ponto</span>
              </>
            ) : isPickingLocation ? (
              <>
                <Compass className="w-4 h-4" />
                <span>Clique no Mapa ou Aqui</span>
              </>
            ) : (
              <>
                <Plus className="w-4 h-4" />
                <span>Cadastrar Ponto Novo</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Picking Location Helper Banner */}
      {isPickingLocation && !pickedLatLng && (
        <div className="absolute top-18 left-1/2 -translate-x-1/2 z-20 bg-slate-900/95 border border-amber-500/50 text-amber-200 text-xs px-4 py-2.5 rounded-xl shadow-2xl flex items-center gap-3">
          <Compass className="w-4 h-4 text-amber-400 shrink-0" />
          <span>Toque no rio, represa ou local exato no mapa para marcar a coordenada geográfica.</span>
          <button
            type="button"
            onClick={() => {
              setIsPickingLocation(false);
            }}
            className="text-slate-400 hover:text-white underline text-[11px] ml-1 cursor-pointer"
          >
            Cancelar
          </button>
        </div>
      )}

      {/* Floating Action Card when a Coordinate is Picked on the Map */}
      {pickedLatLng && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 max-w-[94%] sm:max-w-md w-full bg-slate-900/95 backdrop-blur-md border border-emerald-500/60 rounded-2xl p-3 sm:p-4 shadow-2xl flex items-center justify-between gap-3 animate-in fade-in slide-in-from-bottom-2 duration-200">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center shrink-0 text-emerald-400">
              <MapPin className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-bold text-white truncate">
                Coordenada Marcada
              </div>
              <div className="text-[11px] text-emerald-400 font-mono tabular-nums font-semibold">
                {pickedLatLng.lat.toFixed(5)}, {pickedLatLng.lng.toFixed(5)}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => {
                onOpenNewSpot(pickedLatLng);
                setIsPickingLocation(false);
              }}
              className="min-h-[44px] px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-slate-950 font-black text-xs shadow-lg transition-transform flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>Cadastrar Este Ponto</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setPickedLatLng(null);
                setIsPickingLocation(false);
              }}
              className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
              title="Cancelar marcação"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Active Fishermen Floating Badge */}
      {activeSessions.length > 0 && (
        <div className="absolute bottom-4 left-4 z-20 pointer-events-auto bg-slate-900/95 backdrop-blur-md border border-emerald-500/30 rounded-xl p-3 shadow-2xl max-w-xs text-xs text-slate-200">
          <div className="flex items-center gap-2 text-emerald-400 font-bold mb-1.5">
            <Radio className="w-3.5 h-3.5 animate-pulse" />
            <span>{activeSessions.length} parceiro(s) pescando agora</span>
          </div>
          <div className="space-y-1.5 max-h-32 overflow-y-auto">
            {activeSessions.map(session => (
              <div
                key={session.id}
                onClick={() => {
                  if (mapInstanceRef.current) {
                    mapInstanceRef.current.flyTo([session.latitude, session.longitude], 15);
                  }
                  if (onJoinSession) onJoinSession(session);
                }}
                className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-slate-800 cursor-pointer transition-colors"
              >
                <img
                  src={session.userAvatar}
                  alt={session.userName}
                  className="w-6 h-6 rounded-full object-cover border border-emerald-500 shrink-0"
                />
                <div className="truncate">
                  <div className="font-semibold text-slate-200 text-[11px] truncate">{session.userName}</div>
                  <div className="text-[10px] text-slate-400 truncate">{session.spotName}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State Banner if no spots yet */}
      {spots.length === 0 && (
        <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-20 pointer-events-auto bg-slate-900/95 backdrop-blur-md border border-emerald-500/40 rounded-2xl p-4 shadow-2xl max-w-md text-center text-xs">
          <div className="font-bold text-slate-100 mb-1 flex items-center justify-center gap-1.5 text-sm">
            <MapPin className="w-4 h-4 text-emerald-400" />
            <span>Nenhum ponto cadastrado ainda</span>
          </div>
          <p className="text-slate-300 text-xs mb-3">
            O mapa geográfico está 100% ativo e funcional. Clique em <strong>"Cadastrar Ponto Novo"</strong> para marcar o primeiro ponto de pesca do Barrantuba!
          </p>
          <button
            type="button"
            onClick={() => onOpenNewSpot()}
            className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs shadow-lg transition-transform active:scale-95 inline-flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Cadastrar Primeiro Ponto</span>
          </button>
        </div>
      )}

      {/* Map Canvas */}
      <div ref={mapContainerRef} className="w-full h-full min-h-[550px] flex-1 z-0" />
    </div>
  );
}
