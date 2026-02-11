import { useState } from "react";
import { useNavigate } from "react-router-dom";
import TermsModal from "./TermsModal";
import "./Footer.css";

export default function Footer({ onTermsClick }) {
  const navigate = useNavigate();
  const [termsOpen, setTermsOpen] = useState(false);

  const handleTermsClick = (e) => {
    e.preventDefault();
    if (onTermsClick) {
      onTermsClick();
    } else {
      setTermsOpen(true);
    }
  };

  return (
    <>
      <footer className="site-footer">
        <div className="site-footer-inner">
          <div className="site-footer-links">
            <a
              href="/contact"
              onClick={(e) => {
                e.preventDefault();
                navigate('/contact');
              }}
            >
              צור קשר
            </a>
            <span className="site-footer-dot">·</span>
            <a
              href="/contact#faq"
              onClick={(e) => {
                e.preventDefault();
                navigate('/contact');
                setTimeout(() => {
                  const el = document.getElementById('faq');
                  if (el) el.scrollIntoView({ behavior: 'smooth' });
                }, 300);
              }}
            >
              שאלות נפוצות
            </a>
            <span className="site-footer-dot">·</span>
            <a href="#" onClick={handleTermsClick}>תקנון</a>
            <span className="site-footer-dot">·</span>
            <a href="#" onClick={handleTermsClick}>מדיניות פרטיות</a>
            <span className="site-footer-dot">·</span>
            <a href="#" onClick={handleTermsClick}>הצהרת נגישות</a>
          </div>
          <div className="site-footer-bottom">
            <p>&copy; 2025 Save the Day. כל הזכויות שמורות.</p>
            <p className="site-footer-credit">
              נבנה על-ידי <a href="https://www.mtcores.com/" target="_blank" rel="noopener noreferrer">MTCORE</a> פתרונות דיגיטליים.
            </p>
          </div>
        </div>
      </footer>
      {!onTermsClick && <TermsModal isOpen={termsOpen} onClose={() => setTermsOpen(false)} />}
    </>
  );
}
