import React, { useMemo } from "react";
import { formatCurrency } from "../../../utils/currency";
import { formatTravelDate } from "../../../utils/bookingDates";
import SmartCouponSection from "../../../components/booking/SmartCouponSection";
import { getFlightPricing } from "./flightPricing";

const BookingSidebar = ({ data, onUpdate }) => {
  const { flight, selectedSeats = [] } = data;
  const airlineName = flight?.airlineName || flight?.airline || "Flight";

  const pricing = useMemo(() => getFlightPricing(data), [data]);

  return (
    <div className="elite-sidebar-container">
      <div className="summary-card-v4">
        <h3 className="summary-title">
          <span>FARE</span> Fare Summary
        </h3>

        <div className="summary-row">
          <span>Base Fare ({pricing.passengerCount} Pax)</span>
          <span>{formatCurrency(pricing.baseFare)}</span>
        </div>
        <div className="summary-row">
          <span>Taxes and GST (12%)</span>
          <span>{formatCurrency(pricing.taxes)}</span>
        </div>
        <div className="summary-row">
          <span>Convenience Fee</span>
          <span>{formatCurrency(pricing.convenienceFee)}</span>
        </div>

        {pricing.seatsTotal > 0 && (
          <div className="summary-row">
            <span>Seat Upgrades</span>
            <span>{formatCurrency(pricing.seatsTotal)}</span>
          </div>
        )}

        {(pricing.mealsTotal > 0 || pricing.baggageTotal > 0) && (
          <div className="addon-summary-section mt-24">
            <p className="label-text-dim">ADD-ONS</p>
            {pricing.mealsTotal > 0 && (
              <div className="summary-row">
                <span>Meals</span>
                <span>{formatCurrency(pricing.mealsTotal)}</span>
              </div>
            )}
            {pricing.baggageTotal > 0 && (
              <div className="summary-row">
                <span>Extra Baggage</span>
                <span>{formatCurrency(pricing.baggageTotal)}</span>
              </div>
            )}
          </div>
        )}

        <SmartCouponSection
          category="flights"
          subtotal={pricing.subtotal}
          appliedCode={data.couponCode}
          appliedDiscount={pricing.couponDiscount}
          onCouponChange={onUpdate}
          placeholder="Enter coupon code"
        />

        {pricing.couponDiscount > 0 && (
          <div className="summary-row coupon-discount-row">
            <span>Coupon Discount ({pricing.coupon.code})</span>
            <span>-{formatCurrency(pricing.couponDiscount)}</span>
          </div>
        )}

        <div className="summary-row total-box">
          <span className="white-bold">Total Amount</span>
          <span className="total-amt">{formatCurrency(pricing.totalAmount)}</span>
        </div>
      </div>

      <div className="elite-status-pill">
        <span className="pulse-dot"></span>
        Price locked for 15 mins
      </div>

      <div className="sidebar-info-card">
        <div className="info-header-v4">
          <div className="info-icon-v4">FLT</div>
          <div>
            <p className="white-bold no-margin" style={{ fontSize: "15px" }}>
              {airlineName}
            </p>
            <p className="label-text-dim no-margin">{flight?.flightNumber}</p>
          </div>
        </div>
        <div className="mt-15">
          <p className="white-bold no-margin" style={{ fontSize: "14px" }}>
            {flight?.from} -&gt; {flight?.to}
          </p>
          <p className="label-text-dim no-margin" style={{ marginTop: "4px" }}>
            {flight?.departureTime} | {flight?.duration}
          </p>
          <p className="label-text-dim no-margin" style={{ marginTop: "6px" }}>
            Travel Date: {formatTravelDate(data.travelDate || data.date || flight?.date || flight?.departureDate, "Select date")}
          </p>
          {selectedSeats.length > 0 && (
            <p className="cyan-highlight no-margin mt-10" style={{ fontSize: "12px", fontWeight: 700 }}>
              SEATS: {selectedSeats.map((seat) => seat.id).join(", ")}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default BookingSidebar;
