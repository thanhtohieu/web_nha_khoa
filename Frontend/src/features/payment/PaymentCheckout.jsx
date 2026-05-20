import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import paymentApi from '../../api/payment.api';
import medicalApi from '../../api/medical.api';
import useAuthStore from '../../store/auth.store';
// removed missing imports
import { formatCurrency, formatDate, validate, validators } from '../../utils/helpers';
import './PaymentCheckout.css';

const PAYMENT_METHODS = [
  { id: 'cash', label: 'Tiền mặt', icon: '💵', desc: 'Thu tiền mặt tại quầy' },
  { id: 'vnpay', label: 'VNPay', icon: '🏧', desc: 'Chuyển khoản / QR / ATM / Visa' },
];

export default function PaymentCheckout() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const recordId = searchParams.get('recordId');
  const { user } = useAuthStore();
  const isPatient = user?.role === 'patient';
  const isStaff = ['doctor', 'receptionist', 'admin'].includes(user?.role);

  const [record, setRecord] = useState(null);
  const [existingPayment, setExistingPayment] = useState(null);
  const [method, setMethod] = useState(isPatient ? 'vnpay' : 'cash');
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    if (!recordId) { setLoading(false); return; }
    setLoading(true);
    setError(null);
    try {
      const res = await medicalApi.getRecordById(recordId);
      const recordData = res.data?.data || res.data;

      if (recordData) {
        const consultationFee = parseFloat(recordData.appointment?.doctor?.consultation_fee || 0);
        const servicePrice = parseFloat(recordData.appointment?.service?.price || 0);
        const invoiceItems = [];
        if (recordData.appointment?.service) {
          invoiceItems.push({
            name: recordData.appointment.service.name,
            price: servicePrice,
            quantity: 1,
          });
        }

        const mappedRecord = {
          ...recordData,
          patient: {
            fullName: recordData.patient?.full_name || recordData.patient?.fullName || '—',
          },
          doctor: {
            fullName: (recordData.doctor?.user?.full_name || recordData.doctor?.user?.fullName)
              ? `${recordData.doctor?.title || 'BS.'} ${recordData.doctor?.user?.full_name || recordData.doctor?.user?.fullName}`
              : '—',
          },
          visitDate: recordData.appointment?.appointment_date || recordData.created_at,
          consultationFee,
          medicineFee: 0,
          discount: 0,
          totalAmount: consultationFee + servicePrice,
          invoiceItems,
        };
        setRecord(mappedRecord);
      } else {
        setRecord(null);
      }

      // Check if payment already exists
      const pRes = await paymentApi.getPayments({ recordId, limit: 1 });
      const found = pRes.data?.data?.[0];
      if (found) setExistingPayment(found);
    } catch (err) {
      setError(err?.response?.data?.message || err.message || 'Không thể tải thông tin bệnh án');
    } finally {
      setLoading(false);
    }
  }, [recordId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleCheckout = async () => {
    if (!recordId) {
      setError('Thiếu mã bệnh án');
      return;
    }
    const appointmentId = record?.appointment_id || record?.appointment?.id;
    if (!appointmentId) {
      setError('Không tìm thấy thông tin lịch hẹn để thực hiện thanh toán.');
      return;
    }

    setProcessing(true);
    setError(null);

    try {
      if (method === 'cash') {
        // Confirm cash immediately (receptionist/doctor)
        const res = await paymentApi.createCashPayment({
          appointmentId,
          notes: 'Thanh toán tiền mặt tại quầy',
        });
        const payment = res.data?.data || res.data;
        const paymentIdVal = payment?.id || payment?._id;
        navigate(`/payment/result?paymentId=${paymentIdVal}&status=paid`);
      } else {
        // VNPay: create payment, get URL, and redirect
        const res = await paymentApi.createVnpayPayment({
          appointmentId,
        });
        const { paymentUrl } = res.data?.data || res.data;
        if (paymentUrl) {
          window.location.href = paymentUrl;
        } else {
          throw new Error('Không lấy được URL thanh toán VNPay');
        }
      }
    } catch (err) {
      setError(err?.response?.data?.message || err.message || 'Lỗi xử lý thanh toán');
      setProcessing(false);
    }
  };

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '60px 0', gap: 12, color: '#6b7280' }}>
      <div style={{ width: 24, height: 24, border: '2.5px solid #e5e7eb', borderTopColor: '#3b82f6', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
      Đang tải thông tin...
    </div>
  );

  if (!recordId) {
    return (
      <div className="page-container">
        <div className="empty-state">
          <span className="empty-icon">⚠️</span>
          <p>Không tìm thấy bệnh án để thanh toán.</p>
          <Link to="/medical" className="btn btn-primary" style={{ marginTop: 16 }}>
            Quay lại danh sách bệnh án
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container checkout-page">
      <nav className="breadcrumb">
        <Link to="/payment">Thanh toán</Link>
        <span>›</span>
        <span>Tạo hoá đơn</span>
      </nav>

      <h1 className="page-title" style={{ marginBottom: 28 }}>Thanh toán</h1>

      {error && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '12px 16px', marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#b91c1c', fontSize: '0.88rem' }}>
          <span>⚠️ {error}</span>
        </div>
      )}

      <div className="checkout-layout">
        {/* LEFT: Invoice summary */}
        <div className="checkout-main">
          {existingPayment && (
            <div className="alert-info">
              Bệnh án này đã có hoá đơn{' '}
              <Link to={`/payment/${existingPayment.id}`} className="link">
                #{existingPayment.code || existingPayment.id?.slice(-8).toUpperCase() || ''}
              </Link>
              {' '}({existingPayment.status}). Bạn có muốn tạo hoá đơn mới?
            </div>
          )}

          {/* Medical record info */}
          {record && (
            <div className="info-card">
              <h2 className="card-title">Thông tin bệnh án</h2>
              <div className="info-grid">
                <div className="info-item">
                  <span className="info-label">Bệnh nhân</span>
                  <span className="info-value">{record.patient?.fullName || '—'}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">Bác sĩ</span>
                  <span className="info-value">{record.doctor?.fullName || '—'}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">Ngày khám</span>
                  <span className="info-value">{formatDate(record.visitDate)}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">Chẩn đoán</span>
                  <span className="info-value">{record.diagnosis || '—'}</span>
                </div>
              </div>
            </div>
          )}

          {/* Invoice items */}
          {record?.invoiceItems?.length > 0 && (
            <div className="info-card">
              <h2 className="card-title">Chi tiết dịch vụ</h2>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Dịch vụ</th>
                    <th style={{ textAlign: 'right' }}>Đơn giá</th>
                    <th style={{ textAlign: 'right' }}>SL</th>
                    <th style={{ textAlign: 'right' }}>Thành tiền</th>
                  </tr>
                </thead>
                <tbody>
                  {record.invoiceItems.map((item, i) => (
                    <tr key={i}>
                      <td>{item.name}</td>
                      <td style={{ textAlign: 'right' }}>{formatCurrency(item.price)}</td>
                      <td style={{ textAlign: 'right' }}>{item.quantity}</td>
                      <td style={{ textAlign: 'right' }}>{formatCurrency(item.price * item.quantity)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* RIGHT: Payment method + summary */}
        <div className="checkout-sidebar">
          <div className="info-card">
            <h2 className="card-title">Hình thức thanh toán</h2>

            <div className="method-list">
              {PAYMENT_METHODS.map((m) => (
                <label
                  key={m.id}
                  className={`method-option ${method === m.id ? 'selected' : ''}`}
                >
                  <input
                    type="radio"
                    name="method"
                    value={m.id}
                    checked={method === m.id}
                    onChange={() => setMethod(m.id)}
                    disabled={m.id === 'cash' && isPatient}
                  />
                  <span className="method-icon">{m.icon}</span>
                  <span className="method-info">
                    <strong>{m.label}</strong>
                    <span className="method-desc">{m.desc}</span>
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Total */}
          <div className="info-card summary-card">
            <h2 className="card-title">Tổng cộng</h2>
            <div className="summary-rows">
              <div className="summary-row">
                <span>Phí khám bệnh</span>
                <span>{formatCurrency(record?.consultationFee || 0)}</span>
              </div>
              {record?.medicineFee > 0 && (
                <div className="summary-row">
                  <span>Tiền thuốc</span>
                  <span>{formatCurrency(record.medicineFee)}</span>
                </div>
              )}
              {record?.discount > 0 && (
                <div className="summary-row discount">
                  <span>Giảm giá</span>
                  <span>-{formatCurrency(record.discount)}</span>
                </div>
              )}
              <div className="summary-row total">
                <span>Tổng thanh toán</span>
                <span>{formatCurrency(record?.totalAmount || 0)}</span>
              </div>
            </div>

            {isStaff || (isPatient && method === 'vnpay') ? (
              <button
                className="btn btn-primary btn-block"
                onClick={handleCheckout}
                disabled={processing}
              >
                {processing
                  ? 'Đang xử lý...'
                  : method === 'cash'
                  ? '✓ Xác nhận thu tiền mặt'
                  : '→ Chuyển đến VNPay'}
              </button>
            ) : (
              <div className="alert-info">
                {isPatient && method === 'cash'
                  ? 'Vui lòng chọn hình thức VNPay để thanh toán trực tuyến, hoặc đến quầy lễ tân để thanh toán tiền mặt.'
                  : 'Chỉ nhân viên y tế mới có thể thực hiện thanh toán.'}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
