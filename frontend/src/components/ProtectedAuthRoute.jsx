import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

/**
 * Protected Route for auth pages (login/register)
 * Redirects to home if user is already logged in
 */
export default function ProtectedAuthRoute({ children }) {
  const { user } = useAuth();

  // If user is logged in, redirect to home
  if (user) {
    return <Navigate to="/" replace />;
  }

  // Otherwise, show the auth page (login/register)
  return children;
}
