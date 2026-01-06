import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Navbar from '../components/Navbar';
import './PaymentResult.css';

export default function PaymentSuccess() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [paymentDetails, setPaymentDetails] = useState(null);
  const [loading, setLoading] = useState(true);

  const orderId = searchParams.get('order_id');
  const purchaseId = searchParams.get('purchase_id');

  useEffect(() => {
    // קונפטי אנימציה
    const duration = 3 * 1000;
    const animationEnd = Date.now() + duration;
    const colors = ['#26ccff', '#a25afd', '#ff5e7e', '#88ff5a', '#fcff42', '#ffa62d'];

    const frame = () => {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        return;
      }

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

    // שליפת פרטי התשלום
    if (orderId) {
      fetchPaymentDetails();
    } else {
      setLoading(false);
    }
  }, [orderId]);

  const fetchPaymentDetails = async () => {
    try {
      const API_URL = import.meta.env.VITE_API_URL || 'https://event-gift.onrender.com/api';
      const response = await fetch(`${API_URL}/payments/status/${orderId}`);

      if (response.ok) {
        const data = await response.json();
        setPaymentDetails(data);
      }
    } catch (error) {
      console.error('Error fetching payment details:', error);
    } finally {
      setLoading(false);
    }
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

          {loading ? (
            <div className="loading-spinner">
              <i className="fas fa-spinner fa-spin"></i>
              <p>טוען פרטי תשלום...</p>
            </div>
          ) : paymentDetails ? (
            <div className="payment-details">
              <div className="detail-row">
                <span className="detail-label">חבילה:</span>
                <span className="detail-value">{paymentDetails.package_name}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">סכום:</span>
                <span className="detail-value">₪{paymentDetails.amount}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">מזהה הזמנה:</span>
                <span className="detail-value">{orderId}</span>
              </div>
              {paymentDetails.reference && (
                <div className="detail-row">
                  <span className="detail-label">אסמכתא:</span>
                  <span className="detail-value">{paymentDetails.reference}</span>
                </div>
              )}
            </div>
          ) : null}

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
