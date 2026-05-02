import React, { useState } from "react";

const PickupDropConfirm = ({ data, onNext, onBack, onUpdate }) => {
    const [error, setError] = useState("");

    const routeReady = Boolean(data.pickupLocation && data.dropLocation && data.pickupDateTime);

    const handleContinue = () => {
        if (!routeReady) {
            setError("Please confirm pickup, drop, and pickup time before continuing.");
            return;
        }

        setError("");
        onNext();
    };

    return (
        <div className="cab-review-step elite-design-v4">
            <div className="card-v4 premium-glass">
                <div className="section-header-row">
                    <div className="label-col">
                        <span className="elite-badge">Trip Confirmation</span>
                        <h3 className="no-margin mt-10"><span>Pickup</span> & Drop Details</h3>
                    </div>
                </div>

                <div className="elite-review-grid mt-24">
                    <div className="elite-review-item">
                        <p className="label-text-dim">Pickup Location</p>
                        <p className="white-bold no-margin">{data.pickupLocation || "Not selected"}</p>
                        <p className="info-text-sm-dim mt-10">Driver will arrive at the chosen pickup point.</p>
                    </div>
                    <div className="elite-review-item">
                        <p className="label-text-dim">Drop Location</p>
                        <p className="white-bold no-margin">{data.dropLocation || "Not selected"}</p>
                        <p className="info-text-sm-dim mt-10">Final fare may vary for tolls and parking.</p>
                    </div>
                </div>

                <div className="elite-review-grid mt-24">
                    <div className="elite-review-item glass-info">
                        <p className="label-text-dim">Pickup Date & Time</p>
                        <p className="white-bold no-margin">
                            {data.pickupDateTime
                                ? new Date(data.pickupDateTime).toLocaleString("en-IN", {
                                    day: "2-digit",
                                    month: "short",
                                    year: "numeric",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                    hour12: true
                                })
                                : "Not selected"}
                        </p>
                    </div>
                    <div className="elite-review-item glass-info">
                        <p className="label-text-dim">Ride Snapshot</p>
                        <p className="white-bold no-margin">
                            {Number(data.distance || 0).toFixed(1)} km | {Math.max(Number(data.numberOfPassengers || data.passengers?.length || 1), 1)} traveller(s)
                        </p>
                    </div>
                </div>
            </div>

            <div className="card-v4 premium-glass mt-24">
                <div className="section-header-row">
                    <h3><span>INFO</span> Final Ride Check</h3>
                </div>
                <div className="elite-review-grid mt-20" style={{ marginBottom: 0 }}>
                    <div className="elite-review-item glass-info">
                        <p className="label-text-dim">Driver Note</p>
                        <p className="white-bold no-margin">{data.specialRequirements?.trim() || "No special instruction added"}</p>
                    </div>
                    <div className="elite-review-item glass-warning">
                        <p className="label-text-dim">Reminder</p>
                        <p className="info-text-sm-dim no-margin">
                            Keep your phone reachable around pickup time. Driver details will be shared after confirmation.
                        </p>
                    </div>
                </div>
                {error && <p className="error-text-elite mt-20">{error}</p>}
            </div>

            <div className="booking-actions-shell mt-40">
                <button className="btn-elite-outline" onClick={onBack}>
                    Back
                </button>
                <button className="btn-elite-primary" onClick={handleContinue} style={{ minWidth: "280px" }}>
                    Continue to Payment
                </button>
            </div>
        </div>
    );
};

export default PickupDropConfirm;
