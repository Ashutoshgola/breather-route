import { useState } from 'react';
import { MapContainer, TileLayer, GeoJSON, Marker, Popup, useMapEvents } from 'react-leaflet';
import axios from 'axios';
import { Navigation, ShieldCheck, Zap, Wind } from 'lucide-react';
import L from 'leaflet';

// Fix for default Leaflet marker icon paths in React
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png'; 
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
});

function MapClickHandler({ onLocationSelect }) {
  useMapEvents({
    click(e) {
      onLocationSelect(e.latlng);
    },
  });
  return null;
}

export default function App() {
  const [startPos, setStartPos] = useState({ lat: 28.63, lng: 77.219 }); // Connaught Place
  const [endPos, setEndPos] = useState({ lat: 28.62, lng: 77.363 });   // Noida Sec 62
  const [selectionMode, setSelectionMode] = useState('start'); // 'start' | 'end'
  
  const [routes, setRoutes] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchRoutes = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await axios.get('http://localhost:5001/api/routes', {
        params: {
          startLng: startPos.lng,
          startLat: startPos.lat,
          endLng: endPos.lng,
          endLat: endPos.lat,
        },
      });
      setRoutes(response.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to calculate routes.');
    } finally {
      setLoading(false);
    }
  };

  const handleMapClick = (latlng) => {
    if (selectionMode === 'start') {
      setStartPos({ lat: latlng.lat, lng: latlng.lng });
      setSelectionMode('end');
    } else {
      setEndPos({ lat: latlng.lat, lng: latlng.lng });
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-900 text-slate-100 font-sans">
      {/* Sidebar Panel */}
      <div className="w-96 bg-slate-800 border-r border-slate-700 p-5 flex flex-col justify-between shadow-xl z-10">
        <div>
          <div className="flex items-center gap-2 mb-6">
            <Wind className="text-emerald-400 w-8 h-8" />
            <h1 className="text-2xl font-bold tracking-wide">BreatheRoute</h1>
          </div>

          <p className="text-xs text-slate-400 mb-4">
            Click on the map to set your origin and destination to compare clean-air routes.
          </p>

          <div className="space-y-4">
            <div className={`p-3 rounded-lg border ${selectionMode === 'start' ? 'border-emerald-500 bg-slate-700/50' : 'border-slate-700'}`}>
              <label className="text-xs text-slate-400 block mb-1">Origin Coordinates</label>
              <div className="text-sm font-mono flex justify-between">
                <span>Lat: {startPos.lat.toFixed(4)}</span>
                <span>Lng: {startPos.lng.toFixed(4)}</span>
              </div>
              <button 
                onClick={() => setSelectionMode('start')}
                className="mt-2 text-xs bg-slate-700 hover:bg-slate-600 px-2 py-1 rounded text-emerald-400"
              >
                {selectionMode === 'start' ? 'Click on Map to Set Origin' : 'Change Origin'}
              </button>
            </div>

            <div className={`p-3 rounded-lg border ${selectionMode === 'end' ? 'border-emerald-500 bg-slate-700/50' : 'border-slate-700'}`}>
              <label className="text-xs text-slate-400 block mb-1">Destination Coordinates</label>
              <div className="text-sm font-mono flex justify-between">
                <span>Lat: {endPos.lat.toFixed(4)}</span>
                <span>Lng: {endPos.lng.toFixed(4)}</span>
              </div>
              <button 
                onClick={() => setSelectionMode('end')}
                className="mt-2 text-xs bg-slate-700 hover:bg-slate-600 px-2 py-1 rounded text-emerald-400"
              >
                {selectionMode === 'end' ? 'Click on Map to Set Destination' : 'Change Destination'}
              </button>
            </div>

            <button
              onClick={fetchRoutes}
              disabled={loading}
              className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 font-semibold rounded-lg text-slate-900 transition flex items-center justify-center gap-2"
            >
              <Navigation className="w-4 h-4" />
              {loading ? 'Calculating Routes...' : 'Calculate Routes'}
            </button>

            {error && <p className="text-xs text-rose-400 bg-rose-950/50 p-2 rounded">{error}</p>}
          </div>

          {/* Dual Route Cards Comparison */}
          {routes && (
            <div className="mt-6 space-y-3">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Route Alternatives</h2>

              {/* Healthiest Route Card */}
              <div className="p-3 bg-emerald-950/40 border border-emerald-500/50 rounded-lg">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                    <ShieldCheck className="w-4 h-4" /> Healthiest Route
                  </span>
                  <span className="text-xs font-mono bg-emerald-900/60 text-emerald-200 px-2 py-0.5 rounded">
                    PM2.5: ~{routes.healthiest.avgPm25} µg/m³
                  </span>
                </div>
                <div className="text-sm text-slate-300 flex justify-between mt-2">
                  <span>⏱️ {routes.healthiest.durationMinutes} mins</span>
                  <span>📏 {routes.healthiest.distanceKm} km</span>
                </div>
              </div>

              {/* Fastest Route Card */}
              <div className="p-3 bg-blue-950/40 border border-blue-500/50 rounded-lg">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs font-bold text-blue-400 flex items-center gap-1">
                    <Zap className="w-4 h-4" /> Fastest Route
                  </span>
                  <span className="text-xs font-mono bg-blue-900/60 text-blue-200 px-2 py-0.5 rounded">
                    PM2.5: ~{routes.fastest.avgPm25} µg/m³
                  </span>
                </div>
                <div className="text-sm text-slate-300 flex justify-between mt-2">
                  <span>⏱️ {routes.fastest.durationMinutes} mins</span>
                  <span>📏 {routes.fastest.distanceKm} km</span>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="text-xs text-slate-500 text-center">
          BreatheRoute MERN Stack • Delhi-NCR Air Quality Demo
        </div>
      </div>

      {/* Leaflet Map Area */}
      <div className="flex-1 h-full relative">
        <MapContainer center={[28.63, 77.25]} zoom={12} className="h-full w-full">
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          <MapClickHandler onLocationSelect={handleMapClick} />

          {/* Start & End Markers */}
          <Marker position={[startPos.lat, startPos.lng]}>
            <Popup>Origin</Popup>
          </Marker>
          <Marker position={[endPos.lat, endPos.lng]}>
            <Popup>Destination</Popup>
          </Marker>

          {/* Render Route Geometries */}
          {routes && (
            <>
              {/* Fastest Route Line (Blue) */}
              <GeoJSON
                key={`fastest-${routes.fastest.id}`}
                data={routes.fastest.geometry}
                style={{ color: '#3b82f6', weight: 5, opacity: 0.7 }}
              />

              {/* Healthiest Route Line (Green) */}
              <GeoJSON
                key={`healthiest-${routes.healthiest.id}`}
                data={routes.healthiest.geometry}
                style={{ color: '#10b981', weight: 6, opacity: 0.9 }}
              />
            </>
          )}
        </MapContainer>
      </div>
    </div>
  );
}