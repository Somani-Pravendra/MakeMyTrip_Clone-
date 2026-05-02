import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { API_BASE_URL } from "../../utils/api";
import "./ForgotPassword.css";

const API_URL = `${API_BASE_URL}`;

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      await axios.post(`${API_URL}/auth/forgot-password`, { email });
      setSent(true);
      setTimeout(() => navigate("/verify-otp", { state: { email } }), 2500);
    } catch (err) {
      setError(err.response?.data?.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="forgot-container">
      <div className="forgot-box">
        {!sent ? (
          <>
            <div className="forgot-icon">OTP</div>
            <h2>Forgot Password?</h2>
            <p>
              Enter your registered email address and we will send you a secure OTP
              to reset your password. The OTP will remain valid for 5 minutes.
            </p>

            <form onSubmit={handleSubmit}>
              <div className="forgot-field">
                <label>Email Address</label>
                <input
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoFocus
                />
              </div>

              {error && (
                <div
                  style={{
                    color: "#dc2626",
                    fontSize: "13px",
                    marginBottom: "10px",
                    textAlign: "center",
                  }}
                >
                  {error}
                </div>
              )}

              <button type="submit" disabled={loading}>
                {loading ? "Sending OTP..." : "Send OTP"}
              </button>
            </form>

            <Link to="/login" className="forgot-back">
              Remembered your password? <span>Sign In</span>
            </Link>
          </>
        ) : (
          <>
            <div className="forgot-icon">DONE</div>
            <h2>OTP Sent!</h2>
            <p>
              We have sent a verification code to <strong>{email}</strong>.
              <br />
              The OTP is valid for 5 minutes. Redirecting you to verification...
            </p>
          </>
        )}
      </div>
    </div>
  );
};

export default ForgotPassword;
