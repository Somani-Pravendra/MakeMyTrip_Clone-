import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../../../utils/api';
import { useToast } from '../../../contexts/ToastContext';
import './FeedbackModal.css';

const normalizeCategoryLabel = (category = '') => {
  const value = String(category).trim().toLowerCase();
  if (value === 'flights' || value === 'flight') return 'Flight';
  if (value === 'hotels' || value === 'hotel') return 'Hotel';
  if (value === 'trains' || value === 'train') return 'Train';
  if (value === 'buses' || value === 'bus') return 'Bus';
  if (value === 'cabs' || value === 'cab') return 'Cab';
  if (value === 'packages' || value === 'package' || value === 'holiday') return 'Package';
  return 'Booking';
};

const normalizeCategoryKey = (category = '') => {
  const value = String(category).trim().toLowerCase();
  if (value === 'flights' || value === 'flight') return 'flight';
  if (value === 'hotels' || value === 'hotel') return 'hotel';
  if (value === 'trains' || value === 'train') return 'train';
  if (value === 'buses' || value === 'bus') return 'bus';
  if (value === 'cabs' || value === 'cab') return 'cab';
  if (value === 'packages' || value === 'package' || value === 'holiday') return 'package';
  return 'booking';
};

const CATEGORY_OPTIONS = [
  { value: 'flight', label: 'Flight' },
  { value: 'hotel', label: 'Hotel' },
  { value: 'train', label: 'Train' },
  { value: 'bus', label: 'Bus' },
  { value: 'cab', label: 'Cab' },
  { value: 'package', label: 'Package' },
  { value: 'booking', label: 'Booking' }
];

const getBookingSummary = (booking) => {
  const category = String(booking?.category || '').toLowerCase();

  if (category.includes('hotel')) {
    const hotelName = booking?.hotel?.name || booking?.title || 'Hotel stay';
    const city = booking?.hotel?.location?.city || booking?.details?.location || '';
    return city ? `${hotelName} (${city})` : hotelName;
  }

  if (category.includes('cab')) {
    const pickup = booking?.cab?.pickupLocation || booking?.details?.pickupLocation || booking?.from || 'Pickup';
    const drop = booking?.cab?.dropLocation || booking?.details?.dropLocation || booking?.to || 'Drop';
    return `${pickup} -> ${drop}`;
  }

  if (category.includes('package')) {
    return booking?.package?.title || booking?.title || 'Holiday package';
  }

  const from = booking?.flight?.from || booking?.train?.from || booking?.bus?.from || booking?.details?.from || booking?.from || 'Origin';
  const to = booking?.flight?.to || booking?.train?.to || booking?.bus?.to || booking?.details?.to || booking?.to || 'Destination';
  return `${from} -> ${to}`;
};

const getTravelDateLabel = (booking) => {
  const category = String(booking?.category || '').toLowerCase();

  if (category.includes('hotel')) return booking?.details?.checkOut || booking?.travelDate || '';
  if (category.includes('cab')) return booking?.details?.pickupDateTime || booking?.travelDate || '';
  return booking?.travelDate || booking?.details?.departureTime || booking?.bookingDate || '';
};

const renderStars = (rating) =>
  [1, 2, 3, 4, 5].map((star) => ({
    key: star,
    active: rating >= star
  }));

