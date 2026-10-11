import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, GeoJSON, Marker, Popup, CircleMarker, Tooltip, useMapEvents, useMap } from 'react-leaflet';
import axios from 'axios';
import { Navigation, ShieldCheck, Zap, Wind, ArrowRightLeft, X } from 'lucide-react';
import L from 'leaflet';
import LocationSearch from './components/LocationSearch';

const DEMO_PRESETS = [
  {
    label: 'Anand Vihar (185) → CP',
    origin: { lat: 28.65, lng: 77.315, name: 'Anand Vihar, Delhi' },
    destination: { lat: 28.6315, lng: 77.2167, name: 'Connaught Place, New Delhi' },
  },
  {
    label: 'Noida Sec 62 (140) → CP',
    origin: { lat: 28.62, lng: 77.363, name: 'Sector 62, Noida' },
    destination: { lat: 28.6315, lng: 77.2167, name: 'Connaught Place, New Delhi' },
  },
  {
    label: 'Anand Vihar (185) → Cyber City',
    origin: { lat: 28.65, lng: 77.315, name: 'Anand Vihar, Delhi' },
    destination: { lat: 28.495, lng: 77.088, name: 'Cyber City, Gurugram' },
  },
];

const getAqiColor = (pm25) => {
  if (pm25 <= 30) return '#22c55e';
  if (pm25 <= 60) return '#eab308';
  if (pm25 <= 90) return '#f97316';
  if (pm25 <= 120) return '#ef4444';
  return '#a855f7';
};

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

