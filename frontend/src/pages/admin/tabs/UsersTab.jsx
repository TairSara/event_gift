import { useState, useEffect } from 'react';
import axios from 'axios';

export default function UsersTab() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, pages: 0 });
  const [selectedUser, setSelectedUser] = useState(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, [pagination.page, search]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('adminToken');
      const response = await axios.get('/api/admin/users', {
        headers: { Authorization: `Bearer ${token}` },
        params: {
          page: pagination.page,
          limit: pagination.limit,
          search: search || undefined
        }
      });

      setUsers(response.data.users);
      setPagination(prev => ({ ...prev, ...response.data.pagination }));
    } catch (err) {
      console.error('Failed to fetch users:', err);
    } finally {
      setLoading(false);
    }
  };

  const viewUserDetails = async (userId) => {
    try {
      const token = localStorage.getItem('adminToken');
      const response = await axios.get(`/api/admin/users/${userId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSelectedUser(response.data);
      setShowModal(true);
    } catch (err) {
      console.error('Failed to fetch user details:', err);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('he-IL');
  };

  const handleSearch = (e) => {
    setSearch(e.target.value);
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <h1>ניהול משתמשים</h1>
        <p>רשימת כל המשתמשים הרשומים במערכת</p>
      </div>

      <div className="admin-card">
        <div className="admin-card-header">
          <h2>משתמשים ({pagination.total})</h2>
          <div className="admin-card-actions">
            <input
              type="text"
              className="search-input"
              placeholder="חיפוש לפי מייל או שם..."
              value={search}
              onChange={handleSearch}
            />
          </div>
        </div>

        {loading ? (
          <div className="admin-loading">
            <div className="loading-spinner"></div>
            <p>טוען משתמשים...</p>
          </div>
        ) : users.length > 0 ? (
          <>
            <div className="admin-table-wrapper">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>משתמש</th>
                    <th>אימייל</th>
                    <th>תאריך הרשמה</th>
                    <th>אימות</th>
                    <th>אירועים</th>
                    <th>חבילות</th>
                    <th>פעולות</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(user => (
                    <tr key={user.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <div style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: '50%',
                            background: 'var(--admin-primary)',
                            color: 'white',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: '600'
                          }}>
                            {user.full_name?.charAt(0) || user.email?.charAt(0) || '?'}
                          </div>
                          <span>{user.full_name || '-'}</span>
                        </div>
                      </td>
                      <td style={{ direction: 'ltr', textAlign: 'right' }}>{user.email}</td>
                      <td>{formatDate(user.created_at)}</td>
                      <td>
                        <span className={`status-badge ${user.email_verified ? 'active' : 'pending'}`}>
                          {user.email_verified ? 'מאומת' : 'לא מאומת'}
                        </span>
                      </td>
                      <td>
                        <span style={{ color: 'var(--admin-success)' }}>{user.active_events}</span>
                        {' / '}
                        <span>{user.total_events}</span>
                      </td>
                      <td>
                        <span style={{ color: 'var(--admin-primary)' }}>{user.active_packages}</span>
                        {' / '}
                        <span>{user.total_packages}</span>
                      </td>
                      <td>
                        <button
                          className="action-btn view"
                          onClick={() => viewUserDetails(user.id)}
                          title="צפייה בפרטים"
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                            <circle cx="12" cy="12" r="3"/>
                          </svg>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="admin-pagination">
              <div className="pagination-info">
                מציג {((pagination.page - 1) * pagination.limit) + 1} - {Math.min(pagination.page * pagination.limit, pagination.total)} מתוך {pagination.total}
              </div>
              <div className="pagination-buttons">
                <button
                  className="pagination-btn"
                  onClick={() => setPagination(p => ({ ...p, page: p.page - 1 }))}
                  disabled={pagination.page === 1}
                >
                  הקודם
                </button>
                {[...Array(Math.min(5, pagination.pages))].map((_, i) => {
                  const pageNum = i + 1;
                  return (
                    <button
                      key={pageNum}
                      className={`pagination-btn ${pagination.page === pageNum ? 'active' : ''}`}
                      onClick={() => setPagination(p => ({ ...p, page: pageNum }))}
                    >
                      {pageNum}
                    </button>
                  );
                })}
                <button
                  className="pagination-btn"
                  onClick={() => setPagination(p => ({ ...p, page: p.page + 1 }))}
                  disabled={pagination.page === pagination.pages}
                >
                  הבא
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="admin-empty">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
            </svg>
            <p>לא נמצאו משתמשים</p>
          </div>
        )}
      </div>

      {/* User Details Modal */}
      {showModal && selectedUser && (
        <div className="admin-modal-overlay" onClick={() => setShowModal(false)}>
          <div className="admin-modal" onClick={e => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h3>פרטי משתמש</h3>
              <button className="modal-close-btn" onClick={() => setShowModal(false)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
            <div className="admin-modal-body">
              <div className="detail-grid">
                <div className="detail-item">
                  <span className="detail-label">שם מלא</span>
                  <span className="detail-value">{selectedUser.user?.full_name || '-'}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">אימייל</span>
                  <span className="detail-value" style={{ direction: 'ltr' }}>{selectedUser.user?.email}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">תאריך הרשמה</span>
                  <span className="detail-value">{formatDate(selectedUser.user?.created_at)}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">סטטוס אימות</span>
                  <span className={`status-badge ${selectedUser.user?.email_verified ? 'active' : 'pending'}`}>
                    {selectedUser.user?.email_verified ? 'מאומת' : 'לא מאומת'}
                  </span>
                </div>
              </div>

              {selectedUser.packages?.length > 0 && (
                <div style={{ marginTop: '1.5rem' }}>
                  <h4 style={{ color: 'var(--admin-text)', marginBottom: '0.75rem' }}>חבילות ({selectedUser.packages.length})</h4>
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>שם חבילה</th>
                        <th>תאריך רכישה</th>
                        <th>סטטוס</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedUser.packages.map(pkg => (
                        <tr key={pkg.id}>
                          <td>{pkg.package_name}</td>
                          <td>{formatDate(pkg.purchased_at)}</td>
                          <td>
                            <span className={`status-badge ${pkg.status}`}>{pkg.status}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {selectedUser.events?.length > 0 && (
                <div style={{ marginTop: '1.5rem' }}>
                  <h4 style={{ color: 'var(--admin-text)', marginBottom: '0.75rem' }}>אירועים ({selectedUser.events.length})</h4>
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>שם אירוע</th>
                        <th>סוג</th>
                        <th>תאריך</th>
                        <th>סטטוס</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedUser.events.map(event => (
                        <tr key={event.id}>
                          <td>{event.event_title}</td>
                          <td>{event.event_type}</td>
                          <td>{formatDate(event.event_date)}</td>
                          <td>
                            <span className={`status-badge ${event.status}`}>{event.status}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
