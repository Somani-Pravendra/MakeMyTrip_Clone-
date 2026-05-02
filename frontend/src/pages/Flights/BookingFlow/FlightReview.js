import React from "react";
import { formatTravelDate } from "../../../utils/bookingDates";

const FlightReview = ({ data, onNext, onBack }) => {
  const { flight } = data;
  const airlineName = flight?.airlineName || flight?.airline || "Flight";

  return (
    <div className="flight-review-step elite-design-v4">
      <div className="card-v4 premium-glass">
        <div className="section-header-row">
          <h3>
            <span>FLT</span> {airlineName} - Flight Review
          </h3>
          <div className="elite-badge">{flight.flightNumber}</div>
        </div>

        <div className="elite-route-indicator">
          <div className="route-point">
            <div className="city-code-lrg">{flight.from}</div>
            <div className="station-name-mini">DEPARTURE POINT</div>
            <div className="time-val-lrg">{flight.departureTime}</div>
          </div>

          <div className="route-line-shell">
            <div className="route-ship-icon">FLT</div>
            <div className="route-duration-pill">{flight.duration}</div>
          </div>

          <div className="route-point">
            <div className="city-code-lrg">{flight.to}</div>
            <div className="station-name-mini">ARRIVAL POINT</div>
            <div className="time-val-lrg">{flight.arrivalTime}</div>
          </div>
        </div>
        <div className="mt-20">
          <p className="label-text-dim no-margin">TRAVEL DATE</p>
          <p className="white-bold no-margin mt-5">
            {formatTravelDate(data.travelDate || data.date || flight?.date || flight?.departureDate, "Select date")}
          </p>
        </div>
      </div>

      <div className="card-v4 premium-glass">
        <h3>
          <span>INFO</span> Baggage & Cancellation
        </h3>
        <div className="elite-review-grid" style={{ marginBottom: 0 }}>
          <div className="elite-review-item glass-info">
            <h5 className="policy-title">
              <span className="icon-pill">BG</span> Baggage
            </h5>
            <div className="mt-15">
              <div className="summary-row">
                <span className="label-text-dim">Cabin</span>
                <strong className="white-bold">7 Kgs</strong>
              </div>
              <div className="summary-row">
                <span className="label-text-dim">Check-in</span>
                <strong className="white-bold">15 Kgs</strong>
              </div>
            </div>
          </div>
          <div className="elite-review-item glass-warning">
            <h5 className="policy-title">
              <span className="icon-pill">CN</span> Cancellation
            </h5>
            <div className="mt-15">
              <p className="policy-link-mmt no-margin">Refundable (fee applies)</p>
              <p className="label-text-dim" style={{ marginTop: "5px" }}>
                Subject to airline cancellation fees.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="booking-actions-shell">
        <button className="btn-elite-outline" onClick={onBack}>
          <span>&lt;-</span> BACK
        </button>
        <button className="btn-elite-primary" onClick={onNext}>
          PROCEED TO TRAVELLERS <span>-&gt;</span>
        </button>
      </div>
    </div>
  );
};

export default FlightReview;
