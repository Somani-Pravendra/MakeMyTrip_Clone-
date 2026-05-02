import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { useAuth } from './AuthContext';

const BookingContext = createContext();
const LEGACY_BOOKING_STORAGE_KEY = 'mmt_bookings';

const capitalizeStatus = (status = '') => {
    if (!status) return 'Confirmed';
    return status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
};

const isValidLocalCacheBooking = (booking) =>
    booking &&
    typeof booking === 'object' &&
    booking.source === 'local-cache';

// Strip sensitive payment/passenger details before caching locally
const sanitizeForCache = (booking) => {
    const safe = { ...booking };
    // Keep only non-sensitive payment metadata — never cache card numbers, CVV, UPI IDs, etc.
    if (safe.payment) {
        safe.payment = {
            method: safe.payment.method,
            walletAmountUsed: safe.payment.walletAmountUsed,
            externalAmountPaid: safe.payment.externalAmountPaid
            // Intentionally omitting: provider, subMethod, externalPaymentMethod,
            // externalPaymentOption — these may contain card/UPI identifiers.
        };
    }
    // Remove OTP and driver phone from cab bookings
    if (safe.cab) {
        const { otp, driverPhone, ...safeCab } = safe.cab;
        safe.cab = safeCab;
    }
    // Remove any raw card data that may have been attached to the booking object
    if (safe.cardData) {
        delete safe.cardData;
    }
    // Remove contact details that may contain sensitive PII beyond what's needed
    if (safe.contactDetails) {
        safe.contactDetails = {
            name: safe.contactDetails.name,
            email: safe.contactDetails.email
            // Intentionally omitting phone number from local cache
        };
    }
    return safe;
};

const emptyBookingBuckets = () => ({
    upcoming: [],
    completed: [],
    cancelled: []
});

const getBookingStorageKey = (user = null) => {
    const scopeId = user?._id || user?.id || user?.email;
    return scopeId ? `mmt_bookings:${scopeId}` : null;
};

const readCachedBookings = (storageKey) => {
    if (!storageKey) return emptyBookingBuckets();

    try {
        const savedBookings = localStorage.getItem(storageKey);
        if (!savedBookings) return emptyBookingBuckets();

        const parsed = JSON.parse(savedBookings);
        return {
            upcoming: Array.isArray(parsed?.upcoming) ? parsed.upcoming.filter(isValidLocalCacheBooking) : [],
            completed: Array.isArray(parsed?.completed) ? parsed.completed.filter(isValidLocalCacheBooking) : [],
            cancelled: Array.isArray(parsed?.cancelled) ? parsed.cancelled.filter(isValidLocalCacheBooking) : []
        };
    } catch {
        return emptyBookingBuckets();
    }
};

export const useBookings = () => {
    const context = useContext(BookingContext);
    if (!context) {
        throw new Error('useBookings must be used within a BookingProvider');
    }
    return context;
};

export const BookingProvider = ({ children }) => {
    const { user } = useAuth();
    const storageKey = getBookingStorageKey(user);
    const previousStorageKeyRef = useRef(storageKey);
    const [bookings, setBookings] = useState(() => readCachedBookings(getBookingStorageKey(user)));

    useEffect(() => {
        const previousStorageKey = previousStorageKeyRef.current;
        if (previousStorageKey && previousStorageKey !== storageKey) {
            try {
                localStorage.removeItem(previousStorageKey);
            } catch {
                // Ignore cleanup failures when auth scope changes.
            }
        }

        previousStorageKeyRef.current = storageKey;
        setBookings(readCachedBookings(storageKey));
    }, [storageKey]);

    useEffect(() => {
        if (!storageKey) return;

        try {
            localStorage.setItem(storageKey, JSON.stringify(bookings));
        } catch {
            // Ignore storage quota errors
        }
    }, [bookings, storageKey]);

    useEffect(() => {
        try {
            localStorage.removeItem(LEGACY_BOOKING_STORAGE_KEY);
        } catch {
            // Ignore cleanup failures for old cache keys.
        }
    }, []);

    const addBooking = (booking) => {
        const normalizedId = booking._id || String(booking.id || Date.now());
        const normalizedCategory = booking.category || booking.type || 'booking';
        const newBooking = {
            ...sanitizeForCache(booking),
            _id: normalizedId,
            id: normalizedId,
            source: 'local-cache',
            category: normalizedCategory,
            totalFare: booking.totalFare ?? booking.price ?? 0,
            status: capitalizeStatus(booking.status),
            createdAt: booking.createdAt || new Date().toISOString(),
            bookingDate: booking.bookingDate || new Date().toLocaleDateString('en-IN', {
                day: 'numeric', month: 'short', year: 'numeric'
            })
        };

        setBookings(prev => ({
            ...prev,
            upcoming: [newBooking, ...prev.upcoming]
        }));

        return newBooking;
    };

    const cancelBooking = (bookingId) => {
        setBookings(prev => {
            const bookingToCancel = prev.upcoming.find(b => b.id === bookingId);
            if (!bookingToCancel) return prev;

            return {
                ...prev,
                upcoming: prev.upcoming.filter(b => b.id !== bookingId),
                cancelled: [{ ...bookingToCancel, status: 'Cancelled' }, ...prev.cancelled]
            };
        });
    };

    const clearBookings = () => {
        setBookings(emptyBookingBuckets());
        try {
            if (storageKey) {
                localStorage.removeItem(storageKey);
            }
            localStorage.removeItem(LEGACY_BOOKING_STORAGE_KEY);
        } catch {
            // Ignore local cache cleanup issues.
        }
    };

    return (
        <BookingContext.Provider value={{ bookings, addBooking, cancelBooking, clearBookings }}>
            {children}
        </BookingContext.Provider>
    );
};
