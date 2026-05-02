import React from 'react';
import './CabDetailsModal.css';
import { getCabPricingBreakdown } from '../../../../utils/cabBooking';
import { formatCurrency } from '../../../../utils/currency';

const CabDetailsModal = ({ cab, distance, hasRouteDetails, onClose, onBook }) => {
  if (!cab) return null;

  const pricing = getCabPricingBreakdown(cab, distance);

  return (
    <div className="cab-details-modal-overlay" onClick={onClose}>
      <div className="cab-details-modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close-btn" onClick={onClose} aria-label="Close cab details">
          x
        </button>

        <div className="modal-header">
          <div className="modal-header-badge">{cab.categoryLabel}</div>
          <h2>{cab.name}</h2>
          <p className="modal-subtitle">{cab.description}</p>
          <div className="modal-rating">
            <span>Star {cab.rating}</span>
            <span className={`modal-availability ${cab.available ? 'available' : 'unavailable'}`}>
              {cab.available ? 'Available now' : 'Currently unavailable'}
            </span>
          </div>
        </div>

        <div className="modal-content">
          <div className="modal-section">
            <h3>Vehicle details</h3>
            <div className="detail-grid">
              <div className="detail-item">
                <span className="detail-label">Seating Capacity</span>
                <span className="detail-value">{cab.seats} passengers</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Luggage Space</span>
                <span className="detail-value">{cab.luggage}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Vehicle Type</span>
                <span className="detail-value">{cab.seats >= 6 ? 'SUV / MUV' : 'Sedan / City cab'}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">ETA</span>
                <span className="detail-value">{cab.eta}</span>
              </div>
            </div>
          </div>

          <div className="modal-section">
            <h3>Features and amenities</h3>
            <div className="features-grid">
              {cab.features.map((feature, index) => (
                <div key={index} className="feature-item">
                  <span className="feature-check">+</span>
                  <span>{feature}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="modal-section">
            <h3>Fare breakdown</h3>
            <div className="fare-details">
              <div className="fare-row">
                <span>Base Fare</span>
                <span>{formatCurrency(pricing.baseFare)}</span>
              </div>
              <div className="fare-row">
                <span>
                  {hasRouteDetails
                    ? `Distance Charge (${distance.toFixed(1)} km x ${formatCurrency(cab.perKmRate)}/km)`
                    : `Distance Charge (add route for ${formatCurrency(cab.perKmRate)}/km pricing)`}
                </span>
                <span>{formatCurrency(pricing.distanceCharge)}</span>
              </div>
              <div className="fare-row">
                <span>Service Fee</span>
                <span>{formatCurrency(pricing.serviceFee)}</span>
              </div>
              <div className="fare-row">
                <span>GST (5%)</span>
                <span>{formatCurrency(pricing.gst)}</span>
              </div>
              <div className="fare-row fare-total">
                <span>Total Fare</span>
                <span>{formatCurrency(pricing.total)}</span>
              </div>
            </div>
          </div>

          <div className="modal-section">
            <h3>Important information</h3>
            <div className="info-grid">
              <div className="info-item">
                <strong>Best For:</strong>
                <p>{cab.idealFor}</p>
              </div>
              <div className="info-item">
                <strong>Wait Time Policy:</strong>
                <p>{cab.waitTime}</p>
              </div>
              <div className="info-item">
                <strong>Dispatch Note:</strong>
                <p>{cab.dispatchNote}</p>
              </div>
            </div>
          </div>

          <div className="modal-note">
            <strong>Note:</strong> Tolls, parking charges, and state entry fees are not included and will be collected separately if applicable during your trip.
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn-modal-secondary" onClick={onClose}>
            Close
          </button>
          <button
            className="btn-modal-primary"
            onClick={() => onBook(cab)}
            disabled={!cab.available || !hasRouteDetails}
          >
            {cab.available
              ? hasRouteDetails
                ? `Book for ${formatCurrency(pricing.total)}`
                : 'Select route to book'
              : 'Currently Unavailable'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CabDetailsModal;
