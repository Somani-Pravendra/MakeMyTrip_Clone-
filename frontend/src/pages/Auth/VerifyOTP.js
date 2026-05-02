import React, { useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import axios from "axios";
import { API_BASE_URL } from "../../utils/api";
import "./AuthFlow.css";

const API_URL = `${API_BASE_URL}`;

function VerifyOTP() {
    const [otp, setOtp] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [message, setMessage] = useState("");
    const navigate = useNavigate();
    const location = useLocation();
    const queryEmail = new URLSearchParams(location.search).get("email") || "";
    const email = location.state?.email || queryEmail;

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!email) {
            setError("Email missing. Please start over.");
            return;
        }
        setLoading(true);
        setError("");

        try {
            const response = await axios.post(`${API_URL}/auth/verify-otp`, { email, otp });
            setMessage(response.data.message);
            setTimeout(() => {
                navigate("/reset-password", { state: { email, otp } });
            }, 2000);
        } catch (err) {
            setError(err.response?.data?.message || "Invalid OTP. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-page-container">
            <div className="auth-content">
                <div className="auth-page-header">
                    <div className="auth-logo">
                        <span className="logo-text">MakeMyTrip</span>
                    </div>
                    <span className="auth-chip">Secure verification</span>
                    <h1>Verify OTP</h1>
                    <p>Enter the 6-digit code sent to <strong>{email}</strong>. The code stays valid for 5 minutes.</p>
                </div>

                <div className="auth-form-container">
                    <form className="auth-form" onSubmit={handleSubmit}>
                        <div className="form-group">
                            <label className="form-label">OTP Code</label>
                            <input
                                type="text"
                                className="form-input"
                                placeholder="Enter 6-digit OTP"
                                value={otp}
                                onChange={(e) => setOtp(e.target.value)}
                                maxLength={6}
                                inputMode="numeric"
                                autoFocus
                                required
                            />
                        </div>

                        <button type="submit" className="auth-btn primary" disabled={loading}>
                            {loading ? (
                                <>
                                    <div className="loading-spinner"></div>
                                    Verifying...
                                </>
                            ) : (
                                "Verify OTP"
                            )}
                        </button>

                        {error && <div className="error-message">{error}</div>}
                        {message && <div className="success-message">{message}</div>}
                    </form>

                    <div className="auth-footer">
                        <div className="auth-helper-note">
                            Use the latest OTP from your inbox. If you requested multiple times, older codes will not work.
                        </div>
                        <p>
                            Didn't receive code?{" "}
                            <Link to="/forgot-password" title="Go back to enter email again" className="auth-link">
                                Resend OTP
                            </Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default VerifyOTP;
