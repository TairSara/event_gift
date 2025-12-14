import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useNotification } from "../hooks/useNotification";
import Navbar from "../components/Navbar";
import "./ForgotPassword.css";

export default function ForgotPassword() {
  const navigate = useNavigate();
  const { showSuccess, showError } = useNotification();
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [debugCode, setDebugCode] = useState("");

  const handleRequestCode = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch('http://localhost:8001/api/auth/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'שגיאה בשליחת קוד האימות');
      }

      // שמירה של הקוד לדיבאג (רק בפיתוח!)
      if (data.code) {
        setDebugCode(data.code);
        showSuccess(`קוד אימות נשלח למייל שלך! (קוד לדיבאג: ${data.code})`, 8000);
      } else {
        showSuccess('קוד אימות נשלח למייל שלך!', 3000);
      }

      // המתן שנייה ועבור לדף אימות קוד
      setTimeout(() => {
        navigate('/verify-code', { state: { email, debugCode: data.code } });
      }, 2000);
    } catch (err) {
      console.error('Error:', err);
      showError(err.message || 'אירעה שגיאה, נסה שוב מאוחר יותר');
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
              <i className="fas fa-key"></i>
            </div>
            <h1>שכחת סיסמה?</h1>
            <p className="forgot-subtitle">
              הזן את המייל שלך ונשלח לך קוד אימות
            </p>
          </div>

          <form onSubmit={handleRequestCode} className="forgot-form">
            <div className="form-group">
              <label htmlFor="email">
                <i className="fas fa-envelope"></i>
                אימייל
              </label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="example@mail.com"
                required
                disabled={isLoading}
              />
            </div>

            <button type="submit" className="forgot-btn-primary" disabled={isLoading}>
              {isLoading ? (
                <>
                  <i className="fas fa-spinner fa-spin"></i>
                  שולח קוד...
                </>
              ) : (
                <>
                  <i className="fas fa-paper-plane"></i>
                  שלח קוד אימות
                </>
              )}
            </button>

            <div className="forgot-back">
              <button
                type="button"
                onClick={() => navigate('/login')}
                className="back-btn"
              >
                <i className="fas fa-arrow-right"></i>
                חזרה להתחברות
              </button>
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
