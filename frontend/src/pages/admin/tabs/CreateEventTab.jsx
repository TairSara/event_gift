import { useState, useEffect, useRef } from 'react';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://event-gift.onrender.com/api';

const packages = [
  {
    id: 1,
    name: "חבילת בסיס – ידני",
    tagline: "שליחה ידנית – המערכת עושה סדר",
    price: "₪39",
    subPackages: null,
  },
  {
    id: 2,
    name: "אוטומטי SMS",
    tagline: "שליחה ואישורי הגעה ב־SMS",
    price: null,
    subPackages: [
      { records: "150 רשומות", price: "₪59" },
      { records: "300 רשומות", price: "₪79" },
      { records: "500 רשומות", price: "₪109" },
      { records: "800 רשומות", price: "₪159" },
      { records: "1,000 רשומות", price: "₪189" },
      { records: "2,000 רשומות", price: "₪319" },
    ],
  },
  {
    id: 3,
    name: "אוטומטי WhatsApp",
    tagline: "שליחה ואישורים אוטומטיים ב־WhatsApp",
    price: null,
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
  },
  {
    id: 4,
    name: "אוטומטי הכל כלול",
    tagline: "דואגים לכם להכל – אפס התעסקות",
    price: null,
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
  },
];

export default function CreateEventTab() {
  const [step, setStep] = useState(1);
  const [userSearch, setUserSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedPackageId, setSelectedPackageId] = useState(null);
  const [selectedSubPackage, setSelectedSubPackage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(null);
  const [error, setError] = useState('');
  const searchTimeout = useRef(null);

  // Debounced user search
  useEffect(() => {
    if (!userSearch || userSearch.length < 2) {
      setSearchResults([]);
      return;
    }

    if (searchTimeout.current) clearTimeout(searchTimeout.current);

    searchTimeout.current = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const token = localStorage.getItem('adminToken');
        const params = new URLSearchParams({ search: userSearch, limit: 10, page: 1 });
        const response = await fetch(`${API_BASE_URL}/admin/users?${params}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (response.ok) {
          const data = await response.json();
          setSearchResults(data.users || []);
        }
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        setSearchLoading(false);
      }
    }, 400);

    return () => { if (searchTimeout.current) clearTimeout(searchTimeout.current); };
  }, [userSearch]);

  const handleSelectUser = (user) => {
    setSelectedUser(user);
    setUserSearch('');
    setSearchResults([]);
    setStep(2);
  };

  const handleSelectPackage = (pkgId) => {
    const pkg = packages.find(p => p.id === pkgId);
    setSelectedPackageId(pkgId);
    setSelectedSubPackage(null);
    // If fixed price (no sub-packages), go straight to confirm
    if (!pkg.subPackages) {
      setStep(3);
    }
  };

  const handleSelectSubPackage = (sub) => {
    setSelectedSubPackage(sub);
    setStep(3);
  };

  const getSelectedPackage = () => packages.find(p => p.id === selectedPackageId);

  const getDisplayPrice = () => {
    const pkg = getSelectedPackage();
    if (!pkg) return '';
    if (pkg.price) return pkg.price;
    if (selectedSubPackage) return selectedSubPackage.price;
    return '';
  };

  const handleConfirm = async () => {
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('adminToken');
      const pkg = getSelectedPackage();
      const packageName = selectedSubPackage
        ? `${pkg.name} - ${selectedSubPackage.records}`
        : pkg.name;

      const response = await fetch(`${API_BASE_URL}/admin/assign-package`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          user_id: selectedUser.id,
          package_id: selectedPackageId,
          package_name: packageName,
          guest_count: selectedSubPackage?.records || null
        })
      });

      const data = await response.json();
      if (response.ok) {
        setSuccess(data);
      } else {
        setError(data.detail || 'שגיאה בהקצאת החבילה');
      }
    } catch (err) {
      console.error('Assign error:', err);
      setError('שגיאה בתקשורת עם השרת');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setStep(1);
    setSelectedUser(null);
    setSelectedPackageId(null);
    setSelectedSubPackage(null);
    setSuccess(null);
    setError('');
    setUserSearch('');
    setSearchResults([]);
  };

  // Success state
  if (success) {
    return (
      <div className="admin-page">
        <div className="admin-page-header">
          <h1>הקצאת חבילה</h1>
        </div>
        <div className="admin-card">
          <div className="assign-success">
            <div className="assign-success-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                <polyline points="22 4 12 14.01 9 11.01"/>
              </svg>
            </div>
            <h2>החבילה הוקצתה בהצלחה!</h2>
            <div className="assign-success-details">
              <div className="assign-detail-row">
                <span className="assign-detail-label">משתמש:</span>
                <span className="assign-detail-value">{success.user_name || success.user_email}</span>
              </div>
              <div className="assign-detail-row">
                <span className="assign-detail-label">אימייל:</span>
                <span className="assign-detail-value" style={{ direction: 'ltr', textAlign: 'right' }}>{success.user_email}</span>
              </div>
              <div className="assign-detail-row">
                <span className="assign-detail-label">חבילה:</span>
                <span className="assign-detail-value">{success.package_name}</span>
              </div>
            </div>
            <button className="assign-btn-primary" onClick={handleReset}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 18, height: 18 }}>
                <line x1="12" y1="5" x2="12" y2="19"/>
                <line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              הקצה חבילה נוספת
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <h1>הקצאת חבילה</h1>
        <p>הקצה חבילה למשתמש – החבילה תהיה זמינה לו ביצירת אירוע חדש</p>
      </div>

      {/* Step Indicator */}
      <div className="assign-steps">
        <div className={`assign-step ${step >= 1 ? 'active' : ''} ${step > 1 ? 'done' : ''}`}>
          <div className="assign-step-num">{step > 1 ? '✓' : '1'}</div>
          <span>בחירת משתמש</span>
        </div>
        <div className="assign-step-line" />
        <div className={`assign-step ${step >= 2 ? 'active' : ''} ${step > 2 ? 'done' : ''}`}>
          <div className="assign-step-num">{step > 2 ? '✓' : '2'}</div>
          <span>בחירת חבילה</span>
        </div>
        <div className="assign-step-line" />
        <div className={`assign-step ${step >= 3 ? 'active' : ''}`}>
          <div className="assign-step-num">3</div>
          <span>אישור</span>
        </div>
      </div>

      {/* Step 1: User Selection */}
      {step === 1 && (
        <div className="admin-card">
          <div className="admin-card-header">
            <h2>בחר משתמש</h2>
          </div>
          <div style={{ padding: '1.5rem' }}>
            <div className="assign-search-wrapper">
              <input
                type="text"
                className="assign-search-input"
                placeholder="חפש לפי שם או אימייל..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                autoFocus
              />
              {searchLoading && (
                <div className="assign-search-spinner">
                  <div className="loading-spinner" style={{ width: 20, height: 20 }} />
                </div>
              )}
            </div>

            {searchResults.length > 0 && (
              <div className="assign-user-results">
                {searchResults.map(user => (
                  <div
                    key={user.id}
                    className="assign-user-item"
                    onClick={() => handleSelectUser(user)}
                  >
                    <div className="assign-user-avatar">
                      {(user.full_name || user.email || '?').charAt(0).toUpperCase()}
                    </div>
                    <div className="assign-user-info">
                      <div className="assign-user-name">{user.full_name || 'ללא שם'}</div>
                      <div className="assign-user-email">{user.email}</div>
                    </div>
                    <div className="assign-user-meta">
                      <span className="status-badge active">{user.active_packages || 0} חבילות פעילות</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {userSearch.length >= 2 && !searchLoading && searchResults.length === 0 && (
              <div className="assign-no-results">לא נמצאו משתמשים</div>
            )}

            {selectedUser && (
              <div className="assign-selected-user">
                <div className="assign-user-avatar">
                  {(selectedUser.full_name || selectedUser.email || '?').charAt(0).toUpperCase()}
                </div>
                <div className="assign-user-info">
                  <div className="assign-user-name">{selectedUser.full_name || 'ללא שם'}</div>
                  <div className="assign-user-email">{selectedUser.email}</div>
                </div>
                <button className="assign-btn-change" onClick={() => { setSelectedUser(null); setStep(1); }}>
                  שנה
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Step 2: Package Selection */}
      {step === 2 && (
        <div className="admin-card">
          <div className="admin-card-header">
            <h2>בחר חבילה</h2>
            <button className="assign-btn-back" onClick={() => setStep(1)}>
              ← חזור
            </button>
          </div>
          <div style={{ padding: '1.5rem' }}>
            {/* Selected user summary */}
            <div className="assign-selected-user compact">
              <div className="assign-user-avatar small">
                {(selectedUser?.full_name || selectedUser?.email || '?').charAt(0).toUpperCase()}
              </div>
              <span className="assign-user-name">{selectedUser?.full_name || selectedUser?.email}</span>
            </div>

            <div className="assign-packages-grid">
              {packages.map(pkg => (
                <div
                  key={pkg.id}
                  className={`assign-package-card ${selectedPackageId === pkg.id ? 'selected' : ''}`}
                  onClick={() => handleSelectPackage(pkg.id)}
                >
                  <h3>{pkg.name}</h3>
                  <p className="assign-package-tagline">{pkg.tagline}</p>
                  {pkg.price && (
                    <div className="assign-package-price">{pkg.price}</div>
                  )}
                  {!pkg.price && (
                    <div className="assign-package-price-label">בחר כמות אורחים</div>
                  )}
                </div>
              ))}
            </div>

            {/* Sub-packages for selected package */}
            {selectedPackageId && getSelectedPackage()?.subPackages && (
              <div className="assign-sub-section">
                <h3>בחר כמות אורחים עבור {getSelectedPackage().name}:</h3>
                <div className="assign-sub-grid">
                  {getSelectedPackage().subPackages.map((sub, idx) => (
                    <button
                      key={idx}
                      className={`assign-sub-btn ${selectedSubPackage?.records === sub.records ? 'selected' : ''}`}
                      onClick={() => handleSelectSubPackage(sub)}
                    >
                      <span className="assign-sub-records">{sub.records}</span>
                      <span className="assign-sub-price">{sub.price}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Step 3: Confirmation */}
      {step === 3 && (
        <div className="admin-card">
          <div className="admin-card-header">
            <h2>אישור הקצאה</h2>
            <button className="assign-btn-back" onClick={() => setStep(2)}>
              ← חזור
            </button>
          </div>
          <div style={{ padding: '1.5rem' }}>
            <div className="assign-confirm-summary">
              <div className="assign-confirm-row">
                <div className="assign-confirm-label">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 18, height: 18 }}>
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                    <circle cx="12" cy="7" r="4"/>
                  </svg>
                  משתמש
                </div>
                <div className="assign-confirm-value">
                  <strong>{selectedUser?.full_name || 'ללא שם'}</strong>
                  <span style={{ direction: 'ltr', display: 'block', fontSize: '0.85rem', color: 'var(--admin-text-muted)' }}>
                    {selectedUser?.email}
                  </span>
                </div>
              </div>

              <div className="assign-confirm-row">
                <div className="assign-confirm-label">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 18, height: 18 }}>
                    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
                  </svg>
                  חבילה
                </div>
                <div className="assign-confirm-value">
                  <strong>{getSelectedPackage()?.name}</strong>
                  {selectedSubPackage && (
                    <span style={{ display: 'block', fontSize: '0.85rem', color: 'var(--admin-text-muted)' }}>
                      {selectedSubPackage.records}
                    </span>
                  )}
                </div>
              </div>

              <div className="assign-confirm-row">
                <div className="assign-confirm-label">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 18, height: 18 }}>
                    <line x1="12" y1="1" x2="12" y2="23"/>
                    <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
                  </svg>
                  מחיר
                </div>
                <div className="assign-confirm-value">
                  <strong className="assign-confirm-price">{getDisplayPrice()}</strong>
                </div>
              </div>
            </div>

            {error && (
              <div className="assign-error">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 18, height: 18 }}>
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="15" y1="9" x2="9" y2="15"/>
                  <line x1="9" y1="9" x2="15" y2="15"/>
                </svg>
                {error}
              </div>
            )}

            <div className="assign-confirm-actions">
              <button
                className="assign-btn-primary"
                onClick={handleConfirm}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <div className="loading-spinner" style={{ width: 18, height: 18 }} />
                    מקצה...
                  </>
                ) : (
                  <>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ width: 18, height: 18 }}>
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                    אשר הקצאה
                  </>
                )}
              </button>
              <button className="assign-btn-secondary" onClick={handleReset}>
                ביטול
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
