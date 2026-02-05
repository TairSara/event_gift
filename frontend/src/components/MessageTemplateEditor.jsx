import { useState, useEffect } from 'react';
import './MessageTemplateEditor.css';

const API_URL = import.meta.env.VITE_API_URL || 'https://event-gift.onrender.com/api';

// WhatsApp Template format (from Gupshup):
// שלום {{1}} 💙 אנא לחצו על אחד מהקישורים להזמינים {{2}}! אירוח: {{3}} תאריך: {{4}} שעה: {{5}}! 💙 משפחת אירועי היום, {{6}} ⭐
//
// Dynamic fields:
// {{1}} = Guest name (automatic from guest list)
// {{2}} = Event name (event_title)
// {{3}} = Event date (displayed as "אירוח")
// {{4}} = Event time (displayed as "תאריך")
// {{5}} = Event location (displayed as "שעה")
// {{6}} = Host name (SaveDay Events - fixed)

// SMS Template format:
// הנכם מוזמנים ל{event_name}, נשמח שתאשרו הגעתכם בלינק הבא: {rsvp_link}

export default function MessageTemplateEditor({ event, onUpdate, showSuccess, showInfo }) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('whatsapp');
  const [isSaving, setIsSaving] = useState(false);

  // Editable fields - these update the actual event fields in DB
  const [eventName, setEventName] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [eventTime, setEventTime] = useState('');
  const [eventLocation, setEventLocation] = useState('');

  // Initialize fields from event data
  useEffect(() => {
    if (event) {
      setEventName(event.event_title || '');
      setEventLocation(event.event_location || '');

      // Parse date and time from event_date
      if (event.event_date) {
        const dateObj = new Date(event.event_date);
        setEventDate(dateObj.toLocaleDateString('he-IL', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric'
        }));
        setEventTime(dateObj.toLocaleTimeString('he-IL', {
          hour: '2-digit',
          minute: '2-digit'
        }));
      } else {
        setEventDate('');
        setEventTime('');
      }
    }
  }, [event]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Parse the date and time back to ISO format
      let eventDateISO = null;
      if (eventDate && eventTime) {
        // Parse DD/MM/YYYY format
        const dateParts = eventDate.split('/');
        if (dateParts.length === 3) {
          const [day, month, year] = dateParts;
          const timeParts = eventTime.split(':');
          const [hours, minutes] = timeParts;
          eventDateISO = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}`;
        }
      }

      // Update the actual event fields
      const response = await fetch(`${API_URL}/packages/events/${event.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          event_title: eventName,
          event_location: eventLocation,
          ...(eventDateISO && { event_date: eventDateISO })
        })
      });

      if (response.ok) {
        showSuccess('פרטי ההודעה נשמרו בהצלחה');
        if (onUpdate) onUpdate();
      } else {
        showInfo('שגיאה בשמירת הפרטים');
      }
    } catch (error) {
      console.error('Error saving message settings:', error);
      showInfo('שגיאה בשמירת הפרטים');
    } finally {
      setIsSaving(false);
    }
  };

  // Generate WhatsApp preview
  const getWhatsAppPreview = () => {
    return `שלום [שם האורח] 💙
אנא לחצו על אחד מהקישורים להזמינים ${eventName || '[שם האירוע]'}!
אירוח: ${eventDate || '[תאריך]'}
תאריך: ${eventTime || '[שעה]'}
שעה: ${eventLocation || '[מיקום]'}!
💙 משפחת אירועי היום, SaveDay Events ⭐`;
  };

  // Generate SMS preview
  const getSmsPreview = () => {
    return `הנכם מוזמנים ל${eventName || '[שם האירוע]'}, נשמח שתאשרו הגעתכם בלינק הבא: [קישור לאישור]`;
  };

  // Determine which channel is available based on package
  const getAvailableChannels = () => {
    const packageId = event?.package_id;
    if (packageId === 2) return ['sms'];
    if (packageId === 3 || packageId === 4) return ['whatsapp'];
    return ['whatsapp', 'sms'];
  };

  const availableChannels = getAvailableChannels();

  return (
    <div className="message-template-editor">
      <div
        className="editor-header"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="editor-header-content">
          <i className="fab fa-whatsapp"></i>
          <span>עריכת הודעת WhatsApp / SMS</span>
        </div>
        <i className={`fas fa-chevron-${isOpen ? 'up' : 'down'}`}></i>
      </div>

      {isOpen && (
        <div className="editor-content">
          {/* Tab Navigation */}
          <div className="editor-tabs">
            {availableChannels.includes('whatsapp') && (
              <button
                className={`editor-tab ${activeTab === 'whatsapp' ? 'active' : ''}`}
                onClick={() => setActiveTab('whatsapp')}
              >
                <i className="fab fa-whatsapp"></i>
                WhatsApp
              </button>
            )}
            {availableChannels.includes('sms') && (
              <button
                className={`editor-tab ${activeTab === 'sms' ? 'active' : ''}`}
                onClick={() => setActiveTab('sms')}
              >
                <i className="fas fa-sms"></i>
                SMS
              </button>
            )}
          </div>

          {/* WhatsApp Editor */}
          {activeTab === 'whatsapp' && availableChannels.includes('whatsapp') && (
            <div className="template-editor-section">
              <h4>עריכת שדות דינמיים - WhatsApp</h4>
              <p className="template-description">
                ערוך את השדות שיופיעו בהודעה. שם האורח יוחלף אוטומטית לפי רשימת המוזמנים.
              </p>

              <div className="template-fields">
                <div className="field-group">
                  <label>שם האירוע</label>
                  <input
                    type="text"
                    value={eventName}
                    onChange={(e) => setEventName(e.target.value)}
                    placeholder="החתונה של דנה ויוסי"
                  />
                </div>

                <div className="field-row">
                  <div className="field-group">
                    <label>תאריך</label>
                    <input
                      type="text"
                      value={eventDate}
                      onChange={(e) => setEventDate(e.target.value)}
                      placeholder="25/12/2025"
                    />
                  </div>
                  <div className="field-group">
                    <label>שעה</label>
                    <input
                      type="text"
                      value={eventTime}
                      onChange={(e) => setEventTime(e.target.value)}
                      placeholder="20:00"
                    />
                  </div>
                </div>

                <div className="field-group">
                  <label>מיקום</label>
                  <input
                    type="text"
                    value={eventLocation}
                    onChange={(e) => setEventLocation(e.target.value)}
                    placeholder="אולמי הגן, תל אביב"
                  />
                </div>

                <div className="field-info">
                  <i className="fas fa-info-circle"></i>
                  <span>שם האורח ושם המארחים מתעדכנים אוטומטית</span>
                </div>
              </div>

              <div className="template-preview">
                <h5>
                  <i className="fas fa-eye"></i>
                  תצוגה מקדימה
                </h5>
                <div className="preview-message whatsapp-preview">
                  <div className="preview-bubble">
                    {getWhatsAppPreview()}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SMS Editor */}
          {activeTab === 'sms' && availableChannels.includes('sms') && (
            <div className="template-editor-section">
              <h4>עריכת שדות דינמיים - SMS</h4>
              <p className="template-description">
                ההודעה תכלול את שם האירוע וקישור לאישור הגעה.
              </p>

              <div className="template-fields">
                <div className="field-group">
                  <label>שם האירוע</label>
                  <input
                    type="text"
                    value={eventName}
                    onChange={(e) => setEventName(e.target.value)}
                    placeholder="החתונה של דנה ויוסי"
                  />
                </div>

                <div className="field-info">
                  <i className="fas fa-info-circle"></i>
                  <span>קישור האישור מתווסף אוטומטית לכל אורח</span>
                </div>
              </div>

              <div className="template-preview">
                <h5>
                  <i className="fas fa-eye"></i>
                  תצוגה מקדימה
                </h5>
                <div className="preview-message sms-preview">
                  <div className="preview-bubble">
                    {getSmsPreview()}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Save Button */}
          <div className="editor-actions">
            <button
              className="btn-save-template"
              onClick={handleSave}
              disabled={isSaving}
            >
              {isSaving ? (
                <>
                  <i className="fas fa-spinner fa-spin"></i>
                  שומר...
                </>
              ) : (
                <>
                  <i className="fas fa-save"></i>
                  שמור שינויים
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
