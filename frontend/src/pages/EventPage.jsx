import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useNotification } from "../hooks/useNotification";
import Navbar from "../components/Navbar";
import GuestManagement from "../components/GuestManagement";
import { renderSide } from "../lib/canvasRender";
import weddingManifest from '../data/wedding.manifest.json';
import hinaManifest from '../data/hina.manifest.json';
import barMitzvahManifest from '../data/bar-mitzvah.manifest.json';
import batMitzvahManifest from '../data/bat-mitzvah.manifest.json';
import britManifest from '../data/brit.manifest.json';
import britaManifest from '../data/brita.manifest.json';
import knasimManifest from '../data/knasim.manifest.json';
import birthdayManifest from '../data/birthday.manifest.json';
import otherManifest from '../data/other.manifest.json';
import "./EventPage.css";

export default function EventPage() {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showSuccess, showInfo, NotificationComponent } = useNotification();

  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState('');
  const [isEditingDate, setIsEditingDate] = useState(false);
  const [editedDate, setEditedDate] = useState('');
  const [isEditingLocation, setIsEditingLocation] = useState(false);
  const [editedLocation, setEditedLocation] = useState('');
  const [isEditingBitLink, setIsEditingBitLink] = useState(false);
  const [editedBitLink, setEditedBitLink] = useState('');
  const invitationCanvasRef = useRef(null);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    fetchEventData();
  }, [eventId, user]);

  // Render invitation canvas when invitation data is available
  useEffect(() => {
    if (event && event.invitation_data && invitationCanvasRef.current) {
      const invitationData = event.invitation_data;

      // Find the template
      let template = null;
      const manifests = {
        'wedding': weddingManifest,
        'hina': hinaManifest,
        'bar-mitzvah': barMitzvahManifest,
        'bat-mitzvah': batMitzvahManifest,
        'brit': britManifest,
        'brita': britaManifest,
        'knasim': knasimManifest,
        'birthday': birthdayManifest,
        'other': otherManifest
      };

      const manifest = manifests[invitationData.event_type];
      if (manifest) {
        template = manifest.templates.find(t => t.id === invitationData.template_id);
      }

      if (template) {
        renderSide(invitationCanvasRef.current, template, invitationData.values, 'front');

        // Auto-capture and upload invitation image
        setTimeout(async () => {
          try {
            const canvas = invitationCanvasRef.current;
            const base64Image = canvas.toDataURL('image/png');

            const API_URL = import.meta.env.VITE_API_URL || 'https://event-gift.onrender.com/api';
            await fetch(`${API_URL}/packages/events/${event.id}/upload-invitation-image`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ image_data: base64Image })
            });

            console.log('✅ Invitation image uploaded successfully');
          } catch (error) {
            console.error('❌ Failed to upload invitation image:', error);
          }
        }, 1000);
      }
    }
  }, [event]);

  const fetchEventData = async () => {
    const API_URL = import.meta.env.VITE_API_URL || 'https://event-gift.onrender.com/api';

    try {
      setLoading(true);

      const response = await fetch(
        `${API_URL}/packages/events/${eventId}`
      );

      if (response.ok) {
        const data = await response.json();
        setEvent(data);
      } else {
        showInfo('האירוע לא נמצא');
        navigate('/dashboard');
      }

      setLoading(false);
    } catch (error) {
      console.error('Error fetching event:', error);
      showInfo('שגיאה בטעינת האירוע');
      setLoading(false);
    }
  };

  const handleEditInvitation = () => {
    if (event) {
      // Navigate to template selection for this event type
      navigate(`/create-invitation/${event.event_type}?event_id=${eventId}`);
    }
  };

  const handleCreateInvitation = () => {
    if (event) {
      navigate(`/create-invitation/${event.event_type}?event_id=${eventId}`);
    }
  };

  const handleEditTitle = () => {
    setEditedTitle(event.event_title);
    setIsEditingTitle(true);
  };

  const handleSaveTitle = async () => {
    const API_URL = import.meta.env.VITE_API_URL || 'https://event-gift.onrender.com/api';

    if (!editedTitle.trim()) {
      showInfo('שם האירוע לא יכול להיות רק');
      return;
    }

    try {
      const response = await fetch(
        `${API_URL}/packages/events/${eventId}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            event_title: editedTitle.trim()
          })
        }
      );

      if (response.ok) {
        setEvent({ ...event, event_title: editedTitle.trim() });
        setIsEditingTitle(false);
        showSuccess('שם האירוע עודכן בהצלחה');

        // Create notification
        await fetch(`${API_URL}/notifications/create`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            user_id: user.id,
            event_id: parseInt(eventId),
            notification_type: 'event_updated',
            title: 'עדכון שם אירוע',
            message: `שם האירוע עודכן ל: "${editedTitle.trim()}"`
          })
        });
      } else {
        showInfo('שגיאה בעדכון שם האירוע');
      }
    } catch (error) {
      console.error('Error updating event title:', error);
      showInfo('שגיאה בעדכון שם האירוע');
    }
  };

  const handleCancelEdit = () => {
    setIsEditingTitle(false);
    setEditedTitle('');
  };

  const handleEditDate = () => {
    // Get date from event_date or invitation
    const dateSource = event.event_date || event.invitation_data?.values?.date;

    if (dateSource) {
      // If it's from event_date, format it for datetime-local input
      if (event.event_date) {
        const date = new Date(event.event_date);
        const formatted = date.toISOString().slice(0, 16);
        setEditedDate(formatted);
      } else {
        // If from invitation, we'll need to parse it
        setEditedDate('');
      }
    } else {
      setEditedDate('');
    }
    setIsEditingDate(true);
  };

  const handleSaveDate = async () => {
    const API_URL = import.meta.env.VITE_API_URL || 'https://event-gift.onrender.com/api';

    if (!editedDate.trim()) {
      showInfo('נא להזין תאריך');
      return;
    }

    try {
      const response = await fetch(
        `${API_URL}/packages/events/${eventId}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            event_date: editedDate
          })
        }
      );

      if (response.ok) {
        setEvent({ ...event, event_date: editedDate });
        setIsEditingDate(false);
        showSuccess('תאריך האירוע עודכן בהצלחה');

        // Create notification
        const formattedDate = new Date(editedDate).toLocaleDateString('he-IL', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });

        await fetch(`${API_URL}/notifications/create`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            user_id: user.id,
            event_id: parseInt(eventId),
            notification_type: 'event_updated',
            title: 'עדכון תאריך אירוע',
            message: `תאריך האירוע עודכן ל: ${formattedDate}`
          })
        });
      } else {
        showInfo('שגיאה בעדכון תאריך האירוע');
      }
    } catch (error) {
      console.error('Error updating event date:', error);
      showInfo('שגיאה בעדכון תאריך האירוע');
    }
  };

  const handleCancelDateEdit = () => {
    setIsEditingDate(false);
    setEditedDate('');
  };

  const handleEditLocation = () => {
    const locationSource = event.event_location || event.invitation_data?.values?.location || '';
    setEditedLocation(locationSource);
    setIsEditingLocation(true);
  };

  const handleSaveLocation = async () => {
    const API_URL = import.meta.env.VITE_API_URL || 'https://event-gift.onrender.com/api';

    if (!editedLocation.trim()) {
      showInfo('נא להזין מיקום');
      return;
    }

    try {
      const response = await fetch(
        `${API_URL}/packages/events/${eventId}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            event_location: editedLocation.trim()
          })
        }
      );

      if (response.ok) {
        setEvent({ ...event, event_location: editedLocation.trim() });
        setIsEditingLocation(false);
        showSuccess('מיקום האירוע עודכן בהצלחה');

        // Create notification
        await fetch(`${API_URL}/notifications/create`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            user_id: user.id,
            event_id: parseInt(eventId),
            notification_type: 'event_updated',
            title: 'עדכון מיקום אירוע',
            message: `מיקום האירוע עודכן ל: ${editedLocation.trim()}`
          })
        });
      } else {
        showInfo('שגיאה בעדכון מיקום האירוע');
      }
    } catch (error) {
      console.error('Error updating event location:', error);
      showInfo('שגיאה בעדכון מיקום האירוע');
    }
  };

  const handleCancelLocationEdit = () => {
    setIsEditingLocation(false);
    setEditedLocation('');
  };

  const handleEditBitLink = () => {
    setEditedBitLink(event.bit_payment_link || '');
    setIsEditingBitLink(true);
  };

  const handleSaveBitLink = async () => {
    const API_URL = import.meta.env.VITE_API_URL || 'https://event-gift.onrender.com/api';

    try {
      const response = await fetch(
        `${API_URL}/packages/events/${eventId}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            bit_payment_link: editedBitLink.trim()
          })
        }
      );

      if (response.ok) {
        setEvent({ ...event, bit_payment_link: editedBitLink.trim() });
        setIsEditingBitLink(false);
        showSuccess('קישור BIT עודכן בהצלחה');

        // Create notification
        await fetch(`${API_URL}/notifications/create`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            user_id: user.id,
            event_id: parseInt(eventId),
            notification_type: 'event_updated',
            title: 'עדכון קישור BIT',
            message: editedBitLink.trim() ? 'קישור BIT נוסף לאירוע' : 'קישור BIT הוסר מהאירוע'
          })
        });
      } else {
        showInfo('שגיאה בעדכון קישור BIT');
      }
    } catch (error) {
      console.error('Error updating BIT link:', error);
      showInfo('שגיאה בעדכון קישור BIT');
    }
  };

  const handleCancelBitLinkEdit = () => {
    setIsEditingBitLink(false);
    setEditedBitLink('');
  };

  // Check if event date has passed and update status
  useEffect(() => {
    if (event && event.event_date) {
      const API_URL = import.meta.env.VITE_API_URL || 'https://event-gift.onrender.com/api';
      const eventDate = new Date(event.event_date);
      const now = new Date();

      if (eventDate < now && event.status !== 'completed') {
        // Auto-update status to completed
        fetch(`${API_URL}/packages/events/${eventId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            status: 'completed'
          })
        }).then(response => {
          if (response.ok) {
            setEvent({ ...event, status: 'completed' });
          }
        }).catch(error => {
          console.error('Error auto-updating event status:', error);
        });
      }
    }
  }, [event, eventId]);

  if (loading) {
    return (
      <div className="event-page">
        {NotificationComponent}
        <Navbar />
        <div className="dashboard-loading">
          <div className="spinner"></div>
          <p>טוען נתונים...</p>
        </div>
      </div>
    );
  }

  if (!event) {
    return null;
  }

  return (
    <div className="event-page">
      {NotificationComponent}
      <Navbar />

      <section className="event-header">
        <div className="event-header-content">
          <button className="back-btn" onClick={() => navigate('/dashboard')}>
            <i className="fas fa-arrow-right"></i>
            חזרה לניהול
          </button>

          {isEditingTitle ? (
            <div className="edit-title-container">
              <input
                type="text"
                className="edit-title-input"
                value={editedTitle}
                onChange={(e) => setEditedTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveTitle();
                  if (e.key === 'Escape') handleCancelEdit();
                }}
                autoFocus
              />
              <div className="edit-title-buttons">
                <button className="save-title-btn" onClick={handleSaveTitle}>
                  <i className="fas fa-check"></i>
                </button>
                <button className="cancel-title-btn" onClick={handleCancelEdit}>
                  <i className="fas fa-times"></i>
                </button>
              </div>
            </div>
          ) : (
            <div className="title-with-edit">
              <h1>{event.event_title}</h1>
              <button className="edit-title-btn" onClick={handleEditTitle} title="ערוך שם אירוע">
                <i className="fas fa-pencil-alt"></i>
              </button>
            </div>
          )}

          <p className="event-type-label">
            <i className="fas fa-tag"></i>
            {event.event_type}
          </p>
        </div>
      </section>

      <section className="event-main-content">
        <div className="event-container">

          {/* Left Column - Invitation */}
          <div className="left-column">
            <div className="event-section invitation-section">
              <div className="section-header">
                <h2>
                  <i className="fas fa-envelope"></i>
                  ההזמנה שלך
                </h2>
              </div>

              {event.invitation_data ? (
                <div className="invitation-preview-simple">
                  <div className="invitation-success-header">
                    <i className="fas fa-check-circle"></i>
                    <h3>ההזמנה נקלטה בהצלחה!</h3>
                  </div>

                  <div className="invitation-canvas-wrapper">
                    <canvas
                      ref={invitationCanvasRef}
                      className="invitation-canvas-preview"
                      width={1080}
                      height={1350}
                    />
                  </div>

                  <button className="btn-update-invitation" onClick={handleEditInvitation}>
                    <i className="fas fa-edit"></i>
                    עדכון הזמנה
                  </button>
                </div>
              ) : (
                <div className="no-invitation">
                  <i className="fas fa-envelope-open-text"></i>
                  <h3>טרם נוצרה הזמנה</h3>
                  <p>צור את ההזמנה הדיגיטלית שלך עכשיו</p>
                  <button className="btn-create-invitation" onClick={handleCreateInvitation}>
                    <i className="fas fa-plus"></i>
                    צור הזמנה
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Right Column - Details, Guests, Gifts */}
          <div className="right-column">
            {/* פרטי האירוע */}
            <div className="event-section details-section">
              <div className="section-header">
                <h2>
                  <i className="fas fa-info-circle"></i>
                  פרטי האירוע
                </h2>
              </div>

              <div className="details-grid">
                <div className="detail-item">
                  <i className="fas fa-calendar"></i>
                  <div className="detail-content">
                    <span className="detail-label">תאריך</span>
                    {isEditingDate ? (
                      <div className="edit-detail-container">
                        <input
                          type="datetime-local"
                          className="edit-detail-input"
                          value={editedDate}
                          onChange={(e) => setEditedDate(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveDate();
                            if (e.key === 'Escape') handleCancelDateEdit();
                          }}
                        />
                        <div className="edit-detail-buttons">
                          <button className="save-detail-btn" onClick={handleSaveDate}>
                            <i className="fas fa-check"></i>
                          </button>
                          <button className="cancel-detail-btn" onClick={handleCancelDateEdit}>
                            <i className="fas fa-times"></i>
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="detail-value-container">
                        <span className="detail-value">
                          {(() => {
                            // Try event_date first, then invitation date
                            const dateSource = event.event_date ||
                              (event.invitation_data?.values?.date);

                            if (!dateSource) return 'לא הוגדר';

                            // If it's from invitation, just display it as is (it's already formatted)
                            if (!event.event_date && event.invitation_data?.values?.date) {
                              return event.invitation_data.values.date;
                            }

                            // Otherwise format the event_date
                            return new Date(event.event_date).toLocaleDateString('he-IL', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            });
                          })()}
                        </span>
                        <button className="edit-detail-icon-btn" onClick={handleEditDate} title="ערוך תאריך">
                          <i className="fas fa-pencil-alt"></i>
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="detail-item">
                  <i className="fas fa-map-marker-alt"></i>
                  <div className="detail-content">
                    <span className="detail-label">מיקום</span>
                    {isEditingLocation ? (
                      <div className="edit-detail-container">
                        <input
                          type="text"
                          className="edit-detail-input"
                          value={editedLocation}
                          onChange={(e) => setEditedLocation(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveLocation();
                            if (e.key === 'Escape') handleCancelLocationEdit();
                          }}
                          placeholder="הזן מיקום"
                        />
                        <div className="edit-detail-buttons">
                          <button className="save-detail-btn" onClick={handleSaveLocation}>
                            <i className="fas fa-check"></i>
                          </button>
                          <button className="cancel-detail-btn" onClick={handleCancelLocationEdit}>
                            <i className="fas fa-times"></i>
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="detail-value-container">
                        <span className="detail-value">
                          {event.event_location ||
                           event.invitation_data?.values?.location ||
                           'לא הוגדר'}
                        </span>
                        <button className="edit-detail-icon-btn" onClick={handleEditLocation} title="ערוך מיקום">
                          <i className="fas fa-pencil-alt"></i>
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="detail-item">
                  <i className="fas fa-circle"></i>
                  <div>
                    <span className="detail-label">סטטוס</span>
                    <span className="detail-value">
                      {event.status === 'pending' && 'ממתין'}
                      {event.status === 'active' && 'פעיל'}
                      {event.status === 'scheduled' && 'מתוזמן'}
                      {event.status === 'completed' && 'הסתיים'}
                    </span>
                  </div>
                </div>

                <div className="detail-item">
                  <i className="fas fa-clock"></i>
                  <div>
                    <span className="detail-label">נוצר בתאריך</span>
                    <span className="detail-value">
                      {new Date(event.created_at).toLocaleDateString('he-IL')}
                    </span>
                  </div>
                </div>

                <div className="detail-item bit-link-item">
                  <i className="fas fa-credit-card"></i>
                  <div className="detail-content">
                    <span className="detail-label">קישור BIT למתנות</span>
                    {isEditingBitLink ? (
                      <div className="edit-detail-container">
                        <input
                          type="url"
                          className="edit-detail-input"
                          value={editedBitLink}
                          onChange={(e) => setEditedBitLink(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveBitLink();
                            if (e.key === 'Escape') handleCancelBitLinkEdit();
                          }}
                          placeholder="הדבק כאן את הקישור ל-BIT"
                          dir="ltr"
                        />
                        <div className="edit-detail-buttons">
                          <button className="save-detail-btn" onClick={handleSaveBitLink}>
                            <i className="fas fa-check"></i>
                          </button>
                          <button className="cancel-detail-btn" onClick={handleCancelBitLinkEdit}>
                            <i className="fas fa-times"></i>
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="detail-value-container">
                        {event.bit_payment_link ? (
                          <a
                            href={event.bit_payment_link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="bit-link-value"
                          >
                            {event.bit_payment_link.length > 40
                              ? event.bit_payment_link.substring(0, 40) + '...'
                              : event.bit_payment_link}
                          </a>
                        ) : (
                          <span className="detail-value no-link">לא הוגדר קישור</span>
                        )}
                        <button className="edit-detail-icon-btn" onClick={handleEditBitLink} title="ערוך קישור BIT">
                          <i className="fas fa-pencil-alt"></i>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* מוזמנים */}
            <div className="event-section guests-section">
              <div className="section-header">
                <h2>
                  <i className="fas fa-users"></i>
                  ניהול מוזמנים
                </h2>
              </div>
              <GuestManagement eventId={eventId} onUpdate={fetchEventData} packageId={event.package_id} />
            </div>

            {/* מתנות */}
            <div className="event-section gifts-section">
              <div className="section-header">
                <h2>
                  <i className="fas fa-gift"></i>
                  ניהול מתנות
                </h2>
              </div>

              <div className="gifts-placeholder">
                <i className="fas fa-hand-holding-heart"></i>
                <p>ניהול מתנות יתווסף בקרוב</p>
              </div>
            </div>
          </div>

        </div>
      </section>

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
