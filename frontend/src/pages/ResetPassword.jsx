import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useNotification } from "../hooks/useNotification";
import Navbar from "../components/Navbar";
import "./ForgotPassword.css";

export default function ResetPassword() {
  const navigate = useNavigate();
  const location = useLocation();
  const { showSuccess, showError } = useNotification();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const email = location.state?.email;
  const code = location.state?.code;

  // 🔒 הגנה: אם אין מייל או קוד - חזור לדף ראשון
  useEffect(() => {
    console.log('ResetPassword mounted with:', {
      hasEmail: !!email,
      hasCode: !!code,
      email,
      locationState: location.state
    });

    if (!email || !code) {
      console.warn('Missing email or code, redirecting to forgot-password');
      navigate('/forgot-password');
    }
  }, [email, code, navigate]);

  const handleResetPassword = async (e) => {
    e.preventDefault();

    if (newPassword.length < 8) {
      showError("הסיסמה חייבת להכיל לפחות 8 תווים");
      return;
    }

    if (newPassword !== confirmPassword) {
      showError("הסיסמאות אינן תואמות");
      return;
    }

    setIsLoading(true);

    try {
      const API_URL = import.meta.env.VITE_API_URL || 'https://event-gift.onrender.com/api';
      const response = await fetch(`${API_URL}/auth/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          code,
          new_password: newPassword
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        console.error('Server response error:', {
          status: response.status,
          statusText: response.statusText,
          data
        });
        throw new Error(data.detail || `שגיאה באיפוס הסיסמה (${response.status})`);
      }

      showSuccess('הסיסמה אופסה בהצלחה! מעביר אותך להתחברות...', 3000);

      // מחכה קצת ועובר להתחברות
      setTimeout(() => {
        navigate('/login', { state: { message: 'הסיסמה אופסה בהצלחה, התחבר כעת.' } });
      }, 2000);
    } catch (err) {
      console.error('Reset password error:', {
        message: err.message,
        error: err,
        email,
        hasCode: !!code
      });
      showError(err.message || 'אירעה שגיאה, נסה שוב מאוחר יותר');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="forgot-password-page">
      {/* Navigation */}
      <Navbar />

      {/* Main Content */}
      <div className="forgot-container">
        <div className="forgot-card">
          <div className="forgot-header">
            <div className="forgot-icon">
              <i className="fas fa-lock"></i>
            </div>
            <h1>הגדר סיסמה חדשה</h1>
            <p className="forgot-subtitle">
              בחר סיסמה חזקה ומאובטחת לחשבון שלך
            </p>
          </div>

          <form onSubmit={handleResetPassword} className="forgot-form">
            <div className="form-group">
              <label htmlFor="newPassword">
                <i className="fas fa-key"></i>
                סיסמה חדשה
              </label>
              <input
                type="password"
                id="newPassword"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="לפחות 8 תווים"
                required
                minLength="8"
                disabled={isLoading}
              />
            </div>

            <div className="form-group">
              <label htmlFor="confirmPassword">
                <i className="fas fa-check"></i>
                אימות סיסמה
              </label>
              <input
                type="password"
                id="confirmPassword"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="הכנס סיסמה שוב"
                required
                minLength="8"
                disabled={isLoading}
              />
            </div>

            {newPassword && confirmPassword && newPassword !== confirmPassword && (
              <div style={{
                color: '#e74c3c',
                fontSize: '14px',
                marginBottom: '15px',
                textAlign: 'center'
              }}>
                הסיסמאות אינן תואמות
              </div>
            )}

            <button
              type="submit"
              className="forgot-btn-primary"
              disabled={isLoading || !newPassword || !confirmPassword}
            >
              {isLoading ? (
                <>
                  <i className="fas fa-spinner fa-spin"></i>
                  שומר סיסמה...
                </>
              ) : (
                <>
                  <i className="fas fa-check-circle"></i>
                  שמור סיסמה חדשה
                </>
              )}
            </button>

            <div className="security-tips" style={{
              marginTop: '25px',
              padding: '15px',
              background: '#f8f9fa',
              borderRadius: '8px',
              fontSize: '13px'
            }}>
              <h4 style={{ margin: '0 0 10px 0', color: '#8B6F47' }}>
                <i className="fas fa-info-circle"></i> טיפים לסיסמה חזקה:
              </h4>
              <ul style={{ margin: 0, paddingRight: '20px', lineHeight: '1.8' }}>
                <li>לפחות 8 תווים</li>
                <li>שילוב של אותיות גדולות וקטנות</li>
                <li>מספרים ותווים מיוחדים</li>
                <li>אל תשתמש בסיסמאות ישנות</li>
              </ul>
            </div>
          </form>
        </div>
      </div>

      {/* Footer */}
      <footer className="forgot-footer">
        <p>&copy; 2025 Save the Day. כל הזכויות שמורות.</p>
      </footer>
    </div>
  );
}
