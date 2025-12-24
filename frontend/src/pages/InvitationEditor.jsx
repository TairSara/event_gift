import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { HDate, gematriya } from '@hebcal/core';
import { useAuth } from '../context/AuthContext';
import weddingManifest from '../data/wedding.manifest.json';
import hinaManifest from '../data/hina.manifest.json';
import barMitzvahManifest from '../data/bar-mitzvah.manifest.json';
import batMitzvahManifest from '../data/bat-mitzvah.manifest.json';
import britManifest from '../data/brit.manifest.json';
import britaManifest from '../data/brita.manifest.json';
import knasimManifest from '../data/knasim.manifest.json';
import birthdayManifest from '../data/birthday.manifest.json';
import otherManifest from '../data/other.manifest.json';
import { renderSide, combineCanvasesWithMockup } from '../lib/canvasRender';
import { downloadPNG, downloadPDF } from '../lib/download';
import TimePicker from '../components/TimePicker';
import './InvitationEditor.css';

export default function InvitationEditor() {
  const { eventType } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const templateId = searchParams.get('id');
  const eventId = searchParams.get('event_id');

  const [template, setTemplate] = useState(null);
  const [currentSide, setCurrentSide] = useState('front');
  const [frontApproved, setFrontApproved] = useState(false);
  const [backApproved, setBackApproved] = useState(false);
  const [showCombined, setShowCombined] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);

  // Check if this is a single-sided invitation (all except wedding are single-sided)
  const singleSidedEvents = ['hina', 'bar-mitzvah', 'bat-mitzvah', 'brit', 'brita', 'knasim', 'birthday', 'other'];
  const isSingleSided = singleSidedEvents.includes(eventType);
  const isWedding = eventType === 'wedding';

  const frontCanvasRef = useRef(null);
  const backCanvasRef = useRef(null);
  const combinedCanvasRef = useRef(null);
  const previewCanvasRef = useRef(null); // Canvas for live preview display
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Form values
  const [values, setValues] = useState({
    quote: '',
    initialLeft: '',
    initialRight: '',
    names: '',
    dateHebrew: '',
    dateEnglish: '',
    venue: '',
    city: '',
    kabbalatPanim: '',
    chuppah: '',
    rikudim: ''
  });

  // Load template
  useEffect(() => {
    let found = null;
    if (eventType === 'wedding') {
      found = weddingManifest.templates.find(t => t.id === templateId);
    } else if (eventType === 'hina') {
      found = hinaManifest.templates.find(t => t.id === templateId);
    } else if (eventType === 'bar-mitzvah') {
      found = barMitzvahManifest.templates.find(t => t.id === templateId);
    } else if (eventType === 'bat-mitzvah') {
      found = batMitzvahManifest.templates.find(t => t.id === templateId);
    } else if (eventType === 'brit') {
      found = britManifest.templates.find(t => t.id === templateId);
    } else if (eventType === 'brita') {
      found = britaManifest.templates.find(t => t.id === templateId);
    } else if (eventType === 'knasim') {
      found = knasimManifest.templates.find(t => t.id === templateId);
    } else if (eventType === 'birthday') {
      found = birthdayManifest.templates.find(t => t.id === templateId);
    } else if (eventType === 'other') {
      found = otherManifest.templates.find(t => t.id === templateId);
    }

    if (found) {
      setTemplate(found);

      // Set default values from template fields
      const defaultValues = {};
      const allFields = [...(found.frontFields || []), ...(found.backFields || [])];
      allFields.forEach(field => {
        if (field.defaultValue && field.key) {
          defaultValues[field.key] = field.defaultValue;
        }
      });

      if (Object.keys(defaultValues).length > 0) {
        setValues(prev => ({ ...prev, ...defaultValues }));
      }

      // For single-sided invitations, auto-approve back side
      if (isSingleSided) {
        setBackApproved(true);
      }
    } else {
      navigate('/');
    }
  }, [eventType, templateId, navigate, isSingleSided]);

  // Render front canvas
  useEffect(() => {
    if (template && frontCanvasRef.current) {
      renderSide(frontCanvasRef.current, template, values, 'front')
        .then(() => {
          // Copy to preview canvas if it exists and we're showing front
          if (previewCanvasRef.current && (currentSide === 'front' || isSingleSided)) {
            const ctx = previewCanvasRef.current.getContext('2d');
            previewCanvasRef.current.width = frontCanvasRef.current.width;
            previewCanvasRef.current.height = frontCanvasRef.current.height;
            ctx.drawImage(frontCanvasRef.current, 0, 0);
          }
        })
        .catch(console.error);
    }
  }, [template, values, currentSide, isSingleSided]);

  // Render back canvas
  useEffect(() => {
    if (template && backCanvasRef.current) {
      renderSide(backCanvasRef.current, template, values, 'back')
        .then(() => {
          // Copy to preview canvas if it exists and we're showing back
          if (previewCanvasRef.current && currentSide === 'back' && !isSingleSided) {
            const ctx = previewCanvasRef.current.getContext('2d');
            previewCanvasRef.current.width = backCanvasRef.current.width;
            previewCanvasRef.current.height = backCanvasRef.current.height;
            ctx.drawImage(backCanvasRef.current, 0, 0);
          }
        })
        .catch(console.error);
    }
  }, [template, values, currentSide, isSingleSided]);

  // Show confetti when combined view is shown
  useEffect(() => {
    if (showCombined) {
      setShowConfetti(true);
      // Hide confetti after 4 seconds
      const timer = setTimeout(() => {
        setShowConfetti(false);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [showCombined]);

  // Create combined canvas when showCombined becomes true
  useEffect(() => {
    if (showCombined && combinedCanvasRef.current && frontCanvasRef.current) {
      const createCombinedCanvas = async () => {
        try {
          const frontCanvas = frontCanvasRef.current;
          const combinedCanvas = combinedCanvasRef.current;

          console.log('Creating combined canvas after view change...');
          console.log('Current values:', values);

          // IMPORTANT: Re-render the front canvas with latest values before copying
          await renderSide(frontCanvas, template, values, 'front');

          // Wait a moment to ensure rendering is complete
          await new Promise(resolve => setTimeout(resolve, 100));

          if (isSingleSided) {
            // For single-sided, just copy the front canvas (portrait)
            console.log('Copying front canvas to combined canvas...');
            const ctx = combinedCanvas.getContext('2d');
            combinedCanvas.width = frontCanvas.width;
            combinedCanvas.height = frontCanvas.height;
            ctx.drawImage(frontCanvas, 0, 0);
            console.log('Combined canvas created successfully');
          } else {
            // For wedding (double-sided), use the mockup with flowers-001-final background
            const backCanvas = backCanvasRef.current;
            if (backCanvas) {
              // Re-render back canvas as well
              await renderSide(backCanvas, template, values, 'back');
              await new Promise(resolve => setTimeout(resolve, 100));

              // Use combineCanvasesWithMockup to create the final image with background
              console.log('Creating wedding mockup with flowers background...');
              const combined = await combineCanvasesWithMockup(frontCanvas, backCanvas, template);
              const ctx = combinedCanvas.getContext('2d');
              combinedCanvas.width = combined.width;
              combinedCanvas.height = combined.height;
              ctx.drawImage(combined, 0, 0);
              console.log('Wedding mockup created successfully');
            }
          }
        } catch (error) {
          console.error('Error creating combined canvas:', error);
        }
      };

      createCombinedCanvas();
    }
  }, [showCombined, isSingleSided, template, values]);

  const handleInputChange = (key, value) => {
    setValues(prev => ({ ...prev, [key]: value }));
  };

  const handleDateChange = (dateString) => {
    if (!dateString) {
      setValues(prev => ({
        ...prev,
        eventDate: '',
        dayOfWeek: '',
        dateHebrew: '',
        dateEnglish: ''
      }));
      return;
    }

    const date = new Date(dateString);

    // Get Hebrew date
    const hDate = new HDate(date);

    // Get day of week in Hebrew
    const daysOfWeek = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
    const dayOfWeek = daysOfWeek[date.getDay()];

    // Hebrew months with nikud
    const hebrewMonthsWithNikud = {
      'Nisan': 'נִיסָן',
      'Iyyar': 'אִיָּר',
      'Sivan': 'סִיוָן',
      'Tamuz': 'תַּמּוּז',
      'Av': 'אָב',
      'Elul': 'אֱלוּל',
      'Tishrei': 'תִּשְׁרֵי',
      'Cheshvan': 'חֶשְׁוָן',
      'Kislev': 'כִּסְלֵו',
      'Tevet': 'טֵבֵת',
      'Sh\'vat': 'שְׁבָט',
      'Adar': 'אֲדָר',
      'Adar I': 'אֲדָר א׳',
      'Adar II': 'אֲדָר ב׳'
    };

    // Get Hebrew date string (e.g., "כ״ב בְּכִסְלֵו תשפ״ה")
    const hebrewDay = gematriya(hDate.getDate());
    const hebrewMonthEnglish = hDate.getMonthName();
    const hebrewMonth = hebrewMonthsWithNikud[hebrewMonthEnglish] || hebrewMonthEnglish;
    const hebrewYear = gematriya(hDate.getFullYear());
    const dateHebrew = `${hebrewDay} בְּ${hebrewMonth} ${hebrewYear}`;

    // Get Gregorian date string (e.g., "22.11.2024")
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const dateEnglish = `${day}.${month}.${year}`;

    setValues(prev => ({
      ...prev,
      eventDate: dateString,
      dayOfWeek,
      dateHebrew,
      dateEnglish
    }));
  };

  const handleApproveFront = async () => {
    await renderSide(frontCanvasRef.current, template, values, 'front');
    setFrontApproved(true);
    setCurrentSide('back');
  };

  const handleApproveBack = async () => {
    await renderSide(backCanvasRef.current, template, values, 'back');
    setBackApproved(true);
  };

  const handleFinish = () => {
    // For wedding (double-sided), check that both sides are approved
    if (!isSingleSided && (!frontApproved || !backApproved)) {
      alert('יש לאשר את שני הצדדים לפני סיום');
      return;
    }

    console.log('Switching to combined view...');
    // Show the combined view - the canvas will be created in useEffect with latest values
    setShowCombined(true);
  };

  const saveInvitationToEvent = async () => {
    if (!eventId) return;

    const API_URL = import.meta.env.VITE_API_URL || 'https://event-gift.onrender.com/api';

    try {
      const invitationData = {
        template_id: templateId,
        event_type: eventType,
        values: values,
        front_approved: frontApproved,
        back_approved: backApproved
      };

      // Extract location from invitation values (venue or city)
      const eventLocation = values.venue || values.city || null;

      const response = await fetch(`${API_URL}/packages/events/${eventId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          invitation_data: invitationData,
          event_date: values.eventDate || null,
          event_location: eventLocation
        })
      });

      if (response.ok) {
        console.log('Invitation saved to event successfully');
        return true;
      } else {
        console.error('Failed to save invitation to event');
        return false;
      }
    } catch (error) {
      console.error('Error saving invitation to event:', error);
      return false;
    }
  };

  const handleDownloadPNG = async () => {
    downloadPNG(combinedCanvasRef.current, `invitation-${templateId}.png`);
  };

  const handleDownloadPDF = async () => {
    downloadPDF(combinedCanvasRef.current, `invitation-${templateId}.pdf`);
  };

  const handleSaveAndReturn = async () => {
    if (!eventId) return;

    const saved = await saveInvitationToEvent();
    if (saved) {
      navigate(`/event/${eventId}`);
    } else {
      alert('שגיאה בשמירת ההזמנה');
    }
  };

  if (!template) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>טוען תבנית...</p>
      </div>
    );
  }

  const currentFields = currentSide === 'front' ? template.frontFields : (template.backFields || []);
  const currentSlots = currentSide === 'front' ? template.frontSlots : (template.backSlots || []);

  return (
    <div className="invitation-editor" data-event-type={eventType}>
      {/* Navigation Bar */}
      <nav className="navbar">
        <div className="navbar-container">
          <button
            className="mobile-menu-btn"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="תפריט"
          >
            <span className={`hamburger ${mobileMenuOpen ? 'open' : ''}`}>
              <span></span>
              <span></span>
              <span></span>
            </span>
          </button>

          <div className="logo" onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
            <img src="/images/logo.webp" alt="Save the Day" className="logo-image" />
          </div>

          <ul className={`nav-links ${mobileMenuOpen ? 'mobile-open' : ''}`}>
            <li><a href="/#events" onClick={() => setMobileMenuOpen(false)}>מתנות באשראי</a></li>
            <li><a href="/pricing" onClick={() => setMobileMenuOpen(false)}>מחירים וחבילות</a></li>
            <li><a href="/#login" onClick={() => setMobileMenuOpen(false)}>אזור אישי</a></li>
          </ul>
        </div>
      </nav>

      {/* Hidden canvases that always exist for rendering */}
      <div style={{ display: 'none' }}>
        <canvas
          ref={frontCanvasRef}
          width={1080}
          height={1350}
        />
        {!isSingleSided && (
          <canvas
            ref={backCanvasRef}
            width={1080}
            height={1350}
          />
        )}
      </div>

      <div className="editor-container">
        {!showCombined ? (
          <div className="editor-content">
            {/* Side Tabs - Only show for wedding (double-sided) */}
            {!isSingleSided && (
              <div className="side-tabs">
                <button
                  className={`side-tab ${currentSide === 'front' ? 'active' : ''} ${frontApproved ? 'approved' : ''}`}
                  onClick={() => !frontApproved && setCurrentSide('front')}
                  disabled={frontApproved}
                >
                  <i className={`fas ${frontApproved ? 'fa-check-circle' : 'fa-file-alt'}`}></i>
                  <span>צד קדמי</span>
                  {frontApproved && <span className="approved-badge">מאושר</span>}
                </button>
                <button
                  className={`side-tab ${currentSide === 'back' ? 'active' : ''} ${backApproved ? 'approved' : ''}`}
                  onClick={() => !backApproved && setCurrentSide('back')}
                  disabled={backApproved}
                >
                  <i className={`fas ${backApproved ? 'fa-check-circle' : 'fa-file-alt'}`}></i>
                  <span>צד אחורי</span>
                  {backApproved && <span className="approved-badge">מאושר</span>}
                </button>
              </div>
            )}

            <div className="editor-workspace">
              {/* Controls Panel */}
              <div className="controls-panel">
                <h3>פרטי ההזמנה</h3>

                {currentFields.filter(f => f.label).map(field => (
                  <div key={field.key} className="form-group">
                    <label htmlFor={field.key}>{field.label}</label>
                    {field.type === 'date' ? (
                      <input
                        type="date"
                        id={field.key}
                        value={values[field.key] || ''}
                        onChange={(e) => handleDateChange(e.target.value)}
                        disabled={!isSingleSided && (currentSide === 'front' ? frontApproved : backApproved)}
                      />
                    ) : field.type === 'time' ? (
                      <TimePicker
                        value={values[field.key] || '20:00'}
                        onChange={(time) => handleInputChange(field.key, time)}
                        disabled={!isSingleSided && (currentSide === 'front' ? frontApproved : backApproved)}
                      />
                    ) : (
                      <input
                        type="text"
                        id={field.key}
                        value={values[field.key] || ''}
                        onChange={(e) => handleInputChange(field.key, e.target.value)}
                        placeholder={`הזן ${field.label}`}
                        disabled={!isSingleSided && (currentSide === 'front' ? frontApproved : backApproved)}
                      />
                    )}
                  </div>
                ))}

                {currentSlots.map(slot => (
                  <div key={slot.key} className="form-group">
                    <label htmlFor={slot.key}>{slot.label}</label>
                    <input
                      type="text"
                      id={slot.key}
                      value={values[slot.key] || ''}
                      onChange={(e) => handleInputChange(slot.key, e.target.value)}
                      placeholder={`הזן ${slot.label}`}
                      maxLength="1"
                      disabled={!isSingleSided && frontApproved}
                    />
                  </div>
                ))}

                {/* Custom Background Upload */}
                {template.allowCustomBackground && (
                  <div className="form-group">
                    <label htmlFor={`customBackground${currentSide === 'front' ? 'Front' : 'Back'}`}>
                      {currentSide === 'front' ? 'תמונת רקע לצד קדמי' : 'תמונת רקע לצד אחורי'}
                    </label>
                    <input
                      type="file"
                      id={`customBackground${currentSide === 'front' ? 'Front' : 'Back'}`}
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onload = (event) => {
                            handleInputChange(
                              currentSide === 'front' ? 'customBackgroundFront' : 'customBackgroundBack',
                              event.target.result
                            );
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                      disabled={currentSide === 'front' ? frontApproved : backApproved}
                    />
                    {values[currentSide === 'front' ? 'customBackgroundFront' : 'customBackgroundBack'] && (
                      <div className="image-preview">
                        <img
                          src={values[currentSide === 'front' ? 'customBackgroundFront' : 'customBackgroundBack']}
                          alt="תצוגה מקדימה של התמונה"
                          style={{ maxWidth: '100%', height: 'auto', borderRadius: '8px', marginTop: '0.5rem' }}
                        />
                      </div>
                    )}
                  </div>
                )}

                <div className="action-buttons">
                  {/* For single-sided invitations - direct finish button */}
                  {isSingleSided && (
                    <button className="btn-finish" onClick={handleFinish}>
                      <i className="fas fa-flag-checkered"></i>
                      סיים וצפה בתוצאה
                    </button>
                  )}

                  {/* For wedding (double-sided) - approve buttons */}
                  {!isSingleSided && currentSide === 'front' && !frontApproved && (
                    <button className="btn-approve" onClick={handleApproveFront}>
                      <i className="fas fa-check"></i>
                      אשר צד קדמי
                    </button>
                  )}

                  {!isSingleSided && currentSide === 'back' && !backApproved && (
                    <button className="btn-approve" onClick={handleApproveBack}>
                      <i className="fas fa-check"></i>
                      אשר צד אחורי
                    </button>
                  )}

                  {!isSingleSided && frontApproved && backApproved && (
                    <button className="btn-finish" onClick={handleFinish}>
                      <i className="fas fa-flag-checkered"></i>
                      סיים וצפה בתוצאה
                    </button>
                  )}
                </div>
              </div>

              {/* Canvas Preview */}
              <div className="canvas-preview">
                <div className="canvas-wrapper">
                  <canvas
                    ref={previewCanvasRef}
                    className="invitation-canvas active"
                    width={1080}
                    height={1350}
                  />
                </div>
                <div className="canvas-label">
                  {isSingleSided ? 'תצוגה מקדימה' : (currentSide === 'front' ? 'תצוגה מקדימה - צד קדמי' : 'תצוגה מקדימה - צד אחורי')}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="combined-view">
            {showConfetti && (
              <div className="confetti-celebration">
                {Array.from({ length: 60 }).map((_, i) => (
                  <div
                    key={i}
                    className="combined-confetti"
                    style={{
                      left: `${Math.random() * 100}%`,
                      animationDelay: `${Math.random() * 0.5}s`,
                      animationDuration: `${2 + Math.random() * 2}s`,
                      backgroundColor: [
                        '#4ECDC4',
                        '#7DA88D',
                        '#E8B4B8',
                        '#C9A887',
                        '#8B6F47',
                        '#6B5638',
                        '#FFFFFF',
                        '#F5F5F5'
                      ][Math.floor(Math.random() * 8)]
                    }}
                  />
                ))}
              </div>
            )}

            <h2>ההזמנה המוכנה שלך!</h2>
            <p className="combined-subtitle">
              {isSingleSided ? (
                'ההזמנה שלך מוכנה להורדה! בחר את הפורמט המועדף עליך'
              ) : (
                'שני הצדדים מוכנים להורדה! בחר את הפורמט המועדף עליך'
              )}
            </p>

            <div className="combined-content-wrapper">
              <div className="combined-canvas-wrapper">
                <canvas ref={combinedCanvasRef} className="combined-canvas" />
              </div>

              <div className="download-actions-panel">
                <h3>הורדת ההזמנה</h3>
                <p className="download-description">
                  {isSingleSided ? (
                    'בחר את הפורמט הרצוי להורדת ההזמנה'
                  ) : (
                    'שני הצדדים של ההזמנה מוצגים יחד על רקע מעוצב'
                  )}
                </p>
                <div className="download-buttons-vertical">
                  {user && eventId && (
                    <button className="btn-download btn-save-return" onClick={handleSaveAndReturn}>
                      <i className="fas fa-save"></i>
                      שמור וחזור לאירוע
                    </button>
                  )}
                  <button className="btn-download btn-download-png" onClick={handleDownloadPNG}>
                    <i className="fas fa-download"></i>
                    הורד PNG
                  </button>
                  <button className="btn-download btn-download-pdf" onClick={handleDownloadPDF}>
                    <i className="fas fa-file-pdf"></i>
                    הורד PDF
                  </button>
                </div>
              </div>
            </div>

            <button
              className="btn-back-to-edit"
              onClick={() => {
                setShowCombined(false);
                setFrontApproved(false);
                setBackApproved(false);
                setCurrentSide('front');
              }}
            >
              <i className="fas fa-arrow-right"></i>
              חזור לעריכה
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
