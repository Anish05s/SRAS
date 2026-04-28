/**
 * LiveTracker — Swiggy/Zomato-style real-time provider tracking
 * Shows provider's live location on a map with route line,
 * ETA calculation, and animated movement.
 */
import { useState, useEffect, useRef, useMemo } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { subscribeToProviderLocation, updateProviderLocation } from '../lib/api';

// Fix Leaflet icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// Haversine distance in km
function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default function LiveTracker({
  providerId,
  providerName,
  requestLocation,
  providerLocation: initialProviderLoc,
  dispatchStatus,
  isProvider = false,
}) {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const providerMarkerRef = useRef(null);
  const requestMarkerRef = useRef(null);
  const routeLineRef = useRef(null);
  const trailLineRef = useRef(null);
  const [liveLocation, setLiveLocation] = useState(initialProviderLoc);
  const [eta, setEta] = useState(null);
  const [distanceKm, setDistanceKm] = useState(null);
  const [locationHistory, setLocationHistory] = useState([]);

  // Subscribe to provider's live location
  useEffect(() => {
    if (!providerId) return;
    const unsub = subscribeToProviderLocation(providerId, (loc) => {
      setLiveLocation(loc);
      setLocationHistory(prev => [...prev.slice(-50), [loc.lat, loc.lng]]);
    });
    return unsub;
  }, [providerId]);

  // If this user is the provider, broadcast location
  useEffect(() => {
    if (!isProvider || !providerId) return;

    let watchId;
    if (navigator.geolocation) {
      watchId = navigator.geolocation.watchPosition(
        (pos) => {
          updateProviderLocation(providerId, pos.coords.latitude, pos.coords.longitude);
        },
        (err) => console.warn('Geolocation error:', err),
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 3000 }
      );
    }

    // Also broadcast mock movement for demo
    const interval = setInterval(() => {
      if (liveLocation && requestLocation) {
        const progress = 0.02 + Math.random() * 0.03;
        const newLat = liveLocation.lat + (requestLocation.lat - liveLocation.lat) * progress;
        const newLng = liveLocation.lng + (requestLocation.lng - liveLocation.lng) * progress;
        updateProviderLocation(providerId, newLat, newLng);
      }
    }, 5000);

    return () => {
      if (watchId) navigator.geolocation.clearWatch(watchId);
      clearInterval(interval);
    };
  }, [isProvider, providerId, liveLocation, requestLocation]);

  // Calculate ETA
  useEffect(() => {
    if (!liveLocation || !requestLocation) return;
    const dist = haversineKm(
      liveLocation.lat, liveLocation.lng,
      requestLocation.lat, requestLocation.lng
    );
    setDistanceKm(Math.round(dist * 10) / 10);
    // Assume average speed 25 km/h for urban emergency
    const etaMinutes = Math.round((dist / 25) * 60);
    setEta(etaMinutes);
  }, [liveLocation, requestLocation]);

  // ─── Initialize map ─────────────────────────────
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const center = requestLocation
      ? [requestLocation.lat, requestLocation.lng]
      : [22.5726, 88.3639];

    const map = L.map(mapContainerRef.current, {
      center,
      zoom: 14,
      zoomControl: false,
      attributionControl: false,
    });

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 19,
    }).addTo(map);

    mapRef.current = map;

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // ─── Update markers ────────────────────────────
  useEffect(() => {
    if (!mapRef.current) return;

    // Request marker (destination)
    if (requestLocation && !requestMarkerRef.current) {
      const reqIcon = L.divIcon({
        className: 'custom-map-marker',
        html: `<div style="
          width:32px;height:32px;
          background:#ef4444;
          border:3px solid white;
          border-radius:50%;
          display:flex;align-items:center;justify-content:center;
          font-size:16px;
          box-shadow:0 2px 12px rgba(239,68,68,0.5);
          animation:mapPulse 2s ease infinite;
        ">🆘</div>`,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });

      requestMarkerRef.current = L.marker(
        [requestLocation.lat, requestLocation.lng],
        { icon: reqIcon }
      ).addTo(mapRef.current)
        .bindPopup(`<strong>📍 Destination</strong><br/>${requestLocation.address || 'Emergency Location'}`);
    }

    // Provider marker (moving)
    if (liveLocation) {
      const provIcon = L.divIcon({
        className: 'custom-map-marker',
        html: `<div style="
          width:36px;height:36px;
          background:linear-gradient(135deg, #3b82f6, #6366f1);
          border:3px solid white;
          border-radius:50%;
          display:flex;align-items:center;justify-content:center;
          font-size:18px;
          box-shadow:0 2px 16px rgba(59,130,246,0.5);
          z-index:999;
        ">🚗</div>`,
        iconSize: [36, 36],
        iconAnchor: [18, 18],
      });

      if (providerMarkerRef.current) {
        providerMarkerRef.current.setLatLng([liveLocation.lat, liveLocation.lng]);
      } else {
        providerMarkerRef.current = L.marker(
          [liveLocation.lat, liveLocation.lng],
          { icon: provIcon, zIndexOffset: 1000 }
        ).addTo(mapRef.current)
          .bindPopup(`<strong>🤝 ${providerName || 'Provider'}</strong><br/>En route to emergency`);
      }

      // Route line (dashed)
      if (requestLocation) {
        if (routeLineRef.current) {
          routeLineRef.current.setLatLngs([
            [liveLocation.lat, liveLocation.lng],
            [requestLocation.lat, requestLocation.lng],
          ]);
        } else {
          routeLineRef.current = L.polyline(
            [
              [liveLocation.lat, liveLocation.lng],
              [requestLocation.lat, requestLocation.lng],
            ],
            {
              color: '#6366f1',
              weight: 3,
              dashArray: '10, 8',
              opacity: 0.7,
            }
          ).addTo(mapRef.current);
        }
      }

      // Trail line (solid, showing path taken)
      if (locationHistory.length > 1) {
        if (trailLineRef.current) {
          trailLineRef.current.setLatLngs(locationHistory);
        } else {
          trailLineRef.current = L.polyline(locationHistory, {
            color: '#22c55e',
            weight: 4,
            opacity: 0.6,
          }).addTo(mapRef.current);
        }
      }

      // Fit bounds to show both markers
      if (requestLocation) {
        const bounds = L.latLngBounds(
          [liveLocation.lat, liveLocation.lng],
          [requestLocation.lat, requestLocation.lng]
        );
        mapRef.current.fitBounds(bounds, { padding: [60, 60], maxZoom: 16 });
      }
    }
  }, [liveLocation, requestLocation, locationHistory, providerName]);

  return (
    <div className="live-tracker glass-card">
      {/* Status Bar */}
      <div className="tracker-status-bar">
        <div className="tracker-status-left">
          <div className="tracker-live-dot" />
          <span className="tracker-live-text">
            {dispatchStatus === 'completed' ? 'Delivered ✅' :
              dispatchStatus === 'accepted' ? 'Provider En Route' : 'Waiting for Provider'}
          </span>
        </div>
        {eta !== null && dispatchStatus !== 'completed' && (
          <div className="tracker-eta">
            <span className="tracker-eta-value">{eta < 1 ? '<1' : eta}</span>
            <span className="tracker-eta-label">min ETA</span>
          </div>
        )}
      </div>

      {/* Map */}
      <div ref={mapContainerRef} className="tracker-map" />

      {/* Info Strip */}
      <div className="tracker-info-strip">
        <div className="tracker-info-item">
          <div className="tracker-info-icon">🚗</div>
          <div>
            <div className="tracker-info-label">{providerName || 'Provider'}</div>
            <div className="tracker-info-value">
              {distanceKm !== null ? `${distanceKm} km away` : 'Locating...'}
            </div>
          </div>
        </div>

        <div className="tracker-info-divider" />

        <div className="tracker-info-item">
          <div className="tracker-info-icon">📍</div>
          <div>
            <div className="tracker-info-label">Destination</div>
            <div className="tracker-info-value">
              {requestLocation?.address || 'Emergency Location'}
            </div>
          </div>
        </div>

        {dispatchStatus === 'accepted' && (
          <>
            <div className="tracker-info-divider" />
            <div className="tracker-info-item">
              <div className="tracker-info-icon">⏱️</div>
              <div>
                <div className="tracker-info-label">Status</div>
                <div className="tracker-info-value" style={{ color: 'var(--accent-emerald)' }}>
                  On the way
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Progress Steps */}
      <div className="tracker-steps">
        <div className={`tracker-step ${dispatchStatus ? 'done' : ''}`}>
          <div className="tracker-step-dot done">✓</div>
          <div className="tracker-step-label">Dispatched</div>
        </div>
        <div className="tracker-step-line done" />
        <div className={`tracker-step ${dispatchStatus === 'accepted' || dispatchStatus === 'completed' ? 'done' : ''}`}>
          <div className={`tracker-step-dot ${dispatchStatus === 'accepted' || dispatchStatus === 'completed' ? 'done' : 'active'}`}>
            {dispatchStatus === 'accepted' || dispatchStatus === 'completed' ? '✓' : '2'}
          </div>
          <div className="tracker-step-label">Accepted</div>
        </div>
        <div className={`tracker-step-line ${dispatchStatus === 'accepted' || dispatchStatus === 'completed' ? 'done' : ''}`} />
        <div className={`tracker-step ${dispatchStatus === 'completed' ? 'done' : ''}`}>
          <div className={`tracker-step-dot ${dispatchStatus === 'completed' ? 'done' : dispatchStatus === 'accepted' ? 'active' : ''}`}>
            {dispatchStatus === 'completed' ? '✓' : '3'}
          </div>
          <div className="tracker-step-label">Arrived</div>
        </div>
        <div className={`tracker-step-line ${dispatchStatus === 'completed' ? 'done' : ''}`} />
        <div className={`tracker-step ${dispatchStatus === 'completed' ? 'done' : ''}`}>
          <div className={`tracker-step-dot ${dispatchStatus === 'completed' ? 'done' : ''}`}>
            {dispatchStatus === 'completed' ? '✓' : '4'}
          </div>
          <div className="tracker-step-label">Resolved</div>
        </div>
      </div>
    </div>
  );
}
