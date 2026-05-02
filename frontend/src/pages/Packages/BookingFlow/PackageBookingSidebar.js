import React from "react";
import SmartCouponSection from "../../../components/booking/SmartCouponSection";
import { formatCurrency } from "../../../utils/currency";
import { formatTravelDate } from "../../../utils/bookingDates";

const PackageBookingSidebar = ({ data, onUpdate }) => {
    const pkg = data.package;
    if (!pkg) return null;

    const paxCount = data.travellers ? data.travellers.length : 2;
    const basePrice = pkg.pricePerPerson * paxCount;
    const discountAmount = Math.round((basePrice * (pkg.discount || 0)) / 100);
    const subtotal = basePrice - discountAmount;
    const taxes = Math.round(subtotal * 0.18);
    const preCouponTotal = subtotal + taxes;
    const couponDiscount = Math.min(Number(data.couponDiscount) || 0, preCouponTotal);
    const total = preCouponTotal - couponDiscount;

    return (
        <div className="elite-sidebar-container">
            <div className="summary-card-v4">
                <h3 className="summary-title">
                    <span>Trip</span> Fare Summary
                </h3>

                <div className="summary-row">
                    <div className="label-col">
                        <span>Base Fare</span>
                        <span className="label-text-dim">({paxCount} Traveller{paxCount > 1 ? "s" : ""})</span>
                    </div>
                    <span>{formatCurrency(basePrice)}</span>
                </div>

                {discountAmount > 0 && (
                    <div className="summary-row" style={{ color: "#00ffaa" }}>
                        <span>Package Discount ({pkg.discount}%)</span>
                        <span>-{formatCurrency(discountAmount)}</span>
                    </div>
                )}

                <div className="summary-row">
                    <span>Taxes & Fees (18%)</span>
                    <span>{formatCurrency(taxes)}</span>
                </div>

                {couponDiscount > 0 && (
                    <div className="summary-row coupon-discount-row">
                        <span>Coupon Discount ({data.couponCode})</span>
                        <span>-{formatCurrency(couponDiscount)}</span>
                    </div>
                )}

                <div className="summary-row total-box">
                    <span className="white-bold">Grand Total</span>
                    <span className="total-amt">{formatCurrency(total)}</span>
                </div>

                <SmartCouponSection
                    category="packages"
                    subtotal={preCouponTotal}
                    appliedCode={data.couponCode}
                    appliedDiscount={couponDiscount}
                    onCouponChange={onUpdate}
                    placeholder="HOLIDAYFUN"
                />
            </div>

            <div className="elite-status-pill">
                <span className="pulse-dot"></span>
                Offer pricing ends in 09:59 mins
            </div>

            <div className="sidebar-info-card">
                <div className="info-header-v4">
                    <div className="info-icon-v4">Trip</div>
                    <div>
                        <p className="white-bold no-margin" style={{ fontSize: "15px" }}>{pkg.packageTitle}</p>
                        <p className="label-text-dim no-margin">{pkg.category?.toUpperCase() || "ELITE"} EXPERIENCE</p>
                    </div>
                </div>
                <div className="mt-15">
                    <p className="white-bold no-margin" style={{ fontSize: "13px" }}>Location: {pkg.city}, {pkg.country}</p>
                    <p className="label-text-dim no-margin" style={{ marginTop: "5px", fontSize: "12px" }}>
                        Duration: {pkg.duration}
                    </p>
                    <p className="label-text-dim no-margin" style={{ marginTop: "6px", fontSize: "12px" }}>
                        Travel Date: {formatTravelDate(data.travelDate || data.startDate || data.date, "Select date")}
                    </p>

                    <p className="cyan-highlight no-margin mt-15" style={{ fontSize: "12px", fontWeight: "bold" }}>
                        Accommodation: {pkg.hotelType}
                    </p>
                </div>
            </div>

            <div className="elite-status-pill mt-15" style={{ background: "rgba(0, 255, 170, 0.1)", color: "#00ffaa" }}>
                <span>Secure</span> Secure Elite Booking | Best Experience
            </div>
        </div>
    );
};

export default PackageBookingSidebar;
