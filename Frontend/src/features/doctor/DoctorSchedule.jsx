import { useEffect, useState } from 'react';
import useAuth from '../../hooks/useAuth';
import useClinicStore from '../../store/clinic.store';
import { getWeekDates, toISODate, VN_DAYS } from './DoctorUI';
import { Icon } from './DoctorUI';
import '../clinic/ClinicManagement.css'; // Reuse the new clinic CSS

export default function DoctorSchedule() {
  const { user } = useAuth();
  const { shifts, fetchShifts, rosters, setRosterFilters, createRoster, rosterLoading } = useClinicStore();

  const [weekStart, setWeekStart] = useState(() => {
    const today = new Date();
    const d = new Date(today);
    const diff = today.getDay() === 0 ? -6 : 1 - today.getDay();
    d.setDate(today.getDate() + diff);
    return d;
  });

  const weekDates = getWeekDates(weekStart);
  const from = toISODate(weekDates[0]);
  const to = toISODate(weekDates[6]);

  useEffect(() => {
    fetchShifts();
  }, []);

  useEffect(() => {
    // Fetch rosters for the whole week
    setRosterFilters({ startDate: from, endDate: to, page: 1, limit: 500 });
  }, [weekStart]);

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

  const handleRegister = async (date, shiftId) => {
    if (!window.confirm('Bạn muốn đăng ký trực ca này?')) return;
    const res = await createRoster({ roster_date: date, shift_id: shiftId });
    if (!res.success) {
      alert(res.message);
    }
  };

  const getRostersForSlot = (date, shiftId) => {
    return rosters.filter(r => r.roster_date === date && r.shift_id === shiftId);
  };

  return (
    <div className="clinic-page" style={{ padding: '24px', maxWidth: '100%', margin: '0 auto', background: '#f4f7f9', minHeight: '100vh' }}>
      <div className="clinic-header" style={{ marginBottom: '24px' }}>
        <h1 className="clinic-title" style={{ fontSize: '1.5rem', margin: 0, color: '#0f172a' }}>Lịch làm việc (Phân ca trực)</h1>
      </div>

      <div className="clinic-card" style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px', borderRadius: '8px', border: '1px solid #e2e8f0', background: 'white', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <button className="btn-secondary" style={{ padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '8px' }} onClick={prevWeek}>
          <Icon name="chevLeft" size={14} /> Tuần trước
        </button>
        <div style={{ fontWeight: 700, fontSize: '1.1rem', color: '#1e293b' }}>
          Tuần {weekDates[0].toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })} – {weekDates[6].toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })}
        </div>
        <button className="btn-secondary" style={{ padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '8px' }} onClick={nextWeek}>
          Tuần sau <Icon name="chevRight" size={14} />
        </button>
      </div>

      <div className="clinic-card" style={{ padding: 0, overflowX: 'auto', borderRadius: '8px', border: '1px solid #e2e8f0', background: 'white', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '800px' }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
              <th style={{ padding: '16px', borderRight: '1px solid #e2e8f0', width: '120px', color: '#475569', fontWeight: 600 }}>Ngày</th>
              {shifts.map(shift => (
                <th key={shift.id} style={{ padding: '16px', borderRight: '1px solid #e2e8f0', color: '#0f172a' }}>
                  <div style={{ fontWeight: 700, fontSize: '1rem', marginBottom: '4px' }}>{shift.name}</div>
                  <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 500 }}>{shift.start_time} - {shift.end_time}</span>
                </th>
              ))}
              {shifts.length === 0 && <th style={{ padding: '16px', color: '#64748b' }}>Chưa có ca làm việc nào được tạo</th>}
            </tr>
          </thead>
          <tbody>
            {weekDates.map((dateObj, index) => {
              const dateStr = toISODate(dateObj);
              const isToday = dateStr === toISODate(new Date());
              return (
                <tr key={dateStr} style={{ borderBottom: '1px solid #e2e8f0', background: isToday ? '#f0fdf4' : 'white' }}>
                  <td style={{ padding: '16px', borderRight: '1px solid #e2e8f0' }}>
                    <div style={{ fontWeight: 700, color: isToday ? '#16a34a' : '#334155', fontSize: '0.95rem' }}>{VN_DAYS[index]}</div>
                    <div style={{ fontSize: '0.8rem', color: isToday ? '#22c55e' : '#64748b', marginTop: '4px' }}>{dateObj.toLocaleDateString('vi-VN')}</div>
                  </td>
                  {shifts.map(shift => {
                    const slotRosters = getRostersForSlot(dateStr, shift.id);
                    const myRoster = slotRosters.find(r => r.doctor?.user?.id === user?.id);

                    return (
                      <td key={shift.id} style={{ padding: '12px', borderRight: '1px solid #e2e8f0', verticalAlign: 'top', width: `${100 / shifts.length}%` }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', minHeight: '80px' }}>
                          {slotRosters.map(r => {
                            const isMe = r.doctor?.user?.id === user?.id;
                            let badgeColor = '#94a3b8';
                            let badgeBg = '#f1f5f9';
                            let badgeText = 'Không rõ';
                            
                            if (r.status === 'approved') { badgeColor = '#166534'; badgeBg = '#dcfce7'; badgeText = 'Đã duyệt'; }
                            if (r.status === 'pending') { badgeColor = '#b45309'; badgeBg = '#fef3c7'; badgeText = 'Chờ duyệt'; }
                            if (r.status === 'rejected') { badgeColor = '#b91c1c'; badgeBg = '#fee2e2'; badgeText = 'Từ chối'; }

                            return (
                              <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px', background: isMe ? '#eff6ff' : '#f8fafc', borderRadius: '6px', border: isMe ? '1px solid #bfdbfe' : '1px solid #f1f5f9' }}>
                                <img src={r.doctor?.user?.avatar || 'https://ui-avatars.com/api/?name=' + (r.doctor?.user?.full_name || 'BS') + '&background=e2e8f0&color=334155'} alt="avt" style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover' }} />
                                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                  <div style={{ fontWeight: 600, color: '#0f172a', fontSize: '0.85rem' }}>{isMe ? 'Bạn (Tôi)' : `BS. ${r.doctor?.user?.full_name}`}</div>
                                  <div style={{ fontSize: '0.7rem', color: badgeColor, background: badgeBg, padding: '2px 6px', borderRadius: '12px', display: 'inline-block', alignSelf: 'flex-start', fontWeight: 600 }}>
                                    {badgeText}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                          
                          {!myRoster && new Date(dateStr) >= new Date(toISODate(new Date())) && (
                            <button 
                              onClick={() => handleRegister(dateStr, shift.id)}
                              disabled={rosterLoading}
                              style={{ 
                                marginTop: 'auto', 
                                background: 'transparent', 
                                border: '1px dashed #cbd5e1', 
                                padding: '10px', 
                                borderRadius: '6px', 
                                color: '#3b82f6', 
                                fontSize: '0.85rem', 
                                fontWeight: 600,
                                cursor: 'pointer', 
                                textAlign: 'center',
                                transition: 'all 0.2s'
                              }}
                              onMouseOver={(e) => { e.currentTarget.style.background = '#eff6ff'; e.currentTarget.style.borderColor = '#3b82f6'; }}
                              onMouseOut={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = '#cbd5e1'; }}
                            >
                              + Đăng ký ca này
                            </button>
                          )}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
