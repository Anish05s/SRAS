/**
 * ConfirmDialog — Reusable confirmation modal for destructive actions.
 * Glassmorphism overlay with animated entrance.
 */
import { useEffect, useRef } from 'react';

export default function ConfirmDialog({
  isOpen,
  title = 'Confirm Action',
  message = 'Are you sure?',
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'danger', // 'danger' | 'warning' | 'info'
  onConfirm,
  onCancel,
}) {
  const dialogRef = useRef(null);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e) => {
      if (e.key === 'Escape') onCancel?.();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, onCancel]);

  // Trap focus
  useEffect(() => {
    if (isOpen) dialogRef.current?.focus();
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="confirm-overlay" onClick={onCancel}>
      <div
        className="confirm-dialog animate-slide-up"
        ref={dialogRef}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
      >
        {/* Icon */}
        <div className={`confirm-icon confirm-icon-${variant}`}>
          {variant === 'danger' ? '🗑️' : variant === 'warning' ? '⚠️' : 'ℹ️'}
        </div>

        <h3 id="confirm-title" className="confirm-title">{title}</h3>
        <p className="confirm-message">{message}</p>

        <div className="confirm-actions">
          <button
            className="btn btn-secondary btn-sm"
            onClick={onCancel}
          >
            {cancelLabel}
          </button>
          <button
            className={`btn btn-sm confirm-btn-${variant}`}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
