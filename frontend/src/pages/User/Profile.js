import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useBookings } from '../../contexts/BookingContext';
import { useNavigate } from 'react-router-dom';
import BookingSummaryModal from './components/BookingSummaryModal';
import FeedbackModal from './components/FeedbackModal';
import CancelBookingModal from './components/CancelBookingModal';
import apiClient from '../../services/apiClient';
import API_BASE_URL from '../../utils/api';
import { getWalletSummary } from '../../services/walletService';
import { useToast } from '../../contexts/ToastContext';
import { formatCurrency } from '../../utils/currency';
import './Profile.css';

const CATS = ['all', 'flight', 'hotel', 'train', 'bus', 'cab', 'package'];
const CATEGORY_FILTER_OPTIONS = [
  { value: 'all', label: 'All categories' },
  { value: 'flight', label: 'Flight' },
  { value: 'hotel', label: 'Hotel' },
  { value: 'train', label: 'Train' },
  { value: 'bus', label: 'Bus' },
  { value: 'cab', label: 'Cab' },
  { value: 'package', label: 'Package' }
];
const STATUS_FILTER_OPTIONS = [
  { value: 'all', label: 'All bookings' },
  { value: 'confirmed', label: 'Confirmed bookings' },
  { value: 'cancelled', label: 'Cancelled bookings' },
  { value: 'completed', label: 'Completed bookings' }
];
const PAYMENT_FILTER_DEFAULTS = {
  bookingType: 'all',
  status: 'all',
  paymentMethod: 'all',
  dateFrom: '',
  dateTo: '',
  amountMin: '',
  amountMax: '',
  refundStatus: 'all'
};
const PAYMENT_METHOD_OPTIONS = [
  { value: 'all', label: 'All methods' },
  { value: 'card', label: 'Card' },
  { value: 'upi', label: 'UPI' },
  { value: 'netbanking', label: 'Net Banking' },
  { value: 'wallet', label: 'MakeMyTrip Wallet' }
];
const PAYMENT_STATUS_OPTIONS = [
  { value: 'all', label: 'All statuses' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'partially cancelled', label: 'Partially cancelled' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'fully cancelled', label: 'Fully cancelled' },
  { value: 'completed', label: 'Completed' }
];
const REFUND_STATUS_OPTIONS = [
  { value: 'all', label: 'All refunds' },
  { value: 'refunded', label: 'Refunded' },
  { value: 'partial-refund', label: 'Partial refund' },
  { value: 'no-refund', label: 'Cancelled without refund' },
  { value: 'not-refunded', label: 'No refund involved' }
];
const PROFILE_TABS = [
  { id: 'overview', label: 'Overview', icon: 'OV' },
  { id: 'wallet', label: 'MakeMyTrip Wallet', icon: 'WL' },
  { id: 'tickets', label: 'Your Tickets', icon: 'TK' },
  { id: 'bookings', label: 'Booking History', icon: 'BH' },
  { id: 'payments', label: 'Payment History', icon: 'PY' },
  { id: 'account', label: 'Account', icon: 'AC' },
  { id: 'security', label: 'Security', icon: 'SC' }
];

const parseRoute = (route = '') => {
  if (!route || typeof route !== 'string') return { from: '', to: '' };
  const parts = route.split('->').map(part => part.trim());
  if (parts.length === 2) return { from: parts[0], to: parts[1] };
  const fallback = route.split('->').map(part => part.trim());
  return fallback.length === 2 ? { from: fallback[0], to: fallback[1] } : { from: route, to: '' };
};

const safeDateValue = (value) => {
  if (!value) return undefined;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed.toISOString();
};

const toDateInputValue = (value) => {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, "0");
  const day = String(parsed.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const isWithinDaysFromToday = (value, limitDays = 15) => {
  const dateValue = toDateInputValue(value);
  if (!dateValue) return false;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const maxDate = new Date(today);
  maxDate.setDate(maxDate.getDate() + limitDays);

  const candidate = new Date(`${dateValue}T00:00:00`);
  if (Number.isNaN(candidate.getTime())) return false;
  candidate.setHours(0, 0, 0, 0);

  return candidate >= today && candidate <= maxDate;
};

const normalizeCategory = (value = '') => {
  const lower = String(value).toLowerCase();
  if (lower === 'flights') return 'flight';
  if (lower === 'hotels') return 'hotel';
  if (lower === 'packages') return 'package';
  if (lower === 'cabs') return 'cab';
  return lower;
};

const buildProfileFormData = (user = {}) => {
  const nameParts = String(user?.name || "").trim().split(/\s+/).filter(Boolean);

  return {
    firstName: nameParts[0] || '',
    lastName: nameParts.slice(1).join(' '),
    email: user?.email || '',
    mobile: user?.mobile || '',
    dateOfBirth: toDateInputValue(user?.dateOfBirth),
    gender: user?.gender || '',
    address: user?.address || '',
    city: user?.city || '',
    state: user?.state || '',
    pincode: user?.pincode || '',
    country: user?.country || 'India'
  };
};

const getFeedbackButtonLabel = (value = '') => {
  const category = normalizeCategory(value);
  if (category === 'flight') return 'Rate Flight';
  if (category === 'hotel') return 'Rate Hotel';
  if (category === 'train') return 'Rate Train';
  if (category === 'bus') return 'Rate Bus';
  if (category === 'cab') return 'Rate Cab';
  if (category === 'package') return 'Rate Package';
  return 'Give Feedback';
};

const getCategoryBadge = (value = '') => {
  const category = normalizeCategory(value);
  if (category === 'flight') return 'FL';
  if (category === 'hotel') return 'HT';
  if (category === 'train') return 'TR';
  if (category === 'bus') return 'BS';
  if (category === 'cab') return 'CB';
  if (category === 'package') return 'PK';
  return 'BK';
};

const formatDisplayDate = (value, options = {}) => {
  if (!value) return '';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '';
  return parsed.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    ...options
  });
};

const formatDisplayTime = (value) => {
  if (!value) return 'Flexible';
  if (typeof value === 'string' && /^\d{1,2}:\d{2}/.test(value)) {
    return value;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return String(value);
  }

  return parsed.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
};

const normalizeBookingStatus = (value = '') => String(value || '').trim().toLowerCase();
const isFullyCancelledStatus = (value = '') => ['cancelled', 'fully cancelled'].includes(normalizeBookingStatus(value));

const getActivePassengerCount = (booking = {}) => {
  const passengers = Array.isArray(booking.passengers) ? booking.passengers : [];
  if (passengers.length === 0) return 1;
  const activeCount = passengers.filter((passenger) => String(passenger?.status || 'active').toLowerCase() !== 'cancelled').length;
  return activeCount > 0 ? activeCount : passengers.length;
};

const isBookingCancelable = (booking = {}) => {
  const normalizedStatus = normalizeBookingStatus(booking.status);
  if (!['confirmed', 'partially cancelled'].includes(normalizedStatus)) return false;

  const category = String(booking.category || '').toLowerCase();
  if (['flight', 'train', 'bus'].includes(category) && Array.isArray(booking.passengers) && booking.passengers.length > 0) {
    return booking.passengers.some((passenger) => String(passenger?.status || 'active').toLowerCase() !== 'cancelled');
  }

  if (category === 'hotel' && Array.isArray(booking?.hotel?.rooms) && booking.hotel.rooms.length > 0) {
    return booking.hotel.rooms.some((room) => String(room?.status || 'active').toLowerCase() !== 'cancelled');
  }

  return true;
};

const getCancellationActionMeta = (booking = {}) => {
  const canCancel = isBookingCancelable(booking);
  const category = normalizeCategory(booking.category);

  if (!canCancel) {
    return {
      canCancel: false,
      canPartiallyCancel: false,
      buttonLabel: 'Cancel Booking',
      badgeLabel: '',
      supportText: ''
    };
  }

  if (['flight', 'train', 'bus'].includes(category)) {
    const activePassengers = getActivePassengerCount(booking);
    const canPartiallyCancel = activePassengers > 1;

    return {
      canCancel: true,
      canPartiallyCancel,
      buttonLabel: canPartiallyCancel ? 'Partial / Full Cancel' : 'Cancel Booking',
      badgeLabel: canPartiallyCancel ? 'Partial cancellation available' : 'Cancellation available',
      supportText: canPartiallyCancel
        ? `Cancel selected passengers or the full booking. ${activePassengers} active travellers are available right now.`
        : 'Only one active traveller is left, so full cancellation will apply for this ticket.'
    };
  }

  if (category === 'hotel') {
    const rooms = Array.isArray(booking?.hotel?.rooms) ? booking.hotel.rooms : [];
    const activeRooms = rooms.filter((room) => String(room?.status || 'active').toLowerCase() !== 'cancelled').length;
    const canPartiallyCancel = activeRooms > 1;

    return {
      canCancel: true,
      canPartiallyCancel,
      buttonLabel: canPartiallyCancel ? 'Partial / Full Cancel' : 'Cancel Booking',
      badgeLabel: canPartiallyCancel ? 'Partial cancellation available' : 'Cancellation available',
      supportText: canPartiallyCancel
        ? `Cancel selected room bookings or cancel the complete stay. ${activeRooms} active rooms are available right now.`
        : 'Only one active room is left, so full cancellation will apply for this booking.'
    };
  }

  return {
    canCancel: true,
    canPartiallyCancel: false,
    buttonLabel: 'Cancel Booking',
    badgeLabel: 'Cancellation available',
    supportText: 'Open cancellation to review refund policy and confirm this booking cancellation.'
  };
};

const getShortLocation = (value = '') => {
  if (!value || typeof value !== 'string') return '';
  return value.split(',')[0].trim();
};

