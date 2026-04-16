import { useNavigate, useSearchParams } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Confetti from '../components/Confetti';
import './PaymentResult.css';

export default function PaymentThankYou() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const packageSlug = searchParams.get('package');
  const amount = searchParams.get('amount');

  const packageNameMap = {
    'basic': 'חבילת בסיס – ידני',
    'sms': 'אוטומטי SMS',
    'whatsapp': 'אוטומטי WhatsApp',
    'peace-of-mind': 'אוטומטי "ראש שקט"',
    'peace-of-mind-plus': 'אוטומטי "ראש שקט פלוס"',
  };
  const packageName = packageSlug ? (packageNameMap[packageSlug] || packageSlug) : null;

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

          {(packageName || amount) && (
            <div className="payment-details">
              {packageName && (
                <div className="detail-row">
                  <span className="detail-label">חבילה:</span>
                  <span className="detail-value">{packageName}</span>
                </div>
              )}
              {amount && (
                <div className="detail-row">
                  <span className="detail-label">סכום:</span>
                  <span className="detail-value">₪{amount}</span>
                </div>
              )}
            </div>
          )}

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
