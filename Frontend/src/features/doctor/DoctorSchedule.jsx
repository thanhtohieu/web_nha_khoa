import { useEffect, useState, useCallback } from 'react';
import useDoctorStore from '../../store/doctor.store';
import {
  Spinner, Alert, PageHeader, Modal, Btn,
  Card, CardHeader, CardBody, Icon, FormGroup,
  getWeekDates, toISODate, VN_DAYS,
} from './DoctorUI';
import './doctor.module.css';

/* ── Validate slot times ── */
function validateSlot(v) {
  const e = {};
  if (!v.startTime) e.startTime = 'Vui lòng chọn giờ bắt đầu.';
  if (!v.endTime)   e.endTime   = 'Vui lòng chọn giờ kết thúc.';
  if (v.startTime && v.endTime && v.startTime >= v.endTime)
    e.endTime = 'Giờ kết thúc phải sau giờ bắt đầu.';
  return e;
}

/* ── Time options (every 15 min from 06:00 to 21:00) ── */
const TIME_OPTIONS = (() => {
  const opts = [];
  for (let h = 6; h <= 21; h++) {
    for (let m = 0; m < 60; m += 15) {
      opts.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
    }
  }
  return opts;
})();

/* ── Add-slot modal ── */
function AddSlotModal({ date, onClose, onSaved }) {
  const { upsertSchedule } = useDoctorStore();
  const [values, setValues] = useState({ startTime: '', endTime: '', maxPatients: 1 });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [serverErr, setServerErr] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setValues((v) => ({ ...v, [name]: value }));
    setErrors((e) => ({ ...e, [name]: undefined }));
    setServerErr(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validateSlot(values);
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setLoading(true);
    const result = await upsertSchedule({
      date,
      slots: [{ startTime: values.startTime, endTime: values.endTime, maxPatients: Number(values.maxPatients) }],
    });
    setLoading(false);
    if (result.success) { onSaved(); onClose(); }
    else setServerErr(result.message);
  };

  const displayDate = new Date(date + 'T00:00:00').toLocaleDateString('vi-VN', {
    weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric',
  });

  return (
    <Modal
      title={`Thêm slot – ${displayDate}`}
      onClose={onClose}
      footer={
        <>
          <button className="btn btn-secondary" onClick={onClose} disabled={loading}>Huỷ</button>
          <Btn type="submit" form="add-slot-form" disabled={loading}>
            {loading
              ? <><div className="spinner spinner-sm" style={{ borderTopColor: 'white' }} /> Đang lưu…</>
              : <><Icon name="plus" size={14} /> Thêm slot</>
            }
          </Btn>
        </>
      }
    >
      {serverErr && <div className="alert alert-error" style={{ marginBottom: 16 }}>{serverErr}</div>}
      <form id="add-slot-form" onSubmit={handleSubmit} noValidate>
        <div style={{ marginBottom: 16 }}>
          <label className="form-label">Khung giờ *</label>
          <div className="time-range">
            <select name="startTime" className="form-control form-select"
              value={values.startTime} onChange={handleChange}
              style={errors.startTime ? { borderColor: 'var(--color-error)' } : undefined}>
              <option value="">Từ giờ</option>
              {TIME_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <span className="time-range-sep">→</span>
            <select name="endTime" className="form-control form-select"
              value={values.endTime} onChange={handleChange}
              style={errors.endTime ? { borderColor: 'var(--color-error)' } : undefined}>
              <option value="">Đến giờ</option>
              {TIME_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          {(errors.startTime || errors.endTime) && (
            <div className="form-error">⚠ {errors.startTime || errors.endTime}</div>
          )}
        </div>

        <FormGroup label="Số bệnh nhân tối đa" htmlFor="maxPatients">
          <input
            id="maxPatients" name="maxPatients" type="number"
            className="form-control"
            value={values.maxPatients}
            onChange={handleChange}
            min={1} max={20}
          />
        </FormGroup>
      </form>
    </Modal>
  );
}

/* ── Day column ── */
function DayColumn({ date, dayLabel, slots = [], isToday, onAddSlot, onDeleteSlot }) {
  const displayDate = new Date(date + 'T00:00:00');
  return (
    <div className="schedule-day-col">
      <div className="schedule-day-header">
        <div className="schedule-day-name">{dayLabel}</div>
        <div className={`schedule-day-date${isToday ? ' today' : ''}`}>
          {String(displayDate.getDate()).padStart(2, '0')}/{String(displayDate.getMonth() + 1).padStart(2, '0')}
        </div>
      </div>
      <div className="schedule-slots-list">
        {slots.length === 0 && (
          <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', textAlign: 'center', padding: '8px 0' }}>
            Chưa có slot
          </div>
        )}
        {slots.map((slot) => (
          <div key={slot.id} className={`schedule-slot-tag${slot.status === 'booked' ? ' booked' : ''}`}>
            <span>{slot.startTime}{slot.endTime ? `–${slot.endTime}` : ''}</span>
            {slot.status !== 'booked' && (
              <button
                className="schedule-slot-del"
                onClick={() => onDeleteSlot(slot.id, date)}
                title="Xoá slot"
                aria-label="Xoá slot"
              >×</button>
            )}
          </div>
        ))}
      </div>
      <button className="schedule-add-btn" onClick={() => onAddSlot(date)}>
        + Thêm slot
      </button>
    </div>
  );
}

/* ── DoctorSchedule ── */
export default function DoctorSchedule() {
  const { schedule, scheduleLoading, scheduleError,
    fetchMySchedule, deleteSlot, clearScheduleError } = useDoctorStore();

  const [weekStart, setWeekStart] = useState(() => {
    const today = new Date();
    const d = new Date(today);
    const diff = today.getDay() === 0 ? -6 : 1 - today.getDay();
    d.setDate(today.getDate() + diff);
    return d;
  });

  const [addModal, setAddModal] = useState(null); // date string
  const [deleteError, setDeleteError] = useState(null);

  const weekDates = getWeekDates(weekStart);
  const today     = toISODate(new Date());

  const load = useCallback(() => {
    const from = toISODate(weekDates[0]);
    const to   = toISODate(weekDates[6]);
    fetchMySchedule(from, to);
  }, [weekStart]);

  useEffect(() => { load(); }, [weekStart]);

  const prevWeek = () => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() - 7);
    setWeekStart(d);
  };
  const nextWeek = () => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + 7);
    setWeekStart(d);
  };

  // Find slots for a given date from schedule array
  const getSlotsForDate = (date) => {
    const entry = schedule.find((s) => s.date === date);
    return entry?.slots ?? [];
  };

  const handleDeleteSlot = async (slotId, date) => {
    setDeleteError(null);
    const result = await deleteSlot(slotId, date);
    if (!result.success) setDeleteError(result.message);
  };

  return (
    <div>
      <PageHeader
        title="Lịch làm việc"
        subtitle="Quản lý slot khám theo ngày trong tuần"
      />

      {scheduleError && <Alert type="error" onClose={clearScheduleError}>{scheduleError}</Alert>}
      {deleteError   && <Alert type="error" onClose={() => setDeleteError(null)}>{deleteError}</Alert>}

      {/* Week navigation */}
      <Card style={{ marginBottom: 20 }}>
        <CardBody style={{ padding: '14px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <button className="btn btn-secondary btn-sm" onClick={prevWeek}>
              <Icon name="chevLeft" size={14} /> Tuần trước
            </button>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '0.95rem' }}>
                Tuần {weekDates[0].toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })}
                {' – '}
                {weekDates[6].toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })}
              </div>
              {scheduleLoading && (
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: 2 }}>
                  Đang tải…
                </div>
              )}
            </div>
            <button className="btn btn-secondary btn-sm" onClick={nextWeek}>
              Tuần sau <Icon name="chevRight" size={14} />
            </button>
          </div>
        </CardBody>
      </Card>

      {/* Weekly grid */}
      {scheduleLoading && schedule.length === 0
        ? <Spinner label="Đang tải lịch…" />
        : (
          <div className="schedule-manage-grid">
            {weekDates.map((d, i) => {
              const iso = toISODate(d);
              return (
                <DayColumn
                  key={iso}
                  date={iso}
                  dayLabel={VN_DAYS[i]}
                  slots={getSlotsForDate(iso)}
                  isToday={iso === today}
                  onAddSlot={setAddModal}
                  onDeleteSlot={handleDeleteSlot}
                />
              );
            })}
          </div>
        )
      }

      {/* Legend */}
      <div style={{ display: 'flex', gap: 16, marginTop: 16, fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 12, height: 12, borderRadius: 3, background: 'var(--color-accent-light)', display: 'inline-block' }} />
          Slot trống
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 12, height: 12, borderRadius: 3, background: '#f3f4f6', display: 'inline-block' }} />
          Đã đặt (không thể xoá)
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ color: 'var(--color-accent)', fontWeight: 700 }}>•</span>
          Ngày hôm nay
        </div>
      </div>

      {/* Add slot modal */}
      {addModal && (
        <AddSlotModal
          date={addModal}
          onClose={() => setAddModal(null)}
          onSaved={load}
        />
      )}
    </div>
  );
}
