import React, { useState } from "react";
import "./AboutUs.css";

function AboutUs() {
  const [activeTimeline, setActiveTimeline] = useState(null);

  const milestones = [
    { year: '2000', title: 'The Birth of a Dream', desc: 'Deep Kalra launches MakeMyTrip as a US-focused portal for the Indian diaspora to book India travel from abroad.' },
    { year: '2005', title: 'Going Domestic', desc: 'Expanded operations to India, launching domestic flights and hotel booking capabilities for Indian travelers.' },
    { year: '2010', title: 'IPO on NASDAQ', desc: 'MakeMyTrip became the first Indian e-commerce company to list on the NASDAQ, raising $70 million.' },
    { year: '2015', title: 'Mobile First', desc: 'Launched a mobile-first strategy that captured over 60% of bookings from the app, revolutionising the travel market.' },
    { year: '2019', title: 'MakeMyTrip + Ibibo Merger', desc: 'Completed the landmark merger with Ibibo Group, creating India\'s largest online travel company.' },
    { year: '2024', title: 'Elite Era', desc: 'Launched the Elite premium travel concierge service, delivering ultra-personalised luxury experiences to millions.' },
  ];

  const awards = [
    { icon: '🏆', name: 'Best Travel App 2024', org: 'Google Play Awards' },
    { icon: '🥇', name: 'Top OTA India', org: 'FICCI Travel Awards' },
    { icon: '⭐', name: 'Customer Champion', org: 'ET Brand Equity' },
    { icon: '🌐', name: 'Tech Innovator of the Year', org: 'NASSCOM Summit' },
    { icon: '💼', name: 'Best Workplace 2024', org: 'Great Place to Work India' },
    { icon: '🎯', name: '#1 Travel Platform', org: 'Nielsen Digital Consumer Report' },
  ];

  const partners = [
    { name: 'Air India', type: 'Airline Partner', abbr: 'AI' },
    { name: 'IndiGo', type: 'Airline Partner', abbr: 'IG' },
    { name: 'Taj Hotels', type: 'Hotel Partner', abbr: 'TJ' },
    { name: 'OYO Rooms', type: 'Hotel Partner', abbr: 'OO' },
    { name: 'IRCTC', type: 'Rail Partner', abbr: 'IR' },
    { name: 'Uber', type: 'Cab Partner', abbr: 'UB' },
  ];

  const testimonials = [
    {
      name: 'Priya Sharma', role: 'Marketing Director, Delhi',
      avatar: 'PS', rating: 5,
      text: 'Booked a family trip to Bali through MakeMyTrip Elite — the concierge service was absolutely world‑class. Every detail was perfect, from the villa to the private driver.',
    },
    {
      name: 'Arjun Mehta', role: 'Entrepreneur, Mumbai',
      avatar: 'AM', rating: 5,
      text: 'The business-class upgrade deal I found here was unreal. Saved over ₹40,000 and got the most comfortable flight experience of my life. Highly recommend the Elite tier.',
    },
    {
      name: 'Sanya Kapoor', role: 'Travel Blogger, Bengaluru',
      avatar: 'SK', rating: 5,
      text: 'As someone who travels 20+ times a year, MakeMyTrip is my go-to. The interface is flawlessly intuitive and the customer support has always gone above and beyond.',
    },
  ];

  const pressItems = [
    { outlet: 'The Economic Times', quote: '"MakeMyTrip\'s Elite service is redefining luxury travel in India."', date: 'March 2024' },
    { outlet: 'Forbes India', quote: '"Deep Kalra\'s vision — 24 years later — is more relevant than ever."', date: 'January 2024' },
    { outlet: 'Business Standard', quote: '"India\'s most trusted travel brand hits 15 million active users."', date: 'November 2023' },
  ];

  return (
    <div className="about-us-page">

      {/* ── HERO ──────────────────────────────────────────── */}
      <section className="about-hero">
        <div className="au-hero-particles">
          {[...Array(12)].map((_, i) => (
            <div key={i} className="au-particle" style={{ '--i': i }} />
          ))}
        </div>
        <div className="mmt-container">
          <span className="hero-tag">ESTABLISHED 2000</span>
          <h1>Architecting Memories <br /> Since Two Decades</h1>
          <p>India's Premier Luxury Travel Curator — Trusted by 15 Million Explorers</p>

          <div className="hero-stats">
            <div className="stat-item">
              <span className="stat-number">24+</span>
              <span className="stat-label">Years of Excellence</span>
            </div>
            <div className="stat-item">
              <span className="stat-number">15M+</span>
              <span className="stat-label">Global Explorers</span>
            </div>
            <div className="stat-item">
              <span className="stat-number">120+</span>
              <span className="stat-label">Countries Reached</span>
            </div>
            <div className="stat-item">
              <span className="stat-number">₹500Cr+</span>
              <span className="stat-label">Savings Delivered</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── VISION & MISSION ─────────────────────────────── */}
      <section className="vision-mission">
        <div className="mmt-container">
          <div className="vision-grid">
            <div className="vision-card">
              <div className="vision-icon">👁️</div>
              <h2>Our Vision</h2>
              <p>To redefine the landscape of global travel through innovation, transparency and an unwavering commitment to every traveler. We aim to be the gold standard of luxury travel in the digital age — where every journey is as extraordinary as the destination.</p>
              <div className="vision-divider" />
              <span className="vision-quote">"Travel is the only thing you buy that makes you richer."</span>
            </div>
            <div className="vision-card">
              <div className="vision-icon">🎯</div>
              <h2>Our Mission</h2>
              <p>To empower every traveler — from budget backpackers to elite connoisseurs — with bespoke experiences, seamless technology and human‑centric service. We don't just book trips; we curate life‑long memories for the discerning explorer.</p>
              <div className="vision-divider" />
              <span className="vision-quote">"Every trip is a story waiting to be told."</span>
            </div>
            <div className="vision-card">
              <div className="vision-icon">💡</div>
              <h2>Our Promise</h2>
              <p>Best‑price guarantee on every booking, transparent fees, and a dedicated support team available 24/7. If you ever find a lower price within 24 hours of booking, we'll refund the difference — no questions asked.</p>
              <div className="vision-divider" />
              <span className="vision-quote">"Your trust is our greatest achievement."</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── OUR STORY ─────────────────────────────────────── */}
      <section className="our-story">
        <div className="mmt-container">
          <div className="story-content">
            <div className="story-text">
              <span className="section-tag">THE GENESIS</span>
              <h2>The Journey of a Vision</h2>
              <p>MakeMyTrip Limited was born from a simple dream: to make travel accessible, transparent and extraordinary. Founded in 2000 by Deep Kalra, we began as a portal for the Indian diaspora in the United States — helping them book flights back to India at a time when online booking was virtually unheard of.</p>
              <p>Within a decade, we had transformed into India's most trusted travel platform, listing on NASDAQ in 2010 — a historic milestone as the first Indian e-commerce company to do so. The journey from a 5-person startup in a Delhi garage to a multi-billion-dollar conglomerate is a testament to the power of vision, technology and relentless customer focus.</p>
              <p>Today, with over 15 million active users, a portfolio spanning flights, hotels, trains, buses, cabs and holiday packages, and a growing luxury concierge arm — MakeMyTrip Elite — we continue to shape the future of travel in India and beyond.</p>
              <div className="story-features">
                <div className="s-feature"><span>✓</span> Listed on NASDAQ since 2010</div>
                <div className="s-feature"><span>✓</span> 24/7 Dedicated Concierge Service</div>
                <div className="s-feature"><span>✓</span> 5,000+ Verified Luxury Properties</div>
                <div className="s-feature"><span>✓</span> Best-Price Guarantee on All Bookings</div>
                <div className="s-feature"><span>✓</span> Carbon-Neutral Travel Options Available</div>
              </div>
            </div>
            <div className="story-image">
              <img src="https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&q=80" alt="Corporate Office" />
              <div className="image-overlay-card">
                <strong>#1</strong>
                <span>Travel Brand in India</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── MILESTONE TIMELINE ────────────────────────────── */}
      <section className="timeline-section">
        <div className="mmt-container">
          <div className="section-header-center">
            <span className="section-tag">24 YEARS OF MILESTONES</span>
            <h2>A Journey Through Time</h2>
            <p className="section-sub">From a small startup to India's largest travel platform — here's how we got here.</p>
          </div>
          <div className="timeline">
            {milestones.map((m, i) => (
              <div
                key={i}
                className={`timeline-item ${i % 2 === 0 ? 'left' : 'right'} ${activeTimeline === i ? 'active' : ''}`}
                onClick={() => setActiveTimeline(activeTimeline === i ? null : i)}
              >
                <div className="timeline-dot" />
                <div className="timeline-card">
                  <span className="timeline-year">{m.year}</span>
                  <h4>{m.title}</h4>
                  <p>{m.desc}</p>
                </div>
              </div>
            ))}
            <div className="timeline-line" />
          </div>
        </div>
      </section>

      {/* ── CORE VALUES ──────────────────────────────────── */}
      <section className="values-section">
        <div className="mmt-container">
          <div className="section-header-center">
            <span className="section-tag">OUR DNA</span>
            <h2>Values that Drive Us</h2>
            <p className="section-sub">The principles that guide every decision, every booking, every interaction.</p>
          </div>
          <div className="values-grid">
            {[
              { icon: '💎', title: 'Excellence', desc: 'We strive for perfection in every booking and every itinerary. Good enough is never good enough when it comes to your journey.' },
              { icon: '🛡️', title: 'Integrity', desc: 'Transparency is our foundation. No hidden fees, no misleading offers. Millions trust us with their most precious time and money.' },
              { icon: '🌍', title: 'Sustainability', desc: 'Committed to preserving the beauty of the planet for future explorers. We offer carbon‑offset options on all flight bookings.' },
              { icon: '🚀', title: 'Innovation', desc: 'Pioneering AI‑driven travel solutions, from smart itinerary builders to real-time price predictions, for a smarter journey.' },
              { icon: '🤝', title: 'Inclusivity', desc: 'Travel is for everyone. We offer options across all price points and partner with accessibility specialists for differently-abled travelers.' },
              { icon: '💬', title: 'Empathy', desc: 'We listen before we recommend. Our support teams are trained to understand your unique travel needs and deliver beyond expectations.' },
              { icon: '🔒', title: 'Security', desc: 'Your data and payments are protected with bank-grade encryption and PCI-DSS compliance. We never compromise on your security.' },
              { icon: '🌟', title: 'Community', desc: 'Our 15 million explorers form a vibrant community. We celebrate their stories, reviews, and recommendations every single day.' },
            ].map((v, i) => (
              <div key={i} className="value-card">
                <div className="value-icon">{v.icon}</div>
                <h3>{v.title}</h3>
                <p>{v.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── LEADERSHIP ───────────────────────────────────── */}
      <section className="leadership-section">
        <div className="mmt-container">
          <div className="section-header-center">
            <span className="section-tag">LEADERSHIP</span>
            <h2>The Minds Behind Elite</h2>
            <p className="section-sub">Seasoned visionaries who have turned a startup dream into India's greatest travel story.</p>
          </div>
          <div className="leadership-grid">
            {[
              { name: 'Deep Kalra', role: 'Founder & Chairman', img: 'DK', exp: '24+ years in travel tech', linkedin: '#', bio: 'Visionary entrepreneur who turned travel booking from a chore into a delight.' },
              { name: 'Rajesh Magow', role: 'Co-Founder & Group CEO', img: 'RM', exp: 'Former McKinsey consultant', linkedin: '#', bio: "Strategic architect of MakeMyTrip's global expansion and product vision." },
              { name: 'Mohit Kabra', role: 'Group CFO', img: 'MK', exp: '20+ years in finance', linkedin: '#', bio: 'Financial steward who guided the company through its NASDAQ IPO and beyond.' },
              { name: 'Vipul Prakash', role: 'Chief Operating Officer', img: 'VP', exp: 'Former Google India lead', linkedin: '#', bio: 'Operations mastermind responsible for scaling platform quality and partnerships.' },
              { name: 'Saujanya Shrivastava', role: 'Chief People Officer', img: 'SS', exp: '15+ years in HR leadership', linkedin: '#', bio: 'Culture champion ensuring MakeMyTrip remains a great place to work.' },
              { name: 'Yuvaraj Srivastava', role: 'Chief Technology Officer', img: 'YS', exp: 'Ex-Amazon tech leader', linkedin: '#', bio: 'Technology visionary spearheading AI integration across all products.' },
              { name: 'Swati Bhargava', role: 'Chief Marketing Officer', img: 'SB', exp: '18+ years in brand strategy', linkedin: '#', bio: "Brand storyteller who created some of India's most memorable travel campaigns." },
              { name: 'Anshuman Bapna', role: 'Chief Product Officer', img: 'AB', exp: 'Product veteran, IIT Delhi', linkedin: '#', bio: 'Product innovator obsessed with creating seamless and delightful travel experiences.' },
            ].map((leader, i) => (
              <div key={i} className="leader-card">
                <div className="leader-avatar">{leader.img}</div>
                <div className="leader-info">
                  <h4>{leader.name}</h4>
                  <span className="leader-role">{leader.role}</span>
                  <p className="leader-exp">{leader.exp}</p>
                  <p className="leader-bio">{leader.bio}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── AWARDS & RECOGNITION ─────────────────────────── */}
      <section className="awards-section">
        <div className="mmt-container">
          <div className="section-header-center">
            <span className="section-tag">RECOGNITION</span>
            <h2>Awards & Accolades</h2>
            <p className="section-sub">Recognised by India's most prestigious organisations for excellence in travel, technology and culture.</p>
          </div>
          <div className="awards-grid">
            {awards.map((award, i) => (
              <div key={i} className="award-card">
                <span className="award-icon">{award.icon}</span>
                <h4>{award.name}</h4>
                <span>{award.org}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PARTNER ECOSYSTEM ────────────────────────────── */}
      <section className="partners-section">
        <div className="mmt-container">
          <div className="section-header-center">
            <span className="section-tag">PARTNERSHIPS</span>
            <h2>Our Trusted Partner Network</h2>
            <p className="section-sub">Over 600 airlines, 1 million hotels and thousands of ground transport partners — all vetted for quality.</p>
          </div>
          <div className="partners-grid">
            {partners.map((p, i) => (
              <div key={i} className="partner-card">
                <div className="partner-logo">{p.abbr}</div>
                <div className="partner-info">
                  <h4>{p.name}</h4>
                  <span>{p.type}</span>
                </div>
              </div>
            ))}
          </div>
          <div className="partner-note">
            <p>+ 600 airlines · 1M+ hotels · 50+ ground partners across 120 countries</p>
          </div>
        </div>
      </section>

      {/* ── TRAVELER STORIES ─────────────────────────────── */}
      <section className="testimonials-section">
        <div className="mmt-container">
          <div className="section-header-center">
            <span className="section-tag">STORIES</span>
            <h2>From Our Travelers</h2>
            <p className="section-sub">Real experiences from real explorers who chose MakeMyTrip Elite for their journeys.</p>
          </div>
          <div className="testimonials-grid">
            {testimonials.map((t, i) => (
              <div key={i} className="testimonial-card">
                <div className="tc-stars">{'★'.repeat(t.rating)}</div>
                <p className="tc-text">"{t.text}"</p>
                <div className="tc-user">
                  <div className="tc-avatar">{t.avatar}</div>
                  <div>
                    <h5>{t.name}</h5>
                    <span>{t.role}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── IN THE PRESS ─────────────────────────────────── */}
      <section className="press-section">
        <div className="mmt-container">
          <div className="section-header-center">
            <span className="section-tag">IN THE PRESS</span>
            <h2>What They're Saying</h2>
          </div>
          <div className="press-grid">
            {pressItems.map((item, i) => (
              <div key={i} className="press-card">
                <div className="press-outlet">{item.outlet}</div>
                <p className="press-quote">{item.quote}</p>
                <span className="press-date">{item.date}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── BY THE NUMBERS ───────────────────────────────── */}
      <section className="numbers-section">
        <div className="mmt-container">
          <div className="numbers-grid">
            {[
              { val: '5,000+', label: 'Luxury Properties', icon: '🏨' },
              { val: '600+', label: 'Airline Partners', icon: '✈️' },
              { val: '₹500Cr+', label: 'Customer Savings', icon: '💰' },
              { val: '120+', label: 'Countries Covered', icon: '🌍' },
              { val: '4.8★', label: 'App Store Rating', icon: '⭐' },
              { val: '99.9%', label: 'Platform Uptime', icon: '🔒' },
            ].map((n, i) => (
              <div key={i} className="number-card">
                <span className="number-icon">{n.icon}</span>
                <strong>{n.val}</strong>
                <span>{n.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────── */}
      <section className="cta-section">
        <div className="mmt-container">
          <div className="cta-content">
            <span className="cta-badge">🚀 JOIN THE ELITE COMMUNITY</span>
            <h2>Ready to Write Your Next Chapter?</h2>
            <p>Join 15 million explorers and experience the pinnacle of luxury travel — from weekend escapes to bespoke world tours.</p>
            <div className="cta-buttons">
              <button className="btn-white">START EXPLORING</button>
              <button className="btn-outline-white">VIEW MEMBERSHIP PLANS</button>
            </div>
            <div className="cta-note">No credit card required for sign-up · Cancel anytime · 100% refund guarantee</div>
          </div>
        </div>
      </section>
    </div>
  );
}

export default AboutUs;
