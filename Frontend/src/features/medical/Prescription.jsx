import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import medicalApi from '../../api/medical.api';
import useAuthStore from '../../store/auth.store';
import Spinner from '../../components/common/Spinner';
import ErrorMessage from '../../components/common/ErrorMessage';
import { validate, validators } from '../../utils/helpers';
import './Prescription.css';

const EMPTY_ITEM = {
  medicineId: '',
  medicineName: '',
  dosage: '',
  quantity: '',
  unit: 'viên',
  frequency: '',
  duration: '',
  instruction: '',
};

function buildItemErrors(item) {
  const errors = {};
  const req = validators.required;
  if (validate(item.medicineName, [req])) errors.medicineName = validate(item.medicineName, [req]);
  if (validate(item.dosage, [req])) errors.dosage = validate(item.dosage, [req]);
  if (validate(item.quantity, [req])) errors.quantity = validate(item.quantity, [req]);
  if (validate(item.frequency, [req])) errors.frequency = validate(item.frequency, [req]);
  return errors;
}

export default function Prescription() {
  const { id: recordId } = useParams();
  const { user } = useAuthStore();
  const isDoctor = user?.role === 'doctor';

  const [prescription, setPrescription] = useState(null);
  const [items, setItems] = useState([{ ...EMPTY_ITEM, _key: Date.now() }]);
  const [notes, setNotes] = useState('');
  const [itemErrors, setItemErrors] = useState([]);
  const [editMode, setEditMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState('');
  const [medicines, setMedicines] = useState([]);
  const [medSearch, setMedSearch] = useState('');

  const fetchPrescription = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await medicalApi.getPrescriptionByRecord(recordId);
      const data = res.data;
      if (data) {
        setPrescription(data);
        setItems(
          data.items.map((item, i) => ({ ...item, _key: i }))
        );
        setNotes(data.notes || '');
      } else {
        // No prescription yet
        setPrescription(null);
        if (isDoctor) setEditMode(true);
      }
    } catch (err) {
      if (err.message?.includes('404') || err.message?.includes('not found')) {
        setPrescription(null);
        if (isDoctor) setEditMode(true);
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  }, [recordId, isDoctor]);

  const fetchMedicines = useCallback(async () => {
    try {
      const res = await medicalApi.getMedicines({ search: medSearch, limit: 20 });
      setMedicines(res.data?.medicines || []);
    } catch {
      // silently fail — user can type manually
    }
  }, [medSearch]);

  useEffect(() => { fetchPrescription(); }, [fetchPrescription]);
  useEffect(() => {
    if (editMode) fetchMedicines();
  }, [editMode, fetchMedicines]);

  // ── Item handlers ──────────────────────────────────────────────────────────

  const addItem = () => {
    setItems((prev) => [...prev, { ...EMPTY_ITEM, _key: Date.now() }]);
    setItemErrors((prev) => [...prev, {}]);
  };

  const removeItem = (idx) => {
    setItems((prev) => prev.filter((_, i) => i !== idx));
    setItemErrors((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleItemChange = (idx, field, value) => {
    setItems((prev) =>
      prev.map((item, i) => (i === idx ? { ...item, [field]: value } : item))
    );
    if (itemErrors[idx]?.[field]) {
      setItemErrors((prev) =>
        prev.map((e, i) =>
          i === idx ? { ...e, [field]: null } : e
        )
      );
    }
  };

  const selectMedicine = (idx, med) => {
    handleItemChange(idx, 'medicineId', med._id);
    handleItemChange(idx, 'medicineName', med.name);
    handleItemChange(idx, 'unit', med.unit || 'viên');
  };

  // ── Submit ────────────────────────────────────────────────────────────────

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate all items
    const newErrors = items.map((item) => buildItemErrors(item));
    setItemErrors(newErrors);
    if (newErrors.some((e) => Object.keys(e).length > 0)) return;

    setSaving(true);
    setError(null);
    try {
      const payload = {
        items: items.map(({ _key, ...rest }) => rest),
        notes,
      };

      let res;
      if (prescription) {
        res = await medicalApi.updatePrescription(recordId, payload);
      } else {
        res = await medicalApi.createPrescription(recordId, payload);
      }

      setPrescription(res.data);
      setEditMode(false);
      setSuccessMsg('Lưu đơn thuốc thành công!');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────

  if (loading) return <Spinner text="Đang tải đơn thuốc..." />;

  return (
    <div className="page-container">
      <nav className="breadcrumb">
        <Link to="/medical">Hồ sơ bệnh án</Link>
        <span>›</span>
        <Link to={`/medical/${recordId}`}>Chi tiết bệnh án</Link>
        <span>›</span>
        <span>Đơn thuốc</span>
      </nav>

      <div className="page-header">
        <div>
          <h1 className="page-title">Đơn thuốc</h1>
          {prescription && (
            <p className="page-subtitle">
              Cập nhật lần cuối: {new Date(prescription.updatedAt).toLocaleString('vi-VN')}
            </p>
          )}
        </div>
        {isDoctor && !editMode && prescription && (
          <button className="btn btn-primary" onClick={() => setEditMode(true)}>
            Chỉnh sửa đơn thuốc
          </button>
        )}
      </div>

      {error && <ErrorMessage message={error} onRetry={fetchPrescription} />}
      {successMsg && <div className="success-msg">{successMsg}</div>}

      {!prescription && !isDoctor && (
        <div className="empty-state">
          <span className="empty-icon">💊</span>
          <p>Chưa có đơn thuốc cho bệnh án này</p>
        </div>
      )}

      {editMode && isDoctor ? (
        <form onSubmit={handleSubmit} noValidate>
          {/* Medicine search */}
          {medicines.length > 0 && (
            <div className="info-card">
              <h2 className="card-title">Tra cứu thuốc</h2>
              <input
                type="text"
                className="form-input"
                placeholder="Tìm tên thuốc..."
                value={medSearch}
                onChange={(e) => setMedSearch(e.target.value)}
                style={{ marginBottom: 12 }}
              />
              <div className="medicine-list">
                {medicines.map((med) => (
                  <div key={med._id} className="medicine-item">
                    <div>
                      <strong>{med.name}</strong>
                      <span className="muted"> — {med.activeIngredient}</span>
                    </div>
                    <div className="medicine-meta">
                      {med.unit} · {med.concentration}
                    </div>
                    <div className="medicine-actions">
                      {items.map((_, idx) => (
                        <button
                          type="button"
                          key={idx}
                          className="btn btn-sm btn-outline"
                          onClick={() => selectMedicine(idx, med)}
                        >
                          Thêm vào dòng {idx + 1}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Item rows */}
          <div className="info-card">
            <h2 className="card-title">Danh sách thuốc</h2>

            {items.map((item, idx) => (
              <div key={item._key} className="rx-item">
                <div className="rx-item-header">
                  <span className="rx-index">#{idx + 1}</span>
                  {items.length > 1 && (
                    <button
                      type="button"
                      className="btn btn-sm btn-danger"
                      onClick={() => removeItem(idx)}
                    >
                      Xoá
                    </button>
                  )}
                </div>

                <div className="form-grid">
                  <div className={`form-group ${itemErrors[idx]?.medicineName ? 'has-error' : ''}`}>
                    <label className="form-label">Tên thuốc <span className="required">*</span></label>
                    <input
                      type="text"
                      className="form-input"
                      value={item.medicineName}
                      onChange={(e) => handleItemChange(idx, 'medicineName', e.target.value)}
                      placeholder="VD: Paracetamol 500mg"
                    />
                    {itemErrors[idx]?.medicineName && (
                      <span className="field-error">{itemErrors[idx].medicineName}</span>
                    )}
                  </div>

                  <div className={`form-group ${itemErrors[idx]?.dosage ? 'has-error' : ''}`}>
                    <label className="form-label">Liều lượng <span className="required">*</span></label>
                    <input
                      type="text"
                      className="form-input"
                      value={item.dosage}
                      onChange={(e) => handleItemChange(idx, 'dosage', e.target.value)}
                      placeholder="VD: 1 viên x 3 lần/ngày"
                    />
                    {itemErrors[idx]?.dosage && (
                      <span className="field-error">{itemErrors[idx].dosage}</span>
                    )}
                  </div>

                  <div className={`form-group ${itemErrors[idx]?.quantity ? 'has-error' : ''}`}>
                    <label className="form-label">Số lượng <span className="required">*</span></label>
                    <input
                      type="number"
                      className="form-input"
                      value={item.quantity}
                      onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                      placeholder="30"
                      min={1}
                    />
                    {itemErrors[idx]?.quantity && (
                      <span className="field-error">{itemErrors[idx].quantity}</span>
                    )}
                  </div>

                  <div className="form-group">
                    <label className="form-label">Đơn vị</label>
                    <select
                      className="form-select"
                      value={item.unit}
                      onChange={(e) => handleItemChange(idx, 'unit', e.target.value)}
                    >
                      {['viên', 'gói', 'ống', 'lọ', 'chai', 'tuýp', 'hộp'].map((u) => (
                        <option key={u} value={u}>{u}</option>
                      ))}
                    </select>
                  </div>

                  <div className={`form-group ${itemErrors[idx]?.frequency ? 'has-error' : ''}`}>
                    <label className="form-label">Tần suất <span className="required">*</span></label>
                    <input
                      type="text"
                      className="form-input"
                      value={item.frequency}
                      onChange={(e) => handleItemChange(idx, 'frequency', e.target.value)}
                      placeholder="VD: 3 lần/ngày"
                    />
                    {itemErrors[idx]?.frequency && (
                      <span className="field-error">{itemErrors[idx].frequency}</span>
                    )}
                  </div>

                  <div className="form-group">
                    <label className="form-label">Thời gian dùng</label>
                    <input
                      type="text"
                      className="form-input"
                      value={item.duration}
                      onChange={(e) => handleItemChange(idx, 'duration', e.target.value)}
                      placeholder="VD: 7 ngày"
                    />
                  </div>

                  <div className="form-group full-width">
                    <label className="form-label">Hướng dẫn sử dụng</label>
                    <input
                      type="text"
                      className="form-input"
                      value={item.instruction}
                      onChange={(e) => handleItemChange(idx, 'instruction', e.target.value)}
                      placeholder="VD: Uống sau ăn, tránh rượu bia"
                    />
                  </div>
                </div>
              </div>
            ))}

            <button type="button" className="btn btn-ghost add-item-btn" onClick={addItem}>
              + Thêm thuốc
            </button>
          </div>

          <div className="info-card">
            <h2 className="card-title">Ghi chú đơn thuốc</h2>
            <textarea
              className="form-textarea"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Dặn dò thêm cho bệnh nhân..."
            />
          </div>

          <div className="form-actions">
            {prescription && (
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setEditMode(false)}
                disabled={saving}
              >
                Huỷ
              </button>
            )}
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Đang lưu...' : 'Lưu đơn thuốc'}
            </button>
          </div>
        </form>
      ) : (
        prescription && (
          /* Read-only prescription view */
          <div className="info-card">
            <h2 className="card-title">Danh sách thuốc</h2>
            <div className="rx-table-wrap">
              <table className="data-table rx-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Tên thuốc</th>
                    <th>Liều lượng</th>
                    <th>Số lượng</th>
                    <th>Tần suất</th>
                    <th>Thời gian</th>
                    <th>Hướng dẫn</th>
                  </tr>
                </thead>
                <tbody>
                  {prescription.items.map((item, idx) => (
                    <tr key={idx}>
                      <td>{idx + 1}</td>
                      <td><strong>{item.medicineName}</strong></td>
                      <td>{item.dosage}</td>
                      <td>{item.quantity} {item.unit}</td>
                      <td>{item.frequency}</td>
                      <td>{item.duration || '—'}</td>
                      <td>{item.instruction || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {prescription.notes && (
              <div className="rx-notes">
                <strong>Ghi chú:</strong> {prescription.notes}
              </div>
            )}
          </div>
        )
      )}
    </div>
  );
}
