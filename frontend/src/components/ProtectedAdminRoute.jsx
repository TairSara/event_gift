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

  // בזמן בדיקה, הצג טעינה
  if (isVerifying) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        flexDirection: 'column',
        gap: '1rem'
      }}>
        <div style={{ fontSize: '2rem' }}>🔐</div>
        <div>מאמת גישה...</div>
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
