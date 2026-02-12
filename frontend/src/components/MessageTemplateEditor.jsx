import { useState, useEffect } from 'react';
import './MessageTemplateEditor.css';

const API_URL = import.meta.env.VITE_API_URL || 'https://event-gift.onrender.com/api';

// WhatsApp Template format (from Gupshup):
// שלום {{1}} 💙 אנחנו שמחים להזמינכם {{2}}! תאריך: {{3}} שעה: {{4}} מיקום: {{5}} 💙 בברכה, {{6}} ⭐
//
// Dynamic fields:
// {{1}} = Guest name (automatic from guest list)
// {{2}} = Event name (event_title)
// {{3}} = Event date
// {{4}} = Event time
// {{5}} = Event location
// {{6}} = Host name (SaveDay Events - fixed)

// SMS Template format:
// הנכם מוזמנים ל{event_name}, נשמח שתאשרו הגעתכם בלינק הבא: {rsvp_link}

export default function MessageTemplateEditor({ event, onUpdate, showSuccess, showInfo }) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('whatsapp');
  const [isSaving, setIsSaving] = useState(false);

  // Editable field - only event name can be edited here
  const [eventName, setEventName] = useState('');

  // Read-only fields - displayed but not editable (can be edited elsewhere on the page)
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
      // Only update event_title (event name)
      const response = await fetch(`${API_URL}/packages/events/${event.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          event_title: eventName
        })
      });

      if (response.ok) {
        showSuccess('שם האירוע נשמר בהצלחה');
        if (onUpdate) onUpdate();
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error('Save error:', errorData);
        showInfo('שגיאה בשמירת שם האירוע');
      }
    } catch (error) {
      console.error('Error saving event name:', error);
      showInfo('שגיאה בשמירת שם האירוע');
    } finally {
      setIsSaving(false);
    }
  };

  // Generate WhatsApp preview matching the actual Gupshup template
  const getWhatsAppPreview = () => {
    return `שלום [שם האורח] 💙
אנחנו שמחים להזמינכם ${eventName || '[שם האירוע]'}!
תאריך: ${eventDate || '[תאריך]'}
שעה: ${eventTime || '[שעה]'}
מיקום: ${eventLocation || '[מיקום]'}
💙 בברכה, SaveDay Events ⭐`;
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
                  <span className="field-hint">ניתן לעריכה - זה השם שיופיע בהודעה</span>
                </div>

                <div className="field-row">
                  <div className="field-group">
                    <label>תאריך</label>
                    <input
                      type="text"
                      value={eventDate || 'לא הוגדר'}
                      disabled
                      className="field-readonly"
                    />
                  </div>
                  <div className="field-group">
                    <label>שעה</label>
                    <input
                      type="text"
                      value={eventTime || 'לא הוגדרה'}
                      disabled
                      className="field-readonly"
                    />
                  </div>
                </div>

                <div className="field-group">
                  <label>מיקום</label>
                  <input
                    type="text"
                    value={eventLocation || 'לא הוגדר'}
                    disabled
                    className="field-readonly"
                  />
                </div>

                <div className="field-info">
                  <i className="fas fa-info-circle"></i>
                  <span>תאריך, שעה ומיקום ניתנים לעריכה בפרטי האירוע למעלה</span>
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
                  <span className="field-hint">ניתן לעריכה - זה השם שיופיע בהודעה</span>
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
