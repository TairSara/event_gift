import { Navigate } from "react-router-dom";
import { useState, useEffect } from "react";
import axios from "axios";

/**
 * Protected Route for admin pages
 * Verifies JWT token with server before allowing access
 */
export default function ProtectedAdminRoute({ children }) {
  const [isVerifying, setIsVerifying] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const verifyAdminToken = async () => {
      const adminToken = localStorage.getItem('adminToken');
      const storedAdmin = localStorage.getItem('adminUser');
      const isAdmin = localStorage.getItem('isAdmin');

      // אם אין token, הפנה להתחברות
      if (!adminToken || !storedAdmin || isAdmin !== 'true') {
        setIsAuthenticated(false);
        setIsVerifying(false);
        return;
      }

      try {
        // בדיקת ה-token בצד השרת
        const response = await axios.get('/api/admin/check-session', {
          headers: {
            'Authorization': `Bearer ${adminToken}`
          }
        });

        if (response.data.is_admin) {
          setIsAuthenticated(true);
        } else {
          // Token לא תקין, נקה הכל
          localStorage.removeItem('adminToken');
          localStorage.removeItem('adminUser');
          localStorage.removeItem('isAdmin');
          setIsAuthenticated(false);
        }
      } catch (error) {
        console.error('Admin verification failed:', error);
        // Token לא תקין או פג תוקף, נקה הכל
        localStorage.removeItem('adminToken');
        localStorage.removeItem('adminUser');
        localStorage.removeItem('isAdmin');
        setIsAuthenticated(false);
      } finally {
        setIsVerifying(false);
      }
    };

    verifyAdminToken();
  }, []);

  // בזמן בדיקה, הצג טעינה בסגנון דארק
  if (isVerifying) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        flexDirection: 'column',
        gap: '1rem',
        background: '#0a0a0f',
        color: '#e4e4e7'
      }}>
        <div style={{
          width: '50px',
          height: '50px',
          border: '3px solid #2a2a3a',
          borderTopColor: '#6366f1',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite'
        }}></div>
        <div>מאמת גישה...</div>
        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  // אם לא מאומת, הפנה להתחברות
  if (!isAuthenticated) {
    return <Navigate to="/admin/login" replace />;
  }

  // אם מאומת, הצג את הדף
  return children;
}
