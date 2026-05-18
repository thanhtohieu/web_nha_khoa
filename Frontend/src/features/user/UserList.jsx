import { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import useUserStore from '../../store/user.store';
import {
  Spinner, Alert, AvatarPlaceholder,
  RoleBadge, StatusBadge, Pagination,
  ConfirmDialog, Icon,
} from './UserUI';
import './user.module.css';

/* ── Debounce hook ── */
function useDebounce(value, delay = 400) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

/* ── Row actions ── */
function UserRow({ user, onView, onToggle, onDelete }) {
  return (
    <tr>
      {/* Avatar + name */}
      <td>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <AvatarPlaceholder name={user.fullName} size="sm" src={user.avatarUrl} />
          <div>
            <div style={{ fontWeight: 500, lineHeight: 1.2 }}>{user.fullName}</div>
            <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>{user.email}</div>
          </div>
        </div>
      </td>
      <td><RoleBadge role={user.role} /></td>
      <td style={{ color: 'var(--color-text-secondary)', fontSize: '0.85rem' }}>{user.phone ?? '—'}</td>
      <td>
        <StatusBadge status={user.status ?? 'active'} />
      </td>
      <td style={{ color: 'var(--color-text-muted)', fontSize: '0.82rem' }}>
        {user.createdAt ? new Date(user.createdAt).toLocaleDateString('vi-VN') : '—'}
      </td>
      <td>
        <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
          <button
            className="btn-icon-only"
            onClick={() => onView(user.id)}
            title="Xem chi tiết"
          >
            <Icon name="eye" size={15} />
          </button>
          <button
            className="btn-icon-only"
            onClick={() => onToggle(user)}
            title={user.status === 'active' ? 'Vô hiệu hoá' : 'Kích hoạt'}
          >
            <Icon name="ban" size={15} />
          </button>
          <button
            className="btn-icon-only"
            onClick={() => onDelete(user)}
            title="Xoá"
            style={{ color: 'var(--color-error)' }}
          >
            <Icon name="trash" size={15} />
          </button>
        </div>
      </td>
    </tr>
  );
}

/* ── UserList ── */
export default function UserList() {
  const navigate = useNavigate();
  const {
    users, userTotal, userPage, userLimit,
    usersLoading, usersError,
    fetchUsers, toggleUserStatus, deleteUser, clearUsersError,
  } = useUserStore();

  const [search, setSearch]     = useState('');
  const [role, setRole]         = useState('');
  const [status, setStatus]     = useState('');
  const [confirmAction, setConfirmAction] = useState(null); // { type, user }
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError]     = useState(null);

  const debouncedSearch = useDebounce(search);

  const loadUsers = useCallback((page = 1) => {
    fetchUsers({ page, limit: userLimit, search: debouncedSearch, role, status });
  }, [debouncedSearch, role, status, userLimit]);

  // Re-fetch when filters change
  useEffect(() => { loadUsers(1); }, [debouncedSearch, role, status]);

  const handlePageChange = (page) => loadUsers(page);

  const handleView   = (id) => navigate(`/admin/users/${id}`);

  const handleToggle = (user) => setConfirmAction({ type: 'toggle', user });
  const handleDelete = (user) => setConfirmAction({ type: 'delete', user });

  const handleConfirm = async () => {
    if (!confirmAction) return;
    setActionLoading(true);
    setActionError(null);
    const { type, user } = confirmAction;
    const result = type === 'delete'
      ? await deleteUser(user.id)
      : await toggleUserStatus(user.id);
    setActionLoading(false);
    if (result.success) {
      setConfirmAction(null);
    } else {
      setActionError(result.message);
    }
  };

  return (
    <div>
      {/* Page header */}
      <div className="page-header">
        <div>
          <div className="page-title">Danh sách người dùng</div>
          <div className="page-subtitle">Quản lý tất cả tài khoản trong hệ thống</div>
        </div>
      </div>

      {/* Alerts */}
      {usersError && (
        <Alert type="error" onClose={clearUsersError}>{usersError}</Alert>
      )}
      {actionError && (
        <Alert type="error" onClose={() => setActionError(null)}>{actionError}</Alert>
      )}

      {/* Filter bar */}
      <div className="filter-bar">
        <div className="search-input-wrap">
          <Icon name="search" size={15} />
          <input
            className="search-input"
            placeholder="Tìm tên, email, SĐT…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <select className="filter-select" value={role} onChange={(e) => setRole(e.target.value)}>
          <option value="">Tất cả vai trò</option>
          <option value="admin">Admin</option>
          <option value="doctor">Bác sĩ</option>
          <option value="receptionist">Lễ tân</option>
          <option value="patient">Bệnh nhân</option>
        </select>

        <select className="filter-select" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">Tất cả trạng thái</option>
          <option value="active">Hoạt động</option>
          <option value="inactive">Vô hiệu</option>
        </select>
      </div>

      {/* Table */}
      <div className="card">
        {usersLoading && !users.length
          ? <Spinner label="Đang tải danh sách…" />
          : (
            <>
              <div className="table-wrapper" style={{ border: 'none', borderRadius: 0 }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Người dùng</th>
                      <th>Vai trò</th>
                      <th>Điện thoại</th>
                      <th>Trạng thái</th>
                      <th>Ngày tạo</th>
                      <th style={{ textAlign: 'right' }}>Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.length === 0 ? (
                      <tr>
                        <td colSpan={6}>
                          <div className="empty-state">
                            <Icon name="user" size={36} />
                            <p>Không tìm thấy người dùng nào.</p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      users.map((user) => (
                        <UserRow
                          key={user.id}
                          user={user}
                          onView={handleView}
                          onToggle={handleToggle}
                          onDelete={handleDelete}
                        />
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {userTotal > 0 && (
                <Pagination
                  page={userPage}
                  limit={userLimit}
                  total={userTotal}
                  onPageChange={handlePageChange}
                />
              )}
            </>
          )
        }
      </div>

      {/* Confirm dialog */}
      {confirmAction && (
        <ConfirmDialog
          title={confirmAction.type === 'delete' ? 'Xoá người dùng?' : 'Thay đổi trạng thái?'}
          desc={
            confirmAction.type === 'delete'
              ? `Bạn chắc chắn muốn xoá tài khoản "${confirmAction.user.fullName}"? Hành động này không thể hoàn tác.`
              : `Bạn muốn ${confirmAction.user.status === 'active' ? 'vô hiệu hoá' : 'kích hoạt'} tài khoản "${confirmAction.user.fullName}"?`
          }
          onConfirm={handleConfirm}
          onCancel={() => { setConfirmAction(null); setActionError(null); }}
          loading={actionLoading}
        />
      )}
    </div>
  );
}
