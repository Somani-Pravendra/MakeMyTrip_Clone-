import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../../contexts/ToastContext';
import { formatCurrency } from '../../utils/currency';
import './Offers.css';

function Offers() {
    const navigate = useNavigate();
    const { showToast } = useToast();
    const [activeTab, setActiveTab] = useState('All');

    const tabs = ['All', 'Flights', 'Hotels', 'Buses', 'Cabs', 'Bank Offers'];

    const offersList = [
        {
            id: 1,
            title: 'Flat 12% OFF on Domestic Flights',
            description: 'Use code MMTFLIGHT and get instant discount on all domestic flight bookings.',
            category: 'Flights',
            code: 'MMTFLIGHT',
            image: 'https://images.unsplash.com/photo-1436491865332-7a61a109c0f3?w=600&h=300&fit=crop',
            expiry: '31 Jan 2026'
        },
        {
            id: 2,
            title: `Up to ${formatCurrency(2000)} OFF on Hotels`,
            description: `Planning a staycation? Get up to ${formatCurrency(2000)} off on select premium hotels across India.`,
            category: 'Hotels',
            code: 'MMTHOTEL',
            image: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=600&h=300&fit=crop',
            expiry: '15 Feb 2026'
        },
        {
            id: 3,
            title: '15% Instant Discount with HDFC Bank',
            description: 'Use your HDFC Credit card to book and get 15% instant discount.',
            category: 'Bank Offers',
            code: 'HDFCMT',
            image: 'https://images.unsplash.com/photo-1542222024-c39e2281f143?w=600&h=300&fit=crop',
            expiry: '28 Feb 2026'
        },
        {
            id: 4,
            title: 'First Bus Booking: 20% OFF',
            description: `New to MMT? Book your first bus ticket and get 20% off up to ${formatCurrency(200)}.`,
            category: 'Buses',
            code: 'FIRSTBUS',
            image: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=600&h=300&fit=crop',
            expiry: '31 Mar 2026'
        },
        {
            id: 5,
            title: `Intl Flights: Save ${formatCurrency(5000)}`,
            description: 'Grab big savings on international flights to Dubai, Thailand and more.',
            category: 'Flights',
            code: 'INTLFLY',
            image: 'https://images.unsplash.com/photo-1530521954074-e64f6810b32d?w=600&h=300&fit=crop',
            expiry: '20 Jan 2026'
        },
        {
            id: 6,
            title: `Cab Rental: Flat ${formatCurrency(300)} OFF`,
            description: `Book outstation cabs and save ${formatCurrency(300)} on your round trip.`,
            category: 'Cabs',
            code: 'CAB300',
            image: 'https://images.unsplash.com/photo-1549194382-246df485452e?w=600&h=300&fit=crop',
            expiry: '25 Jan 2026'
        }
    ];

    const filteredOffers = activeTab === 'All'
        ? offersList
        : offersList.filter((offer) => offer.category === activeTab);

    const routesByCategory = {
        Flights: '/flights',
        Hotels: '/hotels',
        Buses: '/bus',
        Cabs: '/cabs',
        'Bank Offers': '/offers'
    };

    const copyCode = async (code) => {
        try {
            await navigator.clipboard.writeText(code);
            showToast({
                type: 'success',
                title: 'Code copied',
                message: `${code} is ready to use at checkout.`
            });
        } catch {
            showToast({
                type: 'error',
                title: 'Copy failed',
                message: 'Please copy the offer code manually.'
            });
        }
    };

    return (
        <div className="offers-page">
            <div className="offers-hero">
                <div className="container">
                    <h1>Exclusive Travel Offers</h1>
                    <p>Find the best deals on flights, hotels, and more!</p>
                </div>
            </div>

            <div className="container">
                <div className="tabs-container">
                    {tabs.map((tab) => (
                        <button
                            key={tab}
                            className={`tab-btn ${activeTab === tab ? 'active' : ''}`}
                            onClick={() => setActiveTab(tab)}
                        >
                            {tab}
                        </button>
                    ))}
                </div>

                <div className="offers-grid">
                    {filteredOffers.map((offer) => (
                        <div key={offer.id} className="offer-item-card">
                            <div className="offer-img-box">
                                <img src={offer.image} alt={offer.title} />
                                <span className="category-tag">{offer.category}</span>
                            </div>
                            <div className="offer-details">
                                <h3>{offer.title}</h3>
                                <p>{offer.description}</p>
                                <div className="offer-footer">
                                    <div className="promo-code-box" onClick={() => copyCode(offer.code)}>
                                        <span className="code-text">{offer.code}</span>
                                        <span className="copy-hint">COPY</span>
                                    </div>
                                    <span className="expiry-date">Expires: {offer.expiry}</span>
                                </div>
                                <button
                                    className="book-now-btn"
                                    onClick={() => navigate(routesByCategory[offer.category] || '/')}
                                >
                                    Book Now
                                </button>
                            </div>
                        </div>
                    ))}
                </div>

                {filteredOffers.length === 0 && (
                    <div className="no-offers">
                        <p>No offers found for this category at the moment. Check back later!</p>
                    </div>
                )}
            </div>
        </div>
    );
}

export default Offers;
