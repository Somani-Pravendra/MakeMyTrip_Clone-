import React, { useState } from "react";
import "./ContactUs.css";

function ContactUs() {
  const [, setFormData] = useState({
    name: "", email: "", phone: "", subject: "", message: "", inquiryType: "general",
  });
  const [formStatus, setFormStatus] = useState({ submitted: false, loading: false, error: "" });
  const [activeFaq, setActiveFaq] = useState(null);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setFormStatus({ loading: true, submitted: false, error: "" });
    setTimeout(() => setFormStatus({ submitted: true, loading: false, error: "" }), 1500);
  };

  const locations = [
    {
      city: 'Gurugram', type: 'Global Headquarters', icon: '🏢',
      address: 'Praveendra Towers, DLF Cyber City, Phase 2, Gurugram, Haryana 122002',
      phone: '+91-124-4628747', email: 'hq@mmt-elite.com',
      hours: 'Mon – Sat: 9 AM – 9 PM', mapLink: 'https://maps.google.com/?q=Praveendra+Towers+DLF+Cyber+City+Phase+2+Gurugram',
    },
    {
      city: 'Mumbai', type: 'Western Regional Hub', icon: '🏙️',
      address: 'Elite Plaza, 8th Floor, Bandra Kurla Complex, Mumbai, Maharashtra 400051',
      phone: '+91-22-6123-4567', email: 'mumbai@mmt-elite.com',
      hours: 'Mon – Sat: 9 AM – 8 PM', mapLink: 'https://maps.google.com/?q=Bandra+Kurla+Complex+Mumbai',
    },
    {
      city: 'Bengaluru', type: 'Technology Center', icon: '💻',
      address: 'Innovation Park, Tower C, Whitefield, Bengaluru, Karnataka 560066',
      phone: '+91-80-4567-8901', email: 'tech@mmt-elite.com',
      hours: 'Mon – Fri: 9 AM – 7 PM', mapLink: 'https://maps.google.com/?q=Whitefield+Bengaluru',
    },
    {
      city: 'Dubai', type: 'International Office', icon: '🌍',
      address: 'Sheikh Zayed Road, Emirates Towers, Dubai, United Arab Emirates',
      phone: '+971-4-360-1234', email: 'dubai@mmt-elite.com',
      hours: 'Sun – Thu: 9 AM – 6 PM', mapLink: 'https://maps.google.com/?q=Emirates+Towers+Dubai',
    },
    {
      city: 'New York', type: 'Americas Office', icon: '🗽',
      address: '1221 Avenue of the Americas, 42nd Floor, New York, NY 10020, USA',
      phone: '+1-646-480-1234', email: 'usa@mmt-elite.com',
      hours: 'Mon – Fri: 9 AM – 6 PM EST', mapLink: 'https://maps.google.com/?q=1221+Avenue+of+the+Americas+New+York',
    },
    {
      city: 'Singapore', type: 'Asia Pacific Hub', icon: '🇸🇬',
      address: 'One Raffles Place, Level 20, Singapore 048616',
      phone: '+65-6550-1234', email: 'apac@mmt-elite.com',
      hours: 'Mon – Fri: 9 AM – 6 PM SGT', mapLink: 'https://maps.google.com/?q=One+Raffles+Place+Singapore',
    },
  ];

  const supportChannels = [
    {
      icon: '📞', title: 'Elite Concierge Line', subtitle: '1800-ELITE-TRIP (Toll Free)',
      desc: 'Dedicated phone line for Elite members with priority queuing and white-glove service.',
      availability: '24/7 · All days including holidays',
      color: '#0077ff',
    },
    {
      icon: '💬', title: 'Priority WhatsApp', subtitle: '+91 91123 45678',
      desc: 'Get instant responses, share documents and receive your booking confirmations directly on WhatsApp.',
      availability: '24/7 · Average response: 3 minutes',
      color: '#25D366',
    },
    {
      icon: '✉️', title: 'Email Support', subtitle: 'support@mmt-elite.com',
      desc: 'Detailed queries, invoice requests, and document submissions handled with maximum attention to detail.',
      availability: 'Response within 2 business hours',
      color: '#00d2ff',
    },
    {
      icon: '💻', title: 'Live Chat', subtitle: 'Available on App & Website',
      desc: 'Instant AI-assisted chat with escalation to human agents for complex queries. No queues for Elite members.',
      availability: '24/7 · Bot + Human hybrid support',
      color: '#8B5CF6',
    },
    {
      icon: '🎥', title: 'Video Consultation', subtitle: 'Schedule a meeting',
      desc: 'Book a 1-on-1 video call with a dedicated travel architect to plan your dream itinerary in real time.',
      availability: 'Mon – Sat: 9 AM – 8 PM IST',
      color: '#F59E0B',
    },
    {
      icon: '🐦', title: 'Social Media', subtitle: '@MakeMyTripElite',
      desc: 'Reach us on Twitter/X, Instagram or Facebook. Public queries are responded to within 1 hour on weekdays.',
      availability: 'Mon – Sat: 9 AM – 9 PM IST',
      color: '#1DA1F2',
    },
  ];

  const faqs = [
    { q: 'How do I cancel or modify a booking?', a: 'Log in to your account, go to "My Trips", select the booking you want to manage, and click "Cancel" or "Modify". Cancellation charges depend on the fare type and timing. Elite members enjoy waived change fees on qualifying bookings.' },
    { q: 'What is the Best Price Guarantee?', a: 'If you find a lower price for the exact same booking (same dates, class, property) on any other platform within 24 hours of your booking, we\'ll refund the difference. Just submit a claim via our support portal with a screenshot of the lower price.' },
    { q: 'How do I get a refund after cancellation?', a: 'Refunds are processed within 5-7 business days for credit/debit cards and within 48 hours for MakeMyTrip wallet credits. International card refunds may take up to 10 business days depending on your bank.' },
    { q: 'What is Elite Membership and how do I join?', a: 'MakeMyTrip Elite is our premium travel concierge tier offering exclusive rates, priority customer service, free cancellation windows, and bespoke itinerary planning. You can join via the "Membership" section in your app or on our website.' },
    { q: 'Can I book for other people using my account?', a: 'Absolutely. You can add and manage traveler profiles for family members or colleagues within your account. Each profile stores their preferences, passport details and loyalty numbers securely.' },
    { q: 'Is my payment information secure?', a: 'Yes. All payment data is encrypted using 256-bit SSL and processed through PCI-DSS Level 1 certified gateways. We never store raw card numbers. You can also use Saved Cards with tokenisation for faster checkout.' },
    { q: 'How do I get an invoice for my booking?', a: 'Invoices are available in "My Bookings" → select booking → "Download Invoice". Corporate users can request GST-compliant invoices with their GSTIN. Our support team can also email invoices within 4 hours on request.' },
    { q: 'What happens if my flight is cancelled by the airline?', a: 'MakeMyTrip will proactively reach out with rebooking options or a full refund within 24 hours of the airline cancellation notice. Elite members receive priority rebooking with our dedicated operations team.' },
  ];

  return (
    <div className="contact-us-page">

      {/* ── HEADER ───────────────────────────────────────── */}
      <section className="contact-header">
        <div className="ch-particles">
          {[...Array(8)].map((_, i) => <div key={i} className="ch-particle" style={{ '--i': i }} />)}
        </div>
        <div className="mmt-container">
          <span className="live-badge">🟢 24/7 LIVE SUPPORT ACTIVE</span>
          <h1>Experience Seamless <br /> World-Class Assistance</h1>
          <p>Our team of 2,000+ travel architects is standing by to guide your next journey — every hour, every day.</p>
          <div className="contact-hero-stats">
            <div className="ch-stat"><strong>2,000+</strong><span>Support Agents</span></div>
            <div className="ch-stat"><strong>15 min</strong><span>Avg. Response Time</span></div>
            <div className="ch-stat"><strong>98%</strong><span>CSAT Score</span></div>
            <div className="ch-stat"><strong>50+</strong><span>Languages Supported</span></div>
          </div>
        </div>
      </section>

      {/* ── SUPPORT CHANNELS ─────────────────────────────── */}
      <section className="channels-section">
        <div className="mmt-container">
          <div className="section-header-center">
            <span className="section-tag-elite">REACH US YOUR WAY</span>
            <h2>Multiple Ways to Connect</h2>
            <p className="section-sub-c">Choose your preferred channel — we're fluent in all of them.</p>
          </div>
          <div className="channels-grid">
            {supportChannels.map((ch, i) => (
              <a key={i} href="#form" className="channel-card">
                <div className="ch-icon-wrap" style={{ background: `${ch.color}22`, border: `1px solid ${ch.color}44` }}>
                  <span>{ch.icon}</span>
                </div>
                <div className="ch-body">
                  <h3>{ch.title}</h3>
                  <span className="ch-subtitle" style={{ color: ch.color }}>{ch.subtitle}</span>
                  <p>{ch.desc}</p>
                  <div className="ch-availability">
                    <span className="avail-dot" style={{ background: ch.color }} />
                    {ch.availability}
                  </div>
                </div>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* ── MAIN FORM ────────────────────────────────────── */}
      <section className="contact-form-section" id="form">
        <div className="mmt-container">
          <div className="form-wrapper">

            {/* Left info panel */}
            <div className="form-info-side">
              <span className="section-tag-elite">LET'S CONNECT</span>
              <h2>How can we <br /> help you today?</h2>
              <p>Whether it's a private charter request, a visa question, or a distress call mid-trip, our Elite support team has your back every step of the way.</p>

              <div className="support-pills">
                <div className="s-pill"><span>✓</span> VIP On-ground Emergency Support</div>
                <div className="s-pill"><span>✓</span> Priority Rebooking & Modifications</div>
                <div className="s-pill"><span>✓</span> Luxury Itinerary Consulting</div>
                <div className="s-pill"><span>✓</span> Visa & Documentation Assistance</div>
                <div className="s-pill"><span>✓</span> Travel Insurance Claims Support</div>
                <div className="s-pill"><span>✓</span> Corporate & Group Travel Desk</div>
              </div>

              <div className="form-contact-pills">
                <div className="fcp-item">
                  <span className="fcp-icon">📞</span>
                  <div>
                    <p>1800-ELITE-TRIP</p>
                    <span>Toll free · 24/7</span>
                  </div>
                </div>
                <div className="fcp-item">
                  <span className="fcp-icon">📍</span>
                  <div>
                    <p>Gurugram, Haryana</p>
                    <span>Global Headquarters</span>
                  </div>
                </div>
                <div className="fcp-item">
                  <span className="fcp-icon">✉️</span>
                  <div>
                    <p>support@mmt-elite.com</p>
                    <span>Response in 2 hrs</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right form panel */}
            <div className="form-container">
              {formStatus.submitted ? (
                <div className="form-success-state">
                  <div className="success-icon">✨</div>
                  <h2>Message Received!</h2>
                  <p>Your query has been assigned to <strong>Reference #MMT-{Math.floor(Math.random() * 90000) + 10000}</strong>. Our travel architects have been notified and will respond within 60 minutes.</p>
                  <div className="success-actions">
                    <button className="btn-elite-primary" onClick={() => setFormStatus({ submitted: false, loading: false, error: '' })}>
                      SEND ANOTHER QUERY
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="elite-form-v2">
                  <h3 className="form-heading">Send us a Message</h3>

                  <div className="form-row-v2">
                    <div className="form-group-v2">
                      <label>FULL NAME *</label>
                      <input type="text" name="name" placeholder="Praveendra Somani" required onChange={handleInputChange} />
                    </div>
                    <div className="form-group-v2">
                      <label>EMAIL ADDRESS *</label>
                      <input type="email" name="email" placeholder="hello@example.com" required onChange={handleInputChange} />
                    </div>
                  </div>

                  <div className="form-row-v2">
                    <div className="form-group-v2">
                      <label>PHONE NUMBER</label>
                      <input type="tel" name="phone" placeholder="+91 98765 43210" onChange={handleInputChange} />
                    </div>
                    <div className="form-group-v2">
                      <label>NATURE OF INQUIRY *</label>
                      <select name="inquiryType" required onChange={handleInputChange}>
                        <option value="general">Bespoke Holiday Planning</option>
                        <option value="vip">Elite Membership Inquiry</option>
                        <option value="support">Booking Issue / Support</option>
                        <option value="refund">Refund & Cancellation</option>
                        <option value="business">Corporate Partnerships</option>
                        <option value="press">Media & Press Inquiry</option>
                        <option value="career">Careers & Recruitment</option>
                      </select>
                    </div>
                  </div>

                  <div className="form-group-v2">
                    <label>SUBJECT *</label>
                    <input type="text" name="subject" placeholder="e.g. Luxury Maldives Package Inquiry" required onChange={handleInputChange} />
                  </div>

                  <div className="form-group-v2">
                    <label>TELL US MORE *</label>
                    <textarea rows="5" name="message" placeholder="Describe your dream escape, booking issue or how we can help you. The more details you provide, the faster we can assist..." required onChange={handleInputChange} />
                  </div>

                  <div className="form-consent">
                    <input type="checkbox" id="consent" required />
                    <label htmlFor="consent">I agree to MakeMyTrip's <a href="https://www.makemytrip.com/privacy_policy/" target="_blank" rel="noreferrer">Privacy Policy</a> and consent to being contacted about my inquiry.</label>
                  </div>

                  <button type="submit" className="btn-elite-primary" disabled={formStatus.loading}>
                    {formStatus.loading ? (
                      <span className="btn-loading"><span className="spinner" />TRANSMITTING...</span>
                    ) : 'SEND INQUIRY →'}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ── GLOBAL PRESENCE ──────────────────────────────── */}
      <section className="global-presence">
        <div className="mmt-container">
          <div className="section-header-center">
            <span className="section-tag-elite">OUR FOOTPRINT</span>
            <h2>Offices Around the Globe</h2>
            <p className="section-sub-c">Six strategic locations powering seamless travel experiences for over 15 million explorers worldwide.</p>
          </div>
          <div className="locations-grid">
            {locations.map((loc, i) => (
              <div key={i} className="location-card">
                <div className="loc-header">
                  <span className="loc-city-icon">{loc.icon}</span>
                  <div>
                    <span className="loc-type">{loc.type}</span>
                    <h3>{loc.city}</h3>
                  </div>
                </div>
                <div className="loc-details">
                  <div className="loc-detail-row">
                    <span className="loc-detail-icon">📍</span>
                    <p>{loc.address}</p>
                  </div>
                  <div className="loc-detail-row">
                    <span className="loc-detail-icon">📞</span>
                    <p>{loc.phone}</p>
                  </div>
                  <div className="loc-detail-row">
                    <span className="loc-detail-icon">✉️</span>
                    <p>{loc.email}</p>
                  </div>
                  <div className="loc-detail-row">
                    <span className="loc-detail-icon">🕒</span>
                    <p>{loc.hours}</p>
                  </div>
                </div>
                <a href={loc.mapLink} className="loc-map-btn">VIEW ON MAP →</a>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ──────────────────────────────────────────── */}
      <section className="faq-section">
        <div className="mmt-container">
          <div className="section-header-center">
            <span className="section-tag-elite">QUICK ANSWERS</span>
            <h2>Frequently Asked Questions</h2>
            <p className="section-sub-c">The most common questions from our travelers — answered clearly and honestly.</p>
          </div>
          <div className="faq-list">
            {faqs.map((faq, i) => (
              <div
                key={i}
                className={`faq-item ${activeFaq === i ? 'open' : ''}`}
                onClick={() => setActiveFaq(activeFaq === i ? null : i)}
              >
                <div className="faq-question">
                  <span>{faq.q}</span>
                  <span className="faq-arrow">{activeFaq === i ? '−' : '+'}</span>
                </div>
                {activeFaq === i && (
                  <div className="faq-answer">
                    <p>{faq.a}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
          <div className="faq-still-stuck">
            <p>Still have a question? <a href="mailto:support@mmt-elite.com">Email our support team</a> or call <strong>1800-ELITE-TRIP</strong> anytime.</p>
          </div>
        </div>
      </section>

      {/* ── SUPPORT METRICS ──────────────────────────────── */}
      <section className="support-stats">
        <div className="mmt-container">
          <div className="stats-glass-bar">
            <div className="s-stat-item">
              <strong>98%</strong>
              <span>Customer Satisfaction</span>
            </div>
            <div className="s-divider" />
            <div className="s-stat-item">
              <strong>15 min</strong>
              <span>Avg. Response Time</span>
            </div>
            <div className="s-divider" />
            <div className="s-stat-item">
              <strong>2,000+</strong>
              <span>Support Agents</span>
            </div>
            <div className="s-divider" />
            <div className="s-stat-item">
              <strong>50+</strong>
              <span>Languages Supported</span>
            </div>
            <div className="s-divider" />
            <div className="s-stat-item">
              <strong>24/7</strong>
              <span>Always Available</span>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
}

export default ContactUs;
