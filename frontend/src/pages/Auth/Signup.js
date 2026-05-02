import React, { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import apiClient from "../../services/apiClient";
import API_BASE_URL from '../../utils/api';
import {
  clearSavedAuthRedirect,
  consumeSavedAuthRedirect,
  getSavedAuthRedirect,
  getAuthRedirectFromLocationState,
  saveAuthRedirect
} from "../../utils/authRedirect";
import "./Signup.css";

const API_URL = API_BASE_URL;

function Signup() {
  const { login, isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    mobile: "",
    password: "",
    confirmPassword: "",
    agreeTerms: false
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const authRedirect = useMemo(
    () => getAuthRedirectFromLocationState(location.state) || getSavedAuthRedirect(),
    [location.state]
  );

  useEffect(() => {
    if (authRedirect) {
      saveAuthRedirect(authRedirect);
    }
  }, [authRedirect]);

  useEffect(() => {
    if (!isAuthenticated || !user) return;

    if (user.isAdmin) {
      clearSavedAuthRedirect();
      navigate("/admin/dashboard", { replace: true });
      return;
    }

    const redirect = authRedirect || consumeSavedAuthRedirect();
    if (redirect?.to) {
      navigate(redirect.to, { replace: true, state: redirect.state });
      return;
    }

    navigate("/", { replace: true });
  }, [authRedirect, isAuthenticated, navigate, user]);

  const navigateAfterSignup = (userData) => {
    const redirect = userData.isAdmin ? null : (authRedirect || consumeSavedAuthRedirect());

    if (userData.isAdmin) {
      clearSavedAuthRedirect();
      navigate("/admin/dashboard");
      return;
    }

    clearSavedAuthRedirect();
    if (redirect?.to) {
      navigate(redirect.to, { replace: true, state: redirect.state });
      return;
    }

    navigate("/");
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value
    }));
    setError("");
  };

  const validateForm = () => {
    if (!formData.firstName || !formData.lastName || !formData.email || !formData.mobile) {
      setError("Please fill in all required fields");
      return false;
    }
    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      return false;
    }
    if (formData.password.length < 6) {
      setError("Password must be at least 6 characters long");
      return false;
    }
    if (!formData.agreeTerms) {
      setError("Please agree to the terms and conditions");
      return false;
    }
    return true;
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    setLoading(true);
    setError("");

    try {
      const payload = {
        name: `${formData.firstName} ${formData.lastName}`,
        email: formData.email,
        mobile: formData.mobile,
        password: formData.password
      };
      const response = await apiClient.post(`/auth/signup`, payload);
      const { token, user } = response.data;
      login(user, token);
      navigateAfterSignup(user);
    } catch (err) {
      setError(err.response?.data?.message || "Signup failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignup = () => {
    if (authRedirect) {
      saveAuthRedirect(authRedirect);
    }
    window.location.href = `${API_URL}/auth/google`;
  };

  return (
    <div className="signup-page-container">
      <div className="signup-card">
        <div className="signup-header">
           <h1 style={{ color: '#00d2ff', margin: '0 0 10px 0' }}>MakeMyTrip</h1>
           <h1>Create Account</h1>
           <p>Join us and start your journey</p>
        </div>

        <form className="signup-form" onSubmit={handleSignup}>
          <div className="form-grid-elite">
            <div className="form-group-elite">
              <label>First Name</label>
              <input
                type="text"
                name="firstName"
                placeholder="First name"
                value={formData.firstName}
                onChange={handleInputChange}
                required
              />
            </div>
            <div className="form-group-elite">
              <label>Last Name</label>
              <input
                type="text"
                name="lastName"
                placeholder="Last name"
                value={formData.lastName}
                onChange={handleInputChange}
                required
              />
            </div>
          </div>

          <div className="form-group-elite">
            <label>Email Address</label>
            <input
              type="email"
              name="email"
              placeholder="Enter your email"
              value={formData.email}
              onChange={handleInputChange}
              required
            />
          </div>

          <div className="form-group-elite">
            <label>Mobile Number</label>
            <div className="mobile-input-elite">
               <span className="country-code-lite">+91</span>
               <input
                 type="tel"
                 name="mobile"
                 placeholder="Mobile number"
                 value={formData.mobile}
                 onChange={handleInputChange}
                 maxLength={10}
                 required
               />
            </div>
          </div>

          <div className="form-grid-elite">
            <div className="form-group-elite">
              <label>Password</label>
              <div className="password-input-wrapper-elite">
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  placeholder="Create password"
                  value={formData.password}
                  onChange={handleInputChange}
                  required
                />
                <button type="button" className="password-toggle-elite" onClick={() => setShowPassword(!showPassword)}>
                  {showPassword ? "👁️‍🗨️" : "👁️"}
                </button>
              </div>
            </div>
            <div className="form-group-elite">
              <label>Confirm</label>
              <div className="password-input-wrapper-elite">
                <input
                  type={showPassword ? "text" : "password"}
                  name="confirmPassword"
                  placeholder="Repeat password"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  required
                />
              </div>
            </div>
          </div>

          <label className="terms-elite">
            <input
              type="checkbox"
              name="agreeTerms"
              checked={formData.agreeTerms}
              onChange={handleInputChange}
              required
            />
            <span>I agree to the Terms & Conditions and Privacy Policy</span>
          </label>

          {error && <div className="error-msg-elite" style={{ marginBottom: '10px' }}>{error}</div>}

          <button type="submit" className="btn-create-elite" disabled={loading}>
            {loading ? "Creating Account..." : "Create Account"}
          </button>
        </form>

        <div className="auth-divider">
          <span>Or sign up with</span>
        </div>

        <button className="btn-google" onClick={handleGoogleSignup}>
          <img
            src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
            alt="Google"
          />
          Continue with Google
        </button>

        <div className="login-footer-lite">
          Already have an account? <Link to="/login" state={authRedirect ? { authRedirect } : undefined}>Sign in</Link>
        </div>
      </div>
    </div>
  );
}

export default Signup;
