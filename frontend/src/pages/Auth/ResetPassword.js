import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import { API_BASE_URL } from "../../utils/api";
import "./AuthFlow.css";

const API_URL = `${API_BASE_URL}`;

function ResetPassword() {
    const [formData, setFormData] = useState({
        newPassword: "",
        confirmPassword: ""
    });
    const [showPassword, setShowPassword] = useState({
        newPassword: false,
        confirmPassword: false
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [message, setMessage] = useState("");
    const navigate = useNavigate();
    const location = useLocation();

    const email = location.state?.email || "";
    const otp = location.state?.otp || "";

    const handleInputChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const togglePasswordVisibility = (field) => {
        setShowPassword((prev) => ({
            ...prev,
            [field]: !prev[field]
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (formData.newPassword !== formData.confirmPassword) {
            setError("Passwords do not match");
            return;
        }
        if (!email || !otp) {
            setError("Session expired. Please start over.");
            return;
        }

        setLoading(true);
        setError("");

        try {
            const response = await axios.post(`${API_URL}/auth/reset-password`, {
                email,
                otp,
                newPassword: formData.newPassword
            });
            setMessage(response.data.message);
            setTimeout(() => {
                navigate("/login");
            }, 3000);
        } catch (err) {
            setError(err.response?.data?.message || "Reset failed. Please try again.");
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
                    <span className="auth-chip">Set a new password</span>
                    <h1>Reset Password</h1>
                    <p>Create a strong password for <strong>{email}</strong> and complete your recovery securely.</p>
                </div>

                <div className="auth-form-container">
                    <form className="auth-form" onSubmit={handleSubmit}>
                        <div className="form-group">
                            <label className="form-label">New Password</label>
                            <div className="password-field">
                                <input
                                    type={showPassword.newPassword ? "text" : "password"}
                                    name="newPassword"
                                    className="form-input"
                                    placeholder="Enter new password"
                                    value={formData.newPassword}
                                    onChange={handleInputChange}
                                    required
                                />
                                <button
                                    type="button"
                                    className="password-toggle-btn"
                                    onClick={() => togglePasswordVisibility('newPassword')}
                                    aria-label={showPassword.newPassword ? 'Hide new password' : 'Show new password'}
                                >
                                    {showPassword.newPassword ? 'Hide' : 'Show'}
                                </button>
                            </div>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Confirm Password</label>
                            <div className="password-field">
                                <input
                                    type={showPassword.confirmPassword ? "text" : "password"}
                                    name="confirmPassword"
                                    className="form-input"
                                    placeholder="Confirm new password"
                                    value={formData.confirmPassword}
                                    onChange={handleInputChange}
                                    required
                                />
                                <button
                                    type="button"
                                    className="password-toggle-btn"
                                    onClick={() => togglePasswordVisibility('confirmPassword')}
                                    aria-label={showPassword.confirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                                >
                                    {showPassword.confirmPassword ? 'Hide' : 'Show'}
                                </button>
                            </div>
                        </div>

                        <button type="submit" className="auth-btn primary" disabled={loading}>
                            {loading ? (
                                <>
                                    <div className="loading-spinner"></div>
                                    Resetting...
                                </>
                            ) : (
                                "Reset Password"
                            )}
                        </button>

                        {error && <div className="error-message">{error}</div>}
                        {message && <div className="success-message">{message}</div>}
                    </form>
                </div>
            </div>
        </div>
    );
}

export default ResetPassword;
