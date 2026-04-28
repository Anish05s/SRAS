/**
 * Client-side priority visualization utilities
 */

export const SEVERITY_COLORS = {
  critical: '#ef4444', // red
  high: '#f97316',     // orange
  medium: '#eab308',   // yellow
  low: '#22c55e',      // green
};

export const TYPE_ICONS = {
  food: '🍽️',
  medical: '🏥',
  shelter: '🏠',
  critical: '🚨',
};

export const TYPE_COLORS = {
  food: '#f59e0b',
  medical: '#3b82f6',
  shelter: '#8b5cf6',
  critical: '#ef4444',
};

export const STATUS_COLORS = {
  pending: '#f59e0b',
  assigned: '#3b82f6',
  in_progress: '#8b5cf6',
  resolved: '#22c55e',
};

export function getSeverityLabel(severity) {
  if (severity >= 9) return 'Critical';
  if (severity >= 7) return 'High';
  if (severity >= 4) return 'Moderate';
  return 'Low';
}

export function getSeverityColor(severity) {
  if (severity >= 9) return SEVERITY_COLORS.critical;
  if (severity >= 7) return SEVERITY_COLORS.high;
  if (severity >= 4) return SEVERITY_COLORS.medium;
  return SEVERITY_COLORS.low;
}

export function getMapPinColor(severity) {
  if (severity >= 8) return '#ef4444';  // red
  if (severity >= 4) return '#eab308';  // yellow
  return '#22c55e';                     // green
}

export function formatWaitTime(minutes) {
  if (minutes < 60) return `${Math.round(minutes)}m`;
  const hrs = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  return `${hrs}h ${mins}m`;
}

export function formatScore(score) {
  return score?.toFixed(1) ?? '—';
}

export function getConfidenceBadge(confidence) {
  if (confidence >= 0.9) return { label: 'High Confidence', color: '#22c55e' };
  if (confidence >= 0.7) return { label: 'Moderate', color: '#eab308' };
  return { label: 'Low', color: '#ef4444' };
}
