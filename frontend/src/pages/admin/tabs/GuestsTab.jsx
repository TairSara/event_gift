import { useState, useEffect } from 'react';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://event-gift.onrender.com/api';

export default function GuestsTab() {
  const [guests, setGuests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, pages: 0 });

  useEffect(() => {
    fetchGuests();
  }, [pagination.page, search, statusFilter]);

  const fetchGuests = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('adminToken');
      const params = new URLSearchParams({
        page: pagination.page,
        limit: pagination.limit,
        ...(search && { search }),
        ...(statusFilter && { status: statusFilter })
      });

      const response = await fetch(`${API_BASE_URL}/admin/guests?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setGuests(data.guests || []);
        setPagination(prev => ({ ...prev, ...data.pagination }));
      }
    } catch (err) {
      console.error('Failed to fetch guests:', err);
      setGuests([]);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('he-IL');
  };

  const getStatusLabel = (status) => {
    const statuses = {
      pending: 'ממתין',
      confirmed: 'אישר הגעה',
      declined: 'לא מגיע',
      maybe: 'אולי'
    };
    return statuses[status] || status || 'ממתין';
  };

  const getStatusClass = (status) => {
    const classes = {
      confirmed: 'active',
      declined: 'cancelled',
      pending: 'pending',
      maybe: 'pending'
    };
    return classes[status] || 'pending';
  };

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <h1>ניהול אורחים</h1>
        <p>רשימת כל האורחים מכל האירועים</p>
      </div>

      <div className="admin-card">
        <div className="admin-card-header">
          <h2>אורחים ({pagination.total})</h2>
          <div className="admin-card-actions">
            <input
              type="text"
              className="search-input"
              placeholder="חיפוש לפי שם או טלפון..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPagination(prev => ({ ...prev, page: 1 }));
              }}
            />
            <select
              className="filter-select"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPagination(prev => ({ ...prev, page: 1 }));
              }}
            >
              <option value="">כל הסטטוסים</option>
              <option value="confirmed">אישר הגעה</option>
              <option value="pending">ממתין</option>
              <option value="declined">לא מגיע</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="admin-loading">
            <div className="loading-spinner"></div>
            <p>טוען אורחים...</p>
          </div>
        ) : guests.length > 0 ? (
          <>
            <div className="admin-table-wrapper">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>שם מלא</th>
                    <th>טלפון</th>
                    <th>אימייל</th>
                    <th>אירוע</th>
                    <th>מס׳ אורחים</th>
                    <th>קבוצה</th>
                    <th>הזמנה נשלחה</th>
                    <th>סטטוס</th>
                    <th>נוצר</th>
                  </tr>
                </thead>
                <tbody>
                  {guests.map(guest => (
                    <tr key={guest.id}>
                      <td><strong>{guest.full_name}</strong></td>
                      <td style={{ direction: 'ltr', textAlign: 'right' }}>{guest.phone || '-'}</td>
                      <td style={{ direction: 'ltr', textAlign: 'right', fontSize: '0.85rem' }}>{guest.email || '-'}</td>
                      <td>{guest.event_title || '-'}</td>
                      <td>{guest.guests_count || 1}</td>
                      <td>{guest.group_name || '-'}</td>
                      <td>
                        <span className={`status-badge ${guest.invitation_sent ? 'active' : 'pending'}`}>
                          {guest.invitation_sent ? 'נשלחה' : 'לא נשלחה'}
                        </span>
                      </td>
                      <td>
                        <span className={`status-badge ${getStatusClass(guest.attendance_status)}`}>
                          {getStatusLabel(guest.attendance_status)}
                        </span>
                      </td>
                      <td style={{ color: 'var(--admin-text-muted)' }}>{formatDate(guest.created_at)}</td>
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
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
            <p>לא נמצאו אורחים</p>
          </div>
        )}
      </div>
    </div>
  );
}
