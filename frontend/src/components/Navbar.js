import React, { useEffect, useRef, useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { 
  Plane, 
  Hotel, 
  TrainFront, 
  Car, 
  BusFront, 
  Package, 
  Percent, 
  User, 
  ChevronDown, 
  LogOut, 
  LayoutDashboard, 
  UserCircle,
  Menu,
  X
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import "./Navbar.css";

const primaryLinks = [
  { to: "/flights", label: "Flights", icon: Plane },
  { to: "/hotels", label: "Hotels", icon: Hotel },
  { to: "/trains", label: "Trains", icon: TrainFront },
  { to: "/cabs", label: "Cabs", icon: Car },
  { to: "/bus", label: "Bus", icon: BusFront },
  { to: "/packages", label: "Packages", icon: Package },
  { to: "/offers", label: "Offers", icon: Percent },
];

const Navbar = () => {
  const { isAuthenticated, user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [showGuestDropdown, setShowGuestDropdown] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const userDropdownRef = useRef(null);
  const guestDropdownRef = useRef(null);
  const mobileMenuRef = useRef(null);
  const mobileMenuButtonRef = useRef(null);

  const handleLogout = () => {
    logout();
    setShowUserDropdown(false);
    navigate("/");
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (userDropdownRef.current && !userDropdownRef.current.contains(event.target)) {
        setShowUserDropdown(false);
      }

      if (guestDropdownRef.current && !guestDropdownRef.current.contains(event.target)) {
        setShowGuestDropdown(false);
      }

      if (
        mobileMenuRef.current
        && !mobileMenuRef.current.contains(event.target)
        && mobileMenuButtonRef.current
        && !mobileMenuButtonRef.current.contains(event.target)
      ) {
        setShowMobileMenu(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    setShowMobileMenu(false);
    setShowGuestDropdown(false);
    setShowUserDropdown(false);
  }, [location.pathname]);

  return (
    <nav className="navbar">
      <div className="nav-container">
        <Link to="/" className="nav-logo">
          <div className="logo-icon-wrapper">
            <Plane size={28} className="logo-icon-svg" />
          </div>
          <div className="logo-text-group">
            <span className="logo-text">MakeMyTrip</span>
            <span className="logo-tagline">Travel smarter</span>
          </div>
        </Link>

        <div className="nav-menu">
          {primaryLinks.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}
            >
              <link.icon size={20} className="nav-icon-svg" />
              <span>{link.label}</span>
            </NavLink>
          ))}
        </div>

        <div className="nav-right">
          <button
            ref={mobileMenuButtonRef}
            className="mobile-nav-toggle"
            type="button"
            aria-label={showMobileMenu ? "Close navigation menu" : "Open navigation menu"}
            aria-expanded={showMobileMenu}
            onClick={() => setShowMobileMenu((open) => !open)}
          >
            {showMobileMenu ? <X size={20} /> : <Menu size={20} />}
          </button>

          {isAuthenticated ? (
            <div className="nav-more-dropdown" ref={userDropdownRef}>
              <button
                className="user-dropdown-btn"
                onClick={() => setShowUserDropdown((open) => !open)}
                type="button"
                aria-expanded={showUserDropdown}
              >
                <div className="user-avatar">
                  {user?.name ? user.name.charAt(0).toUpperCase() : "U"}
                </div>
                <div className="user-text-box">
                  <span className="welcome-text">Hi, {user?.name?.split(" ")[0] || "Traveller"}</span>
                  <span className="account-text">
                    Account <ChevronDown size={12} className="arrow-small" />
                  </span>
                </div>
              </button>

              {showUserDropdown && (
                <div className="dropdown-menu">
                  {user?.isAdmin && (
                    <Link to="/admin/dashboard" className="dropdown-item" onClick={() => setShowUserDropdown(false)}>
                      <LayoutDashboard size={18} />
                      <span>Admin Dashboard</span>
                    </Link>
                  )}
                  <Link to="/profile" className="dropdown-item" onClick={() => setShowUserDropdown(false)}>
                    <UserCircle size={18} />
                    <span>My Profile</span>
                  </Link>

                  <div className="dropdown-divider"></div>
                  <button onClick={handleLogout} className="dropdown-item logout-item" type="button">
                    <LogOut size={18} />
                    <span>Logout</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="nav-right-guest" ref={guestDropdownRef}>
              <button
                className="guest-account-box"
                onClick={() => setShowGuestDropdown((open) => !open)}
                type="button"
                aria-expanded={showGuestDropdown}
              >
                <div className="user-avatar guest">
                  <User size={20} />
                </div>
                <div className="user-text-box">
                  <span className="welcome-text">Login or Create</span>
                  <span className="account-text">
                    Account <ChevronDown size={12} className="arrow-small" />
                  </span>
                </div>
              </button>

              {showGuestDropdown && (
                <div className="dropdown-menu guest">
                  <Link to="/login" className="dropdown-item login-btn-drop" onClick={() => setShowGuestDropdown(false)}>
                    Login / Signup
                  </Link>
                  <div className="dropdown-divider"></div>
                  <Link to="/about" className="dropdown-item" onClick={() => setShowGuestDropdown(false)}>
                    About Us
                  </Link>
                  <Link to="/contact" className="dropdown-item" onClick={() => setShowGuestDropdown(false)}>
                    Contact Us
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {showMobileMenu && (
        <div className="mobile-nav-panel" ref={mobileMenuRef}>
          <div className="mobile-nav-links">
            {primaryLinks.map((link) => (
              <NavLink
                key={`mobile-${link.to}`}
                to={link.to}
                className={({ isActive }) => `mobile-nav-link ${isActive ? "active" : ""}`}
                onClick={() => setShowMobileMenu(false)}
              >
                <link.icon size={18} className="nav-icon-svg" />
                <span>{link.label}</span>
              </NavLink>
            ))}
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
