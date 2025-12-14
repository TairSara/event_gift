import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { authAPI } from "../services/api";
import { useNotification } from "../hooks/useNotification";
import Navbar from "../components/Navbar";
import GoogleLoginButton from "../components/GoogleLoginButton";
import "./Registert.css";

export default function Registert() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login: authLogin } = useAuth();
  const { showSuccess, showError, NotificationComponent } = useNotification();
  const [isLogin, setIsLogin] = useState(location.pathname === '/login');
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    fullName: "",
    phone: ""
  });
  const [rememberMe, setRememberMe] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(location.state?.message || null);
  const [selectedPackage, setSelectedPackage] = useState(null);
  const hasSelectedPackageFromState = location.state?.hasSelectedPackage;

  // Update isLogin based on the current path
  useEffect(() => {
    setIsLogin(location.pathname === '/login');
  }, [location.pathname]);

  // בדיקה אם יש חבילה שנבחרה
  useEffect(() => {
    const packageData = localStorage.getItem('selectedPackage');
    if (packageData) {
      try {
        const parsed = JSON.parse(packageData);
        // בדיקה שהמידע לא ישן מדי (24 שעות)
        const hoursPassed = (new Date().getTime() - parsed.timestamp) / (1000 * 60 * 60);
        if (hoursPassed < 24) {
          setSelectedPackage(parsed);
        } else {
          localStorage.removeItem('selectedPackage');
        }
      } catch (err) {
        console.error('Error parsing selected package:', err);
        localStorage.removeItem('selectedPackage');
      }
    }
  }, []);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!isLogin && formData.password !== formData.confirmPassword) {
      setError("הסיסמאות אינן תואמות");
      return;
    }

    if (!isLogin && !agreedToTerms) {
      setError("יש לאשר את תנאי השימוש והמדיניות");
      return;
    }

    setIsLoading(true);

    try {
      if (isLogin) {
        // Login
        const response = await authAPI.login(formData.email, formData.password);
        console.log("Login successful:", response);
        showSuccess("התחברת בהצלחה!");
        // שמירת המשתמש ב-Context (עם remember me)
        authLogin(response, rememberMe);

        // בדיקה אם יש חבילה שנבחרה
        const packageData = localStorage.getItem('selectedPackage');
        if (packageData && hasSelectedPackageFromState) {
          try {
            const parsed = JSON.parse(packageData);
            setTimeout(() => navigate(`/dashboard?activatePackage=${parsed.packageId}`), 1000);
          } catch (err) {
            console.error('Error parsing package:', err);
            setTimeout(() => navigate("/"), 1000);
          }
        } else {
          setTimeout(() => navigate("/"), 1000);
        }
      } else {
        // Register
        const response = await authAPI.register(formData);
        console.log("Registration successful:", response);

        showSuccess('נרשמת בהצלחה! נשלח קוד אימות למייל שלך', 3000);

        // ניתוב לדף אימות מייל
        setTimeout(() => {
          navigate("/verify-email", {
            state: {
              email: formData.email,
              hasSelectedPackage: !!selectedPackage
            }
          });
        }, 2000);
      }
    } catch (err) {
      console.error("Error:", err);
      showError(err.message || "אירעה שגיאה, נסה שוב מאוחר יותר");
    } finally {
      setIsLoading(false);
    }
  };


  return (
    <div className="register-page">
      {NotificationComponent}
      {/* Confetti Background */}
      <div className="register-confetti-container">
        {Array.from({ length: 40 }).map((_, i) => (
          <div
            key={i}
            className="register-confetti"
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

      {/* Navigation */}
      <Navbar />

      {/* Main Content */}
      <div className="register-container">
        <div className="register-card">
          <div className="register-header">
            <h1>{isLogin ? "התחברות" : "הרשמה"}</h1>
            <p className="register-subtitle">
              {isLogin
                ? "ברוכים השבים! התחבר כדי להמשיך"
                : "הצטרף אלינו וצור את ההזמנה המושלמת"}
            </p>
          </div>

          {selectedPackage && (
            <div className="selected-package-info">
              <i className="fas fa-gift"></i>
              <span>החבילה שבחרת: <strong>{selectedPackage.packageName}</strong></span>
              <p style={{ fontSize: '0.85rem', marginTop: '0.5rem', color: '#666' }}>
                {isLogin ? 'לאחר ההתחברות תועבר לעמוד התשלום' : 'לאחר ההרשמה והאימות תועבר לעמוד התשלום'}
              </p>
            </div>
          )}

          {successMessage && (
            <div className="success-message">
              <i className="fas fa-check-circle"></i>
              {successMessage}
            </div>
          )}

          {error && (
            <div className="error-message">
              <i className="fas fa-exclamation-circle"></i>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="register-form">
            {!isLogin && (
              <div className="form-group">
                <label htmlFor="fullName">שם מלא</label>
                <input
                  type="text"
                  id="fullName"
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleChange}
                  placeholder="הכנס את שמך המלא"
                  required={!isLogin}
                />
              </div>
            )}

            {!isLogin && (
              <div className="form-group">
                <label htmlFor="phone">טלפון</label>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="050-1234567"
                  required={!isLogin}
                />
              </div>
            )}

            <div className="form-group">
              <label htmlFor="email">אימייל</label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="example@mail.com"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="password">סיסמה</label>
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="הכנס סיסמה"
                required
              />
            </div>

            {!isLogin && (
              <div className="form-group">
                <label htmlFor="confirmPassword">אימות סיסמה</label>
                <input
                  type="password"
                  id="confirmPassword"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder="הכנס סיסמה שוב"
                  required={!isLogin}
                />
              </div>
            )}

            {isLogin && (
              <div className="form-footer-row">
                <label className="remember-me-label">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                  />
                  <span>זכור אותי</span>
                </label>
                <button
                  type="button"
                  onClick={() => navigate('/forgot-password')}
                  className="forgot-password"
                >
                  שכחת סיסמה?
                </button>
              </div>
            )}

            {/* תנאי שימוש - רק בהרשמה */}
            {!isLogin && (
              <div className="terms-checkbox" style={{
                marginBottom: '20px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '15px',
                background: '#f8f9fa',
                borderRadius: '8px',
                border: !agreedToTerms && error ? '2px solid #e74c3c' : '1px solid #ddd'
              }}>
                <input
                  type="checkbox"
                  id="terms"
                  checked={agreedToTerms}
                  onChange={(e) => setAgreedToTerms(e.target.checked)}
                  style={{
                    width: '18px',
                    height: '18px',
                    cursor: 'pointer'
                  }}
                />
                <label htmlFor="terms" style={{
                  margin: 0,
                  cursor: 'pointer',
                  fontSize: '14px',
                  color: '#555'
                }}>
                  קראתי והסכמתי ל<a href="/terms" target="_blank" style={{color: '#8B6F47', textDecoration: 'underline', marginRight: '4px', marginLeft: '4px'}}>תנאי השימוש</a>ול<a href="/privacy" target="_blank" style={{color: '#8B6F47', textDecoration: 'underline', marginRight: '4px'}}>מדיניות הפרטיות</a>
                </label>
              </div>
            )}

            <button type="submit" className="register-btn-primary" disabled={isLoading}>
              {isLoading ? (
                <>
                  <i className="fas fa-spinner fa-spin"></i>
                  {isLogin ? " מתחבר..." : " נרשם..."}
                </>
              ) : (
                isLogin ? "התחבר" : "הירשם"
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="oauth-divider">
            <span>או</span>
          </div>

          {/* Google Login Button */}
          <GoogleLoginButton />

          <div className="register-switch">
            <p>
              {isLogin ? "עדיין אין לך חשבון? " : "כבר יש לך חשבון? "}
              <button
                type="button"
                onClick={() => {
                  console.log("Switching mode, current isLogin:", isLogin);
                  const newPath = isLogin ? '/register' : '/login';
                  console.log("Navigating to:", newPath);
                  navigate(newPath);
                }}
                className="switch-btn"
              >
                {isLogin ? "הירשם כעת" : "התחבר"}
              </button>
            </p>
          </div>

        </div>
      </div>

      {/* Footer */}
      <footer className="register-footer">
        <p>&copy; 2025 Save the Day. כל הזכויות שמורות.</p>
      </footer>
    </div>
  );
}
