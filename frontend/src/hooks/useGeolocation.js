/**
 * useGeolocation — Auto-detect user location
 * Falls back to Bangalore city center if denied
 */

import { useState, useEffect } from 'react';

const DEFAULT_LOCATION = { lat: 12.9716, lng: 77.5946 }; // Bangalore

export function useGeolocation() {
  const [location, setLocation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!navigator.geolocation) {
      setLocation(DEFAULT_LOCATION);
      setError('Geolocation not supported');
      setLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        });
        setLoading(false);
      },
      (err) => {
        console.warn('Geolocation denied, using default:', err.message);
        setLocation(DEFAULT_LOCATION);
        setError(err.message);
        setLoading(false);
      },
      { timeout: 5000, enableHighAccuracy: false }
    );
  }, []);

  return { location, loading, error, setLocation };
}
