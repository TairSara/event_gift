import { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import './RSVPPage.css';

// Remove /api suffix if present in env var, we'll add the full path
const API_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:8000').replace(/\/api$/, '');

export default function RSVPPage() {
  const { guestId } = useParams();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [guest, setGuest] = useState(null);
  const [event, setEvent] = useState(null);
  const [error, setError] = useState('');
  const [response, setResponse] = useState(null);
  const [attendingCount, setAttendingCount] = useState(1);
  const [submitted, setSubmitted] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  // Load guest and event data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError('');

        // Add timestamp to prevent caching
        const timestamp = new Date().getTime();
        const res = await axios.get(`${API_BASE}/api/rsvp/${guestId}?token=${token}&_t=${timestamp}`, {
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
          }
        });

        setGuest(res.data.guest);
        setEvent(res.data.event);

        if (res.data.guest.attending_count > 0) {
          setAttendingCount(res.data.guest.attending_count);
        }

        if (res.data.guest.status === 'confirmed' || res.data.guest.status === 'declined') {
          setSubmitted(true);
          setResponse(res.data.guest.status === 'confirmed' ? 'confirmed' : 'declined');
        }

        setLoading(false);
      } catch (err) {
        console.error('Error loading RSVP:', err);
        setError(err.response?.data?.detail || 'שגיאה בטעינת פרטי ההזמנה');
        setLoading(false);
      }
    };

    if (guestId && token) {
      fetchData();
    } else {
      setError('קישור לא תקין');
      setLoading(false);
    }
  }, [guestId, token]);

  const handleSubmit = async (attending) => {
    try {
      setSubmitting(true);
      setError('');

      const payload = {
        status: attending ? 'confirmed' : 'declined',
        attending_count: attending ? attendingCount : 0
      };

      await axios.post(`${API_BASE}/api/rsvp/${guestId}?token=${token}`, payload);

      setResponse(attending ? 'confirmed' : 'declined');
      setSubmitted(true);
      setSubmitting(false);
    } catch (err) {
      console.error('Error submitting RSVP:', err);
      setError(err.response?.data?.detail || 'שגיאה בשמירת התשובה');
      setSubmitting(false);
    }
  };

  // Format date nicely
  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('he-IL', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Loading State
  if (loading) {
    return (
      <div className="rsvp-page" dir="rtl">
        <div className="rsvp-background">
          <div className="rsvp-pattern"></div>
        </div>
        <div className="rsvp-container">
          <div className="loading-state">
            <div className="loading-spinner-elegant">
              <div className="spinner-dot"></div>
              <div className="spinner-dot"></div>
              <div className="spinner-dot"></div>
            </div>
            <p className="loading-text">טוען את ההזמנה...</p>
          </div>
        </div>
      </div>
    );
  }

  // Error State
  if (error) {
    return (
      <div className="rsvp-page" dir="rtl">
        <div className="rsvp-background">
          <div className="rsvp-pattern"></div>
        </div>
        <div className="rsvp-container">
          <div className="state-container">
            <div className="state-icon error">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/>
                <line x1="15" y1="9" x2="9" y2="15"/>
                <line x1="9" y1="9" x2="15" y2="15"/>
              </svg>
            </div>
            <h2 className="state-title">אופס!</h2>
            <p className="state-message">{error}</p>
            <a href="/">
              <button className="btn-secondary">חזרה לדף הבית</button>
            </a>
          </div>
        </div>
      </div>
    );
  }

  // Success/Submitted State
  if (submitted) {
    return (
      <div className="rsvp-page" dir="rtl">
        <div className="rsvp-background">
          <div className="rsvp-pattern"></div>
        </div>
        <div className="rsvp-container">
          {response === 'confirmed' ? (
            <div className="state-container success">
              <div className="state-icon success">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M20 6L9 17l-5-5"/>
                </svg>
              </div>

              <h2 className="state-title">תודה רבה!</h2>
              <p className="state-message">התשובה שלכם התקבלה בהצלחה</p>

              <div className="count-badge">
                <span className="count-number">{attendingCount}</span>
                <span className="count-label">{attendingCount === 1 ? 'מגיע' : 'מגיעים'}</span>
              </div>

              <div className="success-event-card">
                <h3>פרטי האירוע</h3>

                <div className="event-info-list">
                  <div className="event-info-item">
                    <div className="info-icon">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                      </svg>
                    </div>
                    <div className="info-content">
                      <span className="info-label">שם האירוע</span>
                      <span className="info-value">{event?.event_name}</span>
                    </div>
                  </div>

                  {event?.event_date && (
                    <div className="event-info-item">
                      <div className="info-icon">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                          <line x1="16" y1="2" x2="16" y2="6"/>
                          <line x1="8" y1="2" x2="8" y2="6"/>
                          <line x1="3" y1="10" x2="21" y2="10"/>
                        </svg>
                      </div>
                      <div className="info-content">
                        <span className="info-label">תאריך</span>
                        <span className="info-value">{formatDate(event.event_date)}</span>
                      </div>
                    </div>
                  )}

                  {event?.event_time && (
                    <div className="event-info-item">
                      <div className="info-icon">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <circle cx="12" cy="12" r="10"/>
                          <polyline points="12 6 12 12 16 14"/>
                        </svg>
                      </div>
                      <div className="info-content">
                        <span className="info-label">שעה</span>
                        <span className="info-value">{event.event_time}</span>
                      </div>
                    </div>
                  )}

                  {event?.event_location && (
                    <div className="event-info-item">
                      <div className="info-icon">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                          <circle cx="12" cy="10" r="3"/>
                        </svg>
                      </div>
                      <div className="info-content">
                        <span className="info-label">מיקום</span>
                        <span className="info-value">{event.event_location}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <p className="farewell-message">נשמח לראותכם!</p>

              <button onClick={() => window.close()} className="btn-secondary">
                סגירה
              </button>
            </div>
          ) : (
            <div className="state-container declined">
              <div className="state-icon declined">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                </svg>
              </div>

              <h2 className="state-title">תודה על העדכון</h2>
              <p className="state-message">נשמח לראותכם בהזדמנות אחרת!</p>

              <button onClick={() => window.close()} className="btn-secondary">
                סגירה
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Main RSVP Form
  return (
    <div className="rsvp-page" dir="rtl">
      <div className="rsvp-background">
        <div className="rsvp-pattern"></div>
      </div>

      <div className="rsvp-container">
        {/* Invitation Image Section */}
        {event?.invitation_image_url && (
          <div className="invitation-image-section">
            <div className={`invitation-image-wrapper ${imageLoaded ? 'loaded' : ''}`}>
              <img
                src={event.invitation_image_url}
                alt="הזמנה לאירוע"
                className="invitation-image"
                onLoad={() => setImageLoaded(true)}
                onError={(e) => {
                  e.target.style.display = 'none';
                }}
              />
              {!imageLoaded && (
                <div className="image-placeholder">
                  <div className="loading-spinner-elegant small">
                    <div className="spinner-dot"></div>
                    <div className="spinner-dot"></div>
                    <div className="spinner-dot"></div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Header Section */}
        <div className="rsvp-header">
          <div className="header-ornament">
            <svg viewBox="0 0 100 20" className="ornament-svg">
              <path d="M0,10 Q25,0 50,10 T100,10" fill="none" stroke="currentColor" strokeWidth="1"/>
            </svg>
          </div>
          <h1>הנכם מוזמנים</h1>
          <p className="guest-greeting">שלום <span className="guest-name">{guest?.name || 'אורח יקר'}</span>,</p>
          <div className="header-ornament bottom">
            <svg viewBox="0 0 100 20" className="ornament-svg">
              <path d="M0,10 Q25,20 50,10 T100,10" fill="none" stroke="currentColor" strokeWidth="1"/>
            </svg>
          </div>
        </div>

        {/* Event Details */}
        <div className="rsvp-content">
          <div className="event-title-section">
            <h2>{event?.event_name}</h2>
            <div className="title-underline"></div>
          </div>

          <div className="event-details-grid">
            {event?.event_date && (
              <div className="detail-card">
                <div className="detail-icon-wrapper">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                    <line x1="16" y1="2" x2="16" y2="6"/>
                    <line x1="8" y1="2" x2="8" y2="6"/>
                    <line x1="3" y1="10" x2="21" y2="10"/>
                  </svg>
                </div>
                <span className="detail-label">תאריך</span>
                <span className="detail-value">{formatDate(event.event_date)}</span>
              </div>
            )}

            {event?.event_time && (
              <div className="detail-card">
                <div className="detail-icon-wrapper">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <circle cx="12" cy="12" r="10"/>
                    <polyline points="12 6 12 12 16 14"/>
                  </svg>
                </div>
                <span className="detail-label">שעה</span>
                <span className="detail-value">{event.event_time}</span>
              </div>
            )}

            {event?.event_location && (
              <div className="detail-card">
                <div className="detail-icon-wrapper">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                    <circle cx="12" cy="10" r="3"/>
                  </svg>
                </div>
                <span className="detail-label">מיקום</span>
                <span className="detail-value">{event.event_location}</span>
              </div>
            )}
          </div>

          {/* RSVP Section */}
          <div className="rsvp-section">
            <h3>נשמח לדעת אם תגיעו</h3>

            {response === null && (
              <div className="response-buttons">
                <button
                  onClick={() => setResponse('confirmed')}
                  className="response-btn confirm"
                  disabled={submitting}
                >
                  כן, נגיע!
                </button>

                <button
                  onClick={() => setResponse('declined')}
                  className="response-btn decline"
                  disabled={submitting}
                >
                  לא נוכל להגיע
                </button>
              </div>
            )}

            {response === 'confirmed' && (
              <div className="attending-section">
                <label className="attending-label">כמה תגיעו?</label>

                <div className="attending-counter">
                  <button
                    onClick={() => setAttendingCount(Math.max(1, attendingCount - 1))}
                    className="counter-btn"
                    disabled={submitting || attendingCount <= 1}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <line x1="5" y1="12" x2="19" y2="12"/>
                    </svg>
                  </button>

                  <div className="counter-display">
                    <span className="counter-value">{attendingCount}</span>
                  </div>

                  <button
                    onClick={() => setAttendingCount(attendingCount + 1)}
                    className="counter-btn"
                    disabled={submitting}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <line x1="12" y1="5" x2="12" y2="19"/>
                      <line x1="5" y1="12" x2="19" y2="12"/>
                    </svg>
                  </button>
                </div>

                <button
                  onClick={() => handleSubmit(true)}
                  disabled={submitting}
                  className="submit-btn"
                >
                  {submitting ? (
                    <span className="btn-loading">
                      <div className="loading-spinner-small"></div>
                      שומר...
                    </span>
                  ) : (
                    'אישור הגעה'
                  )}
                </button>

                <button
                  onClick={() => setResponse(null)}
                  disabled={submitting}
                  className="back-btn"
                >
                  חזרה
                </button>
              </div>
            )}

            {response === 'declined' && (
              <div className="declined-section">
                <p className="declined-message">
                  אנחנו מבינים, נשמח לראותכם בהזדמנות אחרת
                </p>

                <button
                  onClick={() => handleSubmit(false)}
                  disabled={submitting}
                  className="submit-btn decline"
                >
                  {submitting ? (
                    <span className="btn-loading">
                      <div className="loading-spinner-small"></div>
                      שומר...
                    </span>
                  ) : (
                    'אישור'
                  )}
                </button>

                <button
                  onClick={() => setResponse(null)}
                  disabled={submitting}
                  className="back-btn"
                >
                  חזרה
                </button>
              </div>
            )}
          </div>

          {error && (
            <div className="error-message">{error}</div>
          )}
        </div>

        {/* Footer */}
        <div className="rsvp-footer">
          <span>Save The Day</span>
        </div>
      </div>
    </div>
  );
}
