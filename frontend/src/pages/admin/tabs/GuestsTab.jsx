import { useState, useEffect } from 'react';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://event-gift.onrender.com/api';

export default function GuestsTab() {
  // Events list state
  const [events, setEvents] = useState([]);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [eventsSearch, setEventsSearch] = useState('');
  const [eventsPagination, setEventsPagination] = useState({ page: 1, limit: 20, total: 0, pages: 0 });

  // Selected event + guests state
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [guests, setGuests] = useState([]);
  const [guestsLoading, setGuestsLoading] = useState(false);
  const [guestsSearch, setGuestsSearch] = useState('');
  const [updatingGuestId, setUpdatingGuestId] = useState(null);

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

      const response = await fetch(`${API_BASE_URL}/admin/events-with-guests?${params}`, {
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

  const fetchEventGuests = async (eventId) => {
    try {
      setGuestsLoading(true);
      const token = localStorage.getItem('adminToken');
      const params = new URLSearchParams({
        ...(guestsSearch && { search: guestsSearch })
      });

      const response = await fetch(`${API_BASE_URL}/admin/events/${eventId}/guests?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setGuests(data.guests || []);
      }
    } catch (err) {
      console.error('Failed to fetch guests:', err);
      setGuests([]);
    } finally {
      setGuestsLoading(false);
    }
  };

  const handleEventClick = (event) => {
    setSelectedEvent(event);
    setGuestsSearch('');
    fetchEventGuests(event.id);
  };

  const handleBackToEvents = () => {
    setSelectedEvent(null);
    setGuests([]);
    setGuestsSearch('');
  };

  const handleStatusChange = async (guestId, newStatus) => {
    try {
      setUpdatingGuestId(guestId);
      const token = localStorage.getItem('adminToken');

      const response = await fetch(`${API_BASE_URL}/admin/guests/${guestId}/status`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: newStatus })
      });

      if (response.ok) {
        // Update locally
        setGuests(prev => prev.map(g =>
          g.id === guestId ? { ...g, status: newStatus } : g
        ));
        // Update event counts
        fetchEvents();
      }
    } catch (err) {
      console.error('Failed to update guest status:', err);
    } finally {
      setUpdatingGuestId(null);
    }
  };

  // Search guests when search changes
  useEffect(() => {
    if (selectedEvent) {
      const timer = setTimeout(() => {
        fetchEventGuests(selectedEvent.id);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [guestsSearch]);

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('he-IL');
  };

  const getEventTypeLabel = (type) => {
    const types = {
      wedding: 'חתונה', bar_mitzvah: 'בר מצווה', bat_mitzvah: 'בת מצווה',
      birthday: 'יום הולדת', brit: 'ברית', other: 'אחר'
    };
    return types[type] || type;
  };

  const getStatusLabel = (status) => {
    const statuses = { pending: 'ממתין', confirmed: 'אישר הגעה', declined: 'לא מגיע' };
    return statuses[status] || status || 'ממתין';
  };

  const getStatusClass = (status) => {
    const classes = { confirmed: 'active', declined: 'cancelled', pending: 'pending' };
    return classes[status] || 'pending';
  };

  // ===== GUESTS VIEW (selected event) =====
  if (selectedEvent) {
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
          <h1>אורחים - {selectedEvent.event_title}</h1>
          <p>
            {getEventTypeLabel(selectedEvent.event_type)}
            {selectedEvent.event_date && ` | ${formatDate(selectedEvent.event_date)}`}
            {selectedEvent.event_location && ` | ${selectedEvent.event_location}`}
          </p>
        </div>

        {/* Guest stats for this event */}
        <div className="stats-grid" style={{ marginBottom: '1.5rem' }}>
          <div className="stat-card">
            <div className="stat-icon primary">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
            </div>
            <div className="stat-content">
              <div className="stat-label">סה"כ אורחים</div>
              <div className="stat-value">{guests.length}</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon success">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            </div>
            <div className="stat-content">
              <div className="stat-label">אישרו הגעה</div>
              <div className="stat-value">{guests.filter(g => g.status === 'confirmed').length}</div>
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
              <div className="stat-label">ממתינים</div>
              <div className="stat-value">{guests.filter(g => g.status === 'pending' || !g.status).length}</div>
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
              <div className="stat-label">לא מגיעים</div>
              <div className="stat-value">{guests.filter(g => g.status === 'declined').length}</div>
            </div>
          </div>
        </div>

        <div className="admin-card">
          <div className="admin-card-header">
            <h2>אורחים ({guests.length})</h2>
            <div className="admin-card-actions">
              <input
                type="text"
                className="search-input"
                placeholder="חיפוש לפי שם או טלפון..."
                value={guestsSearch}
                onChange={(e) => setGuestsSearch(e.target.value)}
              />
            </div>
          </div>

          {guestsLoading ? (
            <div className="admin-loading">
              <div className="loading-spinner"></div>
              <p>טוען אורחים...</p>
            </div>
          ) : guests.length > 0 ? (
            <div className="admin-table-wrapper">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>שם מלא</th>
                    <th>טלפון</th>
                    <th>אימייל</th>
                    <th>מס׳ אורחים</th>
                    <th>הזמנה נשלחה</th>
                    <th>סטטוס</th>
                    <th>שינוי סטטוס</th>
                  </tr>
                </thead>
                <tbody>
                  {guests.map(guest => (
                    <tr key={guest.id}>
                      <td><strong>{guest.full_name}</strong></td>
                      <td style={{ direction: 'ltr', textAlign: 'right' }}>{guest.phone || '-'}</td>
                      <td style={{ direction: 'ltr', textAlign: 'right', fontSize: '0.85rem' }}>{guest.email || '-'}</td>
                      <td>{guest.guests_count || 1}</td>
                      <td>
                        <span className={`status-badge ${guest.invitation_sent ? 'active' : 'pending'}`}>
                          {guest.invitation_sent ? 'נשלחה' : 'לא נשלחה'}
                        </span>
                      </td>
                      <td>
                        <span className={`status-badge ${getStatusClass(guest.status)}`}>
                          {getStatusLabel(guest.status)}
                        </span>
                      </td>
                      <td>
                        <select
                          className="guest-status-select"
                          value={guest.status || 'pending'}
                          onChange={(e) => handleStatusChange(guest.id, e.target.value)}
                          disabled={updatingGuestId === guest.id}
                          style={{
                            opacity: updatingGuestId === guest.id ? 0.5 : 1
                          }}
                        >
                          <option value="confirmed">אישר הגעה</option>
                          <option value="pending">ממתין</option>
                          <option value="declined">לא מגיע</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="admin-empty">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
              </svg>
              <p>אין אורחים באירוע זה</p>
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
        <h1>ניהול אורחים</h1>
        <p>בחרו אירוע כדי לצפות ולנהל את רשימת האורחים</p>
      </div>

      <div className="admin-card">
        <div className="admin-card-header">
          <h2>אירועים ({eventsPagination.total})</h2>
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
                    <th>מיקום</th>
                    <th>מארגן</th>
                    <th>סה"כ אורחים</th>
                    <th>אישרו</th>
                    <th>ממתינים</th>
                    <th>לא מגיעים</th>
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
                      <td>{formatDate(event.event_date)}</td>
                      <td>{event.event_location || '-'}</td>
                      <td>{event.user_name || '-'}</td>
                      <td>
                        <span className="guest-count-badge total">{event.total_guests}</span>
                      </td>
                      <td>
                        <span className="guest-count-badge confirmed">{event.confirmed}</span>
                      </td>
                      <td>
                        <span className="guest-count-badge pending">{event.pending}</span>
                      </td>
                      <td>
                        <span className="guest-count-badge declined">{event.declined}</span>
                      </td>
                      <td>
                        <span className="guests-view-link">
                          צפה באורחים
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
