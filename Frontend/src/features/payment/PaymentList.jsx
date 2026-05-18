import { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import paymentApi from '../../api/payment.api';
import useAuthStore from '../../store/auth.store';
import Spinner from '../../components/common/Spinner';
import ErrorMessage from '../../components/common/ErrorMessage';
import StatusBadge from '../../components/common/StatusBadge';
import Pagination from '../../components/common/Pagination';
import { formatCurrency, formatDateTime, getPaymentStatus } from '../../utils/helpers';
import './PaymentList.css';

const LIMIT = 10;

const METHOD_LABEL = {
  cash: 'Tiền mặt',
  vnpay: 'VNPay',
};

export default function PaymentList() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const isPatient = user?.role === 'patient';

  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState('');
  const [methodFilter, setMethodFilter] = useState('');

  const totalPages = Math.ceil(total / LIMIT);

  const fetchPayments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await paymentApi.getPayments({
        page,
        limit: LIMIT,
        status: statusFilter || undefined,
        method: methodFilter || undefined,
      });
      setPayments(res.data?.payments || []);
      setTotal(res.data?.total || 0);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, methodFilter]);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  const handleFilterChange = (setter) => (e) => {
    setter(e.target.value);
    setPage(1);
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Quản lý thanh toán</h1>
          <p className="page-subtitle">
            {total > 0 ? `${total} hoá đơn` : 'Chưa có hoá đơn nào'}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="filter-bar">
        <select
          className="form-select"
          value={statusFilter}
          onChange={handleFilterChange(setStatusFilter)}
        >
          <option value="">Tất cả trạng thái</option>
          <option value="pending">Chờ thanh toán</option>
          <option value="paid">Đã thanh toán</option>
          <option value="failed">Thất bại</option>
          <option value="refunded">Đã hoàn tiền</option>
        </select>

        <select
          className="form-select"
          value={methodFilter}
          onChange={handleFilterChange(setMethodFilter)}
        >
          <option value="">Tất cả hình thức</option>
          <option value="cash">Tiền mặt</option>
          <option value="vnpay">VNPay</option>
        </select>
      </div>

      {error && <ErrorMessage message={error} onRetry={fetchPayments} />}

      {loading ? (
        <Spinner text="Đang tải danh sách thanh toán..." />
      ) : payments.length === 0 ? (
        <div className="empty-state">
          <span className="empty-icon">🧾</span>
          <p>Không có hoá đơn nào</p>
        </div>
      ) : (
        <>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Mã hoá đơn</th>
                  {!isPatient && <th>Bệnh nhân</th>}
                  <th>Bệnh án</th>
                  <th>Hình thức</th>
                  <th>Tổng tiền</th>
                  <th>Ngày tạo</th>
                  <th>Trạng thái</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => {
                  const statusMeta = getPaymentStatus(p.status);
                  return (
                    <tr key={p._id} className="table-row-hover" onClick={() => navigate(`/payment/${p._id}`)}>
                      <td>
                        <span className="record-code">{p.code || p._id.slice(-8).toUpperCase()}</span>
                      </td>
                      {!isPatient && (
                        <td>
                          <div className="cell-main">{p.patient?.fullName || '—'}</div>
                          <div className="cell-sub">{p.patient?.phone}</div>
                        </td>
                      )}
                      <td>
                        {p.medicalRecord ? (
                          <Link
                            to={`/medical/${p.medicalRecord._id}`}
                            className="link"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {p.medicalRecord.code || p.medicalRecord._id.slice(-8).toUpperCase()}
                          </Link>
                        ) : '—'}
                      </td>
                      <td>
                        <span className={`method-badge method-${p.method}`}>
                          {METHOD_LABEL[p.method] || p.method}
                        </span>
                      </td>
                      <td>
                        <strong>{formatCurrency(p.totalAmount)}</strong>
                      </td>
                      <td>{formatDateTime(p.createdAt)}</td>
                      <td>
                        <StatusBadge label={statusMeta.label} color={statusMeta.color} />
                      </td>
                      <td>
                        <button
                          className="btn btn-sm btn-outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/payment/${p._id}`);
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

          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
        </>
      )}
    </div>
  );
}
