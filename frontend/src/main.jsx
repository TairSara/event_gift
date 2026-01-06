import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import './index.css'
import App from './App.jsx'
import TemplateSelection from './pages/TemplateSelection.jsx'
import InvitationEditor from './pages/InvitationEditor.jsx'
import Pricing from './pages/Pricing.jsx'
import Dashboard from './pages/Dashboard.jsx'
import EventPage from './pages/EventPage.jsx'
import Registert from './pages/Registert.jsx'
import Contact from './pages/Contact.jsx'
import ForgotPassword from './pages/ForgotPassword.jsx'
import VerifyCode from './pages/VerifyCode.jsx'
import ResetPassword from './pages/ResetPassword.jsx'
import VerifyEmail from './pages/VerifyEmail.jsx'
import LoginSuccess from './pages/LoginSuccess.jsx'
import ProtectedAuthRoute from './components/ProtectedAuthRoute.jsx'
import ProtectedAdminRoute from './components/ProtectedAdminRoute.jsx'
import AdminLogin from './pages/AdminLogin.jsx'
import AdminDashboard from './pages/AdminDashboard.jsx'
import AdminUsers from './pages/AdminUsers.jsx'
import AdminEvents from './pages/AdminEvents.jsx'
import AdminPackages from './pages/AdminPackages.jsx'
import AdminContacts from './pages/AdminContacts.jsx'
import RSVPPage from './pages/RSVPPage.jsx'
import PaymentSuccess from './pages/PaymentSuccess.jsx'
import PaymentFailure from './pages/PaymentFailure.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<App />} />
          <Route path="/pricing" element={<Pricing />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/event/:eventId" element={<EventPage />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/register" element={<ProtectedAuthRoute><Registert /></ProtectedAuthRoute>} />
          <Route path="/login" element={<ProtectedAuthRoute><Registert /></ProtectedAuthRoute>} />
          <Route path="/forgot-password" element={<ProtectedAuthRoute><ForgotPassword /></ProtectedAuthRoute>} />
          <Route path="/verify-code" element={<ProtectedAuthRoute><VerifyCode /></ProtectedAuthRoute>} />
          <Route path="/reset-password" element={<ProtectedAuthRoute><ResetPassword /></ProtectedAuthRoute>} />
          <Route path="/verify-email" element={<ProtectedAuthRoute><VerifyEmail /></ProtectedAuthRoute>} />
          <Route path="/login-success" element={<LoginSuccess />} />
          <Route path="/create-invitation/:eventType" element={<TemplateSelection />} />
          <Route path="/create-invitation/:eventType/editor" element={<InvitationEditor />} />

          {/* RSVP Page - Public route for guests */}
          <Route path="/rsvp/:guestId" element={<RSVPPage />} />

          {/* Payment Result Pages */}
          <Route path="/payment/success" element={<PaymentSuccess />} />
          <Route path="/payment/failure" element={<PaymentFailure />} />

          {/* Admin Routes */}
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin/dashboard" element={<ProtectedAdminRoute><AdminDashboard /></ProtectedAdminRoute>} />
          <Route path="/admin/users" element={<ProtectedAdminRoute><AdminUsers /></ProtectedAdminRoute>} />
          <Route path="/admin/events" element={<ProtectedAdminRoute><AdminEvents /></ProtectedAdminRoute>} />
          <Route path="/admin/packages" element={<ProtectedAdminRoute><AdminPackages /></ProtectedAdminRoute>} />
          <Route path="/admin/contacts" element={<ProtectedAdminRoute><AdminContacts /></ProtectedAdminRoute>} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  </StrictMode>,
)
