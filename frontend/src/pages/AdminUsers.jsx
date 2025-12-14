import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import AdminSidebar from '../components/AdminSidebar';
import '../styles/AdminUsers.css';

function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [sortBy, setSortBy] = useState('created_at');
  const [order, setOrder] = useState('desc');
  const navigate = useNavigate();

  useEffect(() => {
    checkAdminSession();
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [page, search, sortBy, order]);

  const checkAdminSession = () => {
    const adminUser = localStorage.getItem('adminUser');
    const isAdmin = localStorage.getItem('isAdmin');

    if (!adminUser || isAdmin !== 'true') {
      navigate('/admin/login');
      return;
    }
  };

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/admin/users', {
        params: {
          page,
          limit: 20,
          search: search || undefined,
          sort_by: sortBy,
          order
        }
      });

      setUsers(response.data.users);
      setTotal(response.data.total);
    } catch (error) {
      console.error('Error fetching users:', error);
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

  const handleSort = (column) => {
    if (sortBy === column) {
      setOrder(order === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setOrder('desc');
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('he-IL');
  };

  const totalPages = Math.ceil(total / 20);

  return (
    <div className="admin-container">
      <AdminSidebar />
      <div className="admin-content">
        <div className="admin-users-page">
          <div className="page-header">
            <h1>ניהול משתמשים</h1>
            <div className="header-stats">
              <div className="stat-badge">
                <span className="stat-number">{total}</span>
                <span className="stat-label">סך הכל משתמשים</span>
              </div>
            </div>
          </div>

          <div className="users-controls">
            <div className="search-box">
              <input
                type="text"
                placeholder="חיפוש לפי שם או אימייל..."
                value={search}
                onChange={handleSearch}
                className="search-input"
              />
            </div>
          </div>

          {loading ? (
            <div className="loading">טוען נתונים...</div>
          ) : (
            <>
              <div className="users-table-container">
                <table className="users-table">
                  <thead>
                    <tr>
                      <th onClick={() => handleSort('email')}>
                        אימייל {sortBy === 'email' && (order === 'asc' ? '↑' : '↓')}
                      </th>
                      <th onClick={() => handleSort('full_name')}>
                        שם מלא {sortBy === 'full_name' && (order === 'asc' ? '↑' : '↓')}
                      </th>
                      <th onClick={() => handleSort('created_at')}>
                        תאריך הרשמה {sortBy === 'created_at' && (order === 'asc' ? '↑' : '↓')}
                      </th>
                      <th>אימות מייל</th>
                      <th>אירועים פעילים</th>
                      <th>אירועים הושלמו</th>
                      <th>אירועים ממתינים</th>
                      <th>חבילות פעילות</th>
                      <th>חבילות בשימוש</th>
                      <th>אירוע אחרון</th>
                      <th>רכישה אחרונה</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user) => (
                      <tr key={user.id}>
                        <td className="email-cell">{user.email}</td>
                        <td>{user.full_name || '-'}</td>
                        <td>{formatDate(user.created_at)}</td>
                        <td>
                          <span className={`status-badge ${user.email_verified ? 'verified' : 'unverified'}`}>
                            {user.email_verified ? '✓ מאומת' : '✗ לא מאומת'}
                          </span>
                        </td>
                        <td>
                          {user.active_events > 0 ? (
                            <span className="count-badge active">{user.active_events}</span>
                          ) : (
                            <span className="no-data-icon">✕</span>
                          )}
                        </td>
                        <td>
                          {user.completed_events > 0 ? (
                            <span className="count-badge completed">{user.completed_events}</span>
                          ) : (
                            <span className="no-data-icon">✕</span>
                          )}
                        </td>
                        <td>
                          {user.pending_events > 0 ? (
                            <span className="count-badge pending">{user.pending_events}</span>
                          ) : (
                            <span className="no-data-icon">✕</span>
                          )}
                        </td>
                        <td>
                          {user.active_packages > 0 ? (
                            <span className="count-badge active">{user.active_packages}</span>
                          ) : (
                            <span className="no-data-icon">✕</span>
                          )}
                        </td>
                        <td>
                          {user.used_packages > 0 ? (
                            <span className="count-badge used">{user.used_packages}</span>
                          ) : (
                            <span className="no-data-icon">✕</span>
                          )}
                        </td>
                        <td className="date-cell">
                          {user.last_event_date ? formatDate(user.last_event_date) : <span className="no-data-icon">✕</span>}
                        </td>
                        <td className="date-cell">
                          {user.last_package_date ? formatDate(user.last_package_date) : <span className="no-data-icon">✕</span>}
                        </td>
                      </tr>
                    ))}
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

export default AdminUsers;
