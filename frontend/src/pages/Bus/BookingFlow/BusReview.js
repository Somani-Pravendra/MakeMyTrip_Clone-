import React from "react";
import { formatTravelDate } from "../../../utils/bookingDates";

const BusReview = ({ data, onNext, onBack }) => {
    const { bus, from, to } = data;

    return (
        <div className="bus-review-step elite-design-v4">
            <div className="card-v4 premium-glass">
                <div className="section-header-row">
                    <h3><span>BUS</span> Bus Review</h3>
                    <div className="elite-badge">{bus?.busType || "AC SEATER"}</div>
                </div>

                <div className="elite-review-grid">
                    <div className="elite-review-item">
                        <p className="label-text-dim">Operator</p>
                        <div className="review-entity-row">
                            <div className="info-icon-v4">BUS</div>
                            <div className="review-entity-copy">
                                <p className="val-text-lrg white-bold no-margin">{bus?.operatorName || "Private Operator"}</p>
                                <p className="label-text-dim no-margin">Coach #8829</p>
                            </div>
                        </div>
                    </div>
                    <div className="elite-review-item">
                        <p className="label-text-dim">Service Type</p>
                        <p className="val-text-lrg cyan-highlight">AC Sleeper (2+1)</p>
                    </div>
                </div>

                <div className="elite-route-indicator mt-30">
                    <div className="route-point">
                        <div className="city-code-lrg">{from || bus?.from || "Start"}</div>
                        <div className="station-name-mini">Boarding Point</div>
                        <div className="time-val-lrg">{bus?.departureTime || "--:--"}</div>
                    </div>

                    <div className="route-line-shell">
                        <div className="route-ship-icon">BUS</div>
                        <div className="route-duration-pill">{bus?.duration}</div>
                    </div>

                    <div className="route-point">
                        <div className="city-code-lrg">{to || bus?.to || "End"}</div>
                        <div className="station-name-mini">Dropping Point</div>
                        <div className="time-val-lrg">{bus?.arrivalTime || "--:--"}</div>
                    </div>
                </div>
                <div className="mt-20">
                    <p className="label-text-dim no-margin">TRAVEL DATE</p>
                    <p className="white-bold no-margin mt-5">
                        {formatTravelDate(data.travelDate || data.date || bus?.departureDate, "Select date")}
                    </p>
                </div>
            </div>

            <div className="card-v4 premium-glass mt-24">
                <h3><span>INFO</span> Policies & Information</h3>
                <div className="elite-review-grid" style={{ marginBottom: 0 }}>
                    <div className="elite-review-item glass-warning">
                        <h5 className="policy-title">
                            <span className="icon-pill">REF</span> Cancellation
                        </h5>
                        <div className="mt-15">
                            <div className="summary-row">
                                <span className="label-text-dim">0-12 hrs</span>
                                <strong className="white-bold" style={{ color: "#ff4d4d" }}>No refund</strong>
                            </div>
                            <div className="summary-row">
                                <span className="label-text-dim">12-24 hrs</span>
                                <strong className="white-bold">50% refund</strong>
                            </div>
                        </div>
                    </div>
                    <div className="elite-review-item glass-info">
                        <h5 className="policy-title">
                            <span className="icon-pill">BAG</span> Baggage
                        </h5>
                        <div className="mt-15">
                            <p className="policy-link-mmt no-margin">Maximum 2 bags allowed</p>
                            <p className="label-text-dim no-margin" style={{ marginTop: "5px", textTransform: "none" }}>
                                Reach the boarding point at least 15 minutes before departure.
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="booking-actions-shell">
                <button className="btn-elite-outline" onClick={onBack}>
                    Back
                </button>
                <button className="btn-elite-primary" onClick={onNext}>
                    Proceed to Traveller Details
                </button>
            </div>
        </div>
    );
};

export default BusReview;
