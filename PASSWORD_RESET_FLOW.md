# תהליך איפוס סיסמה - מדריך לפיתוח בפרונט

## תיאור התהליך

המשתמש עובר 3 שלבים **נפרדים** ובטוחים:

```
[דף 1] שכחתי סיסמה
   ↓ הזנת מייל
   ↓ לחיצה על "שלח קוד"
   ↓ API: /forgot-password

[דף 2] הזנת קוד אימות (קוד שהגיע למייל)
   ↓ הזנת קוד בן 6 ספרות
   ↓ לחיצה על "אמת קוד"
   ↓ API: /verify-reset-code
   ↓ ✅ אם הקוד נכון

[דף 3] הזנת סיסמה חדשה (רק אם הקוד אומת!)
   ↓ הזנת סיסמה חדשה
   ↓ לחיצה על "שמור סיסמה"
   ↓ API: /reset-password
   ↓ ✅ הצלחה!
```

---

## דף 1: שכחתי סיסמה

### UI
- שדה להזנת מייל
- כפתור "שלח קוד אימות"

### קוד לדוגמה (React)

```jsx
const [email, setEmail] = useState('');
const [loading, setLoading] = useState(false);
const [error, setError] = useState('');

const handleSendCode = async () => {
  setLoading(true);
  setError('');

  try {
    const response = await fetch('http://localhost:8000/api/auth/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });

    const data = await response.json();

    if (response.ok) {
      // ✅ הקוד נשלח בהצלחה - עבור לדף 2
      navigate('/verify-code', { state: { email } });
    } else {
      setError(data.detail || 'שגיאה בשליחת הקוד');
    }
  } catch (err) {
    setError('שגיאת רשת, נסה שוב');
  } finally {
    setLoading(false);
  }
};
```

---

## דף 2: אימות קוד

### UI
- הצגת המייל שנשלח אליו הקוד
- 6 שדות לקוד (או שדה אחד)
- כפתור "אמת קוד"
- קישור "שלח קוד חדש" (חוזר לדף 1)

### קוד לדוגמה (React)

```jsx
const [code, setCode] = useState('');
const [loading, setLoading] = useState(false);
const [error, setError] = useState('');
const email = location.state?.email; // מהדף הקודם

const handleVerifyCode = async () => {
  setLoading(true);
  setError('');

  try {
    const response = await fetch('http://localhost:8000/api/auth/verify-reset-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, code })
    });

    const data = await response.json();

    if (response.ok && data.valid) {
      // ✅ הקוד נכון! עבור לדף 3 - שינוי סיסמה
      navigate('/reset-password', { state: { email, code } });
    } else {
      // ❌ הקוד שגוי
      setError(data.detail || 'קוד אימות שגוי');
    }
  } catch (err) {
    setError('שגיאת רשת, נסה שוב');
  } finally {
    setLoading(false);
  }
};

const handleResendCode = () => {
  // חזרה לדף 1 לשליחת קוד חדש
  navigate('/forgot-password', { state: { email } });
};
```

### UI מומלץ לשדה קוד

```jsx
// אופציה 1: 6 שדות נפרדים (יפה יותר)
<div className="code-input">
  {[0,1,2,3,4,5].map(i => (
    <input
      key={i}
      type="text"
      maxLength="1"
      value={code[i] || ''}
      onChange={(e) => handleCodeChange(i, e.target.value)}
      onKeyDown={(e) => handleKeyDown(i, e)}
    />
  ))}
</div>

// אופציה 2: שדה אחד עם פורמט
<input
  type="text"
  maxLength="6"
  value={code}
  onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
  placeholder="000000"
/>
```

---

## דף 3: שינוי סיסמה

### ⚠️ חשוב: דף זה נגיש רק אחרי אימות קוד מוצלח!

### UI
- שדה "סיסמה חדשה"
- שדה "אימות סיסמה"
- כפתור "שמור סיסמה חדשה"

### קוד לדוגמה (React)

```jsx
const [newPassword, setNewPassword] = useState('');
const [confirmPassword, setConfirmPassword] = useState('');
const [loading, setLoading] = useState(false);
const [error, setError] = useState('');

const email = location.state?.email;
const code = location.state?.code;

// בדיקת אבטחה - אם אין קוד/מייל, חזור לדף 1
useEffect(() => {
  if (!email || !code) {
    navigate('/forgot-password');
  }
}, []);

const handleResetPassword = async () => {
  // בדיקות בסיסיות
  if (newPassword.length < 8) {
    setError('הסיסמה חייבת להכיל לפחות 8 תווים');
    return;
  }

  if (newPassword !== confirmPassword) {
    setError('הסיסמאות אינן תואמות');
    return;
  }

  setLoading(true);
  setError('');

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
      // ✅ הסיסמה שונתה בהצלחה!
      // הצג הודעת הצלחה
      alert('הסיסמה שונתה בהצלחה! נשלח מייל אישור.');
      // עבור לדף התחברות
      navigate('/login');
    } else {
      setError(data.detail || 'שגיאה בשינוי הסיסמה');
    }
  } catch (err) {
    setError('שגיאת רשת, נסה שוב');
  } finally {
    setLoading(false);
  }
};
```

