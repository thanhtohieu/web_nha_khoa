import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import paymentApi from '../../api/payment.api';
import Spinner from '../../components/common/Spinner';
import { formatCurrency, formatDateTime } from '../../utils/helpers';
import './PaymentResult.css';

/**
 * PaymentResult handles two scenarios:
 * 1. Direct result: ?paymentId=xxx&status=paid  (cash confirmed)
 * 2. VNPay return:  ?vnp_ResponseCode=00&vnp_TxnRef=xxx&... (all VNPay params present)
 */
export default function PaymentResult() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [payment, setPayment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [verifyResult, setVerifyResult] = useState(null);

  // Detect which scenario
  const isVnpayReturn = searchParams.has('vnp_ResponseCode');
  const paymentId = searchParams.get('paymentId');
  const directStatus = searchParams.get('status');

  const verifyRef = useRef(false);

  const verifyVnpay = useCallback(async () => {
    if (verifyRef.current) return;
    verifyRef.current = true;

    try {
      const params = Object.fromEntries(searchParams.entries());
      const res = await paymentApi.verifyVnpay(params);
      setVerifyResult(res.data);
      setPayment(res.data?.payment);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [searchParams]);

  const fetchPayment = useCallback(async () => {
    if (!paymentId) { setLoading(false); return; }
    try {
      const res = await paymentApi.getPaymentById(paymentId);
      setPayment(res.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [paymentId]);

  useEffect(() => {
    if (isVnpayReturn) {
      verifyVnpay();
    } else {
      fetchPayment();
    }
  }, [isVnpayReturn, verifyVnpay, fetchPayment]);

  // Determine final status
  const isPaid = (() => {
    if (directStatus === 'paid') return true;
    if (isVnpayReturn) {
      return (
        verifyResult?.success === true ||
        searchParams.get('vnp_ResponseCode') === '00'
      );
    }
    return payment?.status === 'paid';
  })();

  if (loading) return <Spinner text="Đang xác nhận thanh toán..." />;

  return (
    <div className="result-page">
      <div className="result-card">
        {/* Status icon */}
        <div className={`result-icon ${isPaid ? 'success' : 'failed'}`}>
          {isPaid ? '✓' : '✗'}
        </div>

        <h1 className={`result-title ${isPaid ? 'success' : 'failed'}`}>
          {isPaid ? 'Thanh toán thành công!' : 'Thanh toán thất bại'}
        </h1>

        {error && (
          <p className="result-error">{error}</p>
        )}

        {!isPaid && !error && (
          <p className="result-desc">
            Giao dịch không được xác nhận. Vui lòng thử lại hoặc chọn hình thức khác.
          </p>
        )}

        {/* Payment details */}
        {payment && (
          <div className="result-details">
            <div className="detail-row">
              <span className="detail-label">Mã hoá đơn</span>
              <span className="detail-value code">
                {payment.code || payment._id.slice(-8).toUpperCase()}
              </span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Bệnh nhân</span>
              <span className="detail-value">{payment.patient?.fullName || '—'}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Hình thức</span>
              <span className="detail-value">
                {payment.method === 'cash' ? 'Tiền mặt' : 'VNPay'}
              </span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Thời gian</span>
              <span className="detail-value">{formatDateTime(payment.paidAt || payment.createdAt)}</span>
            </div>
            <div className="detail-row total-row">
              <span className="detail-label">Tổng thanh toán</span>
              <span className="detail-value amount">{formatCurrency(payment.totalAmount)}</span>
            </div>
          </div>
        )}

        {/* VNPay transaction ID */}
        {isVnpayReturn && searchParams.get('vnp_TransactionNo') && (
          <div className="result-details" style={{ marginTop: 12 }}>
            <div className="detail-row">
              <span className="detail-label">Mã giao dịch VNPay</span>
              <span className="detail-value code">{searchParams.get('vnp_TransactionNo')}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Ngân hàng</span>
              <span className="detail-value">{searchParams.get('vnp_BankCode') || '—'}</span>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="result-actions">
          {isPaid && payment && (
            <button className="btn btn-outline" onClick={() => window.print()}>
              🖨 In hoá đơn
            </button>
          )}

          {!isPaid && payment && (
            <Link
              to={`/payment/checkout?recordId=${payment.medicalRecord?._id || payment.record}`}
              className="btn btn-primary"
            >
              Thử lại
            </Link>
          )}

          <Link to="/payment" className="btn btn-ghost">
            Danh sách thanh toán
          </Link>

          {payment?.medicalRecord && (
            <Link
              to={`/medical/${payment.medicalRecord._id || payment.medicalRecord}`}
              className="btn btn-ghost"
            >
              Xem bệnh án
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
