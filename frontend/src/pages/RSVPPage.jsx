import { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export default function RSVPPage() {
  const { guestId } = useParams();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [guest, setGuest] = useState(null);
  const [event, setEvent] = useState(null);
  const [error, setError] = useState('');
  const [response, setResponse] = useState(null); // 'confirmed' or 'declined'
  const [attendingCount, setAttendingCount] = useState(1);
  const [submitted, setSubmitted] = useState(false);

  // Load guest and event data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError('');

        // Fetch guest details with token verification
        const res = await axios.get(`${API_BASE}/api/rsvp/${guestId}?token=${token}`);

        setGuest(res.data.guest);
        setEvent(res.data.event);

        // Set default attending count if guest already has one
        if (res.data.guest.attending_count > 0) {
          setAttendingCount(res.data.guest.attending_count);
        }

        // Check if already responded
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
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">טוען את פרטי ההזמנה...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
          <div className="text-6xl mb-4">❌</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-4">שגיאה</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <a
            href="/"
            className="inline-block bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 transition"
          >
            חזרה לדף הבית
          </a>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
          {response === 'confirmed' ? (
            <>
              <div className="text-6xl mb-4">🎉</div>
              <h2 className="text-3xl font-bold text-gray-800 mb-4">תודה רבה!</h2>
              <p className="text-gray-600 mb-2">התשובה שלכם התקבלה בהצלחה</p>
              <p className="text-xl font-semibold text-purple-600 mb-6">
                רשמנו {attendingCount} {attendingCount === 1 ? 'מגיע' : 'מגיעים'}
              </p>
              <div className="bg-purple-50 rounded-lg p-4 mb-6">
                <p className="text-sm text-gray-700">
                  <strong>אירוע:</strong> {event?.event_name}
                </p>
                {event?.event_date && (
                  <p className="text-sm text-gray-700">
                    <strong>תאריך:</strong> {new Date(event.event_date).toLocaleDateString('he-IL')}
                  </p>
                )}
                {event?.event_time && (
                  <p className="text-sm text-gray-700">
                    <strong>שעה:</strong> {event.event_time}
                  </p>
                )}
                {event?.event_location && (
                  <p className="text-sm text-gray-700">
                    <strong>מיקום:</strong> {event.event_location}
                  </p>
                )}
              </div>
              <p className="text-gray-600 mb-6">נשמח לראותכם! 💝</p>
            </>
          ) : (
            <>
              <div className="text-6xl mb-4">💐</div>
              <h2 className="text-3xl font-bold text-gray-800 mb-4">תודה על העדכון</h2>
              <p className="text-gray-600 mb-6">נשמח לראותכם בהזדמנות אחרת!</p>
            </>
          )}
          <a
            href="/"
            className="inline-block bg-gray-200 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-300 transition"
          >
            סגירה
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 flex items-center justify-center p-4" dir="rtl">
      <div className="max-w-2xl w-full bg-white rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-pink-600 p-8 text-white text-center">
          <h1 className="text-4xl font-bold mb-2">🎊 הנכם מוזמנים! 🎊</h1>
          <p className="text-xl opacity-90">שלום {guest?.name || 'אורח יקר'},</p>
        </div>

        {/* Event Details */}
        <div className="p-8">
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-gray-800 mb-6 text-center">
              {event?.event_name}
            </h2>

            <div className="space-y-4 bg-purple-50 rounded-lg p-6">
              {event?.event_date && (
                <div className="flex items-center text-gray-700">
                  <span className="text-2xl ml-3">📅</span>
                  <div>
                    <p className="font-semibold">תאריך:</p>
                    <p>{new Date(event.event_date).toLocaleDateString('he-IL', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}</p>
                  </div>
                </div>
              )}

              {event?.event_time && (
                <div className="flex items-center text-gray-700">
                  <span className="text-2xl ml-3">🕐</span>
                  <div>
                    <p className="font-semibold">שעה:</p>
                    <p>{event.event_time}</p>
                  </div>
                </div>
              )}

              {event?.event_location && (
                <div className="flex items-center text-gray-700">
                  <span className="text-2xl ml-3">📍</span>
                  <div>
                    <p className="font-semibold">מיקום:</p>
                    <p>{event.event_location}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* RSVP Form */}
          <div className="space-y-6">
            <h3 className="text-2xl font-bold text-gray-800 text-center mb-4">
              נשמח לדעת אם תגיעו
            </h3>

            {response === null && (
              <>
                {/* Coming or Not */}
                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => setResponse('confirmed')}
                    className="bg-green-500 hover:bg-green-600 text-white font-bold py-4 px-6 rounded-xl transition transform hover:scale-105 shadow-lg"
                    disabled={submitting}
                  >
                    <div className="text-3xl mb-2">✅</div>
                    <div>כן, נגיע!</div>
                  </button>

                  <button
                    onClick={() => setResponse('declined')}
                    className="bg-red-500 hover:bg-red-600 text-white font-bold py-4 px-6 rounded-xl transition transform hover:scale-105 shadow-lg"
                    disabled={submitting}
                  >
                    <div className="text-3xl mb-2">❌</div>
                    <div>לא נוכל להגיע</div>
                  </button>
                </div>
              </>
            )}

            {/* If confirmed, ask for number */}
            {response === 'confirmed' && (
              <div className="bg-green-50 rounded-xl p-6 space-y-4">
                <label className="block text-gray-700 font-semibold text-lg text-center">
                  כמה תגיעו?
                </label>
                <div className="flex items-center justify-center gap-4">
                  <button
                    onClick={() => setAttendingCount(Math.max(1, attendingCount - 1))}
                    className="bg-white border-2 border-purple-300 text-purple-600 w-12 h-12 rounded-full font-bold text-xl hover:bg-purple-50 transition"
                    disabled={submitting || attendingCount <= 1}
                  >
                    -
                  </button>

                  <div className="bg-white border-2 border-purple-300 rounded-lg px-8 py-3 text-2xl font-bold text-gray-800 min-w-[100px] text-center">
                    {attendingCount}
                  </div>

                  <button
                    onClick={() => setAttendingCount(attendingCount + 1)}
                    className="bg-white border-2 border-purple-300 text-purple-600 w-12 h-12 rounded-full font-bold text-xl hover:bg-purple-50 transition"
                    disabled={submitting}
                  >
                    +
                  </button>
                </div>

                <button
                  onClick={() => handleSubmit(true)}
                  disabled={submitting}
                  className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold py-4 px-6 rounded-xl hover:from-purple-700 hover:to-pink-700 transition transform hover:scale-105 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? 'שומר...' : 'אישור הגעה'}
                </button>

                <button
                  onClick={() => setResponse(null)}
                  disabled={submitting}
                  className="w-full bg-gray-200 text-gray-700 font-semibold py-3 px-6 rounded-xl hover:bg-gray-300 transition"
                >
                  חזרה
                </button>
              </div>
            )}

            {/* If declined, confirm */}
            {response === 'declined' && (
              <div className="bg-red-50 rounded-xl p-6 space-y-4">
                <p className="text-center text-gray-700 mb-4">
                  אנחנו מבינים, נשמח לראותכם בהזדמנות אחרת 💝
                </p>

                <button
                  onClick={() => handleSubmit(false)}
                  disabled={submitting}
                  className="w-full bg-red-500 hover:bg-red-600 text-white font-bold py-4 px-6 rounded-xl transition transform hover:scale-105 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? 'שומר...' : 'אישור'}
                </button>

                <button
                  onClick={() => setResponse(null)}
                  disabled={submitting}
                  className="w-full bg-gray-200 text-gray-700 font-semibold py-3 px-6 rounded-xl hover:bg-gray-300 transition"
                >
                  חזרה
                </button>
              </div>
            )}
          </div>

          {error && (
            <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-center">
              {error}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
