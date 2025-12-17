import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useNotification } from "../hooks/useNotification";
import Navbar from "../components/Navbar";
import "./Pricing.css";

export default function Pricing() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [openFaq, setOpenFaq] = useState(null);
  const { showSuccess, showInfo, NotificationComponent } = useNotification();

  const handlePackageSelect = async (packageId, packageName) => {
    if (!user) {
      // אם המשתמש לא מחובר - שמירת החבילה ב-localStorage וניתוב להרשמה
      localStorage.setItem('selectedPackage', JSON.stringify({
        packageId,
        packageName,
        timestamp: new Date().getTime()
      }));
      showInfo("יש להירשם כדי לבחור חבילה");
      setTimeout(() => navigate('/register'), 1500);
    } else {
      // אם המשתמש מחובר - ביצוע הרכישה
      const API_URL = import.meta.env.VITE_API_URL || 'https://event-gift.onrender.com/api';

      try {
        const response = await fetch(`${API_URL}/packages/purchase`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            user_id: user.id,
            package_id: packageId,
            package_name: packageName
          })
        });

        const data = await response.json();

        if (response.ok) {
          showSuccess('הרכישה בוצעה בהצלחה!');
          // ניתוב לדף ניהול אישי אחרי שנייה
          setTimeout(() => navigate('/dashboard'), 1500);
        } else {
          showInfo(data.detail || 'שגיאה ביצירת הרכישה');
        }
      } catch (error) {
        console.error('Error purchasing package:', error);
        showInfo('שגיאה בתקשורת עם השרת');
      }
    }
  };

  const faqData = [
    {
      id: 1,
      question: "איך עובד התשלום?",
      answer: "תשלום מאובטח באמצעות מגוון אמצעי תשלום: Apple Pay, Google Pay, Bit, כרטיסי אשראי (ויזה, מאסטרקארד, אמריקן אקספרס), PayPal ועוד. התשלום מתבצע פעם אחת בלבד והכסף מועבר לחשבונכם מיד לאחר האירוע."
    },
    {
      id: 2,
      question: "האם אפשר לשנות חבילה?",
      answer: "כן! ניתן לשדרג או להוריד חבילה בכל עת דרך האזור האישי שלך. במקרה של שדרוג תחויב רק על ההפרש."
    },
    {
      id: 3,
      question: "מה קורה אם יש יותר מוזמנים?",
      answer: "החבילות מתאימות למספרי מוזמנים שונים. ניתן לשדרג בכל עת או לבחור חבילה ללא הגבלה. אנחנו תמיד כאן לעזור לך למצוא את הפתרון המתאים."
    },
    {
      id: 4,
      question: "האם יש תמיכה טכנית?",
      answer: "כן! צוות התמיכה שלנו זמין 24/7 לכל שאלה או בעיה. ניתן ליצור קשר דרך הצ'אט באתר, טלפון או אימייל."
    },
    {
      id: 5,
      question: "כמה זמן לוקח ליצור הזמנה?",
      answer: "התהליך כולו לוקח בין 5-10 דקות בלבד! בחר תבנית, מלא פרטים, והזמנה מעוצבת ומקצועית מוכנה לשליחה."
    },
    {
      id: 6,
      question: "האם ההזמנות ניתנות להתאמה אישית?",
      answer: "בהחלט! כל הזמנה ניתנת להתאמה מלאה - צבעים, גופנים, תמונות, טקסטים ועוד. אתם שולטים על כל פרט בעיצוב."
    }
  ];

  const packages = [
    {
      id: 1,
      name: "חבילה בסיסית",
      tagline: "מושלם לאירועים קטנים ואינטימיים",
      price: "1 ₪",
      priceUnit: "לרשומה",
      color: "turquoise",
      popular: false,
      features: [
        { text: "שליחת תמונה או סרטון מרהיבים עם ההזמנה בוואטסאפ - הרושם הראשון שנשאר לנצח!", included: true },
        { text: "שני סיבובי וואטסאפ ו-SMS חכמים - כי כל אורח חשוב לנו", included: true },
        { text: "תזכורת SMS ביום האירוע + ניווט ווייז ישיר - הגעה בלי סטרס", included: true },
        { text: "עיצוב הזמנה דיגיטלית מדהימה לחלוטין בחינם - כן, שמעתם נכון!", included: true },
        { text: "מערכת ניהול חכמה עם דשבורד אישי - שליטה מלאה בזמן אמת", included: true },
        { text: "קישור לשליחה ידנית בקבוצות - גמישות מקסימלית, אישורי הגעה ללא הגבלה", included: true },
        { text: "מספרי שולחנות אוטומטיים בהודעת התזכורת - ארגון מושלם בחינם", included: true },
        { text: "אפשרות קבלת מתנות באשראי - נוח לכם, נוח לאורחים", included: true },
      ],
      note: "ללא הגבלת מוזמנים - כמה שתרצו!"
    },
    {
      id: 2,
      name: "חבילה בינונית",
      tagline: "שילוב מושלם של איכות ומחיר הוגן!",
      price: "180 ₪",
      priceUnit: "עד 300 איש",
      color: "sage",
      popular: false,
      features: [
        { text: "שני סיבובי וואטסאפ ו-SMS אוטומטיים - הטכנולוגיה עובדת בשבילכם", included: true },
        { text: "שלושה סבבי שיחות טלפוניות אישיות - מגע אנושי שעושה את ההבדל", included: true },
        { text: "עיצוב הזמנה דיגיטלית מהממת לחלוטין בחינם - תראו מקצועי ברמה אחרת", included: true },
        { text: "שליחת תמונה או סרטון אישי בוואטסאפ - תנו להזמנה שלכם להתבלט", included: true },
        { text: "תזכורת חכמה ביום האירוע + ניווט ווייז - אף אורח לא יתעה בדרך", included: true },
        { text: "מערכת ניהול פרימיום עם דשבורד מתקדם - עקבו אחר כל פרט בזמן אמת", included: true },
        { text: "קישור ידני לקבוצות וואטסאפ - שליטה ומעקב ללא גבולות", included: true },
        { text: "מערכת מתנות באשראי משוכללת - הכסף זורם ישירות אליכם", included: true },
        { text: "הודעות תודה אוטומטיות למחרת - סגירת מעגל מושלמת", included: true },
        { text: "שיבוץ שולחנות אוטומטי בתזכורת - ארגון ברמה של event planner מקצועי", included: true },
      ],
      note: "החבילה המומלצת - כולל הכל מה שצריך!"
    },
    {
      id: 3,
      name: "חבילה כלכלית",
      tagline: "הפתרון החכם - מקסימום ערך במינימום עלות!",
      price: "1.6 ₪",
      priceUnit: "לרשומה",
      color: "gold",
      popular: false,
      features: [
        { text: "שני סיבובי וואטסאפ ו-SMS מקצועיים - כיסוי מלא לכל האורחים", included: true },
        { text: "שלושה סבבי שיחות טלפוניות - מעקב מסור עד קבלת אישור הגעה", included: true },
        { text: "עיצוב הזמנה דיגיטלית מושלמת בחינם - יוקרה במחיר חכם", included: true },
        { text: "שליחת תמונה או סרטון מותאם אישית - תנו לאירוע שלכם זהות ייחודית", included: true },
        { text: "תזכורת מתוזמנת ביום האירוע + ווייז - נסיעה חלקה לכל האורחים", included: true },
        { text: "מערכת ניהול מתקדמת עם דשבורד - מעקב וניהול בזמן אמת", included: true },
        { text: "קישור לשיתוף חופשי בקבוצות - אישורי הגעה ללא הגבלות", included: true },
        { text: "הודעות תודה אוטומטיות למחרת - סיום אלגנטי ומכובד", included: true },
        { text: "שיבוץ שולחנות חכם - אופציה להכניס מספר שולחן לכל מוזמן", included: true },
        { text: "מתנות באשראי", included: false },
      ],
      note: "הכי הרבה תמורה לכסף - כל הפיצ'רים ללא מתנות באשראי"
    },
    {
      id: 4,
      name: "חבילה מלאה",
      tagline: "שגר ושכח - אנחנו דואגים לכל הפרטים!",
      price: "250 ₪",
      priceUnit: "ללא הגבלת אורחים",
      color: "rose",
      popular: true,
      features: [
        { text: "שני סיבובי וואטסאפ ו-SMS מתוזמנים - מקסימום כיסוי, מינימום טרחה", included: true },
        { text: "שלושה סבבי שיחות מקצועיות - נוודא שכל אורח קיבל את ההזמנה", included: true },
        { text: "עיצוב הזמנה דיגיטלית ייחודית בחינם - שתגרום לאורחים לומר WOW", included: true },
        { text: "שליחת תמונה או סרטון מרגש בוואטסאפ - הזמנה שזוכרים", included: true },
        { text: "תזכורת אינטליגנטית ביום האירוע + ווייז - הכל מסודר ומתוזמן", included: true },
        { text: "מערכת ניהול VIP מקצועית - דשבורד מתקדם עם כל הכלים", included: true },
        { text: "קישור בלתי מוגבל לשיתוף - אין גבולות למספר האורחים", included: true },
        { text: "מערכת מתנות פרימיום באשראי - הכי נוח ומאובטח", included: true },
        { text: "הודעות תודה מעוצבות למחרת האירוע - סיום מושלם ומרגש", included: true },
        { text: "שיבוץ שולחנות חכם - אופציה להכניס מספר שולחן לכל מוזמן", included: true },
      ],
      note: "לאירועים גדולים - אין מגבלות, רק הצלחה!"
    }
  ];

  return (
    <div className="pricing-page">
      {NotificationComponent}
      {/* Navigation */}
      <Navbar />

      {/* Hero Section */}
      <section className="pricing-hero">
        <div className="pricing-hero-content">
          <h1 className="pricing-hero-title">מחירים וחבילות</h1>
          <p className="pricing-hero-subtitle">
            בחר את החבילה המושלמת לאירוע שלך<br />
            ותן לנו לעשות לך ראש שקט<br />
            <span style={{fontSize: '0.9em', opacity: 0.9}}>תמחור שקוף והוגן, ללא עלויות נסתרות - שגר ושכח</span>
          </p>
        </div>
      </section>

      {/* Packages Section */}
      <section className="packages-section">
        <div className="packages-container">
          <div className="packages-grid">
            {packages.map((pkg) => (
              <div
                key={pkg.id}
                className={`package-card package-card-${pkg.color} ${pkg.popular ? 'popular' : ''}`}
              >
                {pkg.popular && (
                  <div className="popular-badge">
                    <i className="fas fa-crown"></i>
                    <span>הכי פופולרי</span>
                  </div>
                )}

                <div className="package-header">
                  <div className="package-icon">
                    <i className={`fas ${
                      pkg.id === 1 ? 'fa-rocket' :
                      pkg.id === 2 ? 'fa-star' :
                      pkg.id === 3 ? 'fa-gem' :
                      'fa-coins'
                    }`}></i>
                  </div>
                  <h3 className="package-name">{pkg.name}</h3>
                  <p className="package-tagline">{pkg.tagline}</p>
                  <div className="package-price">
                    <span className="price">{pkg.price}</span>
                    <span className="price-unit">{pkg.priceUnit}</span>
                  </div>
                  <p className="package-note">{pkg.note}</p>
                  <div className="hover-hint">
                    <i className="fas fa-hand-pointer"></i>
                    <span>עבור עם העכבר לפרטים נוספים</span>
                  </div>
                </div>

                <div className="package-features">
                  <ul className="features-list">
                    {pkg.features.map((feature, index) => (
                      <li key={index} className={feature.included ? "included" : "not-included"}>
                        <i className={`fas ${feature.included ? 'fa-check-circle' : 'fa-times-circle'}`}></i>
                        <span>{feature.text}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="package-footer">
                  <button
                    className="btn-select-package"
                    onClick={() => handlePackageSelect(pkg.id, pkg.name)}
                  >
                    בחר חבילה
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="faq-section">
        <div className="faq-container">
          <div className="section-title">
            <h2>שאלות נפוצות</h2>
            <p className="section-subtitle">לחץ על השאלה לקבלת תשובה</p>
          </div>

          <div className="faq-accordion">
            {faqData.map((faq) => (
              <div
                key={faq.id}
                className={`faq-item ${openFaq === faq.id ? 'active' : ''}`}
                onClick={() => setOpenFaq(openFaq === faq.id ? null : faq.id)}
              >
                <div className="faq-question">
                  <h3>{faq.question}</h3>
                  <div className="faq-icon">
                    <i className={`fas ${openFaq === faq.id ? 'fa-minus' : 'fa-plus'}`}></i>
                  </div>
                </div>
                <div className="faq-answer">
                  <p>{faq.answer}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta-section">
        <div className="cta-container">
          <h2>מוכנים להתחיל?</h2>
          <p>צור את ההזמנה הדיגיטלית המושלמת שלך עכשיו</p>
          <button className="btn-cta" onClick={() => navigate("/")}>
            התחל עכשיו
          </button>
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
                <li><a href="/#features">היכולות</a></li>
                <li><a href="/#events">סוגי אירועים</a></li>
                <li><a href="/#how-it-works">איך זה עובד</a></li>
                <li><a href="/pricing">מחירים</a></li>
              </ul>
            </div>
            <div className="footer-section">
              <h3>תמיכה</h3>
              <ul className="footer-links">
                <li><a href="#contact">צור קשר</a></li>
                <li><a href="#faq">שאלות נפוצות</a></li>
                <li><a href="#terms">תנאי שימוש</a></li>
                <li><a href="#privacy">מדיניות פרטיות</a></li>
              </ul>
            </div>
            <div className="footer-section">
              <h3>הצטרף אלינו</h3>
              <ul className="footer-links">
                <li><a href="#login">התחברות</a></li>
                <li><a href="#register">הרשמה</a></li>
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
