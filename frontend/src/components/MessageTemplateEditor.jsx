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

const DEFAULT_DAY_SMS = `אורחים יקרים,

נרגשים להזכיר כי היום נחגוג יחד את החתונה של X!

לנוחיותכם,
מספר השולחן שלכם הוא: {table_number}

קישור וויז להגעה לאירוע: {waze_link}

נשמח לראותכם ולחגוג יחד. 🎉`;

const DEFAULT_DAY_SMS_NO_TABLE = `אורחים יקרים,

נרגשים להזכיר כי היום נחגוג יחד את החתונה של X!

קישור וויז להגעה לאירוע: {waze_link}

נשמח לראותכם ולחגוג יחד. 🎉`;

export default function MessageTemplateEditor({ event, onUpdate, showSuccess, showInfo }) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('whatsapp');
  const [isSaving, setIsSaving] = useState(false);

  // Editable field - only event name can be edited here
  const [eventName, setEventName] = useState('');

  // Day-of-event SMS templates
  const [dayOfEventSms, setDayOfEventSms] = useState('');
  const [dayOfEventSmsNoTable, setDayOfEventSmsNoTable] = useState('');
  const [daySmsSubTab, setDaySmsSubTab] = useState('with_table');

  // SMS fallback template (for WhatsApp packages - sent when number has no WhatsApp)
  const [smsFallback, setSmsFallback] = useState('');

  // Read-only fields - displayed but not editable (can be edited elsewhere on the page)
  const [eventDate, setEventDate] = useState('');
  const [eventTime, setEventTime] = useState('');
  const [eventLocation, setEventLocation] = useState('');

  // Initialize fields from event data
  useEffect(() => {
    if (event) {
      setEventName(event.event_title || '');
      setSmsFallback(event.message_settings?.sms_fallback_template ||
        `הנכם מוזמנים ל${event.event_title || '[שם האירוע]'}, נשמח שתאשרו הגעתכם בלינק הבא: {rsvp_link}`);
      const savedTemplate = event.message_settings?.day_of_event_sms_template;
      const template = (savedTemplate && !savedTemplate.includes('{event_name}'))
        ? savedTemplate
        : DEFAULT_DAY_SMS;
      setDayOfEventSms(template);

      const savedNoTableTemplate = event.message_settings?.day_of_event_sms_no_table_template;
      const noTableTemplate = (savedNoTableTemplate && savedNoTableTemplate.includes('{waze_link}'))
        ? savedNoTableTemplate
        : DEFAULT_DAY_SMS_NO_TABLE;
      setDayOfEventSmsNoTable(noTableTemplate);
      setEventLocation(event.event_location || '');

      // Parse date from event_date, time from event_time
      if (event.event_date) {
        const dateObj = new Date(event.event_date);
        setEventDate(dateObj.toLocaleDateString('he-IL', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric'
        }));
      } else {
        setEventDate('');
      }
      setEventTime(event.event_time ? event.event_time.slice(0, 5) : '');
    }
  }, [event]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Update event_title
      const titleResponse = await fetch(`${API_URL}/packages/events/${event.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event_title: eventName })
      });

      // Update day-of-event SMS template in message_settings
      const newSettings = { ...(event.message_settings || {}), day_of_event_sms_template: dayOfEventSms.trim(), day_of_event_sms_no_table_template: dayOfEventSmsNoTable.trim(), sms_fallback_template: smsFallback.trim() };
      const smsResponse = await fetch(`${API_URL}/packages/events/${event.id}/message-settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSettings)
      });

      if (titleResponse.ok && smsResponse.ok) {
        showSuccess('ההגדרות נשמרו בהצלחה');
        if (onUpdate) onUpdate();
      } else {
        showInfo('שגיאה בשמירת ההגדרות');
      }
    } catch (error) {
      console.error('Error saving:', error);
      showInfo('שגיאה בשמירת ההגדרות');
    } finally {
      setIsSaving(false);
    }
  };

  // Generate WhatsApp preview matching the actual Gupshup template
  const getWhatsAppPreview = () => {
    return `שלום [שם האורח] 💙
אנחנו שמחים להזמינכם ל${eventName || '[שם האירוע]'}!
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
    if (packageId === 3 || packageId === 4) return ['whatsapp', 'sms_fallback'];
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
            {availableChannels.includes('sms_fallback') && (
              <button
                className={`editor-tab ${activeTab === 'sms_fallback' ? 'active' : ''}`}
                onClick={() => setActiveTab('sms_fallback')}
              >
                <i className="fas fa-sms"></i>
                SMS - ללא WhatsApp
              </button>
            )}
            <button
              className={`editor-tab ${activeTab === 'day_sms' ? 'active' : ''}`}
              onClick={() => setActiveTab('day_sms')}
            >
              <i className="fas fa-calendar-day"></i>
              SMS יום האירוע
            </button>
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
                  <span>שם ומיקום ניתנים לעריכה בפרטי האירוע למעלה</span>
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

          {/* SMS Fallback Editor - for WhatsApp packages when number has no WhatsApp */}
          {activeTab === 'sms_fallback' && availableChannels.includes('sms_fallback') && (
            <div className="template-editor-section">
              <h4>לאורחים ללא וואטסאפ: עריכת SMS</h4>
              <p className="template-description">
                הודעה זו תישלח כ-SMS לאורחים שמספרם אינו רשום ב-WhatsApp.
                הקישור לאישור הגעה יתווסף אוטומטית לכל אורח.
              </p>

              <div className="template-fields">
                <div className="field-group">
                  <label>תבנית ההודעה</label>
                  <textarea
                    rows={4}
                    value={smsFallback}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (!val.includes('{rsvp_link}')) return;
                      setSmsFallback(val);
                    }}
                    style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid #ddd', fontFamily: 'inherit', fontSize: '0.9rem', resize: 'vertical' }}
                    dir="rtl"
                  />
                  <span className="field-hint">
                    <strong>{'{rsvp_link}'}</strong> חייב להישאר בהודעה — לא ניתן למחוק אותו
                  </span>
                </div>

                <div className="field-info">
                  <i className="fas fa-info-circle"></i>
                  <span>הודעה זו תישלח רק לאורחים שאין להם WhatsApp</span>
                </div>
              </div>

              <div className="template-preview">
                <h5>
                  <i className="fas fa-eye"></i>
                  תצוגה מקדימה
                </h5>
                <div className="preview-message sms-preview">
                  <div className="preview-bubble">
                    {smsFallback.replace('{rsvp_link}', '[קישור לאישור הגעה]')}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Day-of-event SMS Editor */}
          {activeTab === 'day_sms' && (
            <div className="template-editor-section">
              <h4>הודעת SMS ביום האירוע</h4>
              <p className="template-description">
                ההודעה תישלח אוטומטית ביום האירוע לכל אורח מאושר. אורחים עם מספר שולחן יקבלו הודעה אחת, אורחים ללא שולחן יקבלו הודעה אחרת.
              </p>

              {/* Sub-tab switcher */}
              <div className="editor-tabs" style={{ marginBottom: '1rem' }}>
                <button
                  className={`editor-tab ${daySmsSubTab === 'with_table' ? 'active' : ''}`}
                  onClick={() => setDaySmsSubTab('with_table')}
                >
                  <i className="fas fa-chair"></i>
                  עם מספר שולחן
                </button>
                <button
                  className={`editor-tab ${daySmsSubTab === 'no_table' ? 'active' : ''}`}
                  onClick={() => setDaySmsSubTab('no_table')}
                >
                  <i className="fas fa-user"></i>
                  ללא מספר שולחן
                </button>
              </div>

              {/* With table template */}
              {daySmsSubTab === 'with_table' && (
                <div className="template-fields">
                  <div className="field-group">
                    <label>תבנית ההודעה — לאורחים עם מספר שולחן</label>
                    <textarea
                      rows={8}
                      value={dayOfEventSms}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (!val.includes('{table_number}') || !val.includes('{waze_link}')) return;
                        setDayOfEventSms(val);
                      }}
                      style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid #ddd', fontFamily: 'inherit', fontSize: '0.9rem', resize: 'vertical' }}
                      dir="rtl"
                    />
                    <span className="field-hint">
                      <strong>{'{table_number}'}</strong> ו-<strong>{'{waze_link}'}</strong> חייבים להישאר בהודעה
                    </span>
                  </div>
                  <div className="template-preview">
                    <h5><i className="fas fa-eye"></i> תצוגה מקדימה</h5>
                    <div className="preview-message sms-preview">
                      <div className="preview-bubble" style={{ whiteSpace: 'pre-line' }}>
                        {dayOfEventSms
                          .replace('{table_number}', '5')
                          .replace('{waze_link}', event?.bit_payment_link || '[קישור וויז]')}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* No table template */}
              {daySmsSubTab === 'no_table' && (
                <div className="template-fields">
                  <div className="field-group">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.3rem' }}>
                      <label style={{ margin: 0 }}>תבנית ההודעה — לאורחים ללא מספר שולחן</label>
                      <button
                        type="button"
                        onClick={() => setDayOfEventSmsNoTable(DEFAULT_DAY_SMS_NO_TABLE)}
                        style={{ fontSize: '0.78rem', padding: '0.2rem 0.6rem', borderRadius: '6px', border: '1px solid #ccc', background: '#f5f5f5', cursor: 'pointer', color: '#555' }}
                      >
                        אפס לברירת מחדל
                      </button>
                    </div>
                    <textarea
                      rows={8}
                      value={dayOfEventSmsNoTable}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (!val.includes('{waze_link}')) return;
                        setDayOfEventSmsNoTable(val);
                      }}
                      style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid #ddd', fontFamily: 'inherit', fontSize: '0.9rem', resize: 'vertical' }}
                      dir="rtl"
                    />
                    <span className="field-hint">
                      <strong>{'{waze_link}'}</strong> חייב להישאר בהודעה
                    </span>
                  </div>
                  <div className="template-preview">
                    <h5><i className="fas fa-eye"></i> תצוגה מקדימה</h5>
                    <div className="preview-message sms-preview">
                      <div className="preview-bubble" style={{ whiteSpace: 'pre-line' }}>
                        {dayOfEventSmsNoTable
                          .replace('{waze_link}', event?.bit_payment_link || '[קישור וויז]')}
                      </div>
                    </div>
                  </div>
                </div>
              )}
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
