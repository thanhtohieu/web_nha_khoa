import { Routes, Route, Navigate } from 'react-router-dom';
import { lazy, Suspense } from 'react';

// Guards
import { GuestRoute } from './components/guards'

// Layouts
import AuthLayout from './layouts/AuthLayout';
import AdminLayout from './layouts/AdminLayout';
import DoctorLayout from './layouts/DoctorLayout';
import ReceptionistLayout from './layouts/ReceptionistLayout';
import PatientLayout from './layouts/PatientLayout';

// Auth pages (eager — small, always needed)
import Login from './pages/auth/Login';

// Dashboard pages (lazy)
const AdminDashboard        = lazy(() => import('./pages/admin/AdminDashboard'));
const DoctorDashboard       = lazy(() => import('./pages/doctor/DoctorDashboard'));
const ReceptionistDashboard = lazy(() => import('./pages/receptionist/ReceptionistDashboard'));
const PatientDashboard      = lazy(() => import('./pages/patient/PatientDashboard'));

// Error pages
import { NotFoundPage } from './pages/ErrorPages';

// Root redirect — users are redirected based on role by GuestRoute / auth store
import { useAuthStore } from './store/auth.store';
import { ROLE_HOME } from './routes/constants';

function RootRedirect() {
  const { isAuthenticated, user } = useAuthStore();
  if (isAuthenticated && user?.role) {
    return <Navigate to={ROLE_HOME[user.role] ?? '/auth/login'} replace />;
  }
  return <Navigate to="/auth/login" replace />;
}

function PageLoader() {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      height: '60vh', color: 'var(--color-text-muted)', fontSize: '0.9rem',
    }}>
      <span style={{
        width: 24, height: 24, borderRadius: '50%',
        border: '2px solid var(--color-border)',
        borderTopColor: 'var(--color-primary)',
        animation: 'spin 0.7s linear infinite',
        display: 'inline-block', marginRight: 10,
      }} />
      Đang tải...
    </div>
  );
}

function App() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        {/* Root */}
        <Route path="/" element={<RootRedirect />} />

        {/* ── Auth routes ─────────────────────────────────────── */}
        <Route
          element={
            <GuestRoute>
              <AuthLayout />
            </GuestRoute>
          }
        >
          <Route path="/auth/login" element={<Login />} />
          {/* Future: register, forgot-password, reset-password */}
        </Route>

        {/* ── Admin routes ─────────────────────────────────────── */}
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<AdminDashboard />} />
          {/* Add more admin pages here */}
        </Route>

        {/* ── Doctor routes ────────────────────────────────────── */}
        <Route path="/doctor" element={<DoctorLayout />}>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<DoctorDashboard />} />
          {/* Add more doctor pages here */}
        </Route>

        {/* ── Receptionist routes ──────────────────────────────── */}
        <Route path="/receptionist" element={<ReceptionistLayout />}>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<ReceptionistDashboard />} />
          {/* Add more receptionist pages here */}
        </Route>

        {/* ── Patient routes ───────────────────────────────────── */}
        <Route path="/patient" element={<PatientLayout />}>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<PatientDashboard />} />
          {/* Add more patient pages here */}
        </Route>

        {/* 404 */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  );
}

export default App;
