import { formatScore, getSeverityColor, TYPE_COLORS } from '../lib/priorityUtils';

/**
 * PriorityScoreCard — Explainability card showing score breakdown
 * Shows WHY a request has its priority rank with visual bars.
 */
export default function PriorityScoreCard({ scoreBreakdown, queuePosition, severity }) {
  if (!scoreBreakdown) return null;

  const { total, base, time_bonus, severity_bonus, verified_bonus, category } = scoreBreakdown;
  
  // Max possible values for bar widths
  const maxBase = 100;
  const maxTime = 40;
  const maxSeverity = 30;
  const maxVerified = 5;

  const bars = [
    {
      label: `Base (${category})`,
      value: base,
      max: maxBase,
      color: TYPE_COLORS[category] || '#6366f1',
    },
    {
      label: 'Time Aging',
      value: time_bonus,
      max: maxTime,
      color: '#06b6d4',
    },
    {
      label: `Severity (${severity}/10)`,
      value: severity_bonus,
      max: maxSeverity,
      color: getSeverityColor(severity),
    },
  ];

  if (verified_bonus > 0) {
    bars.push({
      label: 'Verified ✓',
      value: verified_bonus,
      max: maxVerified,
      color: '#10b981',
    });
  }

  return (
    <div className="glass-card priority-card animate-slide-up">
      <div className="priority-card-header">
        <div>
          <div className="text-xs text-muted fw-600" style={{ textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            Priority Score
          </div>
          <div className="priority-score-value">{formatScore(total)}</div>
        </div>
        {queuePosition && (
          <div style={{ textAlign: 'right' }}>
            <div className="text-xs text-muted">Queue Position</div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#818cf8', fontFamily: 'JetBrains Mono' }}>
              #{queuePosition}
            </div>
          </div>
        )}
      </div>

      <div className="priority-breakdown">
        {bars.map((bar) => (
          <div className="priority-bar-row" key={bar.label}>
            <div className="priority-bar-label">{bar.label}</div>
            <div className="priority-bar-track">
              <div
                className="priority-bar-fill"
                style={{
                  width: `${(bar.value / bar.max) * 100}%`,
                  background: `linear-gradient(90deg, ${bar.color}, ${bar.color}88)`,
                }}
              />
            </div>
            <div className="priority-bar-value" style={{ color: bar.color }}>
              +{bar.value.toFixed(1)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