function MapFitBounds({ bounds }) {
  const map = useMap();

  useEffect(() => {
    if (bounds) {
      map.flyToBounds(bounds, { padding: [48, 48], duration: 1.2, maxZoom: 12 });
    }
  }, [bounds, map]);

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
  const [mapBounds, setMapBounds] = useState(null);

  const [routes, setRoutes] = useState(null);
  const [vehicleProfile, setVehicleProfile] = useState('carAuto');
  const [sensorNodes, setSensorNodes] = useState([]);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [sensorError, setSensorError] = useState('');
  const [activeRoute, setActiveRoute] = useState('healthiest');
  const [routeKey, setRouteKey] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchSensors = async () => {
      try {
        const response = await axios.get('http://localhost:5001/api/routes/sensors');
        setSensorNodes(response.data);
        setSensorError('');
      } catch (err) {
        console.error('Failed to load AQI sensor readings:', err);
        setSensorError('AQI sensor readings are unavailable.');
      }
    };

    fetchSensors();
    const refreshInterval = window.setInterval(fetchSensors, 60_000);
    return () => window.clearInterval(refreshInterval);
  }, []);

  const requestRoutes = async (origin, destination, profile) => {
    if (!Number.isFinite(origin.lat) || !Number.isFinite(origin.lng) ||
        !Number.isFinite(destination.lat) || !Number.isFinite(destination.lng)) {
      setError('Please select both Origin and Destination.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const response = await axios.get('http://localhost:5001/api/routes', {
        params: {
          startLng: origin.lng,
          startLat: origin.lat,
          endLng: destination.lng,
          endLat: destination.lat,
          originName: origin.name,
          destinationName: destination.name,
          vehicleProfile: profile,
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

  const fetchRoutes = () => requestRoutes(startPos, endPos, vehicleProfile);

  const handlePresetSelect = (preset) => {
    setStartPos(preset.origin);
    setEndPos(preset.destination);
    setMapBounds([
      [preset.origin.lat, preset.origin.lng],
      [preset.destination.lat, preset.destination.lng],
    ]);
    setMapCenter([(preset.origin.lat + preset.destination.lat) / 2, (preset.origin.lng + preset.destination.lng) / 2]);
    setActiveRoute('healthiest');
    setShowHeatmap(true);
    requestRoutes(preset.origin, preset.destination, vehicleProfile);
  };

  const handleVehicleProfileChange = (profile) => {
    setVehicleProfile(profile);
    if (Number.isFinite(startPos.lat) && Number.isFinite(endPos.lat)) {
      requestRoutes(startPos, endPos, profile);
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
  const fastestPm25 = Number(routes?.fastest?.exposureScore ?? routes?.fastest?.avgPm25);
  const healthiestPm25 = Number(routes?.healthiest?.exposureScore ?? routes?.healthiest?.avgPm25);
  const healthiestDuration = Number(routes?.healthiest?.durationMinutes);
  const hasDistinctRoutes =
    routes?.fastest?.geometry?.coordinates &&
    routes?.healthiest?.geometry?.coordinates &&
    JSON.stringify(routes.fastest.geometry.coordinates) !== JSON.stringify(routes.healthiest.geometry.coordinates);
  const healthImpact = hasDistinctRoutes &&
    Number.isFinite(fastestPm25) &&
    fastestPm25 > 0 &&
    Number.isFinite(healthiestPm25) &&
    Number.isFinite(healthiestDuration) &&
    healthiestDuration >= 0
    ? {
        pm25Saved: fastestPm25 - healthiestPm25,
        cleanerAirPercentage: ((fastestPm25 - healthiestPm25) / fastestPm25) * 100,
        cigaretteEquivalent: ((fastestPm25 - healthiestPm25) * (healthiestDuration / 60)) / 22,
      }
    : null;

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

          <div className="mb-3">
            <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">Demo presets · tap to load</p>
            <div className="flex gap-1.5 overflow-x-auto pb-1">
              {DEMO_PRESETS.map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => handlePresetSelect(preset)}
                  disabled={loading}
                  className="shrink-0 rounded-lg border border-slate-700 bg-slate-800/80 px-2.5 py-1.5 text-[10px] font-medium text-slate-300 transition hover:border-emerald-500/60 hover:bg-emerald-950/50 hover:text-emerald-200 disabled:opacity-50"
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          <div className="mb-3">
            <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">Vehicle profile</p>
            <div className="grid grid-cols-2 gap-1 rounded-xl border border-slate-700 bg-slate-950/70 p-1">
              {[
                { id: 'erickshaw', label: 'E-Rickshaw / Bike' },
                { id: 'carAuto', label: 'Car / Auto' },
              ].map((profile) => (
                <button
                  key={profile.id}
                  type="button"
                  onClick={() => handleVehicleProfileChange(profile.id)}
                  aria-pressed={vehicleProfile === profile.id}
                  className={`rounded-lg px-2 py-2 text-[11px] font-semibold transition ${
                    vehicleProfile === profile.id
                      ? 'bg-emerald-500 text-slate-950 shadow'
                      : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'
                  }`}
                >
                  {profile.label}
                </button>
              ))}
            </div>
            {vehicleProfile === 'erickshaw' && (
              <p className="mt-1 text-[10px] text-emerald-300">25 km/h speed cap · increased exposure weighting</p>
            )}
          </div>

          <div className="space-y-2.5 relative">
            <LocationSearch
              placeholder="Choose starting location..."
              value={startPos.name}
              iconColor="text-emerald-400"
              onSelectLocation={(loc) => {
                setStartPos(loc);
                if (Number.isFinite(loc.lat)) {
                  setMapBounds(null);
                  setMapCenter([loc.lat, loc.lng]);
                }
              }}
            />

            <LocationSearch
              placeholder="Choose destination..."
              value={endPos.name}
              iconColor="text-blue-400"
              onSelectLocation={(loc) => {
                setEndPos(loc);
                if (Number.isFinite(loc.lat)) {
                  setMapBounds(null);
                  setMapCenter([loc.lat, loc.lng]);
                }
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

          <button
            type="button"
            onClick={() => setShowHeatmap((visible) => !visible)}
            aria-pressed={showHeatmap}
            className={`mt-2 w-full rounded-xl border px-3 py-2 text-xs font-semibold transition ${
              showHeatmap
                ? 'border-amber-400/60 bg-amber-400/10 text-amber-200'
                : 'border-slate-700 bg-slate-800/70 text-slate-300 hover:border-amber-400/40'
            }`}
          >
            {showHeatmap ? 'Hide' : 'Show'} live AQI heatmap
            {sensorNodes.length > 0 ? ` · ${sensorNodes.length} sensors` : ''}
          </button>
          {sensorError && showHeatmap && (
            <p className="mt-1 text-[10px] text-amber-300">{sensorError}</p>
          )}
          {showHeatmap && sensorNodes.length > 0 && (
            <div className="mt-1 flex flex-wrap gap-x-2 gap-y-1 text-[9px] text-slate-400">
              {[
                ['#22c55e', '≤30 good'],
                ['#eab308', '31–60 moderate'],
                ['#f97316', '61–90 poor'],
                ['#ef4444', '91–120 very poor'],
                ['#a855f7', '>120 severe'],
              ].map(([color, label]) => (
                <span key={label} className="inline-flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
                  {label}
                </span>
              ))}
            </div>
          )}

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
                Exposure: ~{routes.healthiest.exposureScore ?? routes.healthiest.avgPm25} µg/m³
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

          {healthImpact && (
            <div className="rounded-xl border border-emerald-500/30 bg-gradient-to-br from-emerald-950/70 to-slate-900/90 p-3 shadow-inner shadow-emerald-950/40">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-300">
                  Health impact
                </span>
                <span className={`shrink-0 rounded-full border px-2.5 py-1 text-xs font-bold ${
                  healthImpact.pm25Saved < 0
                    ? 'border-amber-400/30 bg-amber-400/15 text-amber-300'
                    : 'border-emerald-400/30 bg-emerald-400/15 text-emerald-300'
                }`}>
                  {Math.abs(healthImpact.cleanerAirPercentage).toFixed(1)}%{' '}
                  {healthImpact.pm25Saved < 0 ? 'more exposure' : 'cleaner air'}
                </span>
              </div>
              <p className="mt-2 text-xs text-emerald-100">
                🫁 {healthImpact.pm25Saved < 0 ? 'Increases' : 'Reduces'} lung exposure by {Math.abs(healthImpact.cleanerAirPercentage).toFixed(1)}%
              </p>
              <p className="mt-1.5 text-xs leading-relaxed text-slate-300">
                🚬 {healthImpact.pm25Saved < 0
                  ? `Equivalent to ~${Math.abs(healthImpact.cigaretteEquivalent).toFixed(2)} cigarettes of additional pollution exposure on this commute.`
                  : `Equivalent to avoiding ~${healthImpact.cigaretteEquivalent.toFixed(2)} cigarettes of pollution exposure on this commute.`}
              </p>
            </div>
          )}

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
                Exposure: ~{routes.fastest.exposureScore ?? routes.fastest.avgPm25} µg/m³
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

          <MapRecenter center={mapBounds ? null : mapCenter} />
          <MapFitBounds bounds={mapBounds} />
          <MapClickHandler
            enabled={!Number.isFinite(startPos.lat) || !Number.isFinite(endPos.lat)}
            onLocationSelect={handleMapClick}
          />

          {showHeatmap && sensorNodes.map((sensor) => {
            const [lng, lat] = sensor.location.coordinates;
            const color = getAqiColor(sensor.pm25);

            return (
              <CircleMarker
                key={sensor.stationId}
                center={[lat, lng]}
                radius={Math.min(30, 10 + sensor.pm25 / 12)}
                pathOptions={{
                  color,
                  fillColor: color,
                  fillOpacity: 0.45,
                  opacity: 0.8,
                  weight: 2,
                }}
              >
                <Tooltip>
                  <strong>{sensor.name}</strong>
                  <br />
                  PM2.5: {sensor.pm25} µg/m³
                  <br />
                  Updated: {sensor.lastUpdated ? new Date(sensor.lastUpdated).toLocaleString() : 'unknown'}
                </Tooltip>
              </CircleMarker>
            );
          })}

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
