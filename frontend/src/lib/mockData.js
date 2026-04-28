/**
 * SRAS Mock Data & Offline Engine
 * Provides a fully functional demo mode when the backend is unavailable.
 * All data is stored in-memory and simulates real API behavior.
 */

// ─── In-Memory Database ────────────────────────────
let _requests = [];
let _providers = [];
let _dispatches = [];
let _idCounter = 1000;

const genId = () => `mock-${++_idCounter}`;

// ─── Priority Score Engine (mirrors backend logic) ──
const BASE_SCORES = { food: 40, medical: 70, shelter: 50, critical: 90 };

function computePriorityScore(request) {
  const base = BASE_SCORES[request.type] || 50;
  const createdAt = new Date(request.created_at);
  const minutesWaiting = Math.max(0, (Date.now() - createdAt.getTime()) / 60000);
  const timeBonus = Math.min(40, minutesWaiting * 0.5);
  const severityBonus = request.severity * 3;
  const verifiedBonus = request.is_verified ? 5 : 0;
  const total = base + timeBonus + severityBonus + verifiedBonus;

  return {
    total: Math.round(total * 10) / 10,
    base,
    time_bonus: Math.round(timeBonus * 10) / 10,
    severity_bonus: severityBonus,
    verified_bonus: verifiedBonus,
    category: request.type,
  };
}

// ─── Gemini AI Mock (simulates classification) ──────
function mockAnalyzeText(text) {
  const lower = text.toLowerCase();

  let type = 'food';
  let severity = 5;
  let reasoning = 'Based on description analysis.';
  const urgencyKeywords = [];

  if (lower.includes('bleed') || lower.includes('injur') || lower.includes('ambulance') || lower.includes('hospital') || lower.includes('medicine') || lower.includes('doctor')) {
    type = 'medical';
    severity = 8;
    reasoning = 'Medical emergency detected. Immediate medical assistance required.';
    urgencyKeywords.push('medical', 'emergency', 'urgent');
  } else if (lower.includes('fire') || lower.includes('flood') || lower.includes('earthquake') || lower.includes('trapped') || lower.includes('collapse') || lower.includes('rescue')) {
    type = 'critical';
    severity = 9;
    reasoning = 'Critical life-threatening situation detected. Highest priority response needed.';
    urgencyKeywords.push('life-threatening', 'rescue', 'critical');
  } else if (lower.includes('shelter') || lower.includes('roof') || lower.includes('homeless') || lower.includes('evacuate') || lower.includes('tent') || lower.includes('house')) {
    type = 'shelter';
    severity = 6;
    reasoning = 'Shelter need identified. Temporary housing assistance required.';
    urgencyKeywords.push('shelter', 'housing', 'displacement');
  } else if (lower.includes('food') || lower.includes('water') || lower.includes('hungry') || lower.includes('starv') || lower.includes('supply') || lower.includes('ration')) {
    type = 'food';
    severity = 5;
    reasoning = 'Food and supply need detected. Resource distribution recommended.';
    urgencyKeywords.push('food', 'supply', 'nutrition');
  }

  // Boost severity for urgency words
  if (lower.includes('urgent') || lower.includes('immediately') || lower.includes('dying') || lower.includes('critical')) {
    severity = Math.min(10, severity + 2);
    urgencyKeywords.push('urgent');
  }
  if (lower.includes('children') || lower.includes('elderly') || lower.includes('pregnant') || lower.includes('baby')) {
    severity = Math.min(10, severity + 1);
    urgencyKeywords.push('vulnerable-population');
  }

  return {
    type,
    severity,
    confidence: 0.75 + Math.random() * 0.2,
    reasoning,
    urgency_keywords: [...new Set(urgencyKeywords)],
  };
}

// ─── Mock API Handlers ──────────────────────────────

