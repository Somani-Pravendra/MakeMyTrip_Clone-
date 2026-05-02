const CAB_PROFILES = [
  {
    match: /premium|prime|crysta|innova|xl6|suv/i,
    details: {
      categoryLabel: "Premium SUV",
      description: "Spacious AC cabin with stronger luggage space for airport transfers, family rides, and late-night pickups.",
      features: ["AC", "Large boot", "Premium cabin", "High-demand route ready"],
      luggage: "3 large bags",
      idealFor: "Family trips and airport pickups",
      eta: "4-6 mins",
      rating: 4.8,
      dispatchNote: "Usually assigned for airport trips, larger groups, and luggage-heavy routes."
    }
  },
  {
    match: /mini|hatch|wagon|swift|nano/i,
    details: {
      categoryLabel: "Economy",
      description: "Budget-friendly AC ride for quick city hops, metro station transfers, and solo travel.",
      features: ["AC", "Easy parking", "Low-cost ride", "Compact city car"],
      luggage: "1-2 bags",
      idealFor: "Solo riders and short city trips",
      eta: "2-4 mins",
      rating: 4.6,
      dispatchNote: "Best when you want the fastest city pickup for short or medium distances."
    }
  },
  {
    match: /sedan|dzire|etios|xcent|amaze/i,
    details: {
      categoryLabel: "Comfort Sedan",
      description: "Balanced comfort and boot space for office rides, station drops, airport runs, and couple travel.",
      features: ["AC", "Comfort seats", "Smooth ride", "Business travel friendly"],
      luggage: "2 large bags",
      idealFor: "Couples and business travel",
      eta: "3-5 mins",
      rating: 4.7,
      dispatchNote: "Most popular for business rides, hotel transfers, and station pickups."
    }
  }
];

const DEFAULT_PROFILE = {
  categoryLabel: "Everyday Cab",
  description: "Reliable AC cab for city rides, office commutes, hotel transfers, and everyday pickups.",
  features: ["AC", "Verified driver", "Everyday value", "Local dispatch support"],
  luggage: "2 bags",
  idealFor: "Daily local travel",
  eta: "4-7 mins",
  rating: 4.6,
  dispatchNote: "A balanced option for routine local travel across most city routes."
};

export const inferCabProfile = (cabName = "", seats = 4) => {
  const matchedProfile =
    CAB_PROFILES.find((profile) => profile.match.test(cabName))?.details || DEFAULT_PROFILE;

  const normalizedSeats = Number(seats) || 4;

  return {
    ...matchedProfile,
    seats: normalizedSeats,
    luggage:
      normalizedSeats >= 6
        ? "3 large bags"
        : normalizedSeats >= 4
          ? matchedProfile.luggage
          : "1 cabin bag"
  };
};

export const normalizeCabType = (cab = {}) => {
  const name = cab.cabTypeName || cab.name || "City Cab";
  const seats = cab.numberOfSeats || cab.seats || 4;
  const profile = inferCabProfile(name, seats);

  return {
    ...cab,
    id: cab.id || cab._id,
    name,
    seats,
    numberOfSeats: seats,
    baseFare: Number(cab.baseFare || 0),
    perKmRate: Number(cab.pricePerKm || cab.perKmRate || 0),
    available: cab.available ?? cab.status === "active",
    description: cab.description || profile.description,
    features: Array.isArray(cab.features) && cab.features.length ? cab.features : profile.features,
    luggage: cab.luggage || profile.luggage,
    idealFor: cab.idealFor || profile.idealFor,
    eta: cab.eta || profile.eta,
    rating: cab.rating || profile.rating,
    categoryLabel: cab.categoryLabel || profile.categoryLabel,
    dispatchNote: cab.dispatchNote || profile.dispatchNote,
    waitTime: cab.waitTime || "15 mins free waiting",
    cancellation: cab.cancellation || "Free cancellation before driver allocation"
  };
};

export const getCabPricingBreakdown = (cab = {}, distance = 0) => {
  const baseFare = Math.round(Number(cab.baseFare || 0));
  const perKmRate = Number(cab.perKmRate || 0);
  const safeDistance = Math.max(Number(distance) || 0, 0);
  const distanceCharge = Math.round(safeDistance * perKmRate);
  const rideFare = baseFare + distanceCharge;
  const serviceFee = rideFare > 0 ? Math.max(29, Math.round(rideFare * 0.04)) : 0;
  const gst = Math.round((rideFare + serviceFee) * 0.05);
  const total = rideFare + serviceFee + gst;

  return {
    baseFare,
    perKmRate,
    distance: safeDistance,
    distanceCharge,
    rideFare,
    serviceFee,
    gst,
    total
  };
};

export const formatCabDuration = (minutes = 0) => {
  const safeMinutes = Math.max(Math.round(Number(minutes) || 0), 0);
  if (safeMinutes < 60) {
    return `${safeMinutes} mins`;
  }

  const hours = Math.floor(safeMinutes / 60);
  const remainingMinutes = safeMinutes % 60;
  return remainingMinutes ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
};

export const getTrafficInfo = (pickupDateTime) => {
  const date = pickupDateTime ? new Date(pickupDateTime) : new Date();
  const hour = Number.isNaN(date.getTime()) ? new Date().getHours() : date.getHours();

  if ((hour >= 8 && hour <= 11) || (hour >= 17 && hour <= 21)) {
    return {
      label: "Peak traffic",
      multiplier: 1.28,
      roadNote: "Office-hour congestion can add 10-15 mins on arterial city roads and station approaches."
    };
  }

  if (hour >= 22 || hour <= 5) {
    return {
      label: "Late-night traffic",
      multiplier: 0.82,
      roadNote: "Roads are usually clearer at this hour, so the ride may be faster."
    };
  }

  return {
    label: "Regular traffic",
    multiplier: 1,
    roadNote: "Normal city conditions expected for the selected pickup time."
  };
};

export const estimateCabDuration = (distance = 0, pickupDateTime) => {
  const safeDistance = Math.max(Number(distance) || 0, 0);
  const traffic = getTrafficInfo(pickupDateTime);
  const baseMinutes = safeDistance * 2.4 + 8;
  return Math.max(12, Math.round(baseMinutes * traffic.multiplier));
};
