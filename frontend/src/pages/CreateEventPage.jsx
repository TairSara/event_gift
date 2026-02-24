import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import Navbar from "../components/Navbar";
import "./CreateEventPage.css";

export default function CreateEventPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const { userPackages = [], userId } = location.state || {};

  // הגנה - אם הגיעו ישירות ללא state
  useEffect(() => {
    if (!userId) {
      navigate("/dashboard");
    }
  }, [userId, navigate]);

  const [step, setStep] = useState(1);

  // שלב 1
  const [eventTitle, setEventTitle] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [selectedEventType, setSelectedEventType] = useState("");
  const [selectedPackage, setSelectedPackage] = useState("");
  const [step1Error, setStep1Error] = useState("");

  // שלב 2
  const [messageScheduleType, setMessageScheduleType] = useState("default");
  const [customSchedule, setCustomSchedule] = useState({ message1: 21, message2: 14, message3: 7 });
  const [scheduleError, setScheduleError] = useState("");
  const [loading, setLoading] = useState(false);

  const availablePackages = userPackages.filter((pkg) => pkg.status === "active");

  const eventTypes = [
    { value: "wedding", label: "חתונה", icon: "fa-ring" },
    { value: "hina", label: "חינה", icon: "fa-hand-holding-heart" },
    { value: "brit", label: "ברית", icon: "fa-baby" },
    { value: "brita", label: "זבד הבת", icon: "fa-baby-carriage" },
    { value: "bat-mitzvah", label: "בת מצווה", icon: "fa-star" },
    { value: "bar-mitzvah", label: "בר מצווה", icon: "fa-star-of-david" },
    { value: "birthday", label: "יום הולדת", icon: "fa-birthday-cake" },
    { value: "knasim", label: "כנסים ואירועי חברה", icon: "fa-building" },
  ];

  const getDaysUntilEvent = () => {
    if (!eventDate) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const ev = new Date(eventDate);
    ev.setHours(0, 0, 0, 0);
    return Math.floor((ev - today) / (1000 * 60 * 60 * 24));
  };

  const daysUntilEvent = getDaysUntilEvent();
  const isEventSoon = daysUntilEvent !== null && daysUntilEvent < 21;

  const selectedEventLabel = eventTypes.find((t) => t.value === selectedEventType)?.label || "";

  // ---- ולידציה שלב 1 ----
  const handleNextStep = () => {
    if (!eventTitle.trim()) {
      setStep1Error("יש להזין שם לאירוע");
      return;
    }
    if (!eventDate) {
      setStep1Error("יש לבחור תאריך לאירוע");
      return;
    }
    if (daysUntilEvent !== null && daysUntilEvent < 0) {
      setStep1Error("תאריך האירוע חייב להיות בעתיד");
      return;
    }
    if (!selectedEventType) {
      setStep1Error("יש לבחור סוג אירוע");
      return;
    }
    setStep1Error("");
    setStep(2);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // ---- ולידציה תזמון ----
  const validateScheduleAgainstDate = () => {
    if (!eventDate) return true;
    const days = getDaysUntilEvent();
    if (days === null) return true;

    if (messageScheduleType === "default") {
      if (days < 7) {
        setScheduleError("האירוע קרוב מדי (פחות משבוע). לא ניתן לתזמן הודעות.");
        return false;
      }
      if (days < 21) {
        setScheduleError("תזמון ברירת המחדל (21 ימים) לא מתאים לתאריך. יש לבחור תזמון מותאם אישית.");
        return false;
      }
      return true;
    }

    const m1 = Number(customSchedule.message1);
    const m2 = Number(customSchedule.message2);
    const m3 = Number(customSchedule.message3);

    // סדר: הודעה 1 חייבת להיות יותר ימים מ-2, ו-2 יותר מ-3
    if (m1 <= m2) {
      setScheduleError("הודעה ראשונה חייבת להישלח יותר ימים לפני האירוע מהודעה שנייה.");
      return false;
    }
    if (m2 <= m3) {
      setScheduleError("הודעה שנייה חייבת להישלח יותר ימים לפני האירוע מהודעה שלישית.");
      return false;
    }

    // בדיקה מול תאריך האירוע
    for (const d of [m1, m2, m3]) {
      if (d >= days) {
        setScheduleError(`הודעה המתוזמנת ${d} ימים לפני האירוע לא מתאפשרת - האירוע בעוד ${days} ימים בלבד.`);
        return false;
      }
    }
    setScheduleError("");
    return true;
  };

  // ---- שליחה סופית ----
  const handleCreateEvent = async () => {
    if (availablePackages.length > 0 && !selectedPackage) {
      setScheduleError("יש לבחור חבילה");
      return;
    }
    if (!validateScheduleAgainstDate()) return;

    setLoading(true);
    try {
      const API_URL = import.meta.env.VITE_API_URL || "https://event-gift.onrender.com/api";

      const response = await fetch(`${API_URL}/packages/events`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: userId,
          package_purchase_id: selectedPackage ? parseInt(selectedPackage) : null,
          event_type: selectedEventType,
          event_title: eventTitle,
          event_date: eventDate,
          status: "pending",
          message_schedule: {
            schedule_type: messageScheduleType,
            days_before:
              messageScheduleType === "default"
                ? [21, 14, 7]
                : [customSchedule.message1, customSchedule.message2, customSchedule.message3].sort((a, b) => b - a),
          },
        }),
      });

      const data = await response.json();

      if (response.ok) {
        if (selectedPackage) {
          await fetch(`${API_URL}/packages/purchases/${selectedPackage}/use`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
          });
        }
        navigate(`/create-invitation/${selectedEventType}?event_id=${data.id}`);
      } else {
        setScheduleError(data.detail || "שגיאה ביצירת האירוע");
        setLoading(false);
      }
    } catch {
      setScheduleError("שגיאה בתקשורת עם השרת");
      setLoading(false);
    }
  };

  if (!userId) return null;

  return (
    <div className="cep-page">
      <Navbar />

      <div className="cep-container">
        {/* Progress */}
        <div className="cep-progress">
          <div className={`cep-progress-step ${step >= 1 ? "active" : ""}`}>
            <div className="cep-step-circle">{step > 1 ? <i className="fas fa-check" /> : "1"}</div>
            <span>פרטי האירוע</span>
          </div>
          <div className={`cep-progress-line ${step >= 2 ? "active" : ""}`} />
          <div className={`cep-progress-step ${step >= 2 ? "active" : ""}`}>
            <div className="cep-step-circle">2</div>
            <span>תזמון הודעות</span>
          </div>
        </div>

        <div className="cep-card">
          {/* ===== שלב 1 ===== */}
          {step === 1 && (
            <>
              <h2 className="cep-title">
                <i className="fas fa-calendar-plus" />
                פרטי האירוע
              </h2>

              {/* תאריך */}
              <div className="cep-form-group">
                <label>
                  <i className="fas fa-calendar-day" />
                  תאריך האירוע <span className="cep-required">*</span>
                </label>
                <input
                  type="date"
                  className="cep-input"
                  value={eventDate}
                  min={new Date().toISOString().split("T")[0]}
                  onChange={(e) => {
                    setEventDate(e.target.value);
                    setStep1Error("");
                    if (e.target.value) {
                      const today = new Date();
                      today.setHours(0, 0, 0, 0);
                      const ev = new Date(e.target.value);
                      ev.setHours(0, 0, 0, 0);
                      const diff = Math.floor((ev - today) / (1000 * 60 * 60 * 24));
                      if (diff < 21 && messageScheduleType === "default") {
                        setMessageScheduleType("custom");
                      }
                    }
                  }}
                />
                {eventDate && daysUntilEvent !== null && (
                  <div className={`cep-date-badge ${daysUntilEvent < 7 ? "urgent" : daysUntilEvent < 21 ? "warning" : "ok"}`}>
                    <i className={`fas ${daysUntilEvent < 7 ? "fa-exclamation-circle" : daysUntilEvent < 21 ? "fa-exclamation-triangle" : "fa-check-circle"}`} />
                    {daysUntilEvent < 0
                      ? "תאריך האירוע עבר"
                      : daysUntilEvent === 0
                      ? "האירוע היום!"
                      : `${daysUntilEvent} ימים עד האירוע`}
                    {isEventSoon && daysUntilEvent >= 0 && <span> · תזמון ברירת מחדל אינו זמין</span>}
                  </div>
                )}
              </div>

              {/* שם */}
              <div className="cep-form-group">
                <label>
                  <i className="fas fa-heading" />
                  שם האירוע <span className="cep-required">*</span>
                </label>
                <input
                  type="text"
                  className="cep-input"
                  placeholder='לדוגמה: חתונת שרה ודוד'
                  value={eventTitle}
                  onChange={(e) => { setEventTitle(e.target.value); setStep1Error(""); }}
                />
              </div>

              {/* סוג אירוע */}
              <div className="cep-form-group">
                <label>
                  <i className="fas fa-calendar-alt" />
                  סוג האירוע <span className="cep-required">*</span>
                </label>
                <div className="cep-event-types-grid">
                  {eventTypes.map((type) => (
                    <div
                      key={type.value}
                      className={`cep-event-card ${selectedEventType === type.value ? "selected" : ""}`}
                      onClick={() => { setSelectedEventType(type.value); setStep1Error(""); }}
                    >
                      <i className={`fas ${type.icon}`} />
                      <span>{type.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* חבילה */}
              {availablePackages.length > 0 && (
                <div className="cep-form-group">
                  <label>
                    <i className="fas fa-box-open" />
                    בחר חבילה
                  </label>
                  <select
                    className="cep-select"
                    value={selectedPackage}
                    onChange={(e) => setSelectedPackage(e.target.value)}
                  >
                    <option value="">בחר חבילה...</option>
                    {availablePackages.map((pkg) => {
                      const details = [pkg.package_name];
                      if (pkg.guest_count) details.push(pkg.guest_count);
                      if (pkg.payment_amount) details.push(`₪${pkg.payment_amount}`);
                      return (
                        <option key={pkg.id} value={pkg.id}>
                          {details.join(" | ")} - נרכש ב-{new Date(pkg.purchased_at).toLocaleDateString("he-IL")}
                        </option>
                      );
                    })}
                  </select>
                  {selectedPackage && (() => {
                    const pkg = availablePackages.find((p) => p.id === parseInt(selectedPackage));
                    if (!pkg) return null;
                    return (
                      <div className="cep-selected-package">
                        <i className="fas fa-check-circle" />
                        <span>
                          {pkg.package_name}
                          {pkg.guest_count && ` · ${pkg.guest_count}`}
                          {pkg.payment_amount && ` · ₪${pkg.payment_amount}`}
                        </span>
                      </div>
                    );
                  })()}
                </div>
              )}

              {step1Error && (
                <div className="cep-error-box">
                  <i className="fas fa-exclamation-circle" />
                  <span>{step1Error}</span>
                </div>
              )}

              <div className="cep-footer">
                <button className="cep-btn-cancel" onClick={() => navigate("/dashboard")}>
                  ביטול
                </button>
                <button className="cep-btn-next" onClick={handleNextStep}>
                  הבא
                  <i className="fas fa-arrow-left" />
                </button>
              </div>
            </>
          )}

          {/* ===== שלב 2 ===== */}
          {step === 2 && (
            <>
              <h2 className="cep-title">
                <i className="fas fa-clock" />
                תזמון שליחת הודעות
              </h2>

              {/* סיכום שלב 1 */}
              <div className="cep-summary">
                <div className="cep-summary-item">
                  <i className="fas fa-calendar-day" />
                  <span>{new Date(eventDate).toLocaleDateString("he-IL", { day: "numeric", month: "long", year: "numeric" })}</span>
                </div>
                <div className="cep-summary-item">
                  <i className="fas fa-heading" />
                  <span>{eventTitle}</span>
                </div>
                <div className="cep-summary-item">
                  <i className={`fas ${eventTypes.find((t) => t.value === selectedEventType)?.icon}`} />
                  <span>{selectedEventLabel}</span>
                </div>
              </div>

              {/* אזהרה אם אירוע < 21 ימים */}
              {isEventSoon && daysUntilEvent >= 0 && (
                <div className="cep-soon-warning">
                  <i className="fas fa-exclamation-triangle" />
                  <span>האירוע פחות מ-21 ימים מהיום – תזמון ברירת המחדל אינו זמין. יש לבחור תזמון מותאם אישית.</span>
                </div>
              )}

              <div className="cep-schedule-selector">
                {/* ברירת מחדל */}
                <div
                  className={`cep-schedule-option ${messageScheduleType === "default" ? "selected" : ""} ${isEventSoon && daysUntilEvent >= 0 ? "disabled" : ""}`}
                  onClick={() => {
                    if (isEventSoon && daysUntilEvent >= 0) return;
                    setMessageScheduleType("default");
                    setScheduleError("");
                  }}
                >
                  <i className="fas fa-magic" />
                  <div className="cep-schedule-content">
                    <strong>ברירת מחדל {!isEventSoon && "(מומלץ)"}</strong>
                    <p>הודעות יישלחו 3 שבועות, שבועיים ושבוע לפני האירוע</p>
                  </div>
                  {isEventSoon && daysUntilEvent >= 0 && <i className="fas fa-lock cep-lock-icon" />}
                  {messageScheduleType === "default" && (!isEventSoon || daysUntilEvent < 0) && (
                    <i className="fas fa-check-circle cep-check-icon" />
                  )}
                </div>

                {/* מותאם אישית */}
                <div
                  className={`cep-schedule-option ${messageScheduleType === "custom" ? "selected" : ""}`}
                  onClick={() => { setMessageScheduleType("custom"); setScheduleError(""); }}
                >
                  <i className="fas fa-sliders-h" />
                  <div className="cep-schedule-content">
                    <strong>התאמה אישית {isEventSoon && daysUntilEvent >= 0 && "(נדרש)"}</strong>
                    <p>בחר בעצמך מתי לשלוח כל הודעה</p>
                  </div>
                  {messageScheduleType === "custom" && <i className="fas fa-check-circle cep-check-icon" />}
                </div>
              </div>

              {/* שגיאת תזמון */}
              {scheduleError && (
                <div className="cep-error-box">
                  <i className="fas fa-times-circle" />
                  <span>{scheduleError}</span>
                </div>
              )}

              {/* הגדרות custom */}
              {messageScheduleType === "custom" && (
                <div className="cep-custom-settings">
                  <div className="cep-info-box">
                    <i className="fas fa-info-circle" />
                    <span>
                      {daysUntilEvent !== null
                        ? `הודעה ראשונה חייבת להיות הכי מוקדמת, ושלישית הכי מאוחרת. האירוע בעוד ${daysUntilEvent} ימים.`
                        : "הודעה ראשונה חייבת להיות הכי מוקדמת (יותר ימים לפני), ושלישית הכי מאוחרת (פחות ימים לפני)."}
                    </span>
                  </div>
                  <div className="cep-custom-grid">
                    {(() => {
                      const m1 = Number(customSchedule.message1) || 0;
                      const m2 = Number(customSchedule.message2) || 0;
                      const m3 = Number(customSchedule.message3) || 0;
                      const maxFromDate = daysUntilEvent !== null && daysUntilEvent > 0 ? Math.min(30, daysUntilEvent - 1) : 30;

                      // הגדרות לכל שדה: max ו-min דינמיים + הודעת שגיאה
                      const fields = [
                        {
                          key: "message1",
                          label: "הודעה ראשונה",
                          defaultVal: 21,
                          // חייב להיות יותר מ-m2
                          min: m2 + 1,
                          max: maxFromDate,
                          orderError: m1 <= m2 && m2 > 0 ? `חייב להיות יותר מ-${m2} ימים (יותר מהודעה שנייה)` : null,
                        },
                        {
                          key: "message2",
                          label: "הודעה שנייה",
                          defaultVal: 14,
                          // חייב להיות בין m3+1 ל-m1-1
                          min: m3 + 1,
                          max: Math.min(maxFromDate, m1 - 1 > 0 ? m1 - 1 : maxFromDate),
                          orderError: (m2 >= m1 && m1 > 0 ? `חייב להיות פחות מ-${m1} ימים (פחות מהודעה ראשונה)` : null)
                                   || (m2 <= m3 && m3 > 0 ? `חייב להיות יותר מ-${m3} ימים (יותר מהודעה שלישית)` : null),
                        },
                        {
                          key: "message3",
                          label: "הודעה שלישית",
                          defaultVal: 7,
                          // חייב להיות פחות מ-m2
                          min: 1,
                          max: Math.min(maxFromDate, m2 - 1 > 0 ? m2 - 1 : maxFromDate),
                          orderError: m3 >= m2 && m2 > 0 ? `חייב להיות פחות מ-${m2} ימים (פחות מהודעה שנייה)` : null,
                        },
                      ];

                      return fields.map(({ key, label, defaultVal, min, max, orderError }) => {
                        const val = Number(customSchedule[key]) || 0;
                        const isOverDate = daysUntilEvent !== null && daysUntilEvent > 0 && val >= daysUntilEvent;
                        const hasError = !!orderError || isOverDate;
                        return (
                          <div className="cep-custom-item" key={key}>
                            <label>{label}</label>
                            <div className={`cep-num-wrapper ${hasError ? "error" : ""}`}>
                              <input
                                type="number"
                                min={Math.max(1, min)}
                                max={max}
                                value={customSchedule[key]}
                                onChange={(e) => {
                                  const raw = e.target.value;
                                  if (raw === "") { setCustomSchedule({ ...customSchedule, [key]: "" }); setScheduleError(""); return; }
                                  const v = parseInt(raw);
                                  if (!isNaN(v)) { setCustomSchedule({ ...customSchedule, [key]: v }); setScheduleError(""); }
                                }}
                                onBlur={(e) => {
                                  const v = parseInt(e.target.value);
                                  const clamped = isNaN(v) ? defaultVal : Math.min(max, Math.max(Math.max(1, min), v));
                                  setCustomSchedule({ ...customSchedule, [key]: clamped });
                                }}
                              />
                              <span>ימים לפני</span>
                            </div>
                            {orderError && <span className="cep-field-hint">{orderError}</span>}
                            {!orderError && isOverDate && <span className="cep-field-hint">חייב להיות פחות מ-{daysUntilEvent} ימים</span>}
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>
              )}

              <div className="cep-footer">
                <button className="cep-btn-back" onClick={() => { setStep(1); window.scrollTo({ top: 0, behavior: "smooth" }); }}>
                  <i className="fas fa-arrow-right" />
                  הקודם
                </button>
                <button className="cep-btn-submit" onClick={handleCreateEvent} disabled={loading}>
                  {loading ? (
                    <><i className="fas fa-spinner fa-spin" /> יוצר אירוע...</>
                  ) : (
                    <><i className="fas fa-check" /> המשך ליצירת הזמנה</>
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
