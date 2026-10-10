import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Search, MapPin, Loader2, X } from 'lucide-react';

export default function LocationSearch({ placeholder, onSelectLocation, value, iconColor = 'text-slate-400' }) {
  const [query, setQuery] = useState(value || '');
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    setQuery(value || '');
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (!query || query.trim().length < 3) {
        setSuggestions([]);
        return;
      }

      setLoading(true);
      try {
        const response = await axios.get('https://nominatim.openstreetmap.org/search', {
          params: {
            q: query,
            format: 'json',
            addressdetails: 1,
            limit: 5,
            countrycodes: 'in',
          },
          headers: { 'User-Agent': 'BreatheRouteApp/1.0' },
        });
        setSuggestions(response.data);
        setIsOpen(true);
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        setLoading(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [query]);

  const handleSelect = (item) => {
    const lat = parseFloat(item.lat);
    const lng = parseFloat(item.lon);
    const shortName = item.display_name.split(',')[0];

    setQuery(shortName);
    setIsOpen(false);
    onSelectLocation({ lat, lng, name: shortName, fullName: item.display_name });
  };

  const handleClear = () => {
    setQuery('');
    setSuggestions([]);
    setIsOpen(false);
    onSelectLocation({ lat: null, lng: null, name: '' });
  };

  return (
    <div className="relative w-full" ref={dropdownRef}>
      <div className="relative flex items-center">
        <MapPin className={`w-4 h-4 absolute left-3 z-10 ${iconColor}`} />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          className="w-full bg-slate-900/95 backdrop-blur-md border border-slate-700 focus:border-emerald-500 text-slate-100 text-sm rounded-xl pl-9 pr-8 py-2.5 outline-none shadow-lg transition"
        />
        {loading ? (
          <Loader2 className="w-4 h-4 text-emerald-400 animate-spin absolute right-3 z-10" />
        ) : query ? (
          <button type="button" onClick={handleClear} className="absolute right-3 z-10 text-slate-400 hover:text-slate-100 transition">
            <X className="w-4 h-4" />
          </button>
        ) : null}
      </div>

      {isOpen && suggestions.length > 0 && (
        <ul className="absolute z-50 w-full mt-1 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl max-h-60 overflow-y-auto divide-y divide-slate-800 backdrop-blur-md">
          {suggestions.map((item) => (
            <li
              key={item.place_id}
              onClick={() => handleSelect(item)}
              className="px-3 py-2.5 hover:bg-slate-800 cursor-pointer text-xs transition flex items-start gap-2.5"
            >
              <Search className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-slate-100">{item.display_name.split(',')[0]}</p>
                <p className="text-[10px] text-slate-400 truncate max-w-[240px]">{item.display_name}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
