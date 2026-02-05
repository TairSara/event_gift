import { useState, useEffect } from 'react';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://event-gift.onrender.com/api';

export default function PackagesTab() {
  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, pages: 0 });
  const [stats, setStats] = useState(null);

  useEffect(() => {
    fetchPurchases();
    fetchStats();
  }, [pagination.page, statusFilter]);

  const fetchPurchases = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('adminToken');
      const params = new URLSearchParams({
        page: pagination.page,
        limit: pagination.limit,
        ...(statusFilter && { status: statusFilter })
      });

      const response = await fetch(`${API_BASE_URL}/admin/packages/purchases?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setPurchases(data.purchases);
        setPagination(prev => ({ ...prev, ...data.pagination }));
      }
    } catch (err) {
      console.error('Failed to fetch purchases:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`${API_BASE_URL}/admin/packages/stats`, {
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

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('he-IL', {
      style: 'currency',
      currency: 'ILS',
      minimumFractionDigits: 0
    }).format(amount || 0);
  };

  const getStatusLabel = (status) => {
    const statuses = {
      active: 'פעילה',
      used: 'בשימוש',
      expired: 'פג תוקף',
      cancelled: 'בוטלה'
    };
    return statuses[status] || status;
  };

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <h1>ניהול חבילות</h1>
        <p>רשימת כל רכישות החבילות במערכת</p>
      </div>

      {/* Stats */}
      {stats && (
        <div className="stats-grid" style={{ marginBottom: '1.5rem' }}>
          <div className="stat-card">
            <div className="stat-icon primary">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
              </svg>
            </div>
            <div className="stat-content">
              <div className="stat-label">סה"כ רכישות</div>
              <div className="stat-value">{stats.total_purchases || 0}</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon success">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            </div>
            <div className="stat-content">
              <div className="stat-label">חבילות פעילות</div>
              <div className="stat-value">{stats.active_packages || 0}</div>
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
              <div className="stat-label">בשימוש</div>
              <div className="stat-value">{stats.used_packages || 0}</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon warning">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
            </div>
            <div className="stat-content">
              <div className="stat-label">פג תוקף</div>
              <div className="stat-value">{stats.expired_packages || 0}</div>
            </div>
          </div>
        </div>
      )}

      {/* Package Breakdown */}
      {stats?.package_breakdown?.length > 0 && (
        <div className="admin-card" style={{ marginBottom: '1.5rem' }}>
          <div className="admin-card-header">
            <h2>התפלגות לפי סוג חבילה</h2>
          </div>
          <div className="admin-table-wrapper">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>שם החבילה</th>
                  <th>מחיר</th>
                  <th>סה"כ רכישות</th>
                  <th>פעילות כעת</th>
                </tr>
              </thead>
              <tbody>
                {stats.package_breakdown.map((pkg, index) => (
                  <tr key={index}>
                    <td><strong>{pkg.name}</strong></td>
                    <td>{formatCurrency(pkg.price)}</td>
                    <td>{pkg.total_purchases}</td>
                    <td>
                      <span className="status-badge active">{pkg.active_count}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="admin-card">
        <div className="admin-card-header">
          <h2>רכישות ({pagination.total})</h2>
          <div className="admin-card-actions">
            <select
              className="filter-select"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPagination(prev => ({ ...prev, page: 1 }));
              }}
            >
              <option value="">כל הסטטוסים</option>
              <option value="active">פעילה</option>
              <option value="used">בשימוש</option>
              <option value="expired">פג תוקף</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="admin-loading">
            <div className="loading-spinner"></div>
            <p>טוען רכישות...</p>
          </div>
        ) : purchases.length > 0 ? (
          <>
            <div className="admin-table-wrapper">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>חבילה</th>
                    <th>מחיר</th>
                    <th>משתמש</th>
                    <th>תאריך רכישה</th>
                    <th>תוקף</th>
                    <th>אירוע</th>
                    <th>סטטוס</th>
                  </tr>
                </thead>
                <tbody>
                  {purchases.map(purchase => (
                    <tr key={purchase.id}>
                      <td><strong>{purchase.package_name}</strong></td>
                      <td>{formatCurrency(purchase.price)}</td>
                      <td>
                        <div>
                          <div style={{ fontSize: '0.85rem' }}>{purchase.user_name || '-'}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--admin-text-muted)', direction: 'ltr', textAlign: 'right' }}>
                            {purchase.user_email}
                          </div>
                        </div>
                      </td>
                      <td>{formatDate(purchase.purchase_date)}</td>
                      <td>{formatDate(purchase.expiry_date)}</td>
                      <td>{purchase.event_title || '-'}</td>
                      <td>
                        <span className={`status-badge ${purchase.status}`}>
                          {getStatusLabel(purchase.status)}
                        </span>
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
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
            </svg>
            <p>לא נמצאו רכישות</p>
          </div>
        )}
      </div>
    </div>
  );
}
