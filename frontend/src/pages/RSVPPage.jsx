import { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import axios from 'axios';

// Remove /api suffix if present in env var, we'll add the full path
const API_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:8000').replace(/\/api$/, '');

export default function RSVPPage() {
  const { guestId } = useParams();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [guest, setGuest] = useState(null);
  const [event, setEvent] = useState(null);
  const [error, setError] = useState('');
  const [response, setResponse] = useState(null);
  const [attendingCount, setAttendingCount] = useState(1);
  const [submitted, setSubmitted] = useState(false);

  // Load guest and event data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError('');

        const res = await axios.get(`${API_BASE}/api/rsvp/${guestId}?token=${token}`);

        setGuest(res.data.guest);
        setEvent(res.data.event);

        if (res.data.guest.attending_count > 0) {
          setAttendingCount(res.data.guest.attending_count);
        }

        if (res.data.guest.status === 'confirmed' || res.data.guest.status === 'declined') {
          setSubmitted(true);
          setResponse(res.data.guest.status === 'confirmed' ? 'confirmed' : 'declined');
        }

        setLoading(false);
      } catch (err) {
        console.error('Error loading RSVP:', err);
        setError(err.response?.data?.detail || 'שגיאה בטעינת פרטי ההזמנה');
        setLoading(false);
      }
    };

    if (guestId && token) {
      fetchData();
    } else {
      setError('קישור לא תקין');
      setLoading(false);
    }
  }, [guestId, token]);

  const handleSubmit = async (attending) => {
    try {
      setSubmitting(true);
      setError('');

      const payload = {
        status: attending ? 'confirmed' : 'declined',
        attending_count: attending ? attendingCount : 0
      };

      await axios.post(`${API_BASE}/api/rsvp/${guestId}?token=${token}`, payload);

      setResponse(attending ? 'confirmed' : 'declined');
      setSubmitted(true);
      setSubmitting(false);
    } catch (err) {
      console.error('Error submitting RSVP:', err);
      setError(err.response?.data?.detail || 'שגיאה בשמירת התשובה');
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="relative w-20 h-20 mx-auto mb-6">
            <div className="absolute inset-0 border-4 border-purple-200 rounded-full animate-pulse"></div>
            <div className="absolute inset-0 border-4 border-t-purple-600 rounded-full animate-spin"></div>
          </div>
          <p className="text-xl text-gray-700 font-medium">טוען את ההזמנה...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-pink-50 to-purple-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <div className="bg-white/90 backdrop-blur-xl rounded-3xl shadow-2xl p-8 text-center border border-white/20">
            <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-red-400 to-pink-500 rounded-full flex items-center justify-center">
              <span className="text-4xl">✕</span>
            </div>
            <h2 className="text-3xl font-bold bg-gradient-to-r from-red-600 to-pink-600 bg-clip-text text-transparent mb-4">
              אופס!
            </h2>
            <p className="text-gray-600 text-lg mb-8">{error}</p>
            <a
              href="/"
              className="inline-block bg-gradient-to-r from-purple-600 to-pink-600 text-white px-8 py-3 rounded-xl font-semibold hover:shadow-lg transform hover:scale-105 transition-all duration-300"
            >
              חזרה לדף הבית
            </a>
          </div>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-indigo-50 flex items-center justify-center p-4 overflow-hidden relative">
        {/* Animated background elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-10 w-72 h-72 bg-purple-300 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
          <div className="absolute top-40 right-10 w-72 h-72 bg-pink-300 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
          <div className="absolute -bottom-20 left-1/2 w-72 h-72 bg-indigo-300 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000"></div>
        </div>

        <div className="max-w-2xl w-full relative z-10">
          <div className="bg-white/80 backdrop-blur-2xl rounded-3xl shadow-2xl overflow-hidden border border-white/50">
            {response === 'confirmed' ? (
              <div className="p-12 text-center">
                {/* Success Animation */}
                <div className="relative w-32 h-32 mx-auto mb-8">
                  <div className="absolute inset-0 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full animate-ping opacity-20"></div>
                  <div className="relative w-32 h-32 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center shadow-xl">
                    <span className="text-6xl">✓</span>
                  </div>
                </div>

                <h2 className="text-5xl font-bold bg-gradient-to-r from-purple-600 via-pink-600 to-indigo-600 bg-clip-text text-transparent mb-4 animate-fade-in">
                  תודה רבה!
                </h2>

                <div className="space-y-4 mb-8">
                  <p className="text-xl text-gray-600">התשובה שלכם התקבלה בהצלחה</p>

                  <div className="inline-block bg-gradient-to-r from-purple-100 to-pink-100 px-8 py-4 rounded-2xl">
                    <p className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                      {attendingCount} {attendingCount === 1 ? 'מגיע' : 'מגיעים'}
                    </p>
                  </div>
                </div>

                {/* Event Details Card */}
                <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-8 mb-8 border border-purple-100">
                  <h3 className="text-2xl font-bold text-gray-800 mb-6">פרטי האירוע</h3>

                  <div className="space-y-4 text-right">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-purple-400 to-pink-400 rounded-xl flex items-center justify-center flex-shrink-0">
                        <span className="text-2xl">🎊</span>
                      </div>
                      <div className="flex-1">
                        <p className="text-sm text-gray-500 font-medium">שם האירוע</p>
                        <p className="text-lg font-semibold text-gray-800">{event?.event_name}</p>
                      </div>
                    </div>

                    {event?.event_date && (
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-indigo-400 rounded-xl flex items-center justify-center flex-shrink-0">
                          <span className="text-2xl">📅</span>
                        </div>
                        <div className="flex-1">
                          <p className="text-sm text-gray-500 font-medium">תאריך</p>
                          <p className="text-lg font-semibold text-gray-800">
                            {new Date(event.event_date).toLocaleDateString('he-IL', {
                              weekday: 'long',
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric'
                            })}
                          </p>
                        </div>
                      </div>
                    )}

                    {event?.event_time && (
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-orange-400 to-red-400 rounded-xl flex items-center justify-center flex-shrink-0">
                          <span className="text-2xl">🕐</span>
                        </div>
                        <div className="flex-1">
                          <p className="text-sm text-gray-500 font-medium">שעה</p>
                          <p className="text-lg font-semibold text-gray-800">{event.event_time}</p>
                        </div>
                      </div>
                    )}

                    {event?.event_location && (
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-teal-400 rounded-xl flex items-center justify-center flex-shrink-0">
                          <span className="text-2xl">📍</span>
                        </div>
                        <div className="flex-1">
                          <p className="text-sm text-gray-500 font-medium">מיקום</p>
                          <p className="text-lg font-semibold text-gray-800">{event.event_location}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <p className="text-2xl mb-8">נשמח לראותכם! 💝</p>

                <button
                  onClick={() => window.close()}
                  className="bg-gradient-to-r from-gray-100 to-gray-200 text-gray-700 px-10 py-4 rounded-xl font-semibold hover:shadow-lg transform hover:scale-105 transition-all duration-300 border border-gray-300"
                >
                  סגירה
                </button>
              </div>
            ) : (
              <div className="p-12 text-center">
                <div className="w-32 h-32 mx-auto mb-8 bg-gradient-to-br from-purple-400 to-pink-400 rounded-full flex items-center justify-center shadow-xl">
                  <span className="text-6xl">💐</span>
                </div>

                <h2 className="text-5xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-4">
                  תודה על העדכון
                </h2>

                <p className="text-xl text-gray-600 mb-8">
                  נשמח לראותכם בהזדמנות אחרת!
                </p>

                <button
                  onClick={() => window.close()}
                  className="bg-gradient-to-r from-gray-100 to-gray-200 text-gray-700 px-10 py-4 rounded-xl font-semibold hover:shadow-lg transform hover:scale-105 transition-all duration-300 border border-gray-300"
                >
                  סגירה
                </button>
              </div>
            )}
          </div>
        </div>

        <style jsx>{`
          @keyframes blob {
            0%, 100% { transform: translate(0, 0) scale(1); }
            33% { transform: translate(30px, -50px) scale(1.1); }
            66% { transform: translate(-20px, 20px) scale(0.9); }
          }
          .animate-blob {
            animation: blob 7s infinite;
          }
          .animation-delay-2000 {
            animation-delay: 2s;
          }
          .animation-delay-4000 {
            animation-delay: 4s;
          }
          @keyframes fade-in {
            from { opacity: 0; transform: translateY(-20px); }
            to { opacity: 1; transform: translateY(0); }
          }
          .animate-fade-in {
            animation: fade-in 0.6s ease-out;
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-indigo-50 flex items-center justify-center p-4 relative overflow-hidden" dir="rtl">
      {/* Animated background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-96 h-96 bg-purple-300 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
        <div className="absolute top-40 right-10 w-96 h-96 bg-pink-300 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-20 left-1/2 w-96 h-96 bg-indigo-300 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000"></div>
      </div>

      <div className="max-w-3xl w-full relative z-10">
        <div className="bg-white/80 backdrop-blur-2xl rounded-3xl shadow-2xl overflow-hidden border border-white/50">
          {/* Header with gradient */}
          <div className="relative bg-gradient-to-r from-purple-600 via-pink-600 to-indigo-600 p-12 text-white text-center overflow-hidden">
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48cGF0dGVybiBpZD0iYSIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSIgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBwYXR0ZXJuVHJhbnNmb3JtPSJyb3RhdGUoNDUpIj48cGF0aCBkPSJNLTEwIDMwaDYwdjJoLTYweiIgZmlsbD0iI2ZmZiIgZmlsbC1vcGFjaXR5PSIuMDUiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjYSkiLz48L3N2Zz4=')] opacity-30"></div>
            <div className="relative">
              <div className="text-6xl mb-4 animate-bounce">💌</div>
              <h1 className="text-5xl font-bold mb-3 drop-shadow-lg">הנכם מוזמנים!</h1>
              <p className="text-2xl opacity-95 font-light">שלום {guest?.name || 'אורח יקר'},</p>
            </div>
          </div>

          {/* Content */}
          <div className="p-10">
            {/* Event name */}
            <div className="text-center mb-10">
              <h2 className="text-4xl font-bold bg-gradient-to-r from-purple-600 via-pink-600 to-indigo-600 bg-clip-text text-transparent mb-8">
                {event?.event_name}
              </h2>

              {/* Event details grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                {event?.event_date && (
                  <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-100 transform hover:scale-105 transition-transform duration-300">
                    <div className="text-4xl mb-3">📅</div>
                    <p className="text-sm text-gray-500 font-medium mb-1">תאריך</p>
                    <p className="text-lg font-bold text-gray-800">
                      {new Date(event.event_date).toLocaleDateString('he-IL', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric'
                      })}
                    </p>
                  </div>
                )}

                {event?.event_time && (
                  <div className="bg-gradient-to-br from-orange-50 to-red-50 rounded-2xl p-6 border border-orange-100 transform hover:scale-105 transition-transform duration-300">
                    <div className="text-4xl mb-3">🕐</div>
                    <p className="text-sm text-gray-500 font-medium mb-1">שעה</p>
                    <p className="text-lg font-bold text-gray-800">{event.event_time}</p>
                  </div>
                )}

                {event?.event_location && (
                  <div className="bg-gradient-to-br from-green-50 to-teal-50 rounded-2xl p-6 border border-green-100 transform hover:scale-105 transition-transform duration-300">
                    <div className="text-4xl mb-3">📍</div>
                    <p className="text-sm text-gray-500 font-medium mb-1">מיקום</p>
                    <p className="text-lg font-bold text-gray-800">{event.event_location}</p>
                  </div>
                )}
              </div>
            </div>

            {/* RSVP Section */}
            <div className="space-y-6">
              <h3 className="text-3xl font-bold text-center text-gray-800 mb-8">
                נשמח לדעת אם תגיעו
              </h3>

              {response === null && (
                <div className="grid grid-cols-2 gap-6">
                  <button
                    onClick={() => setResponse('confirmed')}
                    className="group relative bg-gradient-to-br from-green-400 to-emerald-500 hover:from-green-500 hover:to-emerald-600 text-white font-bold py-8 px-6 rounded-2xl transition-all duration-300 transform hover:scale-105 hover:shadow-2xl disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden"
                    disabled={submitting}
                  >
                    <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-20 transition-opacity duration-300"></div>
                    <div className="relative">
                      <div className="text-5xl mb-3">✅</div>
                      <div className="text-xl">כן, נגיע!</div>
                    </div>
                  </button>

                  <button
                    onClick={() => setResponse('declined')}
                    className="group relative bg-gradient-to-br from-red-400 to-pink-500 hover:from-red-500 hover:to-pink-600 text-white font-bold py-8 px-6 rounded-2xl transition-all duration-300 transform hover:scale-105 hover:shadow-2xl disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden"
                    disabled={submitting}
                  >
                    <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-20 transition-opacity duration-300"></div>
                    <div className="relative">
                      <div className="text-5xl mb-3">❌</div>
                      <div className="text-xl">לא נוכל להגיע</div>
                    </div>
                  </button>
                </div>
              )}

              {response === 'confirmed' && (
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-8 space-y-6 border-2 border-green-200 animate-fade-in">
                  <label className="block text-center">
                    <span className="text-2xl font-bold text-gray-800 mb-6 block">כמה תגיעו?</span>

                    <div className="flex items-center justify-center gap-6 mb-8">
                      <button
                        onClick={() => setAttendingCount(Math.max(1, attendingCount - 1))}
                        className="w-16 h-16 bg-white border-2 border-green-300 text-green-600 rounded-full font-bold text-2xl hover:bg-green-50 hover:border-green-400 transition-all duration-300 transform hover:scale-110 active:scale-95 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={submitting || attendingCount <= 1}
                      >
                        -
                      </button>

                      <div className="bg-white border-2 border-green-300 rounded-2xl px-12 py-6 shadow-lg">
                        <div className="text-5xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                          {attendingCount}
                        </div>
                      </div>

                      <button
                        onClick={() => setAttendingCount(attendingCount + 1)}
                        className="w-16 h-16 bg-white border-2 border-green-300 text-green-600 rounded-full font-bold text-2xl hover:bg-green-50 hover:border-green-400 transition-all duration-300 transform hover:scale-110 active:scale-95 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={submitting}
                      >
                        +
                      </button>
                    </div>
                  </label>

                  <button
                    onClick={() => handleSubmit(true)}
                    disabled={submitting}
                    className="w-full bg-gradient-to-r from-purple-600 via-pink-600 to-indigo-600 hover:from-purple-700 hover:via-pink-700 hover:to-indigo-700 text-white font-bold py-5 px-6 rounded-2xl transition-all duration-300 transform hover:scale-105 hover:shadow-2xl disabled:opacity-50 disabled:cursor-not-allowed text-xl"
                  >
                    {submitting ? (
                      <span className="flex items-center justify-center gap-3">
                        <div className="w-6 h-6 border-3 border-white border-t-transparent rounded-full animate-spin"></div>
                        שומר...
                      </span>
                    ) : (
                      'אישור הגעה'
                    )}
                  </button>

                  <button
                    onClick={() => setResponse(null)}
                    disabled={submitting}
                    className="w-full bg-white text-gray-700 font-semibold py-4 px-6 rounded-2xl hover:bg-gray-50 transition-all duration-300 border-2 border-gray-200"
                  >
                    חזרה
                  </button>
                </div>
              )}

              {response === 'declined' && (
                <div className="bg-gradient-to-br from-red-50 to-pink-50 rounded-2xl p-8 space-y-6 border-2 border-red-200 animate-fade-in">
                  <p className="text-center text-xl text-gray-700 mb-6">
                    אנחנו מבינים, נשמח לראותכם בהזדמנות אחרת 💝
                  </p>

                  <button
                    onClick={() => handleSubmit(false)}
                    disabled={submitting}
                    className="w-full bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700 text-white font-bold py-5 px-6 rounded-2xl transition-all duration-300 transform hover:scale-105 hover:shadow-2xl disabled:opacity-50 disabled:cursor-not-allowed text-xl"
                  >
                    {submitting ? (
                      <span className="flex items-center justify-center gap-3">
                        <div className="w-6 h-6 border-3 border-white border-t-transparent rounded-full animate-spin"></div>
                        שומר...
                      </span>
                    ) : (
                      'אישור'
                    )}
                  </button>

                  <button
                    onClick={() => setResponse(null)}
                    disabled={submitting}
                    className="w-full bg-white text-gray-700 font-semibold py-4 px-6 rounded-2xl hover:bg-gray-50 transition-all duration-300 border-2 border-gray-200"
                  >
                    חזרה
                  </button>
                </div>
              )}
            </div>

            {error && (
              <div className="mt-6 bg-red-50 border-2 border-red-200 rounded-2xl p-4 text-red-700 text-center animate-fade-in">
                {error}
              </div>
            )}
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes blob {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(-20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fade-in 0.6s ease-out;
        }
      `}</style>
    </div>
  );
}