const getFlightRebookState = (booking = {}) => {
  const from = getShortLocation(booking.flight?.from || booking.details?.route?.split('->')?.[0] || booking.from || '');
  const to = getShortLocation(booking.flight?.to || booking.details?.route?.split('->')?.[1] || booking.to || '');
  const departure = toDateInputValue(booking.travelDate || booking.date || booking.flight?.date || booking.details?.date);

  if (!from || !to || !departure || !isWithinDaysFromToday(departure, 15)) return null;

  return {
    from,
    to,
    departure,
    tripType: 'oneway',
    rebookFromBookingId: booking._id || booking.id || '',
    rebookFromBookingNumber: booking.flight?.flightNumber || ''
  };
};

const getWalletTransactionLabel = (tx = {}) => {
  if (tx.description) return tx.description;
  if (tx.source) {
    return tx.source
      .split('_')
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
      .join(' ');
  }
  return tx.type === 'credit' ? 'Wallet credited' : 'Wallet used';
};

const normalizePaymentMethodValue = (value = '') => {
  const method = String(value || '').trim().toLowerCase();

  if (!method || method === 'online') return 'other';
  if (method.includes('wallet')) return 'wallet';
  if (method.includes('upi')) return 'upi';
  if (method.includes('netbanking') || method.includes('net banking')) return 'netbanking';
  if (method.includes('card') || method.includes('credit') || method.includes('debit') || method.includes('rupay')) {
    return 'card';
  }

  return 'other';
};

const getPaymentMethodFilterKeys = (payment = {}) => {
  const keys = new Set();
  const walletAmountUsed = Number(payment?.walletAmountUsed || 0);
  const externalAmountPaid = Number(payment?.externalAmountPaid || 0);
  const primaryMethod = normalizePaymentMethodValue(payment?.method);
  const externalMethod = normalizePaymentMethodValue(payment?.externalPaymentMethod || payment?.provider || payment?.subMethod);

  if (primaryMethod === 'wallet' || walletAmountUsed > 0) {
    keys.add('wallet');
  }

  if (externalAmountPaid > 0) {
    if (externalMethod !== 'other' && externalMethod !== 'wallet') {
      keys.add(externalMethod);
    } else if (primaryMethod !== 'wallet' && primaryMethod !== 'other') {
      keys.add(primaryMethod);
    }
  } else if (primaryMethod !== 'other') {
    keys.add(primaryMethod);
  }

  return Array.from(keys);
};

const getPaymentMethodKey = (payment = {}) => {
  const keys = getPaymentMethodFilterKeys(payment);

  if (keys.includes('wallet') && keys.length === 1) return 'wallet';
  if (keys.includes('card')) return 'card';
  if (keys.includes('upi')) return 'upi';
  if (keys.includes('netbanking')) return 'netbanking';
  if (keys.includes('wallet')) return 'wallet';
  return 'other';
};

const getPaymentMethodText = (key = '') => {
  if (key === 'wallet') return 'MAKEMYTRIP WALLET';
  if (key === 'card') return 'CARD';
  if (key === 'upi') return 'UPI';
  if (key === 'netbanking') return 'NET BANKING';
  return 'ONLINE';
};

const getPaymentMethodLabel = (payment = {}) => {
  const keys = getPaymentMethodFilterKeys(payment);

  if (keys.length === 0) return 'ONLINE';
  if (keys.length === 1) return getPaymentMethodText(keys[0]);

  const orderedKeys = ['wallet', 'card', 'upi', 'netbanking']
    .filter((key) => keys.includes(key));

  return orderedKeys.map(getPaymentMethodText).join(' + ');
};

const getPaymentMethodBadgeText = (payment = {}) => {
  const key = getPaymentMethodKey(payment);
  if (key === 'wallet') return 'WL';
  if (key === 'card') return 'CD';
  if (key === 'netbanking') return 'NB';
  return 'UPI';
};

const getRefundStatusKey = (booking = {}) => {
  const refundAmount = Number(booking.refundAmount || 0);
  const status = normalizeBookingStatus(booking.status);
  const partialCancellations = Array.isArray(booking.partialCancellations) ? booking.partialCancellations.length : 0;

  if (refundAmount > 0 && (status === 'partially cancelled' || partialCancellations > 0)) {
    return 'partial-refund';
  }

  if (refundAmount > 0) return 'refunded';
  if (isFullyCancelledStatus(status)) return 'no-refund';
  return 'not-refunded';
};

const getRefundStatusLabel = (booking = {}) => {
  const key = getRefundStatusKey(booking);
  if (key === 'partial-refund') return 'Partial refund';
  if (key === 'refunded') return 'Refunded';
  if (key === 'no-refund') return 'Cancelled without refund';
  return 'No refund';
};

const normalizeFareAmount = (value = 0) => {
  const amount = Number(value);
  return Number.isFinite(amount) && amount > 0 ? amount : 0;
};

const getRefundDestinationLabel = (booking = {}) => {
  const explicitDestination = String(
    booking.refundDestination || booking?.payment?.refundDestination || ''
  ).trim().toLowerCase();

  if (explicitDestination.includes('wallet')) return 'MakeMyTrip Wallet';

  if (explicitDestination.includes('original') || explicitDestination.includes('payment')) {
    const methodLabel = getPaymentMethodText(
      normalizePaymentMethodValue(booking?.payment?.externalPaymentMethod || booking?.payment?.method)
    );
    return methodLabel === 'ONLINE' ? 'original payment method' : methodLabel;
  }

  if (normalizeFareAmount(booking.refundAmount) > 0) return 'MakeMyTrip Wallet';

  const externalMethodLabel = getPaymentMethodText(
    normalizePaymentMethodValue(booking?.payment?.externalPaymentMethod || booking?.payment?.method)
  );

  return externalMethodLabel === 'ONLINE' ? 'MakeMyTrip Wallet' : externalMethodLabel;
};

const getPartialFareBreakdown = (booking = {}) => {
  const status = normalizeBookingStatus(booking.status);
  const partialCancellations = Array.isArray(booking.partialCancellations) ? booking.partialCancellations : [];
  const isPartial = status === 'partially cancelled' || partialCancellations.length > 0;

  if (!isPartial) return null;

  const totalOriginalFare = normalizeFareAmount(booking.totalFare || 0);
  const cancelledBaseAmount = Math.min(
    partialCancellations.reduce((sum, entry) => sum + normalizeFareAmount(entry?.cancelledBaseAmount), 0),
    totalOriginalFare
  );
  const cancelledTravellerRefund = Math.min(normalizeFareAmount(booking.refundAmount || 0), totalOriginalFare);
  const remainingActiveFare = Math.max(totalOriginalFare - cancelledBaseAmount, 0);
  const cancellationCharges = Math.max(cancelledBaseAmount - cancelledTravellerRefund, 0);
  const refundDestinationLabel = getRefundDestinationLabel(booking);
  const cancelledRefundLabel = normalizeCategory(booking.category) === 'hotel'
    ? 'Cancelled Room Refund'
    : 'Cancelled Traveller Refund';

  return {
    totalOriginalFare,
    cancelledTravellerRefund,
    remainingActiveFare,
    cancellationCharges,
    refundDestinationLabel,
    cancelledRefundLabel
  };
};

const getPartialCancellationBadge = (booking = {}) => {
  const fareBreakdown = getPartialFareBreakdown(booking);
  if (!fareBreakdown) return null;

  return {
    title: 'Partially Cancelled',
    message: fareBreakdown.cancelledTravellerRefund > 0
      ? `${formatCurrency(fareBreakdown.cancelledTravellerRefund)} refunded to ${fareBreakdown.refundDestinationLabel}`
      : 'No refund credited',
    emphasized: fareBreakdown.cancelledTravellerRefund > 0,
    breakdown: fareBreakdown
  };
};

const getPaymentRouteSummary = (booking = {}) => {
  const ticket = getTicketCardData(booking);
  return `${ticket.from} to ${ticket.to}`;
};

