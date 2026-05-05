# Requirements Document

## Introduction

This document specifies requirements for eight new features to be added to the MakeMyTrip Elite travel booking application. The features are designed to be built sequentially and cover the full user journey: from downloading a ticket after booking, through engagement features (recently viewed, loyalty points), self-service tools (booking modification, hotel room comparison), admin intelligence (analytics dashboard), proactive communication (push/email notifications), and post-trip feedback (review and rating system).

The application uses a React frontend with React Router v7, a Node.js/Express v5 backend, MongoDB with Mongoose, and JWT-based authentication. Existing models include User (with `walletBalance` and `walletTransactions`), Booking, Flight, Train, Hotel, Bus, Package, CabType, Offer, and Feedback.

---

## Glossary

- **System**: The MakeMyTrip Elite web application (frontend + backend together).
- **PDF_Generator**: The frontend component responsible for producing PDF ticket files using html2pdf.js.
- **RecentlyViewed_Store**: The localStorage-based client-side store that tracks recently viewed travel items.
- **Loyalty_Engine**: The backend service responsible for calculating, awarding, and redeeming loyalty points.
- **Modification_Service**: The backend service responsible for validating and applying changes to existing confirmed bookings.
- **Comparison_Widget**: The frontend component that renders a side-by-side hotel room comparison panel.
- **Analytics_Dashboard**: The admin-facing frontend page that visualises revenue, booking trends, popular routes, and conversion funnel data.
- **Notification_Service**: The backend service responsible for scheduling and dispatching push notifications and email reminders.
- **Review_Service**: The backend service responsible for storing, aggregating, and moderating user reviews and star ratings.
- **Booking**: A confirmed travel reservation stored in the `Booking` MongoDB collection.
- **User**: An authenticated application user stored in the `User` MongoDB collection.
- **Wallet**: The in-app credit balance stored in `User.walletBalance` and tracked via `User.walletTransactions`.
- **LoyaltyPoints**: A non-monetary reward balance stored on the User document, separate from the Wallet.
- **Admin**: A user with `isAdmin: true` in the User document.
- **PNR**: Passenger Name Record — the unique reference code for a transport booking.
- **html2pdf.js**: The third-party JavaScript library already installed in the frontend for client-side PDF generation.
- **Nodemailer**: The Node.js email library already available in the backend for sending transactional emails.

---

## Requirements

---

### Requirement 1: Booking Ticket Download as PDF

**User Story:** As a traveller, I want to download my booking confirmation as a PDF ticket, so that I can keep an offline copy and present it at check-in without needing internet access.

#### Acceptance Criteria

1. WHEN a user views a confirmed booking on the BookingSuccess page, THE PDF_Generator SHALL render a "Download Ticket" button that is visible without scrolling on desktop viewports (≥ 1024 px wide).
2. WHEN a user clicks the "Download Ticket" button, THE PDF_Generator SHALL invoke html2pdf.js to convert the on-screen ticket element into a PDF file and trigger a browser download within 5 seconds on a standard connection.
3. WHEN the PDF is generated, THE PDF_Generator SHALL include the booking ID, PNR (where applicable), passenger names, travel route (origin and destination), travel date, payment summary (base fare, fees, discount, total), and the MakeMyTrip Elite brand header in the output file.
4. WHEN the PDF is generated for a hotel booking, THE PDF_Generator SHALL include hotel name, check-in date, check-out date, room type, and number of guests instead of a route.
5. WHEN the PDF is generated for a package booking, THE PDF_Generator SHALL include package title, destination, duration (nights/days), and travel date instead of a route.
6. WHEN the PDF is generated for a cab booking, THE PDF_Generator SHALL include pickup location, drop location, pickup date and time, and cab type instead of a route.
7. THE PDF_Generator SHALL name the downloaded file using the pattern `MMT-Ticket-{bookingId}.pdf`.
8. WHEN a user views a past confirmed booking in the Profile page "Your Tickets" tab, THE PDF_Generator SHALL render a "Download Ticket" button for each booking card that triggers the same PDF generation flow.
9. IF html2pdf.js throws an error during generation, THEN THE PDF_Generator SHALL display a toast notification with the message "Could not generate PDF. Please try again." and SHALL NOT leave the page in a broken state.
10. WHILE a PDF is being generated, THE PDF_Generator SHALL display a loading indicator on the download button and SHALL disable the button to prevent duplicate downloads.

