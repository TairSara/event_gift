import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Confetti from '../components/Confetti';
import './PaymentResult.css';

export default function PaymentThankYou() {
  const navigate = useNavigate();

  return (
    <div className="payment-result-page">
      <Confetti />
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
