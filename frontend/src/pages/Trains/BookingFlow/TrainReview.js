import React from "react";
import { formatTravelDate } from "../../../utils/bookingDates";

const TrainReview = ({ data, onNext, onBack }) => {
  const { train, selectedClass } = data;

  return (
    <div className="train-review-step elite-design-v4">
      <div className="card-v4 premium-glass">
        <div className="section-header-row">
          <h3>
            <span>TRN</span> Review Your Selection
          </h3>
          <div className="elite-badge">{train.trainNumber}</div>
        </div>

        <div className="elite-review-grid">
          <div className="elite-review-item">
            <p className="label-text-dim">TRAIN NAME & NUMBER</p>
            <p className="val-text-lrg white-bold">
              {train.trainName} ({train.trainNumber})
            </p>
          </div>
          <div className="elite-review-item">
            <p className="label-text-dim">CLASS TYPE</p>
            <p className="val-text-lrg cyan-highlight">
              {selectedClass === "SL" ? "Sleeper" : selectedClass}
            </p>
          </div>
        </div>

        <div className="elite-route-indicator">
          <div className="route-point">
            <div className="city-code-lrg">{train.from}</div>
            <div className="station-name-mini">SOURCE STATION</div>
            <div className="time-val-lrg">{train.departureTime}</div>
          </div>

          <div className="route-line-shell">
            <div className="route-ship-icon">TRN</div>
            <div className="route-duration-pill">{train.duration}</div>
          </div>

          <div className="route-point">
            <div className="city-code-lrg">{train.to}</div>
            <div className="station-name-mini">DESTINATION STATION</div>
            <div className="time-val-lrg">{train.arrivalTime}</div>
          </div>
        </div>
        <div className="mt-20">
          <p className="label-text-dim no-margin">TRAVEL DATE</p>
          <p className="white-bold no-margin mt-5">
            {formatTravelDate(data.travelDate || data.date || train?.date || train?.departureDate, "Select date")}
          </p>
        </div>
      </div>

      <div className="card-v4 premium-glass">
        <h3>
          <span>INFO</span> Travel Rules & Cancellation
        </h3>
        <div className="elite-review-grid" style={{ marginBottom: 0 }}>
          <div className="elite-review-item glass-info">
            <h5 className="policy-title">
              <span className="icon-pill">ID</span> Travel Note
            </h5>
            <div className="mt-15">
              <div className="summary-row">
                <span className="label-text-dim">ID Proof</span>
                <strong className="white-bold">Required</strong>
              </div>
              <div className="summary-row">
                <span className="label-text-dim">Boarding</span>
                <strong className="white-bold">Train chart dependent</strong>
              </div>
            </div>
          </div>
          <div className="elite-review-item glass-warning">
            <h5 className="policy-title">
              <span className="icon-pill">CN</span> Cancellation
            </h5>
            <div className="mt-15">
              <p className="policy-link-mmt no-margin">Refundable (IRCTC rules)</p>
              <p className="label-text-dim" style={{ marginTop: "5px" }}>
                Subject to IRCTC time-based norms.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="card-v4 glass-warning">
        <h3>
          <span>NOTE</span> Important Information
        </h3>
        <ul className="info-mini-grid" style={{ listStyle: "none", padding: 0 }}>
          <li className="label-text-dim mt-15" style={{ color: "rgba(255,255,255,0.6)" }}>
            - Carry valid ID proof.
          </li>
          <li className="label-text-dim mt-15" style={{ color: "rgba(255,255,255,0.6)" }}>
            - Tickets are non-transferable.
          </li>
          <li className="label-text-dim mt-15" style={{ color: "rgba(255,255,255,0.6)" }}>
            - Verify platform status regularly.
          </li>
        </ul>
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

export default TrainReview;