---

### Requirement 2: Recently Viewed

**User Story:** As a traveller, I want to see the flights, hotels, and packages I recently browsed on the home page, so that I can quickly return to items I was considering without repeating my search.

#### Acceptance Criteria

1. WHEN a user views a flight detail or flight search result card, THE RecentlyViewed_Store SHALL record the flight's ID, airline name, route (from → to), price, and a timestamp in localStorage under the key `mmt_recently_viewed`.
2. WHEN a user views a hotel detail page, THE RecentlyViewed_Store SHALL record the hotel's ID, name, city, star rating, lowest room price, and a timestamp in localStorage under the key `mmt_recently_viewed`.
3. WHEN a user views a package detail page, THE RecentlyViewed_Store SHALL record the package's ID, title, destination, duration, price per person, thumbnail image URL, and a timestamp in localStorage under the key `mmt_recently_viewed`.
4. THE RecentlyViewed_Store SHALL retain at most 10 items across all categories, removing the oldest entry when the limit is exceeded.
5. THE RecentlyViewed_Store SHALL deduplicate entries by item ID so that viewing the same item multiple times updates its timestamp rather than creating a duplicate entry.
6. WHEN the Home page loads and the RecentlyViewed_Store contains at least one entry, THE System SHALL render a "Recently Viewed" section on the Home page displaying up to 6 items as horizontally scrollable cards.
7. WHEN the Home page loads and the RecentlyViewed_Store contains no entries, THE System SHALL NOT render the "Recently Viewed" section.
8. WHEN a user clicks a recently viewed card, THE System SHALL navigate to the appropriate detail or listing page for that item category (flights → /flights, hotels → /hotels, packages → /packages/{id}).
9. THE RecentlyViewed_Store SHALL store data only in localStorage and SHALL NOT transmit recently viewed data to the backend server.
10. WHEN a user clears their browser's localStorage, THE System SHALL gracefully handle the absence of the `mmt_recently_viewed` key and SHALL NOT throw a JavaScript error.
11. IF a stored recently viewed entry references an item that no longer exists (stale data), THEN THE System SHALL silently skip that entry when rendering the section rather than displaying a broken card.

---

### Requirement 3: Loyalty / Rewards Points System

**User Story:** As a frequent traveller, I want to earn loyalty points for every booking I make and redeem them for discounts on future bookings, so that I am rewarded for my continued use of the platform.

#### Acceptance Criteria

1. THE System SHALL store a `loyaltyPoints` integer field and a `loyaltyTransactions` array on the User document to track the current balance and full transaction history.
2. WHEN a booking reaches `Confirmed` status, THE Loyalty_Engine SHALL credit the user's `loyaltyPoints` balance at the rate of 1 point per ₹100 of `totalFare` (rounded down), with a minimum award of 1 point per booking.
3. WHEN a booking is fully cancelled, THE Loyalty_Engine SHALL debit the points that were awarded for that booking from the user's `loyaltyPoints` balance, provided the balance does not go below zero.
4. WHEN a booking is partially cancelled, THE Loyalty_Engine SHALL debit points proportional to the cancelled fare share from the user's `loyaltyPoints` balance, provided the balance does not go below zero.
5. WHEN a user has at least 100 loyalty points, THE System SHALL display a "Redeem Points" option in the checkout payment section showing the equivalent discount value (100 points = ₹50 discount).
6. WHEN a user redeems loyalty points at checkout, THE Loyalty_Engine SHALL deduct the redeemed points from `loyaltyPoints`, record a debit transaction in `loyaltyTransactions`, and apply the equivalent rupee discount to `totalFare` before payment is processed.
7. THE Loyalty_Engine SHALL NOT allow a user to redeem more points than their current `loyaltyPoints` balance.
8. THE Loyalty_Engine SHALL NOT allow a user to redeem points that would reduce `totalFare` below ₹1.
9. WHEN a user views their Profile page, THE System SHALL display a "Loyalty Points" section showing the current balance, equivalent rupee value, and the last 10 loyalty transactions with date, description, and points delta.
10. WHEN a loyalty transaction is recorded, THE Loyalty_Engine SHALL persist a `loyaltyTransactions` entry containing: type (`credit` or `debit`), points amount, source (`booking_earn`, `booking_cancel_debit`, `redemption`), bookingId reference, description, and `balanceAfter`.
11. THE System SHALL display the user's current loyalty points balance in the Navbar when the user is authenticated.
12. WHERE a user has zero loyalty points, THE System SHALL display "0 Points" and SHALL NOT display the "Redeem Points" option at checkout.

