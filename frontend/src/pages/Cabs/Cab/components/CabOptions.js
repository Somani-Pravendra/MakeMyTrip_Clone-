import React, { useState } from 'react';
import './CabOptions.css';
import { getCabPricingBreakdown } from '../../../../utils/cabBooking';
import { formatCurrency } from '../../../../utils/currency';
import CabDetailsModal from './CabDetailsModal';

const CabVisual = ({ cab }) => (
  <div className={`cab-visual cab-visual--${cab.categoryLabel.toLowerCase().replace(/\s+/g, '-')}`}>
    <div className="cab-visual__badge">{cab.categoryLabel}</div>
    <div className="cab-visual__type">{cab.seats >= 6 ? 'SUV / MUV' : 'CITY CAB'}</div>
    <p>{cab.idealFor}</p>
  </div>
);

const CabOptions = ({
  cabTypes,
  onCabSelect,
  distance,
  hasRouteDetails = distance > 0,
  isLoading,
  errorMessage
}) => {
  const [selectedCabForDetails, setSelectedCabForDetails] = useState(null);

  if (isLoading) {
    return (
      <div className="cab-options">
        <div className="options-header">
          <h3>Available cabs</h3>
          <p>Matching vehicles for your route are loading.</p>
        </div>
        <div className="cab-options__state">Fetching live cab categories...</div>
      </div>
    );
  }

  if (errorMessage) {
    return (
      <div className="cab-options">
        <div className="options-header">
          <h3>Available cabs</h3>
          <p>Cab categories could not be loaded right now.</p>
        </div>
        <div className="cab-options__state cab-options__state--error">{errorMessage}</div>
      </div>
    );
  }

  if (!cabTypes.length) {
    return (
      <div className="cab-options">
        <div className="options-header">
          <h3>Available cabs</h3>
          <p>No cab categories are active right now.</p>
        </div>
        <div className="cab-options__state">
          Try again in a moment or verify that cab categories are active in the backend.
        </div>
      </div>
    );
  }

  return (
    <div className="cab-options">
      <div className="cab-grid">
        {cabTypes.map((cab) => {
          const pricing = getCabPricingBreakdown(cab, distance);
          const isDisabled = !cab.available;

          return (
            <article key={cab.id} className={`cab-card ${isDisabled ? 'disabled' : ''}`}>
              <CabVisual cab={cab} />

              <div className="cab-info">
                <div className="cab-header">
                  <div>
                    <div className="cab-title-row">
                      <h4>{cab.name}</h4>
                      <span className="cab-rating">Rated {cab.rating}</span>
                    </div>
                    <p className="cab-description">{cab.description}</p>
                  </div>

                  <div className={`availability-badge ${cab.available ? 'available' : 'unavailable'}`}>
                    {cab.available ? 'Available now' : 'Currently unavailable'}
                  </div>
                </div>

                <div className="cab-meta-row">
                  <span>{cab.seats} seats</span>
                  <span>{cab.luggage}</span>
                  <span>{cab.eta} away</span>
                  <span>{Math.max(Math.round(distance * 2.3) + 8, 12)} min trip</span>
                </div>

                <div className="cab-features">
                  {cab.features.slice(0, 4).map((feature) => (
                    <span key={feature} className="feature">
                      {feature}
                    </span>
                  ))}
                </div>

                <div className="cab-notes">
                  <div>
                    <strong>Best for</strong>
                    <span>{cab.idealFor}</span>
                  </div>
                  <div>
                    <strong>Ride policy</strong>
                    <span>{cab.waitTime}</span>
                  </div>
                  <div>
                    <strong>Dispatch note</strong>
                    <span>{cab.dispatchNote}</span>
                  </div>
                </div>
              </div>

              <div className="cab-pricing">
                <div className="price-info">
                  <div className="fare-amount">{formatCurrency(pricing.total)}</div>
                  <div className="fare-breakdown">
                    {formatCurrency(pricing.rideFare)} fare + {formatCurrency(pricing.serviceFee + pricing.gst)} taxes and fees
                  </div>
                  <div className="per-km-note">
                    Base {formatCurrency(pricing.baseFare)} | {formatCurrency(cab.perKmRate)}/km
                  </div>
                </div>

                <div className="cab-action-buttons">
                  <button
                    type="button"
                    className="view-details-btn"
                    onClick={() => setSelectedCabForDetails(cab)}
                  >
                    View Details
                  </button>
                  <button
                    type="button"
                    className="select-cab-btn"
                    onClick={() => !isDisabled && onCabSelect(cab)}
                    disabled={isDisabled}
                  >
                    {isDisabled ? 'Unavailable' : 'Book now'}
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      <div className="options-footer">
        <div className="info-note">
          The final fare includes all platform fees and GST. Additional charges like tolls,
          parking, and state entry fees are collected separately only when applicable during your trip.
        </div>
      </div>

      {selectedCabForDetails && (
        <CabDetailsModal
          cab={selectedCabForDetails}
          distance={distance}
          hasRouteDetails={hasRouteDetails}
          onClose={() => setSelectedCabForDetails(null)}
          onBook={(selectedCab) => {
            setSelectedCabForDetails(null);
            onCabSelect(selectedCab);
          }}
        />
      )}
    </div>
  );
};

export default CabOptions;
