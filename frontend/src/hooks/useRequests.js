/**
 * useRequests — Real-time Firestore hooks
 * Uses onSnapshot for instant updates across all devices.
 * No more polling — data appears instantly when anyone makes changes.
 */

import { useState, useEffect, useCallback } from 'react';
import {
  subscribeToRequests,
  subscribeToProviders,
  subscribeToDispatches,
  getDashboardStats,
} from '../lib/api';

/**
 * Real-time requests + dashboard stats.
 * Every user sees the same data instantly.
 */
export function useRequests() {
  const [requests, setRequests] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Real-time listener for requests
    const unsub = subscribeToRequests((data) => {
      setRequests(data);
      setLoading(false);
      setError(null);
    });

    // Fallback to clear loading state if Firebase takes too long
    const timeoutId = setTimeout(() => {
      setLoading(false);
    }, 2000);

    // Initial stats fetch
    getDashboardStats()
      .then(res => setStats(res.data))
      .catch(err => console.warn('Stats fetch error:', err));

    return () => {
      unsub();
      clearTimeout(timeoutId);
    };
  }, []);

  // Refresh stats on demand
  const refetch = useCallback(async () => {
    try {
      const res = await getDashboardStats();
      setStats(res.data);
    } catch (err) {
      setError(err.message);
    }
  }, []);

  // Auto-refresh stats when requests change
  useEffect(() => {
    if (requests.length > 0) {
      getDashboardStats()
        .then(res => setStats(res.data))
        .catch(() => {});
    }
  }, [requests]);

  return { requests, stats, loading, error, refetch };
}

/**
 * Real-time providers — every device sees all providers instantly.
 */
export function useProviders() {
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = subscribeToProviders((data) => {
      setProviders(data);
      setLoading(false);
    });
    return unsub;
  }, []);

  return { providers, loading, refetch: () => {} };
}

/**
 * Real-time dispatches — instant dispatch updates.
 */
export function useDispatches() {
  const [dispatches, setDispatches] = useState([]);

  useEffect(() => {
    const unsub = subscribeToDispatches((data) => {
      setDispatches(data);
    });
    return unsub;
  }, []);

  return { dispatches, refetch: () => {} };
}
