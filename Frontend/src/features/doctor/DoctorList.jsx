import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import useDoctorStore from '../../store/doctor.store';
import {
  Spinner, Alert, AvatarPlaceholder, Stars, Pagination,
  PageHeader, EmptyState, Icon, Badge,
} from './DoctorUI';
import './doctor.module.css';

/* ── Debounce ── */
function useDebounce(val, ms = 400) {
  const [v, setV] = useState(val);
  useEffect(() => { const t = setTimeout(() => setV(val), ms); return () => clearTimeout(t); }, [val, ms]);
  return v;
}

/* ── Doctor card ── */
function DoctorCard({ doctor, onClick }) {
  const fullName = doctor.user?.full_name || 'Bác sĩ';
  const specialtyName = doctor.specialty?.name || 'Đa khoa';
  const avatarUrl = doctor.user?.avatar;
  const rating = parseFloat(doctor.rating_avg || 0);
  const reviewCount = doctor.rating_count || 0;
  const yearsExp = doctor.experience_years;
  const isAvailable = doctor.is_available;

  return (
    <div className="doctor-card" onClick={onClick} role="button" tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onClick()}>
      <AvatarPlaceholder name={fullName} size="lg" src={avatarUrl} />
      <div className="doctor-card-name">{fullName}</div>
      <div className="doctor-card-specialty">{specialtyName}</div>

      {reviewCount > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center' }}>
          <Stars value={rating} />
          <span style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>
            ({reviewCount})
          </span>
        </div>
      )}

      <div className="doctor-card-meta">
        <Icon name="stethoscope" size={13} />
        {yearsExp != null ? `${yearsExp} năm kinh nghiệm` : 'Bác sĩ chuyên khoa'}
      </div>

      <Badge
        label={isAvailable ? 'Đang làm việc' : 'Nghỉ'}
        type={isAvailable ? 'active' : 'inactive'}
      />

      <div className="doctor-card-actions">
        <button className="btn btn-primary" style={{ width: '100%' }} onClick={(e) => { e.stopPropagation(); onClick(); }}>
          Xem lịch khám
        </button>
      </div>
    </div>
  );
}

/* ── DoctorList ── */
export default function DoctorList() {
  const navigate = useNavigate();
  const {
    doctors, doctorTotal, doctorPage, doctorLimit,
    specialties, listLoading, listError,
    fetchDoctors, fetchSpecialties, clearListError,
  } = useDoctorStore();

  const [search, setSearch]       = useState('');
  const [specialty, setSpecialty] = useState('');
  const debouncedSearch           = useDebounce(search);

  const load = useCallback((page = 1) => {
    fetchDoctors({ page, limit: doctorLimit, search: debouncedSearch, specialty, status: 'active' });
  }, [debouncedSearch, specialty, doctorLimit]);

  useEffect(() => { fetchSpecialties(); }, []);
  useEffect(() => { load(1); }, [debouncedSearch, specialty]);

  return (
    <div>
      <PageHeader
        title="Đội ngũ bác sĩ"
        subtitle="Tìm và đặt lịch với bác sĩ phù hợp"
      />

      {listError && <Alert type="error" onClose={clearListError}>{listError}</Alert>}

      {/* Filters */}
      <div className="filter-bar" style={{ marginBottom: 24 }}>
        <div className="search-input-wrap">
          <Icon name="search" size={15} />
          <input
            className="search-input"
            placeholder="Tìm bác sĩ theo tên…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className="filter-select"
          value={specialty}
          onChange={(e) => setSpecialty(e.target.value)}
        >
          <option value="">Tất cả chuyên khoa</option>
          {specialties.map((s) => (
            <option key={s.value ?? s} value={s.value ?? s}>{s.label ?? s}</option>
          ))}
        </select>
      </div>

      {/* Grid */}
      {listLoading && !doctors.length
        ? <Spinner label="Đang tải danh sách bác sĩ…" />
        : doctors.length === 0
          ? <EmptyState icon="user" message="Không tìm thấy bác sĩ nào." />
          : (
            <>
              <div className="doctor-grid">
                {doctors.map((d) => (
                  <DoctorCard
                    key={d.id}
                    doctor={d}
                    onClick={() => navigate(`/doctors/${d.id}`)}
                  />
                ))}
              </div>

              {doctorTotal > doctorLimit && (
                <div style={{ marginTop: 28 }}>
                  <Pagination
                    page={doctorPage}
                    limit={doctorLimit}
                    total={doctorTotal}
                    onPageChange={load}
                  />
                </div>
              )}
            </>
          )
      }
    </div>
  );
}
