/**
 * SRAS Firestore API — Shared Real-Time Data
 * 
 * All data is stored in Firebase Firestore so every user sees the same
 * requests, providers, and dispatches in real-time.
 * Uses onSnapshot listeners for instant updates across all devices.
 * Falls back to local mock if Firestore is unavailable.
 */

import { db } from './firebase';
import {
  collection, doc, addDoc, getDocs, getDoc, updateDoc, deleteDoc,
  query, orderBy, where, onSnapshot, Timestamp, setDoc,
  serverTimestamp
} from 'firebase/firestore';
import { mockAPI } from './mockData';

// ─── Collection refs ────────────────────────────────
const requestsCol = collection(db, 'requests');
const providersCol = collection(db, 'providers');
const dispatchesCol = collection(db, 'dispatches');
const chatsCol = collection(db, 'chats');
const locationsCol = collection(db, 'live_locations');

// ─── Priority Score Engine ──────────────────────────
const BASE_SCORES = { food: 40, medical: 70, shelter: 50, critical: 90 };

function computePriorityScore(request) {
  const base = BASE_SCORES[request.type] || 50;
  const createdAt = request.created_at instanceof Timestamp
    ? request.created_at.toDate()
    : new Date(request.created_at);
  const minutesWaiting = Math.max(0, (Date.now() - createdAt.getTime()) / 60000);
  const timeBonus = Math.min(40, minutesWaiting * 0.5);
  const severityBonus = request.severity * 3;
  const verifiedBonus = request.is_verified ? 5 : 0;
  const total = base + timeBonus + severityBonus + verifiedBonus;
  return {
    total: Math.round(total * 10) / 10,
    base, time_bonus: Math.round(timeBonus * 10) / 10,
    severity_bonus: severityBonus, verified_bonus: verifiedBonus,
    category: request.type,
  };
}

// ─── AI Mock Classification ─────────────────────────
function mockAnalyzeText(text) {
  const lower = text.toLowerCase();
  let type = 'food', severity = 5, reasoning = 'Based on description analysis.';
  const urgencyKeywords = [];

  if (lower.includes('bleed') || lower.includes('injur') || lower.includes('ambulance') || lower.includes('hospital') || lower.includes('medicine') || lower.includes('doctor')) {
    type = 'medical'; severity = 8;
    reasoning = 'Medical emergency detected. Immediate medical assistance required.';
    urgencyKeywords.push('medical', 'emergency', 'urgent');
  } else if (lower.includes('fire') || lower.includes('flood') || lower.includes('earthquake') || lower.includes('trapped') || lower.includes('collapse') || lower.includes('rescue')) {
    type = 'critical'; severity = 9;
    reasoning = 'Critical life-threatening situation detected. Highest priority response needed.';
    urgencyKeywords.push('life-threatening', 'rescue', 'critical');
  } else if (lower.includes('shelter') || lower.includes('roof') || lower.includes('homeless') || lower.includes('evacuate') || lower.includes('tent') || lower.includes('house')) {
    type = 'shelter'; severity = 6;
    reasoning = 'Shelter need identified. Temporary housing assistance required.';
    urgencyKeywords.push('shelter', 'housing', 'displacement');
  } else if (lower.includes('food') || lower.includes('water') || lower.includes('hungry') || lower.includes('starv') || lower.includes('supply') || lower.includes('ration')) {
    type = 'food'; severity = 5;
    reasoning = 'Food and supply need detected. Resource distribution recommended.';
    urgencyKeywords.push('food', 'supply', 'nutrition');
  }

  if (lower.includes('urgent') || lower.includes('immediately') || lower.includes('dying') || lower.includes('critical')) {
    severity = Math.min(10, severity + 2); urgencyKeywords.push('urgent');
  }
  if (lower.includes('children') || lower.includes('elderly') || lower.includes('pregnant') || lower.includes('baby')) {
    severity = Math.min(10, severity + 1); urgencyKeywords.push('vulnerable-population');
  }

  return { type, severity, confidence: 0.75 + Math.random() * 0.2, reasoning, urgency_keywords: [...new Set(urgencyKeywords)] };
}