---

### Requirement 4: Booking Modification

**User Story:** As a traveller, I want to change the travel date or update passenger details on a confirmed booking without having to cancel and rebook, so that I can correct mistakes or adapt to schedule changes with minimal friction.

#### Acceptance Criteria

1. WHEN a user views a confirmed booking in the Profile page "Your Tickets" tab, THE System SHALL display a "Modify Booking" button for bookings whose travel date is more than 24 hours in the future and whose status is `Confirmed`.
2. WHEN a user clicks "Modify Booking", THE System SHALL open a modification modal that allows the user to change the travel date and/or update individual passenger first name, last name, age, and gender fields.
3. WHEN a user submits a date change for a flight booking, THE Modification_Service SHALL validate that the new date is at least 24 hours in the future and that the original flight still has available seats on the new date.
4. WHEN a user submits a date change for a hotel booking, THE Modification_Service SHALL validate that the new check-in date is at least 24 hours in the future, that the new check-out date is after the new check-in date, and that the hotel has available rooms for the new date range.
5. WHEN a user submits a date change for a train or bus booking, THE Modification_Service SHALL validate that the new travel date is at least 24 hours in the future.
6. WHEN a modification is approved, THE Modification_Service SHALL update the `travelDate` (and `hotel.checkIn` / `hotel.checkOut` for hotel bookings) on the Booking document and SHALL record a `modificationHistory` entry containing the previous values, new values, modification timestamp, and the modifying user's ID.
7. WHEN a modification is approved, THE System SHALL send a booking modification confirmation email to the contact email address stored on the booking using Nodemailer.
8. IF the Modification_Service determines that a date change is not possible (e.g., no availability, date in the past, booking already cancelled), THEN THE System SHALL return a descriptive error message and SHALL NOT modify the booking.
9. THE Modification_Service SHALL allow passenger detail updates (name, age, gender) for flight, train, and bus bookings without requiring availability re-validation, provided the booking status is `Confirmed`.
10. THE System SHALL store a `modificationHistory` array on the Booking document, where each entry records: `modifiedAt` timestamp, `modifiedBy` user ID, `changeType` (`date_change` or `passenger_update`), `previousValues` object, and `newValues` object.
11. WHEN a booking has been modified, THE System SHALL display a "Modified" badge on the booking card in the Profile page to indicate the booking has been changed from its original state.
12. THE Modification_Service SHALL NOT allow modification of cancelled, completed, or partially cancelled bookings.
13. THE Modification_Service SHALL NOT allow modification of cab bookings whose pickup time is within 2 hours.

---

### Requirement 5: Hotel Room Comparison

**User Story:** As a traveller browsing hotels, I want to compare two or three room types side by side before booking, so that I can make an informed decision about which room best fits my needs and budget.

#### Acceptance Criteria

1. WHEN a user views a hotel detail page that has at least two room types, THE System SHALL display an "Add to Compare" button on each room type card.
2. WHEN a user clicks "Add to Compare" on a room type, THE Comparison_Widget SHALL add that room to a comparison tray (a sticky bar at the bottom of the page) and SHALL update the button label to "Added ✓".
3. THE Comparison_Widget SHALL allow a maximum of 3 rooms to be added to the comparison tray at one time.
4. WHEN the comparison tray contains 2 or 3 rooms, THE Comparison_Widget SHALL display a "Compare Now" button in the tray.
5. WHEN a user clicks "Compare Now", THE Comparison_Widget SHALL open a full-screen modal displaying the selected rooms in side-by-side columns.
6. WHEN the comparison modal is open, THE Comparison_Widget SHALL display the following attributes for each room in aligned rows: room type name, price per night, maximum occupancy, amenities list, and a "Book This Room" button.
7. WHEN a user clicks "Book This Room" inside the comparison modal, THE System SHALL close the modal and navigate the user to the booking checkout flow pre-filled with the selected room type and hotel.
8. WHEN a user clicks "Remove" on a room in the comparison tray, THE Comparison_Widget SHALL remove that room from the tray and SHALL reset the corresponding "Add to Compare" button to its default state.
9. WHEN a user navigates away from the hotel detail page, THE Comparison_Widget SHALL clear the comparison tray.
10. IF a user attempts to add a 4th room to the comparison tray, THEN THE Comparison_Widget SHALL display a toast notification with the message "You can compare up to 3 rooms at a time. Remove a room to add another." and SHALL NOT add the room.
11. THE Comparison_Widget SHALL highlight the lowest-priced room in the comparison modal with a "Best Value" badge.
12. THE Comparison_Widget SHALL highlight the room with the highest maximum occupancy with a "Most Spacious" badge.