export const mockAPI = {
  // ─── Requests ─────────────────────────────────────
  createRequest(data) {
    const id = genId();
    const now = new Date().toISOString();
    const geminiAnalysis = mockAnalyzeText(data.description || '');

    const request = {
      id,
      ...data,
      type: data.type || geminiAnalysis.type,
      severity: data.severity || geminiAnalysis.severity,
      status: 'pending',
      priority_score: 0,
      score_breakdown: null,
      gemini_analysis: geminiAnalysis,
      created_at: now,
      updated_at: now,
    };

    const scoreBreakdown = computePriorityScore(request);
    request.priority_score = scoreBreakdown.total;
    request.score_breakdown = scoreBreakdown;

    // Queue position
    const pendingCount = _requests.filter(r => r.status === 'pending').length;
    request.queue_position = pendingCount + 1;

    _requests.unshift(request);
    return request;
  },

  listRequests() {
    // Recalculate scores (time bonus updates)
    _requests.forEach(r => {
      if (r.status === 'pending' || r.status === 'assigned') {
        const breakdown = computePriorityScore(r);
        r.priority_score = breakdown.total;
        r.score_breakdown = breakdown;
      }
    });
    return [..._requests].sort((a, b) => (b.priority_score || 0) - (a.priority_score || 0));
  },

  getRequest(id) {
    return _requests.find(r => r.id === id) || null;
  },

  // ─── Providers ────────────────────────────────────
  registerProvider(data) {
    const id = genId();
    const provider = {
      id,
      ...data,
      status: 'available',
      reliability_score: 8.0 + Math.random() * 2,
      created_at: new Date().toISOString(),
    };
    _providers.push(provider);
    return provider;
  },

  listProviders() {
    return [..._providers];
  },

  // ─── Dispatches ───────────────────────────────────
  runDispatch() {
    const pendingRequests = _requests.filter(r => r.status === 'pending');
    const availableProviders = _providers.filter(p => p.status === 'available');

    let matched = 0;
    let unmatched = 0;

    pendingRequests.forEach(req => {
      const capable = availableProviders.find(p =>
        p.status === 'available' &&
        p.capability_types?.includes(req.type)
      );

      if (capable) {
        const distanceKm = 0.5 + Math.random() * 8;
        const dispatch = {
          id: genId(),
          request_id: req.id,
          provider_id: capable.id,
          status: 'pending_acceptance',
          distance_km: Math.round(distanceKm * 10) / 10,
          match_score: 0.7 + Math.random() * 0.3,
          response_time_minutes: null,
          created_at: new Date().toISOString(),
        };
        _dispatches.push(dispatch);
        req.status = 'assigned';
        capable.status = 'dispatched';
        matched++;
      } else {
        unmatched++;
      }
    });

    return { matched, unmatched, total: matched + unmatched };
  },

  acceptDispatch(id) {
    const d = _dispatches.find(x => x.id === id);
    if (d) {
      d.status = 'accepted';
    }
    return d;
  },

  completeDispatch(id) {
    const d = _dispatches.find(x => x.id === id);
    if (d) {
      d.status = 'completed';
      d.response_time_minutes = 5 + Math.random() * 30;
      const prov = _providers.find(p => p.id === d.provider_id);
      if (prov) {
        prov.status = 'available';
        prov.reliability_score = Math.min(10, (prov.reliability_score || 8) + 0.5);
      }
      const req = _requests.find(r => r.id === d.request_id);
      if (req) req.status = 'resolved';
    }
    return d;
  },

  listDispatches() {
    return [..._dispatches];
  },

  deleteRequest(id) {
    const idx = _requests.findIndex(r => r.id === id);
    if (idx !== -1) _requests.splice(idx, 1);
    // Also remove related dispatches
    _dispatches = _dispatches.filter(d => d.request_id !== id);
    return { id, deleted: true };
  },

  deleteDispatch(id) {
    const d = _dispatches.find(x => x.id === id);
    if (d) {
      // Free the provider
      const prov = _providers.find(p => p.id === d.provider_id);
      if (prov && (d.status === 'pending_acceptance' || d.status === 'accepted')) {
        prov.status = 'available';
      }
      // Revert request if not completed
      if (d.status !== 'completed') {
        const req = _requests.find(r => r.id === d.request_id);
        if (req) req.status = 'pending';
      }
      _dispatches = _dispatches.filter(x => x.id !== id);
    }
    return { id, deleted: true };
  },

  clearResolvedRequests() {
    const resolved = _requests.filter(r => r.status === 'resolved');
    _requests = _requests.filter(r => r.status !== 'resolved');
    return { deleted: resolved.length };
  },

  // ─── AI ───────────────────────────────────────────
  analyzeText(text) {
    return mockAnalyzeText(text);
  },

  generateSitrep() {
    const pending = _requests.filter(r => r.status === 'pending').length;
    const assigned = _requests.filter(r => r.status === 'assigned').length;
    const resolved = _requests.filter(r => r.status === 'resolved').length;
    const total = _requests.length;

    return {
      report: `## 📋 SRAS Situation Report\n**Generated:** ${new Date().toLocaleString()}\n\n## Current Status\n- **Total Requests:** ${total}\n- **Pending:** ${pending}\n- **Assigned:** ${assigned}\n- **Resolved:** ${resolved}\n\n## Analysis\n${pending > 5 ? '⚠️ **HIGH VOLUME** — Request queue exceeding normal capacity. Consider deploying additional providers.' : '✅ Current request volume is within manageable range.'}\n\n## Resource Distribution\n- Food requests: ${_requests.filter(r => r.type === 'food').length}\n- Medical requests: ${_requests.filter(r => r.type === 'medical').length}\n- Shelter requests: ${_requests.filter(r => r.type === 'shelter').length}\n- Critical requests: ${_requests.filter(r => r.type === 'critical').length}\n\n## Active Providers\n- **Total:** ${_providers.length}\n- **Available:** ${_providers.filter(p => p.status === 'available').length}\n- **Dispatched:** ${_providers.filter(p => p.status === 'dispatched').length}\n\n## Recommendation\n${_providers.length === 0 ? '🔴 No providers registered. Recruit resources immediately.' : pending > resolved ? '🟡 More requests incoming than resolved. Scale up response capacity.' : '🟢 Operations running smoothly. Continue monitoring.'}`,
      generated_at: new Date().toISOString(),
    };
  },

  forecastZone(zone) {
    const risks = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
    const pendingInZone = _requests.filter(r => r.status === 'pending').length;
    const riskIdx = Math.min(3, Math.floor(pendingInZone / 3));

    return {
      zone,
      risk_level: risks[riskIdx],
      predicted_requests: {
        food: 2 + Math.floor(Math.random() * 6),
        medical: 1 + Math.floor(Math.random() * 4),
        shelter: 1 + Math.floor(Math.random() * 3),
      },
      recommendation: riskIdx >= 2
        ? 'Deploy additional medical and food units to this zone. High demand expected in next 6 hours.'
        : 'Maintain current resource levels. Monitor for changes.',
      reasoning: `Based on ${_requests.length} historical requests and ${_providers.length} available providers in the region.`,
    };
  },

  // ─── Stats ────────────────────────────────────────
  getDashboardStats() {
    const pending = _requests.filter(r => r.status === 'pending');
    const resolved = _requests.filter(r => r.status === 'resolved');
    const pendingByType = {};
    pending.forEach(r => {
      pendingByType[r.type] = (pendingByType[r.type] || 0) + 1;
    });

    const waitTimes = pending.map(r => {
      return (Date.now() - new Date(r.created_at).getTime()) / 60000;
    });
    const avgWait = waitTimes.length > 0
      ? waitTimes.reduce((s, v) => s + v, 0) / waitTimes.length
      : 0;

    return {
      total_pending: pending.length,
      pending_by_type: pendingByType,
      avg_wait_minutes: avgWait,
      total_resolved_today: resolved.length,
      resolution_rate_today: _requests.length > 0 ? resolved.length / _requests.length : 0,
      active_providers: _providers.filter(p => p.status === 'available').length,
      total_providers: _providers.length,
    };
  },

  // ─── Seed Demo Data ───────────────────────────────
  seedDemoData() {
    const now = Date.now();
    const demoRequests = [
      {
        type: 'medical', severity: 9, description: '🚨 Multiple casualties reported from building collapse. Need ambulances and medical teams urgently.',
        location: { lat: 12.9716 + (Math.random() - 0.5) * 0.05, lng: 77.5946 + (Math.random() - 0.5) * 0.05, address: 'MG Road, Bengaluru', zone: 'Zone-A' },
        is_verified: true, requester_id: 'demo-1',
      },
      {
        type: 'food', severity: 6, description: 'Community of 200+ displaced families needs food and clean water supplies. Children and elderly affected.',
        location: { lat: 12.9816 + (Math.random() - 0.5) * 0.03, lng: 77.5846 + (Math.random() - 0.5) * 0.03, address: 'Indiranagar, Bengaluru', zone: 'Zone-A' },
        is_verified: true, requester_id: 'demo-2',
      },
      {
        type: 'shelter', severity: 7, description: 'Flooding displaced 80 families. Urgent need for temporary shelter and blankets.',
        location: { lat: 12.9616 + (Math.random() - 0.5) * 0.04, lng: 77.6046 + (Math.random() - 0.5) * 0.04, address: 'Whitefield, Bengaluru', zone: 'Zone-B' },
        is_verified: false, requester_id: 'demo-3',
      },
      {
        type: 'critical', severity: 10, description: '🔥 Active fire in residential area, people trapped on upper floors. Fire department en route but need additional rescue support.',
        location: { lat: 12.9550 + (Math.random() - 0.5) * 0.03, lng: 77.5750 + (Math.random() - 0.5) * 0.03, address: 'Jayanagar, Bengaluru', zone: 'Zone-A' },
        is_verified: true, requester_id: 'demo-4',
      },
      {
        type: 'medical', severity: 5, description: 'Elderly patient needs insulin and blood pressure medication. Local pharmacy destroyed.',
        location: { lat: 12.9850 + (Math.random() - 0.5) * 0.03, lng: 77.6100 + (Math.random() - 0.5) * 0.03, address: 'Koramangala, Bengaluru', zone: 'Zone-B' },
        is_verified: false, requester_id: 'demo-5',
      },
    ];

    demoRequests.forEach((data, i) => {
      const id = genId();
      const createdAt = new Date(now - (i * 8 + Math.random() * 10) * 60000).toISOString();
      const gemini = mockAnalyzeText(data.description);
      const request = {
        id,
        ...data,
        status: 'pending',
        priority_score: 0,
        score_breakdown: null,
        gemini_analysis: gemini,
        created_at: createdAt,
        updated_at: createdAt,
      };
      const breakdown = computePriorityScore(request);
      request.priority_score = breakdown.total;
      request.score_breakdown = breakdown;
      _requests.push(request);
    });

    const demoProviders = [
      { name: 'Red Cross Unit 3', organization: 'Red Cross', capability_types: ['medical', 'food'], provider_uid: 'prov-demo-1',
        phone: '+91 98765 43210', age: 34, bio: 'Certified first-aid responder with 8 years of disaster relief experience.', area: 'Central Bengaluru',
        location: { lat: 12.9700 + (Math.random() - 0.5) * 0.02, lng: 77.5900 + (Math.random() - 0.5) * 0.02, address: 'Central Bengaluru', zone: 'Zone-A' } },
      { name: 'UNICEF Relief Team', organization: 'UNICEF', capability_types: ['food', 'shelter'], provider_uid: 'prov-demo-2',
        phone: '+91 91234 56789', age: 29, bio: 'Food distribution and temporary shelter specialist. UN-trained.', area: 'East Bengaluru',
        location: { lat: 12.9800 + (Math.random() - 0.5) * 0.02, lng: 77.6000 + (Math.random() - 0.5) * 0.02, address: 'East Bengaluru', zone: 'Zone-B' } },
      { name: 'City Fire & Rescue', organization: 'Municipal', capability_types: ['critical', 'medical'], provider_uid: 'prov-demo-3',
        phone: '+91 87654 32100', age: 41, bio: 'Municipal fire department. Rescue operations and emergency medical transport.', area: 'South Bengaluru',
        location: { lat: 12.9650 + (Math.random() - 0.5) * 0.02, lng: 77.5850 + (Math.random() - 0.5) * 0.02, address: 'South Bengaluru', zone: 'Zone-A' } },
    ];

    demoProviders.forEach(data => {
      mockAPI.registerProvider(data);
    });

    return { seeded: true, requests: demoRequests.length, providers: demoProviders.length };
  },
};
