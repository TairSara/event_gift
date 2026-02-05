import { useState, useEffect } from 'react';
import { Routes, Route, NavLink, useNavigate } from 'react-router-dom';
import axios from 'axios';
import './AdminStyles.css';

// Tab Components
import DashboardTab from './tabs/DashboardTab';
import UsersTab from './tabs/UsersTab';
import EventsTab from './tabs/EventsTab';
import PackagesTab from './tabs/PackagesTab';
import GuestsTab from './tabs/GuestsTab';
import GiftsTab from './tabs/GiftsTab';
import MessagesTab from './tabs/MessagesTab';
import ScheduledMessagesTab from './tabs/ScheduledMessagesTab';

export default function AdminPanel() {
  const navigate = useNavigate();
  const [adminUser, setAdminUser] = useState(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    const stored = localStorage.getItem('adminUser');
    if (stored) {
      setAdminUser(JSON.parse(stored));
    }
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const response = await axios.get('/api/admin/dashboard/stats', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStats(response.data);
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminUser');
    localStorage.removeItem('isAdmin');
    navigate('/admin/login');
  };

  const menuItems = [
    { path: 'dashboard', icon: 'dashboard', label: 'דאשבורד', badge: null },
    { path: 'users', icon: 'users', label: 'משתמשים', badge: stats?.users?.total },
    { path: 'events', icon: 'calendar', label: 'אירועים', badge: stats?.events?.active },
    { path: 'packages', icon: 'package', label: 'חבילות', badge: stats?.packages?.active },
    { path: 'guests', icon: 'people', label: 'אורחים', badge: stats?.guests?.total },
    { path: 'gifts', icon: 'gift', label: 'מתנות', badge: stats?.gifts?.count },
    { path: 'messages', icon: 'mail', label: 'פניות', badge: null },
    { path: 'scheduled', icon: 'clock', label: 'הודעות מתוזמנות', badge: null },
  ];

  const getIcon = (name) => {
    const icons = {
      dashboard: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="3" width="7" height="7" rx="1"/>
          <rect x="14" y="3" width="7" height="7" rx="1"/>
          <rect x="3" y="14" width="7" height="7" rx="1"/>
          <rect x="14" y="14" width="7" height="7" rx="1"/>
        </svg>
      ),
      users: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
          <circle cx="9" cy="7" r="4"/>
          <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
          <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
        </svg>
      ),
      calendar: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
          <line x1="16" y1="2" x2="16" y2="6"/>
          <line x1="8" y1="2" x2="8" y2="6"/>
          <line x1="3" y1="10" x2="21" y2="10"/>
        </svg>
      ),
      package: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M16.5 9.4l-9-5.19"/>
          <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
          <path d="M3.27 6.96L12 12.01l8.73-5.05"/>
          <line x1="12" y1="22.08" x2="12" y2="12"/>
        </svg>
      ),
      people: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
          <circle cx="9" cy="7" r="4"/>
          <path d="M22 21v-2a4 4 0 0 0-3-3.87"/>
          <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
        </svg>
      ),
      gift: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="20 12 20 22 4 22 4 12"/>
          <rect x="2" y="7" width="20" height="5"/>
          <line x1="12" y1="22" x2="12" y2="7"/>
          <path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/>
          <path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/>
        </svg>
      ),
      mail: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
          <polyline points="22,6 12,13 2,6"/>
        </svg>
      ),
      clock: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10"/>
          <polyline points="12 6 12 12 16 14"/>
        </svg>
      ),
      logout: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
          <polyline points="16 17 21 12 16 7"/>
          <line x1="21" y1="12" x2="9" y2="12"/>
        </svg>
      ),
      menu: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="3" y1="12" x2="21" y2="12"/>
          <line x1="3" y1="6" x2="21" y2="6"/>
          <line x1="3" y1="18" x2="21" y2="18"/>
        </svg>
      ),
    };
    return icons[name] || null;
  };

  return (
    <div className="admin-panel">
      {/* Sidebar */}
      <aside className={`admin-sidebar ${sidebarCollapsed ? 'collapsed' : ''}`}>
        <div className="sidebar-header">
          <div className="logo-section">
            <div className="logo-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2L2 7l10 5 10-5-10-5z"/>
                <path d="M2 17l10 5 10-5"/>
                <path d="M2 12l10 5 10-5"/>
              </svg>
            </div>
            {!sidebarCollapsed && <span className="logo-text">Admin Panel</span>}
          </div>
          <button
            className="collapse-btn"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          >
            {getIcon('menu')}
          </button>
        </div>

        <nav className="sidebar-nav">
          {menuItems.map((item) => (
            <NavLink
              key={item.path}
              to={`/admin/${item.path}`}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            >
              <span className="nav-icon">{getIcon(item.icon)}</span>
              {!sidebarCollapsed && (
                <>
                  <span className="nav-label">{item.label}</span>
                  {item.badge !== null && item.badge > 0 && (
                    <span className="nav-badge">{item.badge}</span>
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          {!sidebarCollapsed && adminUser && (
            <div className="user-info">
              <div className="user-avatar">
                {adminUser.full_name?.charAt(0) || adminUser.email?.charAt(0) || 'A'}
              </div>
              <div className="user-details">
                <span className="user-name">{adminUser.full_name || 'Admin'}</span>
                <span className="user-role">{adminUser.role || 'מנהל'}</span>
              </div>
            </div>
          )}
          <button className="logout-btn" onClick={handleLogout}>
            {getIcon('logout')}
            {!sidebarCollapsed && <span>התנתקות</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="admin-main">
        <Routes>
          <Route path="dashboard" element={<DashboardTab />} />
          <Route path="users" element={<UsersTab />} />
          <Route path="events" element={<EventsTab />} />
          <Route path="packages" element={<PackagesTab />} />
          <Route path="guests" element={<GuestsTab />} />
          <Route path="gifts" element={<GiftsTab />} />
          <Route path="messages" element={<MessagesTab />} />
          <Route path="scheduled" element={<ScheduledMessagesTab />} />
          <Route path="*" element={<DashboardTab />} />
        </Routes>
      </main>
    </div>
  );
}
