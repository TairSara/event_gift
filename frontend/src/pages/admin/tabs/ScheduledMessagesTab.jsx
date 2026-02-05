import { useState, useEffect } from 'react';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://event-gift.onrender.com/api';

export default function ScheduledMessagesTab() {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, pages: 0 });

  useEffect(() => {
    fetchMessages();
  }, [pagination.page, statusFilter, typeFilter]);

  const fetchMessages = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('adminToken');
      const params = new URLSearchParams({
        page: pagination.page,
        limit: pagination.limit,
        ...(statusFilter && { status: statusFilter }),
        ...(typeFilter && { type: typeFilter })
      });

      const response = await fetch(`${API_BASE_URL}/admin/scheduled-messages?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setMessages(data.messages || []);
        setPagination(prev => ({ ...prev, ...data.pagination }));
      }
    } catch (err) {
      console.error('Failed to fetch scheduled messages:', err);
      setMessages([]);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('he-IL', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getTypeLabel = (type) => {
    const types = {
      sms: 'SMS',
      whatsapp: 'וואטסאפ',
      email: 'אימייל',
      reminder: 'תזכורת'
    };
    return types[type] || type || '-';
  };

  const getStatusLabel = (status) => {
    const statuses = {
      pending: 'ממתין',
      sent: 'נשלח',
      failed: 'נכשל',
      cancelled: 'בוטל'
    };
    return statuses[status] || status || '-';
  };

  const getStatusClass = (status) => {
    const classes = {
      pending: 'pending',
      sent: 'active',
      failed: 'cancelled',
      cancelled: 'expired'
    };
    return classes[status] || 'pending';
  };

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <h1>הודעות מתוזמנות</h1>
        <p>רשימת כל ההודעות המתוזמנות לשליחה באירועים</p>
      </div>

      <div className="admin-card">
        <div className="admin-card-header">
          <h2>הודעות מתוזמנות ({pagination.total})</h2>
          <div className="admin-card-actions">
            <select
              className="filter-select"
              value={typeFilter}
              onChange={(e) => {
                setTypeFilter(e.target.value);
                setPagination(prev => ({ ...prev, page: 1 }));
              }}
            >
              <option value="">כל הסוגים</option>
              <option value="sms">SMS</option>
              <option value="whatsapp">וואטסאפ</option>
              <option value="email">אימייל</option>
              <option value="reminder">תזכורת</option>
            </select>
            <select
              className="filter-select"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPagination(prev => ({ ...prev, page: 1 }));
              }}
            >
              <option value="">כל הסטטוסים</option>
              <option value="pending">ממתין</option>
              <option value="sent">נשלח</option>
              <option value="failed">נכשל</option>
              <option value="cancelled">בוטל</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="admin-loading">
            <div className="loading-spinner"></div>
            <p>טוען הודעות...</p>
          </div>
        ) : messages.length > 0 ? (
          <>
            <div className="admin-table-wrapper">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>אירוע</th>
                    <th>נמען</th>
                    <th>סוג</th>
                    <th>תוכן</th>
                    <th>מתוזמן ל</th>
                    <th>נשלח ב</th>
                    <th>סטטוס</th>
                  </tr>
                </thead>
                <tbody>
                  {messages.map(message => (
                    <tr key={message.id}>
                      <td>{message.event_title || '-'}</td>
                      <td>
                        <div>
                          <div style={{ fontSize: '0.85rem' }}>{message.recipient_name || '-'}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--admin-text-muted)', direction: 'ltr', textAlign: 'right' }}>
                            {message.recipient_phone || message.recipient_email || '-'}
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className={`status-badge ${message.type === 'sms' ? 'info' : message.type === 'whatsapp' ? 'active' : 'primary'}`}>
                          {getTypeLabel(message.type)}
                        </span>
                      </td>
                      <td style={{ maxWidth: '250px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {message.content || message.message || '-'}
                      </td>
                      <td style={{ color: 'var(--admin-text-muted)', fontSize: '0.85rem' }}>
                        {formatDate(message.scheduled_at)}
                      </td>
                      <td style={{ color: 'var(--admin-text-muted)', fontSize: '0.85rem' }}>
                        {message.sent_at ? formatDate(message.sent_at) : '-'}
                      </td>
                      <td>
                        <span className={`status-badge ${getStatusClass(message.status)}`}>
                          {getStatusLabel(message.status)}
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
              <circle cx="12" cy="12" r="10"/>
              <polyline points="12 6 12 12 16 14"/>
            </svg>
            <p>לא נמצאו הודעות מתוזמנות</p>
          </div>
        )}
      </div>
    </div>
  );
}