const FeedbackModal = ({
  booking,
  onClose,
  onSuccess = () => {},
  promptSource = 'profile',
  autoPrompt = false
}) => {
  const categoryKey = normalizeCategoryKey(booking?.category);
  const bookingLabel = normalizeCategoryLabel(booking?.category);
  const { showToast } = useToast();
  const [rating, setRating] = useState(5);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [existingFeedback, setExistingFeedback] = useState(null);
  const [fetchLoading, setFetchLoading] = useState(true);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  useEffect(() => {
    const fetchFeedback = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get(`${API_BASE_URL}/feedback/booking/${booking._id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (res.data.exists) {
          const feedback = res.data.feedback;
          setExistingFeedback(feedback);
          setRating(feedback.rating || 5);
          setMessage(feedback.message || '');
        }
      } catch (err) {
        console.error('Error fetching feedback:', err);
      } finally {
        setFetchLoading(false);
      }
    };

    fetchFeedback();
  }, [booking._id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (existingFeedback) return;

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${API_BASE_URL}/feedback`,
        {
          bookingId: booking._id,
          rating,
          message,
          submittedFrom: promptSource
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      onSuccess();
      onClose();
    } catch (err) {
      showToast({
        type: 'error',
        title: 'Feedback submission failed',
        message: err.response?.data?.message || 'Failed to submit feedback'
      });
    } finally {
      setLoading(false);
    }
  };

  if (fetchLoading) return null;

  return (
    <div className="feedback-overlay" onClick={onClose}>
      <div className="feedback-modal card-v4" onClick={(e) => e.stopPropagation()}>
        <button className="close-btn-ins" onClick={onClose}>
          &times;
        </button>

        {autoPrompt && !existingFeedback && (
          <div className="feedback-auto-banner">
            <strong>Booking confirmed.</strong> Share your booking experience while it is still fresh.
          </div>
        )}

        <h3>
          <span>&#9733;</span> {existingFeedback ? 'Your Booking Feedback' : 'Booking Experience Feedback'}
        </h3>
        <p className="subtitle-ins">Normal feedback form for all bookings.</p>

        <div className="booking-mini-info">
          <p>
            <strong>{bookingLabel}</strong> | ID: {String(booking._id || '').slice(-8).toUpperCase()}
          </p>
          <p className="dim-text">{getBookingSummary(booking)}</p>
          {getTravelDateLabel(booking) && (
            <p className="dim-text">
              Travel Date: {new Date(getTravelDateLabel(booking)).toLocaleString('en-IN')}
            </p>
          )}
        </div>

        {existingFeedback ? (
          <div className="feedback-view-mode">
            <div className="feedback-question-block">
              <label>Category</label>
              <select className="form-input feedback-select" value={categoryKey} disabled>
                {CATEGORY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="rating-selector">
              {renderStars(rating).map((star) => (
                <span key={star.key} className={`star-btn ${star.active ? 'active' : ''}`}>
                  &#9733;
                </span>
              ))}
              <span className="rating-text">({rating}/5)</span>
            </div>

            <div className="feedback-summary-card mt-20">
              <div className="feedback-summary-row">
                <span className="feedback-summary-label">Category</span>
                <strong className="feedback-summary-value">{bookingLabel}</strong>
              </div>
              <div className="feedback-summary-row">
                <span className="feedback-summary-label">Description</span>
                <p className="feedback-summary-message">{message || 'No description provided.'}</p>
              </div>
            </div>

            <div className="feedback-view-note mt-20">
              <p className="feedback-note">
                Thank you for sharing your booking experience. Existing feedback is view-only.
              </p>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="feedback-form">
            <div className="feedback-question-block">
              <label>Category</label>
              <select className="form-input feedback-select" value={categoryKey} disabled>
                {CATEGORY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="rating-selector">
              {renderStars(rating).map((star) => (
                <button
                  key={star.key}
                  type="button"
                  className={`star-btn ${star.active ? 'active' : ''}`}
                  onClick={() => setRating(star.key)}
                >
                  &#9733;
                </button>
              ))}
              <span className="rating-text">({rating}/5)</span>
            </div>

            <div className="form-group mt-20">
              <label>Description (Optional)</label>
              <textarea
                className="form-input textArea"
                placeholder="Share anything about the booking experience."
                rows="4"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                maxLength={1000}
              />
            </div>

            <button type="submit" className="booking-btn-primary mt-30 w-100" disabled={loading}>
              {loading ? 'SUBMITTING...' : 'SUBMIT FEEDBACK'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default FeedbackModal;
