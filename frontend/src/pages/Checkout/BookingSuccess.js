import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import "./BookingSuccess.css";
import FeedbackModal from "../User/components/FeedbackModal";
import { useToast } from "../../contexts/ToastContext";
import { useAuth } from "../../contexts/AuthContext";
import { formatCurrency } from "../../utils/currency";
import { formatTravelDate } from "../../utils/bookingDates";

const BOOKING_SUCCESS_STORAGE_KEY = "latest-booking-success";
const BOOKING_SUCCESS_PERSIST_KEY = "latest-booking-success-persist";
const BOOKING_SUCCESS_TTL_MS = 1000 * 60 * 60 * 24;

const readStoredSuccess = (storage, scopeKey) => {
    try {
        const saved = storage.getItem(BOOKING_SUCCESS_STORAGE_KEY);
        if (!saved) return null;

        const parsed = JSON.parse(saved);
        if (scopeKey && parsed?.scopeKey !== scopeKey) return null;

        return parsed?.data || parsed || null;
    } catch (error) {
        console.error("Failed to read stored booking success data:", error);
        return null;
    }
};

const readPersistedSuccess = (scopeKey) => {
    try {
        const saved = localStorage.getItem(BOOKING_SUCCESS_PERSIST_KEY);
        if (!saved) return null;

        const parsed = JSON.parse(saved);
        if (!parsed?.data || !parsed?.savedAt) return null;
        if (scopeKey && parsed.scopeKey !== scopeKey) return null;

        if (Date.now() - parsed.savedAt > BOOKING_SUCCESS_TTL_MS) {
            localStorage.removeItem(BOOKING_SUCCESS_PERSIST_KEY);
            return null;
        }

        return parsed.data;
    } catch (error) {
        console.error("Failed to read persisted booking success data:", error);
        return null;
    }
};

