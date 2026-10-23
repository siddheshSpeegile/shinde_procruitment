import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function NoAccess({ perm }) {
  return (
    <div className="card p-10 text-center max-w-lg mx-auto mt-10">
      <h1 className="font-serif text-2xl m-0 mb-1">No access</h1>
      <p className="text-muted m-0">Your role does not include <code className="font-mono">{perm}</code>. Ask an Administrator to update the role.</p>
    </div>
  );
}

export default function ProtectedRoute({ perm, children }) {
  const { user, can } = useAuth();
  const loc = useLocation();
  if (!user) return <Navigate to="/login" replace state={{ from: loc.pathname }} />;
  if (!can(perm)) return <NoAccess perm={perm} />;
  return children;
}
