import { useState, useEffect } from 'react';
import './MessageTemplateEditor.css';

const API_URL = import.meta.env.VITE_API_URL || 'https://event-gift.onrender.com/api';

// WhatsApp Template format:
// שלום {{1}} 💙 אנא לחצו על אחד מהקישורים להזמינים {{2}}! אירוח: {{3}} תאריך: {{4}} שעה: {{5}}! 💙 משפחת אירועי היום, {{6}} ⭐

// SMS Template format:
// הנכם מוזמנים ל{event_name}, נשמח שתאשרו הגעתכם בלינק הבא: {rsvp_link}

export default function MessageTemplateEditor({ event, onUpdate, showSuccess, showInfo }) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('whatsapp'); // 'whatsapp' or 'sms'
  const [isSaving, setIsSaving] = useState(false);

  // WhatsApp template fields
  const [whatsappFields, setWhatsappFields] = useState({
    greeting: 'שלום',
    eventName: '',
    eventDate: '',
    eventTime: '',
    eventLocation: '',
    hostName: 'SaveDay Events'
  });

  // SMS template fields
  const [smsFields, setSmsFields] = useState({
    eventName: '',
    customMessage: ''
  });

  // Initialize fields from event data
  useEffect(() => {
    if (event) {
      const eventDate = event.event_date ? new Date(event.event_date) : null;
      const formattedDate = eventDate ? eventDate.toLocaleDateString('he-IL', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      }) : '';
      const formattedTime = eventDate ? eventDate.toLocaleTimeString('he-IL', {
        hour: '2-digit',
        minute: '2-digit'
      }) : '';

      // Get custom message settings if they exist
      const messageSettings = event.message_settings || {};

      setWhatsappFields({
        greeting: messageSettings.whatsapp_greeting || 'שלום',
        eventName: messageSettings.whatsapp_event_name || event.event_title || '',
        eventDate: messageSettings.whatsapp_event_date || formattedDate,
        eventTime: messageSettings.whatsapp_event_time || formattedTime,
        eventLocation: messageSettings.whatsapp_event_location || event.event_location || '',
        hostName: messageSettings.whatsapp_host_name || 'SaveDay Events'
      });

      setSmsFields({
        eventName: messageSettings.sms_event_name || event.event_title || '',
        customMessage: messageSettings.sms_custom_message || ''
      });
    }
  }, [event]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const response = await fetch(`${API_URL}/packages/events/${event.id}/message-settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          whatsapp_greeting: whatsappFields.greeting,
          whatsapp_event_name: whatsappFields.eventName,
          whatsapp_event_date: whatsappFields.eventDate,
          whatsapp_event_time: whatsappFields.eventTime,
          whatsapp_event_location: whatsappFields.eventLocation,
          whatsapp_host_name: whatsappFields.hostName,
          sms_event_name: smsFields.eventName,
          sms_custom_message: smsFields.customMessage
        })
      });

      if (response.ok) {
        showSuccess('הגדרות ההודעה נשמרו בהצלחה');
        if (onUpdate) onUpdate();
      } else {
        showInfo('שגיאה בשמירת ההגדרות');
      }
    } catch (error) {
      console.error('Error saving message settings:', error);
      showInfo('שגיאה בשמירת ההגדרות');
    } finally {
      setIsSaving(false);
    }
  };

  // Generate WhatsApp preview
  const getWhatsAppPreview = () => {
    return `${whatsappFields.greeting} [שם האורח] 💙
אנא לחצו על אחד מהקישורים להזמינים ${whatsappFields.eventName}!
אירוח: ${whatsappFields.eventDate}
תאריך: ${whatsappFields.eventTime}
שעה: ${whatsappFields.eventLocation}!
💙 משפחת אירועי היום, ${whatsappFields.hostName} ⭐`;
  };

  // Generate SMS preview
  const getSmsPreview = () => {
    const baseMessage = `הנכם מוזמנים ל${smsFields.eventName}`;
    const customPart = smsFields.customMessage ? `, ${smsFields.customMessage}` : '';
    return `${baseMessage}${customPart}, נשמח שתאשרו הגעתכם בלינק הבא: [קישור לאישור]`;
  };

  // Determine which channel is available based on package
  const getAvailableChannels = () => {
    const packageId = event?.package_id;
    if (packageId === 2) return ['sms']; // SMS only
    if (packageId === 3 || packageId === 4) return ['whatsapp']; // WhatsApp only
    return ['whatsapp', 'sms']; // Default: both
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
          <span>עריכת הודעות WhatsApp / SMS</span>
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
              <h4>עריכת טמפלייט WhatsApp</h4>
              <p className="template-description">
                ערוך את השדות הדינמיים בהודעה. שם האורח יוחלף אוטומטית בשליחה.
              </p>

              <div className="template-fields">
                <div className="field-group">
                  <label>ברכת פתיחה</label>
                  <input
                    type="text"
                    value={whatsappFields.greeting}
                    onChange={(e) => setWhatsappFields({...whatsappFields, greeting: e.target.value})}
                    placeholder="שלום"
                  />
                </div>

                <div className="field-group">
                  <label>שם האירוע</label>
                  <input
                    type="text"
                    value={whatsappFields.eventName}
                    onChange={(e) => setWhatsappFields({...whatsappFields, eventName: e.target.value})}
                    placeholder="החתונה של דנה ויוסי"
                  />
                </div>

                <div className="field-row">
                  <div className="field-group">
                    <label>תאריך</label>
                    <input
                      type="text"
                      value={whatsappFields.eventDate}
                      onChange={(e) => setWhatsappFields({...whatsappFields, eventDate: e.target.value})}
                      placeholder="25/12/2025"
                    />
                  </div>
                  <div className="field-group">
                    <label>שעה</label>
                    <input
                      type="text"
                      value={whatsappFields.eventTime}
                      onChange={(e) => setWhatsappFields({...whatsappFields, eventTime: e.target.value})}
                      placeholder="20:00"
                    />
                  </div>
                </div>

                <div className="field-group">
                  <label>מיקום</label>
                  <input
                    type="text"
                    value={whatsappFields.eventLocation}
                    onChange={(e) => setWhatsappFields({...whatsappFields, eventLocation: e.target.value})}
                    placeholder="אולמי הגן, תל אביב"
                  />
                </div>

                <div className="field-group">
                  <label>שם המארחים</label>
                  <input
                    type="text"
                    value={whatsappFields.hostName}
                    onChange={(e) => setWhatsappFields({...whatsappFields, hostName: e.target.value})}
                    placeholder="SaveDay Events"
                  />
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
              <h4>עריכת טמפלייט SMS</h4>
              <p className="template-description">
                ערוך את השדות הדינמיים בהודעה. קישור האישור יתווסף אוטומטית.
              </p>

              <div className="template-fields">
                <div className="field-group">
                  <label>שם האירוע</label>
                  <input
                    type="text"
                    value={smsFields.eventName}
                    onChange={(e) => setSmsFields({...smsFields, eventName: e.target.value})}
                    placeholder="החתונה של דנה ויוסי"
                  />
                </div>

                <div className="field-group">
                  <label>הודעה מותאמת אישית (אופציונלי)</label>
                  <textarea
                    value={smsFields.customMessage}
                    onChange={(e) => setSmsFields({...smsFields, customMessage: e.target.value})}
                    placeholder="נשמח לראותכם!"
                    rows={2}
                  />
                  <span className="field-hint">הודעה זו תוצג לפני קישור האישור</span>
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
