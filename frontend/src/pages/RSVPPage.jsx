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

  // Loading State
  if (loading) {
    return (
      <div className="rsvp-page">
        <div className="rsvp-blob rsvp-blob-1"></div>
        <div className="rsvp-blob rsvp-blob-2"></div>
        <div className="rsvp-blob rsvp-blob-3"></div>

        <div className="rsvp-container">
          <div className="loading-state">
            <div className="loading-spinner-box">
              <div className="spinner-ring"></div>
              <div className="spinner-ring"></div>
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
      <div className="rsvp-page">
        <div className="rsvp-blob rsvp-blob-1"></div>
        <div className="rsvp-blob rsvp-blob-2"></div>
        <div className="rsvp-blob rsvp-blob-3"></div>

        <div className="rsvp-container">
          <div className="state-container">
            <div className="state-icon error">
              <span className="state-emoji">✕</span>
            </div>
            <h2 className="state-title">אופס!</h2>
            <p className="state-message">{error}</p>
            <a href="/">
              <button className="close-button">חזרה לדף הבית</button>
            </a>
          </div>
        </div>
      </div>
    );
  }

  // Success/Submitted State
  if (submitted) {
    return (
      <div className="rsvp-page">
        <div className="rsvp-blob rsvp-blob-1"></div>
        <div className="rsvp-blob rsvp-blob-2"></div>
        <div className="rsvp-blob rsvp-blob-3"></div>

        <div className="rsvp-container">
          {response === 'confirmed' ? (
            <div className="state-container">
              <div className="state-icon">
                <span className="state-emoji">✓</span>
              </div>

              <h2 className="state-title">תודה רבה!</h2>

              <p className="state-message">התשובה שלכם התקבלה בהצלחה</p>

              <div className="count-display">
                <span className="count-number">
                  {attendingCount} {attendingCount === 1 ? 'מגיע' : 'מגיעים'}
                </span>
              </div>

              <div className="success-event-details">
                <h3>פרטי האירוע</h3>

                <div className="event-detail-row">
                  <div className="detail-icon-box">
                    <span className="detail-icon">🎊</span>
                  </div>
                  <div className="detail-info">
                    <p className="detail-info-label">שם האירוע</p>
                    <p className="detail-info-value">{event?.event_name}</p>
                  </div>
                </div>

                {event?.event_date && (
                  <div className="event-detail-row">
                    <div className="detail-icon-box date">
                      <span className="detail-icon">📅</span>
                    </div>
                    <div className="detail-info">
                      <p className="detail-info-label">תאריך</p>
                      <p className="detail-info-value">
                        {new Date(event.event_date).toLocaleDateString('he-IL', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </p>
                    </div>
                  </div>
                )}

                {event?.event_time && (
                  <div className="event-detail-row">
                    <div className="detail-icon-box time">
                      <span className="detail-icon">🕐</span>
                    </div>
                    <div className="detail-info">
                      <p className="detail-info-label">שעה</p>
                      <p className="detail-info-value">{event.event_time}</p>
                    </div>
                  </div>
                )}

                {event?.event_location && (
                  <div className="event-detail-row">
                    <div className="detail-icon-box location">
                      <span className="detail-icon">📍</span>
                    </div>
                    <div className="detail-info">
                      <p className="detail-info-label">מיקום</p>
                      <p className="detail-info-value">{event.event_location}</p>
                    </div>
                  </div>
                )}
              </div>

              <p className="farewell-message">נשמח לראותכם! 💝</p>

              <button onClick={() => window.close()} className="close-button">
                סגירה
              </button>
            </div>
          ) : (
            <div className="state-container">
              <div className="state-icon declined">
                <span className="state-emoji">💐</span>
              </div>

              <h2 className="state-title">תודה על העדכון</h2>

              <p className="state-message">נשמח לראותכם בהזדמנות אחרת!</p>

              <button onClick={() => window.close()} className="close-button">
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
      <div className="rsvp-blob rsvp-blob-1"></div>
      <div className="rsvp-blob rsvp-blob-2"></div>
      <div className="rsvp-blob rsvp-blob-3"></div>

      <div className="rsvp-container">
        <div className="rsvp-header">
          <div className="rsvp-header-content">
            <div className="rsvp-emoji">💌</div>
            <h1>הנכם מוזמנים!</h1>
            <p>שלום {guest?.name || 'אורח יקר'},</p>
          </div>
        </div>

        <div className="rsvp-content">
          <div className="event-name">
            <h2>{event?.event_name}</h2>

            <div className="event-details">
              {event?.event_date && (
                <div className="event-detail-card date">
                  <div className="event-detail-icon">📅</div>
                  <p className="event-detail-label">תאריך</p>
                  <p className="event-detail-value">
                    {new Date(event.event_date).toLocaleDateString('he-IL', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric'
                    })}
                  </p>
                </div>
              )}

              {event?.event_time && (
                <div className="event-detail-card time">
                  <div className="event-detail-icon">🕐</div>
                  <p className="event-detail-label">שעה</p>
                  <p className="event-detail-value">{event.event_time}</p>
                </div>
              )}

              {event?.event_location && (
                <div className="event-detail-card location">
                  <div className="event-detail-icon">📍</div>
                  <p className="event-detail-label">מיקום</p>
                  <p className="event-detail-value">{event.event_location}</p>
                </div>
              )}
            </div>
          </div>

          <div className="rsvp-section">
            <h3>נשמח לדעת אם תגיעו</h3>

            {response === null && (
              <div className="response-buttons">
                <button
                  onClick={() => setResponse('confirmed')}
                  className="response-button"
                  disabled={submitting}
                >
                  <span className="button-emoji">✅</span>
                  <span className="button-text">כן, נגיע!</span>
                </button>

                <button
                  onClick={() => setResponse('declined')}
                  className="response-button decline"
                  disabled={submitting}
                >
                  <span className="button-emoji">❌</span>
                  <span className="button-text">לא נוכל להגיע</span>
                </button>
              </div>
            )}

            {response === 'confirmed' && (
              <div className="attending-section">
                <label>
                  <span className="attending-label">כמה תגיעו?</span>

                  <div className="attending-counter">
                    <button
                      onClick={() => setAttendingCount(Math.max(1, attendingCount - 1))}
                      className="counter-button"
                      disabled={submitting || attendingCount <= 1}
                    >
                      -
                    </button>

                    <div className="counter-display">
                      <div className="counter-value">{attendingCount}</div>
                    </div>

                    <button
                      onClick={() => setAttendingCount(attendingCount + 1)}
                      className="counter-button"
                      disabled={submitting}
                    >
                      +
                    </button>
                  </div>
                </label>

                <button
                  onClick={() => handleSubmit(true)}
                  disabled={submitting}
                  className="submit-button"
                >
                  {submitting ? (
                    <span className="button-loading">
                      <div className="loading-spinner"></div>
                      שומר...
                    </span>
                  ) : (
                    'אישור הגעה'
                  )}
                </button>

                <button
                  onClick={() => setResponse(null)}
                  disabled={submitting}
                  className="back-button"
                >
                  חזרה
                </button>
              </div>
            )}

            {response === 'declined' && (
              <div className="declined-section">
                <p className="declined-message">
                  אנחנו מבינים, נשמח לראותכם בהזדמנות אחרת 💝
                </p>

                <button
                  onClick={() => handleSubmit(false)}
                  disabled={submitting}
                  className="submit-button decline-submit"
                >
                  {submitting ? (
                    <span className="button-loading">
                      <div className="loading-spinner"></div>
                      שומר...
                    </span>
                  ) : (
                    'אישור'
                  )}
                </button>

                <button
                  onClick={() => setResponse(null)}
                  disabled={submitting}
                  className="back-button"
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
      </div>
    </div>
  );
}
