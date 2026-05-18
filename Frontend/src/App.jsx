import { Routes, Route, Navigate } from 'react-router-dom';
import { lazy, Suspense } from 'react';

// Guards
import { GuestRoute } from './routes/guards';

// Layouts
import AuthLayout from './layouts/AuthLayout';
import AdminLayout from './layouts/AdminLayout';
import DoctorLayout from './layouts/DoctorLayout';
import ReceptionistLayout from './layouts/ReceptionistLayout';
import PatientLayout from './layouts/PatientLayout';

// Auth pages (eager — small, always needed)
import Login from './features/auth/Login';

// Dashboard pages (lazy)
const AdminDashboard        = lazy(() => import('./features/dashboard/AdminDashboard'));
const DoctorDashboard       = lazy(() => import('./features/dashboard/DoctorDashboard'));
const ReceptionistDashboard = lazy(() => import('./features/dashboard/ReceptionistDashboard'));
const PatientDashboard      = lazy(() => import('./features/dashboard/PatientDashboard'));

// Error pages
import { NotFoundPage, UnderConstructionPage } from './features/dashboard/ErrorPages';

// Feature pages (lazy)
const AdminReports = lazy(() => import('./features/dashboard/AdminReports'));
const UserList = lazy(() => import('./features/user/UserList'));
const DoctorList = lazy(() => import('./features/doctor/DoctorList'));
const DoctorProfile = lazy(() => import('./features/doctor/DoctorProfile'));
const DoctorSchedule = lazy(() => import('./features/doctor/DoctorSchedule'));
const AppointmentList = lazy(() => import('./features/appointment/AppointmentList'));
const MedicalRecordList = lazy(() => import('./features/medical/MedicalRecordList'));
const PaymentList = lazy(() => import('./features/payment/PaymentList'));
const Profile = lazy(() => import('./features/user/Profile'));

// Root redirect — users are redirected based on role by auth store
import useAuthStore from './store/auth.store';
import { ROLE_HOME } from './routes/constants';

function RootRedirect() {
  const { isAuth, user } = useAuthStore((s) => ({
    isAuth: s.isAuth,
    user: s.user,
  }));
  if (isAuth && user?.role) {
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
          <Route path="users" element={<UserList />} />
          <Route path="doctors" element={<DoctorList />} />
          <Route path="reports" element={<AdminReports />} />
          <Route path="audit" element={<UnderConstructionPage />} />
          <Route path="settings" element={<UnderConstructionPage />} />
        </Route>

        {/* ── Doctor routes ────────────────────────────────────── */}
        <Route path="/doctor" element={<DoctorLayout />}>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<DoctorDashboard />} />
          <Route path="appointments" element={<AppointmentList />} />
          <Route path="patients" element={<UserList />} />
          <Route path="schedule" element={<DoctorSchedule />} />
          <Route path="records" element={<MedicalRecordList />} />
          <Route path="profile" element={<DoctorProfile />} />
        </Route>

        {/* ── Receptionist routes ──────────────────────────────── */}
        <Route path="/receptionist" element={<ReceptionistLayout />}>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<ReceptionistDashboard />} />
          <Route path="appointments" element={<AppointmentList />} />
          <Route path="patients" element={<UserList />} />
          <Route path="checkin" element={<UnderConstructionPage />} />
          <Route path="billing" element={<PaymentList />} />
          <Route path="profile" element={<Profile />} />
        </Route>

        {/* ── Patient routes ───────────────────────────────────── */}
        <Route path="/patient" element={<PatientLayout />}>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<PatientDashboard />} />
          <Route path="appointments" element={<AppointmentList />} />
          <Route path="records" element={<MedicalRecordList />} />
          <Route path="prescriptions" element={<UnderConstructionPage />} />
          <Route path="billing" element={<PaymentList />} />
          <Route path="profile" element={<Profile />} />
        </Route>

        {/* 404 */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  );
}

export default App;
