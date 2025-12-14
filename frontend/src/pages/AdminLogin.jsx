import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import '../styles/AdminLogin.css';

const AdminLogin = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1); // 1 = login, 2 = verify code
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    code: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError('');
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await axios.post('/api/admin/login', {
        email: formData.email,
        password: formData.password
      });

      if (response.data.requires_verification) {
        setMessage('קוד אימות נשלח למייל שלך');
        setStep(2);
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'שגיאה בהתחברות');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await axios.post('/api/admin/verify-code', {
        email: formData.email,
        code: formData.code
      });

      if (response.data.user && response.data.access_token) {
        // שמירת פרטי המנהל + JWT token ב-localStorage
        localStorage.setItem('adminUser', JSON.stringify(response.data.user));
        localStorage.setItem('adminToken', response.data.access_token);
        localStorage.setItem('isAdmin', 'true');

        // מעבר לדשבורד מנהל
        navigate('/admin/dashboard');
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'קוד אימות שגוי');
    } finally {
      setLoading(false);
    }
  };

  const resendCode = async () => {
    setLoading(true);
    setError('');
    setMessage('');

    try {
      await axios.post('/api/admin/login', {
        email: formData.email,
        password: formData.password
      });
      setMessage('קוד חדש נשלח למייל');
    } catch (err) {
      setError('שגיאה בשליחת קוד חדש');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-login-container">
      <div className="admin-login-box">
        <div className="admin-header">
          <div className="admin-icon">🔐</div>
          <h1>כניסת מנהל</h1>
          <p className="admin-subtitle">גישה מוגבלת - נדרש אימות דו-שלבי</p>
        </div>

        {error && (
          <div className="admin-alert admin-alert-error">
            <span className="alert-icon">⚠️</span>
            {error}
          </div>
        )}

        {message && (
          <div className="admin-alert admin-alert-success">
            <span className="alert-icon">✓</span>
            {message}
          </div>
        )}

        {step === 1 ? (
          <form onSubmit={handleLogin} className="admin-form">
            <div className="form-group">
              <label htmlFor="email">כתובת אימייל</label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                placeholder="admin@saveday.com"
                autoComplete="email"
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
                required
                placeholder="••••••••"
                autoComplete="current-password"
              />
            </div>

            <button
              type="submit"
              className="admin-btn admin-btn-primary"
              disabled={loading}
            >
              {loading ? 'מתחבר...' : 'המשך לאימות'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyCode} className="admin-form">
            <div className="verification-info">
              <p>קוד אימות נשלח לכתובת:</p>
              <strong>{formData.email}</strong>
            </div>

            <div className="form-group">
              <label htmlFor="code">קוד אימות (6 ספרות)</label>
              <input
                type="text"
                id="code"
                name="code"
                value={formData.code}
                onChange={handleChange}
                required
                maxLength="6"
                pattern="[0-9]{6}"
                placeholder="123456"
                autoComplete="one-time-code"
                className="code-input"
              />
            </div>

            <button
              type="submit"
              className="admin-btn admin-btn-primary"
              disabled={loading || formData.code.length !== 6}
            >
              {loading ? 'מאמת...' : 'התחבר'}
            </button>

            <button
              type="button"
              className="admin-btn admin-btn-secondary"
              onClick={resendCode}
              disabled={loading}
            >
              שלח קוד חדש
            </button>

            <button
              type="button"
              className="admin-btn admin-btn-text"
              onClick={() => setStep(1)}
            >
              ← חזור להתחברות
            </button>
          </form>
        )}

        <div className="admin-footer">
          <p className="security-notice">
            <span className="security-icon">🛡️</span>
            החיבור מוצפן ומאובטח
          </p>
        </div>
      </div>

      <button
        className="back-to-site-btn"
        onClick={() => navigate('/')}
      >
        ← חזור לאתר
      </button>
    </div>
  );
};

export default AdminLogin;
