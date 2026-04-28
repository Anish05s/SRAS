import { BrowserRouter, Routes, Route, NavLink, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import LoginPage from './pages/LoginPage';
import RoleSelectPage from './pages/RoleSelectPage';
import Dashboard from './pages/Dashboard';
import RequestPage from './pages/RequestPage';
import ProviderPage from './pages/ProviderPage';
import './index.css';

// Protected Route — redirects to login if not authenticated
function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        minHeight: '100vh', background: 'var(--bg-primary)',
      }}>
        <div className="auth-spinner-lg" />
      </div>
    );
  }

  if (!user) return <Navigate to="/" replace />;
  return children;
}

// Main app with navigation (only shown when logged in)
function AppRoutes() {
  const { user } = useAuth();

  return (
    <>
      {/* Navigation Bar — only show when logged in */}
      {user && (
        <nav className="nav-bar">
          <NavLink to="/role-select" className="nav-logo">
            <div className="nav-logo-icon">⚡</div>
            <span className="nav-logo-text">SRAS</span>
          </NavLink>

          <div className="nav-links">
            <NavLink
              to="/dashboard"
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            >
              📡 Dashboard
            </NavLink>
            <NavLink
              to="/request"
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            >
              🆘 Request
            </NavLink>
            <NavLink
              to="/provider"
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            >
              🤝 Provider
            </NavLink>
          </div>

          {/* User avatar / name */}
          {user && (
            <div className="nav-user">
              {user.photoURL ? (
                <img src={user.photoURL} alt="" className="nav-avatar" />
              ) : (
                <div className="nav-avatar-placeholder">
                  {(user.displayName || user.email || '?')[0].toUpperCase()}
                </div>
              )}
            </div>
          )}
        </nav>
      )}

      <Routes>
        {/* Public */}
        <Route path="/" element={user ? <Navigate to="/role-select" replace /> : <LoginPage />} />

        {/* Protected */}
        <Route path="/role-select" element={
          <ProtectedRoute><RoleSelectPage /></ProtectedRoute>
        } />
        <Route path="/dashboard" element={
          <ProtectedRoute><Dashboard /></ProtectedRoute>
        } />
        <Route path="/request" element={
          <ProtectedRoute><RequestPage /></ProtectedRoute>
        } />
        <Route path="/provider" element={
          <ProtectedRoute><ProviderPage /></ProtectedRoute>
        } />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