const getTicketCardData = (booking = {}) => {
  const category = normalizeCategory(booking.category);
  const travelDate = formatDisplayDate(booking.travelDate || booking.createdAt, {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  }) || 'Date pending';
  const passengers = getActivePassengerCount(booking);
  const fallbackCode = String(booking.pnr || booking._id || booking.id || '').slice(-8).toUpperCase();

  const baseCard = {
    categoryLabel: booking.category?.toUpperCase() || 'TRAVEL',
    serviceName: booking.category ? `${booking.category} booking` : 'Travel booking',
    serviceMeta: `Booking ID ${fallbackCode}`,
    codeLabel: booking.pnr ? `PNR ${booking.pnr}` : `ID ${fallbackCode}`,
    from: getShortLocation(booking.from) || 'Origin',
    to: getShortLocation(booking.to) || 'Destination',
    departTime: formatDisplayTime(booking.travelDate || booking.createdAt),
    arriveTime: 'Scheduled',
    departLabel: 'Departure',
    arriveLabel: 'Arrival',
    dateLabel: 'Travel date',
    passengerLabel: 'Travellers',
    fareLabel: 'Total paid',
    dateValue: travelDate,
    passengerValue: `${passengers} traveller${passengers > 1 ? 's' : ''}`,
    fareValue: formatCurrency(booking.totalFare || 0),
    statusText: booking.status?.toUpperCase() || 'CONFIRMED',
    supportText: 'Manage ticket, summary, and cancellation from here.',
    journeyPreview: `${getShortLocation(booking.from) || 'Origin'} -> ${getShortLocation(booking.to) || 'Destination'}`
  };

  if (category === 'flight') {
    return {
      ...baseCard,
      categoryLabel: 'FLIGHT TICKET',
      serviceName: booking.flight?.airline || 'Flight reservation',
      serviceMeta: booking.flight?.flightNumber || baseCard.serviceMeta,
      from: booking.from || booking.flight?.from || baseCard.from,
      to: booking.to || booking.flight?.to || baseCard.to,
      departTime: booking.flight?.departureTime || baseCard.departTime,
      arriveTime: booking.flight?.arrivalTime || 'Landing soon',
      journeyPreview: `${getShortLocation(booking.flight?.from || booking.from) || baseCard.from} -> ${getShortLocation(booking.flight?.to || booking.to) || baseCard.to}`,
      supportText: 'Download your itinerary or manage cancellation before departure.'
    };
  }

  if (category === 'bus') {
    return {
      ...baseCard,
      categoryLabel: 'BUS TICKET',
      serviceName: booking.bus?.operatorName || 'Bus reservation',
      serviceMeta: booking.bus?.busType || baseCard.serviceMeta,
      from: booking.from || booking.bus?.from || baseCard.from,
      to: booking.to || booking.bus?.to || baseCard.to,
      departTime: booking.bus?.departureTime || baseCard.departTime,
      arriveTime: booking.bus?.arrivalTime || 'Arrival pending',
      journeyPreview: `${getShortLocation(booking.bus?.from || booking.from) || baseCard.from} -> ${getShortLocation(booking.bus?.to || booking.to) || baseCard.to}`,
      supportText: 'Keep this ticket ready for boarding and support requests.'
    };
  }

  if (category === 'train') {
    return {
      ...baseCard,
      categoryLabel: 'TRAIN TICKET',
      serviceName: booking.train?.trainName || 'Train reservation',
      serviceMeta: booking.train?.trainNumber || fallbackCode,
      from: booking.from || booking.train?.from || baseCard.from,
      to: booking.to || booking.train?.to || baseCard.to,
      departTime: booking.train?.departureTime || baseCard.departTime,
      arriveTime: booking.train?.arrivalTime || 'Arrival pending',
      journeyPreview: `${getShortLocation(booking.train?.from || booking.from) || baseCard.from} -> ${getShortLocation(booking.train?.to || booking.to) || baseCard.to}`,
      supportText: 'Use this ticket for summary, status, and journey management.'
    };
  }

  if (category === 'cab') {
    return {
      ...baseCard,
      categoryLabel: 'CAB TICKET',
      serviceName: booking.cab?.cabType || 'Cab booking',
      serviceMeta: getShortLocation(booking.cab?.pickupLocation) || baseCard.serviceMeta,
      from: getShortLocation(booking.cab?.pickupLocation) || baseCard.from,
      to: getShortLocation(booking.cab?.dropLocation) || baseCard.to,
      departTime: formatDisplayTime(booking.cab?.pickupDateTime || booking.travelDate),
      arriveTime: 'On route',
      departLabel: 'Pickup',
      arriveLabel: 'Drop-off',
      journeyPreview: `${getShortLocation(booking.cab?.pickupLocation || booking.from) || baseCard.from} -> ${getShortLocation(booking.cab?.dropLocation || booking.to) || baseCard.to}`,
      supportText: 'Access pickup details, trip summary, and cancellation quickly.'
    };
  }

  if (category === 'hotel') {
    return {
      ...baseCard,
      categoryLabel: 'HOTEL STAY',
      serviceName: booking.hotel?.name || 'Hotel booking',
      serviceMeta: booking.roomType || booking.hotel?.location?.city || baseCard.serviceMeta,
      from: booking.hotel?.location?.city || 'Check-in',
      to: booking.hotel?.name || 'Hotel',
      departTime: formatDisplayDate(booking.checkInDate || booking.travelDate, {
        day: 'numeric',
        month: 'short'
      }) || 'Check-in',
      arriveTime: formatDisplayDate(booking.checkOutDate, {
        day: 'numeric',
        month: 'short'
      }) || 'Check-out',
      departLabel: 'Check-in',
      arriveLabel: 'Check-out',
      dateLabel: 'Stay starts',
      journeyPreview: `${booking.hotel?.location?.city || 'Check-in'} • ${booking.roomType || booking.hotel?.roomType || 'Room'}`,
      supportText: 'Review your stay details, summary, and refund status in one place.'
    };
  }

  if (category === 'package') {
    return {
      ...baseCard,
      categoryLabel: 'PACKAGE PASS',
      serviceName: booking.package?.title || 'Holiday package',
      serviceMeta: booking.package?.duration?.days
        ? `${booking.package?.duration?.nights || 0}N / ${booking.package?.duration?.days}D`
        : baseCard.serviceMeta,
      from: booking.package?.title || 'Holiday',
      to: booking.package?.destination?.country || 'Destination',
      departTime: travelDate,
      arriveTime: booking.package?.duration?.days
        ? `${booking.package?.duration?.nights || 0}N / ${booking.package?.duration?.days}D`
        : 'Planned trip',
      departLabel: 'Package',
      arriveLabel: 'Destination',
      journeyPreview: `${booking.package?.destination?.state || 'Departure'} -> ${booking.package?.destination?.country || 'Destination'}`,
      supportText: 'Track your package details, booking summary, and support options here.'
    };
  }

  return baseCard;
};

const normalizeLocalBooking = (booking) => {
  if (!booking) return null;

  const category = normalizeCategory(booking.category || booking.type);
  const route = parseRoute(booking.details?.route);
  const base = {
    ...booking,
    _id: String(booking._id || booking.id || Date.now()),
    category,
    status: booking.status ? booking.status.charAt(0).toUpperCase() + booking.status.slice(1).toLowerCase() : 'Confirmed',
    totalFare: booking.totalFare ?? booking.price ?? 0,
    createdAt: safeDateValue(booking.createdAt) || safeDateValue(booking.bookingDate) || new Date().toISOString(),
    bookingDate: booking.bookingDate || booking.createdAt || new Date().toISOString(),
    travelDate:
      safeDateValue(booking.travelDate) ||
      safeDateValue(booking.details?.checkIn) ||
      safeDateValue(booking.details?.date) ||
      safeDateValue(booking.createdAt),
    passengers: booking.passengers || (booking.details?.traveller ? [{ firstName: booking.details.traveller, lastName: '' }] : []),
    contactDetails: booking.contactDetails || {},
    __local: true
  };

  if (category === 'flight') {
    return {
      ...base,
      from: route.from,
      to: route.to,
      flight: booking.flight || {
        airline: booking.title,
        flightNumber: '',
        from: route.from,
        to: route.to
      },
      selectedSeats: booking.selectedSeats || []
    };
  }

  if (category === 'bus') {
    return {
      ...base,
      from: route.from,
      to: route.to,
      bus: booking.bus || {
        operatorName: booking.title,
        busType: '',
        from: route.from,
        to: route.to
      },
      selectedSeats: booking.selectedSeats || booking.details?.seats?.split(',').map(item => item.trim()).filter(Boolean) || []
    };
  }

  if (category === 'hotel') {
    return {
      ...base,
      hotel: booking.hotel || {
        name: booking.title,
        location: {
          city: booking.details?.location || ''
        }
      },
      checkInDate: booking.checkInDate || booking.details?.checkIn,
      checkOutDate: booking.checkOutDate || booking.details?.checkOut,
      roomType: booking.roomType || booking.details?.roomType
    };
  }

  if (category === 'cab') {
    return {
      ...base,
      from: route.from,
      to: route.to,
      cab: booking.cab || {
        pickupLocation: route.from,
        dropLocation: route.to,
        cabType: booking.title,
        pickupDateTime: booking.details?.pickupTime || booking.travelDate
      }
    };
  }

  if (category === 'package') {
    return {
      ...base,
      package: booking.package || {
        title: booking.title,
        destination: { country: booking.details?.destination || '' },
        duration: { nights: 0, days: booking.details?.duration || '' }
      }
    };
  }

  if (category === 'train') {
    return {
      ...base,
      from: route.from,
      to: route.to,
      train: booking.train || {
        trainName: booking.title,
        from: route.from,
        to: route.to
      },
      pnr: booking.pnr
    };
  }

  return base;
};

const bookingIdentity = (booking) => {
  const category = normalizeCategory(booking.category);
  const fare = booking.totalFare || 0;
  const date = safeDateValue(booking.travelDate) || safeDateValue(booking.createdAt) || '';
  const route = [
    booking.from,
    booking.to,
    booking.flight?.from,
    booking.flight?.to,
    booking.train?.from,
    booking.train?.to,
    booking.bus?.from,
    booking.bus?.to,
    booking.cab?.pickupLocation,
    booking.cab?.dropLocation,
    booking.hotel?.name,
    booking.package?.title
  ].filter(Boolean).join('|');

  return `${category}|${fare}|${date}|${route}`;
};

