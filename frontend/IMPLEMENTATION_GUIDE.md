# מדריך יישום - מערכת איפוס סיסמה (Frontend)

## סקירה כללית

צריך ליצור **3 דפים נפרדים** שעוברים זה לזה בסדר:

```
1. ForgotPassword.jsx  → הזנת מייל
2. VerifyCode.jsx      → הזנת קוד אימות ✨
3. ResetPassword.jsx   → הזנת סיסמה חדשה
```

---

## 📄 דף 1: ForgotPassword.jsx

### מה הדף עושה?
- משתמש מזין את כתובת המייל שלו
- לוחץ על "שלח קוד אימות"
- מקבל מייל עם קוד בן 6 ספרות
- עובר לדף 2

### קוד מלא להעתקה:

\`\`\`jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './ForgotPassword.css';

function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('http://localhost:8000/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess('קוד אימות נשלח למייל שלך!');
        // המתן שנייה ועבור לדף אימות קוד
        setTimeout(() => {
          navigate('/verify-code', { state: { email } });
        }, 1500);
      } else {
        setError(data.detail || 'שגיאה בשליחת הקוד');
      }
    } catch (err) {
      setError('שגיאת רשת. אנא נסה שוב.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="forgot-password-container">
      <div className="forgot-password-card">
        <h1>שכחת סיסמה?</h1>
        <p className="subtitle">
          הזן את כתובת המייל שלך ונשלח לך קוד אימות
        </p>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="email">כתובת מייל</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              required
              disabled={loading}
            />
          </div>

          {error && <div className="error-message">{error}</div>}
          {success && <div className="success-message">{success}</div>}

          <button
            type="submit"
            className="submit-btn"
            disabled={loading}
          >
            {loading ? 'שולח...' : 'שלח קוד אימות'}
          </button>
        </form>

        <div className="back-to-login">
          <a href="/login">חזרה להתחברות</a>
        </div>
      </div>
    </div>
  );
}

export default ForgotPassword;
\`\`\`

### CSS מומלץ (ForgotPassword.css):

\`\`\`css
.forgot-password-container {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #2C5F7F 0%, #8B6F47 100%);
  padding: 20px;
}

.forgot-password-card {
  background: white;
  padding: 40px;
  border-radius: 20px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
  max-width: 450px;
  width: 100%;
}

.forgot-password-card h1 {
  color: #2C5F7F;
  margin-bottom: 10px;
  text-align: center;
}

.subtitle {
  color: #666;
  text-align: center;
  margin-bottom: 30px;
  line-height: 1.6;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  color: #333;
  font-weight: 500;
}

.form-group input {
  width: 100%;
  padding: 12px 15px;
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  font-size: 16px;
  transition: border-color 0.3s;
}

.form-group input:focus {
  outline: none;
  border-color: #8B6F47;
}

.form-group input:disabled {
  background-color: #f5f5f5;
  cursor: not-allowed;
}

.submit-btn {
  width: 100%;
  padding: 15px;
  background: linear-gradient(135deg, #8B6F47 0%, #B8986E 100%);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
  box-shadow: 0 4px 15px rgba(139, 111, 71, 0.25);
}

.submit-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(139, 111, 71, 0.35);
}

.submit-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.error-message {
  background-color: #fee;
  color: #c33;
  padding: 12px;
  border-radius: 8px;
  margin-bottom: 20px;
  text-align: center;
  border: 1px solid #fcc;
}

.success-message {
  background-color: #efe;
  color: #3c3;
  padding: 12px;
  border-radius: 8px;
  margin-bottom: 20px;
  text-align: center;
  border: 1px solid #cfc;
}

.back-to-login {
  text-align: center;
  margin-top: 20px;
}

.back-to-login a {
  color: #8B6F47;
  text-decoration: none;
  font-weight: 500;
}

.back-to-login a:hover {
  text-decoration: underline;
}
\`\`\`

---

## 📄 דף 2: VerifyCode.jsx ⭐ החשוב ביותר!

### מה הדף עושה?
- מקבל את המייל מהדף הקודם
- משתמש מזין 6 ספרות
- לוחץ "אמת קוד"
- אם נכון → עובר לדף 3
- אם לא נכון → הודעת שגיאה
- יש כפתור "שלח קוד חדש" שחוזר לדף 1

### קוד מלא להעתקה:

\`\`\`jsx
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import './VerifyCode.css';

function VerifyCode() {
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [timeLeft, setTimeLeft] = useState(15 * 60); // 15 דקות בשניות
  const navigate = useNavigate();
  const location = useLocation();
  const inputRefs = useRef([]);

  const email = location.state?.email;

  // אם אין מייל - חזור לדף ראשון
  useEffect(() => {
    if (!email) {
      navigate('/forgot-password');
    }
  }, [email, navigate]);

  // טיימר
  useEffect(() => {
    if (timeLeft <= 0) return;

    const timer = setInterval(() => {
      setTimeLeft(prev => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return \`\${mins}:\${secs.toString().padStart(2, '0')}\`;
  };

  const handleChange = (index, value) => {
    // רק ספרות
    if (value && !/^\d$/.test(value)) return;

    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);

    // עבור לשדה הבא אוטומטית
    if (value && index < 5) {
      inputRefs.current[index + 1].focus();
    }
  };

  const handleKeyDown = (index, e) => {
    // Backspace - חזור לשדה הקודם
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1].focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').slice(0, 6);
    const digits = pastedData.match(/\d/g);

    if (digits) {
      const newCode = [...code];
      digits.forEach((digit, i) => {
        if (i < 6) newCode[i] = digit;
      });
      setCode(newCode);

      // פוקוס על השדה האחרון או הבא
      const nextEmptyIndex = newCode.findIndex(c => !c);
      if (nextEmptyIndex !== -1) {
        inputRefs.current[nextEmptyIndex].focus();
      } else {
        inputRefs.current[5].focus();
      }
    }
  };

  const handleVerifyCode = async (e) => {
    e.preventDefault();

    const fullCode = code.join('');

    if (fullCode.length !== 6) {
      setError('אנא הזן קוד בן 6 ספרות');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch('http://localhost:8000/api/auth/verify-reset-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code: fullCode })
      });

      const data = await response.json();

      if (response.ok && data.valid) {
        // ✅ הקוד נכון! עבור לדף איפוס סיסמה
        navigate('/reset-password', {
          state: { email, code: fullCode }
        });
      } else {
        // ❌ קוד שגוי
        setError(data.detail || 'קוד אימות שגוי');
        setCode(['', '', '', '', '', '']);
        inputRefs.current[0].focus();
      }
    } catch (err) {
      setError('שגיאת רשת. אנא נסה שוב.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = () => {
    // חזרה לדף שליחת קוד
    navigate('/forgot-password', { state: { email } });
  };

  return (
    <div className="verify-code-container">
      <div className="verify-code-card">
        <h1>הזן קוד אימות</h1>
        <p className="subtitle">
          שלחנו קוד בן 6 ספרות לכתובת:<br/>
          <strong>{email}</strong>
        </p>

        <form onSubmit={handleVerifyCode}>
          <div className="code-inputs" onPaste={handlePaste}>
            {code.map((digit, index) => (
              <input
                key={index}
                ref={el => inputRefs.current[index] = el}
                type="text"
                inputMode="numeric"
                maxLength="1"
                value={digit}
                onChange={(e) => handleChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                disabled={loading}
                className="code-input"
              />
            ))}
          </div>

          {timeLeft > 0 ? (
            <div className="timer">
              הקוד תקף עוד <strong>{formatTime(timeLeft)}</strong>
            </div>
          ) : (
            <div className="timer expired">
              הקוד פג תוקף
            </div>
          )}

          {error && <div className="error-message">{error}</div>}

          <button
            type="submit"
            className="submit-btn"
            disabled={loading || code.some(d => !d)}
          >
            {loading ? 'מאמת...' : 'אמת קוד'}
          </button>
        </form>

        <div className="resend-section">
          <p>לא קיבלת את הקוד?</p>
          <button
            onClick={handleResendCode}
            className="resend-btn"
            disabled={loading}
          >
            שלח קוד חדש
          </button>
        </div>
      </div>
    </div>
  );
}

export default VerifyCode;
\`\`\`

### CSS מומלץ (VerifyCode.css):

\`\`\`css
.verify-code-container {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #2C5F7F 0%, #8B6F47 100%);
  padding: 20px;
}

.verify-code-card {
  background: white;
  padding: 40px;
  border-radius: 20px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
  max-width: 500px;
  width: 100%;
}

.verify-code-card h1 {
  color: #2C5F7F;
  margin-bottom: 10px;
  text-align: center;
}

.subtitle {
  color: #666;
  text-align: center;
  margin-bottom: 30px;
  line-height: 1.6;
}

.subtitle strong {
  color: #8B6F47;
}

.code-inputs {
  display: flex;
  gap: 10px;
  justify-content: center;
  margin-bottom: 20px;
  direction: ltr;
}

.code-input {
  width: 50px;
  height: 60px;
  font-size: 24px;
  text-align: center;
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  transition: all 0.3s;
  font-weight: bold;
  color: #8B6F47;
}

.code-input:focus {
  outline: none;
  border-color: #8B6F47;
  box-shadow: 0 0 0 3px rgba(139, 111, 71, 0.1);
}

.code-input:disabled {
  background-color: #f5f5f5;
  cursor: not-allowed;
}

.timer {
  text-align: center;
  color: #666;
  margin-bottom: 20px;
  font-size: 14px;
}

.timer strong {
  color: #8B6F47;
  font-size: 16px;
}

.timer.expired {
  color: #c33;
  font-weight: bold;
}

.submit-btn {
  width: 100%;
  padding: 15px;
  background: linear-gradient(135deg, #8B6F47 0%, #B8986E 100%);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 4px 15px rgba(139, 111, 71, 0.25);
}

.submit-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(139, 111, 71, 0.35);
}

.submit-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
}

.error-message {
  background-color: #fee;
  color: #c33;
  padding: 12px;
  border-radius: 8px;
  margin-bottom: 20px;
  text-align: center;
  border: 1px solid #fcc;
}

.resend-section {
  margin-top: 30px;
  text-align: center;
  padding-top: 20px;
  border-top: 1px solid #e0e0e0;
}

.resend-section p {
  color: #666;
  margin-bottom: 10px;
}

.resend-btn {
  background: none;
  border: 2px solid #8B6F47;
  color: #8B6F47;
  padding: 10px 30px;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
}

.resend-btn:hover:not(:disabled) {
  background: #8B6F47;
  color: white;
}

.resend-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
\`\`\`

---

## 📄 דף 3: ResetPassword.jsx

### מה הדף עושה?
- מקבל את המייל והקוד מהדף הקודם
- משתמש מזין סיסמה חדשה
- מאשר את הסיסמה
- משנה את הסיסמה
- מקבל מייל אישור

### קוד מלא להעתקה:

\`\`\`jsx
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import './ResetPassword.css';

function ResetPassword() {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const email = location.state?.email;
  const code = location.state?.code;

  // בדיקת אבטחה - אם אין מייל או קוד, חזור לדף ראשון
  useEffect(() => {
    if (!email || !code) {
      navigate('/forgot-password');
    }
  }, [email, code, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // בדיקות
    if (newPassword.length < 8) {
      setError('הסיסמה חייבת להכיל לפחות 8 תווים');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('הסיסמאות אינן תואמות');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('http://localhost:8000/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          code,
          new_password: newPassword
        })
      });

      const data = await response.json();

      if (response.ok) {
        // ✅ הצלחה! הצג הודעה ועבור להתחברות
        alert('הסיסמה שונתה בהצלחה! נשלח מייל אישור.');
        navigate('/login');
      } else {
        setError(data.detail || 'שגיאה בשינוי הסיסמה');
      }
    } catch (err) {
      setError('שגיאת רשת. אנא נסה שוב.');
    } finally {
      setLoading(false);
    }
  };

  const getPasswordStrength = () => {
    if (newPassword.length === 0) return null;
    if (newPassword.length < 8) return { text: 'חלשה', color: '#e74c3c' };
    if (newPassword.length < 12) return { text: 'בינונית', color: '#f39c12' };
    return { text: 'חזקה', color: '#27ae60' };
  };

  const strength = getPasswordStrength();

  return (
    <div className="reset-password-container">
      <div className="reset-password-card">
        <h1>הגדר סיסמה חדשה</h1>
        <p className="subtitle">
          בחר סיסמה חזקה ומאובטחת לחשבון שלך
        </p>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="newPassword">סיסמה חדשה</label>
            <div className="password-input-wrapper">
              <input
                type={showPassword ? "text" : "password"}
                id="newPassword"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="לפחות 8 תווים"
                required
                disabled={loading}
              />
              <button
                type="button"
                className="toggle-password"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? '👁️' : '👁️‍🗨️'}
              </button>
            </div>
            {strength && (
              <div className="password-strength">
                <div
                  className="strength-bar"
                  style={{
                    width: \`\${(newPassword.length / 12) * 100}%\`,
                    backgroundColor: strength.color
                  }}
                ></div>
                <span style={{ color: strength.color }}>
                  {strength.text}
                </span>
              </div>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">אימות סיסמה</label>
            <input
              type={showPassword ? "text" : "password"}
              id="confirmPassword"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="הזן שוב את הסיסמה"
              required
              disabled={loading}
            />
            {confirmPassword && newPassword !== confirmPassword && (
              <div className="password-mismatch">
                הסיסמאות אינן תואמות
              </div>
            )}
          </div>

          {error && <div className="error-message">{error}</div>}

          <button
            type="submit"
            className="submit-btn"
            disabled={loading || !newPassword || !confirmPassword}
          >
            {loading ? 'שומר...' : 'שמור סיסמה חדשה'}
          </button>
        </form>

        <div className="security-tips">
          <h3>טיפים לסיסמה חזקה:</h3>
          <ul>
            <li>לפחות 8 תווים</li>
            <li>שילוב של אותיות גדולות וקטנות</li>
            <li>מספרים ותווים מיוחדים</li>
            <li>אל תשתמש בסיסמאות ישנות</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default ResetPassword;
\`\`\`

### CSS מומלץ (ResetPassword.css):

\`\`\`css
.reset-password-container {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #2C5F7F 0%, #8B6F47 100%);
  padding: 20px;
}

.reset-password-card {
  background: white;
  padding: 40px;
  border-radius: 20px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
  max-width: 500px;
  width: 100%;
}

.reset-password-card h1 {
  color: #2C5F7F;
  margin-bottom: 10px;
  text-align: center;
}

.subtitle {
  color: #666;
  text-align: center;
  margin-bottom: 30px;
  line-height: 1.6;
}

.form-group {
  margin-bottom: 25px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  color: #333;
  font-weight: 500;
}

.password-input-wrapper {
  position: relative;
}

.password-input-wrapper input {
  width: 100%;
  padding: 12px 45px 12px 15px;
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  font-size: 16px;
  transition: border-color 0.3s;
}

.password-input-wrapper input:focus {
  outline: none;
  border-color: #8B6F47;
}

.toggle-password {
  position: absolute;
  left: 10px;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  cursor: pointer;
  font-size: 20px;
}

.password-strength {
  margin-top: 8px;
  display: flex;
  align-items: center;
  gap: 10px;
}

.strength-bar {
  height: 4px;
  border-radius: 2px;
  transition: all 0.3s;
  flex: 1;
}

.password-strength span {
  font-size: 12px;
  font-weight: 600;
}

.password-mismatch {
  color: #e74c3c;
  font-size: 14px;
  margin-top: 5px;
}

.form-group input:disabled {
  background-color: #f5f5f5;
  cursor: not-allowed;
}

.submit-btn {
  width: 100%;
  padding: 15px;
  background: linear-gradient(135deg, #8B6F47 0%, #B8986E 100%);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 4px 15px rgba(139, 111, 71, 0.25);
}

.submit-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(139, 111, 71, 0.35);
}

.submit-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
}

.error-message {
  background-color: #fee;
  color: #c33;
  padding: 12px;
  border-radius: 8px;
  margin-bottom: 20px;
  text-align: center;
  border: 1px solid #fcc;
}

.security-tips {
  margin-top: 30px;
  padding-top: 20px;
  border-top: 1px solid #e0e0e0;
}

.security-tips h3 {
  color: #8B6F47;
  font-size: 14px;
  margin-bottom: 10px;
}

.security-tips ul {
  list-style: none;
  padding: 0;
}

.security-tips li {
  color: #666;
  font-size: 13px;
  padding: 5px 0;
  padding-right: 20px;
  position: relative;
}

.security-tips li:before {
  content: "✓";
  position: absolute;
  right: 0;
  color: #8B6F47;
  font-weight: bold;
}
\`\`\`

---

## ⚙️ הוספה ל-React Router

הוסף את הנתיבים ל-App.jsx או הראוטר שלך:

\`\`\`jsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import ForgotPassword from './pages/ForgotPassword';
import VerifyCode from './pages/VerifyCode';
import ResetPassword from './pages/ResetPassword';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* ... נתיבים אחרים */}
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/verify-code" element={<VerifyCode />} />
        <Route path="/reset-password" element={<ResetPassword />} />
      </Routes>
    </BrowserRouter>
  );
}
\`\`\`

---

## ✅ סיכום - זרימת העבודה

\`\`\`
משתמש לוחץ "שכחתי סיסמה"
   ↓
[דף 1] הזנת מייל → שליחת קוד
   ↓
קוד נשלח למייל (6 ספרות)
   ↓
[דף 2] הזנת קוד אימות
   ↓
   ├─ קוד נכון? → עבור לדף 3
   └─ קוד שגוי? → הודעת שגיאה + אפשרות לשלוח קוד חדש
   ↓
[דף 3] הזנת סיסמה חדשה → שינוי מוצלח
   ↓
מייל אישור נשלח + ניתוב להתחברות
\`\`\`

---

## 🎯 הבטחות אבטחה שמיושמות

1. ✅ **לא ניתן לדלג על דף 2** - יש בדיקה ש-email ו-code קיימים
2. ✅ **טיימר של 15 דקות** - הקוד פג תוקף
3. ✅ **אפשרות לשלוח קוד חדש** - כפתור בדף 2
4. ✅ **בדיקת חוזק סיסמה** - אינדיקטור ויזואלי
5. ✅ **אימות התאמת סיסמאות** - הודעה בזמן אמת

---

**הכל מוכן! צריך רק להעתיק את הקבצים ולהוסיף את הנתיבים לראוטר!** 🚀
