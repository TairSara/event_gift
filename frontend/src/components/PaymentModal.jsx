import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import './PaymentModal.css';

export default function PaymentModal({
  isOpen,
  onClose,
  paymentUrl,
  formData,
  packageName,
  amount
}) {
  const navigate = useNavigate();
  const formRef = useRef(null);
  const iframeRef = useRef(null);
  const [isLoading, setIsLoading] = useState(true);
  const [formSubmitted, setFormSubmitted] = useState(false);

  // שליחת הטופס ל-iframe כשנפתח המודל
  useEffect(() => {
    if (isOpen && formData && paymentUrl && !formSubmitted) {
      // נותן זמן ל-iframe להיטען
      const timer = setTimeout(() => {
        if (formRef.current) {
          formRef.current.submit();
          setFormSubmitted(true);
        }
      }, 100);

      return () => clearTimeout(timer);
    }
  }, [isOpen, formData, paymentUrl, formSubmitted]);

  // האזנה לניווט בתוך ה-iframe (success/failure)
  useEffect(() => {
    if (!isOpen) return;

    const handleMessage = (event) => {
      // בדיקה שההודעה מגיעה מטרנזילה
      if (event.origin.includes('tranzila.com')) {
        console.log('[Tranzila Message]', event.data);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [isOpen]);

  // איפוס המצב כשסוגרים
  useEffect(() => {
    if (!isOpen) {
      setFormSubmitted(false);
      setIsLoading(true);
    }
  }, [isOpen]);

  const handleIframeLoad = () => {
    setIsLoading(false);

    // בדיקה האם ה-iframe הגיע לדף success/failure שלנו
    try {
      const iframeUrl = iframeRef.current?.contentWindow?.location?.href;
      if (iframeUrl) {
        if (iframeUrl.includes('/payment/success')) {
          // ניווט לדף ההצלחה
          const url = new URL(iframeUrl);
          navigate(`/payment/success${url.search}`);
          onClose();
        } else if (iframeUrl.includes('/payment/failure')) {
          // ניווט לדף הכישלון
          const url = new URL(iframeUrl);
          navigate(`/payment/failure${url.search}`);
          onClose();
        }
      }
    } catch (e) {
      // Cross-origin - לא יכולים לגשת ל-URL (זה צפוי כשה-iframe בטרנזילה)
    }
  };

  if (!isOpen) return null;

  return (
    <div className="payment-modal-overlay" onClick={onClose}>
      <div className="payment-modal" onClick={(e) => e.stopPropagation()}>
        <div className="payment-modal-header">
          <div className="payment-modal-title">
            <i className="fas fa-lock"></i>
            <span>תשלום מאובטח</span>
          </div>
          <button className="payment-modal-close" onClick={onClose}>
            <i className="fas fa-times"></i>
          </button>
        </div>

        <div className="payment-modal-info">
          <div className="payment-info-row">
            <span className="payment-info-label">חבילה:</span>
            <span className="payment-info-value">{packageName}</span>
          </div>
          <div className="payment-info-row">
            <span className="payment-info-label">סכום לתשלום:</span>
            <span className="payment-info-value payment-amount">₪{amount}</span>
          </div>
        </div>

        <div className="payment-modal-content">
          {isLoading && (
            <div className="payment-loading">
              <i className="fas fa-spinner fa-spin"></i>
              <p>טוען טופס תשלום...</p>
            </div>
          )}

          {/* טופס נסתר לשליחה ל-iframe */}
          <form
            ref={formRef}
            action={paymentUrl}
            method="POST"
            target="tranzila-iframe"
            style={{ display: 'none' }}
          >
            {formData && Object.entries(formData).map(([key, value]) => (
              <input key={key} type="hidden" name={key} value={value} />
            ))}
          </form>

          {/* ה-iframe של טרנזילה */}
          <iframe
            ref={iframeRef}
            name="tranzila-iframe"
            className="payment-iframe"
            allowpaymentrequest="true"
            allow="payment"
            onLoad={handleIframeLoad}
            style={{ opacity: isLoading ? 0 : 1 }}
          />
        </div>

        <div className="payment-modal-footer">
          <div className="payment-security-badges">
            <span className="security-badge">
              <i className="fas fa-shield-alt"></i>
              PCI-DSS מאובטח
            </span>
            <span className="security-badge">
              <i className="fas fa-lock"></i>
              SSL מוצפן
            </span>
          </div>
          <p className="payment-disclaimer">
            התשלום מתבצע באמצעות טרנזילה - פרטי הכרטיס שלך לא נשמרים אצלנו
          </p>
        </div>
      </div>
    </div>
  );
}
