import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { ROUTES } from './router/routes';
import ProtectedRoute from './router/ProtectedRoute';
import AppLayout from './components/layout/AppLayout';
import { Spinner } from './components/ui';
import { useAuth } from './context/AuthContext';

const Login = lazy(() => import('./pages/Login'));

// Old addresses (bookmarks, saved links) keep working after a screen was renamed; the query string is kept.
function Moved({ to }) {
  const { search } = useLocation();
  return <Navigate to={to + search} replace />;
}

export default function App() {
  const { user } = useAuth();
  return (
    <Suspense fallback={<Spinner />}>
      <Routes>
        <Route path="/vendors" element={<Moved to="/suppliers" />} />
        <Route path="/refill-stock/new" element={<Moved to="/cut-order/new" />} />
        <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
        <Route element={<ProtectedRoute perm=""><AppLayout /></ProtectedRoute>}>
          {ROUTES.map((r) => (
            <Route key={r.path} path={r.path} element={<ProtectedRoute perm={r.perm}><r.el /></ProtectedRoute>} />
          ))}
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}
