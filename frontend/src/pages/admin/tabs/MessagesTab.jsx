import { useState, useEffect } from 'react';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://event-gift.onrender.com/api';

export default function MessagesTab() {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, pages: 0 });
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    fetchMessages();
  }, [pagination.page, statusFilter]);

  const fetchMessages = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('adminToken');
      const params = new URLSearchParams({
        page: pagination.page,
        limit: pagination.limit,
        ...(statusFilter && { status: statusFilter })
      });

      const response = await fetch(`${API_BASE_URL}/admin/contacts?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setMessages(data.messages || []);
        setPagination(prev => ({ ...prev, ...data.pagination }));
      }
    } catch (err) {
      console.error('Failed to fetch messages:', err);
      setMessages([]);
    } finally {
      setLoading(false);
    }
  };

  const updateMessageStatus = async (messageId, status) => {
    try {
      const token = localStorage.getItem('adminToken');
      await fetch(`${API_BASE_URL}/admin/contacts/${messageId}?status=${status}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchMessages();
      if (selectedMessage?.id === messageId) {
        setSelectedMessage(prev => ({ ...prev, status }));
      }
    } catch (err) {
      console.error('Failed to update message:', err);
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

  const getStatusLabel = (status) => {
    const statuses = {
      new: 'חדש',
      read: 'נקרא',
      responded: 'נענה',
      closed: 'סגור'
    };
    return statuses[status] || status;
  };

  const getStatusClass = (status) => {
    const classes = {
      new: 'new',
      read: 'pending',
      responded: 'active',
      closed: 'completed'
    };
    return classes[status] || 'pending';
  };

  const viewMessage = (message) => {
    setSelectedMessage(message);
    setShowModal(true);
    if (message.status === 'new') {
      updateMessageStatus(message.id, 'read');
    }
  };

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <h1>פניות לקוחות</h1>
        <p>רשימת כל ההודעות שהתקבלו מטופס צור קשר</p>
      </div>

      <div className="admin-card">
        <div className="admin-card-header">
          <h2>פניות ({pagination.total})</h2>
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
              <option value="new">חדש</option>
              <option value="read">נקרא</option>
              <option value="responded">נענה</option>
              <option value="closed">סגור</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="admin-loading">
            <div className="loading-spinner"></div>
            <p>טוען פניות...</p>
          </div>
        ) : messages.length > 0 ? (
          <>
            <div className="admin-table-wrapper">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>שם</th>
                    <th>אימייל</th>
                    <th>טלפון</th>
                    <th>נושא</th>
                    <th>תאריך</th>
                    <th>סטטוס</th>
                    <th>פעולות</th>
                  </tr>
                </thead>
                <tbody>
                  {messages.map(message => (
                    <tr key={message.id} style={{ fontWeight: message.status === 'new' ? '600' : 'normal' }}>
                      <td>{message.full_name}</td>
                      <td style={{ direction: 'ltr', textAlign: 'right', fontSize: '0.85rem' }}>{message.email}</td>
                      <td style={{ direction: 'ltr', textAlign: 'right' }}>{message.phone || '-'}</td>
                      <td style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {message.subject || message.message?.substring(0, 50) || '-'}
                      </td>
                      <td style={{ color: 'var(--admin-text-muted)', fontSize: '0.85rem' }}>{formatDate(message.created_at)}</td>
                      <td>
                        <span className={`status-badge ${getStatusClass(message.status)}`}>
                          {getStatusLabel(message.status)}
                        </span>
                      </td>
                      <td>
                        <button
                          className="action-btn view"
                          onClick={() => viewMessage(message)}
                          title="צפייה בפנייה"
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
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
              <polyline points="22,6 12,13 2,6"/>
            </svg>
            <p>לא נמצאו פניות</p>
          </div>
        )}
      </div>

      {/* Message Details Modal */}
      {showModal && selectedMessage && (
        <div className="admin-modal-overlay" onClick={() => setShowModal(false)}>
          <div className="admin-modal" onClick={e => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h3>פרטי פנייה</h3>
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
                  <span className="detail-label">שם</span>
                  <span className="detail-value">{selectedMessage.full_name}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">אימייל</span>
                  <span className="detail-value" style={{ direction: 'ltr' }}>{selectedMessage.email}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">טלפון</span>
                  <span className="detail-value" style={{ direction: 'ltr' }}>{selectedMessage.phone || '-'}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">תאריך</span>
                  <span className="detail-value">{formatDate(selectedMessage.created_at)}</span>
                </div>
                {selectedMessage.subject && (
                  <div className="detail-item" style={{ gridColumn: '1 / -1' }}>
                    <span className="detail-label">נושא</span>
                    <span className="detail-value">{selectedMessage.subject}</span>
                  </div>
                )}
                <div className="detail-item" style={{ gridColumn: '1 / -1' }}>
                  <span className="detail-label">הודעה</span>
                  <div className="detail-value" style={{
                    background: 'var(--admin-surface-2)',
                    padding: '1rem',
                    borderRadius: 'var(--admin-radius-sm)',
                    whiteSpace: 'pre-wrap',
                    marginTop: '0.5rem'
                  }}>
                    {selectedMessage.message}
                  </div>
                </div>
                <div className="detail-item">
                  <span className="detail-label">סטטוס נוכחי</span>
                  <span className={`status-badge ${getStatusClass(selectedMessage.status)}`}>
                    {getStatusLabel(selectedMessage.status)}
                  </span>
                </div>
              </div>
            </div>
            <div className="admin-modal-footer">
              <button
                className="btn btn-secondary"
                onClick={() => updateMessageStatus(selectedMessage.id, 'responded')}
              >
                סמן כנענה
              </button>
              <button
                className="btn btn-primary"
                onClick={() => updateMessageStatus(selectedMessage.id, 'closed')}
              >
                סגור פנייה
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
