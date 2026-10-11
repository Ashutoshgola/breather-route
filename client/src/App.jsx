import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, GeoJSON, Marker, Popup, useMapEvents, useMap } from 'react-leaflet';
import axios from 'axios';
import { Navigation, ShieldCheck, Zap, Wind, ArrowRightLeft, X } from 'lucide-react';
import L from 'leaflet';
import LocationSearch from './components/LocationSearch';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

function MapRecenter({ center }) {
  const map = useMap();

  useEffect(() => {
    if (center && center.every(Number.isFinite)) {
      map.flyTo(center, 12, { duration: 1.2 });
    }
  }, [center, map]);

  return null;
}

function MapClickHandler({ enabled, onLocationSelect }) {
  useMapEvents({
    click(e) {
      if (enabled) onLocationSelect(e.latlng);
    },
  });
  return null;
}

export default function App() {
  const [startPos, setStartPos] = useState({ lat: 28.6315, lng: 77.2167, name: 'Connaught Place, New Delhi' });
  const [endPos, setEndPos] = useState({ lat: 28.4744, lng: 77.4831, name: 'Sharda University, Greater Noida' });
  const [mapCenter, setMapCenter] = useState([28.6315, 77.2167]);

  const [routes, setRoutes] = useState(null);
  const [activeRoute, setActiveRoute] = useState('healthiest');
  const [routeKey, setRouteKey] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchRoutes = async () => {
    if (!Number.isFinite(startPos.lat) || !Number.isFinite(endPos.lat)) {
      setError('Please select both Origin and Destination.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const response = await axios.get('http://localhost:5001/api/routes', {
        params: {
          startLng: startPos.lng,
          startLat: startPos.lat,
          endLng: endPos.lng,
          endLat: endPos.lat,
          originName: startPos.name,
          destinationName: endPos.name,
        },
      });
      setRoutes(response.data);
      setRouteKey(Date.now());
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to calculate routes.');
    } finally {
      setLoading(false);
    }
  };

  const handleClearRoutes = () => {
    setRoutes(null);
    setError('');
  };

  const handleSwap = () => {
    const temp = startPos;
    setStartPos(endPos);
    setEndPos(temp);
  };

  const handleMapClick = (latlng) => {
    const name = `Point (${latlng.lat.toFixed(3)}, ${latlng.lng.toFixed(3)})`;
    if (!Number.isFinite(startPos.lat)) {
      setStartPos({ lat: latlng.lat, lng: latlng.lng, name });
    } else if (!Number.isFinite(endPos.lat)) {
      setEndPos({ lat: latlng.lat, lng: latlng.lng, name });
    }
  };

  const routesToRender = routes
    ? [
        { key: 'fastest', route: routes.fastest, color: '#3b82f6' },
        { key: 'healthiest', route: routes.healthiest, color: '#10b981' },
      ]
        .filter(({ route }) => route?.geometry)
        .sort((first, second) => Number(first.key === activeRoute) - Number(second.key === activeRoute))
    : [];

  return (
    <div className="relative w-screen h-screen flex overflow-hidden bg-slate-950 text-slate-100 font-sans">
      {/* Floating Google Maps Overlay Panel */}
      <div className="absolute top-4 left-4 z-[1000] flex max-h-[calc(100vh-2rem)] w-[min(24rem,calc(100vw-2rem))] flex-col gap-3 overflow-y-auto pointer-events-auto">
        <div className="bg-slate-900/95 backdrop-blur-xl border border-slate-700 p-4 rounded-2xl shadow-2xl">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Wind className="text-emerald-400 w-6 h-6" />
              <h1 className="text-lg font-bold tracking-wide text-white">BreatheRoute</h1>
            </div>
            <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-2.5 py-1 rounded-full border border-emerald-500/20 font-medium">
              Delhi-NCR
            </span>
          </div>

          <div className="space-y-2.5 relative">
            <LocationSearch
              placeholder="Choose starting location..."
              value={startPos.name}
              iconColor="text-emerald-400"
              onSelectLocation={(loc) => {
                setStartPos(loc);
                if (Number.isFinite(loc.lat)) setMapCenter([loc.lat, loc.lng]);
              }}
            />

            <LocationSearch
              placeholder="Choose destination..."
              value={endPos.name}
              iconColor="text-blue-400"
              onSelectLocation={(loc) => {
                setEndPos(loc);
                if (Number.isFinite(loc.lat)) setMapCenter([loc.lat, loc.lng]);
              }}
            />

            <button
              onClick={handleSwap}
              type="button"
              title="Swap Start and Destination"
              className="absolute right-2 top-[20px] bg-slate-800 hover:bg-slate-700 p-1.5 rounded-full text-slate-300 border border-slate-600 shadow-md transition z-20"
            >
              <ArrowRightLeft className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex gap-2 mt-3">
            <button
              onClick={fetchRoutes}
              disabled={loading}
              className="flex-1 py-2.5 bg-emerald-500 hover:bg-emerald-600 font-semibold rounded-xl text-slate-950 text-sm transition flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20"
            >
              <Navigation className="w-4 h-4 fill-slate-950" />
              {loading ? 'Finding Routes...' : 'Calculate Routes'}
            </button>

            {routes && (
              <button
                onClick={handleClearRoutes}
                className="p-2.5 bg-slate-800 hover:bg-rose-950 text-slate-400 hover:text-rose-400 rounded-xl border border-slate-700 transition"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>

          {error && <p className="mt-2 text-xs text-rose-400 bg-rose-950/50 p-2.5 rounded-xl border border-rose-800">{error}</p>}
        </div>

        {routes && (
          <div className="bg-slate-900/95 backdrop-blur-xl border border-slate-700 p-4 rounded-2xl shadow-2xl space-y-3 max-h-80 overflow-y-auto">
            <h2 className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Route Alternatives</h2>

          <button
            type="button"
            onClick={() => setActiveRoute('healthiest')}
            aria-pressed={activeRoute === 'healthiest'}
            className={`w-full text-left p-3 border rounded-xl transition ${
              activeRoute === 'healthiest'
                ? 'bg-emerald-950/60 border-emerald-400'
                : 'bg-emerald-950/30 border-emerald-500/30 hover:border-emerald-500/60'
            }`}
          >
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4" /> Healthiest Route
              </span>
              <span className="text-xs font-mono bg-emerald-900/60 text-emerald-200 px-2 py-0.5 rounded-md">
                PM2.5: ~{routes.healthiest.avgPm25} µg/m³
              </span>
            </div>
            <div className="text-xs text-slate-300 flex justify-between mt-2">
              <span>⏱️ {routes.healthiest.durationMinutes} mins</span>
              <span>📏 {routes.healthiest.distanceKm} km</span>
            </div>
            {routes.healthiest.isGeneratedAlternative && (
              <span className="mt-2 block text-[10px] text-amber-300">
                Generated alternative — OSRM did not return another road route
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveRoute('fastest')}
            aria-pressed={activeRoute === 'fastest'}
            className={`w-full text-left p-3 border rounded-xl transition ${
              activeRoute === 'fastest'
                ? 'bg-blue-950/60 border-blue-400'
                : 'bg-blue-950/30 border-blue-500/30 hover:border-blue-500/60'
            }`}
          >
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs font-bold text-blue-400 flex items-center gap-1.5">
                <Zap className="w-4 h-4" /> Fastest Route
              </span>
              <span className="text-xs font-mono bg-blue-900/60 text-blue-200 px-2 py-0.5 rounded-md">
                PM2.5: ~{routes.fastest.avgPm25} µg/m³
              </span>
            </div>
            <div className="text-xs text-slate-300 flex justify-between mt-2">
              <span>⏱️ {routes.fastest.durationMinutes} mins</span>
              <span>📏 {routes.fastest.distanceKm} km</span>
            </div>
            {routes.fastest.isGeneratedAlternative && (
              <span className="mt-2 block text-[10px] text-amber-300">
                Generated alternative — OSRM did not return another road route
              </span>
            )}
          </button>
        </div>
        )}
      </div>
            {/* Leaflet Map Fullscreen Canvas */}
      <div className="absolute inset-0 z-0 h-full w-full">
              <MapContainer center={mapCenter} zoom={12} style={{ width: '100%', height: '100vh' }} zoomControl={false}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          <MapRecenter center={mapCenter} />
          <MapClickHandler
            enabled={!Number.isFinite(startPos.lat) || !Number.isFinite(endPos.lat)}
            onLocationSelect={handleMapClick}
          />

          {Number.isFinite(startPos.lat) && (
            <Marker position={[startPos.lat, startPos.lng]}>
              <Popup>{startPos.name}</Popup>
            </Marker>
          )}

          {Number.isFinite(endPos.lat) && (
            <Marker position={[endPos.lat, endPos.lng]}>
              <Popup>{endPos.name}</Popup>
            </Marker>
          )}

            {routesToRender.map(({ key, route, color }) => (
              <GeoJSON
                key={`${routeKey}-${route.id}-${key}`}
                data={route.geometry}
                style={{
                  color,
                  weight: activeRoute === key ? 7 : 4,
                  opacity: activeRoute === key ? 0.95 : 0.45,
                }}
              />
            ))}
        </MapContainer>
      </div>
    </div>
  );
}
