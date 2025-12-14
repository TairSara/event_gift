# תיקון מהיר - 3 דפים נפרדים

## 🔴 הבעיה שיש לך עכשיו:

יש לך דף אחד שמציג:
- קוד אימות
- סיסמה חדשה
- אימות סיסמה

**זה לא בטוח!** מישהו יכול לדלג על שלב אימות הקוד!

---

## ✅ הפתרון: 3 דפים נפרדים לחלוטין

---

## דף 1: שליחת קוד (ForgotPassword.jsx)

**מה יש בדף:**
- רק שדה מייל
- כפתור "שלח קוד"

**קוד פשוט:**

```jsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('http://localhost:8000/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });

      if (res.ok) {
        // ✅ הקוד נשלח - עבור לדף 2
        navigate('/verify-code', { state: { email } });
      } else {
        const data = await res.json();
        setError(data.detail || 'שגיאה');
      }
    } catch (err) {
      setError('שגיאת רשת');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '400px', margin: '100px auto', padding: '30px', background: '#fff', borderRadius: '10px' }}>
      <h1>שכחת סיסמה?</h1>
      <p>נשלח לך קוד אימות למייל</p>

      <form onSubmit={handleSubmit}>
        <input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="המייל שלך"
          required
          style={{ width: '100%', padding: '12px', marginBottom: '15px', borderRadius: '5px', border: '1px solid #ddd' }}
        />

        {error && <div style={{ color: 'red', marginBottom: '10px' }}>{error}</div>}

        <button
          type="submit"
          disabled={loading}
          style={{ width: '100%', padding: '12px', background: '#8B6F47', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}
        >
          {loading ? 'שולח...' : 'שלח קוד אימות'}
        </button>
      </form>
    </div>
  );
}
```

---

## דף 2: אימות קוד (VerifyCode.jsx)

**מה יש בדף:**
- רק שדה קוד (6 ספרות)
- כפתור "אמת קוד"
- כפתור "שלח קוד חדש"

**⚠️ חשוב: אם אין מייל - חוזר לדף 1!**

**קוד פשוט:**

```jsx
import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

export default function VerifyCode() {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const location = useLocation();

  const email = location.state?.email;

  // 🔒 הגנה: אם אין מייל - חזור לדף 1
  useEffect(() => {
    if (!email) {
      navigate('/forgot-password');
    }
  }, [email, navigate]);

  const handleVerify = async (e) => {
    e.preventDefault();

    if (code.length !== 6) {
      setError('הזן קוד בן 6 ספרות');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch('http://localhost:8000/api/auth/verify-reset-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code })
      });

      const data = await res.json();

      if (res.ok && data.valid) {
        // ✅ הקוד נכון! עבור לדף 3
        navigate('/reset-password', { state: { email, code } });
      } else {
        // ❌ קוד שגוי
        setError(data.detail || 'קוד שגוי');
        setCode('');
      }
    } catch (err) {
      setError('שגיאת רשת');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = () => {
    // חזור לדף 1 לשלוח קוד חדש
    navigate('/forgot-password', { state: { email } });
  };

  return (
    <div style={{ maxWidth: '400px', margin: '100px auto', padding: '30px', background: '#fff', borderRadius: '10px' }}>
      <h1>הזן קוד אימות</h1>
      <p>שלחנו קוד ל: <strong>{email}</strong></p>

      <form onSubmit={handleVerify}>
        <input
          type="text"
          value={code}
          onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
          placeholder="000000"
          maxLength="6"
          required
          style={{
            width: '100%',
            padding: '15px',
            marginBottom: '15px',
            borderRadius: '5px',
            border: '2px solid #8B6F47',
            fontSize: '24px',
            textAlign: 'center',
            letterSpacing: '5px'
          }}
        />

        {error && <div style={{ color: 'red', marginBottom: '10px' }}>{error}</div>}

        <button
          type="submit"
          disabled={loading || code.length !== 6}
          style={{
            width: '100%',
            padding: '12px',
            background: '#8B6F47',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer',
            marginBottom: '10px'
          }}
        >
          {loading ? 'מאמת...' : 'אמת קוד'}
        </button>

        <button
          type="button"
          onClick={handleResend}
          style={{
            width: '100%',
            padding: '12px',
            background: 'white',
            color: '#8B6F47',
            border: '2px solid #8B6F47',
            borderRadius: '5px',
            cursor: 'pointer'
          }}
        >
          שלח קוד חדש
        </button>
      </form>
    </div>
  );
}
```

---

## דף 3: שינוי סיסמה (ResetPassword.jsx)

**מה יש בדף:**
- רק שדות סיסמה חדשה
- כפתור "שמור"