// ─── Helper: convert Firestore doc to plain object ──
function docToObj(docSnap) {
  const data = docSnap.data();
  if (data.created_at instanceof Timestamp) data.created_at = data.created_at.toDate().toISOString();
  if (data.updated_at instanceof Timestamp) data.updated_at = data.updated_at.toDate().toISOString();
  if (data.timestamp instanceof Timestamp) data.timestamp = data.timestamp.toDate().toISOString();
  return { id: docSnap.id, ...data };
}

// Wrap response to match axios format
const mockRes = (data) => ({ data, status: 200 });

// Track if Firestore works
let _firestoreOk = null;

async function tryFirestore(fn, fallback) {
  if (_firestoreOk === false) return mockRes(fallback());
  try {
    const result = await fn();
    _firestoreOk = true;
    return mockRes(result);
  } catch (err) {
    console.warn('Firestore unavailable, using local mock:', err.message);
    alert('Firestore Error: ' + err.message);
    _firestoreOk = false;
    return mockRes(fallback());
  }
}

// ═══════════════════════════════════════════════════
// REAL-TIME LISTENERS — Live data across all users
// ═══════════════════════════════════════════════════

/**
 * Subscribe to ALL requests in real-time.
 * Every user on every device gets instant updates.
 * @param {Function} callback - (requests[]) => void
 * @returns {Function} unsubscribe
 */
export function subscribeToRequests(callback) {
  if (_firestoreOk === false) {
    callback(mockAPI.listRequests());
    const interval = setInterval(() => callback(mockAPI.listRequests()), 2000);
    return () => clearInterval(interval);
  }
  try {
    const q = query(requestsCol, orderBy('created_at', 'desc'));
    let intervalId;
    const unsub = onSnapshot(q, (snap) => {
      _firestoreOk = true;
      const requests = snap.docs.map(docToObj);
      // Recalculate live priority scores
      requests.forEach(r => {
        if (r.status === 'pending' || r.status === 'assigned') {
          const breakdown = computePriorityScore(r);
          r.priority_score = breakdown.total;
          r.score_breakdown = breakdown;
        }
      });
      requests.sort((a, b) => (b.priority_score || 0) - (a.priority_score || 0));
      callback(requests);
    }, (err) => {
      console.warn('Request listener error:', err);
      alert('Firestore Listener Error (Requests): ' + err.message);
      _firestoreOk = false;
      callback(mockAPI.listRequests());
      if (!intervalId) intervalId = setInterval(() => callback(mockAPI.listRequests()), 2000);
    });
    return () => {
      unsub();
      if (intervalId) clearInterval(intervalId);
    };
  } catch (err) {
    console.warn('Cannot subscribe to requests:', err);
    _firestoreOk = false;
    callback(mockAPI.listRequests());
    const intervalId = setInterval(() => callback(mockAPI.listRequests()), 2000);
    return () => clearInterval(intervalId);
  }
}

/**
 * Subscribe to ALL providers in real-time.
 * @param {Function} callback - (providers[]) => void
 * @returns {Function} unsubscribe
 */
export function subscribeToProviders(callback) {
  if (_firestoreOk === false) {
    callback(mockAPI.listProviders());
    const interval = setInterval(() => callback(mockAPI.listProviders()), 2000);
    return () => clearInterval(interval);
  }
  try {
    let intervalId;
    const unsub = onSnapshot(providersCol, (snap) => {
      _firestoreOk = true;
      callback(snap.docs.map(docToObj));
    }, (err) => {
      console.warn('Provider listener error:', err);
      alert('Firestore Listener Error (Providers): ' + err.message);
      _firestoreOk = false;
      callback(mockAPI.listProviders());
      if (!intervalId) intervalId = setInterval(() => callback(mockAPI.listProviders()), 2000);
    });
    return () => {
      unsub();
      if (intervalId) clearInterval(intervalId);
    };
  } catch (err) {
    console.warn('Cannot subscribe to providers:', err);
    _firestoreOk = false;
    callback(mockAPI.listProviders());
    const intervalId = setInterval(() => callback(mockAPI.listProviders()), 2000);
    return () => clearInterval(intervalId);
  }
}

/**
 * Subscribe to ALL dispatches in real-time.
 * @param {Function} callback - (dispatches[]) => void
 * @returns {Function} unsubscribe
 */
