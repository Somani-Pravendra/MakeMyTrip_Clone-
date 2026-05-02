import React, { useState } from "react";

const defaultPreferences = {
    departureCity: "Ahmedabad",
    roomSharing: "Twin Sharing",
    mealPlan: "Breakfast + Dinner",
    airportTransfer: true,
    sightseeingStyle: "Balanced"
};

const PackagePreferences = ({ data, onNext, onBack, onUpdate }) => {
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
                    <h3><span>TRIP</span> Trip Preferences</h3>
                    <div className="elite-badge">Journey Setup</div>
                </div>

                <div className="elite-selection-grid mt-30">
                    <div className="addon-card-v4 active">
                        <div className="addon-icon-v4">CITY</div>
                        <h4 className="white-bold">Departure City</h4>
                        <p className="label-text-dim">Confirm the city from which your trip coordination should begin.</p>
                        <select
                            className="elite-select mt-15"
                            style={{ width: "100%" }}
                            value={preferences.departureCity}
                            onChange={(e) => handleUpdate("departureCity", e.target.value)}
                        >
                            <option value="Ahmedabad">Ahmedabad</option>
                            <option value="Mumbai">Mumbai</option>
                            <option value="Delhi">Delhi</option>
                            <option value="Bengaluru">Bengaluru</option>
                        </select>
                    </div>

                    <div className="addon-card-v4">
                        <div className="addon-icon-v4">ROOM</div>
                        <h4 className="white-bold">Room Sharing</h4>
                        <p className="label-text-dim">Tell us what room arrangement should be prioritized.</p>
                        <select
                            className="elite-select mt-15"
                            style={{ width: "100%" }}
                            value={preferences.roomSharing}
                            onChange={(e) => handleUpdate("roomSharing", e.target.value)}
                        >
                            <option value="Twin Sharing">Twin Sharing</option>
                            <option value="Double Sharing">Double Sharing</option>
                            <option value="Single Occupancy">Single Occupancy</option>
                        </select>
                    </div>
                </div>

                <div className="elite-selection-grid mt-24">
                    <div className="addon-card-v4">
                        <div className="addon-icon-v4">MEAL</div>
                        <h4 className="white-bold">Meal Plan</h4>
                        <p className="label-text-dim">Choose the meal inclusion level for the holiday package.</p>
                        <select
                            className="elite-select mt-15"
                            style={{ width: "100%" }}
                            value={preferences.mealPlan}
                            onChange={(e) => handleUpdate("mealPlan", e.target.value)}
                        >
                            <option value="Breakfast + Dinner">Breakfast + Dinner</option>
                            <option value="Breakfast only">Breakfast only</option>
                            <option value="All meals">All meals</option>
                        </select>
                    </div>

                    <div className="addon-card-v4">
                        <div className="addon-icon-v4">TOUR</div>
                        <h4 className="white-bold">Sightseeing Style</h4>
                        <p className="label-text-dim">Set the pace for activities, market time, and free exploration.</p>
                        <select
                            className="elite-select mt-15"
                            style={{ width: "100%" }}
                            value={preferences.sightseeingStyle}
                            onChange={(e) => handleUpdate("sightseeingStyle", e.target.value)}
                        >
                            <option value="Balanced">Balanced</option>
                            <option value="Relaxed">Relaxed</option>
                            <option value="Activity packed">Activity packed</option>
                        </select>
                    </div>
                </div>

                <div className="card-v4 glass-info mt-24">
                    <label className="custom-checkbox-v4">
                        <input
                            type="checkbox"
                            checked={preferences.airportTransfer}
                            onChange={(e) => handleUpdate("airportTransfer", e.target.checked)}
                        />
                        <span className="checkmark"></span>
                        <div style={{ marginLeft: "10px" }}>
                            <p className="white-bold no-margin">Need airport or station transfers</p>
                            <p className="label-text-dim no-margin" style={{ textTransform: "none" }}>
                                We will keep pickup and drop coordination included in the final plan.
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
                    CONTINUE TO UPGRADES <span>&rarr;</span>
                </button>
            </div>
        </div>
    );
};

export default PackagePreferences;
