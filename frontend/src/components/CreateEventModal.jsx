import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./CreateEventModal.css";

export default function CreateEventModal({ isOpen, onClose, userPackages, userId }) {
  const navigate = useNavigate();
  const [selectedEventType, setSelectedEventType] = useState("");
  const [selectedPackage, setSelectedPackage] = useState("");
  const [eventTitle, setEventTitle] = useState("");
  const [loading, setLoading] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

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
    { value: "knasim", label: "כנסים ואירועי חברה", icon: "fa-building", image: "/images/I.webp" },
    { value: "other", label: "אירועים נוספים", icon: "fa-calendar", image: "/images/M.webp" }
  ];

  const handleCreateEvent = async () => {
    if (!selectedEventType || !eventTitle) {
      alert("יש למלא את כל השדות");
      return;
    }

    if (userPackages.length > 0 && !selectedPackage) {
      alert("יש לבחור חבילה");
      return;
    }

    setLoading(true);

    try {
      // יצירת אירוע
      const response = await fetch('http://localhost:8001/api/packages/events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: userId,
          package_purchase_id: selectedPackage ? parseInt(selectedPackage) : null,
          event_type: selectedEventType,
          event_title: eventTitle,
          status: 'pending'
        })
      });

      const data = await response.json();

      if (response.ok) {
        // עדכון סטטוס החבילה ל-used
        if (selectedPackage) {
          await fetch(`http://localhost:8001/api/packages/purchases/${selectedPackage}/use`, {
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
        <button className="modal-close-btn" onClick={onClose}>
          <i className="fas fa-times"></i>
        </button>

        <h2 className="modal-title">
          <i className="fas fa-plus-circle"></i>
          צור אירוע חדש
        </h2>

        <div className="modal-content">
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
                  style={{
                    cursor: 'pointer',
                    backgroundImage: `url(${type.image})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    backgroundRepeat: 'no-repeat',
                    position: 'relative',
                    borderRadius: '12px',
                    border: selectedEventType === type.value ? '4px solid var(--turquoise)' : '3px solid white',
                    boxShadow: selectedEventType === type.value ? '0 8px 24px rgba(78, 205, 196, 0.5)' : '0 4px 16px rgba(139, 111, 71, 0.2)',
                    transition: 'all 0.3s ease',
                    overflow: 'hidden',
                    display: 'flex',
                    alignItems: 'flex-end'
                  }}
                  onMouseEnter={(e) => {
                    if (selectedEventType !== type.value) {
                      e.currentTarget.style.transform = 'translateY(-8px)';
                      e.currentTarget.style.boxShadow = '0 8px 24px rgba(139, 111, 71, 0.3)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (selectedEventType !== type.value) {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = '0 4px 16px rgba(139, 111, 71, 0.2)';
                    }
                  }}
                >
                  {Array.from({ length: 15 }).map((_, i) => (
                    <div
                      key={i}
                      className="modal-event-card-confetti"
                      style={{
                        position: 'absolute',
                        top: '-10px',
                        left: `${Math.random() * 100}%`,
                        width: '7px',
                        height: '7px',
                        opacity: 0,
                        zIndex: 2,
                        pointerEvents: 'none',
                        animationDelay: `${Math.random() * 2}s`,
                        backgroundColor: ['#4ECDC4', '#A3B18A', '#D5A6BD', '#C9A887', '#6B5638'][Math.floor(Math.random() * 5)]
                      }}
                    />
                  ))}
                  <h3 style={{
                    width: '100%',
                    margin: 0,
                    background: 'rgba(255, 255, 255, 0.95)',
                    padding: '0.6rem 0.5rem',
                    textAlign: 'center',
                    color: 'var(--brown-dark)',
                    fontSize: '1rem',
                    fontWeight: 'bold',
                    zIndex: 3,
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0
                  }}>{type.label}</h3>
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
                {availablePackages.map((pkg) => (
                  <option key={pkg.id} value={pkg.id}>
                    {pkg.package_name} - נרכש ב-{new Date(pkg.purchased_at).toLocaleDateString('he-IL')}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* הצעת שדרוג */}
          {selectedPackage && !isPremiumPackage() && (
            <div className="upgrade-suggestion">
              <i className="fas fa-star"></i>
              <div className="upgrade-text">
                <strong>רוצה עוד יתרונות?</strong>
                <p>שדרגי לחבילה המלאה ותקבלי גישה בלתי מוגבלת עם כל הפיצ'רים!</p>
              </div>
              <button
                type="button"
                className="btn-upgrade"
                onClick={() => setShowUpgradeModal(true)}
              >
                <i className="fas fa-arrow-up"></i>
                שדרג חבילה
              </button>
            </div>
          )}

          {availablePackages.length === 0 && (
            <div className="no-packages-warning">
              <i className="fas fa-exclamation-triangle"></i>
              <p>אין לך חבילות פעילות. תוכל לשייך חבילה לאירוע מאוחר יותר.</p>
            </div>
          )}
        </div>

        <div className="modal-footer">
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
                  <i className="fas fa-infinity"></i>
                  <span>ללא הגבלת אורחים</span>
                </div>
                <div className="upgrade-feature">
                  <i className="fas fa-phone"></i>
                  <span>שלושה סבבי שיחות טלפוניות</span>
                </div>
                <div className="upgrade-feature">
                  <i className="fas fa-credit-card"></i>
                  <span>מערכת מתנות פרימיום באשראי</span>
                </div>
                <div className="upgrade-feature">
                  <i className="fas fa-heart"></i>
                  <span>הודעות תודה מעוצבות</span>
                </div>
                <div className="upgrade-feature">
                  <i className="fas fa-table"></i>
                  <span>שיבוץ שולחנות חכם</span>
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
