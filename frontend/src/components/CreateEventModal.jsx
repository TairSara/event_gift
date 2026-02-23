import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./CreateEventModal.css";

export default function CreateEventModal({ isOpen, onClose, userPackages, userId }) {
  const navigate = useNavigate();
  const [selectedEventType, setSelectedEventType] = useState("");
  const [selectedPackage, setSelectedPackage] = useState("");
  const [eventTitle, setEventTitle] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [scheduleError, setScheduleError] = useState("");

  // מצב לתזמון הודעות
  const [messageScheduleType, setMessageScheduleType] = useState("default"); // "default" או "custom"
  const [customSchedule, setCustomSchedule] = useState({
    message1: 21, // ימים לפני האירוע (3 שבועות)
    message2: 14, // ימים לפני האירוע (שבועיים)
    message3: 7   // ימים לפני האירוע (שבוע)
  });

  // חישוב ימים עד האירוע
  const getDaysUntilEvent = () => {
    if (!eventDate) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const event = new Date(eventDate);
    event.setHours(0, 0, 0, 0);
    const diff = Math.floor((event - today) / (1000 * 60 * 60 * 24));
    return diff;
  };

  const daysUntilEvent = getDaysUntilEvent();
  const isEventSoon = daysUntilEvent !== null && daysUntilEvent < 21;

  if (!isOpen) return null;

  const availablePackages = userPackages.filter(pkg => pkg.status === 'active');

  // בדיקה האם החבילה שנבחרה היא החבילה המלאה (package_id = 4)
  const isPremiumPackage = () => {
    if (!selectedPackage) return false;
    const pkg = availablePackages.find(p => p.id === parseInt(selectedPackage));
    return pkg && pkg.package_id === 4;
  };

  const eventTypes = [
    { value: "wedding", label: "חתונה", icon: "fa-ring", image: "/images/A.webp" },
    { value: "hina", label: "חינה", icon: "fa-hand-holding-heart", image: "/images/B.webp" },
    { value: "brit", label: "ברית", icon: "fa-baby", image: "/images/C.webp" },
    { value: "brita", label: "זבד הבת", icon: "fa-baby-carriage", image: "/images/D.webp" },
    { value: "bat-mitzvah", label: "בת מצווה", icon: "fa-star", image: "/images/F.webp" },
    { value: "bar-mitzvah", label: "בר מצווה", icon: "fa-star-of-david", image: "/images/G.webp" },
    { value: "birthday", label: "יום הולדת", icon: "fa-birthday-cake", image: "/images/H.webp" },
    { value: "knasim", label: "כנסים ואירועי חברה", icon: "fa-building", image: "/images/I.webp" }
  ];

  // ולידציה של תזמון הודעות ביחס לתאריך האירוע
  const validateScheduleAgainstDate = () => {
    if (!eventDate) return true; // אם אין תאריך, לא בודקים
    const days = getDaysUntilEvent();
    if (days === null) return true;

    if (messageScheduleType === 'default') {
      // ברירת מחדל: 21, 14, 7 ימים - כל אחד חייב להיות < days
      if (days < 7) {
        setScheduleError("האירוע קרוב מדי (פחות משבוע). לא ניתן לתזמן הודעות.");
        return false;
      }
      if (days < 21) {
        // זה כבר טופל - אם הגענו לכאן עם default ו-days<21 זה שגיאה
        setScheduleError("תזמון ברירת המחדל (21 ימים) לא מתאים לתאריך שבחרת. יש לבחור תזמון מותאם אישית.");
        return false;
      }
      return true;
    }

    // custom
    const daysBefore = [customSchedule.message1, customSchedule.message2, customSchedule.message3]
      .map(Number)
      .sort((a, b) => b - a);

    for (const d of daysBefore) {
      if (d >= days) {
        setScheduleError(`הודעה המתוזמנת ${d} ימים לפני האירוע לא מתאפשרת - האירוע הוא רק בעוד ${days} ימים. יש להוריד את מספר הימים.`);
        return false;
      }
    }
    setScheduleError("");
    return true;
  };

  const handleCreateEvent = async () => {
    if (!selectedEventType || !eventTitle) {
      alert("יש למלא את כל השדות");
      return;
    }

    if (!eventDate) {
      alert("יש לבחור תאריך לאירוע");
      return;
    }

    // וידוא שהתאריך הוא בעתיד
    const daysLeft = getDaysUntilEvent();
    if (daysLeft !== null && daysLeft < 0) {
      alert("תאריך האירוע חייב להיות בעתיד");
      return;
    }

    if (userPackages.length > 0 && !selectedPackage) {
      alert("יש לבחור חבילה");
      return;
    }

    // ולידציית תזמון ביחס לתאריך
    if (!validateScheduleAgainstDate()) {
      return;
    }

    setLoading(true);

    try {
      const API_URL = import.meta.env.VITE_API_URL || 'https://event-gift.onrender.com/api';

      // יצירת אירוע
      const response = await fetch(`${API_URL}/packages/events`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: userId,
          package_purchase_id: selectedPackage ? parseInt(selectedPackage) : null,
          event_type: selectedEventType,
          event_title: eventTitle,
          event_date: eventDate,
          status: 'pending',
          message_schedule: {
            schedule_type: messageScheduleType,
            days_before: messageScheduleType === 'default'
              ? [21, 14, 7]
              : [customSchedule.message1, customSchedule.message2, customSchedule.message3].sort((a, b) => b - a)
          }
        })
      });

      const data = await response.json();

      if (response.ok) {
        // עדכון סטטוס החבילה ל-used
        if (selectedPackage) {
          await fetch(`${API_URL}/packages/purchases/${selectedPackage}/use`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            }
          });
        }

        // מעבר ליצירת הזמנה עם event_id
        onClose();
        navigate(`/create-invitation/${selectedEventType}?event_id=${data.id}`);
      } else {
        alert(data.detail || 'שגיאה ביצירת האירוע');
        setLoading(false);
      }
    } catch (error) {
      console.error('Error creating event:', error);
      alert('שגיאה בתקשורת עם השרת');
      setLoading(false);
    }
  };

  return (
    <div className="create-event-modal-overlay" onClick={onClose}>
      <div className="create-event-modal" onClick={(e) => e.stopPropagation()}>
        <h2 className="create-event-modal-title">
          <i className="fas fa-plus-circle"></i>
          צור אירוע חדש
        </h2>

        <div className="create-event-modal-body">
          {/* שם האירוע */}
          <div className="form-group">
            <label>
              <i className="fas fa-heading"></i>
              שם האירוע
            </label>
            <input
              type="text"
              placeholder="לדוגמה: חתונת שרה ודוד"
              value={eventTitle}
              onChange={(e) => setEventTitle(e.target.value)}
              className="form-input"
            />
          </div>

          {/* תאריך האירוע - חובה */}
          <div className="form-group">
            <label>
              <i className="fas fa-calendar-day"></i>
              תאריך האירוע <span className="field-required">*</span>
            </label>
            <input
              type="date"
              value={eventDate}
              min={new Date().toISOString().split('T')[0]}
              onChange={(e) => {
                setEventDate(e.target.value);
                setScheduleError("");
                // אם האירוע פחות מ-21 ימים ובחרו ברירת מחדל - מחזירים לcustom
                if (e.target.value) {
                  const today = new Date();
                  today.setHours(0, 0, 0, 0);
                  const ev = new Date(e.target.value);
                  ev.setHours(0, 0, 0, 0);
                  const diff = Math.floor((ev - today) / (1000 * 60 * 60 * 24));
                  if (diff < 21 && messageScheduleType === 'default') {
                    setMessageScheduleType('custom');
                  }
                }
              }}
              className="form-input event-date-input"
            />
            {eventDate && daysUntilEvent !== null && (
              <div className={`date-status-badge ${daysUntilEvent < 7 ? 'urgent' : daysUntilEvent < 21 ? 'warning' : 'ok'}`}>
                <i className={`fas ${daysUntilEvent < 7 ? 'fa-exclamation-circle' : daysUntilEvent < 21 ? 'fa-exclamation-triangle' : 'fa-check-circle'}`}></i>
                {daysUntilEvent < 0
                  ? "תאריך האירוע עבר"
                  : daysUntilEvent === 0
                  ? "האירוע היום!"
                  : `${daysUntilEvent} ימים עד האירוע`}
                {isEventSoon && daysUntilEvent >= 0 && (
                  <span> · תזמון ברירת מחדל אינו זמין</span>
                )}
              </div>
            )}
          </div>

          {/* סוג האירוע */}
          <div className="form-group">
            <label>
              <i className="fas fa-calendar-alt"></i>
              סוג האירוע
            </label>
            <div className="modal-event-types-grid">
              {eventTypes.map((type) => (
                <div
                  key={type.value}
                  className={`modal-event-card ${selectedEventType === type.value ? 'modal-event-card-selected' : ''}`}
                  onClick={() => setSelectedEventType(type.value)}
                >
                  <i className={`fas ${type.icon}`}></i>
                  <span>{type.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* בחירת חבילה */}
          {availablePackages.length > 0 && (
            <div className="form-group">
              <label>
                <i className="fas fa-box-open"></i>
                בחר חבילה
              </label>
              <select
                value={selectedPackage}
                onChange={(e) => setSelectedPackage(e.target.value)}
                className="form-select"
              >
                <option value="">בחר חבילה...</option>
                {availablePackages.map((pkg) => {
                  const details = [pkg.package_name];
                  if (pkg.guest_count) details.push(pkg.guest_count);
                  if (pkg.payment_amount) details.push(`₪${pkg.payment_amount}`);
                  return (
                    <option key={pkg.id} value={pkg.id}>
                      {details.join(' | ')} - נרכש ב-{new Date(pkg.purchased_at).toLocaleDateString('he-IL')}
                    </option>
                  );
                })}
              </select>

              {/* הצגת החבילה שנבחרה */}
              {selectedPackage && (() => {
                const pkg = availablePackages.find(p => p.id === parseInt(selectedPackage));
                if (!pkg) return null;
                return (
                  <div className="selected-package-display">
                    <i className="fas fa-check-circle"></i>
                    <div>
                      <span>החבילה שנבחרה: {pkg.package_name}</span>
                      {pkg.guest_count && <span style={{ marginRight: '0.5rem', opacity: 0.8 }}>({pkg.guest_count})</span>}
                      {pkg.payment_amount && <span style={{ marginRight: '0.5rem', fontWeight: 700 }}>₪{pkg.payment_amount}</span>}
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {/* בחירת תזמון הודעות - מופיע רק אחרי בחירת חבילה */}
          {selectedPackage && (
            <div className="form-group message-schedule-section">
              <label>
                <i className="fas fa-clock"></i>
                תזמון שליחת הודעות
              </label>

              {isEventSoon && daysUntilEvent >= 0 && (
                <div className="schedule-soon-warning">
                  <i className="fas fa-exclamation-triangle"></i>
                  <span>האירוע פחות מ-21 ימים מהיום – תזמון ברירת המחדל אינו זמין. יש לבחור תזמון מותאם אישית.</span>
                </div>
              )}

              <div className="schedule-type-selector">
                <div
                  className={`schedule-type-option ${messageScheduleType === 'default' ? 'selected' : ''} ${isEventSoon && daysUntilEvent >= 0 ? 'disabled' : ''}`}
                  onClick={() => {
                    if (isEventSoon && daysUntilEvent >= 0) return;
                    setMessageScheduleType('default');
                    setScheduleError("");
                  }}
                >
                  <i className="fas fa-magic"></i>
                  <div className="schedule-type-content">
                    <strong>ברירת מחדל {!isEventSoon && '(מומלץ)'}</strong>
                    <p>הודעות יישלחו 3 שבועות, שבועיים ושבוע לפני האירוע</p>
                  </div>
                  {isEventSoon && daysUntilEvent >= 0 && <i className="fas fa-lock lock-icon"></i>}
                  {messageScheduleType === 'default' && (!isEventSoon || daysUntilEvent < 0) && <i className="fas fa-check-circle check-icon"></i>}
                </div>

                <div
                  className={`schedule-type-option ${messageScheduleType === 'custom' ? 'selected' : ''}`}
                  onClick={() => { setMessageScheduleType('custom'); setScheduleError(""); }}
                >
                  <i className="fas fa-sliders-h"></i>
                  <div className="schedule-type-content">
                    <strong>התאמה אישית {isEventSoon && daysUntilEvent >= 0 && '(נדרש)'}</strong>
                    <p>בחר בעצמך מתי לשלוח כל הודעה</p>
                  </div>
                  {messageScheduleType === 'custom' && <i className="fas fa-check-circle check-icon"></i>}
                </div>
              </div>

              {/* הצגת שגיאת תזמון */}
              {scheduleError && (
                <div className="schedule-error-box">
                  <i className="fas fa-times-circle"></i>
                  <span>{scheduleError}</span>
                </div>
              )}

              {/* הגדרות מותאמות אישית */}
              {messageScheduleType === 'custom' && (
                <div className="custom-schedule-settings">
                  <div className="schedule-info-box">
                    <i className="fas fa-info-circle"></i>
                    <span>
                      {eventDate && daysUntilEvent !== null
                        ? `הגדר כמה ימים לפני האירוע לשלוח כל הודעה (האירוע בעוד ${daysUntilEvent} ימים)`
                        : 'ההודעה הראשונה עד חודש לפני האירוע, האחרונה לפחות שבוע לפני'}
                    </span>
                  </div>

                  <div className="custom-schedule-grid">
                    {[
                      { key: 'message1', label: 'הודעה ראשונה', defaultVal: 21 },
                      { key: 'message2', label: 'הודעה שנייה', defaultVal: 14 },
                      { key: 'message3', label: 'הודעה שלישית', defaultVal: 7 },
                    ].map(({ key, label, defaultVal }) => {
                      // max דינמי: לא יותר מ-(daysUntilEvent - 1) ולא יותר מ-30
                      const maxDays = daysUntilEvent !== null && daysUntilEvent > 0
                        ? Math.min(30, daysUntilEvent - 1)
                        : 30;
                      const isOver = daysUntilEvent !== null && daysUntilEvent > 0 && customSchedule[key] >= daysUntilEvent;
                      return (
                        <div className="schedule-item" key={key}>
                          <label>{label}</label>
                          <div className={`schedule-input-wrapper ${isOver ? 'input-error' : ''}`}>
                            <input
                              type="number"
                              min="1"
                              max={maxDays}
                              value={customSchedule[key]}
                              onChange={(e) => {
                                const raw = e.target.value;
                                if (raw === '') {
                                  setCustomSchedule({ ...customSchedule, [key]: '' });
                                  setScheduleError("");
                                  return;
                                }
                                const val = parseInt(raw);
                                if (!isNaN(val)) {
                                  setCustomSchedule({ ...customSchedule, [key]: val });
                                  setScheduleError("");
                                }
                              }}
                              onBlur={(e) => {
                                const val = parseInt(e.target.value);
                                const clamped = isNaN(val) ? defaultVal : Math.min(maxDays, Math.max(1, val));
                                setCustomSchedule({ ...customSchedule, [key]: clamped });
                              }}
                            />
                            <span>ימים לפני</span>
                          </div>
                          {isOver && (
                            <span className="field-error-hint">חייב להיות פחות מ-{daysUntilEvent} ימים</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}


          {availablePackages.length === 0 && (
            <div className="no-packages-warning">
              <i className="fas fa-exclamation-triangle"></i>
              <p>אין לך חבילות פעילות. תוכל לשייך חבילה לאירוע מאוחר יותר.</p>
            </div>
          )}
        </div>

        <div className="create-event-modal-footer">
          <button
            className="btn-create"
            onClick={handleCreateEvent}
            disabled={loading}
          >
            {loading ? (
              <>
                <i className="fas fa-spinner fa-spin"></i>
                יוצר אירוע...
              </>
            ) : (
              <>
                <i className="fas fa-check"></i>
                המשך ליצירת הזמנה
              </>
            )}
          </button>
          <button className="btn-cancel" onClick={onClose}>
            ביטול
          </button>
        </div>
      </div>

      {/* Upgrade Modal */}
      {showUpgradeModal && (
        <div className="upgrade-modal-overlay" onClick={() => setShowUpgradeModal(false)}>
          <div className="upgrade-modal" onClick={(e) => e.stopPropagation()}>
            <button className="upgrade-modal-close" onClick={() => setShowUpgradeModal(false)}>
              <i className="fas fa-times"></i>
            </button>

            <div className="upgrade-modal-header">
              <i className="fas fa-crown"></i>
              <h2>שדרג לחבילה המלאה</h2>
              <p>קבל את כל היתרונות ללא הגבלה!</p>
            </div>

            <div className="upgrade-modal-body">
              <div className="upgrade-features">
                <div className="upgrade-feature">
                  <i className="fab fa-whatsapp"></i>
                  <span>שליחת הזמנות אוטומטית ב־WhatsApp - 3 סבבים</span>
                </div>
                <div className="upgrade-feature">
                  <i className="fas fa-phone"></i>
                  <span>מוקד אנושי עם שלוש סבבי שיחות טלפוניות</span>
                </div>
                <div className="upgrade-feature">
                  <i className="fas fa-heart"></i>
                  <span>הודעות תודה מעוצבות</span>
                </div>
                <div className="upgrade-feature">
                  <i className="fas fa-chart-line"></i>
                  <span>סטטוס אישורים בזמן אמת</span>
                </div>
                <div className="upgrade-feature">
                  <i className="fas fa-star"></i>
                  <span>תמיכה VIP 24/7</span>
                </div>
              </div>

              <div className="upgrade-price">
                <span className="upgrade-price-label">מחיר החבילה:</span>
                <span className="upgrade-price-value">250 ₪</span>
                <span className="upgrade-price-note">תשלום חד פעמי</span>
              </div>
            </div>

            <div className="upgrade-modal-footer">
              <button className="btn-upgrade-now" onClick={() => navigate('/pricing')}>
                <i className="fas fa-rocket"></i>
                שדרג עכשיו
              </button>
              <button className="btn-upgrade-cancel" onClick={() => setShowUpgradeModal(false)}>
                אולי מאוחר יותר
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
