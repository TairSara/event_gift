import { useState, useEffect } from 'react';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://event-gift.onrender.com/api';

export default function EventsTab() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, pages: 0 });
  const [stats, setStats] = useState(null);

  useEffect(() => {
    fetchEvents();
    fetchStats();
  }, [pagination.page, search, statusFilter]);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('adminToken');
      const params = new URLSearchParams({
        page: pagination.page,
        limit: pagination.limit,
        ...(search && { search }),
        ...(statusFilter && { status: statusFilter })
      });

      const response = await fetch(`${API_BASE_URL}/admin/events?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setEvents(data.events);
        setPagination(prev => ({ ...prev, ...data.pagination }));
      }
    } catch (err) {
      console.error('Failed to fetch events:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`${API_BASE_URL}/admin/events/stats`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('he-IL');
  };

  const getEventTypeLabel = (type) => {
    const types = {
      wedding: 'חתונה',
      bar_mitzvah: 'בר מצווה',
      bat_mitzvah: 'בת מצווה',
      birthday: 'יום הולדת',
      brit: 'ברית',
      other: 'אחר'
    };
    return types[type] || type;
  };

  const getStatusLabel = (status) => {
    const statuses = {
      active: 'פעיל',
      completed: 'הסתיים',
      pending: 'ממתין',
      cancelled: 'בוטל'
    };
    return statuses[status] || status;
  };

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <h1>ניהול אירועים</h1>
        <p>רשימת כל האירועים במערכת</p>
      </div>

      {/* Stats */}
      {stats && (
        <div className="stats-grid" style={{ marginBottom: '1.5rem' }}>
          <div className="stat-card">
            <div className="stat-icon primary">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                <line x1="16" y1="2" x2="16" y2="6"/>
                <line x1="8" y1="2" x2="8" y2="6"/>
                <line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
            </div>
            <div className="stat-content">
              <div className="stat-label">סה"כ אירועים</div>
              <div className="stat-value">{stats.status_breakdown?.total || 0}</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon success">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            </div>
            <div className="stat-content">
              <div className="stat-label">פעילים</div>
              <div className="stat-value">{stats.status_breakdown?.active || 0}</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon info">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/>
                <polyline points="12 6 12 12 16 14"/>
              </svg>
            </div>
            <div className="stat-content">
              <div className="stat-label">ממתינים</div>
              <div className="stat-value">{stats.status_breakdown?.pending || 0}</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon warning">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                <polyline points="22 4 12 14.01 9 11.01"/>
              </svg>
            </div>
            <div className="stat-content">
              <div className="stat-label">הסתיימו</div>
              <div className="stat-value">{stats.status_breakdown?.completed || 0}</div>
            </div>
          </div>
        </div>
      )}

      <div className="admin-card">
        <div className="admin-card-header">
          <h2>אירועים ({pagination.total})</h2>
          <div className="admin-card-actions">
            <input
              type="text"
              className="search-input"
              placeholder="חיפוש אירוע או משתמש..."
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
              <option value="active">פעיל</option>
              <option value="pending">ממתין</option>
              <option value="completed">הסתיים</option>
              <option value="cancelled">בוטל</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="admin-loading">
            <div className="loading-spinner"></div>
            <p>טוען אירועים...</p>
          </div>
        ) : events.length > 0 ? (
          <>
            <div className="admin-table-wrapper">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>שם האירוע</th>
                    <th>סוג</th>
                    <th>תאריך</th>
                    <th>מיקום</th>
                    <th>משתמש</th>
                    <th>אורחים</th>
                    <th>סטטוס</th>
                    <th>נוצר</th>
                  </tr>
                </thead>
                <tbody>
                  {events.map(event => (
                    <tr key={event.id}>
                      <td>
                        <strong>{event.event_title || '-'}</strong>
                      </td>
                      <td>{getEventTypeLabel(event.event_type)}</td>
                      <td>{formatDate(event.event_date)}</td>
                      <td>{event.event_location || '-'}</td>
                      <td>
                        <div>
                          <div style={{ fontSize: '0.85rem' }}>{event.user_name || '-'}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--admin-text-muted)', direction: 'ltr', textAlign: 'right' }}>
                            {event.user_email}
                          </div>
                        </div>
                      </td>
                      <td>{event.guest_count}</td>
                      <td>
                        <span className={`status-badge ${event.status}`}>
                          {getStatusLabel(event.status)}
                        </span>
                      </td>
                      <td style={{ color: 'var(--admin-text-muted)' }}>{formatDate(event.created_at)}</td>
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
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
              <line x1="16" y1="2" x2="16" y2="6"/>
              <line x1="8" y1="2" x2="8" y2="6"/>
              <line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
            <p>לא נמצאו אירועים</p>
          </div>
        )}
      </div>
    </div>
  );
}
