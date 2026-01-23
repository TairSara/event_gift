import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import ConfirmationModal from "./components/ConfirmationModal";
import IntroModal from "./components/IntroModal";
import TermsModal from "./components/TermsModal";
import Navbar from "./components/Navbar";
import "./App.css";

export default function App() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isFirstLoad, setIsFirstLoad] = useState(true);
  const [currentTestimonial, setCurrentTestimonial] = useState(0);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [introModalOpen, setIntroModalOpen] = useState(false);
  const [introEventType, setIntroEventType] = useState(null);
  const [showHeroConfetti, setShowHeroConfetti] = useState(true);
  const [termsModalOpen, setTermsModalOpen] = useState(false);

  // Array of image paths (1-8)
  const images = [
    '/images/1.webp',
    '/images/2.webp',
    '/images/3.webp',
    '/images/4.webp',
    '/images/5.webp',
    '/images/6.webp',
    '/images/7.webp',
    '/images/8.webp'
  ];

  // Rotate all images every 5 seconds, ensuring they always show different images
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % images.length);
      setIsFirstLoad(false);
    }, 5000);
    return () => clearInterval(interval);
  }, [images.length]);

  // Hide hero confetti after 5 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowHeroConfetti(false);
    }, 5000);
    return () => clearTimeout(timer);
  }, []);

  // Calculate indices to ensure no two phones show the same image
  // With 8 images and 3 phones, we space them evenly
  const leftImageIndex = currentImageIndex;
  const topImageIndex = (currentImageIndex + 3) % images.length;
  const rightImageIndex = (currentImageIndex + 6) % images.length;

  // Testimonials data and carousel
  const testimonials = [
    { text: "המערכת הכי טובה שראיתי ההזמנות יצאו מהממות והאורחים התלהבו השירות היה מעולה ותמיד עזרו לנו", author: "שרה ודוד כהן", event: "חתונה" },
    { text: "חסכתי המון זמן וכסף המערכת סופר קלה לשימוש והתוצאה מקצועית ממליצה בחום", author: "רחל לוי", event: "בת מצווה" },
    { text: "פשוט מושלם האורחים אהבו את ההזמנות הדיגיטליות וניהול האורחים היה נוח ומהיר תודה רבה", author: "משה אברהם", event: "ברית" },
    { text: "חוויה מדהימה מתחילה ועד סוף העיצובים יפים והמערכת נוחה מאוד קיבלנו המון מחמאות", author: "יעל ויוסי מזרחי", event: "חינה" },
    { text: "שירות מעולה ותמיכה זמינה עזרו לנו בכל שלב ונתנו לנו את ההרגשה שאנחנו חשובים", author: "דנה גולן", event: "יום הולדת" },
    { text: "המערכת הכי מקצועית השתמשנו בה לכנס השנתי של החברה והתוצאות היו מעל למצופה", author: "אורי שמואל", event: "כנס חברה" },
    { text: "תודה על האירוע המושלם ההזמנות היו מרהיבות וניהול האורחים היה קל ופשוט", author: "מיכל ואלעד בן דוד", event: "בר מצווה" },
    { text: "פשוט אין על זה חסכנו כל כך הרבה זמן וכאב ראש הכל היה ממוחשב ומסודר", author: "תמר רוזנברג", event: "זבד הבת" },
    { text: "השירות הטוב ביותר אני ממליצה לכל מי שמחפש פתרון מקצועי ויעיל לאירועים", author: "נועה כץ", event: "חתונה" },
    { text: "אחלה מערכת קלה לשימוש יפה ומקצועית בדיוק מה שחיפשתי תודה על הכל", author: "רון ושני אלון", event: "חתונה" }
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTestimonial((prev) => (prev + 1) % testimonials.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [testimonials.length]);

  // פונקציה לפתיחת המודל
  const handleEventClick = (eventType, eventTitle) => {
    // אפשר ליצור הזמנות גם בלי להתחבר
    // If it's a wedding, hina, bar-mitzvah, bat-mitzvah, brit, brita, birthday, knasim, or other event, show intro modal for invitation builder
    const invitationBuilderEvents = ['wedding', 'hina', 'bar-mitzvah', 'bat-mitzvah', 'brit', 'brita', 'birthday', 'knasim', 'other'];

    if (invitationBuilderEvents.includes(eventType)) {
      setIntroEventType(eventType);
      setIntroModalOpen(true);
    } else {
      // For other events, show the old confirmation modal
      setSelectedEvent({ type: eventType, title: eventTitle });
      setModalOpen(true);
    }
  };

  return (
    <div className="app">
      {/* Intro Modal for Invitation Builder */}
      <IntroModal
        isOpen={introModalOpen}
        onClose={() => setIntroModalOpen(false)}
        eventType={introEventType}
      />

      {/* Modal for confirmation */}
      <ConfirmationModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        eventType={selectedEvent?.type}
        eventTitle={selectedEvent?.title}
      />

      {/* Terms Modal */}
      <TermsModal
        isOpen={termsModalOpen}
        onClose={() => setTermsModalOpen(false)}
      />

      {/* Navigation */}
      <Navbar />

      {/* Hero Section */}
      <section className="hero">
        <div className="hero-container">
          <div className="hero-content">
           <h1 className="hero-title">Save The Day</h1>
<h2 className="hero-tagline">הזמנה אחת. חוויה שלמה.</h2>
<p className="hero-subtitle">
  הזמנות דיגיטליות מעוצבות, אישורי הגעה בזמן אמת – הכול במקום אחד חכם ונוח.<br />
  שלחו הזמנה, עקבו אחר התגובות וקבלו שליטה מלאה על האירוע שלכם.<br />
  Save The Day הופכת כל הזמנה לחוויה יוקרתית,<br />
  מרגשת ובלתי נשכחת – כמו שהאירוע שלכם ראוי להיות.<br /><br />
  <strong>וגם – קבלו הזמנה לאירוע בחינם !</strong>
</p>

            <div className="hero-buttons">
              <button
                className="btn-primary btn-large"
                onClick={() => {
                  document.getElementById('events')?.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                  });
                }}
              >
                <span>ליצירת הזמנה</span>
              </button>
              <button
                className="btn-secondary btn-large"
                onClick={() => navigate('/register')}
              >
                <span>להרשמה לאתר</span>
              </button>
            </div>
          </div>

          <div className="hero-carousel">
            <div className="phones-pyramid">
              {/* Phone 1 - Left */}
              <div className="phone-mockup phone-left">
                <img
                  key={`left-${leftImageIndex}`}
                  src={images[leftImageIndex]}
                  alt={`הזמנה דיגיטלית מעוצבת - דוגמה ${leftImageIndex + 1} | Save the Day`}
                  loading="eager"
                  className={`carousel-image ${isFirstLoad ? 'carousel-fade-slide' : ''}`}
                />
              </div>

              {/* Phone 2 - Top/Middle */}
              <div className="phone-mockup phone-top">
                <img
                  key={`top-${topImageIndex}`}
                  src={images[topImageIndex]}
                  alt={`הזמנה דיגיטלית מעוצבת לאירועים - דוגמה ${topImageIndex + 1} | Save the Day`}
                  loading="eager"
                  className={`carousel-image ${isFirstLoad ? 'carousel-zoom' : ''}`}
                />
              </div>

              {/* Phone 3 - Right */}
              <div className="phone-mockup phone-right">
                <img
                  key={`right-${rightImageIndex}`}
                  src={images[rightImageIndex]}
                  alt={`עיצוב הזמנה דיגיטלית מקצועית - דוגמה ${rightImageIndex + 1} | Save the Day`}
                  loading="eager"
                  className={`carousel-image ${isFirstLoad ? 'carousel-fade-slide' : ''}`}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="features">
        <div className="features-container">
          <div className="section-title">
            <h2>למה לבחור בנו?</h2>
            <p className="section-subtitle">כל מה שצריך לאירוע המושלם שלך</p>
          </div>
          <div className="features-grid">
            <div className="feature-card feature-card-turquoise">
              <div className="feature-icon"><i className="fas fa-envelope-open-text"></i></div>
              <h3>הזמנות דיגיטליות</h3>
              <p>עיצובים מרהיבים ומותאמים אישית לכל סוג אירוע. שליחה אוטומטית באמצעות WhatsApp ו־SMS</p>
            </div>
            <div className="feature-card feature-card-turquoise">
              <div className="feature-icon"><i className="fas fa-clipboard-check"></i></div>
              <h3>ניהול אישורי הגעה</h3>
              <p>מערכת חכמה למעקב אחר האורחים שלך. דע מי מגיע ומי לא בזמן אמת</p>
            </div>
            <div className="feature-card feature-card-turquoise">
              <div className="feature-icon"><i className="fas fa-chart-line"></i></div>
              <h3> לוח ניהול חכם</h3>
              <p>כל המידע במקום אחד - עקוב אחר אישורי הגעה, מתנות והודעות מהאורחים</p>
            </div>
            <div className="feature-card feature-card-turquoise">
              <div className="feature-icon"><i className="fas fa-wand-magic-sparkles"></i></div>
              <h3>התאמה אישית של ההזמנה</h3>
              <p>עצב את ההזמנה בסטייל שלך - צבעים, תמונות, טקסטים ועיצוב ייחודי שמשקף אותך</p>
            </div>
            <div className="feature-card feature-card-turquoise">
              <div className="feature-icon"><i className="fas fa-shield-alt"></i></div>
              <h3>בטיחות ואבטחה</h3>
              <p>תשלומים מאובטחים עם הצפנה מלאה. המידע שלך והאורחים שלך מוגנים</p>
            </div>
            <div className="feature-card feature-card-turquoise">
              <div className="feature-icon"><i className="fas fa-phone"></i></div>
              <h3>אישורי הגעה טלפוניים</h3>
              <p>מערכת מתקדמת לאישור הגעה באמצעות טלפון - נוח, פשוט ומהיר לכל הגילאים</p>
            </div>
            <div className="feature-card feature-card-turquoise">
              <div className="feature-icon"><i className="fas fa-tags"></i></div>
              <h3>התמורה הכי גבוהה במחיר הכי נמוך</h3>
              <p>חבילות מתומחרות בצורה הוגנת ביותר - קבל את כל מה שאתה צריך במחיר שלא ניתן להתחרות בו</p>
            </div>
          </div>
        </div>
      </section>

      {/* Event Types Section */}
      <section id="events" className="event-types">
        <div className="features-container">
          <div className="section-title">
            <h2>אירועים שאנחנו מתמחים בהם</h2>
            <p className="section-subtitle">לכל אירוע - הזמנה מושלמת</p>
          </div>
          <div className="event-types-grid">
            {/* חתונה */}
            <div
              className="event-card event-card-wedding"
              onClick={() => handleEventClick('wedding', 'חתונה')}
              style={{ backgroundImage: 'url(/images/A.webp)' }}
            >
              <h3>חתונה</h3>
            </div>

            {/* חינה */}
            <div
              className="event-card"
              onClick={() => handleEventClick('hina', 'חינה')}
              style={{ backgroundImage: 'url(/images/B.webp)' }}
            >
              <h3>חינה</h3>
            </div>

            {/* ברית */}
            <div
              className="event-card"
              onClick={() => handleEventClick('brit', 'ברית')}
              style={{ backgroundImage: 'url(/images/C.webp)' }}
            >
              <h3>ברית</h3>
            </div>

            {/* זבד הבת */}
            <div
              className="event-card"
              onClick={() => handleEventClick('brita', 'זבד הבת')}
              style={{ backgroundImage: 'url(/images/D.webp)' }}
            >
              <h3>זבד הבת</h3>
            </div>

            {/* בת מצווה */}
            <div
              className="event-card"
              onClick={() => handleEventClick('bat-mitzvah', 'בת מצווה')}
              style={{ backgroundImage: 'url(/images/F.webp)' }}
            >
              <h3>בת מצווה</h3>
            </div>

            {/* בר מצווה */}
            <div
              className="event-card"
              onClick={() => handleEventClick('bar-mitzvah', 'בר מצווה')}
              style={{ backgroundImage: 'url(/images/G.webp)' }}
            >
              <h3>בר מצווה</h3>
            </div>

            {/* יום הולדת */}
            <div
              className="event-card"
              onClick={() => handleEventClick('birthday', 'יום הולדת')}
              style={{ backgroundImage: 'url(/images/H.webp)' }}
            >
              <h3>יום הולדת</h3>
            </div>

            {/* כנסים ואירועי חברה */}
            <div
              className="event-card"
              onClick={() => handleEventClick('knasim', 'כנסים ואירועי חברה')}
              style={{ backgroundImage: 'url(/images/I.webp)' }}
            >
              <h3>כנסים ואירועי חברה</h3>
            </div>

          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="how-it-works">
        <div className="features-container">
          <div className="section-title">
            <h2>איך זה עובד?</h2>
            <p className="section-subtitle">6 צעדים פשוטים לאירוע מושלם</p>
          </div>
          <div className="steps-container">
            <div className="step">
              <div className="step-number">1</div>
              <div className="step-content">
                <h3>בחר סוג אירוע</h3>
                <p>בחר את סוג האירוע שלך מתוך מגוון האפשרויות - חתונה, בר מצווה, ברית ועוד</p>
              </div>
            </div>
            <div className="step">
              <div className="step-number">2</div>
              <div className="step-content">
                <h3>עצב את ההזמנה</h3>
                <p>בחר עיצוב מתוך עשרות תבניות מעוצבות, הוסף צבעים, מוזיקה ותמונות אישיות</p>
              </div>
            </div>
            <div className="step">
              <div className="step-number">3</div>
              <div className="step-content">
                <h3>מלא את הפרטים</h3>
                <p>הזן את פרטי האירוע - תאריך, שעה, מקום וכל מידע רלוונטי נוסף</p>
              </div>
            </div>
            <div className="step">
              <div className="step-number">4</div>
              <div className="step-content">
                <h3>הוסף רשימת אורחים</h3>
                <p>הכנס את רשימת האורחים שלך - ניתן להעלות קובץ או להזין ידנית</p>
              </div>
            </div>
            <div className="step">
              <div className="step-number">5</div>
              <div className="step-content">
                <h3>אנחנו נשלח אוטומטית</h3>
                <p>ההזמנות נשלחות אוטומטית באמצעות WhatsApp ו־SMS</p>
              </div>
            </div>
            <div className="step">
              <div className="step-number">6</div>
              <div className="step-content">
                <h3>עקוב ותהנה</h3>
                <p>עקוב אחר אישורי ההגעה והמתנות בזמן אמת מהדשבורד האישי שלך</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section id="testimonials" className="testimonials">
        <div className="features-container">
          <div className="section-title">
            <h2>מה הלקוחות שלנו אומרים</h2>
            <p className="section-subtitle">אלפי לקוחות מרוצים בחרו בנו לאירוע המיוחד שלהם</p>
          </div>
          <div className="testimonials-carousel">
            <div className="testimonial-card" key={currentTestimonial}>
              <p className="testimonial-text">"{testimonials[currentTestimonial].text}"</p>
              <h4 className="testimonial-author">{testimonials[currentTestimonial].author}</h4>
              <p className="testimonial-event">{testimonials[currentTestimonial].event}</p>
            </div>
          </div>
          <div className="testimonial-dots">
            {testimonials.map((_, index) => (
              <span
                key={index}
                className={`testimonial-dot ${index === currentTestimonial ? 'active' : ''}`}
                onClick={() => setCurrentTestimonial(index)}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <div className="footer-container">
          <div className="footer-grid">
            <div className="footer-section">
              <h3>Save the Day</h3>
              <p>הזמנה אחת. חוויה שלמה. הפלטפורמה המובילה להזמנות דיגיטליות וניהול אירועים בישראל</p>
            </div>
            <div className="footer-section">
              <h3>קישורים</h3>
              <ul className="footer-links">
                <li><a href="#features">היכולות</a></li>
                <li><a href="#events">סוגי אירועים</a></li>
                <li><a href="#how-it-works">איך זה עובד</a></li>
                <li><a href="#pricing">מחירים</a></li>
              </ul>
            </div>
            <div className="footer-section">
              <h3>תמיכה</h3>
              <ul className="footer-links">
                <li><a href="#contact">צור קשר</a></li>
                <li>
                  <a
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      setTermsModalOpen(true);
                    }}
                  >
                    תקנון
                  </a>
                </li>
                <li><a href="#faq">שאלות נפוצות</a></li>
                <li><a href="#terms">תנאי שימוש</a></li>
                <li><a href="#privacy">מדיניות פרטיות</a></li>
              </ul>
            </div>
            <div className="footer-section">
              <h3>הצטרף אלינו</h3>
              <ul className="footer-links">
                <li>
                  <a
                    href="/login"
                    onClick={(e) => {
                      e.preventDefault();
                      navigate('/login');
                    }}
                  >
                    התחברות
                  </a>
                </li>
                <li>
                  <a
                    href="/register"
                    onClick={(e) => {
                      e.preventDefault();
                      navigate('/register');
                    }}
                  >
                    הרשמה
                  </a>
                </li>
                <li><a href="#dashboard">הדשבורד שלי</a></li>
              </ul>
            </div>
          </div>
          <div className="footer-bottom">
            <p>&copy; 2025 Save the Day. כל הזכויות שמורות.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

