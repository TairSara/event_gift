import { createContext, useState, useContext, useEffect } from 'react';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // בדיקה אם יש משתמש שמור ב-localStorage או sessionStorage
    const savedUser = localStorage.getItem('user') || sessionStorage.getItem('user');
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (error) {
        console.error('Error parsing saved user:', error);
        localStorage.removeItem('user');
        sessionStorage.removeItem('user');
      }
    }
    setLoading(false);
  }, []);

  const login = (userData, rememberMe = false) => {
    setUser(userData);
    // אם rememberMe מסומן - שמור ב-localStorage, אחרת ב-sessionStorage
    if (rememberMe) {
      localStorage.setItem('user', JSON.stringify(userData));
      sessionStorage.removeItem('user'); // ניקוי sessionStorage
    } else {
      sessionStorage.setItem('user', JSON.stringify(userData));
      localStorage.removeItem('user'); // ניקוי localStorage
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('user');
    sessionStorage.removeItem('user');
  };

  const value = {
    user,
    login,
    logout,
    isAuthenticated: !!user,
    loading
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
