import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { ROUTES } from './router/routes';
import ProtectedRoute from './router/ProtectedRoute';
import AppLayout from './components/layout/AppLayout';
import { Spinner } from './components/ui';
import { useAuth } from './context/AuthContext';

const Login = lazy(() => import('./pages/Login'));

export default function App() {
  const { user } = useAuth();
  return (
    <Suspense fallback={<Spinner />}>
      <Routes>
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
