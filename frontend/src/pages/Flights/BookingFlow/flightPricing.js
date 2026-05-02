const toAmount = (value) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 0;
  return Math.max(0, Math.round(numeric));
};

const normalizeCode = (value = "") => String(value || "").trim().toUpperCase();

const getAddonLineTotal = (item = {}) => {
  if (item.totalPrice !== undefined) return toAmount(item.totalPrice);
  const quantity = Math.max(toAmount(item.quantity), 1);
  return toAmount(item.price) * quantity;
};

export const getFlightPricing = (data = {}) => {
  const passengerCount = Math.max(toAmount(data.passengers?.length || 1), 1);
  const addOns = data.addOns || {};
  const selectedSeats = Array.isArray(data.selectedSeats) ? data.selectedSeats : [];

  const baseFare = toAmount(data.basePrice) * passengerCount;
  const taxes = Math.round(baseFare * 0.12);
  const convenienceFee = 350;
  const seatsTotal = selectedSeats.reduce((sum, seat) => sum + toAmount(seat?.price), 0);
  const mealsTotal = (addOns.meals || []).reduce((sum, meal) => sum + getAddonLineTotal(meal), 0);
  const baggageTotal = (addOns.baggage || []).reduce((sum, bag) => sum + getAddonLineTotal(bag), 0);

  const subtotal = baseFare + taxes + convenienceFee + seatsTotal + mealsTotal + baggageTotal;
  const couponDiscount = Math.min(toAmount(data.couponDiscount), subtotal);
  const totalAmount = Math.max(subtotal - couponDiscount, 0);

  return {
    passengerCount,
    baseFare,
    taxes,
    convenienceFee,
    seatsTotal,
    mealsTotal,
    baggageTotal,
    subtotal,
    coupon: {
      code: normalizeCode(data.couponCode),
      applied: Boolean(data.couponCode),
      valid: couponDiscount > 0,
      amount: couponDiscount,
      message: couponDiscount > 0 ? "Coupon applied successfully." : "",
      offer: null,
    },
    couponDiscount,
    totalAmount,
  };
};

export const normalizeFlightCouponCode = normalizeCode;
