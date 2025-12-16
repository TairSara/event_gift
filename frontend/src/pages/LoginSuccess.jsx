import { useEffect, useState, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { authAPI } from "../services/api";
import Navbar from "../components/Navbar";
import "./LoginSuccess.css";

export default function LoginSuccess() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login: authLogin } = useAuth();
  const [status, setStatus] = useState("loading"); // loading, success, error
  const [message, setMessage] = useState("");
  const [isNewUser, setIsNewUser] = useState(false);
  const hasRun = useRef(false); // Prevent double execution

  useEffect(() => {
    const handleGoogleCallback = async () => {
      // Prevent double execution (React StrictMode runs effects twice)
      if (hasRun.current) return;
      hasRun.current = true;

      try {
        // Get user data from URL parameters (sent from backend)
        const userId = searchParams.get("userId");
        const email = searchParams.get("email");
        const fullName = searchParams.get("fullName");
        const isNew = searchParams.get("isNewUser") === "true";

        if (!userId || !email) {
          setStatus("error");
          setMessage("לא התקבלו פרטי משתמש מהשרת");
          setTimeout(() => navigate("/login"), 3000);
          return;
        }

        // Build user data object
        const userData = {
          id: parseInt(userId),
          email: email,
          full_name: fullName || email,
          is_new_user: isNew
        };

        // Check if this is a new user
        setIsNewUser(isNew);

        // Log the user in (save to context/localStorage)
        authLogin(userData, true); // Remember the user

        setStatus("success");
        setMessage(
          isNew
            ? `ברוך הבא ${fullName || email}! החשבון שלך נוצר בהצלחה`
            : `שלום ${fullName || email}! התחברת בהצלחה`
        );

        // Redirect to home page after 2 seconds
        setTimeout(() => navigate("/"), 2000);
      } catch (error) {
        console.error("Google callback error:", error);
        setStatus("error");
        setMessage(error.message || "שגיאה בהתחברות דרך Google");
        setTimeout(() => navigate("/login"), 3000);
      }
    };

    handleGoogleCallback();
  }, [searchParams, authLogin, navigate]);

  return (
    <div className="login-success-page">
      {/* Confetti Background */}
      <div className="success-confetti-container">
        {status === "success" &&
          Array.from({ length: 50 }).map((_, i) => (
            <div
              key={i}
              className="success-confetti"
              style={{
                left: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 3}s`,
                animationDuration: `${3 + Math.random() * 2}s`,
                backgroundColor: [
                  "#6B5638",
                  "#8B6F47",
                  "#C9A887",
                  "#4ECDC4",
                  "#FFFFFF",
                  "#F5F5F5",
                ][Math.floor(Math.random() * 6)],
              }}
            />
          ))}
      </div>

      <Navbar />

      <div className="login-success-container">
        <div className="login-success-card">
          {status === "loading" && (
            <>
              <div className="loading-spinner">
                <i className="fas fa-spinner fa-spin"></i>
              </div>
              <h1>מתחבר...</h1>
              <p>אנא המתן בזמן שאנו מעבדים את הבקשה שלך</p>
            </>
          )}

          {status === "success" && (
            <>
              <div className="success-icon">
                <i className="fas fa-check-circle"></i>
              </div>
              <h1>{isNewUser ? "ברוך הבא!" : "שלום שוב!"}</h1>
              <p className="success-message">{message}</p>
              <p className="redirect-message">מעביר אותך לדף הבית...</p>
            </>
          )}

          {status === "error" && (
            <>
              <div className="error-icon">
                <i className="fas fa-exclamation-circle"></i>
              </div>
              <h1>אופס! משהו השתבש</h1>
              <p className="error-message">{message}</p>
              <p className="redirect-message">מעביר אותך לדף התחברות...</p>
            </>
          )}
        </div>
      </div>

      <footer className="login-success-footer">
        <p>&copy; 2025 Save the Day. כל הזכויות שמורות.</p>
      </footer>
    </div>
  );
}
