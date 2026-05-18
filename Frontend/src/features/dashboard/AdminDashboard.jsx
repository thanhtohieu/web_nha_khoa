import { useState, useEffect, useCallback } from 'react';
import dashboardApi from '../../api/dashboard.api';
import StatCard from '../../components/common/StatCard';
import { BarChart, LineChart } from '../../components/common/SimpleChart';
import DataTable from '../../components/common/DataTable';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorAlert from '../../components/common/ErrorAlert';
import './Dashboard.css';

const PERIOD_OPTIONS = [
  { value: 'week', label: '7 ngày' },
  { value: 'month', label: '30 ngày' },
  { value: 'quarter', label: 'Quý' },
  { value: 'year', label: 'Năm' },
];

const TOP_DOCTOR_COLUMNS = [
  { key: 'rank', label: '#' },
  { key: 'name', label: 'Bác sĩ' },
  { key: 'specialty', label: 'Chuyên khoa' },
  { key: 'totalAppointments', label: 'Lịch hẹn' },
  {
    key: 'rating',
    label: 'Đánh giá',
    render: (val) => (val ? `⭐ ${val}` : '—'),
  },
];

const ACTIVITY_COLUMNS = [
  { key: 'time', label: 'Thời gian' },
  { key: 'action', label: 'Hành động' },
  { key: 'user', label: 'Người dùng' },
  {
    key: 'type',
    label: 'Loại',
    render: (val) => (
      <span className={`badge badge--${val?.toLowerCase()}`}>{val}</span>
    ),
  },
];

function DashboardAdmin() {
  const [period, setPeriod] = useState('month');
  const [stats, setStats] = useState(null);
  const [revenueData, setRevenueData] = useState([]);
  const [appointmentData, setAppointmentData] = useState([]);
  const [topDoctors, setTopDoctors] = useState([]);
  const [recentActivities, setRecentActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [chartLoading, setChartLoading] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setChartLoading(true);
    setError(null);
    try {
      const res = await dashboardApi.getAdminDashboard({ period });
      const payload = res.data?.data || {};
      
      setStats(payload.overview);
      setTopDoctors(payload.topDoctors ?? []);
      setRecentActivities(payload.recentAppointments ?? []);
      
      setRevenueData(payload.charts?.revenue ?? []);
      setAppointmentData(payload.charts?.appointments ?? []);
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || 'Lỗi tải dữ liệu');
    } finally {
      setLoading(false);
      setChartLoading(false);
    }
  }, [period]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) return <LoadingSpinner text="Đang tải dashboard Admin..." />;
  if (error) return <ErrorAlert message={error} onRetry={fetchData} />;

  return (
    <div className="dashboard">
      <div className="dashboard__header">
        <h1 className="dashboard__title">Dashboard Quản trị</h1>
        <div className="dashboard__period-selector">
          {PERIOD_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              className={`period-btn ${period === opt.value ? 'period-btn--active' : ''}`}
              onClick={() => setPeriod(opt.value)}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div className="stat-grid">
        <StatCard
          label="Tổng bệnh nhân"
          value={stats?.totalPatients?.toLocaleString()}
          subtext={`+${stats?.newPatientsThisMonth ?? 0} tháng này`}
          color="#2563eb"
          icon="👥"
        />
        <StatCard
          label="Tổng bác sĩ"
          value={stats?.totalDoctors}
          subtext={`${stats?.activeDoctors ?? 0} đang hoạt động`}
          color="#7c3aed"
          icon="🩺"
        />
        <StatCard
          label="Lịch hẹn hôm nay"
          value={stats?.todayAppointments}
          subtext={`${stats?.pendingAppointments ?? 0} chờ xác nhận`}
          color="#059669"
          icon="📅"
        />
        <StatCard
          label="Doanh thu tháng"
          value={
            stats?.monthlyRevenue != null
              ? `${(stats.monthlyRevenue / 1_000_000).toFixed(1)}M₫`
              : null
          }
          subtext={`Tháng trước: ${
            stats?.lastMonthRevenue != null
              ? `${(stats.lastMonthRevenue / 1_000_000).toFixed(1)}M₫`
              : '—'
          }`}
          color="#d97706"
          icon="💰"
        />
        <StatCard
          label="Lịch hẹn hoàn thành"
          value={stats?.completedAppointments?.toLocaleString()}
          subtext={`Tỉ lệ: ${stats?.completionRate ?? 0}%`}
          color="#0891b2"
          icon="✅"
        />
        <StatCard
          label="Bệnh nhân mới"
          value={stats?.newPatientsThisMonth}
          subtext="Tháng hiện tại"
          color="#be185d"
          icon="🆕"
        />
      </div>

      {/* Charts */}
      <div className="chart-grid">
        <div className="chart-grid__item">
          {chartLoading ? (
            <LoadingSpinner text="Đang tải biểu đồ..." />
          ) : (
            <LineChart
              title="Doanh thu theo thời gian"
              data={revenueData}
              color="#2563eb"
              unit="K₫"
            />
          )}
        </div>
        <div className="chart-grid__item">
          {chartLoading ? (
            <LoadingSpinner text="Đang tải biểu đồ..." />
          ) : (
            <BarChart
              title="Lịch hẹn theo thời gian"
              data={appointmentData}
              color="#7c3aed"
            />
          )}
        </div>
      </div>

      {/* Top Doctors */}
      <section className="dashboard__section">
        <h2 className="section-title">Bác sĩ nổi bật</h2>
        <DataTable
          columns={TOP_DOCTOR_COLUMNS}
          rows={topDoctors.map((d, i) => ({ ...d, rank: i + 1 }))}
          emptyText="Chưa có dữ liệu bác sĩ"
        />
      </section>

      {/* Recent Activities */}
      <section className="dashboard__section">
        <h2 className="section-title">Hoạt động gần đây</h2>
        <DataTable
          columns={ACTIVITY_COLUMNS}
          rows={recentActivities}
          emptyText="Chưa có hoạt động"
        />
      </section>
    </div>
  );
}

export default DashboardAdmin;
