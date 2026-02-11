import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useNotification } from "../hooks/useNotification";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import "./ForgotPassword.css";

export default function VerifyEmail() {
  const navigate = useNavigate();
  const location = useLocation();
  const { showSuccess, showError } = useNotification();
  const [code, setCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const email = location.state?.email;
  const hasSelectedPackage = location.state?.hasSelectedPackage;

  // הגנה: אם אין מייל - חזור לדף הרשמה
  useEffect(() => {
    if (!email) {
      navigate('/register');
    }
  }, [email, navigate]);

  const handleVerifyEmail = async (e) => {
    e.preventDefault();

    if (code.length !== 6) {
      showError('הזן קוד בן 6 ספרות');
      return;
    }

    setIsLoading(true);

    const API_URL = import.meta.env.VITE_API_URL || 'https://event-gift.onrender.com/api';

    try {
      const response = await fetch(`${API_URL}/auth/verify-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, code }),
      });

      const data = await response.json();

      if (!response.ok || !data.valid) {
        throw new Error(data.detail || 'קוד אימות שגוי');
      }

      showSuccess('המייל אומת בהצלחה! מעביר אותך להתחברות...', 3000);

      // עבור להתחברות
      setTimeout(() => {
        navigate('/login', {
          state: {
            message: 'המייל אומת בהצלחה! כעת תוכל להתחבר.',
            hasSelectedPackage
          }
        });
      }, 2000);
    } catch (err) {
      console.error('Error:', err);
      showError(err.message || 'קוד שגוי, נסה שוב');
      setCode('');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendCode = async () => {
    setIsLoading(true);

    const API_URL = import.meta.env.VITE_API_URL || 'https://event-gift.onrender.com/api';

    try {
      const response = await fetch(`${API_URL}/auth/resend-verification-code`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'שגיאה בשליחת קוד חדש');
      }

      showSuccess('קוד חדש נשלח למייל שלך!', 3000);
    } catch (err) {
      console.error('Error:', err);
      showError(err.message || 'אירעה שגיאה');
    } finally {
      setIsLoading(false);
    }
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
              <i className="fas fa-envelope-open-text"></i>
            </div>
            <h1>אמת את המייל שלך</h1>
            <p className="forgot-subtitle">
              שלחנו קוד בן 6 ספרות לכתובת: <strong>{email}</strong>
            </p>
            <p style={{
              fontSize: '14px',
              color: '#666',
              marginTop: '15px',
              lineHeight: '1.6'
            }}>
              בדוק את תיבת הדואר שלך (כולל תיקיית הספאם) ותמצא מייל עם קוד האימות.
            </p>
          </div>

          <form onSubmit={handleVerifyEmail} className="forgot-form">
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
                  אמת מייל
                </>
              )}
            </button>

            <div className="forgot-back" style={{ marginTop: '20px' }}>
              <button
                type="button"
                onClick={handleResendCode}
                className="back-btn"
                style={{ width: '100%' }}
                disabled={isLoading}
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
