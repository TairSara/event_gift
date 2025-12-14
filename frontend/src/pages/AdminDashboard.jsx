import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import AdminSidebar from '../components/AdminSidebar';
import AdminNotificationBell from '../components/AdminNotificationBell';
import '../styles/AdminDashboard.css';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [adminUser, setAdminUser] = useState(null);
  const [stats, setStats] = useState(null);
  const [recentActivity, setRecentActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    checkAdminAccess();
  }, []);

  const checkAdminAccess = async () => {
    const storedAdmin = localStorage.getItem('adminUser');
    const adminToken = localStorage.getItem('adminToken');
    const isAdmin = localStorage.getItem('isAdmin');

    if (!storedAdmin || !adminToken || isAdmin !== 'true') {
      navigate('/admin/login');
      return;
    }

    try {
      const response = await axios.get('/api/admin/check-session', {
        headers: {
          'Authorization': `Bearer ${adminToken}`
        }
      });

      if (response.data.is_admin) {
        setAdminUser(response.data.user);
        await loadDashboardData();
      } else {
        throw new Error('Not authorized');
      }
    } catch (err) {
      console.error('Admin verification failed:', err);
      localStorage.removeItem('adminUser');
      localStorage.removeItem('adminToken');
      localStorage.removeItem('isAdmin');
      navigate('/admin/login');
    } finally {
      setLoading(false);
    }
  };

  const loadDashboardData = async () => {
    try {
      const [statsRes, activityRes] = await Promise.all([
        axios.get('/api/admin/dashboard/stats'),
        axios.get('/api/admin/activity/recent?limit=10')
      ]);

      setStats(statsRes.data);
      setRecentActivity(activityRes.data.activities);
    } catch (err) {
      console.error('Error loading dashboard data:', err);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('adminUser');
    localStorage.removeItem('adminToken');
    localStorage.removeItem('isAdmin');
    navigate('/admin/login');
  };

  const formatActivityType = (type) => {
    const types = {
      'user_registered': 'משתמש חדש נרשם',
      'event_created': 'אירוע חדש נוצר',
      'package_purchased': 'חבילה נרכשה'
    };
    return types[type] || type;
  };

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = Math.floor((now - date) / 1000 / 60); // minutes

    if (diff < 1) return 'עכשיו';
    if (diff < 60) return `לפני ${diff} דקות`;
    if (diff < 1440) return `לפני ${Math.floor(diff / 60)} שעות`;
    return `לפני ${Math.floor(diff / 1440)} ימים`;
  };

  if (loading) {
    return (
      <div className="admin-loading">
        <div className="loading-spinner"></div>
        <p>טוען פאנל ניהול...</p>
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
                <h1>דשבורד ניהול</h1>
                <p className="header-subtitle">סקירה כללית של המערכת</p>
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

        {/* Main Dashboard */}
        <div className="dashboard-main">
          {/* Statistics Cards */}
          <div className="stats-grid">
            {/* Users Stats */}
            <div className="stat-card stat-users">
              <div className="stat-header">
                <div className="stat-icon">👥</div>
                <div className="stat-info">
                  <h3>משתמשים רשומים</h3>
                  <p className="stat-number">{stats?.users?.total || 0}</p>
                </div>
              </div>
              <div className="stat-footer">
                <span className="stat-change positive">+{stats?.users?.new_week || 0}</span>
                <span className="stat-label">השבוע</span>
              </div>
            </div>

            {/* Events Stats */}
            <div className="stat-card stat-events">
              <div className="stat-header">
                <div className="stat-icon">🎉</div>
                <div className="stat-info">
                  <h3>אירועים פעילים</h3>
                  <p className="stat-number">{stats?.events?.active || 0}</p>
                </div>
              </div>
              <div className="stat-footer">
                <span className="stat-label">סה"כ: {stats?.events?.total || 0}</span>
              </div>
            </div>

            {/* Packages Stats */}
            <div className="stat-card stat-packages">
              <div className="stat-header">
                <div className="stat-icon">📦</div>
                <div className="stat-info">
                  <h3>חבילות פעילות</h3>
                  <p className="stat-number">{stats?.packages?.active || 0}</p>
                </div>
              </div>
              <div className="stat-footer">
                <span className="stat-label">סה"כ נרכשו: {stats?.packages?.total || 0}</span>
              </div>
            </div>

            {/* Financial Stats */}
            <div className="stat-card stat-financial">
              <div className="stat-header">
                <div className="stat-icon">💰</div>
                <div className="stat-info">
                  <h3>סך מתנות</h3>
                  <p className="stat-number">₪{stats?.gifts?.total_amount?.toLocaleString() || 0}</p>
                </div>
              </div>
              <div className="stat-footer">
                <span className="stat-label">{stats?.gifts?.count || 0} מתנות</span>
              </div>
            </div>
          </div>

          {/* Quick Stats Row */}
          <div className="quick-stats">
            <div className="quick-stat-item">
              <span className="quick-stat-label">אירועים חדשים השבוע</span>
              <span className="quick-stat-value">{stats?.events?.new_week || 0}</span>
            </div>
            <div className="quick-stat-item">
              <span className="quick-stat-label">אישורי הגעה</span>
              <span className="quick-stat-value">{stats?.guests?.confirmed || 0}</span>
            </div>
            <div className="quick-stat-item">
              <span className="quick-stat-label">סה"כ אורחים</span>
              <span className="quick-stat-value">{stats?.guests?.total || 0}</span>
            </div>
            <div className="quick-stat-item">
              <span className="quick-stat-label">אירועים שהסתיימו</span>
              <span className="quick-stat-value">{stats?.events?.completed || 0}</span>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="activity-section">
            <h2>פעילות אחרונה</h2>
            <div className="activity-list">
              {recentActivity.length > 0 ? (
                recentActivity.map((activity, index) => (
                  <div key={index} className="activity-item">
                    <div className="activity-icon">
                      {activity.type === 'user_registered' && '👤'}
                      {activity.type === 'event_created' && '🎉'}
                      {activity.type === 'package_purchased' && '📦'}
                    </div>
                    <div className="activity-details">
                      <p className="activity-type">{formatActivityType(activity.type)}</p>
                      <p className="activity-info">{activity.details}</p>
                    </div>
                    <div className="activity-time">
                      {formatTimestamp(activity.timestamp)}
                    </div>
                  </div>
                ))
              ) : (
                <p className="no-activity">אין פעילות לאחרונה</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
