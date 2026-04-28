import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import RadialOrbitalTimeline from '../components/ui/radial-orbital-timeline';
import { BackgroundPaths } from '../components/ui/background-paths';
import { ShieldAlert, HandHeart, Activity } from 'lucide-react';

const timelineData = [
  {
    id: 1,
    title: "I Need Help",
    date: "Request Resource",
    content: "Submit an emergency request for food, medical aid, shelter, or critical assistance. Our AI will prioritize your request automatically.",
    category: "Request",
    icon: ShieldAlert,
    relatedIds: [3],
    status: "urgent",
    energy: 95,
    path: "/request"
  },
  {
    id: 2,
    title: "I Can Help",
    date: "Provide Resource",
    content: "Register as a resource provider and receive dispatch assignments to assist those in need.",
    category: "Provide",
    icon: HandHeart,
    relatedIds: [3],
    status: "available",
    energy: 80,
    path: "/provider"
  },
  {
    id: 3,
    title: "Operations Dashboard",
    date: "Command Center",
    content: "Access the command center with live map, priority queue, AI insights, and dispatch controls.",
    category: "Admin",
    icon: Activity,
    relatedIds: [1, 2],
    status: "live",
    energy: 100,
    path: "/dashboard"
  }
];

export default function RoleSelectPage() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <BackgroundPaths title="SmartResourceAllocation">
      <div className="absolute top-4 right-4 z-50">
        {user && (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            gap: '0.75rem',
            background: 'rgba(0,0,0,0.3)',
            padding: '0.5rem 1rem',
            borderRadius: '9999px',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255,255,255,0.1)'
          }}>
            {user.photoURL && (
              <img
                src={user.photoURL}
                alt=""
                style={{
                  width: 28, height: 28, borderRadius: '50%',
                  border: '1px solid var(--accent-indigo)',
                }}
              />
            )}
            <span className="text-sm text-secondary">
              <strong style={{ color: 'var(--text-primary)' }}>
                {user.displayName || user.email}
              </strong>
            </span>
            <button
              className="btn btn-secondary btn-sm"
              onClick={handleLogout}
              style={{ padding: '0.25rem 0.75rem', fontSize: '0.75rem' }}
            >
              Logout
            </button>
          </div>
        )}
      </div>

      <RadialOrbitalTimeline timelineData={timelineData} />

      {/* Footer */}
      <div className="absolute bottom-8 left-0 right-0 z-10" style={{ textAlign: 'center' }}>
        <div className="text-xs text-muted" style={{ opacity: 0.8, letterSpacing: '0.02em' }}>
          Built with React + Firebase + Google Gemini AI • Cloud Run Deployed
        </div>
      </div>
    </BackgroundPaths>
  );
}
