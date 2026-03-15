import { useState, useEffect } from 'react';
import './CookieConsent.css';

export default function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem('cookie_consent');
    if (!consent) {
      setTimeout(() => setVisible(true), 800);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem('cookie_consent', 'accepted');
    setVisible(false);
  };

  const handleDecline = () => {
    localStorage.setItem('cookie_consent', 'declined');
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="cookie-overlay">
      <div className="cookie-banner">
        <div className="cookie-icon">🍪</div>
        <div className="cookie-content">
          <h3>אנו משתמשים בעוגיות</h3>
          <p>
            האתר שלנו משתמש בעוגיות (Cookies) כדי לשפר את חוויית הגלישה שלך,
            לזכור את העדפותיך ולניתוח תנועת האתר. המשך השימוש באתר מהווה
            הסכמה למדיניות הפרטיות שלנו.
          </p>
        </div>
        <div className="cookie-actions">
          <button className="cookie-btn-accept" onClick={handleAccept}>
            אני מסכים/ה
          </button>
          <button className="cookie-btn-decline" onClick={handleDecline}>
            דחה
          </button>
        </div>
      </div>
    </div>
  );
}
