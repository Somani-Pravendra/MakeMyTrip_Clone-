import React, { useState, useEffect } from 'react';
import './ScrollButtons.css';

const ScrollButtons = () => {
  const [showTop, setShowTop] = useState(false);
  const [showBottom, setShowBottom] = useState(true);

  const handleScroll = () => {
    const minHeight = 100;
    // Check if we scrolled down enough to show "to top"
    if (window.scrollY > minHeight) {
      setShowTop(true);
    } else {
      setShowTop(false);
    }

    // Check if we are near the bottom to hide "to bottom"
    if (window.innerHeight + window.scrollY >= document.body.offsetHeight - minHeight) {
      setShowBottom(false);
    } else {
      setShowBottom(true);
    }
  };

  useEffect(() => {
    window.addEventListener('scroll', handleScroll);
    handleScroll(); // Check on init
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };

  const scrollToBottom = () => {
    window.scrollTo({
      top: document.body.scrollHeight,
      behavior: 'smooth'
    });
  };

  return (
    <div className="scroll-buttons-container">
      {showTop && (
        <button className="scroll-btn scroll-up" onClick={scrollToTop} aria-label="Scroll to top" title="Scroll to Top">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="18 15 12 9 6 15"></polyline>
          </svg>
        </button>
      )}
      {showBottom && (
        <button className="scroll-btn scroll-down" onClick={scrollToBottom} aria-label="Scroll to bottom" title="Scroll to Bottom">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
        </button>
      )}
    </div>
  );
};

export default ScrollButtons;
