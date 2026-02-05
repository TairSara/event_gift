import { useState, useEffect } from 'react';
import axios from 'axios';

export default function GiftsTab() {
  const [gifts, setGifts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, pages: 0 });
  const [stats, setStats] = useState(null);

  useEffect(() => {
    fetchGifts();
    fetchStats();
  }, [pagination.page, search]);

  const fetchGifts = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('adminToken');
      const response = await axios.get('/api/admin/gifts', {
        headers: { Authorization: `Bearer ${token}` },
        params: {
          page: pagination.page,
          limit: pagination.limit,
          search: search || undefined
        }
      });

      setGifts(response.data.gifts || []);
      setPagination(prev => ({ ...prev, ...response.data.pagination }));
    } catch (err) {
      console.error('Failed to fetch gifts:', err);
      setGifts([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const response = await axios.get('/api/admin/dashboard/stats', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStats(response.data.gifts);
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('he-IL');
  };

  const formatCurrency = (amount, currency = 'ILS') => {
    return new Intl.NumberFormat('he-IL', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0
    }).format(amount || 0);
  };

  const getPaymentMethodLabel = (method) => {
    const methods = {
      credit_card: 'כרטיס אשראי',
      bank_transfer: 'העברה בנקאית',
      paypal: 'PayPal',
      cash: 'מזומן',
      bit: 'ביט',
      other: 'אחר'
    };
    return methods[method] || method || '-';
  };

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <h1>ניהול מתנות</h1>
        <p>רשימת כל המתנות שהתקבלו באירועים</p>
      </div>

      {/* Stats */}
      {stats && (
        <div className="stats-grid" style={{ marginBottom: '1.5rem' }}>
          <div className="stat-card">
            <div className="stat-icon success">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="20 12 20 22 4 22 4 12"/>
                <rect x="2" y="7" width="20" height="5"/>
                <line x1="12" y1="22" x2="12" y2="7"/>
                <path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/>
                <path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/>
              </svg>
            </div>
            <div className="stat-content">
              <div className="stat-label">סה"כ מתנות</div>
              <div className="stat-value">{formatCurrency(stats.total_amount)}</div>
              <div className="stat-change">{stats.count} מתנות</div>
            </div>
          </div>
        </div>
      )}

      <div className="admin-card">
        <div className="admin-card-header">
          <h2>מתנות ({pagination.total})</h2>
          <div className="admin-card-actions">
            <input
              type="text"
              className="search-input"
              placeholder="חיפוש לפי שם אורח או אירוע..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPagination(prev => ({ ...prev, page: 1 }));
              }}
            />
          </div>
        </div>

        {loading ? (
          <div className="admin-loading">
            <div className="loading-spinner"></div>
            <p>טוען מתנות...</p>
          </div>
        ) : gifts.length > 0 ? (
          <>
            <div className="admin-table-wrapper">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>אורח</th>
                    <th>אירוע</th>
                    <th>סכום</th>
                    <th>מטבע</th>
                    <th>אמצעי תשלום</th>
                    <th>תאריך</th>
                    <th>הערות</th>
                  </tr>
                </thead>
                <tbody>
                  {gifts.map(gift => (
                    <tr key={gift.id}>
                      <td><strong>{gift.guest_name || '-'}</strong></td>
                      <td>{gift.event_title || '-'}</td>
                      <td style={{ fontWeight: '600', color: 'var(--admin-success)' }}>
                        {formatCurrency(gift.amount, gift.currency)}
                      </td>
                      <td>{gift.currency || 'ILS'}</td>
                      <td>{getPaymentMethodLabel(gift.payment_method)}</td>
                      <td>{formatDate(gift.gift_date || gift.created_at)}</td>
                      <td style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {gift.notes || '-'}
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
              <polyline points="20 12 20 22 4 22 4 12"/>
              <rect x="2" y="7" width="20" height="5"/>
              <line x1="12" y1="22" x2="12" y2="7"/>
              <path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/>
              <path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/>
            </svg>
            <p>לא נמצאו מתנות</p>
          </div>
        )}
      </div>
    </div>
  );
}
