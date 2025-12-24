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
        <div className="intro-modal-content">
          <h2 className="intro-modal-title">כעת הנך עובר לדף יצירת הזמנה</h2>
          <p className="intro-modal-text intro-modal-text-desktop">
            נעביר אותך לממשק יצירת ההזמנה הדיגיטלית<br />
            בו תוכל לבחור תבנית, לערוך פרטים ולהוריד את ההזמנה שלך
          </p>
          <p className="intro-modal-text intro-modal-text-mobile">
            נעביר אותך לממשק יצירת ההזמנה
          </p>
        </div>

        <div className="intro-modal-buttons">
          <button className="btn-primary" onClick={handleContinue}>
            המשך
          </button>
          <button className="btn-secondary" onClick={onClose}>
            ביטול
          </button>
        </div>
      </div>
    </div>
  );
}
