import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import medicalApi from '../../api/medical.api';
import useAuthStore from '../../store/auth.store';
import Spinner from '../../components/common/Spinner';
import ErrorMessage from '../../components/common/ErrorMessage';
import StatusBadge from '../../components/common/StatusBadge';
import Pagination from '../../components/common/Pagination';
import { formatDate, getRecordStatus } from '../../utils/helpers';
import './MedicalRecordList.css';

const LIMIT = 10;

export default function MedicalRecordList() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const isDoctor = user?.role === 'doctor';

  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const totalPages = Math.ceil(total / LIMIT);

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await medicalApi.getRecords({
        page,
        limit: LIMIT,
        search: search || undefined,
        status: statusFilter || undefined,
      });
      setRecords(res.data?.records || []);
      setTotal(res.data?.total || 0);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter]);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  };

  const handleStatusChange = (e) => {
    setStatusFilter(e.target.value);
    setPage(1);
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Hồ sơ bệnh án</h1>
          <p className="page-subtitle">
            {total > 0 ? `${total} bệnh án` : 'Chưa có bệnh án nào'}
          </p>
        </div>
        {isDoctor && (
          <button
            className="btn btn-primary"
            onClick={() => navigate('/medical/new')}
          >
            + Tạo bệnh án
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="filter-bar">
        <form className="search-form" onSubmit={handleSearch}>
          <input
            type="text"
            className="form-input search-input"
            placeholder="Tìm theo tên bệnh nhân, mã hồ sơ..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
          <button type="submit" className="btn btn-outline">
            Tìm
          </button>
          {search && (
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => {
                setSearch('');
                setSearchInput('');
                setPage(1);
              }}
            >
              Xoá lọc
            </button>
          )}
        </form>

        <select
          className="form-select"
          value={statusFilter}
          onChange={handleStatusChange}
        >
          <option value="">Tất cả trạng thái</option>
          <option value="draft">Nháp</option>
          <option value="active">Đang điều trị</option>
          <option value="completed">Hoàn thành</option>
          <option value="cancelled">Đã huỷ</option>
        </select>
      </div>

      {error && <ErrorMessage message={error} onRetry={fetchRecords} />}

      {loading ? (
        <Spinner text="Đang tải bệnh án..." />
      ) : records.length === 0 ? (
        <div className="empty-state">
          <span className="empty-icon">🗂</span>
          <p>Không có bệnh án nào</p>
        </div>
      ) : (
        <>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Mã hồ sơ</th>
                  <th>Bệnh nhân</th>
                  <th>Bác sĩ</th>
                  <th>Ngày khám</th>
                  <th>Chẩn đoán</th>
                  <th>Trạng thái</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {records.map((r) => {
                  const statusMeta = getRecordStatus(r.status);
                  return (
                    <tr
                      key={r._id}
                      className="table-row-hover"
                      onClick={() => navigate(`/medical/${r._id}`)}
                    >
                      <td>
                        <span className="record-code">{r.code || r._id.slice(-8).toUpperCase()}</span>
                      </td>
                      <td>
                        <div className="cell-main">{r.patient?.fullName || '—'}</div>
                        <div className="cell-sub">{r.patient?.phone}</div>
                      </td>
                      <td>{r.doctor?.fullName || '—'}</td>
                      <td>{formatDate(r.visitDate)}</td>
                      <td className="diagnosis-cell">
                        {r.diagnosis || <span className="muted">Chưa có</span>}
                      </td>
                      <td>
                        <StatusBadge
                          label={statusMeta.label}
                          color={statusMeta.color}
                        />
                      </td>
                      <td>
                        <button
                          className="btn btn-sm btn-outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/medical/${r._id}`);
                          }}
                        >
                          Xem
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <Pagination
            page={page}
            totalPages={totalPages}
            onPageChange={setPage}
          />
        </>
      )}
    </div>
  );
}
