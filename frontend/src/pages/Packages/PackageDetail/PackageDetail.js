import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../../../contexts/AuthContext";
import axios from "axios";
import { API_BASE_URL } from "../../../utils/api";
import { buildAuthRedirect } from "../../../utils/authRedirect";
import { applyImageFallback, MEDIA_FALLBACKS, resolveMediaUrl } from "../../../utils/media";
import { formatCurrency } from "../../../utils/currency";
import "./PackageDetail.css";

const API_URL = `${API_BASE_URL}/packages`;

const PackageDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { isAuthenticated } = useAuth();
    const [pkg, setPkg] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState("itinerary");

    const fetchPackage = useCallback(async () => {
        try {
            setLoading(true);
            const res = await axios.get(`${API_URL}/${id}`);
            setPkg(res.data);
        } catch (err) {
            console.error("Error fetching package details:", err);
            setPkg(null);
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => {
        window.scrollTo(0, 0);
        fetchPackage();
    }, [fetchPackage]);

    const handleBookNow = () => {
        if (!pkg) return;

        const bookingState = {
            packageId: pkg._id || id,
            package: pkg
        };

        if (!isAuthenticated) {
            const authRedirect = buildAuthRedirect("/packages/book", bookingState);
            navigate("/login", { state: { authRedirect } });
            return;
        }

        navigate("/packages/book", {
            state: bookingState
        });
    };

    if (loading) {
        return (
            <div className="pkg-detail-loading">
                <div className="elite-spinner"></div>
                <p>Curating your luxury experience...</p>
            </div>
        );
    }

    if (!pkg) {
        return (
            <div className="pkg-not-found">
                <h2>Package not found</h2>
                <button onClick={() => navigate("/packages")}>Back to Packages</button>
            </div>
        );
    }

    return (
        <div className="elite-package-detail">
            <section className="pkg-hero">
                <div className="pkg-hero-bg">
                    <img
                        src={resolveMediaUrl(pkg.thumbnailImage, MEDIA_FALLBACKS.package)}
                        alt={pkg.packageTitle}
                        onError={(event) => applyImageFallback(event, MEDIA_FALLBACKS.package)}
                    />
                    <div className="pkg-hero-overlay"></div>
                </div>
                <div className="mmt-container pkg-hero-content">
                    <div className="pkg-badge-row">
                        <span className="pkg-category-pill">{pkg.category}</span>
                        <span className="pkg-id-pill">ID: {pkg.packageId}</span>
                    </div>
                    <h1 className="pkg-title-main">{pkg.packageTitle}</h1>
                    <div className="pkg-quick-meta">
                        <span>Destination: {pkg.city}, {pkg.country}</span>
                        <span>Duration: {pkg.duration}</span>
                        <span>Rating: {pkg.rating} ({pkg.totalReviews} Reviews)</span>
                    </div>
                </div>
            </section>

            <div className="mmt-container pkg-main-layout">
                <div className="pkg-content-col">
                    <div className="pkg-nav-tabs">
                        <button
                            className={`tab-btn ${activeTab === "itinerary" ? "active" : ""}`}
                            onClick={() => setActiveTab("itinerary")}
                        >
                            <span>Day Plan</span> Itinerary
                        </button>
                        <button
                            className={`tab-btn ${activeTab === "inclusions" ? "active" : ""}`}
                            onClick={() => setActiveTab("inclusions")}
                        >
                            <span>Included</span> Inclusions
                        </button>
                        <button
                            className={`tab-btn ${activeTab === "gallery" ? "active" : ""}`}
                            onClick={() => setActiveTab("gallery")}
                        >
                            <span>Photos</span> Gallery
                        </button>
                        <button
                            className={`tab-btn ${activeTab === "reviews" ? "active" : ""}`}
                            onClick={() => setActiveTab("reviews")}
                        >
                            <span>Guest</span> Reviews
                        </button>
                    </div>

                    <div className="tab-panel-container">
                        {activeTab === "itinerary" && (
                            <div className="itinerary-panel fade-in">
                                <h3 className="panel-title">Your Planned Adventure</h3>
                                <div className="itinerary-timeline">
                                    {pkg.itinerary && pkg.itinerary.map((day, i) => (
                                        <div key={i} className="timeline-item">
                                            <div className="day-marker">
                                                <span className="day-circle">{day.day}</span>
                                                <div className="timeline-line"></div>
                                            </div>
                                            <div className="timeline-content card-v4 mini">
                                                <h4>{day.title}</h4>
                                                <p>{day.description}</p>
                                                {day.activities && (
                                                    <div className="day-activities">
                                                        {(typeof day.activities === "string"
                                                            ? day.activities.split(",")
                                                            : Array.isArray(day.activities) ? day.activities : []
                                                        ).map((act, j) => (
                                                            <span key={j} className="activity-tag">
                                                                Activity: {act.trim()}
                                                            </span>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {activeTab === "inclusions" && (
                            <div className="inclusions-panel fade-in">
                                <div className="policy-grid">
                                    <div className="policy-section inclusion-box card-v4 mini">
                                        <h4>Included in your package</h4>
                                        <ul className="pkg-info-list">
                                            {pkg.included && pkg.included.map((inc, i) => (
                                                <li key={i}><span>Included</span> {inc}</li>
                                            ))}
                                        </ul>
                                    </div>
                                    <div className="policy-section exclusion-box card-v4 mini">
                                        <h4>Not included</h4>
                                        <ul className="pkg-info-list">
                                            {pkg.excluded && pkg.excluded.map((exc, i) => (
                                                <li key={i}><span>Excluded</span> {exc}</li>
                                            ))}
                                        </ul>
                                    </div>
                                </div>
                                <div className="hotel-transport-info mt-30">
                                    <div className="info-card-elite">
                                        <span>Stay</span>
                                        <div>
                                            <h5>Accommodation</h5>
                                            <p>{pkg.hotelType}</p>
                                        </div>
                                    </div>
                                    <div className="info-card-elite">
                                        <span>Travel</span>
                                        <div>
                                            <h5>Transportation</h5>
                                            <p>{pkg.transportType}</p>
                                        </div>
                                    </div>
                                    <div className="info-card-elite">
                                        <span>Meals</span>
                                        <div>
                                            <h5>Meal Plan</h5>
                                            <p>{pkg.mealsIncluded}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === "gallery" && (
                            <div className="gallery-panel fade-in">
                                <h3 className="panel-title">Visual Sneak Peek</h3>
                                <div className="pkg-gallery-grid">
                                    {pkg.galleryImages && pkg.galleryImages.length > 0 ? (
                                        pkg.galleryImages.map((img, i) => (
                                            <div key={i} className="gallery-item-v4">
                                                <img
                                                    src={resolveMediaUrl(img, MEDIA_FALLBACKS.package)}
                                                    alt={`Gallery ${i}`}
                                                    loading="lazy"
                                                    onError={(event) => applyImageFallback(event, MEDIA_FALLBACKS.package)}
                                                />
                                            </div>
                                        ))
                                    ) : (
                                        <p className="no-gallery">No images available for this package.</p>
                                    )}
                                </div>
                            </div>
                        )}

                        {activeTab === "reviews" && (
                            <div className="reviews-panel fade-in">
                                <div className="reviews-header-v4">
                                    <div className="rating-summary-box">
                                        <span className="big-rating">{pkg.rating}</span>
                                        <div className="rating-meta">
                                            <div className="stars-row">Top rated package</div>
                                            <p>{pkg.totalReviews} Global Reviews</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="reviews-list-v4">
                                    {pkg.reviews && pkg.reviews.length > 0 ? (
                                        pkg.reviews.map((rev, i) => (
                                            <div key={i} className="review-card-elite card-v4 mini">
                                                <div className="rev-user-info">
                                                    <div className="user-avatar">{rev.userName?.charAt(0)}</div>
                                                    <div>
                                                        <h5>{rev.userName}</h5>
                                                        <span className="rev-stars">Rating {rev.rating}/5</span>
                                                    </div>
                                                </div>
                                                <p className="rev-comment">"{rev.comment}"</p>
                                            </div>
                                        ))
                                    ) : (
                                        <p className="no-reviews">No reviews yet for this package.</p>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div className="pkg-sidebar-col">
                    <div className="booking-card-elite sticky-top">
                        <div className="price-header">
                            <span className="price-label">Starting from</span>
                            <div className="price-row-main">
                                <h2 className="price-val">{formatCurrency(pkg.pricePerPerson || 0)}</h2>
                                <span className="pax-label">/ person</span>
                            </div>
                            {pkg.originalPrice > pkg.pricePerPerson && (
                                <div className="discount-info">
                                    <span className="old-price">{formatCurrency(pkg.originalPrice || 0)}</span>
                                    <span className="discount-pill">{pkg.discount}% OFF</span>
                                </div>
                            )}
                        </div>

                        <div className="booking-meta-list">
                            <div className="meta-item">
                                <span>Fast</span> Quick Confirmation
                            </div>
                            <div className="meta-item">
                                <span>Safe</span> Price Protection
                            </div>
                            <div className="meta-item">
                                <span>Elite</span> Best in Class Service
                            </div>
                        </div>

                        <button className="book-btn-flagship" onClick={handleBookNow}>
                            BOOK EXPERIENCE NOW
                        </button>

                        <p className="booking-trust-text">
                            Secure your dates now. Flexible cancellation available.
                        </p>
                    </div>

                    <div className="need-help-card mt-20">
                        <h4>Need Help Booking?</h4>
                        <p>Our travel experts are available 24/7 to help you curate your dream holiday.</p>
                        <a href="tel:18002003000" className="help-link">Call 1800-200-3000</a>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PackageDetail;
