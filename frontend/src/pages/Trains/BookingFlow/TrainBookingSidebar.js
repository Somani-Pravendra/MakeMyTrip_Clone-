import React from "react";
import SmartCouponSection from "../../../components/booking/SmartCouponSection";
import { formatCurrency } from "../../../utils/currency";
import { formatTravelDate } from "../../../utils/bookingDates";

const getAddonLineTotal = (item = {}) => {
    const quantity = Math.max(Number(item.quantity) || 1, 1);
    const explicitTotal = Number(item.totalPrice);
    if (Number.isFinite(explicitTotal) && explicitTotal > 0) return explicitTotal;
    return (Number(item.price) || 0) * quantity;
};

const TrainBookingSidebar = ({ data, onUpdate }) => {
    const { train, selectedClass, passengers, addOns, basePrice } = data;

    const passengerCount = passengers.length || 1;
    const selectedMeals = addOns.meals || addOns.catering || [];
    const mealsTotal = selectedMeals.reduce((sum, item) => sum + getAddonLineTotal(item), 0);
    const baseFare = (basePrice || 0) * passengerCount;
    const taxes = Math.round(baseFare * 0.05);
    const serviceFee = 40;
    const preCouponTotal = baseFare + taxes + serviceFee + mealsTotal;
    const couponDiscount = Math.min(Number(data.couponDiscount) || 0, preCouponTotal);
    const finalTotal = preCouponTotal - couponDiscount;

    return (
        <div className="elite-sidebar-container">
            <div className="summary-card-v4">
                <h3 className="summary-title">
                    <span>Train</span> Fare Summary
                </h3>

                <div className="summary-row">
                    <span>Base Fare ({passengerCount} Travellers)</span>
                    <span>{formatCurrency(baseFare)}</span>
                </div>
                <div className="summary-row">
                    <span>Taxes & GST (5%)</span>
                    <span>{formatCurrency(taxes)}</span>
                </div>
                <div className="summary-row">
                    <span>Service Fee</span>
                    <span>{formatCurrency(serviceFee)}</span>
                </div>

                {mealsTotal > 0 && (
                    <div className="addon-summary-section mt-24">
                        <p className="label-text-dim">ADD-ONS</p>
                        {mealsTotal > 0 && (
                            <div className="summary-row">
                                <span>Meal Selection</span>
                                <span>{formatCurrency(mealsTotal)}</span>
                            </div>
                        )}
                    </div>
                )}

                {couponDiscount > 0 && (
                    <div className="summary-row coupon-discount-row">
                        <span>Coupon Discount ({data.couponCode})</span>
                        <span>-{formatCurrency(couponDiscount)}</span>
                    </div>
                )}

                <div className="summary-row total-box">
                    <span className="white-bold">Total Amount</span>
                    <span className="total-amt">{formatCurrency(finalTotal)}</span>
                </div>

                <SmartCouponSection
                    category="trains"
                    subtotal={preCouponTotal}
                    appliedCode={data.couponCode}
                    appliedDiscount={couponDiscount}
                    onCouponChange={onUpdate}
                    placeholder="TRAINDEAL"
                />
            </div>

            <div className="elite-status-pill">
                <span className="pulse-dot"></span>
                Seats available for {selectedClass === "SL" ? "Sleeper" : selectedClass}
            </div>

            <div className="sidebar-info-card">
                <div className="info-header-v4">
                    <div className="info-icon-v4">Train</div>
                    <div>
                        <p className="white-bold no-margin" style={{ fontSize: "15px" }}>{train.trainName}</p>
                        <p className="label-text-dim no-margin">({train.trainNumber})</p>
                    </div>
                </div>
                <div className="mt-15">
                    <p className="white-bold no-margin" style={{ fontSize: "14px" }}>{train.from} to {train.to}</p>
                    <p className="label-text-dim no-margin" style={{ marginTop: "4px" }}>{train.departureTime} | {train.duration}</p>
                    <p className="label-text-dim no-margin" style={{ marginTop: "6px" }}>
                        Travel Date: {formatTravelDate(data.travelDate || data.date || train?.date || train?.departureDate, "Select date")}
                    </p>
                </div>
            </div>
        </div>
    );
};

export default TrainBookingSidebar;
