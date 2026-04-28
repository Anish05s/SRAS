import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { registerProvider, acceptDispatch, completeDispatch } from '../lib/api';
import { useDispatches } from '../hooks/useRequests';
import { useGeolocation } from '../hooks/useGeolocation';
import { useAuth } from '../contexts/AuthContext';
import AssignmentCard from '../components/AssignmentCard';
import ChatPanel from '../components/ChatPanel';
import LiveTracker from '../components/LiveTracker';

const CAPABILITIES = [
  { value: 'food', icon: '🍽️', label: 'Food Supply' },
  { value: 'medical', icon: '🏥', label: 'Medical Aid' },
  { value: 'shelter', icon: '🏠', label: 'Shelter' },
  { value: 'critical', icon: '🚨', label: 'Critical Emergency' },
];

/**
 * ProviderPage — Provider registration, assignment management,
 * real-time chat & live location tracking (Swiggy/Zomato style)
 */
export default function ProviderPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { location } = useGeolocation();
  const { dispatches } = useDispatches();
  const [registered, setRegistered] = useState(false);
  const [providerData, setProviderData] = useState(null);
  const [name, setName] = useState(user?.displayName || '');
  const [org, setOrg] = useState('');
  const [phone, setPhone] = useState('');
  const [age, setAge] = useState('');
  const [bio, setBio] = useState('');
  const [area, setArea] = useState('');
  const [caps, setCaps] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);
  const [showTracker, setShowTracker] = useState(false);

  const showToast = (msg, type = 'info') => {
    setToast({ message: msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const toggleCap = (cap) => {
    setCaps((prev) =>
      prev.includes(cap) ? prev.filter((c) => c !== cap) : [...prev, cap]
    );
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!name.trim() || caps.length === 0 || !phone.trim() || !age) return;

    setSubmitting(true);
    setError(null);
    try {
      const res = await registerProvider({
        name: name.trim(),
        organization: org.trim(),
        phone: phone.trim(),
        age: parseInt(age, 10),
        bio: bio.trim(),
        area: area.trim(),
        capability_types: caps,
        location: {
          lat: location?.lat || 12.9716,
          lng: location?.lng || 77.5946,
          address: area.trim() || 'Auto-detected',
          zone: 'Zone-A',
        },
        provider_uid: user?.uid || 'provider-' + Date.now(),
        user_email: user?.email || null,
      });
      setProviderData(res.data);
      setRegistered(true);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.detail || err.message);
      setSubmitting(false);
    }
  };

  const handleAccept = async (dispatchId) => {
    try {
      await acceptDispatch(dispatchId);
      showToast('Assignment accepted! Navigate to the emergency.', 'success');
    } catch (err) {
      showToast('Failed to accept: ' + err.message, 'error');
    }
  };

  const handleComplete = async (dispatchId) => {
    try {
      await completeDispatch(dispatchId);
      showToast('Delivery marked complete! +0.5 reliability', 'success');
      setShowTracker(false);
    } catch (err) {
      showToast('Failed to complete: ' + err.message, 'error');
    }
  };

  // Find dispatches for this provider
  const myDispatches = providerData
    ? dispatches.filter((d) => d.provider_id === providerData.id)
    : [];
  const activeDispatch = myDispatches.find(
    (d) => d.status === 'pending_acceptance' || d.status === 'accepted'
  );

  // ─── Registration Form ──────────────────────
  if (!registered) {
    return (
      <div className="page-container" style={{ maxWidth: 600, margin: '0 auto' }}>
        <div className="text-center mb-3 animate-fade-in" style={{ paddingTop: '1rem' }}>
          <div style={{
            display: 'inline-flex', padding: '0.5rem 1rem',
            borderRadius: 'var(--radius-full)',
            background: 'rgba(59, 130, 246, 0.1)',
            border: '1px solid rgba(59, 130, 246, 0.2)',
            marginBottom: '1rem', fontSize: '0.8125rem',
            color: 'var(--accent-blue)', fontWeight: 600,
          }}>
            🤝 Resource Provider Portal
          </div>
          <h1 style={{
            fontSize: '2rem',
            background: 'linear-gradient(135deg, #f1f5f9, #94a3b8)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}>
            Register as a Provider
          </h1>
          <p className="text-secondary mt-1">
            Join the network to receive dispatch assignments and help those in need.
          </p>
        </div>

        <form onSubmit={handleRegister} className="flex-col gap-lg glass-card animate-slide-up" style={{ padding: '2rem' }}>
          {/* ── Contact Details Section ── */}
          <div style={{
            padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)',
            background: 'rgba(59, 130, 246, 0.06)',
            border: '1px solid rgba(59, 130, 246, 0.12)',
            marginBottom: '0.5rem',
          }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent-blue)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              📋 Contact Details
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Your Name / Team Name *</label>
            <input
              className="form-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Red Cross Unit 3"
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">📞 Phone Number *</label>
              <input
                className="form-input"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 98765 43210"
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">🎂 Age *</label>
              <input
                className="form-input"
                type="number"
                min="18"
                max="100"
                value={age}
                onChange={(e) => setAge(e.target.value)}
                placeholder="e.g., 28"
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Organization (optional)</label>
            <input
              className="form-input"
              value={org}
              onChange={(e) => setOrg(e.target.value)}
              placeholder="e.g., Red Cross, UNICEF, Local NGO"
            />
          </div>

          <div className="form-group">
            <label className="form-label">📍 Area / Locality</label>
            <input
              className="form-input"
              value={area}
              onChange={(e) => setArea(e.target.value)}
              placeholder="e.g., Koramangala, Bengaluru"
            />
          </div>

          <div className="form-group">
            <label className="form-label">📝 Bio / Skills (optional)</label>
            <textarea
              className="form-input"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Describe your skills, experience, certifications..."
              rows={3}
              style={{ resize: 'vertical', minHeight: '80px' }}
            />
          </div>

          {/* ── Capabilities Section ── */}
          <div style={{
            padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)',
            background: 'rgba(16, 185, 129, 0.06)',
            border: '1px solid rgba(16, 185, 129, 0.12)',
            marginBottom: '0.5rem', marginTop: '0.5rem',
          }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent-emerald)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              ⚡ Capabilities
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Select all that apply *</label>
            <div className="type-selector">
              {CAPABILITIES.map((c) => (
                <div
                  key={c.value}
                  className={`type-option ${caps.includes(c.value) ? 'selected' : ''}`}
                  onClick={() => toggleCap(c.value)}
                >
                  <div className="type-option-icon">{c.icon}</div>
                  <div className="type-option-label">{c.label}</div>
                </div>
              ))}
            </div>
          </div>

          {error && (
            <div className="toast error" style={{ position: 'static', maxWidth: '100%' }}>
              ❌ {error}
            </div>
          )}

          <button
            type="submit"
            className="btn btn-primary btn-lg"
            disabled={submitting || !name.trim() || caps.length === 0 || !phone.trim() || !age}
            style={{ width: '100%' }}
          >
            {submitting ? 'Registering...' : '✅ Register as Provider'}
          </button>
        </form>
      </div>
    );
  }

  // ─── Provider Dashboard ─────────────────────
  return (
    <div className="page-container" style={{ maxWidth: 700, margin: '0 auto' }}>
      {toast && (
        <div className="toast-container">
          <div className={`toast ${toast.type}`}>{toast.message}</div>
        </div>
      )}

      <div className="flex-between mb-2 animate-fade-in">
        <div>
          <h2>👋 Welcome, {providerData.name}</h2>
          <p className="text-sm text-secondary">{providerData.organization || 'Independent Provider'}</p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div className="text-xs text-muted">Reliability Score</div>
          <div style={{
            fontSize: '1.5rem', fontWeight: 800, fontFamily: 'JetBrains Mono',
            color: providerData.reliability_score >= 7 ? 'var(--accent-emerald)' : 'var(--accent-amber)',
          }}>
            {providerData.reliability_score.toFixed(1)}
          </div>
        </div>
      </div>

      {/* Status Card */}
      <div className="glass-card mb-2" style={{ padding: '1rem 1.25rem' }}>
        <div className="flex-between">
          <div className="flex-row gap-sm">
            <span className={`status-badge ${providerData.status === 'available' ? 'resolved' : 'assigned'}`}>
              {providerData.status}
            </span>
            <span className="text-sm text-secondary">
              Capabilities: {providerData.capability_types.map(t => CAPABILITIES.find(c => c.value === t)?.icon || '📦').join(' ')}
            </span>
          </div>
          <span className="text-xs text-muted">ID: {providerData.id}</span>
        </div>
        {/* Contact Info Summary */}
        <div style={{ marginTop: '0.75rem', display: 'flex', gap: '1rem', flexWrap: 'wrap', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
          {providerData.phone && <span>📞 {providerData.phone}</span>}
          {providerData.age && <span>🎂 Age {providerData.age}</span>}
          {providerData.area && <span>📍 {providerData.area}</span>}
        </div>
      </div>

      {/* Active Assignment */}
      <AssignmentCard
        dispatch={activeDispatch}
        request={null}
        onAccept={handleAccept}
        onComplete={handleComplete}
      />

      {/* Live Tracker — Swiggy/Zomato style */}
      {activeDispatch && (activeDispatch.status === 'accepted' || activeDispatch.status === 'pending_acceptance') && (
        <div className="mt-2">
          <button
            className="btn btn-secondary mb-1"
            onClick={() => setShowTracker(!showTracker)}
            style={{ width: '100%' }}
          >
            {showTracker ? '🗺️ Hide Live Map' : '🗺️ Show Live Tracking Map'}
          </button>

          {showTracker && (
            <LiveTracker
              providerId={providerData.id}
              providerName={providerData.name}
              requestLocation={activeDispatch.request_location}
              providerLocation={providerData.location}
              dispatchStatus={activeDispatch.status}
              isProvider={true}
            />
          )}
        </div>
      )}

      {/* Chat Panel — floating */}
      {activeDispatch && (
        <ChatPanel
          dispatchId={activeDispatch.id}
          currentUserId={providerData.id}
          currentUserName={providerData.name}
          currentUserRole="provider"
        />
      )}

      {/* History */}
      {myDispatches.length > 0 && (
        <div className="glass-card mt-2" style={{ overflow: 'hidden' }}>
          <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border-subtle)' }}>
            <h4 style={{ fontSize: '0.875rem' }}>📋 Assignment History</h4>
          </div>
          {myDispatches.map((d) => (
            <div key={d.id} className="request-item">
              <div className={`status-badge ${d.status === 'completed' ? 'resolved' : d.status === 'accepted' ? 'assigned' : 'pending'}`}>
                {d.status.replace(/_/g, ' ')}
              </div>
              <div className="request-info">
                <div className="text-sm">Request: {d.request_id?.slice(0, 8)}...</div>
                <div className="text-xs text-muted">
                  {d.distance_km?.toFixed(1)}km away • Score: {(d.match_score * 100).toFixed(0)}%
                </div>
              </div>
              {d.response_time_minutes && (
                <div className="text-xs text-muted">
                  {d.response_time_minutes.toFixed(0)}min
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
