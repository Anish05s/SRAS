import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useDispatches } from '../hooks/useRequests';
import RequestForm from '../components/RequestForm';
import LiveTracker from '../components/LiveTracker';
import ChatPanel from '../components/ChatPanel';

/**
 * RequestPage — Public-facing emergency request submission
 * After submission, shows live tracking of assigned provider
 */
export default function RequestPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { dispatches } = useDispatches();
  const [submittedRequestId, setSubmittedRequestId] = useState(null);

  // Find dispatch for this user's request
  const myDispatch = dispatches.find(d =>
    d.requester_id === (user?.uid || '') ||
    d.request_id === submittedRequestId
  );

  const handleSubmitSuccess = (result) => {
    setSubmittedRequestId(result.id);
    navigate('/dashboard');
  };

  return (
    <div className="page-container" style={{ maxWidth: 720, margin: '0 auto' }}>
      {/* Hero Section */}
      <div className="text-center mb-3 animate-fade-in" style={{ paddingTop: '1rem' }}>
        <div style={{
          display: 'inline-flex', padding: '0.5rem 1rem',
          borderRadius: 'var(--radius-full)',
          background: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid rgba(239, 68, 68, 0.2)',
          marginBottom: '1rem', fontSize: '0.8125rem',
          color: 'var(--accent-rose)', fontWeight: 600,
        }}>
          🚨 Emergency Resource Request
        </div>
        <h1 style={{
          fontSize: '2rem',
          background: 'linear-gradient(135deg, #f1f5f9, #94a3b8)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
        }}>
          Tell Us What You Need
        </h1>
        <p className="text-secondary mt-1" style={{ maxWidth: 480, margin: '0.5rem auto 0' }}>
          Describe your emergency situation. Our AI will automatically classify and prioritize your request
          for the fastest possible response.
        </p>
      </div>

      {/* AI Badge */}
      <div style={{
        display: 'flex', justifyContent: 'center', gap: '0.75rem',
        marginBottom: '2rem', flexWrap: 'wrap',
      }}>
        <div className="ai-badge" style={{ padding: '0.25rem 0.75rem' }}>
          Powered by Gemini AI
        </div>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: '0.375rem',
          padding: '0.25rem 0.75rem', borderRadius: 'var(--radius-full)',
          background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.2)',
          fontSize: '0.6875rem', fontWeight: 600, color: 'var(--accent-emerald)',
        }}>
          🎤 Voice Input Available
        </div>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: '0.375rem',
          padding: '0.25rem 0.75rem', borderRadius: 'var(--radius-full)',
          background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.2)',
          fontSize: '0.6875rem', fontWeight: 600, color: 'var(--accent-blue)',
        }}>
          📡 Shared Real-Time DB
        </div>
      </div>

      {/* Live Tracking Panel — shown when dispatch is assigned */}
      {myDispatch && (
        <div className="mb-3 animate-slide-up">
          <div className="glass-card" style={{ padding: '1rem 1.25rem', marginBottom: '1rem' }}>
            <div className="flex-between">
              <div>
                <h4 style={{ fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span className="tracker-live-dot" style={{ position: 'relative' }} />
                  🚗 Provider Assigned!
                </h4>
                <p className="text-xs text-secondary mt-1">
                  {myDispatch.provider_name || 'A provider'} is{' '}
                  {myDispatch.status === 'accepted' ? 'on their way' : 'reviewing your request'}
                </p>
              </div>
              <span className={`status-badge ${myDispatch.status === 'accepted' ? 'assigned' : 'pending'}`}>
                {myDispatch.status === 'accepted' ? 'EN ROUTE' : 'PENDING'}
              </span>
            </div>
          </div>

          <LiveTracker
            providerId={myDispatch.provider_id}
            providerName={myDispatch.provider_name || 'Provider'}
            requestLocation={myDispatch.request_location}
            providerLocation={myDispatch.provider_location}
            dispatchStatus={myDispatch.status}
            isProvider={false}
          />

          {/* Chat with provider */}
          <ChatPanel
            dispatchId={myDispatch.id}
            currentUserId={user?.uid || submittedRequestId || 'requester'}
            currentUserName={user?.displayName || 'Requester'}
            currentUserRole="requester"
          />
        </div>
      )}

      {/* Request Form */}
      <RequestForm onSubmitSuccess={handleSubmitSuccess} />

      {/* Info Footer */}
      <div style={{
        marginTop: '2rem', padding: '1.25rem',
        borderRadius: 'var(--radius-lg)', background: 'var(--bg-glass)',
        border: '1px solid var(--border-subtle)', textAlign: 'center',
      }}>
        <div className="text-xs text-muted">
          <strong>How it works:</strong> Your request is analyzed by Google Gemini AI to determine urgency and type.
          A bounded priority score is computed using our mathematical model.
          The matching engine then assigns the nearest capable provider.
        </div>
        <div style={{
          display: 'flex', justifyContent: 'center', gap: '2rem',
          marginTop: '0.75rem', flexWrap: 'wrap',
        }}>
          <div className="text-xs text-muted">
            <strong style={{ color: 'var(--text-secondary)' }}>Step 1</strong> Submit Request
          </div>
          <div className="text-xs text-muted">→</div>
          <div className="text-xs text-muted">
            <strong style={{ color: 'var(--text-secondary)' }}>Step 2</strong> AI Classifies
          </div>
          <div className="text-xs text-muted">→</div>
          <div className="text-xs text-muted">
            <strong style={{ color: 'var(--text-secondary)' }}>Step 3</strong> Auto-Dispatch
          </div>
          <div className="text-xs text-muted">→</div>
          <div className="text-xs text-muted">
            <strong style={{ color: 'var(--text-secondary)' }}>Step 4</strong> Live Track
          </div>
        </div>
      </div>
    </div>
  );
}