export function subscribeToDispatches(callback) {
  if (_firestoreOk === false) {
    callback(mockAPI.listDispatches());
    const interval = setInterval(() => callback(mockAPI.listDispatches()), 2000);
    return () => clearInterval(interval);
  }
  try {
    let intervalId;
    const unsub = onSnapshot(dispatchesCol, (snap) => {
      _firestoreOk = true;
      callback(snap.docs.map(docToObj));
    }, (err) => {
      console.warn('Dispatch listener error:', err);
      _firestoreOk = false;
      callback(mockAPI.listDispatches());
      if (!intervalId) intervalId = setInterval(() => callback(mockAPI.listDispatches()), 2000);
    });
    return () => {
      unsub();
      if (intervalId) clearInterval(intervalId);
    };
  } catch (err) {
    console.warn('Cannot subscribe to dispatches:', err);
    _firestoreOk = false;
    callback(mockAPI.listDispatches());
    const intervalId = setInterval(() => callback(mockAPI.listDispatches()), 2000);
    return () => clearInterval(intervalId);
  }
}

/**
 * Subscribe to chat messages for a specific dispatch.
 * @param {string} dispatchId
 * @param {Function} callback - (messages[]) => void
 * @returns {Function} unsubscribe
 */
export function subscribeToChatMessages(dispatchId, callback) {
  if (!dispatchId) return () => {};
  try {
    const q = query(
      collection(db, 'chats', dispatchId, 'messages'),
      orderBy('timestamp', 'asc')
    );
    return onSnapshot(q, (snap) => {
      callback(snap.docs.map(docToObj));
    }, (err) => {
      console.warn('Chat listener error:', err);
      callback([]);
    });
  } catch (err) {
    return () => {};
  }
}

/**
 * Send a chat message.
 */
