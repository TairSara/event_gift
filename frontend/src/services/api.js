// API Base URL
const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://event-gift.onrender.com/api';

// Auth API
export const authAPI = {
  // Register new user
  register: async (userData) => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: userData.email,
          password: userData.password,
          full_name: userData.fullName,
          phone: userData.phone
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        console.error('Registration failed:', {
          status: response.status,
          statusText: response.statusText,
          data: data,
          dataDetail: data.detail,
          dataDetailType: typeof data.detail,
          fullDataJSON: JSON.stringify(data)
        });
        // בדיקה אם data.detail הוא מחרוזת או אובייקט
        let errorMessage = 'שגיאה בהרשמה';

        if (typeof data.detail === 'string') {
          errorMessage = data.detail;
        } else if (Array.isArray(data.detail) && data.detail.length > 0) {
          // אם זה מערך של שגיאות (FastAPI validation errors)
          errorMessage = data.detail.map(err => err.msg || JSON.stringify(err)).join(', ');
        } else if (data.detail && typeof data.detail === 'object') {
          errorMessage = JSON.stringify(data.detail);
        } else if (data.message) {
          errorMessage = data.message;
        }

        throw new Error(errorMessage);
      }

      return data;
    } catch (error) {
      console.error('Registration error:', {
        message: error.message,
        error: error
      });
      // אם זו שגיאת רשת (network error) ולא שגיאה מהשרת
      if (error.message === 'Failed to fetch' || !error.message) {
        throw new Error('לא ניתן להתחבר לשרת. בדוק את חיבור האינטרנט');
      }
      throw error;
    }
  },

  // Login user
  login: async (email, password) => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        console.error('Login failed:', {
          status: response.status,
          statusText: response.statusText,
          data
        });
        // בדיקה אם data.detail הוא מחרוזת או אובייקט
        const errorMessage = typeof data.detail === 'string'
          ? data.detail
          : (data.message || 'שגיאה בהתחברות');
        throw new Error(errorMessage);
      }

      return data;
    } catch (error) {
      console.error('Login error:', {
        message: error.message,
        error: error
      });
      // אם זו שגיאת רשת (network error) ולא שגיאה מהשרת
      if (error.message === 'Failed to fetch' || !error.message) {
        throw new Error('לא ניתן להתחבר לשרת. בדוק את חיבור האינטרנט');
      }
      throw error;
    }
  },

  // Google OAuth - Get login URL
  getGoogleLoginUrl: async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/google/login`, {
        method: 'GET',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'שגיאה בהתחברות דרך Google');
      }

      return data.url;
    } catch (error) {
      console.error('Google login URL error:', error);
      throw error;
    }
  },

  // Google OAuth - Callback (exchange code for user data)
  googleCallback: async (code) => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/google/callback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'שגיאה בהתחברות דרך Google');
      }

      return data;
    } catch (error) {
      console.error('Google callback error:', error);
      throw error;
    }
  }
};

// Health check
export const checkAPIHealth = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/health`);
    return await response.json();
  } catch (error) {
    console.error('API Health check failed:', error);
    return { ok: false };
  }
};

// Guest Management API
export const guestAPI = {
  // Get all guests for an event
  getEventGuests: async (eventId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/packages/events/${eventId}/guests`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'שגיאה בטעינת המוזמנים');
      }

      return data.guests;
    } catch (error) {
      console.error('Get guests error:', error);
      throw error;
    }
  },

  // Add a single guest
  addGuest: async (eventId, guestData) => {
    try {
      const response = await fetch(`${API_BASE_URL}/packages/events/${eventId}/guests`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          event_id: eventId,
          ...guestData
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'שגיאה בהוספת המוזמן');
      }

      return data;
    } catch (error) {
      console.error('Add guest error:', error);
      throw error;
    }
  },

  // Update guest
  updateGuest: async (guestId, guestData) => {
    try {
      const response = await fetch(`${API_BASE_URL}/packages/guests/${guestId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(guestData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'שגיאה בעדכון המוזמן');
      }

      return data;
    } catch (error) {
      console.error('Update guest error:', error);
      throw error;
    }
  },

  // Delete guest
  deleteGuest: async (guestId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/packages/guests/${guestId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'שגיאה במחיקת המוזמן');
      }

      return data;
    } catch (error) {
      console.error('Delete guest error:', error);
      throw error;
    }
  },

  // Send WhatsApp invitation to guest
  sendWhatsAppInvitation: async (guestId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/whatsapp/send-template-invitation/${guestId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'שגיאה בשליחת ההזמנה');
      }

      return data;
    } catch (error) {
      console.error('Send WhatsApp invitation error:', error);
      throw error;
    }
  },

  // Send SMS invitation to guest
  sendSMSInvitation: async (guestId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/sms/send-invitation/${guestId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'שגיאה בשליחת SMS');
      }

      return data;
    } catch (error) {
      console.error('Send SMS invitation error:', error);
      throw error;
    }
  },

  // Send SMS invitations to all guests of an event
  sendBulkSMSInvitations: async (eventId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/sms/send-bulk-invitations/${eventId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'שגיאה בשליחת SMS המונית');
      }

      return data;
    } catch (error) {
      console.error('Send bulk SMS error:', error);
      throw error;
    }
  },

  // Upload Excel file with guests
  uploadExcel: async (eventId, file) => {
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`${API_BASE_URL}/packages/events/${eventId}/guests/upload-excel`, {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'שגיאה בהעלאת הקובץ');
      }

      return data;
    } catch (error) {
      console.error('Upload Excel error:', error);
      throw error;
    }
  },

  // Bulk add guests
  addGuestsBulk: async (eventId, guests) => {
    try {
      const response = await fetch(`${API_BASE_URL}/packages/events/${eventId}/guests/bulk`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          event_id: eventId,
          guests: guests
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'שגיאה בהוספת המוזמנים');
      }

      return data;
    } catch (error) {
      console.error('Add guests bulk error:', error);
      throw error;
    }
  }
};
