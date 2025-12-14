import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import '../styles/AdminSidebar.css';

const AdminSidebar = ({ isOpen, onClose }) => {
  const location = useLocation();

  const menuItems = [
    {
      icon: '📊',
      label: 'דשבורד',
      path: '/admin/dashboard',
      section: 'main'
    },
    {
      icon: '👥',
      label: 'ניהול משתמשים',
      path: '/admin/users',
      section: 'management'
    },
    {
      icon: '🎉',
      label: 'ניהול אירועים',
      path: '/admin/events',
      section: 'management'
    },
    {
      icon: '📦',
      label: 'חבילות ומנויים',
      path: '/admin/packages',
      section: 'management'
    },
    {
      icon: '📧',
      label: 'פניות לקוחות',
      path: '/admin/contacts',
      section: 'support',
      badge: 'new'
    },
    {
      icon: '💰',
      label: 'דוחות כספיים',
      path: '/admin/financial',
      section: 'reports'
    },
    {
      icon: '⚙️',
      label: 'הגדרות מערכת',
      path: '/admin/settings',
      section: 'system'
    }
  ];

  const sections = {
    main: 'תפריט ראשי',
    management: 'ניהול',
    support: 'תמיכה',
    reports: 'דוחות',
    system: 'מערכת'
  };

  const isActive = (path) => location.pathname === path;

  return (
    <>
      {/* Overlay for mobile */}
      {isOpen && (
        <div
          className="admin-sidebar-overlay"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside className={`admin-sidebar ${isOpen ? 'open' : ''}`}>
        {/* Logo Section */}
        <div className="admin-sidebar-header">
          <div className="admin-sidebar-logo">
            <span className="logo-icon">👑</span>
            <div className="logo-text">
              <h3>פאנל ניהול</h3>
              <p>SaveDay Events</p>
            </div>
          </div>
          <button className="mobile-close-btn" onClick={onClose}>
            ×
          </button>
        </div>

        {/* Navigation Menu */}
        <nav className="admin-sidebar-nav">
          {Object.entries(sections).map(([sectionKey, sectionLabel]) => (
            <div key={sectionKey} className="nav-section">
              <div className="nav-section-label">{sectionLabel}</div>
              {menuItems
                .filter(item => item.section === sectionKey)
                .map(item => (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`nav-item ${isActive(item.path) ? 'active' : ''}`}
                    onClick={onClose}
                  >
                    <span className="nav-icon">{item.icon}</span>
                    <span className="nav-label">{item.label}</span>
                    {item.badge && (
                      <span className="nav-badge">{item.badge}</span>
                    )}
                  </Link>
                ))}
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="admin-sidebar-footer">
          <Link to="/" className="back-to-site">
            <span className="icon">🏠</span>
            <span>חזור לאתר</span>
          </Link>
        </div>
      </aside>
    </>
  );
};

export default AdminSidebar;
