import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import AdminSidebar from '../components/AdminSidebar';
import '../styles/AdminPackages.css';

function AdminPackages() {
  const [purchases, setPurchases] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    checkAdminSession();
    fetchStats();
  }, []);

  useEffect(() => {
    fetchPurchases();
  }, [page, statusFilter]);

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
      const response = await axios.get('/api/admin/packages/stats');
      setStats(response.data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchPurchases = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/admin/packages/purchases', {
        params: {
          page,
          limit: 20,
          status: statusFilter || undefined
        }
      });

      setPurchases(response.data.purchases);
      setTotal(response.data.pagination.total);
    } catch (error) {
      console.error('Error fetching purchases:', error);
      if (error.response?.status === 401 || error.response?.status === 404) {
        localStorage.removeItem('adminUser');
        localStorage.removeItem('isAdmin');
        navigate('/admin/login');
      }
    } finally {
      setLoading(false);
    }
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

  const formatPrice = (price) => {
    return `₪${price.toFixed(2)}`;
  };

  const getStatusBadge = (status) => {
    const badges = {
      active: { label: 'פעיל', class: 'active' },
      used: { label: 'בשימוש', class: 'used' },
      expired: { label: 'פג תוקף', class: 'expired' }
    };
    const badge = badges[status] || { label: status, class: 'default' };
    return <span className={`status-badge ${badge.class}`}>{badge.label}</span>;
  };

  const totalPages = Math.ceil(total / 20);

  return (
    <div className="admin-container">
      <AdminSidebar />
      <div className="admin-content">
        <div className="admin-packages-page">
          <div className="page-header">
            <h1>ניהול חבילות ומנויים</h1>
          </div>

          {stats && (
            <>
              <div className="stats-grid">
                <div className="stat-card stat-total">
                  <div className="stat-icon">📦</div>
                  <div className="stat-info">
                    <div className="stat-number">{stats.total_purchases}</div>
                    <div className="stat-label">סך הכל רכישות</div>
                  </div>
                </div>
                <div
                  className={`stat-card stat-active ${statusFilter === 'active' ? 'selected' : ''}`}
                  onClick={() => handleStatusFilter('active')}
                >
                  <div className="stat-icon">✅</div>
                  <div className="stat-info">
                    <div className="stat-number">{stats.active_packages}</div>
                    <div className="stat-label">חבילות פעילות</div>
                  </div>
                </div>
                <div
                  className={`stat-card stat-used ${statusFilter === 'used' ? 'selected' : ''}`}
                  onClick={() => handleStatusFilter('used')}
                >
                  <div className="stat-icon">🎯</div>
                  <div className="stat-info">
                    <div className="stat-number">{stats.used_packages}</div>
                    <div className="stat-label">חבילות בשימוש</div>
                  </div>
                </div>
                <div
                  className={`stat-card stat-expired ${statusFilter === 'expired' ? 'selected' : ''}`}
                  onClick={() => handleStatusFilter('expired')}
                >
                  <div className="stat-icon">⌛</div>
                  <div className="stat-info">
                    <div className="stat-number">{stats.expired_packages}</div>
                    <div className="stat-label">פג תוקף</div>
                  </div>
                </div>
              </div>

              <div className="package-breakdown">
                <h2>פירוט לפי סוג חבילה</h2>
                <div className="breakdown-grid">
                  {stats.package_breakdown.map((pkg, index) => (
                    <div key={index} className="breakdown-card">
                      <div className="breakdown-header">
                        <h3>{pkg.name}</h3>
                        <span className="package-price">{formatPrice(pkg.price)}</span>
                      </div>
                      <div className="breakdown-stats">
                        <div className="breakdown-stat">
                          <span className="stat-value">{pkg.total_purchases}</span>
                          <span className="stat-label">סך רכישות</span>
                        </div>
                        <div className="breakdown-stat">
                          <span className="stat-value active">{pkg.active_count}</span>
                          <span className="stat-label">פעילות</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          <div className="packages-controls">
            <h2>רשימת רכישות</h2>
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
              <div className="packages-table-container">
                <table className="packages-table">
                  <thead>
                    <tr>
                      <th>שם החבילה</th>
                      <th>מחיר</th>
                      <th>שם הלקוח</th>
                      <th>אימייל</th>
                      <th>אירוע</th>
                      <th>תאריך רכישה</th>
                      <th>תוקף עד</th>
                      <th>סטטוס</th>
                    </tr>
                  </thead>
                  <tbody>
                    {purchases.length === 0 ? (
                      <tr>
                        <td colSpan="8" className="no-data">
                          לא נמצאו רכישות
                        </td>
                      </tr>
                    ) : (
                      purchases.map((purchase) => (
                        <tr key={purchase.id}>
                          <td className="package-name-cell">{purchase.package_name}</td>
                          <td className="price-cell">{formatPrice(purchase.price)}</td>
                          <td>{purchase.user_name || '-'}</td>
                          <td className="email-cell">{purchase.user_email}</td>
                          <td className="event-cell">
                            {purchase.event_title ? (
                              purchase.event_title
                            ) : (
                              <span className="no-data-icon">✕</span>
                            )}
                          </td>
                          <td className="date-cell">{formatDate(purchase.purchase_date)}</td>
                          <td className="date-cell">
                            {purchase.expiry_date ? formatDate(purchase.expiry_date) : <span className="no-data-icon">✕</span>}
                          </td>
                          <td>{getStatusBadge(purchase.status)}</td>
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

export default AdminPackages;