const FilterDropdown = ({ label, value, options, onChange, isOpen, onToggle, onClose }) => {
  const dropdownRef = useRef(null);
  const selectedOption = options.find((option) => option.value === value) || options[0];

  useEffect(() => {
    if (!isOpen) return undefined;

    const handleOutsideClick = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [isOpen, onClose]);

  return (
    <div className="pf-filter-group" ref={dropdownRef}>
      <p className="pf-filter-label">{label}</p>
      <div className={`pf-filter-dropdown${isOpen ? ' is-open' : ''}`}>
        <button
          type="button"
          className="pf-filter-trigger"
          onClick={onToggle}
          aria-expanded={isOpen}
        >
          <span>{selectedOption.label}</span>
          <span className="pf-filter-caret" aria-hidden="true" />
        </button>

        {isOpen && (
          <div className="pf-filter-menu" role="listbox" aria-label={label}>
            {options.map((option) => (
              <button
                key={option.value}
                type="button"
                className={`pf-filter-option${value === option.value ? ' is-selected' : ''}`}
                onClick={() => {
                  onChange(option.value);
                  onClose();
                }}
              >
                {option.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const Profile = () => {
  const { user, updateUser } = useAuth();
  const { bookings: localBookingsState } = useBookings();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState('overview');

  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState(buildProfileFormData(user));

  useEffect(() => {
    if (user && !isEditing) {
      setFormData(buildProfileFormData(user));
    }
  }, [user, isEditing]);

  const [bookings, setBookings]       = useState([]);
  const [bLoading, setBLoading]       = useState(false);
  const [isFetched, setIsFetched]     = useState(false);
  const [bookingFetchFailed, setBookingFetchFailed] = useState(false);
  const [bookFilter, setBookFilter]   = useState('all');
  const [openFilterDropdown, setOpenFilterDropdown] = useState(null);
  const [bookingStatusFilter, setBookingStatusFilter] = useState('all');
  const [ticketFilter, setTicketFilter] = useState('all');
  const [paymentFilters, setPaymentFilters] = useState({ ...PAYMENT_FILTER_DEFAULTS });
  const [selectedBk, setSelectedBk]  = useState(null);
  const [modalOpen, setModalOpen]     = useState(false);
  const [modalAutoDownload, setModalAutoDownload] = useState(false);
  const [sendingTicketEmailId, setSendingTicketEmailId] = useState(null);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [activeBookingForFeedback, setActiveBookingForFeedback] = useState(null);

  const cards = [];
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancellingBk, setCancellingBk] = useState(null);

  const [showPwModal, setShowPwModal] = useState(false);
  const [pwSent, setPwSent]           = useState(false);
  const [pwEmail, setPwEmail]         = useState(user?.email || '');
  const [pwLoading, setPwLoading]     = useState(false);

  useEffect(() => {
    if (!user || isFetched || bLoading) return;
    
    const fetchBookings = async () => {
      setBLoading(true);
      try {
        const { data } = await apiClient.get('/bookings');
        setBookings(Array.isArray(data) ? data : []);
        setBookingFetchFailed(false);
      } catch (err) {
        console.error("Booking fetch failed:", err);
        setBookings([]);
        setBookingFetchFailed(true);
      } finally {
        setIsFetched(true);
        setBLoading(false);
      }
    };

    fetchBookings();
  }, [user, isFetched, bLoading]);

  const handleInputChange = e => {
    const { name, value } = e.target;
    setFormData(p => ({ ...p, [name]: value }));
  };

  const handleSave = async (e) => {
    e.preventDefault();

    const payload = {
      name: `${formData.firstName} ${formData.lastName}`.trim(),
      email: formData.email?.trim(),
      mobile: formData.mobile?.trim(),
      dateOfBirth: formData.dateOfBirth || null,
      gender: formData.gender,
      address: formData.address?.trim(),
      city: formData.city?.trim(),
      state: formData.state?.trim(),
      pincode: formData.pincode?.trim(),
      country: formData.country?.trim() || 'India'
    };

    try {
      const { data } = await apiClient.patch('/users/me', payload);
      if (!data?.success) throw new Error(data?.message || 'Failed to update profile.');

      updateUser(data.user);
      setIsEditing(false);
      showToast({
        type: 'success',
        title: 'Profile updated',
        message: 'Your account details were saved successfully.'
      });
    } catch (error) {
      showToast({
        type: 'error',
        title: 'Profile update failed',
        message: error.message || 'Please try again.'
      });
    }
  };

  const handleDeleteAccount = async () => {
    showToast({
      type: 'info',
      title: 'Account deletion unavailable',
      message: 'Please contact support if you want to remove your account.'
    });
  };

  const handleSendReset = async e => {
    e.preventDefault(); setPwLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/auth/forgot-password`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ email: pwEmail }) });
      if (res.ok) {
        setPwSent(true);
        showToast({
          type: 'success',
          title: 'Reset OTP sent',
          message: 'Please check your email for the password reset OTP.'
        });
      } else {
        showToast({
          type: 'error',
          title: 'Reset OTP failed',
          message: 'Could not send reset OTP.'
        });
      }
    } catch {
      showToast({
        type: 'error',
        title: 'Network error',
        message: 'Please try again.'
      });
    }
    finally { setPwLoading(false); }
  };
  const [walletSummary, setWalletSummary] = useState({ totalTransactions: 0, totalCredited: 0, totalDebited: 0 });
  const [walletTransactions, setWalletTransactions] = useState([]);
  const [wLoading, setWLoading] = useState(false);
  const [wFetched, setWFetched] = useState(false);

  const handleSendBookingEmail = async (booking, mode = 'ticket') => {
    if (!booking || sendingTicketEmailId) return;

    if (booking.__local) {
      showToast({
        type: 'info',
        title: 'Email unavailable',
        message: 'This booking is only available locally right now. Please refresh once the booking syncs to the server.'
      });
      return;
    }

    setSendingTicketEmailId(booking._id);

    try {
      const endpoint = mode === 'cancellation'
        ? `/bookings/${booking._id}/send-cancellation-email`
        : `/bookings/${booking._id}/send-ticket`;
      const { data } = await apiClient.post(endpoint);

      if (!data?.success) {
        throw new Error(data?.message || (mode === 'cancellation'
          ? 'Could not send the cancellation email.'
          : 'Could not send the ticket email.'));
      }

      showToast({
        type: 'success',
        title: mode === 'cancellation' ? 'Cancellation email sent' : 'Ticket emailed',
        message: data.message || (mode === 'cancellation'
          ? 'Your cancellation email has been sent successfully.'
          : 'Your ticket has been sent successfully.')
      });
    } catch (error) {
      const status = error?.response?.status;
      const responseData = error?.response?.data;

      let message = 'Please try again.';

      if (typeof responseData === 'string' && responseData.includes('<!DOCTYPE')) {
        message = status === 404
          ? 'Email endpoint is not available on the server right now. Please restart the backend and try again.'
          : 'The server returned an unexpected response. Please try again in a moment.';
      } else if (typeof responseData?.message === 'string') {
        message = responseData.message;
      } else if (typeof error?.message === 'string' && !error.message.includes('status code')) {
        message = error.message;
      }

      showToast({
        type: 'error',
        title: 'Email send failed',
        message
      });
    } finally {
      setSendingTicketEmailId(null);
    }
  };

  const handleSendTicketEmail = async (booking) => handleSendBookingEmail(booking, 'ticket');

  const handleSendCancellationEmail = async (booking) => handleSendBookingEmail(booking, 'cancellation');

  useEffect(() => {
    if (!user || wFetched || wLoading || activeTab !== 'wallet') return;

    const fetchWallet = async () => {
      setWLoading(true);
      try {
        const data = await getWalletSummary();
        setWalletSummary(data.summary || { totalTransactions: 0, totalCredited: 0, totalDebited: 0 });
        setWalletTransactions(data.transactions || []);

        if (typeof data.walletBalance === 'number' && data.walletBalance !== user?.walletBalance) {
          updateUser({ ...user, walletBalance: data.walletBalance });
        }
        setWFetched(true);
      } catch (err) {
        console.error("Wallet fetch failed:", err);
      } finally {
        setWFetched(true);
        setWLoading(false);
      }
    };

    fetchWallet();
  }, [user, wFetched, wLoading, activeTab, updateUser]);

  const localBookings = useMemo(() => {
    const combined = [
      ...(localBookingsState?.upcoming || []),
      ...(localBookingsState?.completed || []),
      ...(localBookingsState?.cancelled || [])
    ];

    return combined.map(normalizeLocalBooking).filter(Boolean);
  }, [localBookingsState]);

  const allBookings = useMemo(() => {
    const merged = new Map();

    bookings.forEach((booking) => {
      merged.set(bookingIdentity(booking), booking);
    });

    localBookings.forEach((booking) => {
      const key = bookingIdentity(booking);
      if (!merged.has(key)) {
        merged.set(key, booking);
      }
    });

    return Array.from(merged.values()).sort(
      (a, b) => new Date(b.createdAt || b.bookingDate || 0) - new Date(a.createdAt || a.bookingDate || 0)
    );
  }, [bookings, localBookings]);

  const effectiveBookings = useMemo(() => {
    const sourceBookings = (!isFetched || bookingFetchFailed) ? allBookings : bookings;
    return sourceBookings.map((booking) => {
      const normalizedBooking = { ...booking, __sourceBooking: booking };

      if (Array.isArray(booking.passengers)) {
        normalizedBooking.passengers = booking.passengers.filter(
          (passenger) => String(passenger?.status || 'active').toLowerCase() !== 'cancelled'
        );
      }

      if (booking.hotel && Array.isArray(booking.hotel.rooms)) {
        normalizedBooking.hotel = {
          ...booking.hotel,
          rooms: booking.hotel.rooms.filter(
            (room) => String(room?.status || 'active').toLowerCase() !== 'cancelled'
          )
        };
      }

      return normalizedBooking;
    });
  }, [allBookings, bookings, bookingFetchFailed, isFetched]);

  const initials = `${formData.firstName?.[0]||''}${formData.lastName?.[0]||''}`.toUpperCase() || 'U';
  const displayName = `${formData.firstName} ${formData.lastName}`.trim() || user?.email || 'User';

  const filteredBookings = effectiveBookings.filter((booking) => {
    const category = booking.category?.toLowerCase() || '';
    const status = normalizeBookingStatus(booking.status);

    const matchesCategory = bookFilter === 'all'
      ? true
      : category === bookFilter || category === `${bookFilter}s`;

    const matchesStatus = bookingStatusFilter === 'all'
      ? true
      : (bookingStatusFilter === 'cancelled'
        ? isFullyCancelledStatus(status)
        : status === bookingStatusFilter);

    return matchesCategory && matchesStatus;
  });

  const paymentRecords = useMemo(() => {
    return effectiveBookings.map((booking) => {
      const paymentDate = booking.bookingDate || booking.createdAt;
      const paymentMethodKey = getPaymentMethodKey(booking.payment);
      const paymentMethodKeys = getPaymentMethodFilterKeys(booking.payment);
      const paymentMethodLabel = getPaymentMethodLabel(booking.payment);
      const bookingType = normalizeCategory(booking.category);
      const status = normalizeBookingStatus(booking.status);
      const refundStatus = getRefundStatusKey(booking);
      const routeSummary = getPaymentRouteSummary(booking);
      const bookingId = String(booking.pnr || booking._id || booking.id || '').toUpperCase();
      const provider = [
        booking.flight?.airline,
        booking.train?.trainName,
        booking.bus?.operatorName,
        booking.hotel?.name,
        booking.cab?.cabType,
        booking.package?.title,
        booking.packageTitle
      ].filter(Boolean).join(' ');
      const amount = Number(booking.totalFare || 0);

      return {
        booking,
        bookingType,
        status,
        paymentMethodKey,
        paymentMethodKeys,
        paymentMethodLabel,
        paymentDate,
        amount,
        refundAmount: Number(booking.refundAmount || 0),
        refundStatus,
        bookingId,
        routeSummary,
        provider
      };
    });
  }, [effectiveBookings]);

  const hasActivePaymentFilters = useMemo(() => (
    Object.entries(paymentFilters).some(([key, value]) => {
      if (key === 'bookingType' || key === 'status' || key === 'paymentMethod' || key === 'refundStatus') {
        return value !== 'all';
      }
      return String(value || '').trim() !== '';
    })
  ), [paymentFilters]);

  const filteredPaymentRecords = useMemo(() => {
    return paymentRecords.filter((record) => {
      const { bookingType, status, paymentMethodKeys, paymentDate, amount, refundStatus } = record;
      const {
        bookingType: selectedBookingType,
        status: selectedStatus,
        paymentMethod,
        dateFrom,
        dateTo,
        amountMin,
        amountMax,
        refundStatus: selectedRefundStatus
      } = paymentFilters;

      const paymentTimestamp = paymentDate ? new Date(paymentDate).getTime() : NaN;
      const startTimestamp = dateFrom ? new Date(`${dateFrom}T00:00:00`).getTime() : null;
      const endTimestamp = dateTo ? new Date(`${dateTo}T23:59:59`).getTime() : null;
      const minAmount = amountMin === '' ? null : Number(amountMin);
      const maxAmount = amountMax === '' ? null : Number(amountMax);

      if (selectedBookingType !== 'all' && bookingType !== selectedBookingType) return false;
      if (selectedStatus !== 'all' && status !== selectedStatus) return false;
      if (paymentMethod !== 'all' && !paymentMethodKeys.includes(paymentMethod)) return false;
      if (selectedRefundStatus !== 'all' && refundStatus !== selectedRefundStatus) return false;
      if ((startTimestamp || endTimestamp) && Number.isNaN(paymentTimestamp)) return false;
      if (startTimestamp && !Number.isNaN(paymentTimestamp) && paymentTimestamp < startTimestamp) return false;
      if (endTimestamp && !Number.isNaN(paymentTimestamp) && paymentTimestamp > endTimestamp) return false;
      if (minAmount !== null && !Number.isNaN(minAmount) && amount < minAmount) return false;
      if (maxAmount !== null && !Number.isNaN(maxAmount) && amount > maxAmount) return false;

      return true;
    });
  }, [paymentFilters, paymentRecords]);

  const paymentOverview = useMemo(() => {
    const totals = filteredPaymentRecords.reduce((acc, record) => {
      acc.totalPaid += record.amount;
      acc.totalRefunded += record.refundAmount;
      if (record.paymentMethodKeys.includes('wallet')) {
        acc.walletPayments += 1;
      }
      if (record.refundAmount > 0) {
        acc.refundedBookings += 1;
      }
      return acc;
    }, {
      totalPaid: 0,
      totalRefunded: 0,
      walletPayments: 0,
      refundedBookings: 0
    });

    return [
      {
        key: 'payments',
        label: 'Visible payments',
        value: String(filteredPaymentRecords.length),
        meta: `${paymentRecords.length} total records`
      },
      {
        key: 'paid',
        label: 'Total paid',
        value: formatCurrency(totals.totalPaid),
        meta: 'Across current results'
      },
      {
        key: 'refunded',
        label: 'Total refunded',
        value: formatCurrency(totals.totalRefunded),
        meta: `${totals.refundedBookings} refunded booking${totals.refundedBookings === 1 ? '' : 's'}`
      },
      {
        key: 'wallet',
        label: 'Wallet payments',
        value: String(totals.walletPayments),
        meta: 'Wallet-only and split payments'
      }
    ];
  }, [filteredPaymentRecords, paymentRecords.length]);

  const updatePaymentFilter = (field, value) => {
    setPaymentFilters((prev) => ({ ...prev, [field]: value }));
  };

  const clearPaymentFilters = () => {
    setPaymentFilters({ ...PAYMENT_FILTER_DEFAULTS });
  };

  const activeTickets = effectiveBookings
    .filter((booking) => !isFullyCancelledStatus(booking.status))
    .filter((booking) => {
      if (ticketFilter === 'all') return true;
      const category = booking.category?.toLowerCase() || '';
      return category === ticketFilter || category === `${ticketFilter}s`;
    });

  return (
    <div className="pf-root">

      <div className="pf-hero">
        <div className="pf-hero-avatar">{initials}</div>
        <h1 className="pf-hero-name">{displayName}</h1>
        <p className="pf-hero-email">{user?.email}</p>
        <div className="pf-hero-meta">
          <span className="pf-hero-pill">Wallet {formatCurrency(user?.walletBalance || 0)}</span>
          <span className="pf-hero-pill">{effectiveBookings.length || 0} total bookings</span>
          <span className="pf-hero-pill">Account active</span>
        </div>
      </div>

      <div className="pf-body">

        {/* Sidebar */}
        <aside className="pf-sidebar">
          <div className="pf-sidebar-head">
            <span className="pf-sidebar-kicker">Profile menu</span>
            <strong>{formData.firstName || 'Traveller'} dashboard</strong>
            <p>Manage bookings, wallet, payments, and account details from one place.</p>
          </div>
          {PROFILE_TABS.map(t => (
            <button
              key={t.id}
              className={`pf-nav-btn ${activeTab === t.id ? 'active' : ''}`}
              onClick={() => setActiveTab(t.id)}
            >
              <span className="pf-nav-icon">{t.icon}</span>
              <span>{t.label}</span>
            </button>
          ))}
        </aside>

        {/* Content */}
        <main className="pf-content">

          {activeTab === 'overview' && (
            <div className="pf-section">
              <h2 className="pf-section-title">Overview</h2>

              <div className="pf-stats-grid">
                <div className="pf-stat-card">
                  <div className="pf-stat-icon" style={{background:'linear-gradient(135deg,#e0e7ff,#c7d2fe)'}}>BH</div>
                  <div>
                    <p className="pf-stat-label">Total Bookings</p>
                    <p className="pf-stat-value">{effectiveBookings.length || '-'}</p>
                  </div>
                </div>
                <div className="pf-stat-card">
                  <div className="pf-stat-icon" style={{background:'linear-gradient(135deg,#d1fae5,#a7f3d0)'}}>WB</div>
                  <div>
                    <p className="pf-stat-label">MMT Wallet Balance</p>
                    <p className="pf-stat-value">{formatCurrency(user?.walletBalance || 0)}</p>
                  </div>
                </div>
                <div className="pf-stat-card">
                  <div className="pf-stat-icon" style={{background:'linear-gradient(135deg,#fef3c7,#fde68a)'}}>PY</div>
                  <div>
                    <p className="pf-stat-label">Saved Cards</p>
                    <p className="pf-stat-value">{cards.length}</p>
                  </div>
                </div>
                <div className="pf-stat-card">
                  <div className="pf-stat-icon" style={{background:'linear-gradient(135deg,#fce7f3,#fbcfe8)'}}>AC</div>
                  <div>
                    <p className="pf-stat-label">Account</p>
                    <p className="pf-stat-value" style={{fontSize:'13px',color:'#059669'}}>Active</p>
                  </div>
                </div>
              </div>

              <div className="pf-quick-info">
                <div className="pf-qi-row"><span>Name</span><strong>{displayName}</strong></div>
                <div className="pf-qi-row"><span>Email</span><strong>{formData.email || '-'}</strong></div>
                <div className="pf-qi-row"><span>Mobile</span><strong>{formData.mobile || '-'}</strong></div>
                <div className="pf-qi-row"><span>City</span><strong>{formData.city || '-'}</strong></div>
                <div className="pf-qi-row"><span>Country</span><strong>{formData.country}</strong></div>
              </div>

              <div className="pf-quick-actions">
                <button className="pf-qa-btn" onClick={() => setActiveTab('bookings')}>View Bookings</button>
                <button className="pf-qa-btn" onClick={() => setActiveTab('payments')}>Payment History</button>
                <button className="pf-qa-btn" onClick={() => setActiveTab('account')}>Edit Profile</button>
              </div>
            </div>
          )}

          {activeTab === 'wallet' && (
            <div className="pf-section">
              <h2 className="pf-section-title">MakeMyTrip Wallet</h2>
              <p className="pf-section-sub">Manage your refunds and travel credits in one place.</p>

              <div className="pf-wallet-shell">
              <div className="pf-wallet-hero">
                <p className="pf-wallet-label">AVAILABLE BALANCE</p>
                <h3 className="pf-wallet-amount">{formatCurrency(user?.walletBalance || 0)}</h3>
                <p className="pf-wallet-copy">Keep refunds and travel credits ready for your next booking.</p>
                <button className="pf-wallet-btn" onClick={() => navigate('/flights')}>Use Balance Now</button>
                <span className="pf-wallet-note">Refunds are added here automatically after eligible cancellations.</span>
              </div>

              <div className="pf-wallet-stats">
                <div className="pf-wallet-stat-card pf-wallet-stat-card--balance">
                  <div className="pf-stat-color-box pf-box-balance">
                    <span role="img" aria-label="available">AV</span>
                  </div>
                  <div className="pf-stat-text-box">
                    <p className="pf-stat-title">AVAILABLE BALANCE</p>
                    <p className="pf-stat-val">{formatCurrency(user?.walletBalance || 0)}</p>
                  </div>
                </div>

                <div className="pf-wallet-stat-card pf-wallet-stat-card--credit">
                  <div className="pf-stat-color-box pf-box-green">
                    <span role="img" aria-label="credit">CR</span>
                  </div>
                  <div className="pf-stat-text-box">
                    <p className="pf-stat-title">TOTAL CREDIT</p>
                    <p className="pf-stat-val">{formatCurrency(walletSummary.totalCredited || 0)}</p>
                  </div>
                </div>

                <div className="pf-wallet-stat-card pf-wallet-stat-card--used">
                  <div className="pf-stat-color-box pf-box-pink">
                    <span role="img" aria-label="used">DR</span>
                  </div>
                  <div className="pf-stat-text-box">
                    <p className="pf-stat-title">TOTAL USED</p>
                    <p className="pf-stat-val">{formatCurrency(walletSummary.totalDebited || 0)}</p>
                  </div>
                </div>

                <div className="pf-wallet-stat-card pf-wallet-stat-card--transactions">
                  <div className="pf-stat-color-box pf-box-blue">
                    <span role="img" aria-label="transactions">TX</span>
                  </div>
                  <div className="pf-stat-text-box">
                    <p className="pf-stat-title">TRANSACTIONS</p>
                    <p className="pf-stat-val">{walletSummary.totalTransactions || '0'}</p>
                  </div>
                </div>
              </div>

              </div>

              <div className="pf-wallet-ledger">
                <div className="pf-ledger-head">
                  <div>
                    <h3 className="pf-ledger-title">Transaction History</h3>
                    <p className="pf-ledger-sub">Track refunds, wallet usage, and balance movement in one place.</p>
                  </div>
                  <div className="pf-ledger-pill">{walletTransactions.length || 0} entries</div>
                </div>
                
                {wLoading && <div className="pf-loading"><div className="pf-spinner" /><p>Fetching transactions...</p></div>}
                
                {!wLoading && walletTransactions.length === 0 && (
                  <div className="pf-empty">
                    <span>WL</span>
                    <p>No wallet activity yet.</p>
                  </div>
                )}

                {!wLoading && walletTransactions.length > 0 && (
                  <div className="pf-transaction-list">
                    {walletTransactions.map((tx) => (
                      <div key={tx._id} className="pf-tx-item-glass">
                        <div className="pf-tx-icon-box">
                           {tx.type === 'credit' ? '+' : '-'}
                        </div>
                        <div className="pf-tx-details">
                          <p className="pf-tx-desc">{getWalletTransactionLabel(tx)}</p>
                          <p className="pf-tx-date">
                            {new Date(tx.createdAt).toLocaleString('en-IN', { 
                              day: '2-digit', month: 'short', year: 'numeric', 
                              hour: 'numeric', minute: '2-digit', hour12: true 
                            }).toLowerCase()}
                          </p>
                        </div>
                        <div className="pf-tx-amounts">
                          <p className={`pf-tx-amount ${tx.type === 'credit' ? 'text-green' : 'text-red'}`}>
                            {tx.type === 'credit' ? '+' : '-'} {formatCurrency(tx.amount)}
                          </p>
                          <p className="pf-tx-bal">
                            Bal: {tx.balanceAfter != null ? formatCurrency(tx.balanceAfter) : '-'}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}


          {activeTab === 'tickets' && (
            <div className="pf-section">
              <h2 className="pf-section-title">Your Tickets</h2>
              <p className="pf-section-sub">Manage and download your active, confirmed bookings.</p>

              {/* category filter chips for tickets */}
              <div className="pf-chips">
                {CATS.map(cat => (
                  <button
                    key={cat}
                    className={`pf-chip ${ticketFilter === cat ? 'active' : ''}`}
                    onClick={() => setTicketFilter(cat)}
                  >
                    {getCategoryBadge(cat)} {cat === 'all' ? 'ALL' : cat.toUpperCase()}
                  </button>
                ))}
              </div>

              {activeTickets.length === 0 && (
                <div className="pf-empty">
                  <span>TK</span>
                  <p>No active tickets found</p>
                  <button className="pf-btn-primary" onClick={() => navigate('/')}>Book Your First Trip</button>
                </div>
              )}

              <div className="tickets-grid-v2">
                  {activeTickets.map(b => {
                    const ticket = getTicketCardData(b);
                    const cancellationAction = getCancellationActionMeta(b);
                    const partialCancellationBadge = getPartialCancellationBadge(b);
                    const partialFareBreakdown = partialCancellationBadge?.breakdown;
                    const canCancel = cancellationAction.canCancel;
                    const isSendingThisTicket = sendingTicketEmailId === b._id;
                    return (
                  <div key={b._id || b.id} className="premium-ticket-card">
                    <div className="ticket-main-info">
                      <div className="ticket-header">
                        <span className="ticket-cat-icon">{getCategoryBadge(b.category)}</span>
                        <div className="ticket-type-label">
                          <h4>{ticket.categoryLabel}</h4>
                          <p>{ticket.codeLabel}</p>
                        </div>
                        <div className={`ticket-status-pill ${partialCancellationBadge ? 'ticket-status-pill--partial' : ''}`}>{ticket.statusText}</div>
                      </div>

                      <div className="ticket-route-v2">
                        <div className="route-stop">
                          <span className="route-city">{ticket.from}</span>
                          <span className="route-time">{ticket.departTime}</span>
                          <span className="route-label">{ticket.departLabel}</span>
                        </div>
                        <div className="route-line-v2">
                          <span className="plane">{getCategoryBadge(b.category)}</span>
                        </div>
                        <div className="route-stop text-right">
                          <span className="route-city">{ticket.to}</span>
                          <span className="route-time">{ticket.arriveTime}</span>
                          <span className="route-label">{ticket.arriveLabel}</span>
                        </div>
                      </div>

                      <div className="ticket-journey-preview">
                        <span className="ticket-journey-preview__label">Journey preview</span>
                        <span className="ticket-journey-preview__value">{ticket.journeyPreview}</span>
                      </div>

                        {partialCancellationBadge && (
                          <div className={`ticket-partial-badge ${partialCancellationBadge.emphasized ? 'ticket-partial-badge--credit' : ''}`}>
                            <strong>{partialCancellationBadge.title}</strong>
                            <span>{partialCancellationBadge.message}</span>
                          </div>
                        )}

                        {partialFareBreakdown && (
                          <div className="ticket-fare-breakdown">
                            <div className="ticket-fare-breakdown__row">
                              <span>Total Original Fare</span>
                              <strong>{formatCurrency(partialFareBreakdown.totalOriginalFare)}</strong>
                            </div>
                            <div className="ticket-fare-breakdown__row">
                              <span>{partialFareBreakdown.cancelledRefundLabel}</span>
                              <strong>{formatCurrency(partialFareBreakdown.cancelledTravellerRefund)}</strong>
                            </div>
                            <div className="ticket-fare-breakdown__row">
                              <span>Remaining Active Fare</span>
                              <strong>{formatCurrency(partialFareBreakdown.remainingActiveFare)}</strong>
                            </div>
                            <p className="ticket-fare-breakdown__note">
                              Refund reflected in {partialFareBreakdown.refundDestinationLabel}.
                              {partialFareBreakdown.cancellationCharges > 0
                                ? ` Cancellation charges retained: ${formatCurrency(partialFareBreakdown.cancellationCharges)}.`
                                : ''}
                            </p>
                          </div>
                        )}

                        <div className="ticket-details-v2">
                          <div className="detail-item">
                            <span className="label">{ticket.dateLabel}</span>
                            <span className="val">{ticket.dateValue}</span>
                        </div>
                        <div className="detail-item">
                          <span className="label">{ticket.passengerLabel}</span>
                          <span className="val">{ticket.passengerValue}</span>
                        </div>
                        <div className="detail-item">
                          <span className="label">{ticket.fareLabel}</span>
                          <span className="val pf-ticket-fare-override">{ticket.fareValue}</span>
                        </div>
                      </div>
                    </div>

                    <div className="ticket-actions-v2">
                      <div className="ticket-action-summary">
                        <p className="ticket-action-kicker">{ticket.serviceName}</p>
                        <h5>{ticket.fareValue}</h5>
                        <p>{ticket.supportText}</p>
                        {canCancel && (
                          <div className={`ticket-cancel-visibility ${cancellationAction.canPartiallyCancel ? 'ticket-cancel-visibility--partial' : ''}`}>
                            <strong>{cancellationAction.badgeLabel}</strong>
                            <span>{cancellationAction.supportText}</span>
                          </div>
                        )}
                      </div>
                      <button 
                        className="t-btn t-btn-summary" 
                        onClick={() => { setSelectedBk(b); setModalAutoDownload(false); setModalOpen(true); }}
                      >View Summary</button>
                      <button
                        className="t-btn t-btn-email"
                        onClick={() => handleSendTicketEmail(b)}
                        disabled={Boolean(sendingTicketEmailId)}
                      >
                        {isSendingThisTicket ? 'Sending...' : 'Send To Email'}
                      </button>
                      {canCancel && (
                        <button 
                          className="t-btn t-btn-cancel" 
                          onClick={() => { setCancellingBk(b.__sourceBooking || b); setCancelModalOpen(true); }}
                        >
                          {cancellationAction.buttonLabel}
                        </button>
                      )}
                    </div>
                  </div>
                )})}
              </div>
            </div>
          )}

          {activeTab === 'bookings' && (
            <div className="pf-section">
              <h2 className="pf-section-title">Booking History</h2>
              <p className="pf-section-sub">View all your bookings, manage cancellations, and track refunds.</p>

              {/* category filter chips */}
              <div className="pf-filter-bar">
                <FilterDropdown
                  label="Category"
                  value={bookFilter}
                  options={CATEGORY_FILTER_OPTIONS}
                  onChange={setBookFilter}
                  isOpen={openFilterDropdown === 'category'}
                  onToggle={() => setOpenFilterDropdown((current) => current === 'category' ? null : 'category')}
                  onClose={() => setOpenFilterDropdown(null)}
                />

                <FilterDropdown
                  label="Status"
                  value={bookingStatusFilter}
                  options={STATUS_FILTER_OPTIONS}
                  onChange={setBookingStatusFilter}
                  isOpen={openFilterDropdown === 'status'}
                  onToggle={() => setOpenFilterDropdown((current) => current === 'status' ? null : 'status')}
                  onClose={() => setOpenFilterDropdown(null)}
                />
              </div>

              {bLoading && <div className="pf-loading"><div className="pf-spinner" /><p>Loading bookings...</p></div>}

              {!bLoading && filteredBookings.length === 0 && (
                <div className="pf-empty">
                  <span>BK</span>
                  <p>No bookings found</p>
                  <button className="pf-btn-primary" onClick={() => navigate('/')}>Book Now</button>
                </div>
              )}

                {!bLoading && filteredBookings.map(b => {
                  const isCancelled = isFullyCancelledStatus(b.status);
                  const isPartiallyCancelled = normalizeBookingStatus(b.status) === 'partially cancelled';
                  const refundAmount = Number(b.refundAmount || 0);
                  const cancelledOn = formatDisplayDate(b.cancellationDate);
                  const cancellationAction = getCancellationActionMeta(b);
                  const partialCancellationBadge = getPartialCancellationBadge(b);
                  const partialFareBreakdown = partialCancellationBadge?.breakdown;
                  const canCancel = cancellationAction.canCancel;
                  const isSendingHistoryEmail = sendingTicketEmailId === b._id;
                  const flightTravelDate = toDateInputValue(b.travelDate || b.date || b.flight?.date || b.details?.date);
                  const flightRebookEligible = isCancelled
                  && (b.category === 'flight' || b.category === 'flights')
                  && flightTravelDate
                  && isWithinDaysFromToday(flightTravelDate, 15);
                const flightRebookState = flightRebookEligible ? getFlightRebookState(b) : null;

                return (
                <div
                  key={b._id || b.id}
                  className={`pf-booking-card${isCancelled ? ' pf-booking-card--cancelled' : ''}`}
                >
                  <div className={`pf-bk-stripe pf-bk-stripe--${b.category?.toLowerCase()||'default'}`} />
                  <div className="pf-bk-body">
                    <div className="pf-bk-top">
                      <div>
                        <h3 className="pf-bk-title">
                          {getCategoryBadge(b.category)} {b.flight?.airline || b.category?.toUpperCase()} Booking
                        </h3>
                        <p className="pf-bk-date">
                          {new Date(b.bookingDate || b.createdAt).toLocaleDateString('en-IN', { day:'numeric', month:'long', year:'numeric' })}
                        </p>
                      </div>
                      <span className={`pf-status pf-status--${normalizeBookingStatus(b.status).replace(/\s+/g, '-')}`}>{b.status}</span>
                    </div>

                    <div className="pf-bk-mid">
                      {(b.category === 'flight' || b.category === 'flights') && (
                        <div>
                          <p className="pf-bk-route">{b.flight?.from} -> {b.flight?.to}</p>
                          <p className="pf-bk-sub">Flight {b.flight?.flightNumber} • {b.passengers?.length} pax</p>
                        </div>
                      )}
                      {(b.category === 'cab' || b.category === 'cabs') && (
                        <div>
                          <p className="pf-bk-route">{b.cab?.pickupLocation} -> {b.cab?.dropLocation}</p>
                          <p className="pf-bk-sub">{b.cab?.cabType} • {b.cab?.distance} km</p>
                        </div>
                      )}
                      {b.category === 'package' && (
                        <div>
                          <p className="pf-bk-route">{b.package?.title}</p>
                          <p className="pf-bk-sub">{b.package?.duration?.nights}N/{b.package?.duration?.days}D</p>
                        </div>
                      )}
                      {!['flight','flights','cab','cabs','package'].includes(b.category) && (
                        <p className="pf-bk-route">{b.category?.toUpperCase()} Booking</p>
                      )}

                        <div className="pf-bk-fare">
                          <p className="pf-bk-fare-label">TOTAL PAID</p>
                          <p className="pf-bk-fare-val">{formatCurrency(b.totalFare || 0)}</p>
                        </div>
                      </div>

                      {partialFareBreakdown && !isCancelled && (
                        <div className="pf-bk-breakdown">
                          <div className="pf-bk-breakdown-row">
                            <span>Total Original Fare</span>
                            <strong>{formatCurrency(partialFareBreakdown.totalOriginalFare)}</strong>
                          </div>
                          <div className="pf-bk-breakdown-row">
                            <span>{partialFareBreakdown.cancelledRefundLabel}</span>
                            <strong>{formatCurrency(partialFareBreakdown.cancelledTravellerRefund)}</strong>
                          </div>
                          <div className="pf-bk-breakdown-row">
                            <span>Remaining Active Fare</span>
                            <strong>{formatCurrency(partialFareBreakdown.remainingActiveFare)}</strong>
                          </div>
                          <p className="pf-bk-breakdown-note">
                            Refund reflected in {partialFareBreakdown.refundDestinationLabel}.
                            {partialFareBreakdown.cancellationCharges > 0
                              ? ` Cancellation charges retained: ${formatCurrency(partialFareBreakdown.cancellationCharges)}.`
                              : ''}
                          </p>
                        </div>
                      )}

                      <div className="pf-bk-foot">
                        <div className="pf-bk-meta">
                        <span className="pf-bk-id">ID: {String(b._id || b.id || '').slice(-8).toUpperCase()}</span>
                        {partialCancellationBadge && !isCancelled && (
                          <span className={`pf-bk-refund-pill pf-bk-refund-pill--partial ${partialCancellationBadge.emphasized ? 'pf-bk-refund-pill--partial-credit' : ''}`}>
                            {partialCancellationBadge.title}: {partialCancellationBadge.message}
                          </span>
                        )}
                        {isCancelled && (
                          <div className="pf-bk-cancel-note">
                            <span className="pf-bk-cancel-text">
                              Cancelled{cancelledOn ? ` on ${cancelledOn}` : ''}
                            </span>
                            {refundAmount > 0 && (
                              <span className="pf-bk-refund-pill">
                                Refunded: {formatCurrency(refundAmount)}
                              </span>
                            )}
                            {isCancelled && (b.category === 'flight' || b.category === 'flights') && !flightRebookState && (
                              <span className="pf-bk-refund-pill">
                                Rebook available only within 15 days
                              </span>
                            )}
                            {flightRebookState && (
                              <span className="pf-bk-refund-pill">
                                Suggested rebook: {flightRebookState.from} -> {flightRebookState.to}
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="pf-bk-actions">
                        <button className="pf-btn-sm" onClick={() => { setSelectedBk(b); setModalAutoDownload(false); setModalOpen(true); }}>
                          View Summary
                        </button>

                        {!b.__local && (isCancelled || isPartiallyCancelled) && (
                          <button
                            className="pf-btn-sm"
                            style={{ marginLeft: '10px' }}
                            onClick={() => handleSendCancellationEmail(b)}
                            disabled={Boolean(sendingTicketEmailId)}
                          >
                            {isSendingHistoryEmail ? 'Sending...' : 'Send To Email'}
                          </button>
                        )}

                        {/* Feedback Button Eligibility */}
                        {!isFullyCancelledStatus(b.status) && (
                          <button
                            className="pf-btn-primary pf-btn-sm"
                            style={{ marginLeft: '10px' }}
                            onClick={() => { setActiveBookingForFeedback(b); setFeedbackOpen(true); }}
                          >
                            {getFeedbackButtonLabel(b.category)}
                          </button>
                        )}

                        {/* Cancellation Eligibility */}
                        {canCancel && (
                          <button
                            className="pf-btn-outline pf-btn-sm pf-btn-danger-lite"
                            style={{ marginLeft: '10px' }}
                            onClick={() => { setCancellingBk(b.__sourceBooking || b); setCancelModalOpen(true); }}
                          >
                            {cancellationAction.buttonLabel}
                          </button>
                        )}

                        {flightRebookState && (
                          <button
                            className="pf-btn-primary pf-btn-sm"
                            style={{ marginLeft: '10px' }}
                            onClick={() => navigate('/flights', { state: flightRebookState })}
                          >
                            Rebook Flight
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )})}
            </div>
          )}

          {activeTab === 'payments' && (
            <div className="pf-section">
              <h2 className="pf-section-title">Payment History</h2>
              <p className="pf-section-sub">A record of all your successful transactions and refunds.</p>

              {bLoading && <div className="pf-loading"><div className="pf-spinner" /><p>Fetching history...</p></div>}

              {!bLoading && effectiveBookings.length === 0 && (
                <div className="pf-empty">
                  <span>PM</span>
                  <p>No payment history found.</p>
                </div>
              )}

              {!bLoading && effectiveBookings.length > 0 && (
                <>
                  <div className="pf-payment-actions">
                    <button
                      className="pf-btn-outline pf-payment-clear-btn"
                      onClick={clearPaymentFilters}
                      disabled={!hasActivePaymentFilters}
                    >
                      Clear filters
                    </button>
                  </div>

                  <div className="pf-payment-overview-grid">
                    {paymentOverview.map((item) => (
                      <div key={item.key} className={`pf-payment-overview-card pf-payment-overview-card--${item.key}`}>
                        <p className="pf-payment-overview-label">{item.label}</p>
                        <h3 className="pf-payment-overview-value">{item.value}</h3>
                        <p className="pf-payment-overview-meta">{item.meta}</p>
                      </div>
                    ))}
                  </div>

                  <div className="pf-payment-filter-grid">
                    <div className="pf-payment-field">
                      <FilterDropdown
                        label="Booking type"
                        value={paymentFilters.bookingType}
                        options={CATEGORY_FILTER_OPTIONS}
                        onChange={(value) => updatePaymentFilter('bookingType', value)}
                        isOpen={openFilterDropdown === 'payment-booking-type'}
                        onToggle={() => setOpenFilterDropdown((current) => current === 'payment-booking-type' ? null : 'payment-booking-type')}
                        onClose={() => setOpenFilterDropdown(null)}
                      />
                    </div>

                    <div className="pf-payment-field">
                      <FilterDropdown
                        label="Status"
                        value={paymentFilters.status}
                        options={PAYMENT_STATUS_OPTIONS}
                        onChange={(value) => updatePaymentFilter('status', value)}
                        isOpen={openFilterDropdown === 'payment-status'}
                        onToggle={() => setOpenFilterDropdown((current) => current === 'payment-status' ? null : 'payment-status')}
                        onClose={() => setOpenFilterDropdown(null)}
                      />
                    </div>

                    <div className="pf-payment-field">
                      <FilterDropdown
                        label="Payment method"
                        value={paymentFilters.paymentMethod}
                        options={PAYMENT_METHOD_OPTIONS}
                        onChange={(value) => updatePaymentFilter('paymentMethod', value)}
                        isOpen={openFilterDropdown === 'payment-method'}
                        onToggle={() => setOpenFilterDropdown((current) => current === 'payment-method' ? null : 'payment-method')}
                        onClose={() => setOpenFilterDropdown(null)}
                      />
                    </div>

                    <div className="pf-payment-field">
                      <FilterDropdown
                        label="Refund status"
                        value={paymentFilters.refundStatus}
                        options={REFUND_STATUS_OPTIONS}
                        onChange={(value) => updatePaymentFilter('refundStatus', value)}
                        isOpen={openFilterDropdown === 'payment-refund-status'}
                        onToggle={() => setOpenFilterDropdown((current) => current === 'payment-refund-status' ? null : 'payment-refund-status')}
                        onClose={() => setOpenFilterDropdown(null)}
                      />
                    </div>
                  </div>

                  {filteredPaymentRecords.length === 0 && (
                    <div className="pf-empty pf-payment-empty">
                      <span>PY</span>
                      <p>No payments match the selected filters.</p>
                      {hasActivePaymentFilters && (
                        <button className="pf-btn-primary" onClick={clearPaymentFilters}>
                          Reset payment filters
                        </button>
                      )}
                    </div>
                  )}

                  {filteredPaymentRecords.length > 0 && (
                    <div className="pf-pay-history-list">
                      {filteredPaymentRecords.map(({ booking: b, paymentMethodLabel, routeSummary }) => (
                        <div
                          key={b._id || b.id}
                          className={`pf-pay-history-card ${isFullyCancelledStatus(b.status) && Number(b.refundAmount || 0) <= 0 ? 'pf-pay-history-card--red' : 'pf-pay-history-card--green'}`}
                        >
                          <div className="pf-ph-icon-box">
                            {getPaymentMethodBadgeText(b.payment)}
                          </div>
                          <div className="pf-ph-main">
                            <div className="pf-ph-info">
                              <p className="pf-ph-title">
                                {b.category?.toUpperCase()} Booking | {b.status}
                              </p>
                              <p className="pf-ph-date">
                                {new Date(b.bookingDate || b.createdAt).toLocaleString('en-IN', {
                                  day: '2-digit', month: 'short', year: 'numeric',
                                  hour: 'numeric', minute: '2-digit', hour12: true
                                }).toLowerCase()}
                              </p>
                              <p className="pf-ph-route">{routeSummary}</p>
                              {Number(b.refundAmount || 0) > 0 && (
                                <p className="pf-ph-wallet-credit">Wallet Refund Added: {formatCurrency(b.refundAmount || 0)}</p>
                              )}
                              {Number(b.refundAmount || 0) <= 0 && (
                                <p className="pf-ph-refund-tag">{getRefundStatusLabel(b)}</p>
                              )}
                            </div>
                            <div className="pf-ph-details">
                              <p className="pf-ph-method">{paymentMethodLabel}</p>
                              <p className="pf-ph-booking-id">{String(b.pnr || b._id || b.id || '').slice(-10).toUpperCase()}</p>
                              <p className={`pf-ph-amount ${isFullyCancelledStatus(b.status) && Number(b.refundAmount || 0) <= 0 ? 'text-red' : 'text-green'}`}>
                                {formatCurrency(b.totalFare || 0)}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {activeTab === 'account' && (
            <div className="pf-section">
              <div className="pf-section-header">
                <h2 className="pf-section-title">Personal Information</h2>
                {!isEditing
                  ? <button className="pf-btn-sm" onClick={() => setIsEditing(true)}>Edit</button>
                  : <div style={{display:'flex',gap:8}}>
                      <button className="pf-btn-primary" style={{padding:'8px 18px'}} onClick={handleSave}>Save</button>
                      <button className="pf-btn-outline" onClick={() => setIsEditing(false)}>Cancel</button>
                    </div>
                }
              </div>

              <form className="pf-form" onSubmit={handleSave}>
                <div className="pf-form-grid">
                  {[
                    ['firstName','First Name','text'],
                    ['lastName','Last Name','text'],
                    ['email','Email Address','email'],
                    ['mobile','Mobile Number','tel'],
                    ['dateOfBirth','Date of Birth','date'],
                    ['city','City','text'],
                    ['state','State','text'],
                    ['pincode','Pincode','text'],
                    ['country','Country','text'],
                  ].map(([name, label, type]) => (
                    <div className="pf-fg" key={name}>
                      <label>{label}</label>
                      <input type={type} name={name} value={formData[name]} onChange={handleInputChange} disabled={!isEditing}
                        maxLength={name==='mobile'?10:name==='pincode'?6:undefined} />
                    </div>
                  ))}
                  <div className="pf-fg">
                    <label>Gender</label>
                    <select name="gender" value={formData.gender} onChange={handleInputChange} disabled={!isEditing}>
                      <option value="">Select</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div className="pf-fg pf-fg--full">
                    <label>Address</label>
                    <input type="text" name="address" value={formData.address} onChange={handleInputChange} disabled={!isEditing} placeholder="Street address" />
                  </div>
                </div>
              </form>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="pf-section">
              <h2 className="pf-section-title">Security</h2>
              <div className="pf-security-list">
                <button className="pf-security-btn" onClick={() => { setShowPwModal(true); setPwSent(false); setPwEmail(user?.email||''); }}>
                  <span className="pf-security-btn-icon">PW</span>
                  <div>
                    <p className="pf-security-btn-title">Change Password</p>
                    <p className="pf-security-btn-sub">Send a password reset OTP to your email</p>
                  </div>
                  <span className="pf-security-btn-arrow">&gt;</span>
                </button>
                <button className="pf-security-btn danger" onClick={handleDeleteAccount}>
                  <span className="pf-security-btn-icon">DL</span>
                  <div>
                    <p className="pf-security-btn-title">Delete Account</p>
                    <p className="pf-security-btn-sub">Currently unavailable in self-service. Contact support for help.</p>
                  </div>
                  <span className="pf-security-btn-arrow">&gt;</span>
                </button>
              </div>
            </div>
          )}

        </main>
      </div>

      {modalOpen && (
        <BookingSummaryModal
          booking={selectedBk}
          autoDownloadOnOpen={modalAutoDownload}
          onAutoDownloadComplete={() => setModalAutoDownload(false)}
          onClose={() => {
            setModalOpen(false);
            setModalAutoDownload(false);
          }}
        />
      )}

      {feedbackOpen && (
        <FeedbackModal 
          booking={activeBookingForFeedback} 
          onClose={() => setFeedbackOpen(false)} 
          onSuccess={() => { /* maybe refresh bookings list? */ }} 
        />
      )}

      {cancelModalOpen && (
        <CancelBookingModal 
          booking={cancellingBk} 
          onClose={() => setCancelModalOpen(false)} 
          onSuccess={() => setIsFetched(false)} 
        />
      )}

      {showPwModal && (
        <div className="cp-overlay" onClick={e => e.target === e.currentTarget && setShowPwModal(false)}>
          <div className="cp-modal">
            <button className="cp-close" onClick={() => setShowPwModal(false)}>×</button>
            {!pwSent ? (
              <>
                <div className="cp-icon">PW</div>
                <h2 className="cp-title">Change Password</h2>
                <p className="cp-desc">We'll send a password reset OTP to your email.</p>
                <form className="cp-form" onSubmit={handleSendReset}>
                  <div className="cp-field">
                    <label>Email Address</label>
                    <input type="email" value={pwEmail} onChange={e => setPwEmail(e.target.value)} required />
                  </div>
                  <button type="submit" className="cp-submit" disabled={pwLoading}>{pwLoading ? 'Sending...' : 'Send Reset OTP'}</button>
                  <button type="button" className="cp-cancel" onClick={() => setShowPwModal(false)}>Cancel</button>
                </form>
              </>
            ) : (
              <div className="cp-success">
                <div className="cp-success-icon">OK</div>
                <h3>OTP Sent!</h3>
                <p>Check your inbox at <strong>{pwEmail}</strong> for the reset OTP.</p>
                <button className="cp-submit" onClick={() => setShowPwModal(false)}>Done</button>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
};

export default Profile;



