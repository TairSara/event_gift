import { useNavigate } from 'react-router-dom';
import './ConfirmationModal.css';

export default function ConfirmationModal({ isOpen, onClose, eventType, eventTitle }) {
  const navigate = useNavigate();

  if (!isOpen) return null;

  const handleConfirm = () => {
    navigate(`/create-invitation/${eventType}`);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h2 className="modal-title">בניית הזמנה ל{eventTitle}</h2>

        <p className="modal-description">
          אתה עומד לעבור לממשק הבנייה המלא שבו תוכל:
        </p>

        <ul className="modal-features">
          <li>לבחור צבעים בחופשיות עם פלטת צבעים מלאה</li>
          <li>לבחור רקע מתוך מגוון תמונות מקצועיות</li>
          <li>להתאים כל פרט - כותרות, טקסטים ועיצוב</li>
          <li>להעלות תמונה ומוזיקת רקע</li>
          <li>לראות תצוגה מקדימה בזמן אמת</li>
        </ul>

        <div className="modal-actions">
          <button className="btn-secondary" onClick={onClose}>
            ביטול
          </button>
          <button className="btn-primary btn-large" onClick={handleConfirm}>
            בוא נתחיל
          </button>
        </div>
      </div>
    </div>
  );
}
