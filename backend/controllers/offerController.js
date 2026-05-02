const Offer = require("../models/Offer");

const normalizeOfferCategory = (category = "all") => {
  const normalized = String(category || "").trim().toLowerCase();

  if (["flight", "flights"].includes(normalized)) return "flights";
  if (["hotel", "hotels"].includes(normalized)) return "hotels";
  if (["train", "trains"].includes(normalized)) return "trains";
  if (["bus", "buses"].includes(normalized)) return "bus";
  if (["cab", "cabs"].includes(normalized)) return "cabs";
  if (["holiday", "holidays", "package", "packages"].includes(normalized)) return "packages";
  return "all";
};

exports.getPublicOffers = async (req, res) => {
  try {
    const category = normalizeOfferCategory(req.query.category || "all");
    const now = new Date();
    const filter = {
      isActive: true,
      validTill: { $gte: now }
    };

    if (category !== "all") {
      filter.category = { $in: [category, "all"] };
    }

    const offers = await Offer.find(filter)
      .select("title description promoCode discountType discountValue minBookingAmount maxDiscount validTill category imageUrl")
      .sort({ minBookingAmount: 1, createdAt: -1 })
      .lean();

    res.json({
      success: true,
      category,
      offers
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching offers"
    });
  }
};
