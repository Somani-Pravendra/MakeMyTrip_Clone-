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

const BookingSidebar = ({ data, currentStep, onUpdate }) => {
    const { bus, selectedSeats = [], addOns = {} } = data;
    const perSeatPrice = bus?.price || bus?.fare || 0;
    const seatCount = selectedSeats.length;

    const baseFare = seatCount * perSeatPrice;
    const gst = Math.round(baseFare * 0.05);
    const convenienceFee = seatCount > 0 ? 49 : 0;
    const operatorFee = seatCount > 0 ? 20 : 0;
    const mealsTotal = (addOns.meals || []).reduce((sum, item) => sum + getAddonLineTotal(item), 0);
    const preCouponTotal = baseFare + gst + convenienceFee + operatorFee + mealsTotal;
    const couponDiscount = Math.min(Number(data.couponDiscount) || 0, preCouponTotal);
    const totalAmount = preCouponTotal - couponDiscount;

    return (
        <div className="elite-sidebar-container">
            <div className="summary-card-v4">
                <h3 className="summary-title">
                    <span>BUS</span> Booking Summary
                </h3>
                
                {seatCount === 0 ? (
                    <p className="label-text-dim" style={{ textAlign: "center", padding: "20px 0" }}>Select seats to see fare details</p>
                ) : (
                    <>
                        <div className="summary-row">
                            <span>Base Fare ({seatCount} x {formatCurrency(perSeatPrice)})</span>
                            <span>{formatCurrency(baseFare)}</span>
                        </div>
                        
                        <div className="summary-row">
                            <span>GST (5%)</span>
                            <span>{formatCurrency(gst)}</span>
                        </div>
                        
                        <div className="summary-row">
                            <span>Convenience Fee</span>
                            <span>{formatCurrency(convenienceFee)}</span>
                        </div>
                        
                        <div className="summary-row">
                            <span>Operator Fee</span>
                            <span>{formatCurrency(operatorFee)}</span>
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
                            <span className="total-amt">{formatCurrency(totalAmount)}</span>
                        </div>

                        <SmartCouponSection
                            category="bus"
                            subtotal={preCouponTotal}
                            appliedCode={data.couponCode}
                            appliedDiscount={couponDiscount}
                            onCouponChange={onUpdate}
                            placeholder="BUSOFFER"
                        />
                    </>
                )}
            </div>

            <div className="elite-status-pill">
                <span className="pulse-dot"></span>
                Locked for 09:59 mins
            </div>

            <div className="sidebar-info-card">
                <div className="info-header-v4">
                    <div className="info-icon-v4">BUS</div>
                    <div>
                        <p className="white-bold no-margin sidebar-operator-name">{bus?.operatorName || "Bus"}</p>
                        <p className="label-text-dim no-margin">{bus?.busType || "AC SEATER"}</p>
                    </div>
                </div>
                <div className="mt-15">
                    <p className="white-bold no-margin route-summary-line">{(data.from || bus?.from || "Start")} to {(data.to || bus?.to || "Destination")}</p>
                    <p className="label-text-dim no-margin route-summary-date">
                        Travel Date: {formatTravelDate(data.travelDate || data.date || bus?.departureDate, "Select date")}
                    </p>
                    {(data.boardingPoint || data.droppingPoint) && (
                        <p className="label-text-dim no-margin route-summary-date" style={{ textTransform: "none", marginTop: "10px" }}>
                            {data.boardingPoint || bus?.boardingPoint || "Main stand"} to {data.droppingPoint || bus?.droppingPoint || "City center"}
                        </p>
                    )}
                    
                    {seatCount > 0 && (
                        <p className="cyan-highlight no-margin mt-15 seat-summary-line">
                            SEATS: {selectedSeats.map((seat) => (typeof seat === "string" ? seat : seat.id)).join(", ")}
                        </p>
                    )}
                </div>
            </div>

            {seatCount > 1 && (
                <div className="elite-status-pill mt-15" style={{ background: "rgba(0, 255, 170, 0.1)", color: "#00ffaa", border: "1px solid rgba(0, 255, 170, 0.2)" }}>
                    MULTI: Group discount applied
                </div>
            )}
        </div>
    );
};

export default BookingSidebar;
