import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import NotificationBell from "./NotificationBell";
import "./Navbar.css";

export default function Navbar() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <nav className="navbar">
      <div className="navbar-container">
        {/* Mobile Menu Button */}
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

        {user && (
          <div className="notification-bell-left">
            <NotificationBell />
          </div>
        )}

        <div className="logo" onClick={() => navigate("/")}>
          <img src="/images/logo.webp" alt="Save the Day" className="logo-image" />
        </div>

        {/* Desktop Navigation */}
        <ul className={`nav-links ${mobileMenuOpen ? 'mobile-open' : ''}`}>
          <li>
            <a
              href="/"
              onClick={(e) => {
                e.preventDefault();
                setMobileMenuOpen(false);
                navigate('/');
              }}
            >
              דף הבית
            </a>
          </li>
          <li>
            <a
              href="/pricing"
              onClick={(e) => {
                e.preventDefault();
                setMobileMenuOpen(false);
                navigate('/pricing');
              }}
            >
              מחירים וחבילות
            </a>
          </li>
          <li>
            <a
              href="/contact"
              onClick={(e) => {
                e.preventDefault();
                setMobileMenuOpen(false);
                navigate('/contact');
              }}
            >
              צור קשר
            </a>
          </li>
          {user && (
            <li>
              <a
                href="/dashboard"
                onClick={(e) => {
                  e.preventDefault();
                  setMobileMenuOpen(false);
                  navigate('/dashboard');
                }}
              >
                ניהול אישי
              </a>
            </li>
          )}
          <li>
            {user ? (
              <div className="user-menu">
                <span className="user-greeting">שלום, {user.full_name || user.email}</span>
                <button
                  onClick={() => {
                    logout();
                    setMobileMenuOpen(false);
                  }}
                  className="logout-btn"
                >
                  התנתק
                </button>
              </div>
            ) : (
              <a
                href="/login"
                onClick={(e) => {
                  e.preventDefault();
                  setMobileMenuOpen(false);
                  navigate('/login');
                }}
              >
                אזור אישי
              </a>
            )}
          </li>
        </ul>
      </div>
    </nav>
  );
}
