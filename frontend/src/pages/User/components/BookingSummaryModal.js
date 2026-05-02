import React, { useMemo, useRef, useState } from 'react';
import { formatCurrency } from '../../../utils/currency';
import { formatTravelDate } from '../../../utils/bookingDates';
import './BookingSummaryModal.css';

const SUPPORT_EMAIL = 'support@makemytrip.com';

const formatDateTime = (value, fallback = 'To be confirmed') => {
  if (!value) return fallback;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return String(value);

  return parsed.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const toTitleCase = (value = '') =>
  String(value)
    .toLowerCase()
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

const getPersonName = (person, index) => {
  if (!person) return `Traveller ${index + 1}`;
  if (typeof person === 'string') return person;
  if (person.firstName || person.lastName) {
    return `${person.firstName || ''} ${person.lastName || ''}`.trim() || `Traveller ${index + 1}`;
  }
  return person.name || `Traveller ${index + 1}`;
};

const getSeatDisplay = (booking = {}, index = 0) => {
  const selectedSeats = Array.isArray(booking.selectedSeats) ? booking.selectedSeats : [];
  const seat = selectedSeats[index];
  if (typeof seat === 'string') return seat;
  if (seat?.id) return seat.id;
  if (seat?.seatNumber) return seat.seatNumber;
  return '';
};

const normalizeCategory = (value = '') => {
  const category = String(value || '').trim().toLowerCase();
  if (category === 'flights') return 'flight';
  if (category === 'trains') return 'train';
  if (category === 'buses') return 'bus';
  if (category === 'hotels') return 'hotel';
  if (category === 'packages') return 'package';
  return category;
};

const getRouteParts = (booking = {}) => {
  const rawRoute = String(booking.details?.route || '').trim();
  const separators = ['->', '→', '-'];
  for (const separator of separators) {
    if (rawRoute.includes(separator)) {
      const parts = rawRoute.split(separator).map((part) => part.trim());
      if (parts[0] || parts[1]) {
        return { from: parts[0] || '', to: parts[1] || '' };
      }
    }
  }
  return { from: '', to: '' };
};

const getJourneyValue = (booking = {}, paths = []) => {
  for (const path of paths) {
    const value = path.split('.').reduce((acc, key) => acc?.[key], booking);
    if (value) return value;
  }
  return '';
};

const buildPassengerSummary = (booking = {}) => {
  const passengers = Array.isArray(booking.passengers) ? booking.passengers : [];
  if (!passengers.length) {
    return ['Primary traveller'];
  }

  return passengers.map((passenger, index) => {
    const name = getPersonName(passenger, index);
    const meta = [
      passenger?.gender ? String(passenger.gender) : '',
      passenger?.age ? `${passenger.age} yrs` : '',
      getSeatDisplay(booking, index) ? `Seat ${getSeatDisplay(booking, index)}` : ''
    ]
      .filter(Boolean)
      .join(', ');

    return meta ? `${name} (${meta})` : name;
  });
};

const buildTicketSummary = (booking = {}) => {
  const category = normalizeCategory(booking.category);
  const routeParts = getRouteParts(booking);

  if (category === 'flight' || category === 'flights') {
    return {
      title: getJourneyValue(booking, ['flight.airline', 'details.airline', 'title']) || 'Flight Booking',
      subtitle: getJourneyValue(booking, ['flight.flightNumber', 'details.flightNumber']) || 'Flight ticket',
      origin: getJourneyValue(booking, ['flight.from', 'from', 'details.from']) || routeParts.from || 'Origin',
      destination: getJourneyValue(booking, ['flight.to', 'to', 'details.to']) || routeParts.to || 'Destination',
      departAt: getJourneyValue(booking, ['flight.departureTime', 'details.departureTime']) || formatDateTime(booking.travelDate),
      arriveAt: getJourneyValue(booking, ['flight.arrivalTime', 'details.arrivalTime']) || 'Scheduled'
    };
  }

  if (category === 'train' || category === 'trains') {
    return {
      title: getJourneyValue(booking, ['train.trainName', 'details.trainName', 'title']) || 'Train Booking',
      subtitle: getJourneyValue(booking, ['train.trainNumber', 'pnr', 'details.trainNumber']) || 'Train ticket',
      origin: getJourneyValue(booking, ['train.from', 'from', 'details.from']) || routeParts.from || 'Origin',
      destination: getJourneyValue(booking, ['train.to', 'to', 'details.to']) || routeParts.to || 'Destination',
      departAt: getJourneyValue(booking, ['train.departureTime', 'details.departureTime']) || formatDateTime(booking.travelDate),
      arriveAt: getJourneyValue(booking, ['train.arrivalTime', 'details.arrivalTime']) || 'Scheduled'
    };
  }

  if (category === 'bus' || category === 'buses') {
    return {
      title: getJourneyValue(booking, ['bus.operatorName', 'details.operatorName', 'title']) || 'Bus Booking',
      subtitle: getJourneyValue(booking, ['bus.busType', 'details.busType']) || 'Bus ticket',
      origin: getJourneyValue(booking, ['bus.from', 'from', 'details.from']) || routeParts.from || 'Origin',
      destination: getJourneyValue(booking, ['bus.to', 'to', 'details.to']) || routeParts.to || 'Destination',
      departAt: getJourneyValue(booking, ['bus.departureTime', 'details.departureTime']) || formatDateTime(booking.travelDate),
      arriveAt: getJourneyValue(booking, ['bus.arrivalTime', 'details.arrivalTime']) || 'Scheduled'
    };
  }

  if (category === 'hotel' || category === 'hotels') {
    return {
      title: getJourneyValue(booking, ['hotel.name', 'details.hotelName', 'title']) || 'Hotel Booking',
      subtitle: getJourneyValue(booking, ['details.location', 'hotel.category']) || 'Stay confirmation',
      origin: getJourneyValue(booking, ['hotel.location.city', 'details.location', 'from']) || 'Check-in',
      destination: getJourneyValue(booking, ['hotel.location.address', 'hotel.name', 'details.location', 'to']) || 'Hotel',
      departAt: formatDateTime(getJourneyValue(booking, ['hotel.checkIn', 'checkInDate', 'checkIn', 'travelDate'])),
      arriveAt: formatDateTime(getJourneyValue(booking, ['hotel.checkOut', 'checkOutDate', 'checkOut']))
    };
  }

  if (category === 'cab' || category === 'cabs') {
    return {
      title: getJourneyValue(booking, ['cab.cabType', 'cabType', 'details.cabType']) || 'Cab Booking',
      subtitle: getJourneyValue(booking, ['cab.vehicleNumber', 'details.vehicleNumber']) || 'Ride confirmation',
      origin: getJourneyValue(booking, ['cab.pickupLocation', 'pickupLocation', 'from', 'details.pickupLocation']) || routeParts.from || 'Pickup',
      destination: getJourneyValue(booking, ['cab.dropLocation', 'dropLocation', 'to', 'details.dropLocation']) || routeParts.to || 'Drop-off',
      departAt: formatDateTime(getJourneyValue(booking, ['cab.pickupDateTime', 'pickupDateTime', 'travelDate'])),
      arriveAt: getJourneyValue(booking, ['cab.duration', 'details.duration']) ? `${getJourneyValue(booking, ['cab.duration', 'details.duration'])} mins` : 'On route'
    };
  }

  if (category === 'package' || category === 'packages') {
    return {
      title: getJourneyValue(booking, ['package.title', 'title', 'details.packageTitle']) || 'Holiday Package',
      subtitle: getJourneyValue(booking, ['package.packageCode', 'details.packageCode']) || 'Package confirmation',
      origin: getJourneyValue(booking, ['package.destination.state', 'from', 'details.departureCity']) || 'Departure',
      destination: getJourneyValue(booking, ['package.destination.country', 'details.destination']) || 'Destination',
      departAt: formatDateTime(getJourneyValue(booking, ['travelDate', 'details.checkIn'])),
      arriveAt: getJourneyValue(booking, ['package.duration.days', 'details.duration'])
        ? `${getJourneyValue(booking, ['package.duration.nights', 'details.nights']) || 0}N / ${getJourneyValue(booking, ['package.duration.days', 'details.duration'])}D`
        : 'Scheduled'
    };
  }

  return {
    title: 'Travel Booking',
    subtitle: 'Booking confirmation',
    origin: routeParts.from || booking.from || 'Origin',
    destination: routeParts.to || booking.to || 'Destination',
    departAt: formatDateTime(booking.travelDate || booking.createdAt),
    arriveAt: 'Scheduled'
  };
};

const BookingSummaryModal = ({ booking, onClose, autoDownloadOnOpen = false, onAutoDownloadComplete }) => {
  const ticketRef = useRef(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [hasAutoDownloaded, setHasAutoDownloaded] = useState(false);

  React.useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  const exportTicketPdf = React.useCallback(async () => {
    if (!ticketRef.current || !booking) return;

    const { default: html2pdf } = await import('html2pdf.js');
    return html2pdf()
      .from(ticketRef.current)
      .set({
        margin: [0, 0],
        filename: `MakeMyTrip-Ticket-${String(booking._id || '').slice(-8)}.pdf`,
        image: { type: 'jpeg', quality: 1 },
        html2canvas: { scale: 2.2, useCORS: true, backgroundColor: '#f4f7fb' },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      })
      .save();
  }, [booking]);

  React.useEffect(() => {
    if (!booking || !autoDownloadOnOpen || hasAutoDownloaded || isDownloading) return undefined;

    const timer = window.setTimeout(() => {
      setHasAutoDownloaded(true);
      setIsDownloading(true);
      exportTicketPdf()
        .then(() => {
          setIsDownloading(false);
          if (typeof onAutoDownloadComplete === 'function') onAutoDownloadComplete();
        })
        .catch((error) => {
          console.error('PDF Export Error:', error);
          setIsDownloading(false);
        });
    }, 250);

    return () => window.clearTimeout(timer);
  }, [booking, autoDownloadOnOpen, hasAutoDownloaded, isDownloading, onAutoDownloadComplete, exportTicketPdf]);

  const handleDownload = () => {
    if (isDownloading) return;
    setIsDownloading(true);
    exportTicketPdf()
      .then(() => {
        setIsDownloading(false);
        if (typeof onAutoDownloadComplete === 'function') onAutoDownloadComplete();
      })
      .catch((error) => {
        console.error('PDF Export Error:', error);
        setIsDownloading(false);
      });
  };

  const ticketContent = useMemo(() => {
    if (!booking) return null;

    const summary = buildTicketSummary(booking);
    const passengers = buildPassengerSummary(booking);
    const bookingId = String(booking._id || 'N/A').toUpperCase();
    const pnr = booking.pnr ? String(booking.pnr) : null;
    const bookingDate = formatDateTime(booking.bookingDate || booking.createdAt);
    const travelDate = formatTravelDate(
      getJourneyValue(booking, [
        'travelDate',
        'date',
        'pickupDateTime',
        'checkIn',
        'details.pickupDateTime',
        'details.checkIn'
      ]),
      'TBD'
    );
    const paymentMethod = toTitleCase(
      booking.payment?.externalPaymentMethod || booking.payment?.method || 'Online'
    );
    const status = booking.status || 'Confirmed';
    const walletUsed = Number(booking?.payment?.walletAmountUsed || 0);
    const externalPaid = Number(booking?.payment?.externalAmountPaid || 0);
    const couponDiscount = Number(booking?.couponDiscount || 0);
    const subtotalFare = Number(booking?.subtotalFare || booking?.totalFare || 0);
    const couponCode = booking?.couponCode ? String(booking.couponCode).toUpperCase() : null;

    const paymentRows = [];
    
    // Show fare breakdown if coupon was applied
    if (subtotalFare > 0 && couponDiscount > 0) {
      paymentRows.push({ label: 'Subtotal', value: formatCurrency(subtotalFare) });
      if (couponCode) {
        paymentRows.push({ label: `Coupon (${couponCode})`, value: `- ${formatCurrency(couponDiscount)}` });
      } else {
        paymentRows.push({ label: 'Coupon Discount', value: `- ${formatCurrency(couponDiscount)}` });
      }
    }
    
    paymentRows.push({ label: 'Total Paid', value: formatCurrency(booking.totalFare || 0) });
    paymentRows.push({ label: 'Payment Method', value: paymentMethod });

    if (walletUsed > 0) {
      paymentRows.push({ label: 'Wallet Used', value: formatCurrency(walletUsed) });
    }

    if (externalPaid > 0) {
      paymentRows.push({ label: 'External Paid', value: formatCurrency(externalPaid) });
    }

    const manageUrl = `${window.location.origin}/profile`;

    const detailsRows = [
      { label: 'Booking ID', value: bookingId },
      { label: 'Status', value: status },
      { label: 'Category', value: toTitleCase(booking.category || 'Travel') },
      {
        label: 'Traveller',
        value: booking.contactDetails?.name || getPersonName(booking.passengers?.[0], 0) || 'Customer'
      },
      { label: 'Contact Email', value: booking.contactDetails?.email || booking.user?.email || 'Not provided' },
      { label: 'Contact Phone', value: booking.contactDetails?.phone || booking.user?.mobile || 'Not provided' },
      { label: 'Booked On', value: bookingDate },
      { label: 'Travel Date', value: travelDate }
    ];

    // Add PNR if available (for trains)
    if (pnr) {
      detailsRows.splice(1, 0, { label: 'PNR', value: pnr });
    }

    return {
      bookingId,
      pnr,
      bookingDate,
      status,
      summary,
      passengers,
      paymentRows,
      detailsRows,
      journeyRows: [
        { label: 'Service', value: summary.title },
        { label: 'Reference', value: summary.subtitle },
        { label: 'From', value: summary.origin },
        { label: 'To', value: summary.destination },
        { label: 'Travel Date', value: travelDate },
        { label: 'Departure / Check-in', value: summary.departAt },
        { label: 'Arrival / Check-out', value: summary.arriveAt }
      ],
      importantLines: [
        'Please carry a valid photo ID during travel or check-in.',
        `Manage your booking: ${manageUrl}`
      ]
    };
  }, [booking]);

  if (!booking || !ticketContent) return null;

  const renderRows = (rows) => (
    <div className="email-ticket-section__rows">
      {rows.map((row) => (
        <div className="email-ticket-row" key={`${row.label}-${row.value}`}>
          <span className="email-ticket-row__label">{row.label}</span>
          <span className="email-ticket-row__value">{row.value}</span>
        </div>
      ))}
    </div>
  );

  return (
    <div className="luxury-modal-overlay" onClick={onClose}>
      <div className="email-ticket-pdf-shell">
        <div className="email-ticket-pdf" ref={ticketRef}>
          <div className="email-ticket-pdf__inner">
            <div className="email-ticket-preview">
              <div className="email-ticket-preview__hero">
                <div>
                  <div className="email-ticket-preview__brand">MakeMyTrip</div>
                  <div className="email-ticket-preview__subhead">Booking confirmation</div>
                </div>
                <div className="email-ticket-preview__hero-meta">
                  <div>Booking {ticketContent.bookingId}</div>
                  <div>Generated on {formatDateTime(new Date())}</div>
                </div>
              </div>

              <div className="email-ticket-section">
                <h3>Booking Details</h3>
                {renderRows(ticketContent.detailsRows)}
              </div>

              <div className="email-ticket-section">
                <h3>Journey Details</h3>
                {renderRows(ticketContent.journeyRows)}
              </div>

              <div className="email-ticket-section">
                <h3>Payment Details</h3>
                {renderRows(ticketContent.paymentRows)}
              </div>

              <div className="email-ticket-section">
                <h3>Passenger Details</h3>
                <div className="email-ticket-passengers">
                  {ticketContent.passengers.map((passenger, index) => (
                    <div className="email-ticket-passenger" key={`${passenger}-${index}`}>
                      {index + 1}. {passenger}
                    </div>
                  ))}
                </div>
              </div>

              <div className="email-ticket-note">
                <div className="email-ticket-note__title">Important</div>
                {ticketContent.importantLines.map((line) => (
                  <div key={line}>{line}</div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="luxury-modal-content luxury-modal-content--ticket" onClick={(event) => event.stopPropagation()}>
        <button className="luxury-close" onClick={onClose}>&times;</button>

        <div className="luxury-body">
          <div className="email-ticket-preview email-ticket-preview--onscreen">
            <div className="email-ticket-preview__hero">
              <div>
                <div className="email-ticket-preview__brand">MakeMyTrip</div>
                <div className="email-ticket-preview__subhead">Booking confirmation</div>
              </div>
              <div className="email-ticket-preview__hero-meta">
                <div>{ticketContent.bookingId}</div>
                <div>{ticketContent.status}</div>
              </div>
            </div>

            <p className="email-ticket-preview__intro">
              This ticket now follows the same structure as the email ticket you receive after booking.
            </p>

            <div className="email-ticket-section">
              <h3>Booking Details</h3>
              {renderRows(ticketContent.detailsRows)}
            </div>

            <div className="email-ticket-section">
              <h3>Journey Details</h3>
              {renderRows(ticketContent.journeyRows)}
            </div>

            <div className="email-ticket-section">
              <h3>Payment Details</h3>
              {renderRows(ticketContent.paymentRows)}
            </div>

            <div className="email-ticket-section">
              <h3>Passenger Details</h3>
              <div className="email-ticket-passengers">
                {ticketContent.passengers.map((passenger, index) => (
                  <div className="email-ticket-passenger" key={`${passenger}-${index}`}>
                    {index + 1}. {passenger}
                  </div>
                ))}
              </div>
            </div>

            <div className="email-ticket-note">
              <div className="email-ticket-note__title">Important</div>
              {ticketContent.importantLines.map((line) => (
                <div key={line}>{line}</div>
              ))}
            </div>

            <p className="email-ticket-preview__support">
              Need help? Contact <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.
            </p>
          </div>
        </div>

        <footer className="luxury-footer">
          <button className="luxury-btn outlined" onClick={onClose}>Close</button>
          <button className="luxury-btn gradient" onClick={handleDownload} disabled={isDownloading}>
            {isDownloading ? 'Generating Ticket...' : 'Download E-Ticket'}
          </button>
        </footer>
      </div>
    </div>
  );
};

export default BookingSummaryModal;
