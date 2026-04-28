import { useState, useEffect } from 'react';
import { analyzeText, createRequest } from '../lib/api';
import { useGeolocation } from '../hooks/useGeolocation';
import { useVoiceInput } from '../hooks/useVoiceInput';
import { useAuth } from '../contexts/AuthContext';
import PriorityScoreCard from './PriorityScoreCard';

const TYPES = [
  { value: 'food', icon: '🍽️', label: 'Food' },
  { value: 'medical', icon: '🏥', label: 'Medical' },
  { value: 'shelter', icon: '🏠', label: 'Shelter' },
  { value: 'critical', icon: '🚨', label: 'Critical' },
];

/**
 * RequestForm — Submit emergency requests with voice input + Gemini preview
 */
export default function RequestForm({ onSubmitSuccess }) {
  const { user } = useAuth();
  const { location, loading: geoLoading } = useGeolocation();
  const { transcript, isListening, isSupported, startListening, stopListening, resetTranscript } = useVoiceInput();

  const [type, setType] = useState('food');
  const [description, setDescription] = useState('');
  const [severity, setSeverity] = useState(5);
  const [isVerified, setIsVerified] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState(null);
  const [geminiPreview, setGeminiPreview] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState(null);

  // Sync voice transcript to description
  useEffect(() => {
    if (transcript) {
      setDescription(transcript);
    }
  }, [transcript]);

  // Debounced Gemini analysis
  useEffect(() => {
    if (description.length < 10) {
      setGeminiPreview(null);
      return;
    }

    const timer = setTimeout(async () => {
      setAnalyzing(true);
      try {
        const res = await analyzeText(description);
        setGeminiPreview(res.data);
      } catch (err) {
        console.error('Gemini analysis failed:', err);
      } finally {
        setAnalyzing(false);
      }
    }, 800);

    return () => clearTimeout(timer);
  }, [description]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!description.trim()) return;

    setSubmitting(true);
    setError(null);

    try {
      const payload = {
        type,
        description: description.trim(),
        severity,
        location: {
          lat: location?.lat || 12.9716,
          lng: location?.lng || 77.5946,
          address: 'Auto-detected',
          zone: 'Zone-A',
        },
        is_verified: isVerified,
        requester_id: user?.uid || 'web-user-' + Date.now(),
      };

      const res = await createRequest(payload);
      setResult(res.data);
      setSubmitted(true);
      onSubmitSuccess?.(res.data);
    } catch (err) {
      setError(err.response?.data?.detail || err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = () => {
    setDescription('');
    setSeverity(5);
    setType('food');
    setIsVerified(false);
    setSubmitted(false);
    setResult(null);
    setGeminiPreview(null);
    resetTranscript();
    setError(null);
  };

  // ─── Submitted Confirmation ─────────────────
  if (submitted && result) {
    return (
      <div className="animate-slide-up flex-col gap-lg">
        <div className="glass-card" style={{ padding: '2rem', textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>✅</div>
          <h3>Request Submitted Successfully</h3>
          <p className="text-secondary mt-1">
            Your emergency request has been registered and prioritized.
          </p>
        </div>

        <PriorityScoreCard
          scoreBreakdown={result.score_breakdown}
          queuePosition={result.queue_position}
          severity={result.severity}
        />

        {result.gemini_analysis && result.gemini_analysis.confidence > 0 && (
          <div className="glass-card" style={{ padding: '1.25rem' }}>
            <div className="flex-between mb-1">
              <span className="ai-badge">Gemini Classification</span>
              <div className="confidence-meter">
                <div className="confidence-bar">
                  <div className="confidence-fill" style={{
                    width: `${(result.gemini_analysis.confidence * 100)}%`,
                    background: result.gemini_analysis.confidence > 0.8 ? '#22c55e' : '#eab308',
                  }} />
                </div>
                <span className="confidence-text" style={{
                  color: result.gemini_analysis.confidence > 0.8 ? '#22c55e' : '#eab308',
                }}>
                  {(result.gemini_analysis.confidence * 100).toFixed(0)}%
                </span>
              </div>
            </div>
            <div className="text-sm text-secondary" style={{ marginTop: '0.5rem' }}>
              {result.gemini_analysis.reasoning}
            </div>
            {result.gemini_analysis.urgency_keywords?.length > 0 && (
              <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap', marginTop: '0.75rem' }}>
                {result.gemini_analysis.urgency_keywords.map((kw) => (
                  <span key={kw} style={{
                    padding: '0.125rem 0.5rem',
                    borderRadius: '9999px',
                    background: 'rgba(239, 68, 68, 0.1)',
                    color: '#f87171',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                  }}>
                    {kw}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Status Timeline */}
        <div className="glass-card" style={{ padding: '1.5rem' }}>
          <h4 className="text-sm fw-700 mb-2">Live Status</h4>
          <div className="timeline">
            <div className="timeline-step">
              <div className="timeline-dot active">✓</div>
              <div className="timeline-label">Submitted</div>
            </div>
            <div className="timeline-connector" />
            <div className="timeline-step">
              <div className="timeline-dot">2</div>
              <div className="timeline-label">Assigned</div>
            </div>
            <div className="timeline-connector" />
            <div className="timeline-step">
              <div className="timeline-dot">3</div>
              <div className="timeline-label">In Progress</div>
            </div>
            <div className="timeline-connector" />
            <div className="timeline-step">
              <div className="timeline-dot">4</div>
              <div className="timeline-label">Resolved</div>
            </div>
          </div>
        </div>

        <button className="btn btn-secondary btn-lg" onClick={handleReset} style={{ width: '100%' }}>
          Submit Another Request
        </button>
      </div>
    );
  }

  // ─── Request Form ───────────────────────────
  return (
    <form onSubmit={handleSubmit} className="flex-col gap-lg animate-fade-in">
      {/* Type Selector */}
      <div className="form-group">
        <label className="form-label">Resource Type</label>
        <div className="type-selector">
          {TYPES.map((t) => (
            <div
              key={t.value}
              className={`type-option ${type === t.value ? 'selected' : ''}`}
              onClick={() => setType(t.value)}
            >
              <div className="type-option-icon">{t.icon}</div>
              <div className="type-option-label">{t.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Description with Voice Input */}
      <div className="form-group">
        <label className="form-label">Describe Your Emergency</label>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
          <textarea
            className="form-textarea"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe what you need and the urgency of the situation..."
            rows={4}
          />
          {isSupported && (
            <button
              type="button"
              className={`voice-btn ${isListening ? 'listening' : ''}`}
              onClick={isListening ? stopListening : startListening}
              title={isListening ? 'Stop listening' : 'Speak your request'}
            >
              🎤
            </button>
          )}
        </div>
        {isListening && (
          <div className="text-xs" style={{ color: 'var(--accent-rose)', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
            <span style={{ animation: 'pulse 1s ease infinite', display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: 'var(--accent-rose)' }} />
            Listening... Speak now
          </div>
        )}
      </div>

      {/* Gemini Live Preview */}
      {(geminiPreview || analyzing) && (
        <div className="glass-card animate-fade-in" style={{ padding: '1rem 1.25rem' }}>
          <div className="flex-between mb-1">
            <span className="ai-badge">
              {analyzing ? 'Analyzing...' : 'AI Classification'}
            </span>
            {geminiPreview && (
              <div className="confidence-meter">
                <div className="confidence-bar">
                  <div className="confidence-fill" style={{
                    width: `${(geminiPreview.confidence || 0) * 100}%`,
                    background: (geminiPreview.confidence || 0) > 0.8 ? '#22c55e' : '#eab308',
                  }} />
                </div>
                <span className="confidence-text">
                  {((geminiPreview.confidence || 0) * 100).toFixed(0)}%
                </span>
              </div>
            )}
          </div>
          {analyzing ? (
            <div className="skeleton skeleton-text mt-1" />
          ) : geminiPreview && (
            <>
              <div className="text-sm mt-1">
                <span className="text-muted">Detected: </span>
                <strong style={{ textTransform: 'capitalize' }}>{geminiPreview.type}</strong>
                <span className="text-muted"> • Severity: </span>
                <strong>{geminiPreview.severity}/10</strong>
              </div>
              {geminiPreview.reasoning && (
                <div className="text-xs text-secondary mt-1">{geminiPreview.reasoning}</div>
              )}
            </>
          )}
        </div>
      )}

      {/* Severity Slider */}
      <div className="form-group">
        <label className="form-label">
          Severity Level: <span style={{ color: 'var(--text-primary)', fontFamily: 'JetBrains Mono' }}>{severity}/10</span>
        </label>
        <div className="severity-slider">
          <input
            type="range"
            min="1"
            max="10"
            value={severity}
            onChange={(e) => setSeverity(Number(e.target.value))}
          />
          <div className="severity-labels">
            <span>Low</span>
            <span>Moderate</span>
            <span>High</span>
            <span>Critical</span>
          </div>
        </div>
      </div>

      {/* Location */}
      <div className="glass-card" style={{ padding: '1rem 1.25rem' }}>
        <div className="flex-between">
          <div>
            <div className="text-xs text-muted fw-600" style={{ textTransform: 'uppercase' }}>📍 Location</div>
            {geoLoading ? (
              <div className="skeleton skeleton-text mt-1" />
            ) : location ? (
              <div className="text-sm mt-1">
                {location.lat.toFixed(4)}, {location.lng.toFixed(4)}
              </div>
            ) : (
              <div className="text-sm text-secondary mt-1">Using default location</div>
            )}
          </div>
          <div className={`status-badge ${location ? 'resolved' : 'pending'}`}>
            {geoLoading ? 'Detecting...' : location ? 'Auto-detected' : 'Default'}
          </div>
        </div>
      </div>

      {/* Verified Toggle */}
      <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }}>
        <input
          type="checkbox"
          checked={isVerified}
          onChange={(e) => setIsVerified(e.target.checked)}
          style={{ width: 18, height: 18, accentColor: 'var(--accent-indigo)' }}
        />
        <div>
          <div className="text-sm fw-600">Verified Source</div>
          <div className="text-xs text-muted">Check if you're from an NGO, hospital, or government body</div>
        </div>
      </label>

      {error && (
        <div className="toast error" style={{ position: 'static', maxWidth: '100%' }}>
          ❌ {error}
        </div>
      )}

      {/* Submit */}
      <button
        type="submit"
        className="btn btn-primary btn-lg"
        disabled={submitting || !description.trim()}
        style={{ width: '100%' }}
      >
        {submitting ? (
          <>
            <span className="skeleton" style={{ width: 16, height: 16, borderRadius: '50%' }} />
            Processing with Gemini AI...
          </>
        ) : (
          <>🚀 Submit Emergency Request</>
        )}
      </button>
    </form>
  );
}
