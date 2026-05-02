import React from "react";
import SmartCouponSection from "../../../components/booking/SmartCouponSection";
import { formatCurrency } from "../../../utils/currency";
import { formatTravelDate } from "../../../utils/bookingDates";
import { getHotelMealSelections, getHotelMealAddOnTotal } from "../../../utils/hotelAddOns";

const HotelBookingSidebar = ({ data, currentStep, onUpdate }) => {
    const hotel = data.hotel || {};
    const guestCount = Math.max(Number(data.guests) || 1, 1);
    const nights = data.checkIn && data.checkOut
        ? Math.ceil((new Date(data.checkOut) - new Date(data.checkIn)) / (1000 * 60 * 60 * 24))
        : 1;

    const roomPrice = data.selectedRoom?.pricePerNight || data.basePrice || 0;
    const staySubtotal = roomPrice * nights;
    const selectedMeals = getHotelMealSelections(data.experienceAddOns, guestCount);
    const addOnSubtotal = getHotelMealAddOnTotal(data.experienceAddOns, guestCount);
    const subtotal = staySubtotal + addOnSubtotal;
    const taxes = Math.round(subtotal * 0.12);
    const convenienceFee = 150;
    const preCouponTotal = subtotal + taxes + convenienceFee;
    const couponDiscount = Math.min(Number(data.couponDiscount) || 0, preCouponTotal);
    const finalTotal = preCouponTotal - couponDiscount;

    return (
        <div className="elite-sidebar-container">
            <div className="summary-card-v4">
                <h3 className="summary-title">
                    <span>HOTEL</span> Booking Summary
                </h3>

                <div className="summary-row">
                    <span>Stay ({nights} Night{nights > 1 ? "s" : ""})</span>
                    <span>{formatCurrency(staySubtotal)}</span>
                </div>

                {selectedMeals.map((meal) => (
                    <div className="summary-row" key={meal.key}>
                        <span>{meal.label} ({guestCount} Guest{guestCount > 1 ? "s" : ""})</span>
                        <span>{formatCurrency(meal.totalPrice)}</span>
                    </div>
                ))}

                <div className="summary-row">
                    <span>Taxes & Fees (12%)</span>
                    <span>{formatCurrency(taxes)}</span>
                </div>

                <div className="summary-row">
                    <span>Convenience Fee</span>
                    <span>{formatCurrency(convenienceFee)}</span>
                </div>

                {couponDiscount > 0 && (
                    <div className="summary-row coupon-discount-row">
                        <span>Coupon Discount ({data.couponCode})</span>
                        <span>-{formatCurrency(couponDiscount)}</span>
                    </div>
                )}

                <div className="summary-row total-box">
                    <span className="white-bold">Total Amount</span>
                    <span className="total-amt">
                        {formatCurrency(finalTotal)}
                        <small className="summary-total-count">
                            ({data.guests || 2} total)
                        </small>
                    </span>
                </div>

                <SmartCouponSection
                    category="hotels"
                    subtotal={preCouponTotal}
                    appliedCode={data.couponCode}
                    appliedDiscount={couponDiscount}
                    onCouponChange={onUpdate}
                    placeholder="ELITESTAY"
                />
            </div>

            <div className="elite-status-pill">
                <span className="pulse-dot"></span>
                Booking Locked for 09:59 mins
            </div>

            <div className="sidebar-info-card">
                <div className="info-header-v4">
                    <div className="info-icon-v4">HOTEL</div>
                    <div>
                        <p className="white-bold no-margin hotel-sidebar-name">{hotel.name}</p>
                        <p className="label-text-dim no-margin hotel-sidebar-subtitle">{hotel.stars} STAR {hotel.category || "HOTEL"}</p>
                    </div>
                </div>
                <div className="mt-15">
                    <p className="white-bold no-margin hotel-sidebar-location">Location: {hotel.location?.city}</p>
                    <p className="label-text-dim no-margin hotel-sidebar-date mt-5">
                        Travel Date: {formatTravelDate(data.checkIn || data.travelDate, "Select date")}
                    </p>
                    <p className="label-text-dim no-margin hotel-sidebar-date">
                        Stay: {formatTravelDate(data.checkIn, "IN")} - {formatTravelDate(data.checkOut, "OUT")}
                    </p>

                    <p className="cyan-highlight no-margin mt-15 hotel-sidebar-guests">
                        GUESTS: {data.guests || 2} Adult(s)
                    </p>
                </div>
            </div>

            <div className="elite-status-pill policy-pill mt-15">
                <span>POLICY</span> {hotel.policies?.cancellationPolicy || "Free cancellation 24h before check-in"}
            </div>
        </div>
    );
};

export default HotelBookingSidebar;
