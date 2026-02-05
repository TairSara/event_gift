import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './AdminStyles.css';

export default function AdminLogin() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1); // 1 = login, 2 = verification
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await axios.post('/api/admin/login', {
        email,
        password
      });

      if (response.data.requires_verification) {
        setStep(2);
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'שגיאה בהתחברות');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await axios.post('/api/admin/verify-code', {
        email,
        code: verificationCode
      });

      if (response.data.access_token) {
        localStorage.setItem('adminToken', response.data.access_token);
        localStorage.setItem('adminUser', JSON.stringify(response.data.user));
        localStorage.setItem('isAdmin', 'true');
        navigate('/admin/dashboard');
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'קוד אימות שגוי');
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    setError('');
    setLoading(true);
    try {
      await axios.post('/api/admin/login', { email, password });
      setError('קוד חדש נשלח למייל');
    } catch (err) {
      setError(err.response?.data?.detail || 'שגיאה בשליחת קוד');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-login-container">
      <div className="admin-login-box">
        <div className="admin-login-header">
          <div className="admin-logo">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2L2 7l10 5 10-5-10-5z"/>
              <path d="M2 17l10 5 10-5"/>
              <path d="M2 12l10 5 10-5"/>
            </svg>
          </div>
          <h1>פאנל ניהול</h1>
          <p>Save The Day</p>
        </div>

        {step === 1 ? (
          <form onSubmit={handleLogin} className="admin-login-form">
            <div className="form-group">
              <label>אימייל</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@example.com"
                required
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label>סיסמה</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                disabled={loading}
              />
            </div>

            {error && <div className="error-message">{error}</div>}

            <button type="submit" className="login-btn" disabled={loading}>
              {loading ? (
                <span className="loading-spinner"></span>
              ) : (
                'התחברות'
              )}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerify} className="admin-login-form">
            <div className="verification-info">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 6c0-1.1-.9-2-2-2H4c-1.1 0-2 .9-2 2"/>
                <path d="M22 6v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6"/>
                <path d="M22 6l-10 7L2 6"/>
              </svg>
              <p>קוד אימות נשלח אל</p>
              <strong>{email}</strong>
            </div>

            <div className="form-group">
              <label>קוד אימות</label>
              <input
                type="text"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                maxLength={6}
                required
                disabled={loading}
                className="verification-input"
              />
            </div>

            {error && (
              <div className={error.includes('נשלח') ? 'success-message' : 'error-message'}>
                {error}
              </div>
            )}

            <button type="submit" className="login-btn" disabled={loading || verificationCode.length !== 6}>
              {loading ? (
                <span className="loading-spinner"></span>
              ) : (
                'אימות'
              )}
            </button>

            <div className="resend-section">
              <button type="button" onClick={handleResendCode} disabled={loading} className="resend-btn">
                שלח קוד חדש
              </button>
              <button type="button" onClick={() => setStep(1)} className="back-btn">
                חזרה
              </button>
            </div>
          </form>
        )}

        <div className="admin-login-footer">
          <p>גישה מוגבלת למנהלים בלבד</p>
        </div>
      </div>
    </div>
  );
}
