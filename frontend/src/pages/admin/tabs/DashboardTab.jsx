import { useState, useEffect } from 'react';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://event-gift.onrender.com/api';

export default function DashboardTab() {
  const [stats, setStats] = useState(null);
  const [recentActivity, setRecentActivity] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const headers = { Authorization: `Bearer ${token}` };

      const [statsRes, activityRes] = await Promise.all([
        fetch(`${API_BASE_URL}/admin/dashboard/stats`, { headers }),
        fetch(`${API_BASE_URL}/admin/activity/recent?limit=10`, { headers })
      ]);

      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
      }
      if (activityRes.ok) {
        const activityData = await activityRes.json();
        setRecentActivity(activityData.activities || []);
      }
    } catch (err) {
      console.error('Failed to fetch dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatNumber = (num) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num?.toLocaleString() || '0';
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('he-IL', {
      style: 'currency',
      currency: 'ILS',
      minimumFractionDigits: 0
    }).format(amount || 0);
  };

  const getActivityIcon = (type) => {
    const icons = {
      user_registered: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
          <circle cx="8.5" cy="7" r="4"/>
          <line x1="20" y1="8" x2="20" y2="14"/>
          <line x1="23" y1="11" x2="17" y2="11"/>
        </svg>
      ),
      event_created: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
          <line x1="16" y1="2" x2="16" y2="6"/>
          <line x1="8" y1="2" x2="8" y2="6"/>
          <line x1="3" y1="10" x2="21" y2="10"/>
        </svg>
      ),
      package_purchased: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
          <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
          <line x1="12" y1="22.08" x2="12" y2="12"/>
        </svg>
      )
    };
    return icons[type] || icons.user_registered;
  };

  const getActivityText = (activity) => {
    const texts = {
      user_registered: 'משתמש חדש נרשם',
      event_created: 'אירוע חדש נוצר',
      package_purchased: 'חבילה נרכשה'
    };
    return texts[activity.type] || activity.type;
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;

    if (diff < 60000) return 'לפני רגע';
    if (diff < 3600000) return `לפני ${Math.floor(diff / 60000)} דקות`;
    if (diff < 86400000) return `לפני ${Math.floor(diff / 3600000)} שעות`;
    return date.toLocaleDateString('he-IL');
  };

  if (loading) {
    return (
      <div className="admin-page">
        <div className="admin-loading">
          <div className="loading-spinner"></div>
          <p>טוען נתונים...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <h1>דאשבורד</h1>
        <p>סקירה כללית של המערכת</p>
      </div>

      {/* Stats Grid */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon primary">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
          </div>
          <div className="stat-content">
            <div className="stat-label">משתמשים</div>
            <div className="stat-value">{formatNumber(stats?.users?.total)}</div>
            {stats?.users?.new_week > 0 && (
              <div className="stat-change positive">+{stats.users.new_week} השבוע</div>
            )}
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon success">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
              <line x1="16" y1="2" x2="16" y2="6"/>
              <line x1="8" y1="2" x2="8" y2="6"/>
              <line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
          </div>
          <div className="stat-content">
            <div className="stat-label">אירועים פעילים</div>
            <div className="stat-value">{formatNumber(stats?.events?.active)}</div>
            <div className="stat-change">מתוך {stats?.events?.total} סה"כ</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon warning">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
              <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
              <line x1="12" y1="22.08" x2="12" y2="12"/>
            </svg>
          </div>
          <div className="stat-content">
            <div className="stat-label">חבילות פעילות</div>
            <div className="stat-value">{formatNumber(stats?.packages?.active)}</div>
            <div className="stat-change">מתוך {stats?.packages?.total} נרכשו</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon success">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="20 12 20 22 4 22 4 12"/>
              <rect x="2" y="7" width="20" height="5"/>
              <line x1="12" y1="22" x2="12" y2="7"/>
              <path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/>
              <path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/>
            </svg>
          </div>
          <div className="stat-content">
            <div className="stat-label">סה"כ מתנות</div>
            <div className="stat-value">{formatCurrency(stats?.gifts?.total_amount)}</div>
            <div className="stat-change">{stats?.gifts?.count} מתנות</div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="admin-card">
        <div className="admin-card-header">
          <h2>פעילות אחרונה</h2>
        </div>
        <div className="admin-table-wrapper">
          {recentActivity.length > 0 ? (
            <table className="admin-table">
              <thead>
                <tr>
                  <th>פעולה</th>
                  <th>פרטים</th>
                  <th>זמן</th>
                </tr>
              </thead>
              <tbody>
                {recentActivity.map((activity, index) => (
                  <tr key={index}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div className={`stat-icon ${activity.type === 'user_registered' ? 'primary' : activity.type === 'event_created' ? 'success' : 'warning'}`} style={{ width: '36px', height: '36px' }}>
                          <div style={{ width: '18px', height: '18px' }}>
                            {getActivityIcon(activity.type)}
                          </div>
                        </div>
                        <span>{getActivityText(activity)}</span>
                      </div>
                    </td>
                    <td>{activity.details}</td>
                    <td style={{ color: 'var(--admin-text-muted)' }}>{formatTime(activity.timestamp)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="admin-empty">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              <p>אין פעילות אחרונה</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
