import React, { useMemo, useState } from "react";

const buildPointOptions = (primaryLabel, fallbackCity, defaultTime, kind) => {
    const primary = (primaryLabel || fallbackCity || `${kind} Point`).trim();

    return [
        {
            id: `${kind}-primary`,
            label: primary,
            time: defaultTime || "--:--",
            note: kind === "boarding" ? "Main departure stop" : "Primary drop stop"
        },
        {
            id: `${kind}-city`,
            label: `${fallbackCity || primary} ${kind === "boarding" ? "Central Stand" : "City Center"}`.trim(),
            time: defaultTime || "--:--",
            note: kind === "boarding" ? "Reach 20 mins early" : "Popular drop landmark"
        }
    ];
};

const BoardingDrop = ({ data, onNext, onBack, onUpdate }) => {
    const [error, setError] = useState("");

    const boardingOptions = useMemo(
        () => buildPointOptions(data.bus?.boardingPoint, data.from || data.bus?.from, data.bus?.departureTime, "boarding"),
        [data.bus, data.from]
    );
    const droppingOptions = useMemo(
        () => buildPointOptions(data.bus?.droppingPoint, data.to || data.bus?.to, data.bus?.arrivalTime, "dropping"),
        [data.bus, data.to]
    );

    const selectedBoarding = data.boardingPoint || boardingOptions[0]?.label || "";
    const selectedDropping = data.droppingPoint || droppingOptions[0]?.label || "";

    const handleContinue = () => {
        if (!selectedBoarding || !selectedDropping) {
            setError("Please confirm both boarding and dropping points.");
            return;
        }
        onUpdate({
            boardingPoint: selectedBoarding,
            droppingPoint: selectedDropping,
            boardingTime: data.boardingTime || boardingOptions.find((option) => option.label === selectedBoarding)?.time || "",
            droppingTime: data.droppingTime || droppingOptions.find((option) => option.label === selectedDropping)?.time || ""
        });
        setError("");
        onNext();
    };

    return (
        <div className="addons-step elite-design-v4">
            <div className="card-v4 premium-glass">
                <div className="section-header-row">
                    <h3><span>STOP</span> Boarding & Drop Points</h3>
                    <div className="elite-badge">Route Confirmation</div>
                </div>

                <div className="elite-review-grid mt-24">
                    <div className="elite-review-item glass-info">
                        <p className="label-text-dim">Boarding point</p>
                        <div className="elite-selection-grid mt-15">
                            {boardingOptions.map((option) => (
                                <button
                                    key={option.id}
                                    type="button"
                                    className={`addon-card-v4 ${selectedBoarding === option.label ? "active" : ""}`}
                                    onClick={() => onUpdate({
                                        boardingPoint: option.label,
                                        boardingTime: option.time
                                    })}
                                >
                                    <div className="addon-title">{option.label}</div>
                                    <div className="label-text-dim">{option.time}</div>
                                    <div className="info-text-sm-dim mt-10">{option.note}</div>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="elite-review-item glass-info">
                        <p className="label-text-dim">Dropping point</p>
                        <div className="elite-selection-grid mt-15">
                            {droppingOptions.map((option) => (
                                <button
                                    key={option.id}
                                    type="button"
                                    className={`addon-card-v4 ${selectedDropping === option.label ? "active" : ""}`}
                                    onClick={() => onUpdate({
                                        droppingPoint: option.label,
                                        droppingTime: option.time
                                    })}
                                >
                                    <div className="addon-title">{option.label}</div>
                                    <div className="label-text-dim">{option.time}</div>
                                    <div className="info-text-sm-dim mt-10">{option.note}</div>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="card-v4 glass-warning mt-24">
                    <div className="impact-row no-margin">
                        <span className="label-text-dim">Travel tip</span>
                        <span className="info-text-sm-dim">
                            Carry a valid ID and reach the boarding point at least 15 minutes before departure.
                        </span>
                    </div>
                </div>

                {error && <p className="error-text-elite mt-20">{error}</p>}
            </div>

            <div className="booking-actions-shell">
                <button className="btn-elite-outline" onClick={onBack}>
                    Back
                </button>
                <button className="btn-elite-primary" onClick={handleContinue}>
                    Continue to Amenities
                </button>
            </div>
        </div>
    );
};

export default BoardingDrop;
