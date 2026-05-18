import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import useappointment.store from '../../store/appointment.store';
import './Booking.css';

const STEPS = ['Chọn bác sĩ', 'Chọn ngày & giờ', 'Xác nhận'];

const validate = {
  step1: (form) => {
    const errs = {};
    if (!form.doctorId) errs.doctorId = 'Vui lòng chọn bác sĩ';
    return errs;
  },
  step2: (form) => {
    const errs = {};
    if (!form.date) errs.date = 'Vui lòng chọn ngày';
    if (!form.slotId) errs.slotId = 'Vui lòng chọn khung giờ';
    return errs;
  },
  step3: (form) => {
    const errs = {};
    if (!form.reason?.trim()) errs.reason = 'Vui lòng nhập lý do khám';
    if (form.reason?.trim().length < 5) errs.reason = 'Lý do tối thiểu 5 ký tự';
    return errs;
  },
};

const getTodayStr = () => new Date().toISOString().split('T')[0];
const getMaxDateStr = () => {
  const d = new Date();
  d.setDate(d.getDate() + 30);
  return d.toISOString().split('T')[0];
};

export default function Booking() {
  const navigate = useNavigate();
  const { doctors, doctorsLoading, slots, slotsLoading, bookingLoading, bookingError,
    fetchDoctors, fetchSlots, createAppointment, clearBookingError } = useappointment.store();

  const [step, setStep] = useState(0);
  const [form, setForm] = useState({ doctorId: '', doctorName: '', date: '', slotId: '', slotTime: '', reason: '', notes: '' });
  const [errors, setErrors] = useState({});
  const [successId, setSuccessId] = useState(null);
  const [doctorSearch, setDoctorSearch] = useState('');

  useEffect(() => {
    fetchDoctors();
    clearBookingError();
  }, []);

  useEffect(() => {
    if (form.doctorId && form.date) fetchSlots(form.doctorId, form.date);
  }, [form.doctorId, form.date]);

  const setField = (key, val) => {
    setForm((f) => ({ ...f, [key]: val }));
    setErrors((e) => { const n = { ...e }; delete n[key]; return n; });
  };

  const filteredDoctors = doctors.filter((d) =>
    d.fullName?.toLowerCase().includes(doctorSearch.toLowerCase()) ||
    d.specialization?.toLowerCase().includes(doctorSearch.toLowerCase())
  );

  const goNext = useCallback(() => {
    const stepKey = ['step1', 'step2', 'step3'][step];
    const errs = validate[stepKey]?.(form) || {};
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setErrors({});
    setStep((s) => s + 1);
  }, [step, form]);

  const goBack = () => { setErrors({}); setStep((s) => s - 1); };

  const handleSubmit = async () => {
    const errs = validate.step3(form);
    if (Object.keys(errs).length) { setErrors(errs); return; }
    const result = await createAppointment({
      doctorId: form.doctorId,
      slotId: form.slotId,
      date: form.date,
      reason: form.reason.trim(),
      notes: form.notes.trim(),
    });
    if (result.success) setSuccessId(result.data?.id || result.data?._id || 'new');
  };

  if (successId) return (
    <div className="booking-success">
      <div className="success-icon">✓</div>
      <h2>Đặt lịch thành công!</h2>
      <p>Lịch hẹn với <strong>{form.doctorName}</strong> vào <strong>{form.slotTime}</strong> ngày <strong>{form.date}</strong> đã được ghi nhận.</p>
      <p className="success-note">Chúng tôi sẽ xác nhận lịch hẹn trong thời gian sớm nhất.</p>
      <div className="success-actions">
        <button className="btn-primary" onClick={() => navigate('/appointments')}>Xem lịch hẹn</button>
        <button className="btn-ghost" onClick={() => { setStep(0); setForm({ doctorId: '', doctorName: '', date: '', slotId: '', slotTime: '', reason: '', notes: '' }); setSuccessId(null); }}>Đặt lịch khác</button>
      </div>
    </div>
  );

  return (
    <div className="booking-container">
      <div className="booking-header">
        <h1>Đặt lịch khám</h1>
        <div className="stepper">
          {STEPS.map((label, i) => (
            <div key={i} className={`step ${i === step ? 'active' : i < step ? 'done' : ''}`}>
              <div className="step-dot">{i < step ? '✓' : i + 1}</div>
              <span className="step-label">{label}</span>
              {i < STEPS.length - 1 && <div className="step-line" />}
            </div>
          ))}
        </div>
      </div>

      <div className="booking-body">
        {step === 0 && (
          <div className="step-panel">
            <h2>Chọn bác sĩ</h2>
            <input
              className="search-input"
              placeholder="Tìm theo tên hoặc chuyên khoa..."
              value={doctorSearch}
              onChange={(e) => setDoctorSearch(e.target.value)}
            />
            {errors.doctorId && <p className="field-error">{errors.doctorId}</p>}
            {doctorsLoading ? <div className="loading-spinner" /> : (
              <div className="doctor-grid">
                {filteredDoctors.length === 0 && <p className="empty-text">Không tìm thấy bác sĩ</p>}
                {filteredDoctors.map((doc) => (
                  <div
                    key={doc.id || doc._id}
                    className={`doctor-card ${form.doctorId === (doc.id || doc._id) ? 'selected' : ''}`}
                    onClick={() => { setField('doctorId', doc.id || doc._id); setField('doctorName', doc.fullName); }}
                  >
                    <div className="doctor-avatar">{doc.fullName?.[0] || 'D'}</div>
                    <div className="doctor-info">
                      <h3>{doc.fullName}</h3>
                      <p className="doctor-spec">{doc.specialization}</p>
                      {doc.experience && <p className="doctor-exp">{doc.experience} năm kinh nghiệm</p>}
                    </div>
                    {form.doctorId === (doc.id || doc._id) && <div className="check-mark">✓</div>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {step === 1 && (
          <div className="step-panel">
            <h2>Chọn ngày & giờ khám</h2>
            <div className="field-group">
              <label>Ngày khám</label>
              <input
                type="date"
                className={`field-input ${errors.date ? 'error' : ''}`}
                min={getTodayStr()}
                max={getMaxDateStr()}
                value={form.date}
                onChange={(e) => { setField('date', e.target.value); setField('slotId', ''); setField('slotTime', ''); }}
              />
              {errors.date && <p className="field-error">{errors.date}</p>}
            </div>
            <div className="field-group">
              <label>Khung giờ {form.date && `(${form.date})`}</label>
              {!form.date && <p className="hint-text">Vui lòng chọn ngày trước</p>}
              {form.date && slotsLoading && <div className="loading-spinner" />}
              {form.date && !slotsLoading && (
                <>
                  {errors.slotId && <p className="field-error">{errors.slotId}</p>}
                  <div className="slots-grid">
                    {slots.length === 0 && <p className="empty-text">Không có khung giờ trống trong ngày này</p>}
                    {slots.map((slot) => (
                      <button
                        key={slot.id || slot._id}
                        disabled={!slot.available}
                        className={`slot-btn ${!slot.available ? 'unavailable' : ''} ${form.slotId === (slot.id || slot._id) ? 'selected' : ''}`}
                        onClick={() => { setField('slotId', slot.id || slot._id); setField('slotTime', slot.time); }}
                      >
                        {slot.time}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="step-panel">
            <h2>Xác nhận thông tin</h2>
            <div className="confirm-card">
              <div className="confirm-row"><span>Bác sĩ</span><strong>{form.doctorName}</strong></div>
              <div className="confirm-row"><span>Ngày</span><strong>{form.date}</strong></div>
              <div className="confirm-row"><span>Giờ</span><strong>{form.slotTime}</strong></div>
            </div>
            <div className="field-group">
              <label>Lý do khám <span className="required">*</span></label>
              <textarea
                className={`field-textarea ${errors.reason ? 'error' : ''}`}
                placeholder="Mô tả triệu chứng hoặc lý do khám..."
                rows={4}
                value={form.reason}
                onChange={(e) => setField('reason', e.target.value)}
              />
              {errors.reason && <p className="field-error">{errors.reason}</p>}
            </div>
            <div className="field-group">
              <label>Ghi chú thêm (tùy chọn)</label>
              <textarea
                className="field-textarea"
                placeholder="Thông tin bổ sung cho bác sĩ..."
                rows={2}
                value={form.notes}
                onChange={(e) => setField('notes', e.target.value)}
              />
            </div>
            {bookingError && <div className="api-error">{bookingError}</div>}
          </div>
        )}
      </div>

      <div className="booking-footer">
        {step > 0 && <button className="btn-secondary" onClick={goBack} disabled={bookingLoading}>Quay lại</button>}
        <div className="footer-right">
          {step < 2
            ? <button className="btn-primary" onClick={goNext}>Tiếp theo</button>
            : <button className="btn-primary" onClick={handleSubmit} disabled={bookingLoading}>
                {bookingLoading ? 'Đang đặt lịch...' : 'Xác nhận đặt lịch'}
              </button>
          }
        </div>
      </div>
    </div>
  );
}
