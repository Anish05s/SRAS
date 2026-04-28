import { useEffect, useRef, useState, useMemo } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { getMapPinColor, TYPE_ICONS, getSeverityColor } from '../lib/priorityUtils';

/**
 * MapView — Interactive Leaflet map with real OpenStreetMap tiles
 * Shows actual streets, roads, buildings for any city/country.
 * Features: search bar, request pins, provider markers, heatmap-style effects.
 */

// Fix Leaflet default icon issue (missing marker icons in bundlers)
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// ─── Custom marker icon creator ─────────────────────
function createRequestIcon(severity, type) {
  const color = getMapPinColor(severity);
  const isCritical = severity >= 8;
  const size = isCritical ? 18 : 14;
  const pulseSize = isCritical ? 36 : 0;

  return L.divIcon({
    className: 'custom-map-marker',
    html: `
      <div style="position:relative;display:flex;align-items:center;justify-content:center;">
        ${isCritical ? `<div style="
          position:absolute;
          width:${pulseSize}px;height:${pulseSize}px;
          border-radius:50%;
          background:${color}30;
          animation:mapPulse 2s ease infinite;
        "></div>` : ''}
        <div style="
          width:${size}px;height:${size}px;
          background:${color};
          border:2.5px solid white;
          border-radius:50%;
          box-shadow:0 2px 8px ${color}80, 0 0 20px ${color}40;
          position:relative;
          z-index:2;
          display:flex;align-items:center;justify-content:center;
          font-size:8px;
          cursor:pointer;
        "></div>
      </div>
    `,
    iconSize: [isCritical ? pulseSize : size, isCritical ? pulseSize : size],
    iconAnchor: [isCritical ? pulseSize / 2 : size / 2, isCritical ? pulseSize / 2 : size / 2],
    popupAnchor: [0, -(isCritical ? pulseSize / 2 : size / 2)],
  });
}

function createProviderIcon(status) {
  const color = status === 'available' ? '#3b82f6' : '#64748b';
  return L.divIcon({
    className: 'custom-map-marker',
    html: `
      <div style="
        width:14px;height:14px;
        background:${color};
        border:2.5px solid white;
        border-radius:3px;
        transform:rotate(45deg);
        box-shadow:0 2px 8px ${color}80;
        cursor:pointer;
      "></div>
    `,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
    popupAnchor: [0, -10],
  });
}

// ─── Tile layer options ─────────────────────────────
const TILE_LAYERS = {
  dark: {
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>',
    name: '🌑 Dark',
  },
  streets: {
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    name: '🗺️ Streets',
  },
  satellite: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: '&copy; Esri',
    name: '🛰️ Satellite',
  },
  topo: {
    url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://opentopomap.org">OpenTopoMap</a>',
    name: '🏔️ Terrain',
  },
};

export default function MapView({ requests = [], providers = [], onSelectRequest }) {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const markersLayerRef = useRef(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState(null);
  const [currentTile, setCurrentTile] = useState('dark');
  const tileLayerRef = useRef(null);

  // Calculate center from data points
  const mapCenter = useMemo(() => {
    const allLats = [
      ...requests.map(r => r.location?.lat).filter(Boolean),
      ...providers.map(p => p.location?.lat).filter(Boolean),
    ];
    const allLngs = [
      ...requests.map(r => r.location?.lng).filter(Boolean),
      ...providers.map(p => p.location?.lng).filter(Boolean),
    ];
    if (allLats.length > 0) {
      return [
        allLats.reduce((s, v) => s + v, 0) / allLats.length,
        allLngs.reduce((s, v) => s + v, 0) / allLngs.length,
      ];
    }
    return [12.9716, 77.5946]; // Default: Bangalore
  }, [requests, providers]);

  // ─── Initialize map ───────────────────────────────
  useEffect(() => {
    if (mapRef.current) return; // Already initialized

    const map = L.map(mapContainerRef.current, {
      center: mapCenter,
      zoom: 13,
      zoomControl: false,
      attributionControl: true,
    });

    // Add zoom control to bottom-right
    L.control.zoom({ position: 'bottomright' }).addTo(map);

    // Add dark tile layer
    const tile = TILE_LAYERS[currentTile];
    tileLayerRef.current = L.tileLayer(tile.url, {
      attribution: tile.attribution,
      maxZoom: 19,
    }).addTo(map);

    // Create markers layer group
    markersLayerRef.current = L.layerGroup().addTo(map);

    mapRef.current = map;

    // Cleanup
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Switch tile layers ───────────────────────────
  useEffect(() => {
    if (!mapRef.current || !tileLayerRef.current) return;
    const tile = TILE_LAYERS[currentTile];
    tileLayerRef.current.setUrl(tile.url);
  }, [currentTile]);

  // ─── Update markers when data changes ─────────────
  useEffect(() => {
    if (!mapRef.current || !markersLayerRef.current) return;

    // Clear existing markers
    markersLayerRef.current.clearLayers();

    // Add request markers
    requests.forEach((req) => {
      if (!req.location?.lat || !req.location?.lng) return;

      const icon = createRequestIcon(req.severity, req.type);
      const marker = L.marker([req.location.lat, req.location.lng], { icon });

      // Build popup content
      const sevColor = getSeverityColor(req.severity);
      const typeIcon = TYPE_ICONS[req.type] || '📦';
      marker.bindPopup(`
        <div style="font-family:Inter,sans-serif;min-width:200px;font-size:13px;line-height:1.5;">
          <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px;">
            <span style="font-size:18px;">${typeIcon}</span>
            <strong style="text-transform:capitalize;">${req.type}</strong>
            <span style="
              padding:2px 8px;border-radius:9999px;font-size:11px;font-weight:600;
              background:${sevColor}20;color:${sevColor};
            ">Sev ${req.severity}/10</span>
          </div>
          <div style="color:#374151;margin-bottom:4px;">${req.description?.substring(0, 100) || 'No description'}${req.description?.length > 100 ? '...' : ''}</div>
          <div style="display:flex;gap:8px;font-size:11px;color:#6b7280;">
            <span>📍 ${req.location.lat.toFixed(4)}, ${req.location.lng.toFixed(4)}</span>
          </div>
          ${req.priority_score ? `<div style="margin-top:4px;font-size:11px;color:#6b7280;">Score: <strong style="color:${sevColor}">${req.priority_score.toFixed(1)}</strong></div>` : ''}
          <div style="margin-top:4px;font-size:11px;padding:2px 6px;border-radius:4px;display:inline-block;background:#f3f4f6;color:#374151;font-weight:500;">${req.status || 'pending'}</div>
        </div>
      `, {
        className: 'sras-popup',
        maxWidth: 280,
      });

      marker.on('click', () => {
        onSelectRequest?.(req);
      });

      markersLayerRef.current.addLayer(marker);
    });

    // Add provider markers
    providers.forEach((prov) => {
      if (!prov.location?.lat || !prov.location?.lng) return;

      const icon = createProviderIcon(prov.status);
      const marker = L.marker([prov.location.lat, prov.location.lng], { icon });

      marker.bindPopup(`
        <div style="font-family:Inter,sans-serif;min-width:180px;font-size:13px;line-height:1.5;">
          <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px;">
            <span style="font-size:16px;">🤝</span>
            <strong>${prov.name}</strong>
          </div>
          ${prov.organization ? `<div style="color:#6b7280;font-size:12px;">${prov.organization}</div>` : ''}
          <div style="margin-top:4px;font-size:11px;">
            <span style="
              padding:2px 8px;border-radius:9999px;font-size:11px;font-weight:600;
              background:${prov.status === 'available' ? '#dbeafe' : '#f1f5f9'};
              color:${prov.status === 'available' ? '#2563eb' : '#64748b'};
            ">${prov.status}</span>
          </div>
          ${prov.capability_types ? `<div style="margin-top:4px;font-size:11px;color:#6b7280;">Capabilities: ${prov.capability_types.join(', ')}</div>` : ''}
        </div>
      `, {
        className: 'sras-popup',
        maxWidth: 250,
      });

      markersLayerRef.current.addLayer(marker);
    });

    // Fit bounds if we have data
    if (requests.length > 0 || providers.length > 0) {
      const allPoints = [
        ...requests.filter(r => r.location?.lat).map(r => [r.location.lat, r.location.lng]),
        ...providers.filter(p => p.location?.lat).map(p => [p.location.lat, p.location.lng]),
      ];
      if (allPoints.length > 1) {
        mapRef.current.fitBounds(allPoints, { padding: [40, 40], maxZoom: 15 });
      } else if (allPoints.length === 1) {
        mapRef.current.setView(allPoints[0], 14);
      }
    }
  }, [requests, providers, onSelectRequest]);

  // ─── Search location (Nominatim — free geocoding) ─
  const handleSearch = async (e) => {
    e?.preventDefault();
    if (!searchQuery.trim()) return;

    setSearching(true);
    setSearchError(null);

    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=1`;
      const res = await fetch(url, {
        headers: { 'Accept-Language': 'en' },
      });
      const data = await res.json();

      if (data.length > 0) {
        const { lat, lon, display_name, boundingbox } = data[0];
        if (boundingbox) {
          mapRef.current.fitBounds([
            [parseFloat(boundingbox[0]), parseFloat(boundingbox[2])],
            [parseFloat(boundingbox[1]), parseFloat(boundingbox[3])],
          ]);
        } else {
          mapRef.current.setView([parseFloat(lat), parseFloat(lon)], 13);
        }
        setSearchQuery(display_name.split(',').slice(0, 2).join(','));
      } else {
        setSearchError('Location not found');
      }
    } catch (err) {
      setSearchError('Search failed: ' + err.message);
    } finally {
      setSearching(false);
    }
  };

  return (
    <div className="leaflet-map-wrapper">
      {/* Search Bar */}
      <form
        className="map-search-bar"
        onSubmit={handleSearch}
      >
        <div className="map-search-input-wrap">
          <span className="map-search-icon">🔍</span>
          <input
            type="text"
            className="map-search-input"
            placeholder="Search city, country, or address..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              type="button"
              className="map-search-clear"
              onClick={() => { setSearchQuery(''); setSearchError(null); }}
            >
              ✕
            </button>
          )}
        </div>
        <button type="submit" className="map-search-btn" disabled={searching}>
          {searching ? '...' : 'Go'}
        </button>
      </form>

      {searchError && (
        <div className="map-search-error">{searchError}</div>
      )}

      {/* Tile Layer Switcher */}
      <div className="map-tile-switcher">
        {Object.entries(TILE_LAYERS).map(([key, tile]) => (
          <button
            key={key}
            className={`map-tile-btn ${currentTile === key ? 'active' : ''}`}
            onClick={() => setCurrentTile(key)}
            title={tile.name}
          >
            {tile.name}
          </button>
        ))}
      </div>

      {/* Map Container */}
      <div ref={mapContainerRef} className="leaflet-map-container" />

      {/* Legend */}
      <div className="map-legend">
        <span className="map-legend-item">
          <span className="map-legend-dot" style={{ background: '#ef4444' }} />
          Critical
        </span>
        <span className="map-legend-item">
          <span className="map-legend-dot" style={{ background: '#eab308' }} />
          Moderate
        </span>
        <span className="map-legend-item">
          <span className="map-legend-dot" style={{ background: '#22c55e' }} />
          Low
        </span>
        <span className="map-legend-item">
          <span className="map-legend-dot" style={{ background: '#3b82f6', borderRadius: '3px', transform: 'rotate(45deg)' }} />
          Provider
        </span>
      </div>

      {/* Stats overlay */}
      <div className="map-stats-overlay">
        <span>{requests.length} requests</span>
        <span>•</span>
        <span>{providers.length} providers</span>
      </div>
    </div>
  );
}
