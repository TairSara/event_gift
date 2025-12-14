import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import AdminSidebar from '../components/AdminSidebar';
import '../styles/AdminEvents.css';

function AdminEvents() {
  const [events, setEvents] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    checkAdminSession();
    fetchStats();
  }, []);

  useEffect(() => {
    fetchEvents();
  }, [page, search, statusFilter, typeFilter]);

  const checkAdminSession = () => {
    const adminUser = localStorage.getItem('adminUser');
    const isAdmin = localStorage.getItem('isAdmin');

    if (!adminUser || isAdmin !== 'true') {
      navigate('/admin/login');
      return;
    }
  };

  const fetchStats = async () => {
    try {
      const response = await axios.get('/api/admin/events/stats');
      setStats(response.data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/admin/events', {
        params: {
          page,
          limit: 20,
          search: search || undefined,
          status: statusFilter || undefined,
          event_type: typeFilter || undefined
        }
      });

      setEvents(response.data.events);
      setTotal(response.data.pagination.total);
    } catch (error) {
      console.error('Error fetching events:', error);
      if (error.response?.status === 401 || error.response?.status === 404) {
        localStorage.removeItem('adminUser');
        localStorage.removeItem('isAdmin');
        navigate('/admin/login');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    setSearch(e.target.value);
    setPage(1);
  };

  const handleStatusFilter = (status) => {
    setStatusFilter(status === statusFilter ? '' : status);
    setPage(1);
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('he-IL');
  };

  const getStatusBadge = (status) => {
    const badges = {
      active: { label: 'פעיל', class: 'active' },
      completed: { label: 'הושלם', class: 'completed' },
      pending: { label: 'ממתין', class: 'pending' },
      cancelled: { label: 'בוטל', class: 'cancelled' }
    };
    const badge = badges[status] || { label: status, class: 'default' };
    return <span className={`status-badge ${badge.class}`}>{badge.label}</span>;
  };

  const getEventTypeLabel = (type) => {
    const types = {
      wedding: 'חתונה',
      hina: 'חינה',
      brit: 'ברית',
      brita: 'זבד הבת',
      'bar-mitzvah': 'בר מצווה',
      'bat-mitzvah': 'בת מצווה',
      birthday: 'יום הולדת',
      knasim: 'כנס/אירוע חברה',
      other: 'אחר'
    };
    return types[type] || type;
  };

  const totalPages = Math.ceil(total / 20);

  return (
    <div className="admin-container">
      <AdminSidebar />
      <div className="admin-content">
        <div className="admin-events-page">
          <div className="page-header">
            <h1>ניהול אירועים</h1>
          </div>

          {stats && (
            <div className="stats-grid">
              <div className="stat-card stat-total">
                <div className="stat-icon">📊</div>
                <div className="stat-info">
                  <div className="stat-number">{stats.status_breakdown.total}</div>
                  <div className="stat-label">סך הכל אירועים</div>
                </div>
              </div>
              <div
                className={`stat-card stat-active ${statusFilter === 'active' ? 'selected' : ''}`}
                onClick={() => handleStatusFilter('active')}
              >
                <div className="stat-icon">✅</div>
                <div className="stat-info">
                  <div className="stat-number">{stats.status_breakdown.active}</div>
                  <div className="stat-label">אירועים פעילים</div>
                </div>
              </div>
              <div
                className={`stat-card stat-completed ${statusFilter === 'completed' ? 'selected' : ''}`}
                onClick={() => handleStatusFilter('completed')}
              >
                <div className="stat-icon">🎉</div>
                <div className="stat-info">
                  <div className="stat-number">{stats.status_breakdown.completed}</div>
                  <div className="stat-label">אירועים שהסתיימו</div>
                </div>
              </div>
              <div
                className={`stat-card stat-pending ${statusFilter === 'pending' ? 'selected' : ''}`}
                onClick={() => handleStatusFilter('pending')}
              >
                <div className="stat-icon">⏳</div>
                <div className="stat-info">
                  <div className="stat-number">{stats.status_breakdown.pending}</div>
                  <div className="stat-label">אירועים ממתינים</div>
                </div>
              </div>
            </div>
          )}

          <div className="events-controls">
            <div className="search-box">
              <input
                type="text"
                placeholder="חיפוש לפי כותרת אירוע או אימייל..."
                value={search}
                onChange={handleSearch}
                className="search-input"
              />
            </div>
            {statusFilter && (
              <button
                className="clear-filter-btn"
                onClick={() => setStatusFilter('')}
              >
                נקה סינון ✕
              </button>
            )}
          </div>

          {loading ? (
            <div className="loading">טוען נתונים...</div>
          ) : (
            <>
              <div className="events-table-container">
                <table className="events-table">
                  <thead>
                    <tr>
                      <th>כותרת האירוע</th>
                      <th>סוג אירוע</th>
                      <th>תאריך האירוע</th>
                      <th>מיקום</th>
                      <th>בעל האירוע</th>
                      <th>כמות אורחים</th>
                      <th>סטטוס</th>
                      <th>תאריך יצירה</th>
                    </tr>
                  </thead>
                  <tbody>
                    {events.length === 0 ? (
                      <tr>
                        <td colSpan="8" className="no-data">
                          לא נמצאו אירועים
                        </td>
                      </tr>
                    ) : (
                      events.map((event) => (
                        <tr key={event.id}>
                          <td className="event-title-cell">{event.event_title}</td>
                          <td>{getEventTypeLabel(event.event_type)}</td>
                          <td className="date-cell">{formatDate(event.event_date)}</td>
                          <td className="location-cell">{event.event_location || '-'}</td>
                          <td>
                            <div className="user-info">
                              <div className="user-name">{event.user_name || '-'}</div>
                              <div className="user-email">{event.user_email}</div>
                            </div>
                          </td>
                          <td>
                            <span className="guest-count">{event.guest_count}</span>
                          </td>
                          <td>{getStatusBadge(event.status)}</td>
                          <td className="date-cell">{formatDate(event.created_at)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {totalPages > 1 && (
                <div className="pagination">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="page-btn"
                  >
                    הקודם
                  </button>
                  <span className="page-info">
                    עמוד {page} מתוך {totalPages}
                  </span>
                  <button
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="page-btn"
                  >
                    הבא
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default AdminEvents;
