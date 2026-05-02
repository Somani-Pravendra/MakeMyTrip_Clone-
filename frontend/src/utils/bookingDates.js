export const resolveBookingCancellationDate = (booking = {}) => {
  const candidates = [
    booking.travelDate,
    booking.departureDate,
    booking.date,
    booking.pickupDateTime,
    booking.checkIn,
    booking.checkOut,
    booking.checkInDate,
    booking.checkOutDate,
    booking.cab?.pickupDateTime,
    booking.hotel?.checkIn,
    booking.hotel?.checkOut,
    booking.details?.date,
    booking.details?.pickupTime,
    booking.details?.pickupDateTime,
    booking.details?.checkIn,
    booking.details?.checkOut,
  ];

  for (const candidate of candidates) {
    if (!candidate) continue;
    const parsed = new Date(candidate);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }
  }

  return null;
};

export const formatTravelDate = (value, fallback = "TBD") => {
  if (!value) return fallback;

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return fallback;

  return parsed.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

export const formatTravelDateTime = (value, fallback = "TBD") => {
  if (!value) return fallback;

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return fallback;

  return parsed.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
};
