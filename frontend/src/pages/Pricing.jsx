import { useState, useEffect } from "react"; // הוספנו useEffect כאן
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useNotification } from "../hooks/useNotification";
import Navbar from "../components/Navbar";
import "./Pricing.css";

export default function Pricing() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [openFaq, setOpenFaq] = useState(null);
  const [selectedGuestCounts, setSelectedGuestCounts] = useState({});
  const { showSuccess, showInfo, NotificationComponent } = useNotification();

  // --- תוספת עבור Apple Pay ---
  useEffect(() => {
    const loadScript = (src) => {
      return new Promise((resolve, reject) => {
        const script = document.createElement("script");
        script.src = src;
        script.async = true;
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
      });
    };

    const initializeTranzila = async () => {
      try {
        // טעינת JQuery מהמקור של טרנזילה
        await loadScript("https://code.jquery.com/jquery-3.6.0.min.js");

        // טעינת הסקריפט של אפל פיי
        await loadScript(
          `https://direct.tranzila.com/js/tranzilanapple_v3.js?v=${Date.now()}`,
        );

        if (window.jQuery) {
          window.$n = window.jQuery.noConflict(true);
          console.log("Tranzila Apple Pay initialized");
        }
      } catch (err) {
        console.error("Failed to load Tranzila scripts:", err);
      }
    };

    initializeTranzila();
  }, []);
  // ---------------------------

  const handlePackageSelect = async (packageId, packageName, packageData) => {
    if (packageData.subPackages && packageData.subPackages.length > 0) {
      const selectedGuest = selectedGuestCounts[packageId];
      if (!selectedGuest) {
        showInfo("יש לבחור כמות אורחים");
        return;
      }

      if (!user) {
        localStorage.setItem(
          "selectedPackage",
          JSON.stringify({
            packageId,
            packageName,
            guestCount: selectedGuest,
            timestamp: new Date().getTime(),
          }),
        );
        showInfo("יש להירשם כדי לבחור חבילה");
        setTimeout(() => navigate("/register"), 1500);
      } else {
        await purchasePackage(packageId, packageName, selectedGuest);
      }
      return;
    }

    if (!user) {
      localStorage.setItem(
        "selectedPackage",
        JSON.stringify({
          packageId,
          packageName,
          timestamp: new Date().getTime(),
        }),
      );
      showInfo("יש להירשם כדי לבחור חבילה");
      setTimeout(() => navigate("/register"), 1500);
    } else {
      await purchasePackage(packageId, packageName, null);
    }
  };

  const purchasePackage = async (packageId, packageName, guestCount) => {
    const API_URL =
      import.meta.env.VITE_API_URL || "https://event-gift.onrender.com/api";

    try {
      console.log("Initiating payment:", {
        packageId,
        packageName,
        guestCount,
      });

      const response = await fetch(`${API_URL}/payments/initiate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          user_id: user.id,
          package_id: packageId,
          package_name: packageName,
          guest_count: guestCount,
        }),
      });

      const data = await response.json();

      if (response.ok && data.payment_url && data.form_data) {
        const form = document.createElement("form");
        form.method = "POST";
        form.action = data.payment_url;

        Object.keys(data.form_data).forEach((key) => {
          const input = document.createElement("input");
          input.type = "hidden";
          input.name = key;
          input.value = data.form_data[key];
          form.appendChild(input);
        });

        document.body.appendChild(form);
        form.submit();
      } else {
        showInfo(data.detail || "שגיאה ביצירת התשלום");
      }
    } catch (error) {
      console.error("Error purchasing package:", error);
      showInfo("שגיאה בתקשורת עם השרת");
    }
  };

  const handleGuestCountClick = (packageId, guestCount) => {
    setSelectedGuestCounts((prev) => ({
      ...prev,
      [packageId]: guestCount,
    }));
  };

  const faqData = [
    {
      id: 1,
      question: "איך עובד התשלום?",
      answer:
        "תשלום מאובטח באמצעות מגוון אמצעי תשלום: Apple Pay, Google Pay, Bit, כרטיסי אשראי (ויזה, מאסטרקארד, אמריקן אקספרס), PayPal ועוד. התשלום מתבצע פעם אחת בלבד והכסף מועבר לחשבונכם מיד לאחר האירוע.",
    },
    {
      id: 2,
      question: "האם אפשר לשנות חבילה?",
      answer:
        "כן! ניתן לשדרג או להוריד חבילה בכל עת דרך האזור האישי שלך. במקרה של שדרוג תחויב רק על ההפרש.",
    },
    {
      id: 3,
      question: "מה קורה אם יש יותר מוזמנים?",
      answer:
        "החבילות מתאימות למספרי מוזמנים שונים. ניתן לשדרג בכל עת או לבחור חבילה ללא הגבלה. אנחנו תמיד כאן לעזור לך למצוא את הפתרון המתאים.",
    },
    {
      id: 4,
      question: "האם יש תמיכה טכנית?",
      answer:
        "כן! צוות התמיכה שלנו זמין 24/7 לכל שאלה או בעיה. ניתן ליצור קשר דרך הצ'אט באתר, טלפון או אימייל.",
    },
    {
      id: 5,
      question: "כמה זמן לוקח ליצור הזמנה?",
      answer:
        "התהליך כולו לוקח בין 5-10 דקות בלבד! בחר תבנית, מלא פרטים, והזמנה מעוצבת ומקצועית מוכנה לשליחה.",
    },
    {
      id: 6,
      question: "האם ההזמנות ניתנות להתאמה אישית?",
      answer:
        "בהחלט! כל הזמנה ניתנת להתאמה מלאה - צבעים, גופנים, תמונות, טקסטים ועוד. אתם שולטים על כל פרט בעיצוב.",
    },
  ];

  const packages = [
    {
      id: 1,
      name: "חבילת בסיס – ידני",
      tagline: "אתם שולחים לבד – המערכת עושה לכם סדר, בלי אקסלים ובלי בלגן",
      price: "₪39",
      priceUnit: "",
      color: "turquoise",
      popular: false,
      features: [
        { text: "הזמנה דיגיטלית מעוצבת", included: true },
        { text: "מערכת אישורי הגעה ללא הגבלה", included: true },
        { text: "ניהול מוזמנים (ידני / אקסל)", included: true },
        { text: "שליחה ידנית ב־WhatsApp", included: true },
        { text: "סטטוס אישורים בזמן אמת", included: true },
      ],
      note: "למי שרוצה מינימום עלות ומקסימום סדר",
      digitalNote: null,
    },
    {
      id: 2,
      name: "אוטומטי SMS",
      tagline: "שליחה ואישורי הגעה ב־SMS",
      price: null,
      priceUnit: "",
      color: "sage",
      popular: false,
      subPackages: [
        { records: "150 רשומות", price: "₪59" },
        { records: "300 רשומות", price: "₪79" },
        { records: "500 רשומות", price: "₪109" },
        { records: "800 רשומות", price: "₪159" },
        { records: "1,000 רשומות", price: "₪189" },
        { records: "2,000 רשומות", price: "₪319" },
      ],
      features: [
        { text: "יצירת הזמנה דיגיטלית מותאמת לכל אירוע", included: true },
        { text: "שליחת הזמנות אוטומטית ב־SMS", included: true },
        { text: "תזכורת לפני האירוע", included: true },
        { text: "דוח אישורים מסודר", included: true },
      ],
      note: "פתרון פשוט ומהיר למוזמנים מבוגרים",
    },
    {
      id: 3,
      name: "אוטומטי WhatsApp",
      tagline: "שליחה ואישורים אוטומטיים ב־WhatsApp",
      price: null,
      priceUnit: "",
      color: "gold",
      popular: true,
      subPackages: [
        { records: "עד 50", price: "₪69" },
        { records: "עד 100", price: "₪109" },
        { records: "עד 150", price: "₪169" },
        { records: "עד 200", price: "₪229" },
        { records: "עד 300", price: "₪329" },
        { records: "עד 400", price: "₪419" },
        { records: "עד 500", price: "₪509" },
        { records: "עד 600", price: "₪589" },
        { records: "עד 700", price: "₪649" },
        { records: "עד 800", price: "₪709" },
      ],
      features: [
        { text: "יצירת הזמנה דיגיטלית מותאמת לכל אירוע", included: true },
        { text: "שליחה אוטומטית ב־WhatsApp", included: true },
        { text: "3 סבבי שיחות טלפוניות", included: true },
        { text: "תזכורת ביום האירוע (SMS)", included: true },
        { text: "הודעת תודה אחרי האירוע (אופציונלי)", included: true },
        { text: "ניהול מוזמנים + דוחות", included: true },
        { text: "עיצובים לבחירה", included: true },
      ],
      note: "הכי נמכר - חוויית שימוש קלה ונוחה",
    },
    {
      id: 4,
      name: "אוטומטי הכל כלול",
      tagline: "דואגים לכם להכל – אפס התעסקות מצידכם",
      price: null,
      priceUnit: "",
      color: "rose",
      popular: false,
      subPackages: [
        { records: "עד 100", price: "₪239" },
        { records: "עד 200", price: "₪469" },
        { records: "עד 300", price: "₪679" },
        { records: "עד 400", price: "₪869" },
        { records: "עד 500", price: "₪1,039" },
        { records: "עד 600", price: "₪1,189" },
        { records: "עד 700", price: "₪1,389" },
        { records: "עד 800", price: "₪1,589" },
      ],
      features: [
        { text: "יצירת הזמנה דיגיטלית מותאמת לכל אירוע", included: true },
        { text: "שליחת הזמנות אוטומטית ב־WhatsApp", included: true },
        {
          text: "מוקד אנושי לשיחות טלפון עם מספר סבבי התקשרות",
          included: true,
        },
        { text: "טיפול מלא במוזמנים שלא ענו", included: true },
        { text: "תזכורות ביום האירוע ב־WhatsApp וב־SMS", included: true },
        { text: "כפתור ניווט חכם לאולם", included: true },
        { text: "הושבה דיגיטלית מלאה", included: true },
        { text: "שליחת מספר שולחן אוטומטית ביום האירוע", included: true },
        { text: "ניהול מוזמנים + דוחות מתקדמים", included: true },
      ],
      note: "דואגים לכם להכל – אפס התעסקות מצידכם",
    },
  ];

  return (
    <div className="pricing-page">
      {NotificationComponent}
      <Navbar />

      <section className="pricing-hero">
        <div className="pricing-hero-content">
          <h1 className="pricing-hero-title">מחירים וחבילות</h1>
          <p className="pricing-hero-subtitle">
            בחר את החבילה המושלמת לאירוע שלך
            <br />
            ותן לנו לעשות לך ראש שקט
            <br />
            <span style={{ fontSize: "0.9em", opacity: 0.9 }}>
              תמחור שקוף והוגן, ללא עלויות נסתרות - שגר ושכח
            </span>
          </p>
          <div
            style={{
              marginTop: "2rem",
              fontSize: "1.1rem",
              color: "var(--cream)",
            }}
          >
            <strong>לא בטוחים מה לבחור? 🤍</strong>
            <br />
            <span style={{ fontSize: "0.95rem" }}>
              דברו איתנו – ונעזור לכם לבחור את החבילה שהכי מתאימה לאירוע שלכם.
            </span>
          </div>
        </div>
      </section>

      <section className="packages-section">
        <div className="packages-container">
          <div className="section-title">
            <h2>בחר את החבילה המושלמת</h2>
            <p className="section-subtitle">
              כל החבילות כוללות הזמנה דיגיטלית מעוצבת וניהול מוזמנים מתקדם
            </p>
          </div>
          <div className="packages-grid">
            {packages.map((pkg) => (
              <div
                key={pkg.id}
                className={`package-card package-card-${pkg.color} ${pkg.popular ? "popular" : ""}`}
              >
                {pkg.popular && (
                  <div className="popular-badge">
                    <i className="fas fa-crown"></i>
                    <span>הכי פופולרי</span>
                  </div>
                )}

                <div className="package-header">
                  <h3 className="package-name">{pkg.name}</h3>
                  <p className="package-tagline">{pkg.tagline}</p>

                  {pkg.price ? (
                    <div className="package-price">
                      <span className="price">{pkg.price}</span>
                      <span className="price-unit">{pkg.priceUnit}</span>
                    </div>
                  ) : (
                    <>
                      <p className="guest-selection-label">בחר כמות אורחים:</p>
                      <div className="guest-selection-grid">
                        {pkg.subPackages &&
                          pkg.subPackages.map((sub, idx) => (
                            <button
                              key={idx}
                              className={`guest-option-btn ${selectedGuestCounts[pkg.id] === sub.records ? "selected" : ""}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleGuestCountClick(pkg.id, sub.records);
                              }}
                            >
                              <span className="guest-records">
                                {sub.records}
                              </span>
                              <span className="guest-price">{sub.price}</span>
                            </button>
                          ))}
                      </div>
                    </>
                  )}

                  <p className="package-note">{pkg.note}</p>
                  <div className="hover-hint">
                    <span>עבור עם העכבר לפרטים נוספים</span>
                  </div>
                </div>

                <div className="package-features">
                  <ul className="features-list">
                    {pkg.features.map((feature, index) => (
                      <li
                        key={index}
                        className={
                          feature.included ? "included" : "not-included"
                        }
                      >
                        <span>{feature.text}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="package-footer">
                  <button
                    className="btn-select-package"
                    onClick={() => handlePackageSelect(pkg.id, pkg.name, pkg)}
                  >
                    בחר חבילה
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="addons-section">
        <div className="addons-container">
          <div className="section-title">
            <h2>תוספות לבחירה</h2>
            <p className="section-subtitle">
              שדרגו את החבילה שלכם עם התוספות הבאות
            </p>
          </div>
          <div className="addons-grid">
            <div className="addon-card addon-card-seating">
              <div className="addon-icon addon-icon-seating">
                <i className="fas fa-chair"></i>
              </div>
              <h3>הושבה דיגיטלית</h3>
              <p>
                מערכת הושבה חכמה לאירוע שלכם - שלחו לכל אורח את מספר השולחן שלו
                אוטומטית
              </p>
            </div>
            <div className="addon-card addon-card-gift">
              <div className="addon-icon addon-icon-gift">
                <i className="fas fa-envelope-open-text"></i>
              </div>
              <h3>הודעות תודה אוטומטיות</h3>
              <p>
                שליחת הודעות תודה אישיות לכל האורחים אחרי האירוע - מגע חם
                ואוטומטי
              </p>
            </div>
            <div className="addon-card addon-card-design">
              <div className="addon-icon addon-icon-design">
                <i className="fas fa-magic"></i>
              </div>
              <h3>עיצוב הזמנה בהתאמה אישית</h3>
              <p>הזמנה ייחודית שמעוצבת במיוחד עבורכם על ידי המעצבים שלנו</p>
            </div>
          </div>
        </div>
      </section>

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
                className={`faq-item ${openFaq === faq.id ? "active" : ""}`}
                onClick={() => setOpenFaq(openFaq === faq.id ? null : faq.id)}
              >
                <div className="faq-question">
                  <h3>{faq.question}</h3>
                  <div className="faq-icon">
                    <i
                      className={`fas ${openFaq === faq.id ? "fa-minus" : "fa-plus"}`}
                    ></i>
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

      <section className="cta-section">
        <div className="cta-container">
          <h2>מוכנים להתחיל?</h2>
          <p>צור את ההזמנה הדיגיטלית המושלמת שלך עכשיו</p>
          <button className="btn-cta" onClick={() => navigate("/")}>
            התחל עכשיו
          </button>
        </div>
      </section>

      <footer className="footer">
        <div className="footer-container">
          <div className="footer-grid">
            <div className="footer-section">
              <h3>Save the Day</h3>
              <p>
                הזמנה אחת. חוויה שלמה. הפלטפורמה המובילה להזמנות דיגיטליות
                וניהול אירועים בישראל
              </p>
            </div>
            <div className="footer-section">
              <h3>קישורים</h3>
              <ul className="footer-links">
                <li>
                  <a href="/#features">היכולות</a>
                </li>
                <li>
                  <a href="/#events">סוגי אירועים</a>
                </li>
                <li>
                  <a href="/#how-it-works">איך זה עובד</a>
                </li>
                <li>
                  <a href="/pricing">מחירים</a>
                </li>
              </ul>
            </div>
            <div className="footer-section">
              <h3>תמיכה</h3>
              <ul className="footer-links">
                <li>
                  <a href="#contact">צור קשר</a>
                </li>
                <li>
                  <a href="#faq">שאלות נפוצות</a>
                </li>
                <li>
                  <a href="#terms">תנאי שימוש</a>
                </li>
                <li>
                  <a href="#privacy">מדיניות פרטיות</a>
                </li>
              </ul>
            </div>
            <div className="footer-section">
              <h3>הצטרף אלינו</h3>
              <ul className="footer-links">
                <li>
                  <a href="#login">התחברות</a>
                </li>
                <li>
                  <a href="#register">הרשמה</a>
                </li>
                <li>
                  <a href="#dashboard">הדשבורד שלי</a>
                </li>
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
