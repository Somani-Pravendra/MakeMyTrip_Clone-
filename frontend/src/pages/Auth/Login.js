import React, { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import apiClient from "../../services/apiClient";
import "./Login.css";

import API_BASE_URL from '../../utils/api';
import {
  clearSavedAuthRedirect,
  consumeSavedAuthRedirect,
  getSavedAuthRedirect,
  getAuthRedirectFromLocationState,
  saveAuthRedirect
} from "../../utils/authRedirect";
const API_URL = API_BASE_URL;

function Login() {
  const { login, isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [formData, setFormData] = useState({
    email: "",
    password: ""
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

  const navigateAfterLogin = (userData) => {
    const redirect = authRedirect || consumeSavedAuthRedirect();

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
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    setError("");
  };

  const handlePasswordLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await apiClient.post(`/auth/login`, {
        email: formData.email,
        password: formData.password
      });

      const { token, user } = response.data;
      login(user, token);
      navigateAfterLogin(user);

    } catch (err) {
      setError(err.response?.data?.message || "Login failed. Please check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    if (authRedirect) {
      saveAuthRedirect(authRedirect);
    }
    window.location.href = `${API_URL}/auth/google`;
  };

  return (
    <div className="login-page-container">
      <div className="login-card">
        <div className="login-header">
          <div className="elite-logo-wrapper">
            <h1 style={{ color: '#00d2ff', margin: '0 0 10px 0' }}>MakeMyTrip</h1>
          </div>
          <h1>Sign In</h1>
          <p>Access your travel account</p>
        </div>

        <form className="login-form" onSubmit={handlePasswordLogin}>
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
            <label>Password</label>
            <div className="password-input-wrapper-elite">
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                placeholder="Enter your password"
                value={formData.password}
                onChange={handleInputChange}
                required
              />
              <button 
                type="button" 
                className="password-toggle-elite" 
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? "👁️‍🗨️" : "👁️"}
              </button>
            </div>
          </div>

          <div className="forgot-link">
            <Link to="/forgot-password">Forgot Password?</Link>
          </div>

          {error && <div className="error-msg-elite">{error}</div>}

          <button type="submit" className="btn-sign-in" disabled={loading}>
            {loading ? "Signing In..." : "Sign In"}
          </button>
        </form>

        <div className="auth-divider">
          <span>Or continue with</span>
        </div>

        <button className="btn-google" onClick={handleGoogleLogin}>
          <img
            src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
            alt="Google"
          />
          Continue with Google
        </button>

        <div className="signup-footer">
          Don't have an account? <Link to="/signup" state={authRedirect ? { authRedirect } : undefined}>Sign up</Link>
        </div>
      </div>
    </div>
  );
}

export default Login;
