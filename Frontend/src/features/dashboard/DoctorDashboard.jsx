import { useCallback, useEffect, useState } from 'react';
import dashboardApi from '../../api/dashboard.api';
import StatCard from '../../components/common/StatCard';
import { BarChart } from '../../components/common/SimpleChart';
import DataTable from '../../components/common/DataTable';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorAlert from '../../components/common/ErrorAlert';
import './Dashboard.css';

const STATUS_LABEL = {
  waiting: 'Chờ khám',
  in_progress: 'Đang khám',
  done: 'Hoàn thành',
  cancelled: 'Đã hủy',
};

const STATUS_COLOR = {
  waiting: '#d97706',
  in_progress: '#2563eb',
  done: '#059669',
  cancelled: '#dc2626',
};

const SCHEDULE_COLUMNS = [
  { key: 'time', label: 'Giờ' },
  { key: 'patientName', label: 'Bệnh nhân' },
  { key: 'reason', label: 'Lý do khám' },
  {
    key: 'status',
    label: 'Trạng thái',
    render: (val) => (
      <span
        className="badge"
        style={{
          background: STATUS_COLOR[val] + '18',
          color: STATUS_COLOR[val],
          border: `1px solid ${STATUS_COLOR[val]}44`,
        }}
      >
        {STATUS_LABEL[val] ?? val}
      </span>
    ),
  },
];

const UPCOMING_COLUMNS = [
  { key: 'date', label: 'Ngày' },
  { key: 'time', label: 'Giờ' },
  { key: 'patientName', label: 'Bệnh nhân' },
  { key: 'type', label: 'Loại khám' },
];

function DashboardDoctor() {
  const [stats, setStats] = useState(null);
  const [todaySchedule, setTodaySchedule] = useState([]);
  const [patientChart, setPatientChart] = useState([]);
  const [upcomingAppointments, setUpcomingAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await dashboardApi.getDoctorDashboard({ period: 'month' });
      const payload = res.data?.data || {};

      setStats(payload.stats || {});
      setTodaySchedule(payload.stats?.todayAppointments ?? []);
      
      // Since doctor dashboard doesn't have a patientChart returned currently, leave empty for now
      setPatientChart([]);
      
      // Upcoming appointments are not implemented in doctor stats backend yet.
      setUpcomingAppointments([]);
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || 'Lỗi tải dữ liệu');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  if (loading) return <LoadingSpinner text="Đang tải dashboard Bác sĩ..." />;
  if (error) return <ErrorAlert message={error} onRetry={fetchAll} />;

  return (
    <div className="dashboard">
      <div className="dashboard__header">
        <h1 className="dashboard__title">Dashboard Bác sĩ</h1>
        <div className="dashboard__date">
          {new Date().toLocaleDateString('vi-VN', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
        </div>
      </div>

      {/* Stats */}
      <div className="stat-grid">
        <StatCard
          label="Lịch hẹn hôm nay"
          value={stats?.todayAppointments}
          subtext={`${stats?.completedToday ?? 0} đã hoàn thành`}
          color="#2563eb"
          icon="📅"
        />
        <StatCard
          label="Bệnh nhân tháng này"
          value={stats?.monthlyPatients?.toLocaleString()}
          subtext={`Trung bình ${stats?.avgDailyPatients ?? 0}/ngày`}
          color="#059669"
          icon="👥"
        />
        <StatCard
          label="Đang chờ khám"
          value={stats?.waitingPatients}
          subtext="Phòng khám hiện tại"
          color="#d97706"
          icon="⏳"
        />
        <StatCard
          label="Đánh giá trung bình"
          value={stats?.averageRating ? `${stats.averageRating}/5` : null}
          subtext={`${stats?.totalReviews ?? 0} lượt đánh giá`}
          color="#7c3aed"
          icon="⭐"
        />
      </div>

      {/* Today schedule + chart */}
      <div className="dashboard__two-col">
        <section className="dashboard__section dashboard__section--flex1">
          <h2 className="section-title">Lịch hôm nay</h2>
          <DataTable
            columns={SCHEDULE_COLUMNS}
            rows={todaySchedule}
            emptyText="Không có lịch hẹn hôm nay"
          />
        </section>

        <div className="dashboard__section dashboard__section--flex1">
          <BarChart
            title="Bệnh nhân theo tuần (tháng này)"
            data={patientChart}
            color="#059669"
          />
        </div>
      </div>

      {/* Upcoming */}
      <section className="dashboard__section">
        <h2 className="section-title">Lịch hẹn sắp tới</h2>
        <DataTable
          columns={UPCOMING_COLUMNS}
          rows={upcomingAppointments}
          emptyText="Không có lịch hẹn sắp tới"
        />
      </section>
    </div>
  );
}

export default DashboardDoctor;
