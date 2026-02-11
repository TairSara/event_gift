import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useNotification } from "../hooks/useNotification";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import "./ForgotPassword.css";

export default function ForgotPassword() {
  const navigate = useNavigate();
  const { showSuccess, showError } = useNotification();
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleRequestCode = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const API_URL = import.meta.env.VITE_API_URL || 'https://event-gift.onrender.com/api';
      const response = await fetch(`${API_URL}/auth/forgot-password`, {
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

      showSuccess('קוד אימות נשלח למייל שלך!', 3000);

      // המתן שנייה ועבור לדף אימות קוד
      setTimeout(() => {
        navigate('/verify-code', { state: { email } });
      }, 2000);
    } catch (err) {
      console.error('Error:', err);
      const errorMessage = typeof err === 'string'
        ? err
        : err?.message || err?.detail || 'אירעה שגיאה, נסה שוב מאוחר יותר';
      showError(errorMessage);
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

      <Footer />
    </div>
  );
}
