import { useState, useEffect } from 'react';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://event-gift.onrender.com/api';

export default function ScheduledMessagesTab() {
  // Events list state
  const [events, setEvents] = useState([]);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [eventsSearch, setEventsSearch] = useState('');
  const [eventsPagination, setEventsPagination] = useState({ page: 1, limit: 20, total: 0, pages: 0 });

  // Selected event + messages state
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messagesLoading, setMessagesLoading] = useState(false);

  useEffect(() => {
    fetchEvents();
  }, [eventsPagination.page, eventsSearch]);

  const fetchEvents = async () => {
    try {
      setEventsLoading(true);
      const token = localStorage.getItem('adminToken');
      const params = new URLSearchParams({
        page: eventsPagination.page,
        limit: eventsPagination.limit,
        ...(eventsSearch && { search: eventsSearch })
      });

      const response = await fetch(`${API_BASE_URL}/admin/scheduled-messages?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setEvents(data.events || []);
        setEventsPagination(prev => ({ ...prev, ...data.pagination }));
      }
    } catch (err) {
      console.error('Failed to fetch events:', err);
      setEvents([]);
    } finally {
      setEventsLoading(false);
    }
  };

  const fetchEventMessages = async (eventId) => {
    try {
      setMessagesLoading(true);
      const token = localStorage.getItem('adminToken');

      const response = await fetch(`${API_BASE_URL}/admin/scheduled-messages/event/${eventId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setMessages(data.messages || []);
      }
    } catch (err) {
      console.error('Failed to fetch messages:', err);
      setMessages([]);
    } finally {
      setMessagesLoading(false);
    }
  };

  const handleEventClick = (event) => {
    setSelectedEvent(event);
    fetchEventMessages(event.id);
  };

  const handleBackToEvents = () => {
    setSelectedEvent(null);
    setMessages([]);
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

  const formatDateOnly = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('he-IL', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getEventTypeLabel = (type) => {
    const types = {
      wedding: 'חתונה', bar_mitzvah: 'בר מצווה', bat_mitzvah: 'בת מצווה',
      birthday: 'יום הולדת', brit: 'ברית', other: 'אחר'
    };
    return types[type] || type || '-';
  };

  const getStatusLabel = (status) => {
    const statuses = {
      pending: 'ממתין',
      sent: 'נשלח',
      completed: 'הושלם',
      failed: 'נכשל',
      cancelled: 'בוטל',
      partially_sent: 'נשלח חלקית',
      partial: 'נשלח חלקית'
    };
    return statuses[status] || status || '-';
  };

  const getStatusClass = (status) => {
    const classes = {
      pending: 'pending',
      sent: 'active',
      completed: 'active',
      failed: 'cancelled',
      cancelled: 'expired',
      partially_sent: 'pending',
      partial: 'pending'
    };
    return classes[status] || 'pending';
  };

  const getMessageLabel = (num) => {
    const labels = { 1: 'הודעה ראשונה', 2: 'הודעה שנייה', 3: 'הודעה שלישית' };
    return labels[num] || `הודעה ${num}`;
  };

  const getSendMethodLabel = (method) => {
    if (!method) return '-';
    const methods = { WhatsApp: 'וואטסאפ', SMS: 'SMS', sms: 'SMS', whatsapp: 'וואטסאפ' };
    return methods[method] || method;
  };

  const translateError = (error) => {
    if (!error) return '-';
    // Translate common error messages
    const translations = {
      'No guests to send to': 'אין אורחים לשליחה',
      'Event not found': 'אירוע לא נמצא',
      'Failed to send': 'שליחה נכשלה',
      'Template not found': 'תבנית לא נמצאה',
      'Invalid phone number': 'מספר טלפון לא תקין',
      'Rate limit exceeded': 'חריגה ממגבלת שליחה',
      'Network error': 'שגיאת רשת',
      'Timeout': 'חריגת זמן'
    };
    for (const [eng, heb] of Object.entries(translations)) {
      if (error.toLowerCase().includes(eng.toLowerCase())) return heb;
    }
    return error;
  };

  // ===== MESSAGES VIEW (selected event) =====
  if (selectedEvent) {
    const sentCount = messages.filter(m => m.status === 'sent' || m.status === 'completed').length;
    const pendingCount = messages.filter(m => m.status === 'pending').length;
    const failedCount = messages.filter(m => m.status === 'failed').length;
    const totalGuestsSent = messages.reduce((sum, m) => sum + (m.guests_sent_count || 0), 0);
    const totalGuestsFailed = messages.reduce((sum, m) => sum + (m.guests_failed_count || 0), 0);

    return (
      <div className="admin-page">
        <div className="admin-page-header">
          <button className="guests-back-btn" onClick={handleBackToEvents}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
              <path d="M19 12H5"/>
              <polyline points="12 19 5 12 12 5"/>
            </svg>
            חזרה לרשימת האירועים
          </button>
          <h1>הודעות מתוזמנות - {selectedEvent.event_title}</h1>
          <p>
            {getEventTypeLabel(selectedEvent.event_type)}
            {selectedEvent.event_date && ` | ${formatDateOnly(selectedEvent.event_date)}`}
            {selectedEvent.event_location && ` | ${selectedEvent.event_location}`}
            {selectedEvent.send_method && ` | שיטת שליחה: ${getSendMethodLabel(selectedEvent.send_method)}`}
          </p>
        </div>

        {/* Stats */}
        <div className="stats-grid" style={{ marginBottom: '1.5rem' }}>
          <div className="stat-card">
            <div className="stat-icon primary">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/>
                <polyline points="12 6 12 12 16 14"/>
              </svg>
            </div>
            <div className="stat-content">
              <div className="stat-label">סה"כ הודעות</div>
              <div className="stat-value">{messages.length}</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon success">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            </div>
            <div className="stat-content">
              <div className="stat-label">נשלחו</div>
              <div className="stat-value">{sentCount}</div>
              <div className="stat-change positive">{totalGuestsSent} אורחים קיבלו</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon warning">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/>
                <polyline points="12 6 12 12 16 14"/>
              </svg>
            </div>
            <div className="stat-content">
              <div className="stat-label">ממתינות</div>
              <div className="stat-value">{pendingCount}</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon" style={{ background: 'var(--admin-danger-dim)', color: 'var(--admin-danger)' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </div>
            <div className="stat-content">
              <div className="stat-label">נכשלו</div>
              <div className="stat-value">{failedCount}</div>
              {totalGuestsFailed > 0 && <div className="stat-change negative">{totalGuestsFailed} אורחים לא קיבלו</div>}
            </div>
          </div>
        </div>

        <div className="admin-card">
          <div className="admin-card-header">
            <h2>הודעות ({messages.length})</h2>
          </div>

          {messagesLoading ? (
            <div className="admin-loading">
              <div className="loading-spinner"></div>
              <p>טוען הודעות...</p>
            </div>
          ) : messages.length > 0 ? (
            <div className="admin-table-wrapper">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>מספר הודעה</th>
                    <th>שיטת שליחה</th>
                    <th>תאריך מתוזמן</th>
                    <th>נשלח ב</th>
                    <th>אורחים שקיבלו</th>
                    <th>אורחים שנכשלו</th>
                    <th>סטטוס</th>
                    <th>שגיאה</th>
                  </tr>
                </thead>
                <tbody>
                  {messages.map(message => (
                    <tr key={message.id}>
                      <td><strong>{getMessageLabel(message.message_number)}</strong></td>
                      <td>
                        <span className={`status-badge ${message.send_method === 'WhatsApp' || message.send_method === 'whatsapp' ? 'active' : 'new'}`}>
                          {getSendMethodLabel(message.send_method)}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.85rem' }}>
                        {formatDateOnly(message.scheduled_date)}
                      </td>
                      <td style={{ fontSize: '0.85rem', color: 'var(--admin-text-muted)' }}>
                        {message.sent_at ? formatDate(message.sent_at) : '-'}
                      </td>
                      <td>
                        <span className="guest-count-badge confirmed">{message.guests_sent_count}</span>
                      </td>
                      <td>
                        <span className={`guest-count-badge ${message.guests_failed_count > 0 ? 'declined' : 'total'}`}>
                          {message.guests_failed_count}
                        </span>
                      </td>
                      <td>
                        <span className={`status-badge ${getStatusClass(message.status)}`}>
                          {getStatusLabel(message.status)}
                        </span>
                      </td>
                      <td style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.8rem', color: 'var(--admin-danger)' }}
                        title={message.error_message || ''}
                      >
                        {translateError(message.error_message)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="admin-empty">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/>
                <polyline points="12 6 12 12 16 14"/>
              </svg>
              <p>אין הודעות מתוזמנות לאירוע זה</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ===== EVENTS LIST VIEW =====
  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <h1>הודעות מתוזמנות</h1>
        <p>בחרו אירוע כדי לצפות בהודעות המתוזמנות שלו</p>
      </div>

      <div className="admin-card">
        <div className="admin-card-header">
          <h2>אירועים עם הודעות ({eventsPagination.total})</h2>
          <div className="admin-card-actions">
            <input
              type="text"
              className="search-input"
              placeholder="חיפוש אירוע..."
              value={eventsSearch}
              onChange={(e) => {
                setEventsSearch(e.target.value);
                setEventsPagination(prev => ({ ...prev, page: 1 }));
              }}
            />
          </div>
        </div>

        {eventsLoading ? (
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
                    <th>שיטת שליחה</th>
                    <th>סה"כ הודעות</th>
                    <th>נשלחו</th>
                    <th>ממתינות</th>
                    <th>נכשלו</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {events.map(event => (
                    <tr
                      key={event.id}
                      className="guests-event-row"
                      onClick={() => handleEventClick(event)}
                    >
                      <td><strong>{event.event_title || '-'}</strong></td>
                      <td>{getEventTypeLabel(event.event_type)}</td>
                      <td>{formatDateOnly(event.event_date)}</td>
                      <td>
                        <span className={`status-badge ${event.send_method === 'WhatsApp' || event.send_method === 'whatsapp' ? 'active' : 'new'}`}>
                          {getSendMethodLabel(event.send_method)}
                        </span>
                      </td>
                      <td>
                        <span className="guest-count-badge total">{event.total_messages}</span>
                      </td>
                      <td>
                        <span className="guest-count-badge confirmed">{event.sent_count}</span>
                      </td>
                      <td>
                        <span className="guest-count-badge pending">{event.pending_count}</span>
                      </td>
                      <td>
                        <span className={`guest-count-badge ${event.failed_count > 0 ? 'declined' : 'total'}`}>{event.failed_count}</span>
                      </td>
                      <td>
                        <span className="guests-view-link">
                          צפה בהודעות
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                            <path d="M5 12h14"/>
                            <polyline points="12 5 5 12 12 19"/>
                          </svg>
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {eventsPagination.pages > 1 && (
              <div className="admin-pagination">
                <div className="pagination-info">
                  מציג {((eventsPagination.page - 1) * eventsPagination.limit) + 1} - {Math.min(eventsPagination.page * eventsPagination.limit, eventsPagination.total)} מתוך {eventsPagination.total}
                </div>
                <div className="pagination-buttons">
                  <button
                    className="pagination-btn"
                    onClick={() => setEventsPagination(p => ({ ...p, page: p.page - 1 }))}
                    disabled={eventsPagination.page === 1}
                  >
                    הקודם
                  </button>
                  {[...Array(Math.min(5, eventsPagination.pages))].map((_, i) => {
                    const pageNum = i + 1;
                    return (
                      <button
                        key={pageNum}
                        className={`pagination-btn ${eventsPagination.page === pageNum ? 'active' : ''}`}
                        onClick={() => setEventsPagination(p => ({ ...p, page: pageNum }))}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                  <button
                    className="pagination-btn"
                    onClick={() => setEventsPagination(p => ({ ...p, page: p.page + 1 }))}
                    disabled={eventsPagination.page === eventsPagination.pages}
                  >
                    הבא
                  </button>
                </div>
              </div>
            )}
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