---

## הגנות אבטחה שמיושמות

### בשרת (Backend)

1. ✅ הקוד תקף רק 15 דקות
2. ✅ הקוד נמחק לאחר שימוש
3. ✅ בדיקת תקינות הקוד לפני שינוי סיסמה
4. ✅ הצפנת הסיסמה החדשה
5. ✅ לא חושפים אם המשתמש קיים

### בפרונט (Frontend)

1. ✅ לא ניתן לגשת לדף 3 ללא אימות קוד
2. ✅ הקוד והמייל עוברים בין הדפים דרך state
3. ✅ בדיקות תקינות לפני שליחה
4. ✅ הודעות ברורות למשתמש

---

## דוגמאות ל-API Responses

### 1. שליחת קוד (`/forgot-password`)

**הצלחה:**
```json
{
  "message": "קוד איפוס נשלח למייל שלך"
}
```

**שגיאה:**
```json
{
  "detail": "שגיאה בשרת, נסי שוב מאוחר יותר"
}
```

### 2. אימות קוד (`/verify-reset-code`)

**הצלחה:**
```json
{
  "message": "קוד אומת בהצלחה",
  "valid": true,
  "email": "user@example.com"
}
```

**קוד שגוי:**
```json
{
  "detail": "קוד אימות שגוי"
}
```

**קוד פג תוקף:**
```json
{
  "detail": "קוד האימות פג תוקף, בקש קוד חדש"
}
```

### 3. שינוי סיסמה (`/reset-password`)

**הצלחה:**
```json
{
  "message": "הסיסמה אופסה בהצלחה"
}
```

**שגיאות אפשריות:**
```json
{
  "detail": "קוד אימות שגוי"
}

{
  "detail": "קוד האימות פג תוקף, בקש קוד חדש"
}

{
  "detail": "value_error.any_str.min_length"  // סיסמה קצרה מדי
}
```

---

## טיימר לקוד (אופציונלי אבל מומלץ!)

```jsx
const [timeLeft, setTimeLeft] = useState(15 * 60); // 15 דקות בשניות

useEffect(() => {
  const timer = setInterval(() => {
    setTimeLeft(prev => {
      if (prev <= 0) {
        clearInterval(timer);
        return 0;
      }
      return prev - 1;
    });
  }, 1000);

  return () => clearInterval(timer);
}, []);

const formatTime = (seconds) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

// בUI:
{timeLeft > 0 ? (
  <p>הקוד תקף עוד {formatTime(timeLeft)}</p>
) : (
  <p style={{color: 'red'}}>הקוד פג תוקף. <a onClick={handleResendCode}>שלח קוד חדש</a></p>
)}
```

---

## עיצוב מומלץ

### צבעים (תואם למיילים)

```css
:root {
  --primary-brown: #8B6F47;
  --secondary-blue: #2C5F7F;
  --accent-beige: #B8986E;
  --text-dark: #2D2D2D;
  --bg-cream: #FAF8F5;
}
```

### כפתורים

```css
.button-primary {
  background: linear-gradient(135deg, #8B6F47 0%, #B8986E 100%);
  color: white;
  padding: 16px 45px;
  border-radius: 8px;
  font-weight: 600;
  letter-spacing: 0.5px;
  box-shadow: 0 4px 15px rgba(139, 111, 71, 0.25);
}
```

---

## סיכום ה-Flow

| שלב | דף | API Call | תוצאה |
|-----|-----|----------|--------|
| 1 | forgot-password | `/forgot-password` | מייל עם קוד נשלח |
| 2 | verify-code | `/verify-reset-code` | אימות קוד |
| 3 | reset-password | `/reset-password` | סיסמה שונתה + מייל אישור |

---

## בדיקות שכדאי לעשות

- [ ] נסי להזין קוד שגוי - תראי שגיאה
- [ ] נסי להזין קוד נכון - תעברי לדף 3
- [ ] נסי לגשת לדף 3 ישירות (ללא קוד) - תחזרי לדף 1
- [ ] נסי להזין סיסמה קצרה מ-8 תווים - תראי שגיאה
- [ ] נסי להזין סיסמאות שלא תואמות - תראי שגיאה
- [ ] המתיני 15 דקות לאחר קבלת הקוד - הקוד יפוג
- [ ] שני קוד חדש - הקוד הישן יוחלף

---

**זה המדריך המלא למימוש בפרונט! כל ה-API Endpoints מוכנים ועובדים.**

אם יש שאלות או צריך עזרה עם הקוד בפרונט - אני כאן! 🎯
