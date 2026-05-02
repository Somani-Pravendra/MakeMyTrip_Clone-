import React from "react";
import { formatCurrency } from "../../../utils/currency";
import { formatTravelDate } from "../../../utils/bookingDates";

const HotelReview = ({ data, onNext, onBack }) => {
    const hotel = data.hotel || {};
    const selectedRoom = data.selectedRoom || {};
    const formattedTravelDate = formatTravelDate(data.checkIn || data.travelDate, "01 Apr, 2026");
    const [travelDateMain, travelDateYear = "2026"] = formattedTravelDate.split(", ");
    const nights = data.checkIn && data.checkOut
        ? Math.max(Math.ceil((new Date(data.checkOut) - new Date(data.checkIn)) / (1000 * 60 * 60 * 24)), 1)
        : 1;

    return (
        <div className="hotel-review-step elite-design-v4">
            <div className="card-v4 premium-glass">
                <div className="section-header-row">
                    <h3><span>HOTEL</span> Hotel Review</h3>
                    <div className="elite-badge">{hotel.stars} STAR {hotel.category || "HOTEL"}</div>
                </div>

                <div className="elite-review-grid">
                    <div className="elite-review-item" style={{ gridColumn: "span 2" }}>
                        <p className="label-text-dim">HOTEL NAME</p>
                        <p className="val-text-lrg white-bold no-margin" style={{ fontSize: "20px" }}>{hotel.name}</p>
                        <p className="label-text-dim no-margin mt-5">Location: {hotel.location?.city}, {hotel.location?.state}</p>
                    </div>
                    <div className="elite-review-item">
                        <p className="label-text-dim">GUEST RATING</p>
                        <p className="val-text-lrg white-bold">
                            {hotel.rating} <span style={{ fontSize: "12px", opacity: 0.6 }}>(1,240 REVIEWS)</span>
                        </p>
                    </div>
                </div>

                <div className="premium-summary-container mt-30">
                    <div className="summary-card-elite">
                        <span className="label">TRAVEL DATE</span>
                        <div className="val-group">
                            <span className="main-val">{travelDateMain}</span>
                        </div>
                        <span className="footer-item">{travelDateYear}</span>
                    </div>

                    <div className="summary-card-elite">
                        <span className="label">TRAVELLERS</span>
                        <div className="val-group">
                            <span className="main-val">{data.guests || 2}</span>
                        </div>
                        <span className="footer-item">travellers</span>
                    </div>

                    <div className="summary-card-elite">
                        <span className="label">TOTAL PAID</span>
                        <div className="val-group">
                            <span className="unit">Rs</span>
                            <span className="sub-val">{formatCurrency(data.totalFare || 3585).replace("Rs", "").replace("₹", "").trim()}</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="card-v4 premium-glass mt-24">
                <div className="section-header-row">
                    <h3><span>STAY</span> Stay & Amenities</h3>
                </div>
                <div className="elite-review-grid">
                    <div className="elite-review-item">
                        <p className="label-text-dim">STAY PLAN</p>
                        <p className="val-text-lrg cyan-highlight">{hotel.category || "Hotel Stay"}</p>
                    </div>
                    <div className="elite-review-item">
                        <p className="label-text-dim">DURATION</p>
                        <p className="val-text-lrg white-bold">{nights} NIGHT{nights > 1 ? "S" : ""}</p>
                    </div>
                </div>
                <div className="mt-20">
                    <p className="label-text-dim">AMENITIES</p>
                    <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginTop: "10px" }}>
                        {(selectedRoom?.amenities || hotel?.amenities || ["Wi-Fi", "AC", "Breakfast"]).slice(0, 8).map((amenity, index) => (
                            <span key={index} className="elite-badge">{amenity}</span>
                        ))}
                    </div>
                </div>
            </div>

            <div className="card-v4 glass-info mt-24">
                <h3><span>POLICY</span> Important Policies</h3>
                <div className="elite-review-grid" style={{ marginBottom: 0 }}>
                    <div className="elite-review-item">
                        <p className="label-text-dim">CANCELLATION</p>
                        <p className="white-bold mt-5 no-margin" style={{ textTransform: "none" }}>
                            {hotel.policies?.cancellationPolicy || "Free cancellation 24h before check-in"}
                        </p>
                    </div>
                    <div className="elite-review-item">
                        <p className="label-text-dim">CHILDREN & EXTRA BEDS</p>
                        <p className="white-bold mt-5 no-margin" style={{ textTransform: "none" }}>
                            Child below 6 years stays for free without bed.
                        </p>
                    </div>
                </div>
            </div>

            <div className="booking-actions-shell">
                <button className="btn-elite-outline" onClick={onBack}>
                    <span>&lt;-</span> BACK
                </button>
                <button className="btn-elite-primary" onClick={onNext} style={{ minWidth: "280px" }}>
                    PROCEED TO GUEST DETAILS <span>-&gt;</span>
                </button>
            </div>
        </div>
    );
};

export default HotelReview;
