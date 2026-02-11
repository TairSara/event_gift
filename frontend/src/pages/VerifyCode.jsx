import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useNotification } from "../hooks/useNotification";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import "./ForgotPassword.css";

export default function VerifyCode() {
  const navigate = useNavigate();
  const location = useLocation();
  const { showSuccess, showError } = useNotification();
  const [code, setCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const email = location.state?.email;
  const debugCode = location.state?.debugCode; // קוד לדיבאג

  // 🔒 הגנה: אם אין מייל - חזור לדף ראשון
  useEffect(() => {
    if (!email) {
      navigate('/forgot-password');
    }
  }, [email, navigate]);

  const handleVerifyCode = async (e) => {
    e.preventDefault();

    if (code.length !== 6) {
      showError('הזן קוד בן 6 ספרות');
      return;
    }

    setIsLoading(true);

    try {
      const API_URL = import.meta.env.VITE_API_URL || 'https://event-gift.onrender.com/api';
      const response = await fetch(`${API_URL}/auth/verify-reset-code`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, code }),
      });

      const data = await response.json();

      if (!response.ok || !data.valid) {
        console.error('Verification failed:', {
          status: response.status,
          statusText: response.statusText,
          data
        });
        throw new Error(data.detail || 'קוד אימות שגוי');
      }

      console.log('Code verified successfully, navigating to reset-password with:', { email, code: '***' });
      showSuccess('קוד אומת בהצלחה!', 2000);

      // ✅ עבור לדף איפוס סיסמה עם המייל והקוד
      setTimeout(() => {
        navigate('/reset-password', { state: { email, code } });
      }, 1500);
    } catch (err) {
      console.error('Verify code error:', {
        message: err.message,
        error: err,
        email
      });
      showError(err.message || 'קוד שגוי, נסה שוב');
      setCode('');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendCode = () => {
    navigate('/forgot-password', { state: { email } });
  };

  return (
    <div className="forgot-password-page">
      {/* Navigation */}
      <Navbar />

      {/* Confetti Background */}
      <div className="forgot-confetti-container">
        {Array.from({ length: 40 }).map((_, i) => (
          <div
            key={i}
            className="forgot-confetti"
            style={{
              left: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 3}s`,
              animationDuration: `${3 + Math.random() * 2}s`,
              backgroundColor: [
                '#6B5638',
                '#8B6F47',
                '#C9A887',
                '#4ECDC4',
                '#FFFFFF',
                '#F5F5F5'
              ][Math.floor(Math.random() * 6)]
            }}
          />
        ))}
      </div>

      {/* Main Content */}
      <div className="forgot-container">
        <div className="forgot-card">
          <div className="forgot-header">
            <div className="forgot-icon">
              <i className="fas fa-shield-alt"></i>
            </div>
            <h1>הזן קוד אימות</h1>
            <p className="forgot-subtitle">
              שלחנו קוד בן 6 ספרות לכתובת: <strong>{email}</strong>
            </p>
            {debugCode && (
              <div style={{
                background: '#fff3cd',
                border: '1px solid #ffc107',
                padding: '10px',
                borderRadius: '8px',
                marginTop: '15px',
                fontSize: '14px'
              }}>
                <strong>⚠️ מצב פיתוח:</strong> הקוד הוא <strong style={{fontSize: '18px', color: '#8B6F47'}}>{debugCode}</strong>
              </div>
            )}
          </div>

          <form onSubmit={handleVerifyCode} className="forgot-form">
            <div className="form-group">
              <label htmlFor="code">
                <i className="fas fa-key"></i>
                קוד אימות
              </label>
              <input
                type="text"
                id="code"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                required
                maxLength="6"
                disabled={isLoading}
                style={{
                  fontSize: '24px',
                  textAlign: 'center',
                  letterSpacing: '8px',
                  fontWeight: 'bold'
                }}
              />
            </div>

            <button type="submit" className="forgot-btn-primary" disabled={isLoading || code.length !== 6}>
              {isLoading ? (
                <>
                  <i className="fas fa-spinner fa-spin"></i>
                  מאמת קוד...
                </>
              ) : (
                <>
                  <i className="fas fa-check-circle"></i>
                  אמת קוד
                </>
              )}
            </button>

            <div className="forgot-back" style={{ marginTop: '20px' }}>
              <button
                type="button"
                onClick={handleResendCode}
                className="back-btn"
                style={{ width: '100%' }}
              >
                <i className="fas fa-redo"></i>
                שלח קוד חדש
              </button>
            </div>
          </form>
        </div>
      </div>

      <Footer />
    </div>
  );
}
