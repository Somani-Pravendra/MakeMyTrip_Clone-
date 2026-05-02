import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { API_BASE_URL } from "../../utils/api";
import "./Home.css";

const ASSET_BASE_URL = API_BASE_URL.replace(/\/api\/?$/, "");

const HOME_IMAGE_FALLBACKS = {
  offer: "https://images.unsplash.com/photo-1502920917128-1aa500764cbd?auto=format&fit=crop&w=1200&q=80",
  package: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80",
  hotel: "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=1200&q=80",
  flight: "https://images.unsplash.com/photo-1436491865332-7a61a109cc05?auto=format&fit=crop&w=1200&q=80",
  train: "https://images.unsplash.com/photo-1474487548417-781cb71495f3?auto=format&fit=crop&w=1200&q=80",
  bus: "https://images.unsplash.com/photo-1544620347-c4fd4a3d5962?auto=format&fit=crop&w=1200&q=80"
};

const resolveMediaUrl = (value, fallback = "") => {
  const source = String(value || "").trim();
  if (!source) return fallback;
  if (/^https?:\/\//i.test(source) || source.startsWith("data:")) return source;
  if (source.startsWith("/")) return `${ASSET_BASE_URL}${source}`;
  return `${ASSET_BASE_URL}/${source.replace(/^\.?\//, "")}`;
};

const handleImageFallback = (event, fallback) => {
  if (!fallback || event.currentTarget.dataset.fallbackApplied === "true") return;
  event.currentTarget.dataset.fallbackApplied = "true";
  event.currentTarget.src = fallback;
};

const HomeImage = ({ src, alt, fallback, className = "" }) => (
  <img
    src={resolveMediaUrl(src, fallback)}
    alt={alt}
    className={className}
    loading="lazy"
    decoding="async"
    onError={(event) => handleImageFallback(event, fallback)}
  />
);

const getLowestRoomPrice = (hotel = {}) => {
  const roomPrices = Array.isArray(hotel.roomTypes)
    ? hotel.roomTypes
        .map((room) => Number(room?.pricePerNight))
        .filter((price) => Number.isFinite(price) && price > 0)
    : [];

  return roomPrices.length > 0 ? Math.min(...roomPrices) : 0;
};

const getLowestTrainFare = (train = {}) => {
  const classFares = Array.isArray(train.availableClasses)
    ? train.availableClasses
        .map((coach) => Number(coach?.fare))
        .filter((fare) => Number.isFinite(fare) && fare >= 0)
    : [];

  if (classFares.length > 0) {
    return Math.min(...classFares);
  }

  return Number(train.basePrice || train.price || 0);
};

function Home() {
  const navigate = useNavigate();
  const [visibleStats, setVisibleStats] = useState(false);
  const [packages, setPackages] = useState([]);
  const [flights, setFlights] = useState([]);
  const [hotels, setHotels] = useState([]);
  const [trains, setTrains] = useState([]);
  const [buses, setBuses] = useState([]);
  const statsRef = useRef(null);

  useEffect(() => {
    fetchData();
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisibleStats(true); },
      { threshold: 0.3 }
    );
    if (statsRef.current) observer.observe(statsRef.current);
    return () => observer.disconnect();
  }, []);

  const fetchData = async () => {
    try {
      const [pkgRes, fliRes, hotRes, traRes, busRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/packages`),
        axios.get(`${API_BASE_URL}/flights`),
        axios.get(`${API_BASE_URL}/hotels`),
        axios.get(`${API_BASE_URL}/trains`),
        axios.get(`${API_BASE_URL}/buses`)
      ]);
      setPackages(pkgRes.data.slice(0, 3));
      setFlights(fliRes.data.slice(0, 3));
      setHotels(hotRes.data.slice(0, 3).map((hotel) => ({
        ...hotel,
        hotelName: hotel.name,
        starRating: hotel.stars || hotel.rating || 3,
        city: hotel.location?.city || "",
        pricePerNight: getLowestRoomPrice(hotel),
        hotelImage: hotel.images?.[0] || ""
      })));
      setTrains(traRes.data.slice(0, 3).map((train) => ({
        ...train,
        name: train.trainName,
        basePrice: getLowestTrainFare(train),
        price: getLowestTrainFare(train)
      })));
      setBuses((busRes.data.data || busRes.data).slice(0, 3).map((bus) => ({
        ...bus,
        name: bus.operatorName,
        type: bus.busType
      })));
    } catch (err) {
      console.error("Error fetching home data:", err);
    }
  };

  const offers = [
    { title: 'Elite Member Deal', subtitle: 'Exclusive 25% OFF on Luxury Stays', discount: '25% OFF', image: 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=800&q=80' },
    { title: 'Private Jet Experience', subtitle: 'Starting at ₹2.5L / Hour', discount: 'NEW', image: 'https://images.unsplash.com/photo-1540962351504-03099e0a754b?w=800&q=80' },
    { title: 'Business Class Upgrade', subtitle: 'Get 50% extra miles this season', discount: 'MILES+', image: 'https://images.unsplash.com/photo-1569154941061-e231b4725ef1?w=800&q=80' },
  ];

  const trustStats = [
    { icon: '💎', value: '500K+', label: 'Elite Members' },
    { icon: '✨', value: '1M+', label: 'Verified Stays' },
    { icon: '🛡️', value: '100%', label: 'Secure Travel' },
    { icon: '🤝', value: '24/7', label: 'Concierge' },
  ];

  return (
    <div className="home-page">
      {/* ── Hero Section ─────────────────────────────────── */}
      <section className="hero-search-section">
        <div className="hero-bg-visual" />
        <div className="mmt-container">
          <div className="hero-content">
            <span className="hero-tagline">The Art of Travel</span>
            <h1 className="hero-title">Experience Infinite <br /> Horizons</h1>
            <p className="hero-subtitle">Bespoke journeys curated for the modern explorer.</p>

            <div className="elite-hero-categories">
              {[
                { 
                  label: 'Flights', 
                  icon: (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"></path>
                    </svg>
                  ), 
                  path: '/flights' 
                },
                { 
                  label: 'Hotels', 
                  icon: (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                      <polyline points="9 22 9 12 15 12 15 22"></polyline>
                    </svg>
                  ), 
                  path: '/hotels' 
                },
                { 
                  label: 'Trains', 
                  icon: (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="4" y="3" width="16" height="18" rx="2"></rect>
                      <line x1="9" y1="7" x2="15" y2="7"></line>
                      <line x1="9" y1="11" x2="15" y2="11"></line>
                      <line x1="9" y1="15" x2="15" y2="15"></line>
                    </svg>
                  ), 
                  path: '/trains' 
                },
                { 
                  label: 'Cabs', 
                  icon: (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                    </svg>
                  ), 
                  path: '/cabs' 
                },
                { 
                  label: 'Bus', 
                  icon: (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-1.1 0-2 .9-2 2v7h2"></path>
                      <circle cx="7" cy="17" r="2"></circle>
                      <path d="M9 17h6"></path>
                      <circle cx="17" cy="17" r="2"></circle>
                    </svg>
                  ), 
                  path: '/bus' 
                },
                { 
                  label: 'Holiday Packages', 
                  icon: (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 2L2 7l10 5 10-5-10-5z"></path>
                      <path d="M2 17l10 5 10-5"></path>
                      <path d="M2 12l10 5 10-5"></path>
                    </svg>
                  ), 
                  path: '/packages' 
                }
              ].map((cat, i) => (
                <Link key={i} to={cat.path} className="elite-cat-card">
                  <span className="elite-cat-icon">{cat.icon}</span>
                  <span className="elite-cat-label">{cat.label}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Trust Bar ──────────────────────────────────── */}
      <section className="trust-bar-v3" ref={statsRef}>
        <div className="mmt-container">
          <div className="trust-grid-v3">
            {trustStats.map((stat, i) => (
              <div key={i} className={`trust-item-v3 ${visibleStats ? 'visible' : ''}`} style={{ transitionDelay: `${i * 100}ms` }}>
                <span className="trust-icon-v3">{stat.icon}</span>
                <span className="trust-val-v3">{stat.value}</span>
                <span className="trust-lab-v3">{stat.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Private Offers ─────────────────────────────── */}
      <section className="section-v3">
        <div className="mmt-container">
          <div className="premium-header-v3">
            <div>
              <h2>Private Collections</h2>
              <p>Handpicked offers exclusively for our members.</p>
            </div>
            <Link to="/offers" className="view-all-premium">Explore All Collections →</Link>
          </div>

          <div className="premium-grid-v3">
            {offers.map((offer, i) => (
              <div key={i} className="card-v3">
                <div className="card-img-v3">
                  <HomeImage src={offer.image} fallback={HOME_IMAGE_FALLBACKS.offer} alt={offer.title} />
                  <span className="card-badge-v3">{offer.discount}</span>
                </div>
                <div className="card-body-v3">
                  <h4>{offer.title}</h4>
                  <p>{offer.subtitle}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Iconic Destinations (Packages) ───────────────────────── */}
      <section className="section-v3" style={{ background: 'rgba(255,255,255,0.02)' }}>
        <div className="mmt-container">
          <div className="premium-header-v3">
            <div>
              <h2>Iconic Escapes</h2>
              <p>Our most celebrated holiday packages around the globe.</p>
            </div>
            <Link to="/packages" className="view-all-premium">Explore All Holiday Packages →</Link>
          </div>

          <div className="ultra-dest-grid">
            {packages.map((pkg, i) => (
              <div key={i} className="ultra-dest-card" onClick={() => navigate(`/packages/${pkg._id}`)}>
                <HomeImage src={pkg.thumbnailImage} fallback={HOME_IMAGE_FALLBACKS.package} alt={pkg.packageTitle} />
                <div className="ultra-dest-meta">
                  <span className="ultra-dest-tag">{pkg.category || 'ELITE'}</span>
                  <h3>{pkg.packageTitle}</h3>
                  <p>{pkg.city}, {pkg.country}</p>
                  <div className="ultra-dest-price">
                    <span>From</span>
                    ₹{pkg.pricePerPerson?.toLocaleString('en-IN')}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Featured Flights ─────────────────────────────────────────── */}
      <section className="section-v3">
        <div className="mmt-container">
          <div className="premium-header-v3" style={{ borderColor: 'var(--secondary)' }}>
            <div>
              <h2>Business & First Class</h2>
              <p>Experience the skies in absolute luxury.</p>
            </div>
            <Link to="/flights" className="view-all-premium">View All Flights →</Link>
          </div>

          <div className="premium-grid-v3">
            {flights.map((f, i) => (
              <div key={i} className="card-v3" onClick={() => navigate('/flights')}>
                <div className="card-img-v3 card-img-v3--travel">
                  <HomeImage src={HOME_IMAGE_FALLBACKS.flight} fallback={HOME_IMAGE_FALLBACKS.flight} alt={f.airline} />
                  <span className="card-badge-v3">PREMIUM</span>
                  <div className="card-media-chip">{f.airline}</div>
                </div>
                <div className="card-body-v3">
                  <h4>{f.airline} • {f.flightNumber}</h4>
                  <p>{f.from} ✈ {f.to}</p>
                  <p style={{ fontWeight: 800, color: 'var(--secondary)', marginTop: '10px' }}>From ₹{(f.totalFare || f.basePrice)?.toLocaleString('en-IN')}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Top Hotels ─────────────────────────────────────────────── */}
      <section className="section-v3" style={{ background: 'rgba(255,255,255,0.02)' }}>
        <div className="mmt-container">
          <div className="premium-header-v3">
            <div>
              <h2>Royal Residences</h2>
              <p>Handpicked stays that define opulence.</p>
            </div>
            <Link to="/hotels" className="view-all-premium">Explore Stays →</Link>
          </div>

          <div className="ultra-dest-grid">
            {hotels.map((h, i) => (
              <div key={i} className="ultra-dest-card" onClick={() => navigate('/hotels')}>
                <HomeImage src={h.images?.[0] || h.hotelImage} fallback={HOME_IMAGE_FALLBACKS.hotel} alt={h.hotelName} />
                <div className="ultra-dest-meta">
                  <span className="ultra-dest-tag">{h.starRating} STAR</span>
                  <h3>{h.hotelName}</h3>
                  <p>{h.city}</p>
                  <div className="ultra-dest-price">
                    <span>Starts at</span>
                    ₹{h.pricePerNight?.toLocaleString('en-IN')}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Express Trains ─────────────────────────────────────────── */}
      <section className="section-v3">
        <div className="mmt-container">
          <div className="premium-header-v3">
            <div>
              <h2>Imperial Express</h2>
              <p>Journey through the heart of the country in style.</p>
            </div>
            <Link to="/trains" className="view-all-premium">Find Tickets →</Link>
          </div>

          <div className="premium-grid-v3">
            {trains.map((t, i) => (
              <div key={i} className="card-v3" onClick={() => navigate('/trains')}>
                <div className="card-img-v3 card-img-v3--travel">
                  <HomeImage src={HOME_IMAGE_FALLBACKS.train} fallback={HOME_IMAGE_FALLBACKS.train} alt={t.name} />
                  <span className="card-badge-v3">FASTEST</span>
                  <div className="card-media-chip">{t.trainNumber || 'TRAIN'}</div>
                </div>
                <div className="card-body-v3">
                  <h4>{t.name}</h4>
                  <p>{t.from} 🚆 {t.to}</p>
                  <p style={{ fontWeight: 800, color: 'var(--secondary)', marginTop: '10px' }}>Seats from ₹{t.basePrice || t.price}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Popular Buses ───────────────────────────────────────────── */}
      <section className="section-v3" style={{ background: 'rgba(255,255,255,0.02)' }}>
        <div className="mmt-container">
          <div className="premium-header-v3">
            <div>
              <h2>Luxury Coach</h2>
              <p>Inter-city travel reimagined for the elite.</p>
            </div>
            <Link to="/bus" className="view-all-premium">Book Bus →</Link>
          </div>

          <div className="premium-grid-v3">
            {buses.map((b, i) => (
              <div key={i} className="card-v3" onClick={() => navigate('/bus')}>
                <div className="card-img-v3 card-img-v3--travel">
                  <HomeImage src={HOME_IMAGE_FALLBACKS.bus} fallback={HOME_IMAGE_FALLBACKS.bus} alt={b.name} />
                  <span className="card-badge-v3">AC SLEEPER</span>
                  <div className="card-media-chip">{b.type || 'COACH'}</div>
                </div>
                <div className="card-body-v3">
                  <h4>{b.name} ({b.type})</h4>
                  <p>{b.from} 🚌 {b.to}</p>
                  <p style={{ fontWeight: 800, color: 'var(--secondary)', marginTop: '10px' }}>From ₹{(b.price)?.toLocaleString('en-IN')}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Testimonials ─────────────────────────────────── */}
      <section className="section-v3">
        <div className="mmt-container">
          <div className="premium-header-v3" style={{ borderLeftColor: 'var(--primary)' }}>
            <div>
              <h2>Voices of Voyage</h2>
              <p>Stories from our global community of travelers.</p>
            </div>
          </div>

          <div className="neon-testimonial-grid">
            {[
              { name: 'Pravendra Somani', role: 'Architect', avatar: 'ER', text: "The attention to detail and curated experiences transformed my holiday into a masterpiece." },
              { name: 'Vatsal Mankodiya', role: 'Phographers', avatar: 'LC', text: "Finding hidden gems has never been easier. Truly the gold standard of travel booking." },
              { name: 'Shaanu Pandey ', role: 'Explorer', avatar: 'SJ', text: "Impeccable service. The elite membership is worth every single mile." }
            ].map((t, i) => (
              <div key={i} className="neon-test-card">
                <div className="test-user-v3">
                  <div className="test-avatar-v3">{t.avatar}</div>
                  <div className="test-info-v3">
                    <h4>{t.name}</h4>
                    <span>{t.role}</span>
                  </div>
                </div>
                <p>"{t.text}"</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── About Us Section Elite ─────────────────────── */}
      <section className="section-v3" id="about-us">
        <div className="mmt-container">
          <div className="elite-about-grid">
            <div className="elite-about-info">
              <span className="hero-tagline">OUR STORY</span>
              <h2 className="section-title-elite">Elevating Every <br /> Journey Since 2000</h2>
              <p className="section-p-elite">At MakeMyTrip Elite, we don't just book trips; we architect memories. Founded with the mission to bring the world closer through seamless experiences, we’ve evolved into India’s premier luxury travel curator.</p>
              <div className="about-stats-mini">
                <div className="a-stat-mini"><strong>23+</strong><span>Years</span></div>
                <div className="a-stat-mini"><strong>15M+</strong><span>Explorers</span></div>
                <div className="a-stat-mini"><strong>100%</strong><span>Passion</span></div>
              </div>
            </div>
            <div className="elite-about-visual">
              <div className="glass-about-card">
                <h3>Our Vision</h3>
                <p>To redefine the landscape of global travel through innovation, transparency, and an unwavering commitment to our travelers.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Contact Us Section Elite ───────────────────── */}
      <section className="section-v3" id="contact-us">
        <div className="mmt-container">
          <div className="contact-grid-elite">
            <div className="contact-info-panel-elite">
              <h2 className="section-title-elite">Get in Touch</h2>
              <p className="section-p-elite">Our travel architects are available 24/7 to assist you with your bespoke journey.</p>

              <div className="contact-pills-v3">
                <div className="contact-pill-v3">
                  <span className="cp-icon">📍</span>
                  <div className="cp-text"><h4>Global HQ</h4><p>Praveendra Towers, DLF Phase 2, Gurugram</p></div>
                </div>
                <div className="contact-pill-v3">
                  <span className="cp-icon">📞</span>
                  <div className="cp-text"><h4>Elite Concierge</h4><p>1800-ELITE-TRIP</p></div>
                </div>
                <div className="contact-pill-v3">
                  <span className="cp-icon">✉️</span>
                  <div className="cp-text"><h4>General Inquiry</h4><p>support@mmt-elite.com</p></div>
                </div>
              </div>
            </div>

            <div className="contact-form-panel-elite">
              <form className="elite-contact-form" onSubmit={(e) => e.preventDefault()}>
                <div className="elite-form-row">
                  <div className="elite-input-group">
                    <label>YOUR NAME</label>
                    <input type="text" placeholder="John Doe" />
                  </div>
                  <div className="elite-input-group">
                    <label>EMAIL ADDRESS</label>
                    <input type="email" placeholder="john@example.com" />
                  </div>
                </div>
                <div className="elite-input-group">
                  <label>MESSAGE</label>
                  <textarea rows="4" placeholder="How can we help you plan your next escape?"></textarea>
                </div>
                <button type="submit" className="elite-submit-btn">SEND MESSAGE <span>→</span></button>
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* ── App Banner ─────────────────────────────────── */}
      <section className="mmt-container">
        <div className="app-banner-v3">
          <div className="app-content-v3">
            <h2>Your World, <br /> in Your Pocket.</h2>
            <p>Download the MakeMyTrip Elite app for instant concierge, offline itineraries, and exclusive mobile rates.</p>
            <div className="app-btns-v3">
              <button className="app-btn-premium"><span></span> App Store</button>
              <button className="app-btn-premium"><span>▶</span> Play Store</button>
            </div>
          </div>
          <div className="app-visual-v3">
            <div className="phone-mock-v3">
              <div className="phone-inner-v3">
                <div style={{ color: 'var(--secondary)', fontSize: '10px', fontWeight: 800 }}>UPCOMING TRIP</div>
                <div style={{ fontSize: '24px', fontWeight: 800, margin: '10px 0' }}>MALDIVES</div>
                <div style={{ opacity: 0.6, fontSize: '12px' }}>Check-in: 25 MAR</div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

export default Home;