export async function sendChatMessage(dispatchId, message) {
  const messagesCol = collection(db, 'chats', dispatchId, 'messages');
  await addDoc(messagesCol, {
    ...message,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Subscribe to a provider's live location.
 * @param {string} providerId
 * @param {Function} callback - (location) => void
 * @returns {Function} unsubscribe
 */
export function subscribeToProviderLocation(providerId, callback) {
  if (!providerId) return () => {};
  try {
    const locDoc = doc(db, 'live_locations', providerId);
    return onSnapshot(locDoc, (snap) => {
      if (snap.exists()) {
        callback(snap.data());
      }
    }, (err) => {
      console.warn('Location listener error:', err);
    });
  } catch (err) {
    return () => {};
  }
}

/**
 * Update provider's live location (called by provider's device).
 */
export async function updateProviderLocation(providerId, lat, lng) {
  const locDoc = doc(db, 'live_locations', providerId);
  await setDoc(locDoc, {
    lat, lng,
    updated_at: new Date().toISOString(),
  }, { merge: true });
}

// ═══════════════════════════════════════════════════
// PUBLIC API — Used by all components (legacy compat)
// ═══════════════════════════════════════════════════

export const createRequest = (data) => tryFirestore(
  async () => {
    const gemini = mockAnalyzeText(data.description || '');
    const now = new Date().toISOString();
    const request = {
      ...data,
      type: data.type || gemini.type,
      severity: data.severity || gemini.severity,
      status: 'pending',
      gemini_analysis: gemini,
      created_at: now,
      updated_at: now,
    };
    const breakdown = computePriorityScore(request);
    request.priority_score = breakdown.total;
    request.score_breakdown = breakdown;

    const snap = await getDocs(query(requestsCol, where('status', '==', 'pending')));
    request.queue_position = snap.size + 1;

    const docRef = await addDoc(requestsCol, request);
    return { id: docRef.id, ...request };
  },
  () => mockAPI.createRequest(data)
);

export const listRequests = () => tryFirestore(
  async () => {
    const snap = await getDocs(query(requestsCol, orderBy('created_at', 'desc')));
    const requests = snap.docs.map(docToObj);
    requests.forEach(r => {
      if (r.status === 'pending' || r.status === 'assigned') {
        const breakdown = computePriorityScore(r);
        r.priority_score = breakdown.total;
        r.score_breakdown = breakdown;
      }
    });
    return requests.sort((a, b) => (b.priority_score || 0) - (a.priority_score || 0));
  },
  () => mockAPI.listRequests()
);

export const getRequest = (id) => tryFirestore(
  async () => {
    const snap = await getDoc(doc(db, 'requests', id));
    return snap.exists() ? docToObj(snap) : null;
  },
  () => mockAPI.getRequest(id)
);

// ─── Providers ──────────────────────────────────────
export const registerProvider = (data) => tryFirestore(
  async () => {
    const provider = {
      ...data,
      status: 'available',
      reliability_score: 8.0 + Math.random() * 2,
      created_at: new Date().toISOString(),
    };
    const docRef = await addDoc(providersCol, provider);
    return { id: docRef.id, ...provider };
  },
  () => mockAPI.registerProvider(data)
);

export const listProviders = () => tryFirestore(
  async () => {
    const snap = await getDocs(providersCol);
    return snap.docs.map(docToObj);
  },
  () => mockAPI.listProviders()
);

// ─── Dispatches ─────────────────────────────────────
export const runDispatch = () => tryFirestore(
  async () => {
    const reqSnap = await getDocs(query(requestsCol, where('status', '==', 'pending')));
    const provSnap = await getDocs(query(providersCol, where('status', '==', 'available')));
    const pendingReqs = reqSnap.docs.map(docToObj);
    const availProvs = provSnap.docs.map(docToObj);
    let matched = 0, unmatched = 0;

    for (const req of pendingReqs) {
      const capable = availProvs.find(p => p.status === 'available' && p.capability_types?.includes(req.type));
      if (capable) {
        const distanceKm = 0.5 + Math.random() * 8;
        await addDoc(dispatchesCol, {
          request_id: req.id, provider_id: capable.id,
          requester_id: req.requester_id || null,
          status: 'pending_acceptance',
          distance_km: Math.round(distanceKm * 10) / 10,
          match_score: 0.7 + Math.random() * 0.3,
          response_time_minutes: null,
          created_at: new Date().toISOString(),
          request_type: req.type,
          request_description: req.description,
          request_location: req.location,
          provider_name: capable.name,
          provider_location: capable.location,
        });
        await updateDoc(doc(db, 'requests', req.id), { status: 'assigned' });
        await updateDoc(doc(db, 'providers', capable.id), { status: 'dispatched' });
        capable.status = 'dispatched';
        matched++;
      } else { unmatched++; }
    }
    return { matched, unmatched, total: matched + unmatched };
  },
  () => mockAPI.runDispatch()
);

export const acceptDispatch = (id) => tryFirestore(
  async () => {
    await updateDoc(doc(db, 'dispatches', id), { status: 'accepted', accepted_at: new Date().toISOString() });
    return { id, status: 'accepted' };
  },
  () => mockAPI.acceptDispatch(id)
);

export const completeDispatch = (id, data = {}) => tryFirestore(
  async () => {
    const { outcome = 'resolved', report = '' } = data;
    const dSnap = await getDoc(doc(db, 'dispatches', id));
    const d = dSnap.exists() ? docToObj(dSnap) : null;
    const responseTime = 5 + Math.random() * 30;
    
    await updateDoc(doc(db, 'dispatches', id), { 
      status: 'completed', 
      response_time_minutes: responseTime,
      outcome,
      report,
      completed_at: new Date().toISOString()
    });

    if (d?.provider_id) {
      const pSnap = await getDoc(doc(db, 'providers', d.provider_id));
      if (pSnap.exists()) {
        const p = pSnap.data();
        await updateDoc(doc(db, 'providers', d.provider_id), {
          status: 'available',
          reliability_score: Math.min(10, (p.reliability_score || 8) + (outcome === 'resolved' ? 0.5 : 0.1)),
        });
      }
    }

    if (d?.request_id) {
      await updateDoc(doc(db, 'requests', d.request_id), { 
        status: outcome === 'resolved' ? 'resolved' : 'partially_resolved',
        provider_report: report,
        resolved_at: new Date().toISOString()
      });
    }
    return { id, status: 'completed', response_time_minutes: responseTime };
  },
  () => mockAPI.completeDispatch(id)
);

export const listDispatches = () => tryFirestore(
  async () => {
    const snap = await getDocs(dispatchesCol);
    return snap.docs.map(docToObj);
  },
  () => mockAPI.listDispatches()
);

// ─── Delete Operations ──────────────────────────────

export const deleteRequest = (id) => tryFirestore(
  async () => {
    await deleteDoc(doc(db, 'requests', id));
    return { id, deleted: true };
  },
  () => mockAPI.deleteRequest(id)
);

export const deleteDispatch = (id) => tryFirestore(
  async () => {
    // Also free the provider if the dispatch was active
    const dSnap = await getDoc(doc(db, 'dispatches', id));
    if (dSnap.exists()) {
      const d = dSnap.data();
      if (d.provider_id && (d.status === 'pending_acceptance' || d.status === 'accepted')) {
        try {
          await updateDoc(doc(db, 'providers', d.provider_id), { status: 'available' });
        } catch (e) { /* provider may not exist */ }
      }
      if (d.request_id && d.status !== 'completed') {
        try {
          await updateDoc(doc(db, 'requests', d.request_id), { status: 'pending' });
        } catch (e) { /* request may not exist */ }
      }
    }
    await deleteDoc(doc(db, 'dispatches', id));
    return { id, deleted: true };
  },
  () => mockAPI.deleteDispatch(id)
);

export const clearResolvedRequests = () => tryFirestore(
  async () => {
    const snap = await getDocs(query(requestsCol, where('status', '==', 'resolved')));
    let deleted = 0;
    for (const d of snap.docs) {
      await deleteDoc(d.ref);
      deleted++;
    }
    return { deleted };
  },
  () => mockAPI.clearResolvedRequests()
);

// ─── AI ─────────────────────────────────────────────
export const analyzeText = async (text) => mockRes(mockAnalyzeText(text));

export const generateSitrep = () => tryFirestore(
  async () => {
    const reqSnap = await getDocs(requestsCol);
    const provSnap = await getDocs(providersCol);
    const requests = reqSnap.docs.map(docToObj);
    const providers = provSnap.docs.map(docToObj);
    const pending = requests.filter(r => r.status === 'pending').length;
    const resolved = requests.filter(r => r.status === 'resolved').length;
    const assigned = requests.filter(r => r.status === 'assigned').length;

    return {
      report: `## 📋 SRAS Situation Report\n**Generated:** ${new Date().toLocaleString()}\n\n## Current Status\n- **Total Requests:** ${requests.length}\n- **Pending:** ${pending}\n- **Assigned:** ${assigned}\n- **Resolved:** ${resolved}\n\n## Resource Distribution\n- Food: ${requests.filter(r => r.type === 'food').length}\n- Medical: ${requests.filter(r => r.type === 'medical').length}\n- Shelter: ${requests.filter(r => r.type === 'shelter').length}\n- Critical: ${requests.filter(r => r.type === 'critical').length}\n\n## Active Providers\n- **Total:** ${providers.length}\n- **Available:** ${providers.filter(p => p.status === 'available').length}\n- **Dispatched:** ${providers.filter(p => p.status === 'dispatched').length}\n\n## Recommendation\n${pending > 5 ? '⚠️ HIGH VOLUME — Deploy additional resources.' : '✅ Operations running smoothly.'}`,
      generated_at: new Date().toISOString(),
    };
  },
  () => mockAPI.generateSitrep()
);

export const forecastZone = async (zone) => mockRes(mockAPI.forecastZone(zone));

// ─── Stats ──────────────────────────────────────────
export const getDashboardStats = () => tryFirestore(
  async () => {
    const reqSnap = await getDocs(requestsCol);
    const provSnap = await getDocs(providersCol);
    const requests = reqSnap.docs.map(docToObj);
    const providers = provSnap.docs.map(docToObj);
    const pending = requests.filter(r => r.status === 'pending');
    const resolved = requests.filter(r => r.status === 'resolved');
    const pendingByType = {};
    pending.forEach(r => { pendingByType[r.type] = (pendingByType[r.type] || 0) + 1; });
    const waitTimes = pending.map(r => (Date.now() - new Date(r.created_at).getTime()) / 60000);
    const avgWait = waitTimes.length > 0 ? waitTimes.reduce((s, v) => s + v, 0) / waitTimes.length : 0;

    return {
      total_pending: pending.length,
      pending_by_type: pendingByType,
      avg_wait_minutes: avgWait,
      total_resolved_today: resolved.length,
      resolution_rate_today: requests.length > 0 ? resolved.length / requests.length : 0,
      active_providers: providers.filter(p => p.status === 'available').length,
      total_providers: providers.length,
    };
  },
  () => mockAPI.getDashboardStats()
);

// ─── Seed Demo Data ─────────────────────────────────
export const seedDemoData = () => tryFirestore(
  async () => {
    const now = Date.now();
    const demoRequests = [
      { type: 'medical', severity: 9, description: '🚨 Multiple casualties from building collapse. Need ambulances urgently.',
        location: { lat: 22.5726 + (Math.random()-0.5)*0.05, lng: 88.3639 + (Math.random()-0.5)*0.05, address: 'Park Street, Kolkata', zone: 'Zone-A' },
        is_verified: true, requester_id: 'demo-1' },
      { type: 'food', severity: 6, description: 'Community of 200+ displaced families needs food and water supplies.',
        location: { lat: 22.5826 + (Math.random()-0.5)*0.03, lng: 88.3539 + (Math.random()-0.5)*0.03, address: 'Salt Lake, Kolkata', zone: 'Zone-A' },
        is_verified: true, requester_id: 'demo-2' },
      { type: 'shelter', severity: 7, description: 'Flooding displaced 80 families. Need temporary shelter and blankets.',
        location: { lat: 22.5626 + (Math.random()-0.5)*0.04, lng: 88.3739 + (Math.random()-0.5)*0.04, address: 'Howrah, Kolkata', zone: 'Zone-B' },
        is_verified: false, requester_id: 'demo-3' },
      { type: 'critical', severity: 10, description: '🔥 Active fire in residential area. People trapped on upper floors.',
        location: { lat: 22.5550 + (Math.random()-0.5)*0.03, lng: 88.3500 + (Math.random()-0.5)*0.03, address: 'Esplanade, Kolkata', zone: 'Zone-A' },
        is_verified: true, requester_id: 'demo-4' },
      { type: 'medical', severity: 5, description: 'Elderly patient needs insulin and blood pressure medication.',
        location: { lat: 22.5850 + (Math.random()-0.5)*0.03, lng: 88.3800 + (Math.random()-0.5)*0.03, address: 'New Town, Kolkata', zone: 'Zone-B' },
        is_verified: false, requester_id: 'demo-5' },
    ];

    for (let i = 0; i < demoRequests.length; i++) {
      const data = demoRequests[i];
      const createdAt = new Date(now - (i * 8 + Math.random() * 10) * 60000).toISOString();
      const gemini = mockAnalyzeText(data.description);
      const request = { ...data, status: 'pending', gemini_analysis: gemini, created_at: createdAt, updated_at: createdAt };
      const breakdown = computePriorityScore(request);
      request.priority_score = breakdown.total;
      request.score_breakdown = breakdown;
      await addDoc(requestsCol, request);
    }

    const demoProviders = [
      { name: 'Red Cross Unit 3', organization: 'Red Cross', capability_types: ['medical', 'food'], provider_uid: 'prov-demo-1',
        location: { lat: 22.5700 + (Math.random()-0.5)*0.02, lng: 88.3600 + (Math.random()-0.5)*0.02, address: 'Central Kolkata', zone: 'Zone-A' } },
      { name: 'UNICEF Relief Team', organization: 'UNICEF', capability_types: ['food', 'shelter'], provider_uid: 'prov-demo-2',
        location: { lat: 22.5800 + (Math.random()-0.5)*0.02, lng: 88.3700 + (Math.random()-0.5)*0.02, address: 'East Kolkata', zone: 'Zone-B' } },
      { name: 'City Fire & Rescue', organization: 'Municipal', capability_types: ['critical', 'medical'], provider_uid: 'prov-demo-3',
        location: { lat: 22.5650 + (Math.random()-0.5)*0.02, lng: 88.3550 + (Math.random()-0.5)*0.02, address: 'South Kolkata', zone: 'Zone-A' } },
    ];

    for (const p of demoProviders) {
      await addDoc(providersCol, { ...p, status: 'available', reliability_score: 8 + Math.random() * 2, created_at: new Date().toISOString() });
    }

    return { seeded: true, requests: demoRequests.length, providers: demoProviders.length };
  },
  () => mockAPI.seedDemoData()
);

export default db;
