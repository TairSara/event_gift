import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Navbar from '../components/Navbar';
import './PaymentResult.css';

export default function PaymentFailure() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [paymentDetails, setPaymentDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isInIframe, setIsInIframe] = useState(false);

  const orderId = searchParams.get('order_id');
  const purchaseId = searchParams.get('purchase_id');

  // בדיקה אם אנחנו בתוך iframe ושליחת הודעה ל-parent
  useEffect(() => {
    const inIframe = window.self !== window.top;
    setIsInIframe(inIframe);

    if (inIframe) {
      // שליחת הודעה לחלון האב שהתשלום נכשל
      window.parent.postMessage({
        type: 'PAYMENT_FAILURE',
        orderId: orderId,
        purchaseId: purchaseId
      }, '*');

      // הפניה לדף הכישלון בחלון הראשי
      window.top.location.href = `/payment/failure?order_id=${orderId}&purchase_id=${purchaseId}`;
    }
  }, [orderId, purchaseId]);

  useEffect(() => {
    // אם אנחנו בתוך iframe, לא צריך להמשיך
    if (isInIframe) return;

    // שליפת פרטי התשלום
    if (orderId) {
      fetchPaymentDetails();
    } else {
      setLoading(false);
    }
  }, [orderId, isInIframe]);

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

  const handleRetry = () => {
    navigate('/pricing');
  };

  return (
    <div className="payment-result-page">
      <Navbar />

      <div className="payment-result-container">
        <div className="payment-result-card failure">
          <div className="result-icon">
            <i className="fas fa-times-circle"></i>
          </div>

          <h1 className="result-title">התשלום לא הושלם</h1>
          <p className="result-subtitle">
            אופס, משהו השתבש בתהליך התשלום
          </p>

          {loading ? (
            <div className="loading-spinner">
              <i className="fas fa-spinner fa-spin"></i>
              <p>טוען פרטים...</p>
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
            </div>
          ) : null}

          <div className="failure-reasons">
            <h3>סיבות אפשריות:</h3>
            <ul>
              <li>
                <i className="fas fa-exclamation-triangle"></i>
                פרטי כרטיס האשראי שגויים
              </li>
              <li>
                <i className="fas fa-exclamation-triangle"></i>
                אין יתרה מספקת בכרטיס
              </li>
              <li>
                <i className="fas fa-exclamation-triangle"></i>
                הכרטיס נחסם לעסקאות באינטרנט
              </li>
              <li>
                <i className="fas fa-exclamation-triangle"></i>
                ביטלת את התשלום
              </li>
            </ul>
          </div>

          <div className="action-buttons">
            <button
              className="btn-primary"
              onClick={handleRetry}
            >
              נסה שוב
            </button>
            <button
              className="btn-secondary"
              onClick={() => navigate('/contact')}
            >
              צור קשר לתמיכה
            </button>
            <button
              className="btn-text"
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
