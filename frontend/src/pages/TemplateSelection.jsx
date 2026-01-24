import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import weddingManifest from '../data/wedding.manifest.json';
import hinaManifest from '../data/hina.manifest.json';
import barMitzvahManifest from '../data/bar-mitzvah.manifest.json';
import batMitzvahManifest from '../data/bat-mitzvah.manifest.json';
import britManifest from '../data/brit.manifest.json';
import britaManifest from '../data/brita.manifest.json';
import knasimManifest from '../data/knasim.manifest.json';
import birthdayManifest from '../data/birthday.manifest.json';
import otherManifest from '../data/other.manifest.json';
import './TemplateSelection.css';

export default function TemplateSelection() {
  const { eventType } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const eventId = searchParams.get('event_id');
  const [templates, setTemplates] = useState([]);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    // Load templates based on event type
    if (eventType === 'wedding') {
      setTemplates(weddingManifest.templates);
    } else if (eventType === 'hina') {
      setTemplates(hinaManifest.templates);
    } else if (eventType === 'bar-mitzvah') {
      setTemplates(barMitzvahManifest.templates);
    } else if (eventType === 'bat-mitzvah') {
      setTemplates(batMitzvahManifest.templates);
    } else if (eventType === 'brit') {
      setTemplates(britManifest.templates);
    } else if (eventType === 'brita') {
      setTemplates(britaManifest.templates);
    } else if (eventType === 'knasim') {
      setTemplates(knasimManifest.templates);
    } else if (eventType === 'birthday') {
      setTemplates(birthdayManifest.templates);
    } else if (eventType === 'other') {
      setTemplates(otherManifest.templates);
    }
  }, [eventType]);

  const handleTemplateSelect = (templateId) => {
    const editorUrl = `/create-invitation/${eventType}/editor?id=${templateId}${eventId ? `&event_id=${eventId}` : ''}`;
    navigate(editorUrl);
  };

  const handleUploadOwn = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    const API_URL = import.meta.env.VITE_API_URL || 'https://event-gift.onrender.com/api';

    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const imageData = reader.result;
        const invitationData = {
          template_id: 'custom-upload',
          event_type: eventType,
          values: {},
          front_approved: true,
          back_approved: true,
          custom_image: imageData
        };

        if (eventId) {
          const response = await fetch(`${API_URL}/packages/events/${eventId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ invitation_data: invitationData })
          });

          if (response.ok) {
            navigate(`/event/${eventId}`);
          } else {
            alert('שגיאה בשמירת ההזמנה');
          }
        } else {
          navigate(`/create-invitation/${eventType}/editor?upload=true`);
        }
        setUploading(false);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Error uploading invitation:', error);
      alert('שגיאה בהעלאת ההזמנה');
      setUploading(false);
    }
  };

  return (
    <div className="template-selection">
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
            <li><a href="/pricing" onClick={() => setMobileMenuOpen(false)}>מחירים וחבילות</a></li>
            <li><a href="/#login" onClick={() => setMobileMenuOpen(false)}>אזור אישי</a></li>
          </ul>
        </div>
      </nav>

      <div className="template-selection-container">
        <header className="template-selection-header">
          <h1>בחירת תבנית להזמנה</h1>
          <p className="subtitle">בחר את התבנית המושלמת לאירוע שלך</p>
        </header>

        <div className="templates-grid">
          {/* Upload own invitation card */}
          <div className="template-card upload-own-card" onClick={handleUploadOwn}>
            <div className="template-thumbnail upload-thumbnail">
              <div className="upload-icon-wrapper">
                <i className="fas fa-cloud-upload-alt"></i>
                <span>{uploading ? 'מעלה...' : 'העלה הזמנה משלך'}</span>
                <p className="upload-hint">כבר יש לך הזמנה מוכנה? העלה אותה כאן</p>
              </div>
            </div>
            <div className="template-info">
              <h3>הזמנה משלי</h3>
              <p className="template-description">העלה תמונה של הזמנה שכבר יש לך</p>
            </div>
          </div>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/*"
            style={{ display: 'none' }}
          />
          {templates.map((template) => (
            <div
              key={template.id}
              className="template-card"
              onClick={() => handleTemplateSelect(template.id)}
            >
              <div className="template-thumbnail">
                <img
                  src={template.cover || template.frontBg}
                  alt={template.name}
                  loading="lazy"
                />
                <div className="template-overlay">
                  <button className="select-template-btn">
                    <i className="fas fa-check"></i>
                    <span>בחר תבנית</span>
                  </button>
                </div>
              </div>
              <div className="template-info">
                <h3>{template.name}</h3>
                <p className="template-description">
                  {template.description}
                </p>
              </div>
            </div>
          ))}
        </div>

        {templates.length === 0 && (
          <div className="no-templates">
            <i className="fas fa-inbox"></i>
            <p>אין תבניות זמינות כרגע</p>
          </div>
        )}
      </div>
    </div>
  );
}
