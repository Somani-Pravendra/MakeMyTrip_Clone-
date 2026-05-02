import React, { useState } from "react";

const defaultPreferences = {
    bedType: "King Sized Bed",
    smoking: "No",
    highFloor: false,
    breakfastPlan: "Included",
    earlyCheckIn: false,
    lateCheckOut: false
};

const HotelPreferences = ({ data, onNext, onBack, onUpdate }) => {
    const [preferences, setPreferences] = useState({
        ...defaultPreferences,
        ...(data.preferences || {})
    });

    const handleUpdate = (field, value) => {
        const updated = { ...preferences, [field]: value };
        setPreferences(updated);
        onUpdate({ preferences: updated });
    };

    return (
        <div className="preferences-step elite-design-v4">
            <div className="card-v4 premium-glass">
                <div className="section-header-row">
                    <h3><span>PREF</span> Preferences</h3>
                    <div className="elite-badge">Stay Setup</div>
                </div>

                <div className="elite-selection-grid mt-30">
                    <div className="addon-card-v4 active">
                        <div className="addon-icon-v4">BED</div>
                        <h4 className="white-bold">Bed Configuration</h4>
                        <p className="label-text-dim">Pick the layout that feels most comfortable for your stay.</p>
                        <select
                            className="elite-select mt-15"
                            style={{ width: "100%" }}
                            value={preferences.bedType}
                            onChange={(e) => handleUpdate("bedType", e.target.value)}
                        >
                            <option value="King Sized Bed">King Sized Bed</option>
                            <option value="Twin Beds">Twin Beds</option>
                            <option value="Single Bed x 2">Single Bed x 2</option>
                        </select>
                    </div>

                    <div className="addon-card-v4">
                        <div className="addon-icon-v4">AIR</div>
                        <h4 className="white-bold">Smoking Policy</h4>
                        <p className="label-text-dim">Choose the stay environment you prefer.</p>
                        <div style={{ display: "flex", gap: "20px", marginTop: "15px", flexWrap: "wrap" }}>
                            <label className="custom-checkbox-v4">
                                <input
                                    type="radio"
                                    name="smoking"
                                    checked={preferences.smoking === "No"}
                                    onChange={() => handleUpdate("smoking", "No")}
                                />
                                <span className="checkmark"></span>
                                Non-Smoking
                            </label>
                            <label className="custom-checkbox-v4">
                                <input
                                    type="radio"
                                    name="smoking"
                                    checked={preferences.smoking === "Yes"}
                                    onChange={() => handleUpdate("smoking", "Yes")}
                                />
                                <span className="checkmark"></span>
                                Smoking
                            </label>
                        </div>
                    </div>
                </div>

                <div className="elite-selection-grid mt-24">
                    <div className="addon-card-v4">
                        <div className="addon-icon-v4">MEAL</div>
                        <h4 className="white-bold">Breakfast Plan</h4>
                        <p className="label-text-dim">Choose whether you want breakfast included from the start.</p>
                        <select
                            className="elite-select mt-15"
                            style={{ width: "100%" }}
                            value={preferences.breakfastPlan}
                            onChange={(e) => handleUpdate("breakfastPlan", e.target.value)}
                        >
                            <option value="Included">Included</option>
                            <option value="Optional">Optional on arrival</option>
                            <option value="Not needed">Not needed</option>
                        </select>
                    </div>

                    <div className="addon-card-v4">
                        <div className="addon-icon-v4">TIME</div>
                        <h4 className="white-bold">Check-in Flexibility</h4>
                        <p className="label-text-dim">Request arrival and departure flexibility for the front desk.</p>
                        <div style={{ display: "grid", gap: "14px", marginTop: "15px" }}>
                            <label className="custom-checkbox-v4">
                                <input
                                    type="checkbox"
                                    checked={preferences.earlyCheckIn}
                                    onChange={(e) => handleUpdate("earlyCheckIn", e.target.checked)}
                                />
                                <span className="checkmark"></span>
                                Early check-in request
                            </label>
                            <label className="custom-checkbox-v4">
                                <input
                                    type="checkbox"
                                    checked={preferences.lateCheckOut}
                                    onChange={(e) => handleUpdate("lateCheckOut", e.target.checked)}
                                />
                                <span className="checkmark"></span>
                                Late check-out request
                            </label>
                        </div>
                    </div>
                </div>

                <div className="card-v4 glass-info mt-24">
                    <label className="custom-checkbox-v4">
                        <input
                            type="checkbox"
                            checked={preferences.highFloor}
                            onChange={(e) => handleUpdate("highFloor", e.target.checked)}
                        />
                        <span className="checkmark"></span>
                        <div style={{ marginLeft: "10px" }}>
                            <p className="white-bold no-margin">Prefer a higher floor</p>
                            <p className="label-text-dim no-margin" style={{ textTransform: "none" }}>
                                Subject to hotel availability during check-in.
                            </p>
                        </div>
                    </label>
                </div>
            </div>

            <div className="booking-actions-shell">
                <button className="btn-elite-outline" onClick={onBack}>
                    <span>&larr;</span> BACK
                </button>
                <button className="btn-elite-primary" onClick={onNext}>
                    CONTINUE TO REQUESTS <span>&rarr;</span>
                </button>
            </div>
        </div>
    );
};

export default HotelPreferences;
