import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import paymentApi from '../../api/payment.api';
import medicalApi from '../../api/medical.api';
import useAuthStore from '../../store/auth.store';
import { formatCurrency, formatDate } from '../../utils/helpers';
import './PaymentCheckout.css';

const PAYMENT_METHODS = [
  { id: 'cash', label: 'Tiền mặt', desc: 'Thu tiền mặt tại quầy' },
  { id: 'vnpay', label: 'VNPay', desc: 'Chuyển khoản, QR, ATM hoặc thẻ quốc tế' },
];

const STATUS_LABELS = {
  pending: 'Chờ thanh toán',
  paid: 'Đã thanh toán',
  failed: 'Thất bại',
  refunded: 'Đã hoàn tiền',
};

const getData = (res) => res.data?.data || res.data || null;

export default function PaymentCheckout() {
  const navigate = useNavigate();
  const { id: paymentId } = useParams();
  const [searchParams] = useSearchParams();
  const queryRecordId = searchParams.get('recordId');
  const { user } = useAuthStore();

  const isPatient = user?.role === 'patient';
  const isStaff = ['doctor', 'receptionist', 'admin'].includes(user?.role);
  const rolePath = user?.role || 'patient';

  const [record, setRecord] = useState(null);
  const [existingPayment, setExistingPayment] = useState(null);
  const [method, setMethod] = useState(isPatient ? 'vnpay' : 'cash');
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState(null);

  const mapRecord = (recordData) => {
    const consultationFee = parseFloat(recordData.appointment?.doctor?.consultation_fee || 0);
    const servicePrice = parseFloat(recordData.appointment?.service?.price || 0);
    const service = recordData.appointment?.service;

    return {
      ...recordData,
      patientName: recordData.patient?.full_name || recordData.patient?.fullName || '---',
      doctorName: recordData.doctor?.user?.full_name || recordData.doctor?.user?.fullName
        ? `${recordData.doctor?.title || 'BS.'} ${recordData.doctor?.user?.full_name || recordData.doctor?.user?.fullName}`
        : '---',
      visitDate: recordData.appointment?.appointment_date || recordData.created_at,
      consultationFee,
      totalAmount: consultationFee + servicePrice,
      invoiceItems: service ? [{ name: service.name, price: servicePrice, quantity: 1 }] : [],
    };
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let recordId = queryRecordId;

      if (!recordId && paymentId) {
        const payment = getData(await paymentApi.getPaymentById(paymentId));
        if (payment?.id && !(payment.transaction_code || '').startsWith('MOCK')) {
          setExistingPayment(payment);
        }
        recordId =
          payment?.appointment?.medicalRecord?.id ||
          payment?.appointment?.medical_record?.id ||
          payment?.medicalRecord?.id ||
          payment?.medical_record_id;
      }

      if (!recordId) {
        setRecord(null);
        return;
      }

      const recordData = getData(await medicalApi.getRecordById(recordId));
      if (!recordData?.id) {
        setRecord(null);
        return;
      }

      setRecord(mapRecord(recordData));

      const appointmentId = recordData.appointment_id || recordData.appointment?.id;
      if (appointmentId && !paymentId) {
        const payment = getData(await paymentApi.getPaymentByAppointment(appointmentId));
        if (payment?.id && !(payment.transaction_code || '').startsWith('MOCK')) {
          setExistingPayment(payment);
        }
      }
    } catch (err) {
      setError(err?.response?.data?.message || err.message || 'Không thể tải thông tin hoá đơn');
    } finally {
      setLoading(false);
    }
  }, [paymentId, queryRecordId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCheckout = async () => {
    if (!record) {
      setError('Không tìm thấy bệnh án để thanh toán.');
      return;
    }

    const appointmentId = record.appointment_id || record.appointment?.id;
    if (!appointmentId) {
      setError('Không tìm thấy lịch hẹn liên kết với bệnh án này.');
      return;
    }

    setProcessing(true);
    setError(null);

    try {
      if (method === 'cash') {
        const payment = getData(await paymentApi.createCashPayment({
          appointmentId,
          notes: 'Thanh toán tiền mặt tại quầy',
        }));
        navigate(`/payment/result?paymentId=${payment?.id || payment?._id}&status=paid`);
        return;
      }

      const result = getData(await paymentApi.createVnpayPayment({ appointmentId }));
      if (!result?.paymentUrl) throw new Error('Không lấy được URL thanh toán');
      window.location.href = result.paymentUrl;
    } catch (err) {
      setError(err?.response?.data?.message || err.message || 'Lỗi xử lý thanh toán');
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="checkout-loading">
        <div className="checkout-spinner" />
        Đang tải thông tin hoá đơn...
      </div>
    );
  }

  if (!record) {
    return (
      <div className="checkout-page checkout-empty">
        <h1>Không tìm thấy bệnh án</h1>
        <p>Hoá đơn này chưa liên kết được với bệnh án hợp lệ.</p>
        <Link to={`/${rolePath}/billing`} className="checkout-primary-link">Quay lại hoá đơn</Link>
      </div>
    );
  }

  const status = existingPayment?.status;
  const canPay = isStaff || (isPatient && method === 'vnpay');

  return (
    <div className="checkout-page">
      <nav className="checkout-breadcrumb">
        <Link to={`/${rolePath}/billing`}>Hoá đơn</Link>
        <span>/</span>
        <span>Chi tiết thanh toán</span>
      </nav>

      <header className="checkout-heading">
        <div>
          <h1>Thanh toán</h1>
          <p>Kiểm tra thông tin bệnh án và hoá đơn trước khi thanh toán.</p>
        </div>
        {status && (
          <span className={`checkout-status checkout-status--${status}`}>
            {STATUS_LABELS[status] || status}
          </span>
        )}
      </header>

      {error && <div className="checkout-alert checkout-alert--error">{error}</div>}

      <div className="checkout-layout">
        <main className="checkout-main">
          {existingPayment && (
            <div className="checkout-alert checkout-alert--info">
              Hoá đơn hiện tại: <strong>{existingPayment.transaction_code || existingPayment.id}</strong>
            </div>
          )}

          <section className="checkout-card">
            <div className="checkout-card__header">
              <h2>Thông tin bệnh án</h2>
            </div>
            <div className="record-grid">
              <div className="record-field">
                <span>Bệnh nhân</span>
                <strong>{record.patientName}</strong>
              </div>
              <div className="record-field">
                <span>Bác sĩ</span>
                <strong>{record.doctorName}</strong>
              </div>
              <div className="record-field">
                <span>Ngày khám</span>
                <strong>{formatDate(record.visitDate)}</strong>
              </div>
              <div className="record-field record-field--wide">
                <span>Chẩn đoán</span>
                <strong>{record.diagnosis || '---'}</strong>
              </div>
            </div>
          </section>

          {record.invoiceItems.length > 0 && (
            <section className="checkout-card">
              <div className="checkout-card__header">
                <h2>Chi tiết dịch vụ</h2>
              </div>
              <table className="invoice-table">
                <thead>
                  <tr>
                    <th>Dịch vụ</th>
                    <th>Đơn giá</th>
                    <th>SL</th>
                    <th>Thành tiền</th>
                  </tr>
                </thead>
                <tbody>
                  {record.invoiceItems.map((item, index) => (
                    <tr key={`${item.name}-${index}`}>
                      <td>{item.name}</td>
                      <td>{formatCurrency(item.price)}</td>
                      <td>{item.quantity}</td>
                      <td>{formatCurrency(item.price * item.quantity)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}
        </main>

        <aside className="checkout-sidebar">
          <section className="checkout-card">
            <div className="checkout-card__header">
              <h2>Hình thức thanh toán</h2>
            </div>
            <div className="method-list">
              {PAYMENT_METHODS.map((item) => (
                <label key={item.id} className={`method-option ${method === item.id ? 'selected' : ''}`}>
                  <input
                    type="radio"
                    name="method"
                    value={item.id}
                    checked={method === item.id}
                    onChange={() => setMethod(item.id)}
                    disabled={item.id === 'cash' && isPatient}
                  />
                  <span className="method-icon">{item.id === 'cash' ? 'TM' : 'VP'}</span>
                  <span className="method-info">
                    <strong>{item.label}</strong>
                    <span>{item.desc}</span>
                  </span>
                </label>
              ))}
            </div>
          </section>

          <section className="checkout-card summary-card">
            <div className="checkout-card__header">
              <h2>Tổng cộng</h2>
            </div>
            <div className="summary-rows">
              <div className="summary-row">
                <span>Phí khám bệnh</span>
                <strong>{formatCurrency(record.consultationFee)}</strong>
              </div>
              <div className="summary-row total">
                <span>Tổng thanh toán</span>
                <strong>{formatCurrency(record.totalAmount)}</strong>
              </div>
            </div>

            {canPay ? (
              <button className="checkout-pay-button" onClick={handleCheckout} disabled={processing || status === 'paid'}>
                {processing ? 'Đang xử lý...' : method === 'cash' ? 'Xác nhận tiền mặt' : 'Chuyển đến VNPay'}
              </button>
            ) : (
              <div className="checkout-alert checkout-alert--info">
                Bệnh nhân chỉ có thể thanh toán trực tuyến bằng VNPay.
              </div>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}
