import { TYPE_ICONS, getSeverityColor, formatScore, formatWaitTime } from '../lib/priorityUtils';

/**
 * PriorityQueue — Live sortable list of pending requests
 * Now includes per-item delete button for manual request removal.
 */
export default function PriorityQueue({ requests, onSelect, onDelete }) {
  const pending = requests
    .filter((r) => r.status === 'pending' || r.status === 'assigned')
    .sort((a, b) => (b.priority_score || 0) - (a.priority_score || 0));

  if (pending.length === 0) {
    return (
      <div className="glass-card" style={{ padding: '2rem', textAlign: 'center' }}>
        <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>✅</div>
        <div className="text-secondary">No pending requests</div>
        <div className="text-xs text-muted mt-1">All requests have been resolved</div>
      </div>
    );
  }

  return (
    <div className="glass-card" style={{ overflow: 'hidden' }}>
      <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border-subtle)' }}>
        <div className="flex-between">
          <h4 style={{ fontSize: '0.875rem', fontWeight: 700 }}>
            🔥 Priority Queue
          </h4>
          <span className="text-xs text-muted">{pending.length} requests</span>
        </div>
      </div>

      <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
        {pending.map((req, idx) => {
          const created = new Date(req.created_at);
          const minsAgo = Math.round((Date.now() - created.getTime()) / 60000);

          return (
            <div
              key={req.id}
              className="request-item"
              onClick={() => onSelect?.(req)}
            >
              <div className="request-rank" style={{
                borderColor: idx === 0 ? 'var(--accent-rose)' : 'var(--border-subtle)',
                color: idx === 0 ? 'var(--accent-rose)' : 'var(--text-secondary)',
              }}>
                {idx + 1}
              </div>

              <div className="request-type-icon">
                {TYPE_ICONS[req.type] || '📦'}
              </div>

              <div className="request-info">
                <div className="request-desc">{req.description}</div>
                <div className="request-meta">
                  <span className={`status-badge ${req.status}`}>
                    {req.status.replace('_', ' ')}
                  </span>
                  <span>⏱ {formatWaitTime(minsAgo)}</span>
                  <span style={{ color: getSeverityColor(req.severity) }}>
                    Sev: {req.severity}/10
                  </span>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div className="request-score" style={{
                  color: getSeverityColor(req.severity),
                }}>
                  {formatScore(req.priority_score)}
                </div>

                {onDelete && (
                  <button
                    className="btn-delete-sm"
                    title="Delete this request"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(req);
                    }}
                  >
                    🗑️
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
