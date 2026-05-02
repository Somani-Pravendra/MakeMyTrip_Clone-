import React, { Suspense } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { BookingProvider } from "./contexts/BookingContext";
import { ToastProvider } from "./contexts/ToastContext";
import { useAuth } from "./contexts/AuthContext";
import { lazyWithRetry } from "./utils/lazyWithRetry";
import { getSavedAuthRedirect } from "./utils/authRedirect";

/* Components */
import AdminRoute from "./components/AdminRoute";
import UserRoute from "./components/UserRoute";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import ChatbotWidget from "./components/Chatbot/ChatbotWidget";
import ScrollButtons from "./components/ScrollButtons";

import "./App.css";
import "./theme.css";
import "./styles/userCompactOverrides.css";

/* Lazy Pages */
const Home = lazyWithRetry(() => import("./pages/Home/Home"), "mmt:lazy-home");
const AboutUs = lazyWithRetry(() => import("./pages/Info/AboutUs/AboutUs"), "mmt:lazy-about");
const ContactUs = lazyWithRetry(() => import("./pages/Info/ContactUs/ContactUs"), "mmt:lazy-contact");
const FAQ = lazyWithRetry(() => import("./pages/Info/FAQ/FAQ"), "mmt:lazy-faq");
const Offers = lazyWithRetry(() => import("./pages/Offers/Offers"), "mmt:lazy-offers");

const HolidayPackages = lazyWithRetry(() => import("./pages/Packages/HolidayPackages"), "mmt:lazy-packages");
const PackageDetail = lazyWithRetry(() => import("./pages/Packages/PackageDetail/PackageDetail"), "mmt:lazy-package-detail");
const Hotels = lazyWithRetry(() => import("./pages/Hotels/Hotels"), "mmt:lazy-hotels");
const Trains = lazyWithRetry(() => import("./pages/Trains/Trains"), "mmt:lazy-trains");
const Cabs = lazyWithRetry(() => import("./pages/Cabs/Cabs"), "mmt:lazy-cabs");
const Bus = lazyWithRetry(() => import("./pages/Bus/Bus"), "mmt:lazy-bus");
const Flights = lazyWithRetry(() => import("./pages/Flights/Flights"), "mmt:lazy-flights");

const Booking = lazyWithRetry(() => import("./pages/Booking/Booking"), "mmt:lazy-booking");
const PackageBooking = lazyWithRetry(() => import("./pages/Packages/BookingFlow/PackageBooking"), "mmt:lazy-package-booking");
const BookingSuccess = lazyWithRetry(() => import("./pages/Checkout/BookingSuccess"), "mmt:lazy-booking-success");

const Login = lazyWithRetry(() => import("./pages/Auth/Login"), "mmt:lazy-login");
const Signup = lazyWithRetry(() => import("./pages/Auth/Signup"), "mmt:lazy-signup");
const ForgotPassword = lazyWithRetry(() => import("./pages/Auth/ForgotPassword"), "mmt:lazy-forgot-password");
const VerifyOTP = lazyWithRetry(() => import("./pages/Auth/VerifyOTP"), "mmt:lazy-verify-otp");
const ResetPassword = lazyWithRetry(() => import("./pages/Auth/ResetPassword"), "mmt:lazy-reset-password");
const GoogleCallback = lazyWithRetry(() => import("./pages/Auth/GoogleCallback"), "mmt:lazy-google-callback");

const Profile = lazyWithRetry(() => import("./pages/User/Profile"), "mmt:lazy-profile");
const Wallet = lazyWithRetry(() => import("./pages/User/Wallet"), "mmt:lazy-wallet");

const AdminDashboard = lazyWithRetry(() => import("./pages/Admin/AdminDashboard"), "mmt:lazy-admin-dashboard");
const AdminOverview = lazyWithRetry(() => import("./pages/Admin/AdminOverview"), "mmt:lazy-admin-overview");
const AdminFlights = lazyWithRetry(() => import("./pages/Admin/AdminFlights"), "mmt:lazy-admin-flights");
const AdminHotels = lazyWithRetry(() => import("./pages/Admin/AdminHotels"), "mmt:lazy-admin-hotels");
const AdminTrains = lazyWithRetry(() => import("./pages/Admin/AdminTrains"), "mmt:lazy-admin-trains");
const AdminBuses = lazyWithRetry(() => import("./pages/Admin/AdminBuses"), "mmt:lazy-admin-buses");
const AdminCabs = lazyWithRetry(() => import("./pages/Admin/AdminCabs"), "mmt:lazy-admin-cabs");
const AdminPackages = lazyWithRetry(() => import("./pages/Admin/AdminPackages"), "mmt:lazy-admin-packages");
const AdminBookings = lazyWithRetry(() => import("./pages/Admin/AdminBookings"), "mmt:lazy-admin-bookings");
const AdminOffers = lazyWithRetry(() => import("./pages/Admin/AdminOffers"), "mmt:lazy-admin-offers");
const AdminFeedback = lazyWithRetry(() => import("./pages/Admin/AdminFeedback"), "mmt:lazy-admin-feedback");
const AdminUsers = lazyWithRetry(() => import("./pages/Admin/AdminUsers"), "mmt:lazy-admin-users");

