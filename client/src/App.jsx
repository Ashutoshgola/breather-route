import React, { useState } from 'react';
import { MapContainer, TileLayer, GeoJSON, Marker, Popup, useMapEvents, useMap } from 'react-leaflet';
import axios from 'axios';
import { Navigation, ShieldCheck, Zap, Wind, ArrowRightLeft, X } from 'lucide-react';
import L from 'leaflet';
import LocationSearch from './components/LocationSearch';

// Leaflet default marker icons fix
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

function MapRecenter({ center }) {
  const map = useMap();
  if (center && center[0] && center[1]) {
    map.flyTo(center, 12, { duration: 1.2 });
  }
  return null;
}

function MapClickHandler({ onLocationSelect }) {
  useMapEvents({
    click(e) {
      onLocationSelect(e.latlng);
    },
  });
  return null;
}

export default function App() {
  const [startPos, setStartPos] = useState({ lat: 28.6315, lng: 77.2167, name: 'Connaught Place, New Delhi' });
  const [endPos, setEndPos] = useState({ lat: 28.4744, lng: 77.4831, name: 'Sharda University, Greater Noida' });
  const [mapCenter, setMapCenter] = useState([28.6315, 77.2167]);
  const [clickTarget, setClickTarget] = useState('start');

  const [routes, setRoutes] = useState(null);
  const [routeKey, setRouteKey] = useState(0); // Unique key forces Leaflet to clear old polylines
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchRoutes = async () => {
    if (!startPos.lat || !endPos.lat) {
      setError('Please select both Origin and Destination locations.');
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
      setRouteKey(Date.now()); // Reset key to force re-render clean polylines
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
    if (clickTarget === 'start') {
      setStartPos({ lat: latlng.lat, lng: latlng.lng, name });
      setClickTarget('end');
    } else {
      setEndPos({ lat: latlng.lat, lng: latlng.lng, name });
    }
  };

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-slate-950 font-sans">
      {/* Floating Google Maps Overlay Panel */}
      <div className="google-maps-card absolute top-4 left-4 z-[1000] w-96 flex flex-col gap-3">
        <div className="bg-slate-900/95 backdrop-blur-xl border border-slate-700/80 p-4 rounded-2xl shadow-2xl text-slate-100">
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
                if (loc.lat) setMapCenter([loc.lat, loc.lng]);
              }}
            />

            <LocationSearch
              placeholder="Choose destination..."
              value={endPos.name}
              iconColor="text-blue-400"
              onSelectLocation={(loc) => {
                setEndPos(loc);
                if (loc.lat) setMapCenter([loc.lat, loc.lng]);
              }}
            />

            <button
              onClick={handleSwap}
              type="button"
              title="Swap Start and Destination"
              className="absolute right-2 top-[20px] bg-slate-800 hover:bg-slate-700 p-1.5 rounded-full text-slate-300 border border-slate-600 shadow-md transition"
            >
              <ArrowRightLeft className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex gap-2 mt-3">
            <button
              onClick={fetchRoutes}
              disabled={loading}
              className="flex-1 py-2.5 bg-emerald-500 hover:bg-emerald-600 active:scale-[0.98] font-semibold rounded-xl text-slate-950 text-sm transition flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20"
            >
              <Navigation className="w-4 h-4 fill-slate-950" />
              {loading ? 'Finding Clean Routes...' : 'Calculate Routes'}
            </button>

            {routes && (
              <button
                onClick={handleClearRoutes}
                title="Clear Active Routes"
                className="p-2.5 bg-slate-800 hover:bg-rose-950/60 text-slate-400 hover:text-rose-400 rounded-xl border border-slate-700 hover:border-rose-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>

          {error && <p className="mt-2 text-xs text-rose-400 bg-rose-950/50 p-2.5 rounded-xl border border-rose-800/60">{error}</p>}
        </div>

        {/* Evaluated Route Cards Overlay */}
        {routes && (
          <div className="bg-slate-900/95 backdrop-blur-xl border border-slate-700/80 p-4 rounded-2xl shadow-2xl space-y-3 max-h-80 overflow-y-auto">
            <div className="flex justify-between items-center">
              <h2 className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Route Alternatives</h2>
              <button onClick={handleClearRoutes} className="text-[11px] text-slate-400 hover:text-slate-200 underline">Clear</button>
            </div>

            {/* Healthiest Choice */}
            <div className="p-3 bg-emerald-950/40 border border-emerald-500/50 rounded-xl">
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4" /> Healthiest Route
                </span>
                <span className="text-xs font-mono bg-emerald-900/60 text-emerald-200 px-2 py-0.5 rounded-md border border-emerald-700/50">
                  PM2.5: ~{routes.healthiest.avgPm25} µg/m³
                </span>
              </div>
              <div className="text-xs text-slate-300 flex justify-between mt-2">
                <span>⏱️ {routes.healthiest.durationMinutes} mins</span>
                <span>📏 {routes.healthiest.distanceKm} km</span>
              </div>
            </div>

            {/* Fastest Choice */}
            <div className="p-3 bg-blue-950/40 border border-blue-500/50 rounded-xl">
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs font-bold text-blue-400 flex items-center gap-1.5">
                  <Zap className="w-4 h-4" /> Fastest Route
                </span>
                <span className="text-xs font-mono bg-blue-900/60 text-blue-200 px-2 py-0.5 rounded-md border border-blue-700/50">
                  PM2.5: ~{routes.fastest.avgPm25} µg/m³
                </span>
              </div>
              <div className="text-xs text-slate-300 flex justify-between mt-2">
                <span>⏱️ {routes.fastest.durationMinutes} mins</span>
                <span>📏 {routes.fastest.distanceKm} km</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Full Screen Interactive Map */}
      <div className="h-full w-full">
        <MapContainer center={mapCenter} zoom={12} className="h-full w-full" zoomControl={false}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          <MapRecenter center={mapCenter} />
          <MapClickHandler onLocationSelect={handleMapClick} />

          {startPos.lat && (
            <Marker position={[startPos.lat, startPos.lng]}>
              <Popup>{startPos.name || 'Origin'}</Popup>
            </Marker>
          )}

          {endPos.lat && (
            <Marker position={[endPos.lat, endPos.lng]}>
              <Popup>{endPos.name || 'Destination'}</Popup>
            </Marker>
          )}

          {/* Render Route Geometries with Key to force clean redraws */}
          {routes && (
            <React.Fragment key={routeKey}>
              {/* Fastest Route Line (Blue) */}
              {routes.fastest?.geometry && (
                <GeoJSON
                  data={routes.fastest.geometry}
                  style={{ color: '#3b82f6', weight: 5, opacity: 0.8 }}
                />
              )}
              {/* Healthiest Route Line (Green) */}
              {routes.healthiest?.geometry && (
                <GeoJSON
                  data={routes.healthiest.geometry}
                  style={{ color: '#10b981', weight: 6, opacity: 0.9 }}
                />
              )}
            </React.Fragment>
          )}
        </MapContainer>
      </div>
    </div>
  );
}
