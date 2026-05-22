import { useCallback, useEffect, useState } from 'react';
import dashboardApi from '../../api/dashboard.api';
import medicalApi from '../../api/medical.api';
import StatCard from '../../components/common/StatCard';
import DataTable from '../../components/common/DataTable';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorAlert from '../../components/common/ErrorAlert';
import './Dashboard.css';

const APPT_COLUMNS = [
  { key: 'date', label: 'Ngày' },
  { key: 'time', label: 'Giờ' },
  { key: 'doctorName', label: 'Bác sĩ' },
  { key: 'specialty', label: 'Chuyên khoa' },
  { key: 'location', label: 'Địa điểm' },
  {
    key: 'status',
    label: 'Trạng thái',
    render: (val) => {
      const map = {
        confirmed: { label: 'Đã xác nhận', color: '#059669' },
        pending: { label: 'Chờ xác nhận', color: '#d97706' },
        cancelled: { label: 'Đã hủy', color: '#dc2626' },
      };
      const s = map[val] ?? { label: val, color: '#6b7280' };
      return <span style={{ color: s.color, fontWeight: 600 }}>{s.label}</span>;
    },
  },
];

const HISTORY_COLUMNS = [
  { key: 'date', label: 'Ngày khám' },
  { key: 'doctorName', label: 'Bác sĩ' },
  { key: 'diagnosis', label: 'Chẩn đoán' },
  { key: 'notes', label: 'Ghi chú' },
];

const PRESCRIPTION_COLUMNS = [
  { key: 'date', label: 'Ngày kê' },
  { key: 'medication', label: 'Thuốc' },
  { key: 'dosage', label: 'Liều dùng' },
  { key: 'duration', label: 'Thời gian' },
  {
    key: 'status',
    label: 'Trạng thái',
    render: (val) => (
      <span
        className="badge"
        style={{
          color: val === 'active' ? '#059669' : '#6b7280',
          fontWeight: 600,
        }}
      >
        {val === 'active' ? 'Đang dùng' : 'Hết hạn'}
      </span>
    ),
  },
];

const formatDate = (value) => {
  if (!value) return '---';
  return new Date(value).toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

const mapAppointment = (appt) => {
  const doctorName =
    appt.doctorName ||
    appt.doctor?.user?.full_name ||
    appt.doctor?.user?.fullName ||
    appt.doctor?.full_name ||
    appt.doctor?.fullName ||
    '---';

  return {
    ...appt,
    date: appt.date || formatDate(appt.appointment_date),
    time: appt.time || appt.appointment_time || appt.slotTime || '---',
    doctorName,
    specialty:
      appt.specialty ||
      appt.doctor?.specialty?.name ||
      appt.service?.name ||
      appt.doctor?.title ||
      '---',
    location: appt.location || appt.clinic || 'Phong kham',
    status: appt.status,
  };
};

const getPayloadData = (res) => res?.data?.data || res?.data || res || {};

const getPayloadItems = (res) => {
  const payload = getPayloadData(res);
  if (Array.isArray(payload)) return payload;
  return payload.items || payload.records || [];
};

const mapPrescription = (item, record) => ({
  id: item.id,
  date: formatDate(record.created_at || record.createdAt),
  medication: item.medicine_name || item.medicineName || '---',
  dosage: [item.dosage, item.frequency].filter(Boolean).join(' - ') || '---',
  duration: item.duration || '---',
  status: 'active',
});

function DashboardPatient() {
  const [stats, setStats] = useState(null);
  const [upcomingAppointments, setUpcomingAppointments] = useState([]);
  const [medicalHistory, setMedicalHistory] = useState([]);
  const [prescriptions, setPrescriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('appointments');

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [dashboardRes, recordsRes] = await Promise.all([
        dashboardApi.getPatientDashboard(),
        medicalApi.getRecords({ page: 1, limit: 100 }),
      ]);
      const payload = getPayloadData(dashboardRes);
      const recordItems = getPayloadItems(recordsRes);
      const prescriptionItems = recordItems.flatMap((record) =>
        (record.prescriptions || []).map((item) => mapPrescription(item, record))
      );

      setStats({
        upcomingAppointments: payload.upcomingAppointments,
        totalVisits: payload.completedAppointments,
        activePrescriptions: prescriptionItems.length,
        lastVisitDate: null,
      });
      setUpcomingAppointments((payload.upcomingList ?? []).map(mapAppointment));
      setMedicalHistory([]);
      setPrescriptions(prescriptionItems);
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || 'Lỗi tải dữ liệu');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  if (loading) return <LoadingSpinner text="Đang tải dashboard Bệnh nhân..." />;
  if (error) return <ErrorAlert message={error} onRetry={fetchAll} />;

  return (
    <div className="dashboard">
      <div className="dashboard__header">
        <h1 className="dashboard__title">Dashboard Bệnh nhân</h1>
      </div>

      {/* Stats */}
      <div className="stat-grid">
        <StatCard
          label="Lịch hẹn sắp tới"
          value={stats?.upcomingAppointments}
          color="#2563eb"
          icon="📅"
        />
        <StatCard
          label="Tổng lần khám"
          value={stats?.totalVisits}
          subtext="Tất cả thời gian"
          color="#7c3aed"
          icon="🏥"
        />
        <StatCard
          label="Đơn thuốc còn hiệu lực"
          value={stats?.activePrescriptions}
          color="#059669"
          icon="💊"
        />
        <StatCard
          label="Lần khám cuối"
          value={stats?.lastVisitDate ?? '—'}
          color="#0891b2"
          icon="🗓️"
        />
      </div>

      {/* Next appointment highlight */}
      {upcomingAppointments.length > 0 && (
        <div className="next-appt-card">
          <div className="next-appt-card__label">Lịch hẹn tiếp theo</div>
          <div className="next-appt-card__main">
            <strong>{upcomingAppointments[0].doctorName}</strong>
            {' · '}
            {upcomingAppointments[0].specialty}
          </div>
          <div className="next-appt-card__time">
            📅 {upcomingAppointments[0].date} — {upcomingAppointments[0].time}
            {' · '}
            {upcomingAppointments[0].location}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="tab-bar">
        {[
          { key: 'appointments', label: '📅 Lịch hẹn' },
          { key: 'history', label: '🏥 Lịch sử khám' },
          { key: 'prescriptions', label: '💊 Đơn thuốc' },
        ].map((tab) => (
          <button
            key={tab.key}
            className={`tab-btn ${activeTab === tab.key ? 'tab-btn--active' : ''}`}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="dashboard__section" style={{ marginTop: 0, borderTopLeftRadius: 0 }}>
        {activeTab === 'appointments' && (
          <DataTable
            columns={APPT_COLUMNS}
            rows={upcomingAppointments}
            emptyText="Không có lịch hẹn sắp tới"
          />
        )}
        {activeTab === 'history' && (
          <DataTable
            columns={HISTORY_COLUMNS}
            rows={medicalHistory}
            emptyText="Chưa có lịch sử khám"
          />
        )}
        {activeTab === 'prescriptions' && (
          <DataTable
            columns={PRESCRIPTION_COLUMNS}
            rows={prescriptions}
            emptyText="Chưa có đơn thuốc"
          />
        )}
      </div>
    </div>
  );
}

export default DashboardPatient;
