import React from "react";
import { Link } from "react-router-dom";

const Footer = () => {
  return (
    <footer className="mmt-footer">
      <div className="mmt-container">
        <div className="footer-grid">
          <div className="footer-col">
            <h4>Company</h4>
            <ul>
              <li>
                <Link to="/about">About Us</Link>
              </li>
              <li>
                <Link to="/contact">Contact</Link>
              </li>
              <li>
                <Link to="/faq">Support</Link>
              </li>
              <li>
                <Link to="/profile">My Account</Link>
              </li>
            </ul>
          </div>

          <div className="footer-col">
            <h4>Booking Services</h4>
            <ul>
              <li>
                <Link to="/flights">Book Flights</Link>
              </li>
              <li>
                <Link to="/hotels">Book Hotels</Link>
              </li>
              <li>
                <Link to="/trains">Train Tickets</Link>
              </li>
              <li>
                <Link to="/bus">Bus Tickets</Link>
              </li>
              <li>
                <Link to="/cabs">Airport Cabs</Link>
              </li>
            </ul>
          </div>

          <div className="footer-col">
            <h4>Holiday Planning</h4>
            <ul>
              <li>
                <Link to="/packages">Holiday Packages</Link>
              </li>
              <li>
                <Link to="/packages">Family Trips</Link>
              </li>
              <li>
                <Link to="/packages">Luxury Escapes</Link>
              </li>
              <li>
                <Link to="/hotels">Weekend Stays</Link>
              </li>
            </ul>
          </div>

          <div className="footer-col">
            <h4>Useful Links</h4>
            <ul>
              <li>
                <Link to="/login">Login</Link>
              </li>
              <li>
                <Link to="/signup">Create Account</Link>
              </li>
              <li>
                <Link to="/contact">Travel Assistance</Link>
              </li>
              <li>
                <Link to="/faq">Booking FAQs</Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="footer-bottom">
          <p>&copy; {new Date().getFullYear()} MakeMyTrip Pvt. Ltd. India | USA | UAE</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