const RouteLoader = () => (
  <div className="loading-state">
    <div className="loading-spinner-mmt"></div>
  </div>
);

const GuestOnlyRoute = ({ children }) => {
  const { isAuthenticated, user } = useAuth();

  if (!isAuthenticated || !user) {
    return children;
  }

  if (user.isAdmin) {
    return <Navigate to="/admin/dashboard" replace />;
  }

  const redirect = getSavedAuthRedirect();
  if (redirect?.to) {
    return <Navigate to={redirect.to} replace state={redirect.state} />;
  }

  return <Navigate to="/" replace />;
};

/* MAIN APP */
function App() {
  return (
    <AuthProvider>
      <BookingProvider>
        <ToastProvider>
          <Router>
            <AppContent />
          </Router>
        </ToastProvider>
      </BookingProvider>
    </AuthProvider>
  );
}

/* ROUTES */
function AppContent() {
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith("/admin");
  const shouldHideChrome = isAdminRoute;

  return (
    <>
      {!shouldHideChrome && <Navbar />}

      <Suspense fallback={<RouteLoader />}>
        <Routes>
          {/* ================= ADMIN ================= */}
          <Route
            path="/admin"
            element={
              <AdminRoute>
                <AdminDashboard />
              </AdminRoute>
            }
          >
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<AdminOverview />} />
            <Route path="users" element={<AdminUsers />} />
            <Route path="flights" element={<AdminFlights />} />
            <Route path="hotels" element={<AdminHotels />} />
            <Route path="trains" element={<AdminTrains />} />
            <Route path="bus" element={<AdminBuses />} />
            <Route path="cabs" element={<AdminCabs />} />
            <Route path="packages" element={<AdminPackages />} />
            <Route path="bookings" element={<AdminBookings />} />
            <Route path="offers" element={<AdminOffers />} />
            <Route path="feedback" element={<AdminFeedback />} />
          </Route>

          {/* ================= PUBLIC ================= */}
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<AboutUs />} />
          <Route path="/contact" element={<ContactUs />} />
          <Route path="/faq" element={<FAQ />} />
          <Route path="/offers" element={<Offers />} />

          {/* ================= AUTH ================= */}
          <Route path="/login" element={<GuestOnlyRoute><Login /></GuestOnlyRoute>} />
          <Route path="/signup" element={<GuestOnlyRoute><Signup /></GuestOnlyRoute>} />
          <Route path="/forgot-password" element={<GuestOnlyRoute><ForgotPassword /></GuestOnlyRoute>} />
          <Route path="/verify-otp" element={<GuestOnlyRoute><VerifyOTP /></GuestOnlyRoute>} />
          <Route path="/reset-password" element={<GuestOnlyRoute><ResetPassword /></GuestOnlyRoute>} />
          <Route path="/google-callback" element={<GoogleCallback />} />

          {/* ================= SERVICES ================= */}
          <Route path="/packages" element={<HolidayPackages />} />
          <Route path="/packages/:id" element={<PackageDetail />} />
          <Route path="/hotels" element={<Hotels />} />
          <Route path="/trains" element={<Trains />} />
          <Route path="/cabs" element={<Cabs />} />
          <Route path="/bus" element={<Bus />} />
          <Route path="/flights" element={<Flights />} />

          {/* ================= BOOKING ================= */}
          <Route path="/cabs/book" element={<Navigate to="/cabs" replace />} />
          <Route
            path="/packages/book"
            element={
              <UserRoute>
                <PackageBooking />
              </UserRoute>
            }
          />
          <Route
            path="/book/:category"
            element={
              <UserRoute>
                <Booking />
              </UserRoute>
            }
          />

          {/* ================= CHECKOUT ================= */}
          <Route path="/checkout/:type" element={<Navigate to="/" replace />} />
          <Route path="/booking-success" element={<BookingSuccess />} />

          {/* ================= USER ================= */}
          <Route
            path="/profile"
            element={
              <UserRoute>
                <Profile />
              </UserRoute>
            }
          />
          <Route
            path="/wallet"
            element={
              <UserRoute>
                <Wallet />
              </UserRoute>
            }
          />

          {/* ================= FALLBACK ================= */}
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </Suspense>

      {!shouldHideChrome && <Footer />}
      {!shouldHideChrome && <ChatbotWidget />}
      <ScrollButtons />
    </>
  );
}

export default App;
