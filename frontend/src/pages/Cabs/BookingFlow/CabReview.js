import React from 'react';
import { formatCabDuration, getCabPricingBreakdown } from '../../../utils/cabBooking';
import { formatCurrency } from '../../../utils/currency';
import { formatTravelDate, formatTravelDateTime } from '../../../utils/bookingDates';

const formatRideDateTime = (pickupDateTime) => {
  return formatTravelDateTime(pickupDateTime, 'Pickup Pending');
};

const CabReview = ({ data, onNext, onBack }) => {
  const selectedCab = data.selectedCab || data.cab || {};
  const pricing = data.fareBreakdown || getCabPricingBreakdown(selectedCab, data.distance || 0);

  return (
    <div className="cab-review-step elite-design-v4">
      {/* ── SELECTION OVERVIEW ── */}
      <div className="card-v4 premium-glass">
        <div className="section-header-row">
          <div className="label-col">
            <span className="elite-badge">Selection Confirmed</span>
            <h3 className="no-margin mt-10"><span>Review</span> Your Cab Selection</h3>
          </div>
          <div className="price-row-v4">
             <span className="label-text-dim">Est. Total</span>
             <span className="total-amt" style={{ fontSize: '28px' }}>{formatCurrency(pricing.total)}</span>
          </div>
        </div>

        <div className="elite-review-grid mt-30">
          <div className="elite-review-item">
            <p className="label-text-dim">CATEGORY</p>
            <p className="white-bold no-margin" style={{ fontSize: '18px' }}>
              {selectedCab.name || 'Cab'}
            </p>
            <p className="cyan-highlight mt-5 no-margin" style={{ fontSize: '12px' }}>
              {selectedCab.seats || 4} Seater | AC
            </p>
          </div>
          <div className="elite-review-item">
            <p className="label-text-dim">SCHEDULED FOR</p>
            <p className="white-bold no-margin" style={{ fontSize: '18px' }}>
              {formatRideDateTime(data.pickupDateTime)}
            </p>
            <p className="label-text-dim mt-5 no-margin" style={{ fontSize: '12px', textTransform: 'none' }}>
              Travel Date: {formatTravelDate(data.pickupDateTime || data.travelDate, 'Select date')}
            </p>
            <p className="label-text-dim mt-5 no-margin" style={{ fontSize: '12px', textTransform: 'none' }}>
              Approx. {formatCabDuration(data.duration || 0)} ride
            </p>
          </div>
        </div>

        {/* ── ROUTE VISUALIZATION ── */}
        <div className="elite-route-indicator mt-40">
          <div className="route-point">
            <div className="city-code-lrg" style={{ fontSize: '28px' }}>PICKUP</div>
            <div className="station-name-mini">{data.pickupLocation || 'Source'}</div>
          </div>

          <div className="route-line-shell">
            <div className="route-ship-icon">🚕</div>
            <div className="route-duration-pill">{Number(data.distance || 0).toFixed(1)} KM</div>
          </div>

          <div className="route-point">
            <div className="city-code-lrg" style={{ fontSize: '28px' }}>DROP</div>
            <div className="station-name-mini">{data.dropLocation || 'Destination'}</div>
          </div>
        </div>
      </div>

      {/* ── INCLUSIONS & NOTES ── */}
      <div className="card-v4 premium-glass mt-24">
        <div className="section-header-row">
          <h3><span>📝</span> Important Inclusions & Notes</h3>
        </div>
        
        <div className="elite-review-grid" style={{ marginBottom: 0 }}>
          <div className="elite-review-item" style={{ borderStyle: 'dashed' }}>
             <p className="white-bold" style={{ fontSize: '15px' }}>✅ INCLUDED</p>
             <ul className="info-text-sm-dim no-margin mt-10" style={{ paddingLeft: '18px' }}>
               <li>Base fare for {Number(data.distance || 0).toFixed(1)} km</li>
               <li>Driver allowance & loading</li>
               <li>Goods & Services Tax (GST)</li>
               <li>Secure booking processing</li>
             </ul>
          </div>
          <div className="elite-review-item" style={{ borderStyle: 'dashed' }}>
             <p className="white-bold" style={{ fontSize: '15px' }}>⚠️ NOT INCLUDED</p>
             <ul className="info-text-sm-dim no-margin mt-10" style={{ paddingLeft: '18px' }}>
               <li>Tolls & State Taxes (per actuals)</li>
               <li>Parking charges if applicable</li>
               <li>Late night surcharges (if any)</li>
               <li>Extra baggage/waiting time</li>
             </ul>
          </div>
        </div>
      </div>

      {/* ── ACTIONS ── */}
      <div className="booking-actions-shell mt-40">
        <button className="btn-elite-outline" onClick={onBack}>
          <span>←</span> Back to Search
        </button>
        <button className="btn-elite-primary" onClick={onNext} style={{ minWidth: '280px' }}>
          CONFIRM TRAVELLERS <span>-&gt;</span>
        </button>
      </div>
    </div>
  );
};

export default CabReview;
