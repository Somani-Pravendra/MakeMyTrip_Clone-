import React from "react";
import SmartCouponSection from "../../../components/booking/SmartCouponSection";
import { getCabPricingBreakdown } from "../../../utils/cabBooking";
import { formatCurrency } from "../../../utils/currency";
import { formatTravelDate, formatTravelDateTime } from "../../../utils/bookingDates";

const formatRideDateTime = (pickupDateTime) => {
  return formatTravelDateTime(pickupDateTime, "Pickup pending");
};

const BookingSidebar = ({ data, currentStep, onUpdate }) => {
  const selectedCab = data.selectedCab || data.cab || {};
  const pricing = data.fareBreakdown || getCabPricingBreakdown(selectedCab, data.distance || 0);
  const preCouponTotal = Number(data.totalFare || data.price || pricing.total || 0);
  const couponDiscount = Math.min(Number(data.couponDiscount) || 0, preCouponTotal);
  const finalTotal = preCouponTotal - couponDiscount;

  return (
    <div className="elite-sidebar-container">
      <div className="summary-card-v4">
        <h3 className="summary-title" style={{ color: "white" }}>
          <span>Cab</span> Fare Summary
        </h3>

        <div className="summary-row mt-20">
          <span className="label-text-dim">Ride Fare</span>
          <span className="white-bold">{formatCurrency(pricing.rideFare)}</span>
        </div>

        <div className="summary-row mt-10">
          <span className="label-text-dim">GST (5%)</span>
          <span className="white-bold">{formatCurrency(pricing.gst)}</span>
        </div>

        <div className="summary-row mt-10">
          <span className="label-text-dim">Service Fee</span>
          <span className="white-bold">{formatCurrency(pricing.serviceFee)}</span>
        </div>

        {couponDiscount > 0 && (
          <div className="summary-row coupon-discount-row mt-10">
            <span className="label-text-dim">Coupon Discount ({data.couponCode})</span>
            <span className="white-bold">-{formatCurrency(couponDiscount)}</span>
          </div>
        )}

        <div className="summary-row total-box mt-24">
          <span className="white-bold" style={{ fontSize: "15px" }}>Total Amount</span>
          <div style={{ textAlign: "right" }}>
            <span className="total-amt">{formatCurrency(finalTotal)}</span>
            <p className="no-margin" style={{ fontSize: "10px", color: "rgba(255,255,255,0.4)", marginTop: "4px" }}>
              Final amount at checkout
            </p>
          </div>
        </div>

        <SmartCouponSection
          category="cabs"
          subtotal={preCouponTotal}
          appliedCode={data.couponCode}
          appliedDiscount={couponDiscount}
          onCouponChange={onUpdate}
          placeholder="CABRIDE"
        />
      </div>

      <div className="elite-status-pill mt-15">
        <span className="pulse-dot"></span>
        <span style={{ fontSize: "12px" }}>Instant Allocation after Payment</span>
      </div>

      <div className="sidebar-info-card mt-24">
        <div className="info-header-v4">
          <div className="info-icon-v4">Cab</div>
          <div>
            <p className="white-bold no-margin" style={{ fontSize: "15px" }}>
              {selectedCab.name || "Selection Pending"}
            </p>
            <p className="label-text-dim no-margin" style={{ fontSize: "11px" }}>
              {selectedCab.seats || 4} Seater | AC
            </p>
          </div>
        </div>

        <div className="mt-20 border-top-glow pt-15">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div style={{ flex: 1 }}>
              <p className="label-text-dim">PICKUP</p>
              <p className="white-bold no-margin" style={{ fontSize: "12px", lineHeight: "1.5" }}>
                {data.pickupLocation || "Source"}
              </p>
            </div>
          </div>

          <div className="mt-15">
            <p className="label-text-dim">DROP</p>
            <p className="white-bold no-margin" style={{ fontSize: "12px", lineHeight: "1.5" }}>
              {data.dropLocation || "Destination"}
            </p>
          </div>

          <div className="mt-15" style={{ background: "rgba(255,255,255,0.03)", padding: "10px", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.05)" }}>
            <p className="label-text-dim no-margin" style={{ fontSize: "11px", marginBottom: "6px" }}>
              Travel Date: {formatTravelDate(data.pickupDateTime || data.travelDate, "Select date")}
            </p>
            <p className="cyan-highlight no-margin" style={{ fontSize: "13px", fontWeight: "900" }}>
              Pickup: {formatRideDateTime(data.pickupDateTime)}
            </p>
          </div>
        </div>
      </div>

      {currentStep >= 2 && data.passengers?.[0]?.firstName && (
        <div className="sidebar-info-card mt-20" style={{ background: "rgba(0, 210, 255, 0.04)" }}>
          <p className="label-text-dim no-margin">PRIMARY TRAVELLER</p>
          <p className="white-bold mt-5 no-margin" style={{ fontSize: "14px" }}>
            {data.passengers[0].firstName} {data.passengers[0].lastName}
          </p>
          <p className="label-text-dim no-margin" style={{ fontSize: "12px", marginTop: "4px" }}>
            Phone: {data.passengers[0].phone}
          </p>
        </div>
      )}
    </div>
  );
};

export default BookingSidebar;
