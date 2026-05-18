import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import medicalApi from '../../api/medical.api';
import useAuthStore from '../../store/auth.store';
import Spinner from '../../components/common/Spinner';
import ErrorMessage from '../../components/common/ErrorMessage';
import StatusBadge from '../../components/common/StatusBadge';
import { formatDate, formatDateTime, getRecordStatus, validate, validators } from '../../utils/helpers';
import './MedicalRecordDetail.css';

const EMPTY_FORM = {
  diagnosis: '',
  chiefComplaint: '',
  clinicalFindings: '',
  treatment: '',
  followUpDate: '',
  notes: '',
  status: 'active',
};

function buildFormErrors(form) {
  const errors = {};
  const req = validators.required;
  if (validate(form.diagnosis, [req])) errors.diagnosis = validate(form.diagnosis, [req]);
  if (validate(form.chiefComplaint, [req])) errors.chiefComplaint = validate(form.chiefComplaint, [req]);
  return errors;
}

export default function MedicalRecordDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const isDoctor = user?.role === 'doctor';
  const isNew = id === 'new';

  const [record, setRecord] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState({});
  const [editMode, setEditMode] = useState(isNew);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState('');

  const fetchRecord = useCallback(async () => {
    if (isNew) return;
    setLoading(true);
    setError(null);
    try {
      const res = await medicalApi.getRecordById(id);
      const data = res.data;
      setRecord(data);
      setForm({
        diagnosis: data.diagnosis || '',
        chiefComplaint: data.chiefComplaint || '',
        clinicalFindings: data.clinicalFindings || '',
        treatment: data.treatment || '',
        followUpDate: data.followUpDate ? data.followUpDate.slice(0, 10) : '',
        notes: data.notes || '',
        status: data.status || 'active',
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [id, isNew]);

  useEffect(() => {
    fetchRecord();
  }, [fetchRecord]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (formErrors[name]) {
      setFormErrors((prev) => ({ ...prev, [name]: null }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errors = buildFormErrors(form);
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setSaving(true);
    setError(null);
    try {
      if (isNew) {
        const res = await medicalApi.createRecord(form);
        setSuccessMsg('Tạo bệnh án thành công!');
        setTimeout(() => navigate(`/medical/${res.data._id}`), 1200);
      } else {
        const res = await medicalApi.updateRecord(id, form);
        setRecord(res.data);
        setEditMode(false);
        setSuccessMsg('Cập nhật thành công!');
        setTimeout(() => setSuccessMsg(''), 3000);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Spinner text="Đang tải bệnh án..." />;

  const statusMeta = record ? getRecordStatus(record.status) : null;

  return (
    <div className="page-container">
      {/* Breadcrumb */}
      <nav className="breadcrumb">
        <Link to="/medical">Hồ sơ bệnh án</Link>
        <span>›</span>
        <span>{isNew ? 'Tạo mới' : (record?.code || id.slice(-8).toUpperCase())}</span>
      </nav>

      <div className="detail-header">
        <div>
          <h1 className="page-title">
            {isNew ? 'Tạo bệnh án mới' : `Bệnh án ${record?.code || ''}`}
          </h1>
          {record && (
            <div className="detail-meta">
              <StatusBadge label={statusMeta.label} color={statusMeta.color} />
              <span className="meta-sep">•</span>
              <span>Ngày khám: {formatDate(record.visitDate)}</span>
              <span className="meta-sep">•</span>
              <span>Cập nhật: {formatDateTime(record.updatedAt)}</span>
            </div>
          )}
        </div>
        <div className="detail-actions">
          {!isNew && isDoctor && !editMode && record?.status !== 'completed' && (
            <button className="btn btn-primary" onClick={() => setEditMode(true)}>
              Chỉnh sửa
            </button>
          )}
          {!isNew && (
            <Link
              to={`/medical/${id}/prescription`}
              className="btn btn-outline"
            >
              Đơn thuốc
            </Link>
          )}
          {!isNew && (
            <Link
              to={`/payment/checkout?recordId=${id}`}
              className="btn btn-outline"
            >
              Thanh toán
            </Link>
          )}
        </div>
      </div>

      {error && <ErrorMessage message={error} onRetry={isNew ? undefined : fetchRecord} />}
      {successMsg && <div className="success-msg">{successMsg}</div>}

      {/* Patient info (read-only) */}
      {record?.patient && (
        <div className="info-card">
          <h2 className="card-title">Thông tin bệnh nhân</h2>
          <div className="info-grid">
            <div className="info-item">
              <span className="info-label">Họ tên</span>
              <span className="info-value">{record.patient.fullName}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Ngày sinh</span>
              <span className="info-value">{formatDate(record.patient.dob)}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Giới tính</span>
              <span className="info-value">
                {record.patient.gender === 'male' ? 'Nam' : record.patient.gender === 'female' ? 'Nữ' : '—'}
              </span>
            </div>
            <div className="info-item">
              <span className="info-label">Điện thoại</span>
              <span className="info-value">{record.patient.phone}</span>
            </div>
            <div className="info-item">
              <span className="info-label">BHYT</span>
              <span className="info-value">{record.patient.insuranceCode || '—'}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Bác sĩ</span>
              <span className="info-value">{record.doctor?.fullName || '—'}</span>
            </div>
          </div>
        </div>
      )}

      {/* Medical form */}
      {(editMode || isNew) && isDoctor ? (
        <form className="medical-form" onSubmit={handleSubmit} noValidate>
          <div className="form-section">
            <h2 className="card-title">Thông tin lâm sàng</h2>
            <div className="form-grid">
              <div className={`form-group ${formErrors.chiefComplaint ? 'has-error' : ''}`}>
                <label className="form-label">
                  Lý do khám <span className="required">*</span>
                </label>
                <input
                  type="text"
                  name="chiefComplaint"
                  className="form-input"
                  value={form.chiefComplaint}
                  onChange={handleChange}
                  placeholder="VD: Đau đầu, sốt, ho..."
                />
                {formErrors.chiefComplaint && (
                  <span className="field-error">{formErrors.chiefComplaint}</span>
                )}
              </div>

              <div className={`form-group ${formErrors.diagnosis ? 'has-error' : ''}`}>
                <label className="form-label">
                  Chẩn đoán <span className="required">*</span>
                </label>
                <input
                  type="text"
                  name="diagnosis"
                  className="form-input"
                  value={form.diagnosis}
                  onChange={handleChange}
                  placeholder="VD: Viêm amidan cấp, ICD-10: J03.9"
                />
                {formErrors.diagnosis && (
                  <span className="field-error">{formErrors.diagnosis}</span>
                )}
              </div>

              <div className="form-group full-width">
                <label className="form-label">Khám lâm sàng</label>
                <textarea
                  name="clinicalFindings"
                  className="form-textarea"
                  rows={4}
                  value={form.clinicalFindings}
                  onChange={handleChange}
                  placeholder="Mô tả kết quả khám: sinh hiệu, dấu hiệu thực thể..."
                />
              </div>

              <div className="form-group full-width">
                <label className="form-label">Hướng điều trị</label>
                <textarea
                  name="treatment"
                  className="form-textarea"
                  rows={3}
                  value={form.treatment}
                  onChange={handleChange}
                  placeholder="Phác đồ điều trị, chỉ định..."
                />
              </div>

              <div className="form-group">
                <label className="form-label">Ngày tái khám</label>
                <input
                  type="date"
                  name="followUpDate"
                  className="form-input"
                  value={form.followUpDate}
                  onChange={handleChange}
                  min={new Date().toISOString().slice(0, 10)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Trạng thái</label>
                <select
                  name="status"
                  className="form-select"
                  value={form.status}
                  onChange={handleChange}
                >
                  <option value="draft">Nháp</option>
                  <option value="active">Đang điều trị</option>
                  <option value="completed">Hoàn thành</option>
                  <option value="cancelled">Đã huỷ</option>
                </select>
              </div>

              <div className="form-group full-width">
                <label className="form-label">Ghi chú thêm</label>
                <textarea
                  name="notes"
                  className="form-textarea"
                  rows={2}
                  value={form.notes}
                  onChange={handleChange}
                  placeholder="Lưu ý đặc biệt, dị ứng thuốc..."
                />
              </div>
            </div>
          </div>

          <div className="form-actions">
            {!isNew && (
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => {
                  setEditMode(false);
                  setFormErrors({});
                }}
                disabled={saving}
              >
                Huỷ
              </button>
            )}
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Đang lưu...' : isNew ? 'Tạo bệnh án' : 'Lưu thay đổi'}
            </button>
          </div>
        </form>
      ) : (
        /* Read-only view */
        record && (
          <div className="info-card">
            <h2 className="card-title">Thông tin lâm sàng</h2>
            <div className="info-grid">
              <div className="info-item">
                <span className="info-label">Lý do khám</span>
                <span className="info-value">{record.chiefComplaint || '—'}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Chẩn đoán</span>
                <span className="info-value">{record.diagnosis || '—'}</span>
              </div>
              <div className="info-item full-width">
                <span className="info-label">Khám lâm sàng</span>
                <span className="info-value">{record.clinicalFindings || '—'}</span>
              </div>
              <div className="info-item full-width">
                <span className="info-label">Hướng điều trị</span>
                <span className="info-value">{record.treatment || '—'}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Tái khám</span>
                <span className="info-value">{formatDate(record.followUpDate)}</span>
              </div>
              <div className="info-item full-width">
                <span className="info-label">Ghi chú</span>
                <span className="info-value">{record.notes || '—'}</span>
              </div>
            </div>
          </div>
        )
      )}
    </div>
  );
}
