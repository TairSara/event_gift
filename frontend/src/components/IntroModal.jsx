import { useNavigate } from 'react-router-dom';
import './IntroModal.css';

export default function IntroModal({ isOpen, onClose, eventType }) {
  const navigate = useNavigate();

  if (!isOpen) return null;

  const handleContinue = () => {
    onClose();
    navigate(`/create-invitation/${eventType}`);
  };

  return (
    <div className="intro-modal-overlay" onClick={onClose}>
      <div className="intro-modal" onClick={(e) => e.stopPropagation()}>
        <button className="intro-modal-close" onClick={onClose}>
          <i className="fas fa-times"></i>
        </button>

        <h2 className="intro-modal-title">יצירת הזמנה דיגיטלית</h2>

        <div className="intro-modal-content">
          <div className="intro-step">
            <div className="intro-step-icon">
              <i className="fas fa-th-large"></i>
            </div>
            <div className="intro-step-text">
              <h3>בחירת תבנית</h3>
              <p>בחר מתוך מגוון תבניות מעוצבות במיוחד</p>
            </div>
          </div>

          <div className="intro-arrow">
            <i className="fas fa-arrow-down"></i>
          </div>

          <div className="intro-step">
            <div className="intro-step-icon">
              <i className="fas fa-edit"></i>
            </div>
            <div className="intro-step-text">
              <h3>עריכת צד קדמי ואחורי</h3>
              <p>ערוך את פרטי ההזמנה עם תצוגה חיה בזמן אמת</p>
            </div>
          </div>

          <div className="intro-arrow">
            <i className="fas fa-arrow-down"></i>
          </div>

          <div className="intro-step">
            <div className="intro-step-icon">
              <i className="fas fa-check-circle"></i>
            </div>
            <div className="intro-step-text">
              <h3>אישור כל צד</h3>
              <p>אשר את הצד הקדמי והאחורי לפני המעבר הלאה</p>
            </div>
          </div>

          <div className="intro-arrow">
            <i className="fas fa-arrow-down"></i>
          </div>

          <div className="intro-step">
            <div className="intro-step-icon">
              <i className="fas fa-download"></i>
            </div>
            <div className="intro-step-text">
              <h3>הורדת ההזמנה</h3>
              <p>קבל את ההזמנה המשולבת בפורמט PNG או PDF</p>
            </div>
          </div>
        </div>

        <div className="intro-modal-buttons">
          <button className="btn-primary btn-large" onClick={handleContinue}>
            המשך ליצירה
          </button>
          <button className="btn-secondary btn-large" onClick={onClose}>
            ביטול
          </button>
        </div>
      </div>
    </div>
  );
}
