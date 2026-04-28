import { useState } from 'react';
import { TYPE_ICONS, formatScore, getSeverityColor, formatWaitTime } from '../lib/priorityUtils';

/**
 * AssignmentCard — Shows current provider assignment details
 */
export default function AssignmentCard({ dispatch, request, onAccept, onComplete }) {
  const [outcome, setOutcome] = useState('resolved');
  const [report, setReport] = useState('');
  if (!dispatch) {
    return (
      <div className="glass-card" style={{ padding: '2rem', textAlign: 'center' }}>
        <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem', animation: 'float 3s ease infinite' }}>✅</div>
        <h4 className="mb-1">No Active Assignment</h4>
        <p className="text-secondary text-sm">
          You'll be notified when a new dispatch is assigned to you.
        </p>
      </div>
    );
  }

  const statusSteps = ['pending_acceptance', 'accepted', 'completed'];
  const currentStep = statusSteps.indexOf(dispatch.status);

  return (
    <div className="glass-card animate-slide-up" style={{ padding: '1.5rem' }}>
      <div className="flex-between mb-2">
        <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {TYPE_ICONS[request?.type] || '📦'} Active Assignment
        </h4>
        <span className={`status-badge ${dispatch.status === 'pending_acceptance' ? 'pending' : dispatch.status === 'accepted' ? 'assigned' : 'resolved'}`}>
          {dispatch.status.replace(/_/g, ' ')}
        </span>
      </div>

      {request && (
        <div style={{
          padding: '1rem',
          borderRadius: 'var(--radius-sm)',
          background: 'var(--bg-glass)',
          border: '1px solid var(--border-subtle)',
          marginBottom: '1rem',
        }}>
          <div className="text-sm fw-600">{request.description}</div>
          <div className="flex-row gap-sm mt-1">
            <span className="text-xs text-muted">
              Severity: <strong style={{ color: getSeverityColor(request.severity) }}>{request.severity}/10</strong>
            </span>
            <span className="text-xs text-muted">
              Score: <strong>{formatScore(request.priority_score)}</strong>
            </span>
          </div>
        </div>
      )}

      {/* Distance & match info */}
      <div className="grid-2 gap-sm mb-2">
        <div className="stat-card glass-card">
          <div className="stat-card-label">Distance</div>
          <div className="stat-card-value" style={{ fontSize: '1.25rem' }}>
            {dispatch.distance_km?.toFixed(1) || '—'} km
          </div>
        </div>
        <div className="stat-card glass-card">
          <div className="stat-card-label">Match Score</div>
          <div className="stat-card-value" style={{ fontSize: '1.25rem', color: 'var(--accent-indigo)' }}>
            {(dispatch.match_score * 100)?.toFixed(0) || '—'}%
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        {dispatch.status === 'pending_acceptance' && (
          <>
            <button className="btn btn-success" onClick={() => onAccept?.(dispatch.id)} style={{ flex: 1 }}>
              ✅ Accept
            </button>
            <button className="btn btn-danger" style={{ flex: 1 }}>
              ❌ Reject
            </button>
          </>
        )}
        {dispatch.status === 'accepted' && (
          <div className="flex-col gap-sm" style={{ width: '100%' }}>
            <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
              <label className="text-xs text-muted mb-1 block">Issue Status</label>
              <select 
                className="form-input text-sm mb-2" 
                value={outcome}
                onChange={(e) => setOutcome(e.target.value)}
                style={{ background: 'var(--bg-card)' }}
              >
                <option value="resolved">✅ Fully Resolved</option>
                <option value="partially_resolved">⚠️ Partially Resolved</option>
                <option value="unable_to_solve">❌ Unable to Solve</option>
              </select>
              
              <label className="text-xs text-muted mb-1 block">Final Report / Notes</label>
              <textarea 
                className="form-input text-sm"
                placeholder="Describe what was done..."
                value={report}
                onChange={(e) => setReport(e.target.value)}
                rows={2}
                style={{ background: 'var(--bg-card)', resize: 'none' }}
              />
            </div>
            
            <button 
              className="btn btn-primary btn-lg mt-1" 
              onClick={() => onComplete?.(dispatch.id, { outcome, report })} 
              style={{ width: '100%' }}
            >
              ✅ Submit Report & Complete
            </button>
          </div>
        )}
        {dispatch.status === 'completed' && (
          <div style={{ width: '100%', textAlign: 'center', padding: '0.75rem' }}>
            <span style={{ color: 'var(--accent-emerald)', fontWeight: 700 }}>
              ✅ Delivery completed
            </span>
            {dispatch.response_time_minutes && (
              <div className="text-xs text-muted mt-1">
                Response time: {formatWaitTime(dispatch.response_time_minutes)}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
