import { useState } from 'react';
import { useRequests, useProviders, useDispatches } from '../hooks/useRequests';
import { runDispatch, seedDemoData, deleteRequest, deleteDispatch, clearResolvedRequests } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import MapView from '../components/MapView';
import PriorityQueue from '../components/PriorityQueue';
import PriorityScoreCard from '../components/PriorityScoreCard';
import AIInsightCard from '../components/AIInsightCard';
import SitrepModal from '../components/SitrepModal';
import LiveTracker from '../components/LiveTracker';
import ConfirmDialog from '../components/ConfirmDialog';
import ChatPanel from '../components/ChatPanel';
import { TYPE_ICONS, formatWaitTime } from '../lib/priorityUtils';

import Bucket from '../components/ui/bucket';
import { BackgroundPaths } from '../components/ui/background-paths';

/**
 * Dashboard Page — Admin Command Center
 * Shows live map, priority queue, stats, AI insights,
 * and real-time provider tracking (Swiggy-style)
 */
export default function Dashboard() {
  const { user } = useAuth();
  const { requests, stats, loading, refetch } = useRequests();
  const { providers } = useProviders();
  const { dispatches } = useDispatches();
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showSitrep, setShowSitrep] = useState(false);
  const [dispatching, setDispatching] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [toast, setToast] = useState(null);
  const [trackedDispatch, setTrackedDispatch] = useState(null);
  const [activeCommunityChatId, setActiveCommunityChatId] = useState(null);
  const [communityChatName, setCommunityChatName] = useState('');
  const [communitySearch, setCommunitySearch] = useState('');

  // Confirm dialog state
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false, title: '', message: '', variant: 'danger',
    onConfirm: () => {},
  });

  const showToast = (message, type = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const openConfirm = (title, message, onConfirm, variant = 'danger') => {
    setConfirmDialog({ isOpen: true, title, message, variant, onConfirm });
  };

  const closeConfirm = () => {
    setConfirmDialog(prev => ({ ...prev, isOpen: false }));
  };

  // ─── Dispatch ────────────────────────────────
  const handleDispatch = async () => {
    setDispatching(true);
    try {
      const res = await runDispatch();
      const data = res.data;
      showToast(`Dispatched: ${data.matched} matched, ${data.unmatched} unmatched`, 'success');
      refetch();
    } catch (err) {
      showToast('Dispatch failed: ' + (err.response?.data?.detail || err.message), 'error');
    } finally {
      setDispatching(false);
    }
  };

  const handleSeed = async () => {
    setSeeding(true);
    try {
      await seedDemoData();
      showToast('Demo data seeded! 5 requests + 3 providers loaded.', 'success');
      refetch();
    } catch (err) {
      showToast('Seed failed: ' + err.message, 'error');
    } finally {
      setSeeding(false);
    }
  };

  // ─── Delete Handlers ─────────────────────────
  const handleDeleteRequest = (req) => {
    openConfirm(
      'Delete Request',
      `Remove "${req.description?.substring(0, 50)}..." from the queue? This cannot be undone.`,
      async () => {
        closeConfirm();
        try {
          await deleteRequest(req.id);
          showToast('Request deleted.', 'success');
          refetch();
        } catch (err) {
          showToast('Delete failed: ' + err.message, 'error');
        }
      }
    );
  };

  const handleDeleteDispatch = (d) => {
    openConfirm(
      'Delete Dispatch',
      `Remove dispatch for "${d.provider_name || d.provider_id?.slice(0, 8)}"? The provider will be freed and the request reverted to pending.`,
      async () => {
        closeConfirm();
        try {
          await deleteDispatch(d.id);
          showToast('Dispatch deleted. Provider freed.', 'success');
          setTrackedDispatch(null);
          refetch();
        } catch (err) {
          showToast('Delete failed: ' + err.message, 'error');
        }
      }
    );
  };

  const handleClearResolved = () => {
    const resolvedCount = requests.filter(r => r.status === 'resolved').length;
    if (resolvedCount === 0) {
      showToast('No resolved requests to clear.', 'info');
      return;
    }
    openConfirm(
      'Clear All Resolved',
      `Remove ${resolvedCount} resolved request${resolvedCount > 1 ? 's' : ''} from the database? This cannot be undone.`,
      async () => {
        closeConfirm();
        try {
          const res = await clearResolvedRequests();
          showToast(`Cleared ${res.data?.deleted || 0} resolved requests.`, 'success');
          refetch();
        } catch (err) {
          showToast('Clear failed: ' + err.message, 'error');
        }
      },
      'warning'
    );
  };

  // Active dispatches for tracking
  const activeDispatches = dispatches.filter(
    d => d.status === 'accepted' || d.status === 'pending_acceptance'
  );

  // Community feed filtering
  const searchLower = communitySearch.toLowerCase();
  const filteredRequests = requests.filter(r =>
    r.status === 'pending' && (
      !searchLower ||
      r.type?.toLowerCase().includes(searchLower) ||
      r.description?.toLowerCase().includes(searchLower) ||
      r.location?.zone?.toLowerCase().includes(searchLower) ||
      r.location?.address?.toLowerCase().includes(searchLower)
    )
  );
  const filteredProviders = providers.filter(p =>
    p.status === 'available' && (
      !searchLower ||
      p.name?.toLowerCase().includes(searchLower) ||
      p.organization?.toLowerCase().includes(searchLower) ||
      p.capability_types?.some(t => t.includes(searchLower)) ||
      p.area?.toLowerCase().includes(searchLower) ||
      p.location?.zone?.toLowerCase().includes(searchLower)
    )
  );

  // Loading skeleton
  if (loading && !stats) {
    return (
      <div className="page-container">
        <div className="grid-4 mb-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="glass-card stat-card">
              <div className="skeleton skeleton-text" style={{ width: '60%' }} />
              <div className="skeleton skeleton-title mt-1" style={{ width: '40%' }} />
            </div>
          ))}
        </div>
        <div className="dashboard-layout">
          <div className="dashboard-map">
            <div className="skeleton skeleton-card" style={{ height: '100%' }} />
          </div>
          <div className="dashboard-sidebar">
            <div className="skeleton skeleton-card" />
            <div className="skeleton skeleton-card" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container" style={{ position: 'relative' }}>
      {/* Background Paths rendered purely for aesthetics */}
      <div className="absolute inset-0 z-[-1] pointer-events-none overflow-hidden opacity-30">
        <BackgroundPaths title="" />
      </div>

      {/* Toast */}
      {toast && (
        <div className="toast-container z-50">
          <div className={`toast ${toast.type}`}>{toast.message}</div>
        </div>
      )}

      {/* Confirm Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        variant={confirmDialog.variant}
        confirmLabel={confirmDialog.variant === 'danger' ? '🗑️ Delete' : '🧹 Clear'}
        onConfirm={confirmDialog.onConfirm}
        onCancel={closeConfirm}
      />

      {/* Header Controls */}
      <div className="flex-between mb-2">
        <div>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            📡 Command Center
          </h2>
          <p className="text-sm text-secondary">
            Real-time operational dashboard •{' '}
            <span style={{ color: 'var(--accent-emerald)' }}>● Live</span>
            {' '}• {requests.length} requests shared across all users
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button className="btn btn-secondary btn-sm" onClick={handleSeed} disabled={seeding}>
            {seeding ? '...' : '🌱 Seed Data'}
          </button>
          <button className="btn btn-secondary btn-sm" onClick={() => setShowSitrep(true)}>
            📋 AI SITREP
          </button>
          <button
            className="btn-clear-resolved"
            onClick={handleClearResolved}
            title="Remove all resolved requests"
          >
            🧹 Clear Resolved
          </button>
          <button
            className="btn btn-primary"
            onClick={handleDispatch}
            disabled={dispatching}
          >
            {dispatching ? '⏳ Running...' : '⚡ Run Dispatch'}
          </button>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid-4 mb-2">
        <div className="glass-card stat-card">
          <div className="stat-card-label">Pending Requests</div>
          <div className="stat-card-value" style={{ color: 'var(--accent-amber)' }}>
            {stats?.total_pending || 0}
          </div>
          <div className="stat-card-sub">
            {stats?.pending_by_type ? Object.entries(stats.pending_by_type).map(([t, c]) => (
              <span key={t} style={{ marginRight: '0.5rem' }}>{TYPE_ICONS[t]} {c}</span>
            )) : '—'}
          </div>
        </div>

        <div className="glass-card stat-card">
          <div className="stat-card-label">Avg Wait Time</div>
          <div className="stat-card-value" style={{ color: 'var(--accent-cyan)' }}>
            {stats?.avg_wait_minutes ? formatWaitTime(stats.avg_wait_minutes) : '—'}
          </div>
          <div className="stat-card-sub">Current queue average</div>
        </div>

        <div className="glass-card stat-card">
          <div className="stat-card-label">Resolution Rate</div>
          <div className="stat-card-value" style={{ color: 'var(--accent-emerald)' }}>
            {stats?.resolution_rate_today ? `${(stats.resolution_rate_today * 100).toFixed(0)}%` : '—'}
          </div>
          <div className="stat-card-sub">{stats?.total_resolved_today || 0} resolved today</div>
        </div>

        <div className="glass-card stat-card">
          <div className="stat-card-label">Active Providers</div>
          <div className="stat-card-value" style={{ color: 'var(--accent-indigo)' }}>
            {stats?.active_providers || 0}
          </div>
          <div className="stat-card-sub">{stats?.total_providers || 0} total registered</div>
        </div>
      </div>

      {/* Active Tracking Panel */}
      {activeDispatches.length > 0 && (
        <div className="glass-card mb-2" style={{ padding: '1rem 1.25rem' }}>
          <div className="flex-between mb-1">
            <h4 style={{ fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span className="tracker-live-dot" style={{ position: 'relative' }} />
              🚗 Active Dispatches ({activeDispatches.length})
            </h4>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {activeDispatches.map(d => (
              <div key={d.id} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <button
                  className={`btn btn-sm ${trackedDispatch?.id === d.id ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setTrackedDispatch(trackedDispatch?.id === d.id ? null : d)}
                >
                  🚗 {d.provider_name || d.provider_id?.slice(0, 8)} →{' '}
                  {d.request_type || 'unknown'}
                  <span className={`status-badge ${d.status === 'accepted' ? 'assigned' : 'pending'}`}
                    style={{ marginLeft: '0.5rem', fontSize: '0.625rem', padding: '0.125rem 0.375rem' }}>
                    {d.status === 'accepted' ? 'EN ROUTE' : 'PENDING'}
                  </span>
                </button>
                <button
                  className="btn-delete-sm"
                  title="Delete this dispatch"
                  onClick={() => handleDeleteDispatch(d)}
                >
                  🗑️
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Live Tracker (Swiggy-style) — shown when a dispatch is selected */}
      {trackedDispatch && (
        <div className="mb-2 animate-slide-up">
          <LiveTracker
            providerId={trackedDispatch.provider_id}
            providerName={trackedDispatch.provider_name || 'Provider'}
            requestLocation={trackedDispatch.request_location}
            providerLocation={trackedDispatch.provider_location}
            dispatchStatus={trackedDispatch.status}
            isProvider={false}
          />
        </div>
      )}

      {/* Main Layout: Map + Sidebar */}
      <div className="dashboard-layout mb-4">
        {/* Map Area */}
        <div className="dashboard-map glass-card" style={{ overflow: 'hidden' }}>
          <MapView
            requests={requests}
            providers={providers}
            onSelectRequest={setSelectedRequest}
          />
        </div>

        {/* Sidebar */}
        <div className="dashboard-sidebar">
          {/* Selected Request Detail */}
          {selectedRequest && (
            <div className="animate-slide-up">
              <PriorityScoreCard
                scoreBreakdown={selectedRequest.score_breakdown}
                severity={selectedRequest.severity}
              />
            </div>
          )}

          {/* AI Insight */}
          <AIInsightCard zone="Zone-A" />

          {/* Priority Queue */}
          <PriorityQueue
            requests={requests}
            onSelect={setSelectedRequest}
            onDelete={handleDeleteRequest}
          />
        </div>
      </div>

      {/* Advanced UI Sections */}
      <div className="mt-8">
        {/* Bucket Status Chips */}
        <div className="glass-card p-6 flex flex-col items-center justify-center min-h-[400px] mb-8">
          <h3 className="text-xl font-semibold text-white mb-6 w-full text-center">System Process Flow (Inbox)</h3>
          <Bucket />
        </div>

        {/* Community Feed / Public Board */}
        <div className="glass-card community-feed-card">
          <h3 className="community-feed-title">🌍 Local Community Feed</h3>
          <p className="community-feed-subtitle">
            See who needs help and who is offering help in your city. Contact them directly.
          </p>

          {/* Search / Filter Bar */}
          <div className="community-search-bar">
            <span className="community-search-icon">🔍</span>
            <input
              className="community-search-input"
              type="text"
              placeholder="Search by type, zone, name, or keyword..."
              value={communitySearch}
              onChange={(e) => setCommunitySearch(e.target.value)}
            />
            {communitySearch && (
              <button
                className="community-search-clear"
                onClick={() => setCommunitySearch('')}
              >
                ✕
              </button>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
            {/* People Needing Help */}
            <div className="community-section community-section-need">
              <h4 className="community-section-title" style={{ color: 'var(--accent-rose)' }}>🚨 People Needing Help</h4>
              <div className="community-list">
                {filteredRequests.map(req => (
                  <div key={req.id} className="community-card">
                    <div className="community-card-body">
                      <div className="community-card-header">
                        <span className="community-card-type">{TYPE_ICONS[req.type] || '📦'} {req.type?.toUpperCase()}</span>
                        <span className="community-card-severity" style={{ 
                          background: req.severity >= 8 ? 'rgba(239, 68, 68, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                          color: req.severity >= 8 ? 'var(--accent-rose)' : 'var(--accent-amber)',
                        }}>
                          Sev {req.severity}/10
                        </span>
                      </div>
                      <p className="community-card-desc">{req.description?.substring(0, 80)}...</p>
                      <div className="community-card-meta">
                        <span>📍 {req.location?.zone || 'Unknown'}</span>
                        {req.location?.address && <span>• {req.location.address}</span>}
                      </div>
                    </div>
                    <div className="community-card-actions">
                      <button className="btn btn-sm btn-primary" onClick={() => {
                        setActiveCommunityChatId(req.id);
                        setCommunityChatName(`Requester (${req.type})`);
                      }}>
                        💬 Contact
                      </button>
                      <button
                        className="btn-delete-sm"
                        title="Delete request"
                        onClick={() => handleDeleteRequest(req)}
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                ))}
                {filteredRequests.length === 0 && (
                  <div className="community-empty">
                    <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🕊️</div>
                    <div>No pending requests{communitySearch ? ' matching your search' : ' right now'}.</div>
                  </div>
                )}
              </div>
            </div>

            {/* Available Providers */}
            <div className="community-section community-section-help">
              <h4 className="community-section-title" style={{ color: 'var(--accent-blue)' }}>🤝 Available Providers</h4>
              <div className="community-list">
                {filteredProviders.map(prov => (
                  <div key={prov.id} className="community-card community-card-provider">
                    <div className="community-card-body">
                      <div className="community-card-header">
                        <span className="community-card-name">
                          {prov.name}
                          {prov.is_verified && (
                            <span className="verified-badge" title="Verified Provider">✅</span>
                          )}
                        </span>
                        {prov.reliability_score && (
                          <span className="community-card-reliability" style={{
                            color: prov.reliability_score >= 8 ? 'var(--accent-emerald)' : 'var(--accent-amber)',
                          }}>
                            ★ {prov.reliability_score.toFixed(1)}
                          </span>
                        )}
                      </div>
                      {prov.organization && (
                        <div className="community-card-org">{prov.organization}</div>
                      )}
                      <div className="community-card-caps">
                        {prov.capability_types?.map(t => (
                          <span key={t} className="community-cap-tag">{TYPE_ICONS[t] || '📦'} {t}</span>
                        ))}
                      </div>

                      {/* Contact Details */}
                      <div className="community-card-contact">
                        {prov.phone && <span className="contact-item">📞 {prov.phone}</span>}
                        {prov.age && <span className="contact-item">🎂 Age {prov.age}</span>}
                        {prov.area && <span className="contact-item">📍 {prov.area}</span>}
                      </div>
                      {prov.bio && (
                        <p className="community-card-bio">{prov.bio}</p>
                      )}

                      <div className="community-card-meta">
                        <span>📍 {prov.location?.zone || 'Unknown'}</span>
                      </div>
                    </div>
                    <div className="community-card-actions">
                      <button className="btn btn-sm btn-secondary" onClick={() => {
                        setActiveCommunityChatId(prov.id);
                        setCommunityChatName(prov.name);
                      }}>
                        💬 Contact
                      </button>
                      {prov.phone && (
                        <a
                          href={`tel:${prov.phone.replace(/\s/g, '')}`}
                          className="btn btn-sm btn-call"
                          onClick={(e) => e.stopPropagation()}
                        >
                          📞 Call
                        </a>
                      )}
                    </div>
                  </div>
                ))}
                {filteredProviders.length === 0 && (
                  <div className="community-empty">
                    <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🤷</div>
                    <div>No available providers{communitySearch ? ' matching your search' : ' right now'}.</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Recently Resolved / Activity Log */}
        <div className="glass-card mt-8" style={{ padding: '2rem' }}>
          <h3 className="community-feed-title" style={{ color: 'var(--accent-emerald)' }}>✅ Recent Resolution Activity</h3>
          <p className="community-feed-subtitle">
            Historical log of solved issues and provider reports.
          </p>
          
          <div className="community-list mt-4">
            {requests.filter(r => r.status === 'resolved' || r.status === 'partially_resolved').slice(0, 10).map(req => (
              <div key={req.id} className="glass-card mb-2" style={{ padding: '1rem', borderLeft: `4px solid ${req.status === 'resolved' ? 'var(--accent-emerald)' : 'var(--accent-amber)'}` }}>
                <div className="flex-between mb-1">
                  <div className="flex-row gap-sm">
                    <span className="text-sm fw-600">{TYPE_ICONS[req.type]} {req.description?.substring(0, 60)}...</span>
                    <span className={`status-badge ${req.status === 'resolved' ? 'resolved' : 'pending'}`} style={{ fontSize: '0.625rem' }}>
                      {req.status?.toUpperCase().replace('_', ' ')}
                    </span>
                  </div>
                  <span className="text-xs text-muted">{new Date(req.resolved_at || req.updated_at).toLocaleString()}</span>
                </div>
                
                {req.provider_report && (
                  <div className="mt-2 p-2 rounded bg-black/20 border border-white/5">
                    <div className="text-[10px] text-muted uppercase font-bold mb-1">📋 Provider Report</div>
                    <p className="text-xs text-secondary italic">"{req.provider_report}"</p>
                  </div>
                )}
              </div>
            ))}
            {requests.filter(r => r.status === 'resolved' || r.status === 'partially_resolved').length === 0 && (
              <div className="community-empty">No recently resolved issues.</div>
            )}
          </div>
        </div>
      </div>

      {/* Community Chat Panel */}
      {activeCommunityChatId && (
        <ChatPanel
          dispatchId={activeCommunityChatId}
          currentUserId={user?.uid || 'guest'}
          currentUserName={user?.displayName || 'Community Member'}
          currentUserRole="community"
          autoOpen={true}
          chatTitle={`💬 Chat with ${communityChatName}`}
        />
      )}

      {/* SITREP Modal */}
      <SitrepModal
        isOpen={showSitrep}
        onClose={() => setShowSitrep(false)}
      />
    </div>
  );
}