---

### Requirement 6: Admin Analytics Dashboard

**User Story:** As an admin, I want a dedicated analytics dashboard showing revenue charts, booking trends, popular routes, and a conversion funnel, so that I can monitor business performance and make data-driven decisions.

#### Acceptance Criteria

1. WHEN an admin navigates to the Admin Analytics Dashboard page, THE Analytics_Dashboard SHALL display a date-range filter (presets: Today, Last 7 Days, Last 30 Days, Last 90 Days, Custom Range) that applies to all charts on the page.
2. WHEN the date range filter is applied, THE Analytics_Dashboard SHALL fetch aggregated data from the backend and re-render all charts within 3 seconds.
3. THE Analytics_Dashboard SHALL display a Revenue Over Time chart showing total revenue grouped by day for the selected date range, rendered as a line chart.
4. THE Analytics_Dashboard SHALL display a Bookings by Category chart showing the count of bookings per category (flight, hotel, train, bus, cab, package) for the selected date range, rendered as a bar chart or pie chart.
5. THE Analytics_Dashboard SHALL display a Top 5 Popular Routes chart listing the five most frequently booked origin-destination pairs for flight, train, and bus bookings within the selected date range.
6. THE Analytics_Dashboard SHALL display a Conversion Funnel panel showing: total unique users who visited the site (approximated by registered users), total bookings initiated (bookings created), total bookings confirmed, and total bookings cancelled — for the selected date range.
7. THE Analytics_Dashboard SHALL display a Revenue by Category breakdown showing total revenue per booking category for the selected date range.
8. WHEN the backend analytics endpoint is called, THE System SHALL compute all aggregations using MongoDB aggregation pipelines and SHALL NOT perform aggregation in application memory.
9. THE Analytics_Dashboard SHALL display a summary row of KPI cards at the top of the page showing: Total Revenue, Total Bookings, Average Booking Value, and Cancellation Rate — all scoped to the selected date range.
10. IF no bookings exist for the selected date range, THEN THE Analytics_Dashboard SHALL display empty-state messages for each chart section rather than blank or broken chart areas.
11. THE Analytics_Dashboard SHALL be accessible only to users with `isAdmin: true` and SHALL return HTTP 403 for non-admin requests to the analytics API endpoints.
12. THE Analytics_Dashboard SHALL expose a dedicated backend route `GET /api/admin/analytics` that accepts `startDate` and `endDate` query parameters and returns all required aggregated data in a single response.

---

### Requirement 7: Push Notifications / Email Reminders

**User Story:** As a traveller, I want to receive timely email reminders about my upcoming trips (e.g., "Your flight is tomorrow", "Check-in opens in 24 hours"), so that I am never caught off-guard and can prepare in advance.

#### Acceptance Criteria

