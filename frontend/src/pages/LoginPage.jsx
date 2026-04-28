/**
 * LoginPage — Full Authentication with Email, Google, Facebook, Apple
 * Premium glassmorphism design with animated background
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function LoginPage() {
  const navigate = useNavigate();
  const { signUpWithEmail, signInWithEmail, signInWithGoogle, signInWithFacebook, signInWithApple } = useAuth();

  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleEmailAuth = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (isSignUp) {
        await signUpWithEmail(email, password, displayName);
      } else {
        await signInWithEmail(email, password);
      }
      navigate('/role-select');
    } catch (err) {
      const code = err.code || '';
      if (code === 'auth/user-not-found' || code === 'auth/invalid-credential') setError('Invalid email or password. If you are new, please switch to Sign Up.');
      else if (code === 'auth/wrong-password') setError('Incorrect password. Try again.');
      else if (code === 'auth/email-already-in-use') setError('Email already registered. Please sign in.');
      else if (code === 'auth/weak-password') setError('Password must be at least 6 characters.');
      else if (code === 'auth/invalid-email') setError('Invalid email address.');
      else setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSocialLogin = async (provider) => {
    setError(null);
    setLoading(true);
    try {
      if (provider === 'google') await signInWithGoogle();
      else if (provider === 'facebook') await signInWithFacebook();
      else if (provider === 'apple') await signInWithApple();
      navigate('/role-select');
    } catch (err) {
      if (err.code === 'auth/popup-closed-by-user') {
        setError(null);
      } else if (err.code === 'auth/account-exists-with-different-credential') {
        setError('An account with this email already exists. Try a different sign-in method.');
      } else if (err.code === 'auth/unauthorized-domain') {
        setError('Social login is restricted here. Please use Email/Password or run on an authorized domain.');
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      {/* Animated Orbs Background */}
      <div className="auth-bg-orbs">
        <div className="auth-orb auth-orb-1" />
        <div className="auth-orb auth-orb-2" />
        <div className="auth-orb auth-orb-3" />
      </div>

      <div className="auth-container animate-fade-in">
        {/* Logo Section */}
        <div className="auth-logo-section">
          <div className="auth-logo-icon">⚡</div>
          <h1 className="auth-title">SRAS</h1>
          <p className="auth-subtitle">Smart Resource Allocation System</p>
          <p className="auth-tagline">
            AI-powered emergency response coordination
          </p>
        </div>

        {/* Auth Card */}
        <div className="auth-card animate-slide-up">
          <div className="auth-card-header">
            <h2>{isSignUp ? 'Create Account' : 'Welcome Back'}</h2>
            <p className="text-secondary text-sm">
              {isSignUp
                ? 'Join the emergency response network'
                : 'Sign in to continue to SRAS'}
            </p>
          </div>

          {/* Social Login Buttons */}
          <div className="auth-social-grid">
            <button
              className="auth-social-btn auth-google-btn"
              onClick={() => handleSocialLogin('google')}
              disabled={loading}
            >
              <svg viewBox="0 0 24 24" width="20" height="20">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              <span>Google</span>
            </button>

            <button
              className="auth-social-btn auth-facebook-btn"
              onClick={() => handleSocialLogin('facebook')}
              disabled={loading}
            >
              <svg viewBox="0 0 24 24" width="20" height="20" fill="#1877F2">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
              </svg>
              <span>Facebook</span>
            </button>

            <button
              className="auth-social-btn auth-apple-btn"
              onClick={() => handleSocialLogin('apple')}
              disabled={loading}
            >
              <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.52-3.23 0-1.44.62-2.2.44-3.06-.4C4.24 16.72 4.84 10.58 8.81 10.31c1.18.06 2 .69 2.7.69.7 0 2-.85 3.37-.72.57.02 2.18.23 3.22 1.75-3.37 2.05-2.79 6.06.95 7.75-.7 1.38-.9 1.6-1.25 2.25-.4.7-.8 1.38-1.75 2.25zM12.03 10.2C11.9 8.01 13.67 6.22 15.79 6c.32 2.37-2.16 4.54-3.76 4.2z" />
              </svg>
              <span>Apple</span>
            </button>
          </div>

          {/* Divider */}
          <div className="auth-divider">
            <span>or continue with email</span>
          </div>

          {/* Email/Password Form */}
          <form onSubmit={handleEmailAuth} className="auth-form">
            {isSignUp && (
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input
                  id="auth-name"
                  className="form-input"
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Enter your full name"
                  required={isSignUp}
                  autoComplete="name"
                />
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input
                id="auth-email"
                className="form-input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                autoComplete="email"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Password</label>
              <input
                id="auth-password"
                className="form-input"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={6}
                autoComplete={isSignUp ? 'new-password' : 'current-password'}
              />
            </div>

            {error && (
              <div className="auth-error">
                <span>⚠️</span> {error}
              </div>
            )}

            <button
              type="submit"
              className="btn btn-primary btn-lg auth-submit-btn"
              disabled={loading}
            >
              {loading ? (
                <span className="auth-spinner" />
              ) : isSignUp ? (
                '🚀 Create Account'
              ) : (
                '🔐 Sign In'
              )}
            </button>
          </form>

          {/* Toggle Sign Up / Sign In */}
          <div className="auth-toggle">
            <span className="text-secondary text-sm">
              {isSignUp ? 'Already have an account?' : "Don't have an account?"}
            </span>
            <button
              className="auth-toggle-btn"
              onClick={() => {
                setIsSignUp(!isSignUp);
                setError(null);
              }}
            >
              {isSignUp ? 'Sign In' : 'Sign Up'}
            </button>
          </div>
        </div>

        {/* Tech Footer */}
        <div className="auth-footer">
          <div className="auth-tech-badges">
            {['Gemini AI', 'Real-time', 'Firebase', 'Cloud Run'].map((badge) => (
              <span key={badge} className="auth-tech-badge">{badge}</span>
            ))}
          </div>
          <p className="text-xs text-muted" style={{ marginTop: '0.75rem' }}>
            Built with React + Firebase + Google Gemini AI
          </p>
        </div>
      </div>
    </div>
  );
}
