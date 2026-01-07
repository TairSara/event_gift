import { useEffect, useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Navbar from '../components/Navbar';
import './PaymentResult.css';

export default function PaymentSuccess() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [paymentDetails, setPaymentDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pollingStatus, setPollingStatus] = useState('checking'); // 'checking', 'confirmed', 'timeout'
  const [attempts, setAttempts] = useState(0);
  const intervalRef = useRef(null);
  const confettiStarted = useRef(false);

  const orderId = searchParams.get('order_id');
  const purchaseId = searchParams.get('purchase_id');

  const MAX_ATTEMPTS = 15; // 15 ניסיונות = 30 שניות (כל 2 שניות)
  const POLL_INTERVAL = 2000; // 2 שניות

  useEffect(() => {
    if (!orderId) {
      setLoading(false);
      return;
    }

    // התחלת Polling
    startPolling();

    // ניקוי ה-interval כשיוצאים מהדף
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [orderId]);

  const startPolling = () => {
    // ניסיון ראשון מיידי
    checkPaymentStatus();

    // המשך polling כל 2 שניות
    intervalRef.current = setInterval(() => {
      checkPaymentStatus();
    }, POLL_INTERVAL);
  };

  const checkPaymentStatus = async () => {
    try {
      const API_URL = import.meta.env.VITE_API_URL || 'https://event-gift.onrender.com/api';
      const response = await fetch(`${API_URL}/payments/status/${orderId}`);

      if (response.ok) {
        const data = await response.json();
        console.log('[Payment Status]', data);

        setAttempts(prev => prev + 1);

        // בדיקה אם התשלום אושר
        if (data.payment_status === 'completed' || data.status === 'active') {
          // הצלחה!
          setPaymentDetails(data);
          setPollingStatus('confirmed');
          setLoading(false);

          // עצירת ה-polling
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
          }

          // הפעלת קונפטי (רק פעם אחת)
          if (!confettiStarted.current) {
            confettiStarted.current = true;
            launchConfetti();
          }
        } else if (data.payment_status === 'failed') {
          // כישלון - העברה לדף failure
          navigate(`/payment/failure?order_id=${orderId}&purchase_id=${purchaseId}`);
        } else {
          // עדיין pending
          setPaymentDetails(data);

          // בדיקת timeout
          if (attempts >= MAX_ATTEMPTS) {
            setPollingStatus('timeout');
            setLoading(false);

            if (intervalRef.current) {
              clearInterval(intervalRef.current);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error fetching payment details:', error);
      setAttempts(prev => prev + 1);

      if (attempts >= MAX_ATTEMPTS) {
        setPollingStatus('timeout');
        setLoading(false);

        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      }
    }
  };

  const launchConfetti = () => {
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
  };

  return (
    <div className="payment-result-page">
      <Navbar />

      <div className="payment-result-container">
        <div className="payment-result-card success">
          {pollingStatus === 'checking' && (
            <>
              <div className="result-icon checking">
                <i className="fas fa-spinner fa-spin"></i>
              </div>
              <h1 className="result-title">מאמת את התשלום...</h1>
              <p className="result-subtitle">
                רק רגע, אנחנו מוודאים שהכל בסדר 🔄
              </p>
              <div className="loading-spinner">
                <p>ניסיון {attempts + 1}/{MAX_ATTEMPTS}</p>
                <p style={{fontSize: '0.9rem', opacity: 0.7, marginTop: '0.5rem'}}>
                  זה יכול לקחת עד 30 שניות
                </p>
              </div>
            </>
          )}

          {pollingStatus === 'confirmed' && (
            <>
              <div className="result-icon">
                <i className="fas fa-check-circle"></i>
              </div>

              <h1 className="result-title">התשלום בוצע בהצלחה!</h1>
              <p className="result-subtitle">
                תודה שבחרתם ב-Save the Day 🎉
              </p>

              {paymentDetails && (
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
            </>
          )}

          {pollingStatus === 'timeout' && (
            <>
              <div className="result-icon timeout">
                <i className="fas fa-clock"></i>
              </div>

              <h1 className="result-title">התשלום בבדיקה</h1>
              <p className="result-subtitle">
                לא הצלחנו לאמת את התשלום כרגע
              </p>

              <div className="timeout-message">
                <p>
                  <i className="fas fa-info-circle"></i>
                  אל דאגה! זה לא אומר שהתשלום נכשל.
                </p>
                <p>תקבל אישור למייל ברגע שהתשלום יאומת במערכת.</p>
                <p style={{marginTop: '1rem', fontSize: '0.9rem', opacity: 0.8}}>
                  מזהה הזמנה: <strong>{orderId}</strong>
                </p>
              </div>

              <div className="action-buttons">
                <button
                  className="btn-primary"
                  onClick={() => navigate('/dashboard')}
                >
                  עבור לדשבורד
                </button>
                <button
                  className="btn-secondary"
                  onClick={() => navigate('/contact')}
                >
                  צור קשר לתמיכה
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
