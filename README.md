# 🚀 TravelPro: Elite Travel Management System

TravelPro is a state-of-the-art, high-density travel booking platform inspired by MakeMyTrip. Built on the **MERN Stack**, it offers a seamless experience for booking flights, hotels, trains, buses, and cabs through a refined "Elite" user interface.

![Project Preview](https://via.placeholder.com/1200x600?text=TravelPro+Elite+Interface+Preview)

## ✨ Core Features

### 🛫 Flight Booking
- Search flights (One-way, Round-trip, Multi-city).
- Advanced filtering by price, duration, and stops.
- Interactive seat selection and real-time booking updates.

### 🏨 Hotel Reservations
- Location-based searches with **Map Integration** (Leaflet).
- Detailed room selection and guest management.
- Professional confirmation vouchers.

### 🚆 Trains & 🚌 Buses
- Complete train search and IRCTC-style seat availability.
- Interactive bus seat maps for selecting preferred seats.

### 🚕 Cab Services
- Local and outstation cab bookings with real-time fare estimates.
- Seamless booking history and tracking.

### 🛡️ Secure Authentication
- Multi-factor authentication via **JWT**.
- One-click login with **Google OAuth**.

### 💼 Admin Powerhouse
- Comprehensive dashboard to manage inventory (Flights/Hotels/Buses).
- User and booking management with analytics.

### 💳 Digital Wallet & Offers
- Integrated virtual wallet for instant payments and refunds.
- Dynamic promo code and offer system.

---

## 🛠️ Technology Stack

### **Frontend**
- **React (v19)**: Core application framework.
- **Axios**: API communication.
- **Lucide React**: Premium icon set.
- **Leaflet**: Map-based search.
- **html2pdf.js**: Ticket/Voucher generation.

### **Backend**
- **Node.js & Express**: High-performance backend routing.
- **MongoDB & Mongoose**: Scalable NoSQL database.
- **Passport.js**: Google OAuth integration.
- **Nodemailer**: Automated booking confirmations via email.
- **Bcrypt.js**: Industry-standard password hashing.

---

## 🚀 Getting Started

### Prerequisites
- Node.js installed
- MongoDB URI (Local or Atlas)
- Google Cloud Console credentials (for OAuth)

### Installation

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd makemytrip
   ```

2. **Backend Setup:**
   ```bash
   cd backend
   npm install
   # Create a .env file based on .env.example
   npm run dev
   ```

3. **Frontend Setup:**
   ```bash
   cd ../frontend
   npm install
   # Create a .env file with REACT_APP_API_URL
   npm start
   ```

---

## 📐 Project Structure
```text
makemytrip/
├── backend/            # Express.js Server
│   ├── models/         # Database Schemas
│   ├── routes/         # API Endpoints
│   ├── controllers/    # Business Logic
│   └── config/         # App Configurations
├── frontend/           # React Application
│   ├── src/
│   │   ├── components/ # Reusable UI Components
│   │   ├── pages/      # Module-specific pages
│   │   └── assets/     # Styles and Media
└── Data_Base/          # Initial seed data and schemas
```

---

## 🎨 Design Language: The Elite Standard
The project utilizes a custom **Elite Design System** focused on:
- **Efficiency:** Data-dense layouts for professional users.
- **Aesthetics:** Vibrant palettes, smooth transitions, and premium typography.
- **Responsiveness:** Flawless experience across desktops, tablets, and mobiles.

---

## 📝 License
This project is for educational purposes as part of the Semester-10 Capstone Project.

Developed with ❤️ by [Your Name]
