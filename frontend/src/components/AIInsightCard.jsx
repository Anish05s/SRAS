import { useState } from 'react';
import { forecastZone } from '../lib/api';

/**
 * AIInsightCard — Shows Gemini demand forecast for a zone
 */
export default function AIInsightCard({ zone = 'Zone-A' }) {
  const [forecast, setForecast] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchForecast = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await forecastZone(zone);
      setForecast(res.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const riskColors = {
    LOW: '#22c55e',
    MEDIUM: '#eab308',
    HIGH: '#f97316',
    CRITICAL: '#ef4444',
  };

  return (
    <div className="glass-card" style={{ padding: '1.25rem' }}>
      <div className="flex-between mb-1">
        <div>
          <div className="ai-badge">AI Forecast</div>
          <h4 className="mt-1" style={{ fontSize: '0.9375rem' }}>📍 {zone}</h4>
        </div>
        <button
          className="btn btn-secondary btn-sm"
          onClick={fetchForecast}
          disabled={loading}
        >
          {loading ? '...' : '🔮 Predict'}
        </button>
      </div>

      {loading && (
        <div className="mt-2">
          <div className="skeleton skeleton-text mb-1" />
          <div className="skeleton skeleton-text" style={{ width: '60%' }} />
        </div>
      )}

      {error && (
        <div className="text-xs mt-2" style={{ color: 'var(--accent-rose)' }}>
          ⚠️ {error}
        </div>
      )}

      {forecast && !loading && (
        <div className="mt-2 animate-fade-in">
          {/* Risk Level */}
          <div className="flex-between mb-1">
            <span className="text-xs text-muted">Risk Level</span>
            <span style={{
              padding: '0.125rem 0.625rem',
              borderRadius: '9999px',
              background: `${riskColors[forecast.risk_level] || '#eab308'}20`,
              color: riskColors[forecast.risk_level] || '#eab308',
              fontSize: '0.75rem',
              fontWeight: 700,
              letterSpacing: '0.05em',
            }}>
              {forecast.risk_level}
            </span>
          </div>

          {/* Predicted Demand */}
          {forecast.predicted_requests && (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '0.5rem',
              marginTop: '0.75rem',
            }}>
              {Object.entries(forecast.predicted_requests).map(([type, count]) => (
                <div key={type} style={{
                  textAlign: 'center',
                  padding: '0.5rem',
                  borderRadius: 'var(--radius-sm)',
                  background: 'var(--bg-glass)',
                }}>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, fontFamily: 'JetBrains Mono' }}>
                    {count}
                  </div>
                  <div className="text-xs text-muted" style={{ textTransform: 'capitalize' }}>
                    {type}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Recommendation */}
          {forecast.recommendation && (
            <div style={{
              marginTop: '0.75rem',
              padding: '0.625rem',
              borderRadius: 'var(--radius-sm)',
              background: 'rgba(99, 102, 241, 0.08)',
              borderLeft: '3px solid var(--accent-indigo)',
              fontSize: '0.8125rem',
              color: 'var(--text-secondary)',
            }}>
              💡 {forecast.recommendation}
            </div>
          )}

          {forecast.reasoning && (
            <div className="text-xs text-muted mt-1">
              {forecast.reasoning}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
