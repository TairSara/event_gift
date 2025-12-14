import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import "./Contact.css";

export default function Contact() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    subject: "",
    message: ""
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState(null);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitStatus(null);

    try {
      // שליחת הפנייה לשרת
      const response = await fetch("http://localhost:8001/api/contact/submit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          full_name: formData.fullName,
          email: formData.email,
          phone: formData.phone,
          subject: formData.subject,
          message: formData.message
        })
      });

      if (!response.ok) {
        throw new Error("Failed to submit contact form");
      }

      const data = await response.json();

      setSubmitStatus("success");
      alert("תודה על פנייתך! נחזור אליך בהקדם האפשרי.");

      // איפוס הטופס
      setFormData({
        fullName: "",
        email: "",
        phone: "",
        subject: "",
        message: ""
      });
    } catch (error) {
      console.error("Error submitting form:", error);
      setSubmitStatus("error");
      alert("אירעה שגיאה בשליחת הפנייה. אנא נסה שוב.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="contact-page">
      {/* Navigation */}
      <Navbar />

      {/* Hero Section */}
      <section className="contact-hero">
        <div className="contact-hero-content">
          <h1 className="contact-hero-title">צור קשר</h1>
          <p className="contact-hero-subtitle">
            יש לך שאלה? רוצה לשמוע עוד פרטים?<br />
            נשמח לעזור ולענות על כל שאלה!
          </p>
        </div>
      </section>

      {/* Contact Form Section */}
      <section className="contact-form-section">
        <div className="contact-container">
          <div className="contact-grid">
            {/* Contact Info */}
            <div className="contact-info">
              <h2>דברו איתנו</h2>
              <p className="contact-info-subtitle">
                אנחנו כאן בשבילכם! צרו קשר ונחזור אליכם בהקדם
              </p>

              <div className="contact-methods">
                <div className="contact-method">
                  <div className="contact-method-icon">
                    <i className="fas fa-envelope"></i>
                  </div>
                  <div className="contact-method-content">
                    <h3>אימייל</h3>
                    <p>info@savetheday.co.il</p>
                  </div>
                </div>

                <div className="contact-method">
                  <div className="contact-method-icon">
                    <i className="fas fa-phone"></i>
                  </div>
                  <div className="contact-method-content">
                    <h3>טלפון</h3>
                    <p>03-1234567</p>
                  </div>
                </div>

                <div className="contact-method">
                  <div className="contact-method-icon">
                    <i className="fas fa-map-marker-alt"></i>
                  </div>
                  <div className="contact-method-content">
                    <h3>כתובת</h3>
                    <p>תל אביב, ישראל</p>
                  </div>
                </div>

                <div className="contact-method">
                  <div className="contact-method-icon">
                    <i className="fas fa-clock"></i>
                  </div>
                  <div className="contact-method-content">
                    <h3>שעות פעילות</h3>
                    <p>ראשון - חמישי: 9:00 - 18:00</p>
                  </div>
                </div>
              </div>

              <div className="contact-social">
                <h3>עקבו אחרינו</h3>
                <div className="social-icons">
                  <a href="#facebook" className="social-icon">
                    <i className="fab fa-facebook-f"></i>
                  </a>
                  <a href="#instagram" className="social-icon">
                    <i className="fab fa-instagram"></i>
                  </a>
                  <a href="#whatsapp" className="social-icon">
                    <i className="fab fa-whatsapp"></i>
                  </a>
                  <a href="#linkedin" className="social-icon">
                    <i className="fab fa-linkedin-in"></i>
                  </a>
                </div>
              </div>
            </div>

            {/* Contact Form */}
            <div className="contact-form-wrapper">
              <div className="contact-form-card">
                <h2>השאר/י פנייה</h2>
                <p className="form-description">
                  מלא/י את הטופס ונחזור אליך בהקדם האפשרי
                </p>

                <form onSubmit={handleSubmit} className="contact-form">
                  <div className="form-group">
                    <label htmlFor="fullName">שם מלא *</label>
                    <input
                      type="text"
                      id="fullName"
                      name="fullName"
                      value={formData.fullName}
                      onChange={handleChange}
                      placeholder="הכנס/י את שמך המלא"
                      required
                    />
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="email">אימייל *</label>
                      <input
                        type="email"
                        id="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        placeholder="example@mail.com"
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label htmlFor="phone">טלפון</label>
                      <input
                        type="tel"
                        id="phone"
                        name="phone"
                        value={formData.phone}
                        onChange={handleChange}
                        placeholder="050-1234567"
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label htmlFor="subject">נושא הפנייה *</label>
                    <select
                      id="subject"
                      name="subject"
                      value={formData.subject}
                      onChange={handleChange}
                      required
                    >
                      <option value="">בחר/י נושא</option>
                      <option value="general">שאלה כללית</option>
                      <option value="pricing">שאלה לגבי מחירים</option>
                      <option value="technical">תמיכה טכנית</option>
                      <option value="partnership">שיתוף פעולה</option>
                      <option value="other">אחר</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label htmlFor="message">הודעה *</label>
                    <textarea
                      id="message"
                      name="message"
                      value={formData.message}
                      onChange={handleChange}
                      placeholder="כתוב/י את הודעתך כאן..."
                      rows="5"
                      required
                    ></textarea>
                  </div>

                  <button
                    type="submit"
                    className="btn-submit-contact"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <i className="fas fa-spinner fa-spin"></i>
                        שולח...
                      </>
                    ) : (
                      <>
                        <i className="fas fa-paper-plane"></i>
                        שלח פנייה
                      </>
                    )}
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="contact-faq-section">
        <div className="contact-container">
          <h2>שאלות נפוצות</h2>
          <p className="section-subtitle">אולי התשובה שאתם מחפשים כבר כאן?</p>

          <div className="faq-grid">
            <div className="faq-item">
              <h3>כמה זמן לוקח לקבל מענה?</h3>
              <p>אנחנו מתחייבים לחזור אליכם תוך 24 שעות בימי עבודה.</p>
            </div>
            <div className="faq-item">
              <h3>האם השירות זמין בסופי שבוע?</h3>
              <p>תמיכה טכנית זמינה 24/7, אך מענה לפניות יינתן בימי עבודה.</p>
            </div>
            <div className="faq-item">
              <h3>האם יש אפשרות לפגישת ייעוץ?</h3>
              <p>בהחלט! צרו קשר ונתאם פגישה לפי הצורך.</p>
            </div>
            <div className="faq-item">
              <h3>מה קורה לאחר שליחת הפנייה?</h3>
              <p>תקבלו אישור למייל ונחזור אליכם עם מענה מפורט בהקדם.</p>
            </div>
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
                <li><a href="/">דף הבית</a></li>
                <li><a href="/pricing">מחירים</a></li>
                <li><a href="/contact">צור קשר</a></li>
              </ul>
            </div>
            <div className="footer-section">
              <h3>תמיכה</h3>
              <ul className="footer-links">
                <li><a href="#faq">שאלות נפוצות</a></li>
                <li><a href="#terms">תנאי שימוש</a></li>
                <li><a href="#privacy">מדיניות פרטיות</a></li>
              </ul>
            </div>
            <div className="footer-section">
              <h3>הצטרף אלינו</h3>
              <ul className="footer-links">
                <li><a href="/login">התחברות</a></li>
                <li><a href="/register">הרשמה</a></li>
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
