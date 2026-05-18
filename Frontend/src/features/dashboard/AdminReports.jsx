import { useState, useEffect, useCallback } from 'react';
import dashboardApi from '../../api/dashboard.api';
import StatCard from '../../components/common/StatCard';
import { LineChart, BarChart } from '../../components/common/SimpleChart';
import DataTable from '../../components/common/DataTable';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorAlert from '../../components/common/ErrorAlert';
import './Dashboard.css';

// --- Utility function for dates ---
const toISODate = (date) => date.toISOString().split('T')[0];

const getDateRange = (filter) => {
  const end = new Date();
  const start = new Date();
  let groupBy = 'day';

  switch (filter) {
    case '7days':
      start.setDate(end.getDate() - 6);
      break;
    case '30days':
      start.setDate(end.getDate() - 29);
      break;
    case 'thisMonth':
      start.setDate(1);
      break;
    case 'thisYear':
      start.setMonth(0, 1);
      groupBy = 'month';
      break;
    default:
      start.setDate(end.getDate() - 6);
  }

  return {
    startDate: toISODate(start),
    endDate: toISODate(end),
    groupBy
  };
};

// --- Formatters ---
const formatCurrency = (val) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val || 0);

const SPECIALTY_COLUMNS = [
  { key: 'name', label: 'Chuyên khoa' },
  { key: 'count', label: 'Số lịch hẹn', render: (val) => <strong>{val}</strong> },
];

const DOCTOR_COLUMNS = [
  { key: 'rank', label: '#' },
  {
    key: 'doctorName', label: 'Bác sĩ', render: (val, row) => (
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <img
          src={row.avatar || 'https://via.placeholder.com/32'}
          alt="avatar"
          style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover' }}
          onError={(e) => { e.target.src = 'https://ui-avatars.com/api/?name=' + val; }}
        />
        <div>
          <div style={{ fontWeight: 600 }}>{val}</div>
          <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>{row.title}</div>
        </div>
      </div>
    )
  },
  { key: 'totalAppointments', label: 'Lịch khám', render: (val) => <strong>{val}</strong> },
  { key: 'totalRevenue', label: 'Doanh thu', render: (val) => formatCurrency(val) },
  { key: 'rating', label: 'Đánh giá', render: (val) => `${parseFloat(val).toFixed(1)} ★` },
];

export default function AdminReports() {
  const [filter, setFilter] = useState('7days');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const range = getDateRange(filter);
      const res = await dashboardApi.getAdminDashboard(range);
      setData(res.data?.data);
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || 'Lỗi tải dữ liệu báo cáo');
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const { overview, charts, topDoctors, specialtyDistribution } = data || {};

  // Parse chart data for SimpleChart format
  const revenueChartData = charts?.revenue?.map(d => ({
    label: d.period.slice(5), // e.g. "05-18"
    value: parseFloat(d.revenue)
  })) || [];

  const appointmentChartData = charts?.appointments?.reduce((acc, curr) => {
    const label = curr.date.slice(5); // "05-18"
    const existing = acc.find(item => item.label === label);
    if (existing) {
      existing.value += parseInt(curr.count);
    } else {
      acc.push({ label, value: parseInt(curr.count) });
    }
    return acc;
  }, []) || [];

  // Parse tables
  const specialtyRows = charts?.specialtyDistribution?.map(d => ({
    name: `${d.doctor?.specialty?.icon || ''} ${d.doctor?.specialty?.name || 'Chưa phân loại'}`,
    count: parseInt(d.count || 0)
  })).sort((a, b) => b.count - a.count) || [];

  const doctorRows = topDoctors?.map((d, index) => ({
    rank: index + 1,
    doctorName: d.doctor?.user?.full_name || 'Bác sĩ',
    avatar: d.doctor?.user?.avatar,
    title: d.doctor?.title,
    totalAppointments: parseInt(d.total_appointments || 0),
    totalRevenue: parseFloat(d.total_revenue || 0),
    rating: d.doctor?.rating_avg || 0
  })) || [];

  if (loading && !data) return <LoadingSpinner text="Đang tải dữ liệu báo cáo..." />;
  if (error && !data) return <ErrorAlert message={error} onRetry={fetchData} />;

  return (
    <div className="dashboard">
      <div className="dashboard__header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="dashboard__title">Báo cáo & Thống kê</h1>
          <div className="dashboard__date">Phân tích hoạt động phòng khám</div>
        </div>
        <div className="dashboard__period-selector">
          {['7days', '30days', 'thisMonth', 'thisYear'].map(f => (
            <button
              key={f}
              className={`period-btn ${filter === f ? 'period-btn--active' : ''}`}
              onClick={() => setFilter(f)}
            >
              {f === '7days' && '7 ngày'}
              {f === '30days' && '30 ngày'}
              {f === 'thisMonth' && 'Tháng này'}
              {f === 'thisYear' && 'Năm nay'}
            </button>
          ))}
        </div>
      </div>

      {loading && <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: 3, backgroundColor: 'var(--color-primary)', animation: 'pulse 1.5s infinite' }} />}

      <div className="stat-grid">
        <StatCard
          label="Tổng doanh thu"
          value={formatCurrency(overview?.totalRevenue)}
          subtext="Đã thanh toán"
          color="#10b981"
          icon="💰"
        />
        <StatCard
          label="Lịch hẹn hoàn thành"
          value={overview?.completedAppointments}
          subtext={`Tỷ lệ: ${overview?.completionRate || 0}%`}
          color="#059669"
          icon="✅"
        />
        <StatCard
          label="Lịch hẹn đã hủy"
          value={overview?.cancelledAppointments}
          color="#dc2626"
          icon="❌"
        />
        <StatCard
          label="Bệnh nhân mới"
          value={overview?.newPatients}
          color="#3b82f6"
          icon="🆕"
        />
      </div>

      <div className="dashboard__two-col" style={{ marginTop: 24 }}>
        <section className="dashboard__section dashboard__section--flex2">
          <h2 className="section-title">Doanh thu theo thời gian</h2>
          <LineChart data={revenueChartData} color="#10b981" unit="đ" />
        </section>

        <section className="dashboard__section dashboard__section--flex2">
          <h2 className="section-title">Lịch hẹn theo thời gian</h2>
          <BarChart data={appointmentChartData} color="#3b82f6" />
        </section>
      </div>

      <div className="dashboard__two-col" style={{ marginTop: 24 }}>
        <section className="dashboard__section dashboard__section--flex2">
          <h2 className="section-title">Top Bác sĩ xuất sắc</h2>
          <DataTable
            columns={DOCTOR_COLUMNS}
            rows={doctorRows}
            emptyText="Chưa có dữ liệu bác sĩ"
          />
        </section>

        <section className="dashboard__section dashboard__section--flex1">
          <h2 className="section-title">Phân bổ chuyên khoa</h2>
          <DataTable
            columns={SPECIALTY_COLUMNS}
            rows={specialtyRows}
            emptyText="Chưa có dữ liệu"
          />
        </section>
      </div>
    </div>
  );
}
