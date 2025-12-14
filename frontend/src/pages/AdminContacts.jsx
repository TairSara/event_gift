import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import AdminSidebar from '../components/AdminSidebar';
import AdminNotificationBell from '../components/AdminNotificationBell';
import '../styles/AdminContacts.css';

const AdminContacts = () => {
  const navigate = useNavigate();
  const [adminUser, setAdminUser] = useState(null);
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedContact, setSelectedContact] = useState(null);
  const [filter, setFilter] = useState('all'); // all, new, responded
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    pages: 0
  });

  useEffect(() => {
    checkAdminAccess();
  }, []);

  useEffect(() => {
    if (adminUser) {
      loadContacts();
    }
  }, [adminUser, pagination.page, filter]);

  const checkAdminAccess = async () => {
    const storedAdmin = localStorage.getItem('adminUser');
    const isAdmin = localStorage.getItem('isAdmin');

    if (!storedAdmin || isAdmin !== 'true') {
      navigate('/admin/login');
      return;
    }

    try {
      const admin = JSON.parse(storedAdmin);
      const response = await axios.get(`/api/admin/check-session?email=${admin.email}`);

      if (response.data.is_admin) {
        setAdminUser(response.data.user);
      } else {
        throw new Error('Not authorized');
      }
    } catch (err) {
      console.error('Admin verification failed:', err);
      localStorage.removeItem('adminUser');
      localStorage.removeItem('isAdmin');
      navigate('/admin/login');
    }
  };

  const loadContacts = async () => {
    setLoading(true);
    try {
      const statusParam = filter !== 'all' ? `&status=${filter}` : '';
      const response = await axios.get(
        `/api/admin/contacts?page=${pagination.page}&limit=${pagination.limit}${statusParam}`
      );

      setContacts(response.data.messages || []);
      setPagination({
        ...pagination,
        total: response.data.pagination?.total || 0,
        pages: response.data.pagination?.pages || 0
      });
    } catch (err) {
      console.error('Error loading contacts:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('adminUser');
    localStorage.removeItem('isAdmin');
    navigate('/admin/login');
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'לא זמין';
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('he-IL', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const getStatusBadge = (status) => {
    const badges = {
      'new': { label: 'חדש', className: 'status-new' },
      'responded': { label: 'נענה', className: 'status-responded' },
      'pending': { label: 'ממתין', className: 'status-pending' }
    };
    return badges[status] || { label: status, className: 'status-default' };
  };

  const getSubjectLabel = (subject) => {
    const subjects = {
      'general': 'שאלה כללית',
      'pricing': 'שאלה לגבי מחירים',
      'technical': 'תמיכה טכנית',
      'partnership': 'שיתוף פעולה',
      'other': 'אחר'
    };
    return subjects[subject] || subject;
  };

  const openContactModal = (contact) => {
    setSelectedContact(contact);
  };

  const closeContactModal = () => {
    setSelectedContact(null);
  };

  if (loading && contacts.length === 0) {
    return (
      <div className="admin-loading">
        <div className="loading-spinner"></div>
        <p>טוען פניות לקוחות...</p>
      </div>
    );
  }

  return (
    <div className="admin-layout">
      <AdminSidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="admin-content">
        {/* Header */}
        <header className="admin-dashboard-header">
          <div className="admin-header-content">
            <div className="header-left">
              <button
                className="mobile-menu-btn"
                onClick={() => setSidebarOpen(true)}
              >
                ☰
              </button>
              <div>
                <h1>פניות לקוחות</h1>
                <p className="header-subtitle">ניהול וטיפול בפניות לקוחות</p>
              </div>
            </div>

            <div className="header-right">
              <AdminNotificationBell />
              <div className="admin-user-info">
                <span className="admin-user-name">{adminUser?.full_name || 'מנהל'}</span>
                <span className="admin-user-role">מנהל ראשי</span>
              </div>
              <button className="admin-logout-btn" onClick={handleLogout}>
                <span>התנתק</span>
                <span className="logout-icon">🚪</span>
              </button>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <div className="contacts-main">
          {/* Filters */}
          <div className="contacts-filters">
            <button
              className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
              onClick={() => { setFilter('all'); setPagination({ ...pagination, page: 1 }); }}
            >
              הכל ({pagination.total})
            </button>
            <button
              className={`filter-btn ${filter === 'new' ? 'active' : ''}`}
              onClick={() => { setFilter('new'); setPagination({ ...pagination, page: 1 }); }}
            >
              חדשות
            </button>
            <button
              className={`filter-btn ${filter === 'responded' ? 'active' : ''}`}
              onClick={() => { setFilter('responded'); setPagination({ ...pagination, page: 1 }); }}
            >
              נענו
            </button>
          </div>

          {/* Contacts Table */}
          <div className="contacts-table-container">
            {contacts.length === 0 ? (
              <div className="no-contacts">
                <i className="fas fa-inbox"></i>
                <p>אין פניות להצגה</p>
              </div>
            ) : (
              <table className="contacts-table">
                <thead>
                  <tr>
                    <th>תאריך</th>
                    <th>שם</th>
                    <th>אימייל</th>
                    <th>טלפון</th>
                    <th>נושא</th>
                    <th>סטטוס</th>
                    <th>פעולות</th>
                  </tr>
                </thead>
                <tbody>
                  {contacts.map(contact => (
                    <tr key={contact.id}>
                      <td>{formatDate(contact.created_at)}</td>
                      <td>{contact.full_name}</td>
                      <td>
                        <a href={`mailto:${contact.email}`}>{contact.email}</a>
                      </td>
                      <td>{contact.phone || '-'}</td>
                      <td>{getSubjectLabel(contact.subject)}</td>
                      <td>
                        <span className={`status-badge ${getStatusBadge(contact.status).className}`}>
                          {getStatusBadge(contact.status).label}
                        </span>
                      </td>
                      <td>
                        <button
                          className="btn-view"
                          onClick={() => openContactModal(contact)}
                        >
                          <i className="fas fa-eye"></i>
                          צפייה
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div className="pagination">
              <button
                className="pagination-btn"
                disabled={pagination.page === 1}
                onClick={() => setPagination({ ...pagination, page: pagination.page - 1 })}
              >
                הקודם
              </button>
              <span className="pagination-info">
                עמוד {pagination.page} מתוך {pagination.pages}
              </span>
              <button
                className="pagination-btn"
                disabled={pagination.page === pagination.pages}
                onClick={() => setPagination({ ...pagination, page: pagination.page + 1 })}
              >
                הבא
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Contact Details Modal */}
      {selectedContact && (
        <div className="modal-overlay" onClick={closeContactModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>פרטי פנייה</h2>
              <button className="modal-close" onClick={closeContactModal}>
                ×
              </button>
            </div>
            <div className="modal-body">
              <div className="contact-detail">
                <label>שם:</label>
                <span>{selectedContact.full_name}</span>
              </div>
              <div className="contact-detail">
                <label>אימייל:</label>
                <span>
                  <a href={`mailto:${selectedContact.email}`}>{selectedContact.email}</a>
                </span>
              </div>
              <div className="contact-detail">
                <label>טלפון:</label>
                <span>{selectedContact.phone || 'לא סופק'}</span>
              </div>
              <div className="contact-detail">
                <label>נושא:</label>
                <span>{getSubjectLabel(selectedContact.subject)}</span>
              </div>
              <div className="contact-detail">
                <label>תאריך:</label>
                <span>{formatDate(selectedContact.created_at)}</span>
              </div>
              <div className="contact-detail full-width">
                <label>הודעה:</label>
                <p className="contact-message">{selectedContact.message}</p>
              </div>
            </div>
            <div className="modal-footer">
              <a
                href={`mailto:${selectedContact.email}?subject=תגובה לפנייתך - ${getSubjectLabel(selectedContact.subject)}`}
                className="btn-reply"
              >
                <i className="fas fa-reply"></i>
                שלח תגובה
              </a>
              <button className="btn-close" onClick={closeContactModal}>
                סגור
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminContacts;
