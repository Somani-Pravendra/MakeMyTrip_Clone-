import React, { useState } from 'react';
import './FAQ.css';

function FAQ() {
  const [openFaq, setOpenFaq] = useState(null);

  const faqs = [
    {
      category: 'Booking & Reservations',
      questions: [
        { q: 'How do I cancel my booking?', a: 'You can cancel through your account dashboard under "My Trips" or contact our 24/7 customer support.' },
        { q: 'Can I change my flight date?', a: 'Yes, date changes are allowed based on airline policy. Rescheduling fees may apply.' },
        { q: 'How do I get my e-ticket?', a: 'E-tickets are sent to your registered email and can also be downloaded from the "My Trips" section.' },
        { q: 'Do you offer group booking discounts?', a: 'Yes, for groups of 10 or more, please contact our specialized group booking desk.' }
      ]
    },
    {
      category: 'Payment & Pricing',
      questions: [
        { q: 'What payment methods are supported?', a: 'We accept credit/debit cards, UPI, Wallets, and Net Banking for all bookings.' },
        { q: 'Is travel insurance included?', a: 'Travel insurance is optional and can be added during the booking process for a small fee.' },
        { q: 'Are there any hidden charges?', a: 'No, we believe in transparent pricing. All charges including taxes and fees are displayed before payment.' }
      ]
    },
    {
      category: 'Services & Features',
      questions: [
        { q: 'What services do you offer?', a: 'We offer flight bookings, hotel reservations, holiday packages, train tickets, bus bookings, and cab services.' },
        { q: 'Do you provide customer support?', a: 'Yes, we offer 24/7 customer support via phone, email, and live chat.' },
        { q: 'Is there a mobile app?', a: 'Yes, our mobile app is available on both iOS and Android platforms with exclusive mobile-only deals.' }
      ]
    },
    {
      category: 'Account & Security',
      questions: [
        { q: 'How do I create an account?', a: 'Click on "Sign Up" and follow the registration process. You can also sign up using Google for quick registration.' },
        { q: 'Is my personal information secure?', a: 'Yes, we use industry-standard encryption and security measures to protect your personal information.' },
        { q: 'How do I reset my password?', a: 'Click on "Forgot Password" on the login page and follow the instructions to reset your password.' }
      ]
    }
  ];

  const toggleFaq = (categoryIndex, questionIndex) => {
    const key = `${categoryIndex}-${questionIndex}`;
    setOpenFaq(openFaq === key ? null : key);
  };

  return (
    <div className="faq-page">
      <div className="faq-header">
        <div className="mmt-container">
          <h1>Frequently Asked Questions</h1>
          <p>Find answers to common questions about our services</p>
        </div>
      </div>

      <div className="faq-content">
        <div className="mmt-container">
          {faqs.map((category, categoryIndex) => (
            <div key={categoryIndex} className="faq-category">
              <h2 className="category-title">{category.category}</h2>
              <div className="faq-list">
                {category.questions.map((faq, questionIndex) => {
                  const key = `${categoryIndex}-${questionIndex}`;
                  const isOpen = openFaq === key;
                  
                  return (
                    <div
                      key={questionIndex}
                      className={`faq-item ${isOpen ? 'open' : ''}`}
                      onClick={() => toggleFaq(categoryIndex, questionIndex)}
                    >
                      <div className="faq-question">
                        <span>{faq.q}</span>
                        <span className="faq-toggle">{isOpen ? '−' : '+'}</span>
                      </div>
                      {isOpen && (
                        <div className="faq-answer">{faq.a}</div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          <div className="faq-contact">
            <div className="contact-card">
              <h3>Still have questions?</h3>
              <p>Can't find what you're looking for? Our customer support team is here to help.</p>
              <div className="contact-buttons">
                <button className="contact-btn primary">Contact Support</button>
                <button className="contact-btn secondary">Live Chat</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default FAQ;
