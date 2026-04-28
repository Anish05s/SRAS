import { useState } from 'react';
import { generateSitrep } from '../lib/api';

/**
 * SitrepModal — AI-generated situation report modal
 */
export default function SitrepModal({ isOpen, onClose }) {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await generateSitrep();
      setReport(res.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-content">
        <div className="modal-header">
          <div>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              📋 AI Situation Report
              <span className="ai-badge">Gemini</span>
            </h3>
          </div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        {!report && !loading && (
          <div style={{ textAlign: 'center', padding: '2rem' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🤖</div>
            <p className="text-secondary mb-2">
              Generate an AI-powered operational situation report based on current data.
            </p>
            <button
              className="btn btn-primary btn-lg"
              onClick={handleGenerate}
              disabled={loading}
            >
              ✨ Generate SITREP with Gemini
            </button>
          </div>
        )}

        {loading && (
          <div style={{ padding: '2rem' }}>
            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
              <div className="ai-badge" style={{ fontSize: '0.875rem', padding: '0.375rem 1rem' }}>
                Gemini is analyzing operational data...
              </div>
            </div>
            <div className="flex-col gap-sm">
              <div className="skeleton" style={{ height: 20, width: '80%' }} />
              <div className="skeleton" style={{ height: 16, width: '100%' }} />
              <div className="skeleton" style={{ height: 16, width: '90%' }} />
              <div className="skeleton" style={{ height: 16, width: '70%' }} />
              <div className="skeleton" style={{ height: 20, width: '60%', marginTop: '1rem' }} />
              <div className="skeleton" style={{ height: 16, width: '100%' }} />
              <div className="skeleton" style={{ height: 16, width: '85%' }} />
            </div>
          </div>
        )}

        {error && (
          <div className="toast error" style={{ position: 'static', maxWidth: '100%', marginBottom: '1rem' }}>
            ⚠️ Failed to generate report: {error}
          </div>
        )}

        {report && !loading && (
          <div className="animate-fade-in">
            <div className="sitrep-content" 
              dangerouslySetInnerHTML={{ 
                __html: report.report
                  .replace(/\n/g, '<br/>')
                  .replace(/## (.*?)(<br\/>|$)/g, '<h2>$1</h2>')
                  .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                  .replace(/- (.*?)(<br\/>|$)/g, '<li>$1</li>')
              }} 
            />
            
            <div style={{ 
              marginTop: '1.5rem', 
              paddingTop: '1rem', 
              borderTop: '1px solid var(--border-subtle)',
              display: 'flex', 
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <span className="text-xs text-muted">
                Generated at {new Date(report.generated_at).toLocaleString()}
              </span>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button className="btn btn-secondary btn-sm" onClick={handleGenerate}>
                  🔄 Regenerate
                </button>
                <button className="btn btn-primary btn-sm" onClick={onClose}>
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
