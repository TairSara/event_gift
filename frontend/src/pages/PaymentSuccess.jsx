import { useEffect, useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Navbar from '../components/Navbar';
import './PaymentResult.css';

export default function PaymentSuccess() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [pollingStatus, setPollingStatus] = useState('checking'); // 'checking', 'timeout'
  const [attempts, setAttempts] = useState(0);
  const intervalRef = useRef(null);
  const [isInIframe, setIsInIframe] = useState(false);

  const orderId = searchParams.get('order_id');
  const purchaseId = searchParams.get('purchase_id');

  const MAX_ATTEMPTS = 15; // 15 ניסיונות = 30 שניות (כל 2 שניות)
  const POLL_INTERVAL = 2000; // 2 שניות

  // בדיקה אם אנחנו בתוך iframe ושליחת הודעה ל-parent
  useEffect(() => {
    const inIframe = window.self !== window.top;
    setIsInIframe(inIframe);

    if (inIframe && orderId) {
      window.parent.postMessage({
        type: 'PAYMENT_SUCCESS',
        orderId: orderId,
        purchaseId: purchaseId
      }, '*');

      window.top.location.href = `/payment/success?order_id=${orderId}&purchase_id=${purchaseId}`;
    }
  }, [orderId, purchaseId]);

  useEffect(() => {
    if (isInIframe) return;

    if (!orderId) {
      navigate('/payment/thank-you');
      return;
    }

    confirmPaymentSuccess();

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [orderId, isInIframe]);

  const confirmPaymentSuccess = async () => {
    try {
      const API_URL = import.meta.env.VITE_API_URL || 'https://event-gift.onrender.com/api';
      await fetch(`${API_URL}/payments/confirm-success/${orderId}`, {
        method: 'POST'
      });
      startPolling();
    } catch (error) {
      console.error('Error confirming payment:', error);
      startPolling();
    }
  };

  const startPolling = () => {
    checkPaymentStatus();

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

        if (data.payment_status === 'completed' || data.status === 'active') {
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
          }
          const params = new URLSearchParams();
          if (data.package_name) params.set('package', data.package_name);
          if (data.amount) params.set('amount', data.amount);
          if (data.reference) params.set('reference', data.reference);
          navigate(`/payment/thank-you?${params.toString()}`);
        } else if (data.payment_status === 'failed') {
          navigate(`/payment/failure?order_id=${orderId}&purchase_id=${purchaseId}`);
        } else {
          if (attempts >= MAX_ATTEMPTS) {
            setPollingStatus('timeout');
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
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      }
    }
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
