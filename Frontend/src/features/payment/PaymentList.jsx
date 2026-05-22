import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import paymentApi from '../../api/payment.api';
import useAuthStore from '../../store/auth.store';
import './PaymentList.css';

const LIMIT = 10;

const METHOD_LABEL = {
  cash: 'Tiền mặt',
  vnpay: 'VNPay',
  transfer: 'Chuyển khoản',
};

const STATUS_META = {
  pending: { label: 'Chờ thanh toán', color: '#f59e0b', bg: '#fef3c7' },
  paid: { label: 'Đã thanh toán', color: '#10b981', bg: '#d1fae5' },
  failed: { label: 'Thất bại', color: '#ef4444', bg: '#fee2e2' },
  refunded: { label: 'Đã hoàn tiền', color: '#6b7280', bg: '#f3f4f6' },
};

const formatCurrency = (amount) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount ?? 0);

const formatDateTime = (str) => {
  if (!str) return '---';
  return new Date(str).toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const extractPayments = (payload) => {
  const items = payload?.data?.items ?? payload?.data ?? payload?.payments ?? [];
  return Array.isArray(items)
    ? items.filter((item) => !(item.transaction_code || item.code || '').startsWith('MOCK'))
    : [];
};

export default function PaymentList() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const isPatient = user?.role === 'patient';
  const role = user?.role;

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
      const params = { page, limit: LIMIT };
      if (statusFilter) params.status = statusFilter;
      if (methodFilter) params.method = methodFilter;

      const res = await paymentApi.getPayments(params);
      const payload = res.data;
      const realPayments = extractPayments(payload);

      setPayments(realPayments);
      setTotal(payload?.meta?.total ?? payload?.data?.total ?? payload?.total ?? realPayments.length);
    } catch (err) {
      setError(err?.response?.data?.message || err.message || 'Không thể tải danh sách hoá đơn');
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
    <div style={{ padding: '24px', maxWidth: 1200, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#111827', margin: 0 }}>
            {isPatient ? 'Hoá đơn của tôi' : 'Quản lý thanh toán'}
          </h1>
          <p style={{ fontSize: '0.85rem', color: '#6b7280', margin: '4px 0 0' }}>
            {total > 0 ? `${total} hoá đơn` : 'Chưa có hoá đơn nào'}
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <select style={filterStyle} value={statusFilter} onChange={handleFilterChange(setStatusFilter)}>
          <option value="">Tất cả trạng thái</option>
          <option value="pending">Chờ thanh toán</option>
          <option value="paid">Đã thanh toán</option>
          <option value="failed">Thất bại</option>
          <option value="refunded">Đã hoàn tiền</option>
        </select>

        <select style={filterStyle} value={methodFilter} onChange={handleFilterChange(setMethodFilter)}>
          <option value="">Tất cả hình thức</option>
          <option value="cash">Tiền mặt</option>
          <option value="vnpay">VNPay</option>
          <option value="transfer">Chuyển khoản</option>
        </select>
      </div>

      {error && (
        <div style={errorStyle}>
          <span>{error}</span>
          <button style={retryStyle} onClick={fetchPayments}>Thử lại</button>
        </div>
      )}

      {loading ? (
        <div style={loadingStyle}>
          <div style={{ width: 24, height: 24, border: '2.5px solid #e5e7eb', borderTopColor: '#3b82f6', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
          Đang tải danh sách thanh toán...
        </div>
      ) : payments.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: '#9ca3af' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: 8 }}>HĐ</div>
          <p>Không có hoá đơn nào</p>
        </div>
      ) : (
        <>
          <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f9fafb' }}>
                  <th style={thStyle}>Mã hoá đơn</th>
                  {!isPatient && <th style={thStyle}>Bệnh nhân</th>}
                  <th style={thStyle}>Hình thức</th>
                  <th style={thStyle}>Tổng tiền</th>
                  <th style={thStyle}>Ngày thanh toán</th>
                  <th style={thStyle}>Trạng thái</th>
                  <th style={thStyle}></th>
                </tr>
              </thead>
              <tbody>
                {payments.map((payment) => {
                  const statusMeta = STATUS_META[payment.status] || { label: payment.status || '---', color: '#6b7280', bg: '#f3f4f6' };
                  const patientName = payment.user?.full_name || payment.user?.fullName || payment.patient?.full_name || payment.patient?.fullName || '---';
                  const patientPhone = payment.user?.phone || payment.patient?.phone;
                  const code = payment.transaction_code || payment.code || payment.invoice_number || payment.id?.toString()?.slice(-8)?.toUpperCase() || '---';
                  const amount = payment.amount ?? payment.total_amount ?? payment.totalAmount;

                  return (
                    <tr
                      key={payment.id || payment._id}
                      style={{ borderBottom: '1px solid #f3f4f6', cursor: 'pointer', transition: 'background 0.15s' }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = '#fafbfc'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = ''; }}
                    >
                      <td style={tdStyle}>
                        <span style={{ fontFamily: 'monospace', fontWeight: 600, color: '#2563eb' }}>{code}</span>
                      </td>
                      {!isPatient && (
                        <td style={tdStyle}>
                          <div style={{ fontWeight: 500 }}>{patientName}</div>
                          {patientPhone && <div style={{ fontSize: '0.78rem', color: '#9ca3af' }}>{patientPhone}</div>}
                        </td>
                      )}
                      <td style={tdStyle}>
                        <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 6, fontSize: '0.78rem', fontWeight: 500, background: '#f3f4f6', color: '#374151' }}>
                          {METHOD_LABEL[payment.method || payment.payment_method] || payment.method || '---'}
                        </span>
                      </td>
                      <td style={tdStyle}><strong>{formatCurrency(amount)}</strong></td>
                      <td style={tdStyle}>{formatDateTime(payment.paid_at || payment.paidAt || payment.created_at || payment.createdAt)}</td>
                      <td style={tdStyle}>
                        <span style={{ display: 'inline-block', padding: '2px 10px', borderRadius: 99, fontSize: '0.75rem', fontWeight: 600, color: statusMeta.color, background: statusMeta.bg }}>
                          {statusMeta.label}
                        </span>
                      </td>
                      <td style={tdStyle}>
                        <button
                          style={{ padding: '4px 12px', border: '1px solid #e5e7eb', borderRadius: 6, background: '#fff', fontSize: '0.8rem', cursor: 'pointer', color: '#374151' }}
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/${role}/billing/${payment.id || payment._id}`);
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

          {totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: 8, padding: '16px 0' }}>
              <button style={pageBtnStyle} disabled={page <= 1} onClick={() => setPage(page - 1)}>Trước</button>
              <span style={{ fontSize: '0.82rem', color: '#6b7280', lineHeight: '32px' }}>Trang {page} / {totalPages}</span>
              <button style={pageBtnStyle} disabled={page >= totalPages} onClick={() => setPage(page + 1)}>Sau</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

const filterStyle = { padding: '8px 14px', border: '1px solid #e5e7eb', borderRadius: 8, background: '#fff', cursor: 'pointer' };
const errorStyle = { background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '12px 16px', marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#b91c1c', fontSize: '0.88rem' };
const retryStyle = { border: '1px solid currentColor', borderRadius: 6, padding: '4px 12px', background: 'transparent', color: 'inherit', cursor: 'pointer' };
const loadingStyle = { display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '60px 0', gap: 12, color: '#6b7280' };
const thStyle = { padding: '12px 16px', textAlign: 'left', fontSize: '0.78rem', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.04em' };
const tdStyle = { padding: '12px 16px', fontSize: '0.88rem', color: '#111827' };
const pageBtnStyle = { padding: '6px 16px', border: '1px solid #e5e7eb', borderRadius: 6, background: '#fff', fontSize: '0.82rem', cursor: 'pointer', color: '#374151' };
