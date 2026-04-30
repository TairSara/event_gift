import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useNotification } from '../../../hooks/useNotification';
import GuestManagement from '../../../components/GuestManagement';
import MessageTemplateEditor from '../../../components/MessageTemplateEditor';
import { renderSide } from '../../../lib/canvasRender';
import weddingManifest from '../../../data/wedding.manifest.json';
import hinaManifest from '../../../data/hina.manifest.json';
import barMitzvahManifest from '../../../data/bar-mitzvah.manifest.json';
import batMitzvahManifest from '../../../data/bat-mitzvah.manifest.json';
import britManifest from '../../../data/brit.manifest.json';
import britaManifest from '../../../data/brita.manifest.json';
import knasimManifest from '../../../data/knasim.manifest.json';
import birthdayManifest from '../../../data/birthday.manifest.json';
import otherManifest from '../../../data/other.manifest.json';

const API_URL = import.meta.env.VITE_API_URL || 'https://event-gift.onrender.com/api';

export default function AdminEventPage() {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const { showSuccess, showInfo, NotificationComponent } = useNotification();
  const invitationCanvasRef = useRef(null);

  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);

  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState('');
  const [isEditingDate, setIsEditingDate] = useState(false);
  const [editedDate, setEditedDate] = useState('');
  const [isEditingTime, setIsEditingTime] = useState(false);
  const [editedTime, setEditedTime] = useState('');
  const [isEditingLocation, setIsEditingLocation] = useState(false);
  const [editedLocation, setEditedLocation] = useState('');
  const [isEditingBitLink, setIsEditingBitLink] = useState(false);
  const [editedBitLink, setEditedBitLink] = useState('');
  const [isEditingStatus, setIsEditingStatus] = useState(false);
  const [editedStatus, setEditedStatus] = useState('');

  const [scheduledMessages, setScheduledMessages] = useState([]);
  const [editingMsgId, setEditingMsgId] = useState(null);
  const [editingMsgDate, setEditingMsgDate] = useState('');
  const [editingMsgStatus, setEditingMsgStatus] = useState('');

  const adminToken = localStorage.getItem('adminToken');

  useEffect(() => {
    fetchEventData();
    fetchScheduledMessages();
  }, [eventId]);

  useEffect(() => {
    if (event && event.invitation_data && invitationCanvasRef.current) {
      const invitationData = event.invitation_data;

      if (invitationData.template_id === 'custom-upload' && invitationData.custom_image) {
        const img = new Image();
        img.onload = () => {
          const canvas = invitationCanvasRef.current;
          if (!canvas) return;
          canvas.width = img.width;
          canvas.height = img.height;
          canvas.getContext('2d').drawImage(img, 0, 0);
        };
        img.src = invitationData.custom_image;
        return;
      }

      const manifests = {
        wedding: weddingManifest, hina: hinaManifest,
        'bar-mitzvah': barMitzvahManifest, 'bat-mitzvah': batMitzvahManifest,
        brit: britManifest, brita: britaManifest,
        knasim: knasimManifest, birthday: birthdayManifest, other: otherManifest
      };
      const manifest = manifests[invitationData.event_type];
      if (manifest) {
        const template = manifest.templates.find(t => t.id === invitationData.template_id);
        if (template) renderSide(invitationCanvasRef.current, template, invitationData.values, 'front');
      }
    }
  }, [event]);

  const fetchEventData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/packages/events/${eventId}`);
      if (response.ok) {
        setEvent(await response.json());
      } else {
        showInfo('האירוע לא נמצא');
        navigate('/admin/events');
      }
    } catch {
      showInfo('שגיאה בטעינת האירוע');
    } finally {
      setLoading(false);
    }
  };

  const fetchScheduledMessages = async () => {
    try {
      const res = await fetch(`${API_URL}/admin/scheduled-messages/event/${eventId}`, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      if (res.ok) {
        const data = await res.json();
        setScheduledMessages(data.messages || []);
      }
    } catch { /* silent */ }
  };

  const handleSaveMsg = async (msgId) => {
    const body = {};
    if (editingMsgDate) body.scheduled_date = editingMsgDate;
    if (editingMsgStatus) body.status = editingMsgStatus;
    try {
      const res = await fetch(`${API_URL}/admin/scheduled-messages/${msgId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify(body)
      });
      if (res.ok) {
        showSuccess('ההודעה המתוזמנת עודכנה');
        setEditingMsgId(null);
        fetchScheduledMessages();
      } else {
        showInfo('שגיאה בעדכון ההודעה');
      }
    } catch {
      showInfo('שגיאה בתקשורת עם השרת');
    }
  };

  const putEvent = async (body) => {
    const res = await fetch(`${API_URL}/packages/events/${eventId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    return res;
  };

  // --- Title ---
  const handleSaveTitle = async () => {
    if (!editedTitle.trim()) return showInfo('שם האירוע לא יכול להיות ריק');
    const res = await putEvent({ event_title: editedTitle.trim() });
    if (res.ok) { setEvent(prev => ({ ...prev, event_title: editedTitle.trim() })); setIsEditingTitle(false); showSuccess('שם האירוע עודכן'); }
    else showInfo('שגיאה בעדכון שם האירוע');
  };

  // --- Date ---
  const handleSaveDate = async () => {
    if (!editedDate.trim()) return showInfo('נא להזין תאריך');
    const res = await putEvent({ event_date: editedDate });
    if (res.ok) {
      const data = await res.json();
      setEvent(prev => ({ ...prev, event_date: data.event_date || editedDate }));
      setIsEditingDate(false);
      showSuccess('תאריך האירוע עודכן');
    } else showInfo('שגיאה בעדכון תאריך');
  };

  // --- Time ---
  const handleSaveTime = async () => {
    if (!editedTime.trim()) return showInfo('נא להזין שעה');
    const res = await putEvent({ event_time: editedTime });
    if (res.ok) { setEvent(prev => ({ ...prev, event_time: editedTime })); setIsEditingTime(false); showSuccess('שעת האירוע עודכנה'); }
    else showInfo('שגיאה בעדכון שעה');
  };

  // --- Location ---
  const handleSaveLocation = async () => {
    if (!editedLocation.trim()) return showInfo('נא להזין מיקום');
    const res = await putEvent({ event_location: editedLocation.trim() });
    if (res.ok) { setEvent(prev => ({ ...prev, event_location: editedLocation.trim() })); setIsEditingLocation(false); showSuccess('מיקום האירוע עודכן'); }
    else showInfo('שגיאה בעדכון מיקום');
  };

  // --- Waze link ---
  const handleSaveBitLink = async () => {
    const res = await putEvent({ bit_payment_link: editedBitLink.trim() });
    if (res.ok) { setEvent(prev => ({ ...prev, bit_payment_link: editedBitLink.trim() })); setIsEditingBitLink(false); showSuccess('קישור Waze עודכן'); }
    else showInfo('שגיאה בעדכון קישור Waze');
  };

  // --- Status ---
  const handleSaveStatus = async () => {
    const res = await putEvent({ status: editedStatus });
    if (res.ok) { setEvent(prev => ({ ...prev, status: editedStatus })); setIsEditingStatus(false); showSuccess('סטטוס עודכן'); }
    else showInfo('שגיאה בעדכון סטטוס');
  };

  const isManualPackage = event
    ? ((event.package_name || '').includes('ידני') || (event.package_name || '').includes('בסיס'))
    : false;

  const frontendBase = import.meta.env.VITE_FRONTEND_URL || window.location.origin;
  const rsvpLink = event ? `${frontendBase}/event-rsvp/${event.id}` : '';

  const statusLabels = { pending: 'ממתין', active: 'פעיל', scheduled: 'מתוזמן', completed: 'הסתיים', cancelled: 'בוטל' };

  if (loading) {
    return (
      <div className="admin-page">
        <div className="admin-loading">
          <div className="loading-spinner"></div>
          <p>טוען אירוע...</p>
        </div>
      </div>
    );
  }

  if (!event) return null;

  return (
    <div className="admin-page" dir="rtl">
      {NotificationComponent}

      {/* Header */}
      <div className="admin-page-header" style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
        <button
          className="pagination-btn"
          onClick={() => navigate('/admin/events')}
          style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
            <polyline points="9 18 15 12 9 6" />
          </svg>
          חזרה לאירועים
        </button>
        <div>
          <h1 style={{ margin: 0 }}>{event.event_title}</h1>
          <p style={{ margin: 0, color: 'var(--admin-text-muted)', fontSize: '0.85rem' }}>
            ניהול אירוע #{event.id} | {event.user_name || event.user_email}
          </p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>

        {/* פרטי האירוע */}
        <div className="admin-card">
          <div className="admin-card-header"><h2>פרטי האירוע</h2></div>
          <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>

            {/* שם */}
            <FieldRow label="שם האירוע" icon="✏️">
              {isEditingTitle ? (
                <InlineEdit
                  value={editedTitle}
                  onChange={setEditedTitle}
                  onSave={handleSaveTitle}
                  onCancel={() => setIsEditingTitle(false)}
                />
              ) : (
                <FieldValue value={event.event_title} onEdit={() => { setEditedTitle(event.event_title); setIsEditingTitle(true); }} />
              )}
            </FieldRow>

            {/* תאריך */}
            <FieldRow label="תאריך" icon="📅">
              {isEditingDate ? (
                <InlineEdit
                  type="datetime-local"
                  value={editedDate}
                  onChange={setEditedDate}
                  onSave={handleSaveDate}
                  onCancel={() => setIsEditingDate(false)}
                />
              ) : (
                <FieldValue
                  value={event.event_date ? new Date(event.event_date).toLocaleDateString('he-IL', { year: 'numeric', month: 'long', day: 'numeric' }) : 'לא הוגדר'}
                  onEdit={() => {
                    setEditedDate(event.event_date ? new Date(event.event_date).toISOString().slice(0, 16) : '');
                    setIsEditingDate(true);
                  }}
                />
              )}
            </FieldRow>

            {/* שעה */}
            <FieldRow label="שעה" icon="🕐">
              {isEditingTime ? (
                <InlineEdit
                  type="time"
                  value={editedTime}
                  onChange={setEditedTime}
                  onSave={handleSaveTime}
                  onCancel={() => setIsEditingTime(false)}
                />
              ) : (
                <FieldValue
                  value={event.event_time ? event.event_time.slice(0, 5) : 'לא הוגדר'}
                  onEdit={() => { setEditedTime(event.event_time ? event.event_time.slice(0, 5) : ''); setIsEditingTime(true); }}
                />
              )}
            </FieldRow>

            {/* מיקום */}
            <FieldRow label="מיקום" icon="📍">
              {isEditingLocation ? (
                <InlineEdit
                  value={editedLocation}
                  onChange={setEditedLocation}
                  onSave={handleSaveLocation}
                  onCancel={() => setIsEditingLocation(false)}
                  placeholder="הזן מיקום"
                />
              ) : (
                <FieldValue
                  value={event.event_location || 'לא הוגדר'}
                  onEdit={() => { setEditedLocation(event.event_location || ''); setIsEditingLocation(true); }}
                />
              )}
            </FieldRow>

            {/* סטטוס */}
            <FieldRow label="סטטוס" icon="🔵">
              {isEditingStatus ? (
                <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                  <select
                    value={editedStatus}
                    onChange={e => setEditedStatus(e.target.value)}
                    style={{ padding: '0.3rem 0.5rem', borderRadius: '6px', border: '1px solid #ddd', fontSize: '0.9rem' }}
                  >
                    <option value="pending">ממתין</option>
                    <option value="active">פעיל</option>
                    <option value="scheduled">מתוזמן</option>
                    <option value="completed">הסתיים</option>
                    <option value="cancelled">בוטל</option>
                  </select>
                  <SaveCancelBtns onSave={handleSaveStatus} onCancel={() => setIsEditingStatus(false)} />
                </div>
              ) : (
                <FieldValue
                  value={statusLabels[event.status] || event.status}
                  onEdit={() => { setEditedStatus(event.status); setIsEditingStatus(true); }}
                />
              )}
            </FieldRow>

            {/* קישור Waze */}
            <FieldRow label="קישור Waze" icon="🗺️">
              {isEditingBitLink ? (
                <InlineEdit
                  type="url"
                  value={editedBitLink}
                  onChange={setEditedBitLink}
                  onSave={handleSaveBitLink}
                  onCancel={() => setIsEditingBitLink(false)}
                  placeholder="הדבק קישור Waze"
                  dir="ltr"
                />
              ) : (
                <FieldValue
                  value={event.bit_payment_link || 'לא הוגדר'}
                  onEdit={() => { setEditedBitLink(event.bit_payment_link || ''); setIsEditingBitLink(true); }}
                  isLink={!!event.bit_payment_link}
                  href={event.bit_payment_link}
                />
              )}
            </FieldRow>

            {/* קישור RSVP */}
            {isManualPackage && (
              <FieldRow label="קישור RSVP" icon="🔗">
                <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', flex: 1 }}>
                  <input
                    type="text"
                    readOnly
                    value={rsvpLink}
                    dir="ltr"
                    style={{ flex: 1, padding: '0.3rem 0.5rem', borderRadius: '6px', border: '1px solid #ddd', fontSize: '0.8rem', background: '#f8f8f8' }}
                    onClick={e => e.target.select()}
                  />
                  <button
                    className="pagination-btn"
                    onClick={() => { navigator.clipboard.writeText(rsvpLink); showSuccess('הועתק!'); }}
                    style={{ whiteSpace: 'nowrap' }}
                  >
                    העתק
                  </button>
                </div>
              </FieldRow>
            )}

            {/* מידע נוסף */}
            <div style={{ borderTop: '1px solid #eee', paddingTop: '0.8rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.85rem', color: 'var(--admin-text-muted)' }}>
              <div><strong>חבילה:</strong> {event.package_name || '-'}</div>
              <div><strong>סוג אירוע:</strong> {event.event_type || '-'}</div>
              <div><strong>נוצר:</strong> {new Date(event.created_at).toLocaleDateString('he-IL')}</div>
              <div><strong>ID:</strong> {event.id}</div>
            </div>
          </div>
        </div>

        {/* הזמנה */}
        <div className="admin-card">
          <div className="admin-card-header"><h2>הזמנה</h2></div>
          <div style={{ padding: '1rem', textAlign: 'center' }}>
            {event.invitation_data ? (
              <>
                <canvas
                  ref={invitationCanvasRef}
                  style={{ maxWidth: '100%', borderRadius: '8px', border: '1px solid #eee' }}
                  width={540}
                  height={675}
                />
                {event.invitation_data.generated_image_url && (
                  <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: 'var(--admin-text-muted)' }}>
                    <a href={event.invitation_data.generated_image_url} target="_blank" rel="noopener noreferrer">
                      צפה בתמונה הנוצרה
                    </a>
                  </div>
                )}
              </>
            ) : (
              <div style={{ color: 'var(--admin-text-muted)', padding: '2rem' }}>
                <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📭</div>
                <p>לא נוצרה הזמנה לאירוע זה</p>
              </div>
            )}
          </div>
        </div>

        {/* עריכת הודעות */}
        <div className="admin-card" style={{ gridColumn: '1 / -1' }}>
          <div className="admin-card-header"><h2>עריכת הודעות</h2></div>
          <div style={{ padding: '1rem' }}>
            <MessageTemplateEditor
              event={event}
              onUpdate={fetchEventData}
              showSuccess={showSuccess}
              showInfo={showInfo}
            />
          </div>
        </div>

        {/* הודעות מתוזמנות */}
        <div className="admin-card" style={{ gridColumn: '1 / -1' }}>
          <div className="admin-card-header"><h2>הודעות מתוזמנות</h2></div>
          <div style={{ padding: '1rem' }}>
            {scheduledMessages.length === 0 ? (
              <p style={{ color: 'var(--admin-text-muted)', fontSize: '0.9rem' }}>אין הודעות מתוזמנות לאירוע זה</p>
            ) : (
              <div className="admin-table-wrapper">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>הודעה #</th>
                      <th>תאריך שליחה</th>
                      <th>סטטוס</th>
                      <th>נשלח</th>
                      <th>נכשל</th>
                      <th>פעולות</th>
                    </tr>
                  </thead>
                  <tbody>
                    {scheduledMessages.map(msg => (
                      <tr key={msg.id}>
                        <td><strong>הודעה {msg.message_number}</strong></td>
                        <td>
                          {editingMsgId === msg.id ? (
                            <input
                              type="date"
                              value={editingMsgDate}
                              onChange={e => setEditingMsgDate(e.target.value)}
                              style={{ padding: '0.25rem 0.4rem', borderRadius: '6px', border: '1px solid var(--admin-primary)', fontSize: '0.85rem' }}
                            />
                          ) : (
                            msg.scheduled_date
                              ? new Date(msg.scheduled_date).toLocaleDateString('he-IL')
                              : '-'
                          )}
                        </td>
                        <td>
                          {editingMsgId === msg.id ? (
                            <select
                              value={editingMsgStatus}
                              onChange={e => setEditingMsgStatus(e.target.value)}
                              style={{ padding: '0.25rem 0.4rem', borderRadius: '6px', border: '1px solid #ddd', fontSize: '0.85rem' }}
                            >
                              <option value="pending">ממתין</option>
                              <option value="completed">נשלח</option>
                              <option value="partial">חלקי</option>
                              <option value="failed">נכשל</option>
                            </select>
                          ) : (
                            <span className={`status-badge ${msg.status}`}>
                              {{ pending: 'ממתין', completed: 'נשלח', partial: 'חלקי', failed: 'נכשל' }[msg.status] || msg.status}
                            </span>
                          )}
                        </td>
                        <td style={{ color: 'var(--admin-success, #22c55e)' }}>{msg.guests_sent_count}</td>
                        <td style={{ color: msg.guests_failed_count > 0 ? '#ef4444' : undefined }}>{msg.guests_failed_count}</td>
                        <td>
                          {editingMsgId === msg.id ? (
                            <div style={{ display: 'flex', gap: '0.3rem' }}>
                              <button
                                className="pagination-btn"
                                onClick={() => handleSaveMsg(msg.id)}
                                style={{ background: 'var(--admin-success, #22c55e)', color: '#fff', border: 'none', fontSize: '0.8rem' }}
                              >✓ שמור</button>
                              <button
                                className="pagination-btn"
                                onClick={() => setEditingMsgId(null)}
                                style={{ background: '#ef4444', color: '#fff', border: 'none', fontSize: '0.8rem' }}
                              >✗ ביטול</button>
                            </div>
                          ) : (
                            <button
                              className="pagination-btn"
                              style={{ fontSize: '0.8rem' }}
                              onClick={() => {
                                setEditingMsgId(msg.id);
                                setEditingMsgDate(msg.scheduled_date || '');
                                setEditingMsgStatus(msg.status || 'pending');
                              }}
                            >✏️ ערוך</button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* ניהול מוזמנים */}
        <div className="admin-card" style={{ gridColumn: '1 / -1' }}>
          <div className="admin-card-header"><h2>ניהול מוזמנים</h2></div>
          <div style={{ padding: '1rem' }}>
            <GuestManagement eventId={eventId} onUpdate={fetchEventData} packageId={event.package_id} />
          </div>
        </div>

      </div>
    </div>
  );
}

function FieldRow({ label, icon, children }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.8rem' }}>
      <span style={{ minWidth: '110px', color: 'var(--admin-text-muted)', fontSize: '0.85rem', paddingTop: '0.3rem' }}>
        {icon} {label}
      </span>
      <div style={{ flex: 1 }}>{children}</div>
    </div>
  );
}

function FieldValue({ value, onEdit, isLink, href }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
      {isLink ? (
        <a href={href} target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.9rem', wordBreak: 'break-all' }}>
          {value.length > 40 ? value.substring(0, 40) + '...' : value}
        </a>
      ) : (
        <span style={{ fontSize: '0.9rem' }}>{value}</span>
      )}
      <button
        onClick={onEdit}
        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--admin-primary)', padding: '0.1rem 0.3rem', borderRadius: '4px', fontSize: '0.8rem' }}
        title="ערוך"
      >
        ✏️
      </button>
    </div>
  );
}

function InlineEdit({ value, onChange, onSave, onCancel, type = 'text', placeholder, dir }) {
  return (
    <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') onSave(); if (e.key === 'Escape') onCancel(); }}
        placeholder={placeholder}
        dir={dir}
        autoFocus
        style={{ flex: 1, padding: '0.3rem 0.5rem', borderRadius: '6px', border: '1px solid var(--admin-primary)', fontSize: '0.9rem', outline: 'none' }}
      />
      <SaveCancelBtns onSave={onSave} onCancel={onCancel} />
    </div>
  );
}

function SaveCancelBtns({ onSave, onCancel }) {
  return (
    <>
      <button
        onClick={onSave}
        style={{ background: 'var(--admin-success, #22c55e)', color: '#fff', border: 'none', borderRadius: '6px', padding: '0.3rem 0.6rem', cursor: 'pointer', fontSize: '0.85rem' }}
      >✓</button>
      <button
        onClick={onCancel}
        style={{ background: '#ef4444', color: '#fff', border: 'none', borderRadius: '6px', padding: '0.3rem 0.6rem', cursor: 'pointer', fontSize: '0.85rem' }}
      >✗</button>
    </>
  );
}
