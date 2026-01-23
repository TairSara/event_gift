import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useState, useEffect } from 'react';
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