**⚠️ חשוב: אם אין מייל או קוד - חוזר לדף 1!**

**קוד פשוט:**

```jsx
import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

export default function ResetPassword() {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const location = useLocation();

  const email = location.state?.email;
  const code = location.state?.code;

  // 🔒 הגנה: אם אין מייל או קוד - חזור לדף 1
  useEffect(() => {
    if (!email || !code) {
      navigate('/forgot-password');
    }
  }, [email, code, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (newPassword.length < 8) {
      setError('הסיסמה חייבת להכיל לפחות 8 תווים');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('הסיסמאות לא תואמות');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('http://localhost:8000/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code, new_password: newPassword })
      });

      if (res.ok) {
        // ✅ הצלחה!
        alert('הסיסמה שונתה בהצלחה!');
        navigate('/login');
      } else {
        const data = await res.json();
        setError(data.detail || 'שגיאה');
      }
    } catch (err) {
      setError('שגיאת רשת');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '400px', margin: '100px auto', padding: '30px', background: '#fff', borderRadius: '10px' }}>
      <h1>הגדר סיסמה חדשה</h1>

      <form onSubmit={handleSubmit}>
        <input
          type="password"
          value={newPassword}
          onChange={e => setNewPassword(e.target.value)}
          placeholder="סיסמה חדשה (לפחות 8 תווים)"
          required
          style={{ width: '100%', padding: '12px', marginBottom: '15px', borderRadius: '5px', border: '1px solid #ddd' }}
        />

        <input
          type="password"
          value={confirmPassword}
          onChange={e => setConfirmPassword(e.target.value)}
          placeholder="אימות סיסמה"
          required
          style={{ width: '100%', padding: '12px', marginBottom: '15px', borderRadius: '5px', border: '1px solid #ddd' }}
        />

        {error && <div style={{ color: 'red', marginBottom: '10px' }}>{error}</div>}

        <button
          type="submit"
          disabled={loading}
          style={{ width: '100%', padding: '12px', background: '#8B6F47', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}
        >
          {loading ? 'שומר...' : 'שמור סיסמה חדשה'}
        </button>
      </form>
    </div>
  );
}
```

---

## ⚙️ הוספה לראוטר (App.jsx)

```jsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import ForgotPassword from './pages/ForgotPassword';
import VerifyCode from './pages/VerifyCode';
import ResetPassword from './pages/ResetPassword';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/verify-code" element={<VerifyCode />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        {/* שאר הנתיבים שלך... */}
      </Routes>
    </BrowserRouter>
  );
}
```

---

## 🔒 ההגנות שמוטמעות:

### דף 2 (VerifyCode):
```jsx
useEffect(() => {
  if (!email) {
    navigate('/forgot-password'); // ← חוזר לדף 1 אם אין מייל!
  }
}, [email, navigate]);
```

### דף 3 (ResetPassword):
```jsx
useEffect(() => {
  if (!email || !code) {
    navigate('/forgot-password'); // ← חוזר לדף 1 אם אין מייל או קוד!
  }
}, [email, code, navigate]);
```

---

## ✅ כך זה צריך לעבוד:

```
משתמש ניגש ל-/forgot-password
   ↓ מזין מייל
   ↓ לוחץ "שלח קוד"
   ↓ עובר ל-/verify-code

משתמש ניגש ל-/verify-code
   ↓ מזין קוד
   ↓ לוחץ "אמת קוד"
   ↓ אם נכון → עובר ל-/reset-password
   ↓ אם לא נכון → נשאר באותו דף + שגיאה

משתמש ניגש ל-/reset-password
   ↓ מזין סיסמה חדשה
   ↓ לוחץ "שמור"
   ↓ עובר ל-/login
```

---

## ❌ מה שלא יעבוד (זה הטוב!):

```
משתמש מנסה לגשת ישירות ל-/reset-password
   ↓ אין לו email או code ב-state
   ↓ ההגנה מזהה את זה
   ↓ מחזיר אותו ל-/forgot-password ❌
```

---

## 🎯 סיכום:

1. **מחק את הדף הנוכחי שיש לך** - זה לא בטוח
2. **צור 3 קבצים נפרדים** עם הקוד למעלה
3. **הוסף את הנתיבים לראוטר**
4. **בדוק שזה עובד:**
   - נסי לגשת ישירות ל-`/reset-password` - זה אמור להחזיר אותך ל-`/forgot-password`
   - נסי לאמת קוד שגוי - זה אמור להשאר באותו דף עם שגיאה
   - רק עם קוד נכון אפשר להגיע לדף 3

---

**עכשיו זה בטוח! 🔒**
