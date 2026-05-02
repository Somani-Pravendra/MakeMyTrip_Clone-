import React from "react";
import { formatTravelDate } from "../../../utils/bookingDates";

const PackageReview = ({ data, onNext, onBack }) => {
    const pkg = data.package || {};
    const packageCode = pkg.packageId || String(pkg._id || "").slice(-6).toUpperCase();

    if (!packageCode) {
        return (
            <div className="package-review-step elite-design-v4">
                <div className="card-v4 premium-glass">
                    <div className="section-header-row">
                        <h3><span>PACKAGE</span> Package Review</h3>
                    </div>
                    <p className="label-text-dim no-margin">Package details are still loading. Please go back and reopen this package.</p>
                </div>

                <div className="booking-actions-shell">
                    <button className="btn-elite-outline" onClick={onBack}>
                        <span>&lt;-</span> BACK
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="package-review-step elite-design-v4">
            <div className="card-v4 premium-glass">
                <div className="section-header-row">
                    <h3><span>PACKAGE</span> Package Review</h3>
                    <div className="elite-badge">PKG-{packageCode}</div>
                </div>

                <div className="elite-review-grid">
                    <div className="elite-review-item" style={{ gridColumn: "span 2" }}>
                        <p className="label-text-dim">CURATED EXPERIENCE</p>
                        <p className="val-text-lrg white-bold no-margin" style={{ fontSize: "20px" }}>{pkg.packageTitle}</p>
                        <p className="label-text-dim no-margin mt-5">Location: {pkg.city}, {pkg.country}</p>
                    </div>
                    <div className="elite-review-item">
                        <p className="label-text-dim">DURATION</p>
                        <p className="val-text-lrg white-bold">{pkg.duration}</p>
                    </div>
                </div>

                <div className="elite-route-indicator mt-30">
                    <div className="route-point">
                        <div className="city-code-lrg">START</div>
                        <div className="station-name-mini">{pkg.city?.toUpperCase()}</div>
                    </div>

                    <div className="route-line-shell">
                        <div className="route-ship-icon">TRIP</div>
                        <div className="route-duration-pill">{pkg.category} TOUR</div>
                    </div>

                    <div className="route-point">
                        <div className="city-code-lrg">GOAL</div>
                        <div className="station-name-mini">{pkg.country?.toUpperCase()}</div>
                    </div>
                </div>

                <div className="mt-24 border-top-glow pt-20">
                    <p className="label-text-dim">TRAVEL DATE</p>
                    <p className="white-bold no-margin mt-5">
                        {formatTravelDate(data.travelDate || data.startDate || data.date, "Select date")}
                    </p>
                </div>

                <div className="mt-24 border-top-glow pt-20">
                    <p className="label-text-dim">SERVICE HIGHLIGHTS</p>
                    <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginTop: "10px" }}>
                        <span className="elite-badge">HOTEL {pkg.hotelType}</span>
                        <span className="elite-badge">TRANSFER {pkg.transportType}</span>
                        <span className="elite-badge">MEALS {pkg.mealsIncluded}</span>
                    </div>
                </div>
            </div>

            <div className="card-v4 premium-glass mt-24">
                <div className="section-header-row">
                    <h3><span>PLAN</span> Itinerary Highlights</h3>
                </div>
                <div className="elite-review-grid" style={{ gap: "15px" }}>
                    {pkg.itinerary?.slice(0, 4).map((day, i) => (
                        <div key={i} className="elite-review-item" style={{ background: "rgba(255,255,255,0.03)", padding: "15px", borderRadius: "12px" }}>
                            <p className="label-text-dim no-margin">DAY {day.day}</p>
                            <p className="white-bold no-margin mt-5" style={{ fontSize: "14px" }}>{day.title}</p>
                        </div>
                    ))}
                </div>
                {pkg.itinerary?.length > 4 && (
                    <p className="label-text-dim mt-15 italic" style={{ fontSize: "12px" }}>
                        + {pkg.itinerary.length - 4} more days of curated experiences included.
                    </p>
                )}
            </div>

            <div className="elite-form-row double mt-24">
                <div className="card-v4 glass-info no-margin">
                    <h4 className="white-bold no-margin">Inclusions</h4>
                    <ul className="label-text-dim mt-15" style={{ textTransform: "none", paddingLeft: "20px" }}>
                        {pkg.included?.map((inc, i) => <li key={i}>{inc}</li>)}
                    </ul>
                </div>
                <div className="card-v4 glass-warning no-margin">
                    <h4 className="white-bold no-margin">Exclusions</h4>
                    <ul className="label-text-dim mt-15" style={{ textTransform: "none", paddingLeft: "20px" }}>
                        {pkg.excluded?.map((exc, i) => <li key={i}>{exc}</li>)}
                    </ul>
                </div>
            </div>

            <div className="booking-actions-shell">
                <button className="btn-elite-outline" onClick={onBack}>
                    <span>&lt;-</span> BACK
                </button>
                <div className="elite-status-pill no-margin" style={{ background: "rgba(0, 255, 170, 0.1)", color: "#00ffaa", marginLeft: "auto", marginRight: "20px" }}>
                    <span className="pulse-dot"></span> Free cancellation available
                </div>
                <button className="btn-elite-primary" onClick={onNext} style={{ minWidth: "280px" }}>
                    TRAVELLER DETAILS <span>-&gt;</span>
                </button>
            </div>
        </div>
    );
};

export default PackageReview;
