const toAmount = (value) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 0;
  return Math.max(0, Math.round(numeric));
};

const DEFAULT_OFFERS_BY_CATEGORY = {
  flights: [
    {
      title: "Flight Saver",
      description: "Smart fallback offer for flights bookings.",
      promoCode: "FLIGHT20",
      discountType: "percentage",
      discountValue: 20,
      minBookingAmount: 3000,
      maxDiscount: 1500,
      category: "flights",
      isActive: true
    }
  ],
  hotels: [
    {
      title: "Stay More, Save More",
      description: "Smart fallback offer for hotel bookings.",
      promoCode: "HOTEL15",
      discountType: "percentage",
      discountValue: 15,
      minBookingAmount: 5000,
      maxDiscount: 1200,
      category: "hotels",
      isActive: true
    }
  ],
  trains: [
    {
      title: "Rail Saver",
      description: "Smart fallback offer for train bookings.",
      promoCode: "TRAIN10",
      discountType: "percentage",
      discountValue: 10,
      minBookingAmount: 1200,
      maxDiscount: 500,
      category: "trains",
      isActive: true
    }
  ],
  bus: [
    {
      title: "Bus Saver",
      description: "Smart fallback offer for bus bookings.",
      promoCode: "BUS10",
      discountType: "percentage",
      discountValue: 10,
      minBookingAmount: 800,
      maxDiscount: 300,
      category: "bus",
      isActive: true
    }
  ],
  cabs: [
    {
      title: "Cab Saver",
      description: "Smart fallback offer for cab bookings.",
      promoCode: "CAB15",
      discountType: "percentage",
      discountValue: 15,
      minBookingAmount: 1000,
      maxDiscount: 500,
      category: "cabs",
      isActive: true
    }
  ],
  packages: [
    {
      title: "Holiday Deal",
      description: "Smart fallback offer for holiday packages.",
      promoCode: "HOLIDAY25",
      discountType: "percentage",
      discountValue: 25,
      minBookingAmount: 10000,
      maxDiscount: 2500,
      category: "packages",
      isActive: true
    }
  ]
};

export const normalizeOfferCategory = (category = "all") => {
  const normalized = String(category || "").trim().toLowerCase();

  if (["flight", "flights"].includes(normalized)) return "flights";
  if (["hotel", "hotels"].includes(normalized)) return "hotels";
  if (["train", "trains"].includes(normalized)) return "trains";
  if (["bus", "buses"].includes(normalized)) return "bus";
  if (["cab", "cabs"].includes(normalized)) return "cabs";
  if (["holiday", "holidays", "package", "packages"].includes(normalized)) return "packages";
  return "all";
};

export const normalizeOfferCode = (value = "") => String(value || "").trim().toUpperCase();

export const evaluateOffer = (offer = {}, subtotal = 0) => {
  const safeSubtotal = toAmount(subtotal);
  const normalizedCode = normalizeOfferCode(offer.promoCode);
  const minBookingAmount = toAmount(offer.minBookingAmount);

  if (!normalizedCode) {
    return {
      valid: false,
      amount: 0,
      message: "Invalid coupon code.",
      offer: null
    };
  }

  if (safeSubtotal < minBookingAmount) {
    return {
      valid: false,
      amount: 0,
      message: `Minimum booking amount ${minBookingAmount} required.`,
      offer
    };
  }

  let discount = 0;
  if (String(offer.discountType || "").toLowerCase() === "flat") {
    discount = toAmount(offer.discountValue);
  } else {
    const percentageDiscount = Math.round((safeSubtotal * toAmount(offer.discountValue)) / 100);
    const maxDiscount = toAmount(offer.maxDiscount);
    discount = maxDiscount > 0 ? Math.min(percentageDiscount, maxDiscount) : percentageDiscount;
  }

  discount = Math.min(discount, safeSubtotal);

  return {
    valid: discount > 0,
    amount: discount,
    message: discount > 0 ? "Coupon applied successfully." : "This coupon is not applicable on the current fare.",
    offer
  };
};

export const resolveOfferByCode = (offers = [], couponCode = "", subtotal = 0) => {
  const normalizedCode = normalizeOfferCode(couponCode);
  if (!normalizedCode) {
    return {
      valid: false,
      amount: 0,
      message: "",
      offer: null,
      code: ""
    };
  }

  const matchedOffer = (offers || []).find(
    (offer) => normalizeOfferCode(offer.promoCode) === normalizedCode
  );

  if (!matchedOffer) {
    return {
      valid: false,
      amount: 0,
      message: "Invalid coupon code.",
      offer: null,
      code: normalizedCode
    };
  }

  const evaluation = evaluateOffer(matchedOffer, subtotal);
  return {
    ...evaluation,
    code: normalizedCode
  };
};

export const getBestOffer = (offers = [], subtotal = 0) => {
  let bestMatch = null;

  (offers || []).forEach((offer) => {
    const evaluation = evaluateOffer(offer, subtotal);
    if (!evaluation.valid) return;

    if (!bestMatch || evaluation.amount > bestMatch.amount) {
      bestMatch = {
        ...evaluation,
        code: normalizeOfferCode(offer.promoCode)
      };
    }
  });

  return bestMatch;
};

export const getFallbackOffers = (category = "all") => {
  const normalized = normalizeOfferCategory(category);
  if (normalized === "all") {
    return Object.values(DEFAULT_OFFERS_BY_CATEGORY).flat();
  }
  return DEFAULT_OFFERS_BY_CATEGORY[normalized] || [];
};
