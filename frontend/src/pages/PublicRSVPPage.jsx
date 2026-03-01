import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import './PublicRSVPPage.css';

const API_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:8000').replace(/\/api$/, '');

export default function PublicRSVPPage() {
  const { eventId } = useParams();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [event, setEvent] = useState(null);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  // Form fields
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [attendingCount, setAttendingCount] = useState(1);
  const [attendance, setAttendance] = useState(null); // 'confirmed' | 'declined'
  const [formError, setFormError] = useState('');

  useEffect(() => {
    const fetchEvent = async () => {
      try {
        setLoading(true);
        const res = await axios.get(`${API_BASE}/api/rsvp/event/${eventId}`);
        setEvent(res.data.event);
        setLoading(false);
      } catch (err) {
        setError(err.response?.data?.detail || 'האירוע לא נמצא או שהקישור אינו תקין');
        setLoading(false);
      }
    };
    if (eventId) fetchEvent();
  }, [eventId]);

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('he-IL', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const validatePhone = (p) => /^0[0-9]{8,9}$/.test(p.replace(/[-\s]/g, ''));

  const handleSubmit = async () => {
    setFormError('');
    if (!fullName.trim()) { setFormError('יש להזין שם מלא'); return; }
    if (!phone.trim()) { setFormError('יש להזין מספר טלפון'); return; }
    if (!validatePhone(phone)) { setFormError('מספר טלפון לא תקין (לדוגמה: 0521234567)'); return; }
    if (!attendance) { setFormError('יש לבחור אם תגיעו'); return; }
    if (attendance === 'confirmed' && attendingCount < 1) { setFormError('מספר המגיעים חייב להיות לפחות 1'); return; }

    try {
      setSubmitting(true);
      await axios.post(`${API_BASE}/api/rsvp/event/${eventId}/register`, {
        full_name: fullName.trim(),
        phone: phone.trim().replace(/[-\s]/g, ''),
        attending_count: attendance === 'confirmed' ? attendingCount : 0,
        status: attendance,
      });
      setSubmitted(true);
      setSubmitting(false);
    } catch (err) {
      setFormError(err.response?.data?.detail || 'שגיאה בשמירת הפרטים, נסה שנית');
      setSubmitting(false);
    }
  };

  // Loading
  if (loading) {
    return (
      <div className="pub-rsvp-page" dir="rtl">
        <div className="pub-rsvp-bg"><div className="pub-rsvp-pattern"></div></div>
        <div className="pub-rsvp-container">
          <div className="pub-loading-state">
            <div className="pub-spinner">
              <div className="pub-dot"></div>
              <div className="pub-dot"></div>
              <div className="pub-dot"></div>
            </div>
            <p>טוען את ההזמנה...</p>
          </div>
        </div>
      </div>
    );
  }

  // Error
  if (error) {
    return (
      <div className="pub-rsvp-page" dir="rtl">
        <div className="pub-rsvp-bg"><div className="pub-rsvp-pattern"></div></div>
        <div className="pub-rsvp-container">
          <div className="pub-state-box error">
            <div className="pub-state-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/>
                <line x1="15" y1="9" x2="9" y2="15"/>
                <line x1="9" y1="9" x2="15" y2="15"/>
              </svg>
            </div>
            <h2>אופס!</h2>
            <p>{error}</p>
            <a href="/"><button className="pub-btn-secondary">חזרה לדף הבית</button></a>
          </div>
        </div>
      </div>
    );
  }

  // Success
  if (submitted) {
    return (
      <div className="pub-rsvp-page" dir="rtl">
        <div className="pub-rsvp-bg"><div className="pub-rsvp-pattern"></div></div>
        <div className="pub-rsvp-container">
          {attendance === 'confirmed' ? (
            <div className="pub-state-box success">
              <div className="pub-state-icon success">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M20 6L9 17l-5-5"/>
                </svg>
              </div>
              <h2>תודה רבה!</h2>
              <p>פרטיך נרשמו בהצלחה</p>
              <div className="pub-count-badge">
                <span className="pub-count-num">{attendingCount}</span>
                <span className="pub-count-label">{attendingCount === 1 ? 'מגיע' : 'מגיעים'}</span>
              </div>
              <div className="pub-event-summary">
                <h3>{event?.event_name}</h3>
                {event?.event_date && <p>{formatDate(event.event_date)}</p>}
                {event?.event_time && <p>{event.event_time}</p>}
                {event?.event_location && <p>{event.event_location}</p>}
              </div>
              <p className="pub-farewell">נשמח לראותך!</p>
            </div>
          ) : (
            <div className="pub-state-box declined">
              <div className="pub-state-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="15" y1="9" x2="9" y2="15"/>
                  <line x1="9" y1="9" x2="15" y2="15"/>
                </svg>
              </div>
              <h2>תודה על העדכון</h2>
              <p>נשמח לראותך בהזדמנות אחרת!</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Main form
  return (
    <div className="pub-rsvp-page" dir="rtl">
      <div className="pub-rsvp-bg"><div className="pub-rsvp-pattern"></div></div>

      <div className="pub-rsvp-container">
        {/* Invitation image */}
        {event?.invitation_image_url && (
          <div className="pub-invitation-section">
            <div className={`pub-invitation-wrapper ${imageLoaded ? 'loaded' : ''}`}>
              <img
                src={event.invitation_image_url}
                alt="הזמנה לאירוע"
                className="pub-invitation-img"
                onLoad={() => setImageLoaded(true)}
                onError={(e) => { e.target.style.display = 'none'; }}
              />
              {!imageLoaded && (
                <div className="pub-img-placeholder">
                  <div className="pub-spinner small">
                    <div className="pub-dot"></div>
                    <div className="pub-dot"></div>
                    <div className="pub-dot"></div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Header */}
        <div className="pub-header">
          <div className="pub-ornament">
            <svg viewBox="0 0 100 20" className="pub-ornament-svg">
              <path d="M0,10 Q25,0 50,10 T100,10" fill="none" stroke="currentColor" strokeWidth="1"/>
            </svg>
          </div>
          <h1>הנכם מוזמנים</h1>
          <h2>{event?.event_name}</h2>
          <div className="pub-ornament bottom">
            <svg viewBox="0 0 100 20" className="pub-ornament-svg">
              <path d="M0,10 Q25,20 50,10 T100,10" fill="none" stroke="currentColor" strokeWidth="1"/>
            </svg>
          </div>
        </div>

        {/* Event details */}
        <div className="pub-event-details">
          {event?.event_date && (
            <div className="pub-detail-card">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <rect x="3" y="4" width="18" height="18" rx="2"/>
                <line x1="16" y1="2" x2="16" y2="6"/>
                <line x1="8" y1="2" x2="8" y2="6"/>
                <line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
              <span>{formatDate(event.event_date)}</span>
            </div>
          )}
          {event?.event_time && (
            <div className="pub-detail-card">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="12" cy="12" r="10"/>
                <polyline points="12 6 12 12 16 14"/>
              </svg>
              <span>{event.event_time}</span>
            </div>
          )}
          {event?.event_location && (
            <div className="pub-detail-card">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                <circle cx="12" cy="10" r="3"/>
              </svg>
              <span>{event.event_location}</span>
            </div>
          )}
        </div>

        {/* Custom invitation text */}
        {event?.rsvp_custom_text && (
          <div className="pub-custom-text">
            {event.rsvp_custom_text.split('\n').map((line, i) => (
              <p key={i}>{line}</p>
            ))}
          </div>
        )}

        {/* Registration form */}
        <div className="pub-form-section">
          <h3>אישור הגעה</h3>

          <div className="pub-form-field">
            <label>שם מלא <span className="pub-req">*</span></label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => { setFullName(e.target.value); setFormError(''); }}
              placeholder="הזן שם מלא"
              className="pub-input"
            />
          </div>

          <div className="pub-form-field">
            <label>טלפון נייד <span className="pub-req">*</span></label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => { setPhone(e.target.value); setFormError(''); }}
              placeholder="לדוגמה: 0521234567"
              className="pub-input"
              dir="ltr"
            />
          </div>

          {/* Attendance choice */}
          <div className="pub-form-field">
            <label>האם תגיעו? <span className="pub-req">*</span></label>
            <div className="pub-attendance-btns">
              <button
                className={`pub-att-btn confirm ${attendance === 'confirmed' ? 'selected' : ''}`}
                onClick={() => { setAttendance('confirmed'); setFormError(''); }}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M20 6L9 17l-5-5"/>
                </svg>
                כן, נגיע!
              </button>
              <button
                className={`pub-att-btn decline ${attendance === 'declined' ? 'selected' : ''}`}
                onClick={() => { setAttendance('declined'); setFormError(''); }}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
                לא נוכל
              </button>
            </div>
          </div>

          {/* Counter - only when confirmed */}
          {attendance === 'confirmed' && (
            <div className="pub-form-field">
              <label>כמה מגיעים?</label>
              <div className="pub-counter">
                <button
                  className="pub-counter-btn"
                  onClick={() => setAttendingCount(Math.max(1, attendingCount - 1))}
                  disabled={attendingCount <= 1}
                >
                  <span className="pub-counter-sign">−</span>
                </button>
                <div className="pub-counter-display">
                  <span>{attendingCount}</span>
                </div>
                <button
                  className="pub-counter-btn"
                  onClick={() => setAttendingCount(attendingCount + 1)}
                >
                  <span className="pub-counter-sign">+</span>
                </button>
              </div>
            </div>
          )}

          {formError && (
            <div className="pub-form-error">{formError}</div>
          )}

          <button
            className="pub-submit-btn"
            onClick={handleSubmit}
            disabled={submitting || !attendance}
          >
            {submitting ? (
              <span className="pub-btn-loading">
                <div className="pub-spinner-small"></div>
                שומר...
              </span>
            ) : (
              'שליחת אישור'
            )}
          </button>
        </div>

        <div className="pub-footer">
          <span>Save The Day</span>
        </div>
      </div>
    </div>
  );
}
