export const HOTEL_MEAL_ADDON_PRICES = {
  breakfast: 299,
  lunch: 399,
  dinner: 499,
};

export const getHotelMealSelections = (experienceAddOns = {}, guests = 1) => {
  const guestCount = Math.max(Number(guests) || 1, 1);
  const mealConfig = [
    { key: "breakfast", label: "Breakfast" },
    { key: "lunch", label: "Lunch" },
    { key: "dinner", label: "Dinner" },
  ];

  return mealConfig
    .filter((item) => Boolean(experienceAddOns?.[item.key]))
    .map((item) => ({
      ...item,
      pricePerGuest: HOTEL_MEAL_ADDON_PRICES[item.key] || 0,
      totalPrice: (HOTEL_MEAL_ADDON_PRICES[item.key] || 0) * guestCount,
    }));
};

export const getHotelMealAddOnTotal = (experienceAddOns = {}, guests = 1) =>
  getHotelMealSelections(experienceAddOns, guests).reduce(
    (total, item) => total + item.totalPrice,
    0
  );
