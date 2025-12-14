import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useNotification } from "../hooks/useNotification";
import Navbar from "../components/Navbar";
import CreateEventModal from "../components/CreateEventModal";
import "./Dashboard.css";

export default function Dashboard() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const { showSuccess, showInfo, NotificationComponent } = useNotification();

  const [purchases, setPurchases] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateEventModal, setShowCreateEventModal] = useState(false);
  const [showActivatePackageModal, setShowActivatePackageModal] = useState(false);
  const [selectedPackageForActivation, setSelectedPackageForActivation] = useState(null);

  // טעינת נתונים בעת טעינת הדף
  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    fetchUserData();
  }, [user]);

  // בדיקה אם יש query parameter להפעלת חבילה
  useEffect(() => {
    const activatePackageId = searchParams.get('activatePackage');
    if (activatePackageId && !loading) {
      const packageData = localStorage.getItem('selectedPackage');
      if (packageData) {
        try {
          const parsed = JSON.parse(packageData);
          setSelectedPackageForActivation(parsed);
          setShowActivatePackageModal(true);
          // הסרת query parameter מה-URL
          searchParams.delete('activatePackage');
          setSearchParams(searchParams);
        } catch (err) {
          console.error('Error parsing package:', err);
        }
      }
    }
  }, [searchParams, loading]);

  const fetchUserData = async () => {
    try {
      setLoading(true);

      // טעינת רכישות
      const purchasesResponse = await fetch(
        `http://localhost:8001/api/packages/user/${user.id}/purchases`
      );
      const purchasesData = await purchasesResponse.json();
      setPurchases(purchasesData.purchases || []);

      // טעינת אירועים
      const eventsResponse = await fetch(
        `http://localhost:8001/api/packages/events/user/${user.id}`
      );
      const eventsData = await eventsResponse.json();
      setEvents(eventsData.events || []);

      setLoading(false);
    } catch (error) {
      console.error('Error fetching user data:', error);
      showInfo('שגיאה בטעינת הנתונים');
      setLoading(false);
    }
  };

  const handleActivateSelectedPackage = () => {
    // ניווט לעמוד המחירים עם החבילה המסומנת
    if (selectedPackageForActivation) {
      navigate('/pricing', { state: { selectedPackageId: selectedPackageForActivation.packageId } });
      localStorage.removeItem('selectedPackage'); // ניקוי localStorage
      setShowActivatePackageModal(false);
    }
  };

  const handleCancelActivation = () => {
    localStorage.removeItem('selectedPackage');
    setShowActivatePackageModal(false);
    setSelectedPackageForActivation(null);
  };

  const handleAssignPackageToEvent = async (eventId, packagePurchaseId) => {
    try {
      const response = await fetch(
        `http://localhost:8001/api/packages/events/${eventId}/assign-package/${packagePurchaseId}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          }
        }
      );

      if (response.ok) {
        showSuccess('החבילה שוייכה לאירוע בהצלחה!');
        fetchUserData(); // רענון נתונים
      } else {
        showInfo('שגיאה בשיוך החבילה');
      }
    } catch (error) {
      console.error('Error assigning package:', error);
      showInfo('שגיאה בתקשורת עם השרת');
    }
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      pending: { text: 'ממתין', color: 'warning' },
      active: { text: 'פעיל', color: 'success' },
      scheduled: { text: 'מתוזמן', color: 'info' },
      completed: { text: 'הסתיים', color: 'secondary' }
    };

    const statusInfo = statusMap[status] || statusMap.pending;
    return (
      <span className={`status-badge status-${statusInfo.color}`}>
        {statusInfo.text}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="dashboard-page">
        {NotificationComponent}
        <Navbar />
        <div className="dashboard-loading">
          <div className="spinner"></div>
          <p>טוען נתונים...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-page">
      {NotificationComponent}
      <Navbar />

      <CreateEventModal
        isOpen={showCreateEventModal}
        onClose={() => {
          setShowCreateEventModal(false);
          fetchUserData(); // רענון נתונים
        }}
        userPackages={purchases}
        userId={user?.id}
      />

      <section className="dashboard-hero">
        <div className="dashboard-hero-content">
          <h1>שלום, {user?.full_name || user?.email}!</h1>
          <p>ברוכים הבאים לדף הניהול האישי שלכם</p>
        </div>
      </section>

      <section className="dashboard-content">
        <div className="dashboard-container">

          {/* החבילות שלי */}
          <div className="dashboard-section">
            <div className="section-header">
              <h2>
                <i className="fas fa-box-open"></i>
                החבילות שלי
              </h2>
              <button
                className="btn-primary-small"
                onClick={() => navigate('/pricing')}
              >
                <i className="fas fa-plus"></i>
                רכוש חבילה נוספת
              </button>
            </div>

            {purchases.length === 0 ? (
              <div className="empty-state">
                <i className="fas fa-shopping-cart"></i>
                <h3>טרם נרכשה חבילה</h3>
                <p>התחל ברכישת חבילה כדי ליצור אירועים מדהימים</p>
                <button
                  className="btn-primary"
                  onClick={() => navigate('/pricing')}
                >
                  לרכישת חבילה
                </button>
              </div>
            ) : (
              <div className="packages-grid">
                {purchases.map((purchase) => (
                  <div key={purchase.id} className="package-item">
                    <div className="package-item-header">
                      <h3>{purchase.package_name}</h3>
                      <span className="purchase-date">
                        נרכש ב-{new Date(purchase.purchased_at).toLocaleDateString('he-IL')}
                      </span>
                    </div>
                    <div className="package-item-status">
                      {getStatusBadge(purchase.status)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* האירועים שלי */}
          <div className="dashboard-section">
            <div className="section-header">
              <h2>
                <i className="fas fa-calendar-alt"></i>
                האירועים שלי
              </h2>
              <button
                className="btn-primary-small"
                onClick={() => setShowCreateEventModal(true)}
              >
                <i className="fas fa-plus"></i>
                צור אירוע חדש
              </button>
            </div>

            {events.length === 0 ? (
              <div className="empty-state">
                <i className="fas fa-calendar-times"></i>
                <h3>אין אירועים</h3>
                <p>צור את האירוע הראשון שלך והתחל לשלוח הזמנות</p>
                <button
                  className="btn-primary"
                  onClick={() => setShowCreateEventModal(true)}
                >
                  צור אירוע
                </button>
              </div>
            ) : (
              <div className="events-list">
                {events.map((event) => (
                  <div
                    key={event.id}
                    className="event-card-dashboard"
                    onClick={() => navigate(`/event/${event.id}`)}
                    style={{ cursor: 'pointer' }}
                  >
                    <div className="event-card-header">
                      <div className="event-info">
                        <h3>{event.event_title}</h3>
                        <p className="event-type">{event.event_type}</p>
                        {event.event_date && (
                          <p className="event-date">
                            <i className="fas fa-calendar"></i>
                            {new Date(event.event_date).toLocaleDateString('he-IL', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                        )}
                        {event.event_location && (
                          <p className="event-location">
                            <i className="fas fa-map-marker-alt"></i>
                            {event.event_location}
                          </p>
                        )}
                      </div>
                      <div className="event-status">
                        {getStatusBadge(event.status)}
                      </div>
                    </div>

                    <div className="event-statistics">
                      <h4>סטטיסטיקה</h4>
                      <div className="stats-grid">
                        <div className="stat-item">
                          <i className="fas fa-users"></i>
                          <div className="stat-info">
                            <span className="stat-value">{event.statistics.total_guests}</span>
                            <span className="stat-label">מוזמנים</span>
                          </div>
                        </div>
                        <div className="stat-item">
                          <i className="fas fa-check-circle"></i>
                          <div className="stat-info">
                            <span className="stat-value">{event.statistics.confirmed_guests}</span>
                            <span className="stat-label">אישרו הגעה</span>
                          </div>
                        </div>
                        <div className="stat-item">
                          <i className="fas fa-percentage"></i>
                          <div className="stat-info">
                            <span className="stat-value">{event.statistics.confirmation_rate}%</span>
                            <span className="stat-label">אחוז אישורים</span>
                          </div>
                        </div>
                        <div className="stat-item">
                          <i className="fas fa-gift"></i>
                          <div className="stat-info">
                            <span className="stat-value">{event.statistics.total_gifts}</span>
                            <span className="stat-label">מתנות</span>
                          </div>
                        </div>
                        <div className="stat-item">
                          <i className="fas fa-shekel-sign"></i>
                          <div className="stat-info">
                            <span className="stat-value">
                              {event.statistics.total_gift_amount.toLocaleString('he-IL')}₪
                            </span>
                            <span className="stat-label">סכום מתנות</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {!event.package_purchase_id && purchases.length > 0 && (
                      <div className="event-actions">
                        <p className="assign-package-label">שייך חבילה לאירוע:</p>
                        <div className="assign-package-buttons">
                          {purchases.map((purchase) => (
                            <button
                              key={purchase.id}
                              className="btn-assign-package"
                              onClick={() => handleAssignPackageToEvent(event.id, purchase.id)}
                            >
                              {purchase.package_name}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {event.package_purchase_id && (
                      <div className="event-package-assigned">
                        <i className="fas fa-check"></i>
                        <span>חבילה משוייכת</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Activate Package Modal */}
      {showActivatePackageModal && selectedPackageForActivation && (
        <div className="modal-overlay" onClick={handleCancelActivation}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>
                <i className="fas fa-gift"></i>
                השלמת הרכישה
              </h2>
              <button className="modal-close" onClick={handleCancelActivation}>
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="modal-body">
              <div className="activate-package-info">
                <i className="fas fa-info-circle"></i>
                <p>בחרת בחבילה: <strong>{selectedPackageForActivation.packageName}</strong></p>
                <p>כדי להשלים את הרכישה, לחצי על "המשך לתשלום"</p>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={handleCancelActivation}>
                ביטול
              </button>
              <button className="btn-primary" onClick={handleActivateSelectedPackage}>
                <i className="fas fa-credit-card"></i>
                המשך לתשלום
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="footer">
        <div className="footer-container">
          <div className="footer-bottom">
            <p>&copy; 2025 Save the Day. כל הזכויות שמורות.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
