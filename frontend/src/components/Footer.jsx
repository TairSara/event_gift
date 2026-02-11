import { useNavigate } from "react-router-dom";
import "./Footer.css";

export default function Footer() {
  const navigate = useNavigate();

  return (
    <footer className="site-footer">
      <div className="site-footer-container">
        <div className="site-footer-simple">
          <ul className="site-footer-links-row">
            <li>
              <a
                href="/contact"
                onClick={(e) => {
                  e.preventDefault();
                  navigate('/contact');
                }}
              >
                צור קשר
              </a>
            </li>
            <li>
              <a
                href="/contact#faq"
                onClick={(e) => {
                  e.preventDefault();
                  navigate('/contact#faq');
                  setTimeout(() => {
                    const el = document.getElementById('faq');
                    if (el) el.scrollIntoView({ behavior: 'smooth' });
                  }, 100);
                }}
              >
                שאלות נפוצות
              </a>
            </li>
            <li>
              <a
                href="/pricing"
                onClick={(e) => {
                  e.preventDefault();
                  navigate('/pricing');
                }}
              >
                מחירים
              </a>
            </li>
          </ul>
        </div>
        <div className="site-footer-bottom">
          <p>&copy; 2025 Save the Day. כל הזכויות שמורות.</p>
          <p className="site-footer-credit">
            נבנה על-ידי <a href="https://www.mtcores.com/" target="_blank" rel="noopener noreferrer">MTCORE</a> פתרונות דיגיטליים.
          </p>
        </div>
      </div>
    </footer>
  );
}