1. THE Notification_Service SHALL send a "Trip Tomorrow" email reminder to the contact email on a booking when the travel date is between 23 and 25 hours away, for flight, train, and bus bookings with status `Confirmed`.
2. THE Notification_Service SHALL send a "Check-in Opens" email reminder to the contact email on a hotel booking when the check-in date is between 23 and 25 hours away and the booking status is `Confirmed`.
3. THE Notification_Service SHALL send a "Package Departure" email reminder to the contact email on a package booking when the travel date is between 47 and 49 hours away and the booking status is `Confirmed`.
4. WHEN a reminder email is sent, THE Notification_Service SHALL record a `notificationLog` entry on the Booking document containing: `type` (e.g., `trip_tomorrow`, `checkin_opens`, `package_departure`), `sentAt` timestamp, `channel` (`email`), and `recipientEmail`.
5. THE Notification_Service SHALL NOT send a duplicate reminder of the same type to the same booking if a `notificationLog` entry of that type already exists on the booking.
6. THE Notification_Service SHALL be triggered by a scheduled job that runs every 30 minutes and queries for bookings whose travel date falls within the relevant reminder window.
7. WHEN a reminder email is sent, THE System SHALL use Nodemailer with the existing email configuration and SHALL include: booking ID, passenger name(s), travel route or hotel/package name, travel date, and a link to the user's profile page.
8. IF Nodemailer fails to send a reminder email, THEN THE Notification_Service SHALL log the error to the server console with the booking ID and SHALL NOT mark the notification as sent, allowing a retry on the next scheduled run.
9. THE Notification_Service SHALL expose an admin-only endpoint `POST /api/admin/notifications/trigger` that manually triggers the reminder job for testing purposes.
10. WHERE a booking's contact email is absent or malformed, THE Notification_Service SHALL skip that booking and log a warning with the booking ID.
11. THE System SHALL store a `notificationLog` array on the Booking document to persist the history of all sent notifications for that booking.

---

### Requirement 8: Review and Rating System

**User Story:** As a traveller who has completed a trip, I want to rate and review the hotel or package I experienced, so that other users can benefit from my feedback and the platform can surface quality options.

#### Acceptance Criteria

1. WHEN a booking's status is `Completed` and the booking category is `hotel` or `package`, THE System SHALL display a "Write a Review" button on the booking card in the Profile page "Your Tickets" tab.
2. WHEN a user clicks "Write a Review", THE System SHALL open a review modal that collects: a star rating (1–5), a review title (max 100 characters), and a review body (max 1000 characters).
3. WHEN a user submits a review, THE Review_Service SHALL validate that the booking status is `Completed`, that the booking belongs to the authenticated user, and that no review has previously been submitted for that booking.
4. WHEN a valid review is submitted for a hotel booking, THE Review_Service SHALL store the review in a `Review` MongoDB collection with fields: `userId`, `bookingId`, `hotelId`, `category` (`hotel`), `rating`, `title`, `body`, `isVisible` (default `true`), and `createdAt`.
5. WHEN a valid review is submitted for a package booking, THE Review_Service SHALL store the review in the `Review` collection with fields: `userId`, `bookingId`, `packageId`, `category` (`package`), `rating`, `title`, `body`, `isVisible` (default `true`), and `createdAt`.
6. WHEN a review is saved for a hotel, THE Review_Service SHALL recompute the hotel's aggregate rating as the arithmetic mean of all visible reviews for that hotel and update the `rating` field on the Hotel document.
7. WHEN a review is saved for a package, THE Review_Service SHALL recompute the package's aggregate `rating` and `totalReviews` fields on the Package document using all visible reviews for that package.
8. WHEN a user views a hotel detail page, THE System SHALL display the aggregate star rating and the 5 most recent visible reviews (reviewer name, star rating, title, body, date) for that hotel.
9. WHEN a user views a package detail page, THE System SHALL display the aggregate star rating and the 5 most recent visible reviews for that package.
10. THE Review_Service SHALL enforce one review per booking: IF a user attempts to submit a second review for the same booking, THEN THE System SHALL return an error with the message "You have already reviewed this booking."
11. WHEN an admin views the Admin Feedback page, THE System SHALL display all reviews (from the `Review` collection) alongside existing Feedback entries, with the ability to toggle `isVisible` to hide inappropriate reviews.
12. WHEN an admin hides a review (sets `isVisible` to `false`), THE Review_Service SHALL recompute the affected hotel's or package's aggregate rating excluding the hidden review.
13. THE Review_Service SHALL NOT allow reviews for flight, train, bus, or cab bookings through this feature (those categories are handled by the existing Feedback system).
14. IF a user attempts to submit a review for a booking that is not in `Completed` status, THEN THE System SHALL return an error with the message "Reviews can only be submitted for completed bookings."
