import { useCallback, useEffect, useState } from 'react';
import dashboardApi from '../../api/dashboard.api';
import StatCard from '../../components/common/StatCard';
import { BarChart } from '../../components/common/SimpleChart';
import DataTable from '../../components/common/DataTable';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorAlert from '../../components/common/ErrorAlert';
import './Dashboard.css';

const APPT_COLUMNS = [
  { key: 'time', label: 'Giờ' },
  { key: 'patientName', label: 'Bệnh nhân' },
  { key: 'doctorName', label: 'Bác sĩ' },
  { key: 'room', label: 'Phòng' },
  {
    key: 'checkedIn',
    label: 'Check-in',
    render: (val) => (
      <span className={`badge badge--${val ? 'done' : 'waiting'}`}>
        {val ? 'Đã đến' : 'Chưa đến'}
      </span>
    ),
  },
];

const TASK_COLUMNS = [
  { key: 'task', label: 'Công việc' },
  { key: 'dueTime', label: 'Thời hạn' },
  {
    key: 'priority',
    label: 'Ưu tiên',
    render: (val) => {
      const map = { high: '#dc2626', medium: '#d97706', low: '#059669' };
      const label = { high: 'Cao', medium: 'Vừa', low: 'Thấp' };
      return (
        <span style={{ color: map[val] ?? '#6b7280', fontWeight: 600 }}>
          {label[val] ?? val}
        </span>
      );
    },
  },
];

const QUEUE_COLUMNS = [
  { key: 'number', label: 'STT' },
  { key: 'patientName', label: 'Bệnh nhân' },
  { key: 'department', label: 'Khoa' },
  { key: 'waitTime', label: 'Chờ (phút)' },
];

function DashboardReceptionist() {
  const [stats, setStats] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [statsRes, apptRes, tasksRes, queueRes] = await Promise.all([
        dashboardApi.getReceptionistStats(),
        dashboardApi.getReceptionistTodayAppointments(),
        dashboardApi.getReceptionistPendingTasks(),
        dashboardApi.getReceptionistQueueStatus(),
      ]);
      setStats(statsRes.data);
      setAppointments(apptRes.data?.appointments ?? []);
      setTasks(tasksRes.data?.tasks ?? []);
      setQueue(queueRes.data?.queue ?? []);
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || 'Lỗi tải dữ liệu');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();

    // Auto-refresh queue every 60 seconds
    const interval = setInterval(async () => {
      try {
        const queueRes = await dashboardApi.getReceptionistQueueStatus();
        setQueue(queueRes.data?.queue ?? []);
      } catch {
        // silent fail for auto-refresh
      }
    }, 60_000);

    return () => clearInterval(interval);
  }, [fetchAll]);

  if (loading) return <LoadingSpinner text="Đang tải dashboard Lễ tân..." />;
  if (error) return <ErrorAlert message={error} onRetry={fetchAll} />;

  return (
    <div className="dashboard">
      <div className="dashboard__header">
        <h1 className="dashboard__title">Dashboard Lễ tân</h1>
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
          label="Tổng lịch hẹn hôm nay"
          value={stats?.totalToday}
          subtext={`${stats?.checkedIn ?? 0} đã check-in`}
          color="#2563eb"
          icon="📋"
        />
        <StatCard
          label="Chờ check-in"
          value={stats?.pendingCheckin}
          subtext="Cần xử lý"
          color="#d97706"
          icon="⏳"
        />
        <StatCard
          label="Hàng đợi hiện tại"
          value={stats?.currentQueueSize}
          subtext={`Chờ TB ${stats?.avgWaitTime ?? 0} phút`}
          color="#dc2626"
          icon="🔢"
        />
        <StatCard
          label="Đã hoàn thành"
          value={stats?.completedToday}
          subtext="Hôm nay"
          color="#059669"
          icon="✅"
        />
      </div>

      {/* Today appointments + tasks */}
      <div className="dashboard__two-col">
        <section className="dashboard__section dashboard__section--flex2">
          <h2 className="section-title">Lịch hẹn hôm nay</h2>
          <DataTable
            columns={APPT_COLUMNS}
            rows={appointments}
            emptyText="Không có lịch hẹn hôm nay"
          />
        </section>

        <section className="dashboard__section dashboard__section--flex1">
          <h2 className="section-title">Việc cần làm</h2>
          <DataTable
            columns={TASK_COLUMNS}
            rows={tasks}
            emptyText="Không có việc cần làm"
          />
        </section>
      </div>

      {/* Queue */}
      <section className="dashboard__section">
        <div className="section-header-row">
          <h2 className="section-title" style={{ margin: 0 }}>Hàng đợi hiện tại</h2>
          <span className="section-hint">Tự động cập nhật mỗi 60 giây</span>
        </div>
        <DataTable
          columns={QUEUE_COLUMNS}
          rows={queue}
          emptyText="Hàng đợi trống"
        />
      </section>
    </div>
  );
}

export default DashboardReceptionist;