function BookingSuccess() {
    const location = useLocation();
    const navigate = useNavigate();
    const { user } = useAuth();
    const successScopeKey = user?._id || user?.email || "guest";
    const [storedSuccessData, setStoredSuccessData] = useState(() => (
        readStoredSuccess(sessionStorage, successScopeKey) || readPersistedSuccess(successScopeKey)
    ));
    const data = location.state || storedSuccessData;
    const [feedbackOpen, setFeedbackOpen] = useState(false);
    const { showToast } = useToast();

    useEffect(() => {
        if (!location.state) return;

        try {
            sessionStorage.setItem(BOOKING_SUCCESS_STORAGE_KEY, JSON.stringify({
                scopeKey: successScopeKey,
                data: location.state
            }));
            localStorage.setItem(BOOKING_SUCCESS_PERSIST_KEY, JSON.stringify({
                savedAt: Date.now(),
                scopeKey: successScopeKey,
                data: location.state
            }));
            setStoredSuccessData(location.state);
        } catch (error) {
            console.error("Failed to store booking success data:", error);
        }
    }, [location.state, successScopeKey]);

    useEffect(() => {
        if (!data) {
            navigate("/");
        }
    }, [data, navigate]);

    const {
        bookingType, title, amount, bookingId, basePrice, convenienceFee, discount, paymentMethod, passenger, details, date
    } = data || {};
    const displayTravelDate = formatTravelDate(
        details?.pickupDateTime || details?.checkIn || details?.travelDate || date,
        "TBD"
    );

    // Type Normalization
    const bType = (bookingType || '').toLowerCase();
    const feedbackHeadingMap = {
        flight: 'How was your flight booking experience?',
        flights: 'How was your flight booking experience?',
        hotel: 'How was your hotel booking experience?',
        hotels: 'How was your hotel booking experience?',
        train: 'How was your train booking experience?',
        trains: 'How was your train booking experience?',
        bus: 'How was your bus booking experience?',
        buses: 'How was your bus booking experience?',
        cab: 'How was your cab booking experience?',
        cabs: 'How was your cab booking experience?',
        package: 'How was your package booking experience?',
        packages: 'How was your package booking experience?'
    };
    const feedbackButtonMap = {
        flight: 'Rate Flight',
        flights: 'Rate Flight',
        hotel: 'Rate Hotel',
        hotels: 'Rate Hotel',
        train: 'Rate Train',
        trains: 'Rate Train',
        bus: 'Rate Bus',
        buses: 'Rate Bus',
        cab: 'Rate Cab',
        cabs: 'Rate Cab',
        package: 'Rate Package',
        packages: 'Rate Package'
    };
    
    // Formatting Helpers
    const formatDate = (dateStr) => {
        if (!dateStr) return 'TBD';
        return new Date(dateStr).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    };

    const formatTimeOrDateTime = (value) => {
        if (!value) return 'N/A';
        if (/^\d{1,2}:\d{2}$/.test(String(value).trim())) return value;
        return formatDate(value);
    };

    const feedbackBooking = useMemo(() => ({
        _id: bookingId,
        category: bookingType,
        title,
        travelDate: date,
        details,
        flight: bType === 'flight' || bType === 'flights'
            ? {
                from: details?.from,
                to: details?.to
            }
            : undefined,
        train: bType === 'train' || bType === 'trains'
            ? {
                from: details?.from,
                to: details?.to
            }
            : undefined,
        bus: bType === 'bus' || bType === 'buses'
            ? {
                from: details?.from,
                to: details?.to
            }
            : undefined,
        cab: bType === 'cab' || bType === 'cabs'
            ? {
                pickupLocation: details?.pickupLocation,
                dropLocation: details?.dropLocation
            }
            : undefined,
        hotel: bType === 'hotel' || bType === 'hotels'
            ? {
                name: title,
                location: {
                    city: details?.location
                }
            }
            : undefined,
        package: bType === 'package' || bType === 'packages'
            ? {
                title
            }
            : undefined
    }), [bookingId, bookingType, title, date, details, bType]);

    useEffect(() => {
        if (!bookingId) return undefined;

        const promptKey = `booking-feedback-prompt-${bookingId}`;
        if (sessionStorage.getItem(promptKey) === 'shown') return undefined;

        const timer = window.setTimeout(() => {
            setFeedbackOpen(true);
            sessionStorage.setItem(promptKey, 'shown');
        }, 900);

        return () => window.clearTimeout(timer);
    }, [bookingId]);

    useEffect(() => {
        if (!bookingId) return;

        const toastKey = `booking-success-toast-${bookingId}`;
        if (sessionStorage.getItem(toastKey) === 'shown') return;

        showToast({
            type: "success",
            title: "Booking completed successfully",
            message: "Your payment is complete and your ticket details are ready."
        });
        sessionStorage.setItem(toastKey, "shown");
    }, [bookingId, showToast]);

    if (!data) {
        return (
            <div className="loading-state">
                <div className="loading-spinner-mmt"></div>
            </div>
        );
    }

    return (
        <div className="bs-page">
            <div className="bs-container">
                
                {/* Success Header */}
                <div className="bs-header-box">
                    <div className="bs-confetti">DONE</div>
                    <div className="bs-check">OK</div>
                    <h1>Booking Confirmed!</h1>
                    <p>Thank you for choosing MakeMyTrip. Your E-Ticket has been sent to <strong>{passenger?.email || 'your email'}</strong>.</p>
                </div>

                {/* Ticket Boarding Pass */}
                <div className="bs-ticket">
                    
                    {/* Ticket Header */}
                    <div className="bs-t-header">
                        <div className="bs-t-brand">
                            <span className="logo-text">MakeMyTrip</span>
                        </div>
                        <div className="bs-t-status">
                            <span>STATUS</span>
                            <strong>CONFIRMED</strong>
                        </div>
                    </div>

                    <div className="bs-t-body">
                        
                        {/* Essential Reference Info */}
                        <div className="bs-t-row bs-t-refs">
                            <div>
                                <label>BOOKING ID</label>
                                <strong>{bookingId}</strong>
                            </div>
                            {details?.pnr && (
                                <div>
                                    <label>PNR NUMBER</label>
                                    <strong className="bs-text-blue">{details.pnr}</strong>
                                </div>
                            )}
                            <div>
                                <label>BOOKING DATE</label>
                                <strong>{new Date(date || new Date()).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</strong>
                            </div>
                        </div>

                        {/* Divider */}
                        <div className="bs-divider"></div>

                        {/* Passenger Info (List) */}
                        <div className="bs-t-row">
                            <div className="bs-passengers">
                                <label>PASSENGER DETAILS</label>
                                <div className="bs-p-list">
                                    {(data.passengers || [passenger]).map((p, idx) => (
                                        <div className="bs-p-card" key={idx}>
                                            <div className="bs-p-avatar">USER</div>
                                            <div className="bs-p-info">
                                                <p className="bs-p-name">{p?.name || 'Primary Guest'}</p>
                                                <p className="bs-p-contact">
                                                    {p?.seat && <strong className="bs-seat-tag">SEAT: {p.seat}</strong>}
                                                    {p?.gender && ` | ${p.gender.toUpperCase()}`}
                                                    {p?.age && ` | ${p.age} YRS`}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Divider */}
                        <div className="bs-divider"></div>

                        {/* Journey/Service Details (Dynamic by Type) */}
                        <div className="bs-j-sec">
                            <label>JOURNEY DETAILS</label>
                            <p className="label-text-dim" style={{ margin: "10px 0 18px" }}>
                                Travel Date: <strong style={{ color: "white" }}>{displayTravelDate}</strong>
                            </p>
                            
                            {/* FLIGHTS */}
                            {(bType === 'flights' || bType === 'flight') && (
                                <div className="bs-route-box">
                                    <div className="bs-r-point">
                                        <h4>{details?.from || 'Origin'}</h4>
                                        <p>{formatTimeOrDateTime(details?.departureTime)}</p>
                                    </div>
                                    <div className="bs-r-line">
                                        <span>FLT</span>
                                        <div className="line"></div>
                                        <p>{details?.flightNumber || 'FLIGHT'} | {details?.airline || title}</p>
                                    </div>
                                    <div className="bs-r-point bs-right">
                                        <h4>{details?.to || 'Destination'}</h4>
                                        <p>{formatTimeOrDateTime(details?.arrivalTime)}</p>
                                    </div>
                                </div>
                            )}

                            {/* CABS */}
                            {(bType === 'cabs' || bType === 'cab') && (
                                <div className="bs-route-box">
                                    <div className="bs-r-point">
                                        <h4>{details?.pickupLocation || 'Pickup'}</h4>
                                        <p>{details?.pickupDateTime ? formatDate(details.pickupDateTime) : 'N/A'}</p>
                                    </div>
                                    <div className="bs-r-line cab">
                                        <span>CAB</span>
                                        <div className="line"></div>
                                        <p>{details?.cabType || title} | {details?.distance ? `${details.distance} km` : ''}</p>
                                    </div>
                                    <div className="bs-r-point bs-right">
                                        <h4>{details?.dropLocation || 'Drop'}</h4>
                                    </div>
                                </div>
                            )}

                            {/* TRAINS & BUSES */}
                            {(bType === 'trains' || bType === 'train' || bType === 'bus' || bType === 'buses') && (
                                <div className="bs-route-box">
                                    <div className="bs-r-point">
                                        <h4>{details?.from || 'Source'}</h4>
                                        <p>{details?.departureTime || 'TBD'}</p>
                                    </div>
                                    <div className="bs-r-line train-bus">
                                        <span>{bType.includes('train') ? 'TRN' : 'BUS'}</span>
                                        <div className="line"></div>
                                        <p>{title}</p>
                                    </div>
                                    <div className="bs-r-point bs-right">
                                        <h4>{details?.to || 'Destination'}</h4>
                                        <p>{details?.arrivalTime || 'TBD'}</p>
                                    </div>
                                </div>
                            )}

                            {/* HOTELS */}
                            {(bType === 'hotels' || bType === 'hotel') && (
                                <div className="bs-h-box">
                                    <h4>{title}</h4>
                                    <div className="bs-h-grid">
                                        <div>
                                            <p className="lbl">CHECK-IN</p>
                                            <p className="val">{details?.checkIn || 'TBD'}</p>
                                        </div>
                                        <div>
                                            <p className="lbl">CHECK-OUT</p>
                                            <p className="val">{details?.checkOut || 'TBD'}</p>
                                        </div>
                                        <div>
                                            <p className="lbl">GUESTS</p>
                                            <p className="val">{details?.guests ? `${details.guests} Guest(s)` : 'TBD'}</p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* PACKAGES */}
                            {(bType === 'packages' || bType === 'package') && (
                                <div className="bs-h-box">
                                    <h4>{title}</h4>
                                    <div className="bs-h-grid">
                                        <div>
                                            <p className="lbl">CHECK-IN</p>
                                            <p className="val">{details?.checkIn || 'TBD'}</p>
                                        </div>
                                        <div>
                                            <p className="lbl">CHECK-OUT</p>
                                            <p className="val">{details?.checkOut || 'TBD'}</p>
                                        </div>
                                        <div>
                                            <p className="lbl">ROOMS/PAX</p>
                                            <p className="val">{details?.rooms ? `${details.rooms} Room(s)` : ''} {details?.guests ? `${details.guests} Guest(s)` : ''}</p>
                                        </div>
                                    </div>
                                </div>
                            )}
                            
                            {/* Seat/Class Info (if available in details) */}
                            {(details?.seats || details?.class || details?.coach) && (
                                <div className="bs-seat-info">
                                    {details?.class && <span><strong>CLASS:</strong> {details.class}</span>}
                                    {details?.coach && <span><strong>COACH:</strong> {details.coach}</span>}
                                    {details?.seats && <span><strong>SEAT(S):</strong> {typeof details.seats === 'object' ? details.seats.join(', ') : details.seats}</span>}
                                </div>
                            )}
                        </div>

                        {/* Divider */}
                        <div className="bs-divider dashed"></div>

                        {/* Payment Summary */}
                        <div className="bs-pay-sec">
                            <label>PAYMENT SUMMARY | <span style={{textTransform:'uppercase'}}>{paymentMethod || 'Online'}</span></label>
                            
                            <div className="bs-pay-flex">
                                <div className="bs-pay-breakdown">
                                    <div className="bs-pb-row">
                                        <span>Base Fare</span>
                                        <span>{formatCurrency(basePrice || amount)}</span>
                                    </div>
                                    <div className="bs-pb-row">
                                        <span>Fees & Taxes</span>
                                        <span>{formatCurrency(convenienceFee || 0)}</span>
                                    </div>
                                    {(discount > 0) && (
                                        <div className="bs-pb-row discount">
                                            <span>Promo Discount</span>
                                            <span>- {formatCurrency(discount)}</span>
                                        </div>
                                    )}
                                </div>
                                
                                <div className="bs-pay-total">
                                    <p>TOTAL AMOUNT PAID</p>
                                    <h3>{formatCurrency(amount)} <span className="bs-count-tag">({(data.passengers || [passenger]).length} Total)</span></h3>
                                </div>
                            </div>
                        </div>

                    </div>

                    {/* Ticket Footer */}
                    <div className="bs-t-footer">
                        <p>This is a computer generated e-ticket. No signature is required.</p>
                    </div>

                </div>

                {/* Actions */}
                <div className="bs-actions-bar">
                    <Link to="/profile" className="bs-action-btn solid">
                        View My Trips
                    </Link>
                    <Link to="/" className="bs-action-btn outline">
                        Back to Home
                    </Link>
                </div>

                {/* Feedback Section */}
                <div className="bs-fb-container">
                    <div className="bs-fb-card-elite">
                        <div className="bs-fb-icon">RATE</div>
                        <div className="bs-fb-content">
                            <h4>{feedbackHeadingMap[bType] || 'How was your booking experience?'}</h4>
                            <p>Share booking-process feedback so we know whether the flow was smooth and whether you faced any issue.</p>
                        </div>
                        <button className="bs-fb-btn" onClick={() => setFeedbackOpen(true)}>
                            {feedbackButtonMap[bType] || 'Give Feedback'}
                        </button>
                    </div>
                </div>

                {feedbackOpen && (
                    <FeedbackModal 
                        booking={feedbackBooking}
                        onClose={() => setFeedbackOpen(false)} 
                        onSuccess={() => showToast({
                            type: "success",
                            title: "Feedback submitted",
                            message: "Thank you for sharing your booking experience."
                        })}
                        promptSource="booking_success"
                        autoPrompt
                    />
                )}

                <p className="bs-support">
                    Need help with your booking? Contact our 24/7 support at <strong>1-800-MMT-HELP</strong>
                </p>

            </div>
        </div>
    );
}

export default BookingSuccess;


