import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import './PaymentResult.css';

export default function PaymentThankYou() {
  const navigate = useNavigate();
  const confettiStarted = useRef(false);

  useEffect(() => {
    if (!confettiStarted.current) {
      confettiStarted.current = true;
      launchConfetti();
    }
  }, []);

  const launchConfetti = () => {
    const duration = 3 * 1000;
    const animationEnd = Date.now() + duration;
    const colors = ['#26ccff', '#a25afd', '#ff5e7e', '#88ff5a', '#fcff42', '#ffa62d'];

    const frame = () => {
      if (Date.now() >= animationEnd) return;

      const particleCount = 2;
      confetti({
        particleCount,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: colors
      });
      confetti({
        particleCount,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: colors
      });

      requestAnimationFrame(frame);
    };

    frame();
  };

  return (
    <div className="payment-result-page">
      <Navbar />

      <div className="payment-result-container">
        <div className="payment-result-card success">
          <div className="result-icon">
            <i className="fas fa-check-circle"></i>
          </div>

          <h1 className="result-title">התשלום בוצע בהצלחה!</h1>
          <p className="result-subtitle">
            תודה שבחרתם ב-Save the Day 🎉
          </p>

          <div className="next-steps">
            <h3>מה הלאה?</h3>
            <ul>
              <li>
                <i className="fas fa-check"></i>
                החבילה שלך פעילה ומוכנה לשימוש
              </li>
              <li>
                <i className="fas fa-check"></i>
                תוכל ליצור הזמנות ולנהל את האירועים שלך
              </li>
              <li>
                <i className="fas fa-check"></i>
                קיבלת אישור למייל שהזנת
              </li>
            </ul>
          </div>

          <div className="action-buttons">
            <button
              className="btn-primary"
              onClick={() => navigate('/dashboard')}
            >
              עבור לדשבורד שלי
            </button>
            <button
              className="btn-secondary"
              onClick={() => navigate('/')}
            >
              חזרה לדף הבית
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
