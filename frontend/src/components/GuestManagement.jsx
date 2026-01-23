import { useState, useEffect, useRef } from 'react';
import { guestAPI } from '../services/api';
import './GuestManagement.css';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

export default function GuestManagement({ eventId, onUpdate, packageId }) {
  const [guests, setGuests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [editingGuest, setEditingGuest] = useState(null);
  const [notification, setNotification] = useState(null);
  const fileInputRef = useRef(null);

  // Form state for adding/editing guest
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    quantity: 1,
    contact_method: 'WhatsApp',
    attendance_status: 'pending',
    table_number: ''
  });

  useEffect(() => {
    loadGuests();
  }, [eventId]);

  const loadGuests = async (shouldUpdate = false) => {
    try {
      setLoading(true);
      const data = await guestAPI.getEventGuests(eventId);
      setGuests(data);
      setLoading(false);
      // רק קורא ל-onUpdate כשמבוקש במפורש (אחרי הוספה/עדכון/מחיקה)
      if (shouldUpdate && onUpdate) onUpdate();
    } catch (error) {
      console.error('Error loading guests:', error);
      showNotification('שגיאה בטעינת המוזמנים', 'error');
      setLoading(false);
    }
  };

  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const handleAddGuest = async (e) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      showNotification('נא להזין שם מוזמן', 'error');
      return;
    }

    try {
      await guestAPI.addGuest(eventId, {
        ...formData,
        table_number: formData.table_number ? parseInt(formData.table_number) : null
      });

      showNotification('המוזמן נוסף בהצלחה!');
      setShowAddModal(false);
      resetForm();
      loadGuests(true);
    } catch (error) {
      showNotification(error.message || 'שגיאה בהוספת המוזמן', 'error');
    }
  };

  const handleUpdateGuest = async (e) => {
    e.preventDefault();

    try {
      await guestAPI.updateGuest(editingGuest.id, {
        ...formData,
        table_number: formData.table_number ? parseInt(formData.table_number) : null
      });

      showNotification('המוזמן עודכן בהצלחה!');
      setEditingGuest(null);
      resetForm();
      loadGuests(true);
    } catch (error) {
      showNotification(error.message || 'שגיאה בעדכון המוזמן', 'error');
    }
  };

  const handleDeleteGuest = async (guestId) => {
    if (!window.confirm('האם אתה בטוח שברצונך למחוק מוזמן זה?')) {
      return;
    }

    try {
      await guestAPI.deleteGuest(guestId);
      showNotification('המוזמן נמחק בהצלחה!');
      loadGuests(true);
    } catch (error) {
      showNotification(error.message || 'שגיאה במחיקת המוזמן', 'error');
    }
  };

  const handleSendWhatsAppInvitation = async (guest) => {
    if (!guest.phone) {
      showNotification('למוזמן אין מספר טלפון', 'error');
      return;
    }

    // Validate phone number format
    const phoneRegex = /^\+?[0-9]{10,15}$/;
    if (!phoneRegex.test(guest.phone)) {
      showNotification('מספר הטלפון אינו תקין. יש להזין עם קידומת מדינה (לדוגמה: +972501234567)', 'error');
      return;
    }

    try {
      setLoading(true);
      const result = await guestAPI.sendWhatsAppInvitation(guest.id);
      const guestName = result.guest_name || guest.name || 'האורח';
      showNotification(`ההזמנה נשלחה בהצלחה ל-${guestName}! ✅`);
      console.log('WhatsApp sent:', result);
    } catch (error) {
      showNotification(error.message || 'שגיאה בשליחת ההזמנה', 'error');
      console.error('WhatsApp send error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSendWhatsAppToAll = async () => {
    // Filter guests with valid phone numbers
    const guestsWithPhone = guests.filter(g => {
      if (!g.phone) return false;
      const phoneRegex = /^\+?[0-9]{10,15}$/;
      return phoneRegex.test(g.phone);
    });

    if (guestsWithPhone.length === 0) {
      showNotification('אין מוזמנים עם מספר טלפון תקין ברשימה', 'error');
      return;
    }

    const confirmMessage = `האם אתה בטוח שברצונך לשלוח הזמנות ל-${guestsWithPhone.length} מוזמנים?`;
    if (!window.confirm(confirmMessage)) {
      return;
    }

    try {
      setLoading(true);
      let successCount = 0;
      let failCount = 0;

      showNotification(`שולח הזמנות ל-${guestsWithPhone.length} מוזמנים...`, 'info');

      for (const guest of guestsWithPhone) {
        try {
          await guestAPI.sendWhatsAppInvitation(guest.id);
          successCount++;
          // Small delay between sends to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 500));
        } catch (error) {
          console.error(`Failed to send to ${guest.name}:`, error);
          failCount++;
        }
      }

      if (failCount === 0) {
        showNotification(`✅ ההזמנות נשלחו בהצלחה ל-${successCount} מוזמנים!`);
      } else {
        showNotification(`נשלחו ${successCount} הזמנות. ${failCount} נכשלו.`, 'warning');
      }
    } catch (error) {
      showNotification('שגיאה בשליחת ההזמנות', 'error');
      console.error('Bulk send error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSendSMSInvitation = async (guest) => {
    if (!guest.phone) {
      showNotification('למוזמן אין מספר טלפון', 'error');
      return;
    }

    // Validate phone number format
    const phoneRegex = /^\+?[0-9]{10,15}$/;
    if (!phoneRegex.test(guest.phone)) {
      showNotification('מספר הטלפון אינו תקין. יש להזין עם קידומת מדינה (לדוגמה: +972501234567)', 'error');
      return;
    }

    try {
      setLoading(true);
      const result = await guestAPI.sendSMSInvitation(guest.id);
      const guestName = result.guest_name || guest.name || 'האורח';
      showNotification(`SMS נשלח בהצלחה ל-${guestName}! ✅`);
      console.log('SMS sent:', result);
    } catch (error) {
      showNotification(error.message || 'שגיאה בשליחת SMS', 'error');
      console.error('SMS send error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSendSMSToAll = async () => {
    // Filter guests with valid phone numbers
    const guestsWithPhone = guests.filter(g => {
      if (!g.phone) return false;
      const phoneRegex = /^\+?[0-9]{10,15}$/;
      return phoneRegex.test(g.phone);
    });

    if (guestsWithPhone.length === 0) {
      showNotification('אין מוזמנים עם מספר טלפון תקין ברשימה', 'error');
      return;
    }

    const confirmMessage = `האם אתה בטוח שברצונך לשלוח SMS ל-${guestsWithPhone.length} מוזמנים?`;
    if (!window.confirm(confirmMessage)) {
      return;
    }

    try {
      setLoading(true);
      let successCount = 0;
      let failCount = 0;

      showNotification(`שולח SMS ל-${guestsWithPhone.length} מוזמנים...`, 'info');

      for (const guest of guestsWithPhone) {
        try {
          await guestAPI.sendSMSInvitation(guest.id);
          successCount++;
          // Small delay between sends to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 500));
        } catch (error) {
          console.error(`Failed to send SMS to ${guest.name}:`, error);
          failCount++;
        }
      }

      if (failCount === 0) {
        showNotification(`✅ הודעות SMS נשלחו בהצלחה ל-${successCount} מוזמנים!`);
      } else {
        showNotification(`נשלחו ${successCount} הודעות SMS. ${failCount} נכשלו.`, 'warning');
      }
    } catch (error) {
      showNotification('שגיאה בשליחת הודעות SMS', 'error');
      console.error('Bulk SMS send error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEditGuest = (guest) => {
    setEditingGuest(guest);
    setFormData({
      name: guest.name || '',
      phone: guest.phone || '',
      email: guest.email || '',
      quantity: guest.attending_count || guest.guests_count || guest.quantity || 1,
      contact_method: guest.contact_method || 'WhatsApp',
      attendance_status: guest.status || guest.attendance_status || 'pending',
      table_number: guest.table_number || ''
    });
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      showNotification('נא להעלות קובץ Excel בלבד (.xlsx או .xls)', 'error');
      return;
    }

    try {
      const result = await guestAPI.uploadExcel(eventId, file);
      showNotification(`${result.added} מוזמנים נוספו בהצלחה!`);
      setShowUploadModal(false);
      loadGuests(true);
    } catch (error) {
      showNotification(error.message || 'שגיאה בהעלאת הקובץ', 'error');
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      phone: '',
      email: '',
      quantity: 1,
      contact_method: 'WhatsApp',
      attendance_status: 'pending',
      table_number: ''
    });
  };

  const downloadExcel = () => {
    // יצירת מערך של נתונים לאקסל
    const excelData = guests.map(guest => {
      const currentStatus = guest.status || guest.attendance_status;
      const currentCount = guest.attending_count || guest.guests_count || guest.quantity || 1;
      return {
        'שם האורח': guest.name,
        'כמות': currentCount,
        'מספר טלפון': guest.phone || '',
        'אימייל': guest.email || '',
        'סטטוס אישור הגעה': currentStatus === 'pending' ? 'ממתין' :
                              currentStatus === 'confirmed' ? 'אישר' : 'סירב',
        'מספר שולחן': guest.table_number || ''
      };
    });

    // יצירת workbook ו-worksheet
    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'מוזמנים');

    // הורדת הקובץ
    XLSX.writeFile(workbook, `מוזמנים_${new Date().toISOString().split('T')[0]}.xlsx`);
    showNotification('הקובץ הורד בהצלחה!');
  };

  const downloadPDF = () => {
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4'
    });

    // הגדרת פונט עברי (אם יש)
    doc.setFont('helvetica');
    doc.setFontSize(18);
    doc.text('רשימת מוזמנים', 148, 15, { align: 'center' });

    // הכנת נתונים לטבלה
    const tableData = guests.map(guest => {
      const currentStatus = guest.status || guest.attendance_status;
      const currentCount = guest.attending_count || guest.guests_count || guest.quantity || 1;
      return [
        guest.name,
        currentCount,
        guest.phone || '-',
        currentStatus === 'pending' ? 'ממתין' :
        currentStatus === 'confirmed' ? 'אישר' : 'סירב',
        guest.table_number || '-'
      ];
    });

    // יצירת הטבלה
    doc.autoTable({
      head: [['שם האורח', 'כמות', 'מספר טלפון', 'סטטוס', 'מספר שולחן']],
      body: tableData,
      startY: 25,
      styles: {
        font: 'helvetica',
        fontSize: 10,
        cellPadding: 3
      },
      headStyles: {
        fillColor: [102, 126, 234],
        textColor: 255,
        fontStyle: 'bold'
      },
      alternateRowStyles: {
        fillColor: [245, 245, 245]
      }
    });

    // הורדת הקובץ
    doc.save(`מוזמנים_${new Date().toISOString().split('T')[0]}.pdf`);
    showNotification('הקובץ הורד בהצלחה!');
  };


  const getStatusBadge = (status) => {
    const statusMap = {
      'pending': { label: 'ממתין', class: 'status-pending' },
      'confirmed': { label: 'אישר', class: 'status-confirmed' },
      'declined': { label: 'סירב', class: 'status-declined' },
      'maybe': { label: 'לא יודע', class: 'status-maybe' }
    };
    const statusInfo = statusMap[status] || statusMap['pending'];
    return <span className={`status-badge ${statusInfo.class}`}>{statusInfo.label}</span>;
  };

  const stats = {
    total: guests.length,
    confirmed: guests.filter(g => (g.status || g.attendance_status) === 'confirmed').length,
    pending: guests.filter(g => (g.status || g.attendance_status) === 'pending').length,
    declined: guests.filter(g => (g.status || g.attendance_status) === 'declined').length,
    maybe: guests.filter(g => (g.status || g.attendance_status) === 'maybe').length,
    totalQuantity: guests.reduce((sum, g) => sum + (g.attending_count || g.guests_count || g.quantity || 1), 0),
    confirmedQuantity: guests
      .filter(g => (g.status || g.attendance_status) === 'confirmed')
      .reduce((sum, g) => sum + (g.attending_count || g.guests_count || g.quantity || 1), 0)
  };

  // קביעת אילו כפתורי שליחה להציג לפי סוג החבילה (לפי package_id)
  // package_id = 1: חבילת בסיס – ידני (WhatsApp בלבד)
  // package_id = 2: אוטומטי SMS (SMS בלבד)
  // package_id = 3: אוטומטי WhatsApp (WhatsApp בלבד)
  // package_id = 4: אוטומטי הכל כלול (WhatsApp בלבד)
  console.log('packageId received:', packageId, '| type:', typeof packageId);
  const showWhatsApp = packageId !== 2;
  const showSms = packageId === 2;
  console.log('showWhatsApp:', showWhatsApp, '| showSms:', showSms);

  if (loading) {
    return <div className="loading">טוען מוזמנים...</div>;
  }

  return (
    <div className="guest-management">
      {notification && (
        <div className={`notification ${notification.type}`}>
          {notification.message}
        </div>
      )}

      <div className="guests-stats">
        <div className="stat-card">
          <i className="fas fa-users"></i>
          <div className="stat-info">
            <span className="stat-value">{stats.total}</span>
            <span className="stat-label">מוזמנים</span>
          </div>
        </div>
        <div className="stat-card">
          <i className="fas fa-user-friends"></i>
          <div className="stat-info">
            <span className="stat-value">{stats.totalQuantity}</span>
            <span className="stat-label">סה"כ אנשים</span>
          </div>
        </div>
        <div className="stat-card confirmed">
          <i className="fas fa-check-circle"></i>
          <div className="stat-info">
            <span className="stat-value">{stats.confirmedQuantity}</span>
            <span className="stat-label">אישרו הגעה</span>
          </div>
        </div>
        <div className="stat-card pending">
          <i className="fas fa-clock"></i>
          <div className="stat-info">
            <span className="stat-value">{stats.pending}</span>
            <span className="stat-label">ממתינים</span>
          </div>
        </div>
      </div>

      <div className="guests-actions">
        <div className="actions-left">
          <button
            className="btn-primary"
            onClick={() => {
              console.log('Opening add guest modal');
              setShowAddModal(true);
            }}
          >
            <i className="fas fa-user-plus"></i>
            הוסף מוזמן
          </button>
          <button
            className="btn-secondary"
            onClick={() => {
              console.log('Opening upload modal');
              setShowUploadModal(true);
            }}
          >
            <i className="fas fa-file-upload"></i>
            העלה מ-Excel
          </button>
          <button
            className="btn-secondary"
            onClick={() => {
              loadGuests(false);
              showNotification('הרשימה רוענן בהצלחה!');
            }}
            title="רענן רשימת מוזמנים"
          >
            <i className="fas fa-sync-alt"></i>
            רענן
          </button>
        </div>
        <div className="actions-right">
          {showWhatsApp && (
            <button
              className="btn-whatsapp-all"
              onClick={handleSendWhatsAppToAll}
              disabled={guests.length === 0 || loading}
              style={{
                backgroundColor: '#25D366',
                color: 'white',
                border: 'none',
                padding: '10px 20px',
                borderRadius: '5px',
                cursor: guests.length === 0 || loading ? 'not-allowed' : 'pointer',
                opacity: guests.length === 0 || loading ? 0.5 : 1,
                fontWeight: 'bold',
                marginLeft: '10px'
              }}
            >
              <i className="fab fa-whatsapp" style={{ marginLeft: '8px' }}></i>
              שלח הזמנות לכולם
            </button>
          )}
          {showSms && (
            <button
              className="btn-sms-all"
              onClick={handleSendSMSToAll}
              disabled={guests.length === 0 || loading}
              style={{
                backgroundColor: '#4285F4',
                color: 'white',
                border: 'none',
                padding: '10px 20px',
                borderRadius: '5px',
                cursor: guests.length === 0 || loading ? 'not-allowed' : 'pointer',
                opacity: guests.length === 0 || loading ? 0.5 : 1,
                fontWeight: 'bold',
                marginLeft: '10px'
              }}
            >
              <i className="fas fa-sms" style={{ marginLeft: '8px' }}></i>
              שלח SMS לכולם
            </button>
          )}
          <button className="btn-download btn-excel" onClick={downloadExcel} disabled={guests.length === 0}>
            <i className="fas fa-file-excel"></i>
            הורד Excel
          </button>
          <button className="btn-download btn-pdf" onClick={downloadPDF} disabled={guests.length === 0}>
            <i className="fas fa-file-pdf"></i>
            הורד PDF
          </button>
        </div>
      </div>

      <div className="guests-table-container">
        <table className="guests-table">
          <thead>
            <tr>
              <th>שם האורח</th>
              <th>כמות</th>
              <th>מספר טלפון</th>
              <th>סטטוס אישור הגעה</th>
              <th>מספר שולחן</th>
              <th>פעולות</th>
            </tr>
          </thead>
          <tbody>
            {guests.length === 0 ? (
              <tr>
                <td colSpan="6" className="empty-table-message">
                  <div className="empty-state-inline">
                    <i className="fas fa-address-book"></i>
                    <p>אין מוזמנים עדיין</p>
                    <p className="empty-hint">הוסף מוזמנים ידנית או העלה קובץ Excel</p>
                  </div>
                </td>
              </tr>
            ) : (
              guests.map((guest) => (
                <tr key={guest.id}>
                  <td className="guest-name">{guest.name}</td>
                  <td>{guest.attending_count || guest.guests_count || guest.quantity || 1}</td>
                  <td>{guest.phone || '-'}</td>
                  <td>{getStatusBadge(guest.status || guest.attendance_status)}</td>
                  <td>{guest.table_number || '-'}</td>
                  <td className="actions">
                    {showWhatsApp && (
                      <button
                        className="btn-icon btn-whatsapp"
                        onClick={() => handleSendWhatsAppInvitation(guest)}
                        title="שלח הזמנה ב-WhatsApp"
                        disabled={!guest.phone || loading}
                        style={{
                          backgroundColor: '#25D366',
                          color: 'white',
                          opacity: !guest.phone ? 0.5 : 1,
                          cursor: !guest.phone || loading ? 'not-allowed' : 'pointer'
                        }}
                      >
                        <i className="fab fa-whatsapp"></i>
                      </button>
                    )}
                    {showSms && (
                      <button
                        className="btn-icon btn-sms"
                        onClick={() => handleSendSMSInvitation(guest)}
                        title="שלח הזמנה ב-SMS"
                        disabled={!guest.phone || loading}
                        style={{
                          backgroundColor: '#4285F4',
                          color: 'white',
                          opacity: !guest.phone ? 0.5 : 1,
                          cursor: !guest.phone || loading ? 'not-allowed' : 'pointer'
                        }}
                      >
                        <i className="fas fa-sms"></i>
                      </button>
                    )}
                    <button
                      className="btn-icon btn-edit"
                      onClick={() => handleEditGuest(guest)}
                      title="עריכה"
                    >
                      <i className="fas fa-edit"></i>
                    </button>
                    <button
                      className="btn-icon btn-delete"
                      onClick={() => handleDeleteGuest(guest.id)}
                      title="מחיקה"
                    >
                      <i className="fas fa-trash"></i>
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Add/Edit Guest Modal */}
      {(showAddModal || editingGuest) && (
        <div
          className="modal-overlay"
          onClick={() => {
            console.log('Closing modal from overlay');
            setShowAddModal(false);
            setEditingGuest(null);
            resetForm();
          }}
        >
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingGuest ? 'עריכת מוזמן' : 'הוספת מוזמן'}</h3>
              <button className="modal-close" onClick={() => {
                setShowAddModal(false);
                setEditingGuest(null);
                resetForm();
              }}>
                <i className="fas fa-times"></i>
              </button>
            </div>
            <form onSubmit={editingGuest ? handleUpdateGuest : handleAddGuest}>
              <div className="form-group">
                <label>שם האורח *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  autoFocus
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>מספר טלפון</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+972501234567"
                    pattern="^\+?[0-9]{10,15}$"
                    title="נא להזין מספר טלפון עם קידומת מדינה (לדוגמה: +972501234567)"
                  />
                  <small style={{ color: '#666', fontSize: '0.85em' }}>
                    יש להזין עם קידומת מדינה (לדוגמה: +972501234567)
                  </small>
                </div>
                <div className="form-group">
                  <label>כמות</label>
                  <input
                    type="number"
                    min="1"
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 1 })}
                    onWheel={(e) => e.target.blur()}
                  />
                </div>
              </div>
              {/* אימייל וסטטוס רק בעריכת מוזמן קיים */}
              {editingGuest && (
                <>
                  <div className="form-group">
                    <label>אימייל</label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label>סטטוס אישור הגעה</label>
                    <select
                      value={formData.attendance_status}
                      onChange={(e) => setFormData({ ...formData, attendance_status: e.target.value })}
                    >
                      <option value="pending">ממתין</option>
                      <option value="confirmed">אישר</option>
                      <option value="declined">סירב</option>
                      <option value="maybe">לא יודע</option>
                    </select>
                  </div>
                </>
              )}
              <div className="form-group">
                <label>מספר שולחן</label>
                <input
                  type="number"
                  min="1"
                  value={formData.table_number}
                  onChange={(e) => setFormData({ ...formData, table_number: e.target.value })}
                  onWheel={(e) => e.target.blur()}
                />
              </div>
              <div className="modal-actions">
                <button type="submit" className="btn-primary">
                  {editingGuest ? 'עדכן' : 'הוסף'}
                </button>
                <button type="button" className="btn-secondary" onClick={() => {
                  setShowAddModal(false);
                  setEditingGuest(null);
                  resetForm();
                }}>
                  ביטול
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Upload Excel Modal */}
      {showUploadModal && (
        <div className="modal-overlay" onClick={() => setShowUploadModal(false)}>
          <div className="modal-content upload-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>העלאת קובץ Excel</h3>
              <button className="modal-close" onClick={() => setShowUploadModal(false)}>
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="upload-content">
              <div className="upload-instructions">
                <h4>הוראות:</h4>
                <ul>
                  <li>הקובץ חייב להיות בפורמט Excel (.xlsx או .xls)</li>
                  <li>השורה הראשונה צריכה להכיל כותרות עמודות</li>
                  <li>העמודות הנתמכות (בעברית או אנגלית):
                    <ul>
                      <li><strong>שם</strong> או <strong>name</strong> (חובה)</li>
                      <li>טלפון / phone</li>
                      <li>אימייל / email</li>
                      <li>כמות / quantity</li>
                      <li>סטטוס / status (pending/confirmed/declined)</li>
                      <li>שולחן / table_number</li>
                    </ul>
                  </li>
                  <li>ערכי ברירת מחדל: כמות=1, סטטוס=ממתין</li>
                </ul>
              </div>
              <div className="upload-area">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileUpload}
                  style={{ display: 'none' }}
                />
                <button
                  className="btn-upload"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <i className="fas fa-cloud-upload-alt"></i>
                  בחר קובץ Excel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
