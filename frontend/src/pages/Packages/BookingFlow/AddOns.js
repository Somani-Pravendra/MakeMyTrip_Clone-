import React, { useState } from "react";
import { formatCurrency } from "../../../utils/currency";

const defaultAddOns = {
    guidedTour: true,
    sunsetCruise: false,
    airportLounge: false,
    photography: false,
    specialNote: ""
};

const PackageAddOns = ({ data, onNext, onBack, onUpdate }) => {
    const [tripAddOns, setTripAddOns] = useState({
        ...defaultAddOns,
        ...(data.experienceAddOns || {})
    });

    const toggleAddOn = (field) => {
        const updated = { ...tripAddOns, [field]: !tripAddOns[field] };
        setTripAddOns(updated);
        onUpdate({ experienceAddOns: updated });
    };

    const updateText = (field, value) => {
        const updated = { ...tripAddOns, [field]: value };
        setTripAddOns(updated);
        onUpdate({ experienceAddOns: updated });
    };

    return (
        <div className="addons-step elite-design-v4">
            <div className="card-v4 premium-glass">
                <div className="section-header-row">
                    <h3><span>UPG</span> Upgrades & Experiences</h3>
                    <div className="elite-badge">Holiday Add-ons</div>
                </div>

                <div className="elite-selection-grid mt-30">
                    {[
                        {
                            key: "guidedTour",
                            icon: "TOUR",
                            title: "Guided City Sightseeing",
                            description: "Local guide, curated route, and landmark coverage across the destination.",
                            price: "Included priority"
                        },
                        {
                            key: "sunsetCruise",
                            icon: "CRUISE",
                            title: "Sunset Cruise",
                            description: "Evening cruise with dinner and live music for select destinations.",
                            price: `${formatCurrency(3999)} / traveller`
                        },
                        {
                            key: "airportLounge",
                            icon: "VIP",
                            title: "Airport Lounge Access",
                            description: "Make departure and return travel more comfortable with lounge coverage.",
                            price: `${formatCurrency(1499)} / traveller`
                        },
                        {
                            key: "photography",
                            icon: "SHOT",
                            title: "Vacation Photoshoot",
                            description: "Short guided shoot for couples, families, or groups at iconic spots.",
                            price: `${formatCurrency(2999)} / session`
                        }
                    ].map((item) => (
                        <button
                            key={item.key}
                            type="button"
                            className={`addon-card-v4 ${tripAddOns[item.key] ? "active" : ""}`}
                            onClick={() => toggleAddOn(item.key)}
                        >
                            <div className="addon-icon-v4">{item.icon}</div>
                            <h4 className="white-bold">{item.title}</h4>
                            <p className="label-text-dim">{item.description}</p>
                            <div className="price-row-v4 mt-20">
                                <span className="cyan-highlight white-bold">{item.price}</span>
                                <span className="elite-badge">{tripAddOns[item.key] ? "Selected" : "Optional"}</span>
                            </div>
                        </button>
                    ))}
                </div>

                <div className="form-field-v2 mt-24">
                    <label>SPECIAL NOTES FOR TRIP COORDINATOR</label>
                    <textarea
                        className="elite-input"
                        style={{ width: "100%", minHeight: "120px", padding: "20px", resize: "none", borderStyle: "dashed" }}
                        value={tripAddOns.specialNote}
                        onChange={(e) => updateText("specialNote", e.target.value)}
                        placeholder="Celebration note, dietary preference, mobility support, or any important planning detail."
                    />
                </div>
            </div>

            <div className="booking-actions-shell">
                <button className="btn-elite-outline" onClick={onBack}>
                    <span>&larr;</span> BACK
                </button>
                <button className="btn-elite-primary" onClick={onNext}>
                    PROCEED TO PAYMENT <span>&rarr;</span>
                </button>
            </div>
        </div>
    );
};

export default PackageAddOns;
