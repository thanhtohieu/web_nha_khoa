import { useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import useappointment.store from '../../store/appointment.store';
import useAuth from '../../hooks/useAuth';
import './AppointmentList.css';

const STATUS_LABELS = {
  pending:   { label: 'Chờ xác nhận', color: 'status-pending' },
  confirmed: { label: 'Đã xác nhận',  color: 'status-confirmed' },
  checkin:   { label: 'Đã check-in',  color: 'status-checkin' },
  completed: { label: 'Hoàn thành',   color: 'status-completed' },
  cancelled: { label: 'Đã hủy',       color: 'status-cancelled' },
};

const STATUS_OPTIONS = [
  { value: '', label: 'Tất cả trạng thái' },
  ...Object.entries(STATUS_LABELS).map(([v, { label }]) => ({ value: v, label })),
];

const ROLE_FILTER_OPTIONS = {
  patient:      [],
  doctor:       [{ value: 'confirmed', label: 'Cần xác nhận' }, { value: 'checkin', label: 'Hôm nay' }],
  receptionist: STATUS_OPTIONS,
  admin:        STATUS_OPTIONS,
};

const formatDate = (str) => {
  if (!str) return '';
  return new Date(str).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

export default function AppointmentList() {
  const navigate = useNavigate();
  const { role, isPatient, isDoctor } = useAuth();
  const { appointments, listLoading, listError, listFilters, pagination,
    fetchAppointments, setListFilters } = useappointment.store();

  useEffect(() => {
    fetchAppointments();
  }, [listFilters]);

  const handleFilterChange = useCallback((key, val) => {
    setListFilters({ [key]: val, page: 1 });
  }, [setListFilters]);

  const handlePageChange = (page) => {
    setListFilters({ page });
    fetchAppointments();
  };

  const filterOptions = ROLE_FILTER_OPTIONS[role] ?? STATUS_OPTIONS;
  const showStatusFilter = !isPatient;

  return (
    <div className="apptlist-container">
      <div className="apptlist-header">
        <div>
          <h1>Lịch hẹn</h1>
          <p className="header-sub">
            {isPatient && 'Lịch khám của bạn'}
            {isDoctor && 'Lịch hẹn với bệnh nhân'}
            {role === 'receptionist' && 'Quản lý lịch hẹn'}
            {role === 'admin' && 'Tổng quan lịch hẹn hệ thống'}
          </p>
        </div>
        {isPatient && (
          <button className="btn-primary" onClick={() => navigate('/appointments/booking')}>
            + Đặt lịch mới
          </button>
        )}
      </div>

      <div className="apptlist-filters">
        {showStatusFilter && (
          <select
            className="filter-select"
            value={listFilters.status}
            onChange={(e) => handleFilterChange('status', e.target.value)}
          >
            {filterOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        )}
        <input
          className="filter-search"
          placeholder={isDoctor ? 'Tìm bệnh nhân...' : 'Tìm bác sĩ...'}
          value={listFilters.search || ''}
          onChange={(e) => handleFilterChange('search', e.target.value)}
        />
      </div>

      {listError && (
        <div className="list-error">
          <p>{listError}</p>
          <button onClick={fetchAppointments}>Thử lại</button>
        </div>
      )}

      {listLoading && <div className="list-loading"><div className="loading-spinner" /></div>}

      {!listLoading && !listError && (
        <>
          {appointments.length === 0
            ? (
              <div className="list-empty">
                <div className="empty-icon">📅</div>
                <p>Chưa có lịch hẹn nào</p>
                {isPatient && <button className="btn-primary" onClick={() => navigate('/appointments/booking')}>Đặt lịch ngay</button>}
              </div>
            )
            : (
              <div className="appt-table-wrap">
                <table className="appt-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      {!isPatient && <th>Bệnh nhân</th>}
                      {!isDoctor && <th>Bác sĩ</th>}
                      <th>Ngày khám</th>
                      <th>Giờ</th>
                      <th>Trạng thái</th>
                      <th>Lý do</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {appointments.map((appt, idx) => {
                      const statusMeta = STATUS_LABELS[appt.status] || { label: appt.status, color: '' };
                      return (
                        <tr key={appt.id || appt._id} className="appt-row">
                          <td className="td-idx">{(listFilters.page - 1) * listFilters.limit + idx + 1}</td>
                          {!isPatient && <td>{appt.patient?.fullName || '—'}</td>}
                          {!isDoctor && <td>{appt.doctor?.fullName || '—'}</td>}
                          <td>{formatDate(appt.date)}</td>
                          <td>{appt.slotTime || '—'}</td>
                          <td><span className={`status-badge ${statusMeta.color}`}>{statusMeta.label}</span></td>
                          <td className="td-reason">{appt.reason || '—'}</td>
                          <td>
                            <button className="btn-link" onClick={() => navigate(`/appointments/${appt.id || appt._id}`)}>
                              Chi tiết →
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )
          }

          {pagination.totalPages > 1 && (
            <div className="pagination">
              <button disabled={pagination.page <= 1} onClick={() => handlePageChange(pagination.page - 1)}>‹</button>
              {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((p) => (
                <button key={p} className={p === pagination.page ? 'active' : ''} onClick={() => handlePageChange(p)}>{p}</button>
              ))}
              <button disabled={pagination.page >= pagination.totalPages} onClick={() => handlePageChange(pagination.page + 1)}>›</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
