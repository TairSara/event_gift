import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import "./AdminNotificationBell.css";

export default function AdminNotificationBell() {
  const navigate = useNavigate();
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Fetch unread count
  const fetchUnreadCount = async () => {
    try {
      const response = await fetch(
        "http://localhost:8001/api/admin/contacts/unread-count"
      );
      if (response.ok) {
        const data = await response.json();
        setUnreadCount(data.unread_count);
      }
    } catch (error) {
      console.error('Error fetching unread contacts count:', error);
    }
  };

  // Handle notification click
  const handleNotificationClick = () => {
    navigate('/admin/contacts');
    setIsOpen(false);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Fetch unread count on mount and periodically
  useEffect(() => {
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 30000); // Every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const toggleDropdown = () => {
    setIsOpen(!isOpen);
  };

  return (
    <div className="admin-notification-bell-container" ref={dropdownRef}>
      <button className="admin-notification-bell-button" onClick={toggleDropdown}>
        <i className="fas fa-bell"></i>
        {unreadCount > 0 && (
          <span className="admin-notification-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>
        )}
      </button>

      {isOpen && (
        <div className="admin-notification-dropdown">
          <div className="admin-notification-header">
            <h3>פניות לקוחות חדשות</h3>
          </div>

          <div className="admin-notification-list">
            {unreadCount === 0 ? (
              <div className="no-notifications">
                <i className="fas fa-check-circle"></i>
                <p>אין פניות חדשות</p>
              </div>
            ) : (
              <div
                className="notification-item clickable"
                onClick={handleNotificationClick}
              >
                <div className="notification-icon">
                  <i className="fas fa-envelope"></i>
                </div>
                <div className="notification-content">
                  <div className="notification-title">
                    {unreadCount} {unreadCount === 1 ? 'פנייה חדשה' : 'פניות חדשות'}
                  </div>
                  <div className="notification-message">
                    לחץ כאן לצפייה בכל הפניות
                  </div>
                </div>
                <div className="notification-arrow">
                  <i className="fas fa-chevron-left"></i>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
