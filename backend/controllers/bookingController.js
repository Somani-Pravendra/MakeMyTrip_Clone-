const Booking = require("../models/Booking");
const User = require("../models/User");
const Flight = require("../models/Flight");
const Train = require("../models/Train");
const Hotel = require("../models/Hotel");
const Bus = require("../models/Bus");
const Package = require("../models/Package");
const CabType = require("../models/CabType");
const Offer = require("../models/Offer");
const mongoose = require("mongoose");
const {
  buildInventoryReservationForBooking,
  releaseInventoryReservation,
  reserveInventoryReservation,
  updatePackageEmbeddedBookingStatus
} = require("../utils/bookingMaintenance");
const {
  sendBookingTicketEmail,
  sendBookingCancellationEmail,
  sendBookingPartialCancellationEmail
} = require("../utils/bookingEmail");

const ACTIVE_COMPONENT_STATUS = "Active";
const CANCELLED_COMPONENT_STATUS = "Cancelled";
const FLIGHT_MEAL_PRICES = {
  veg_thali: 320,
  veg_wrap: 280,
  veg_snack: 220,
  chicken_meal: 420,
  fish_rice: 460,
  egg_snack: 260
};
const FLIGHT_BAGGAGE_PRICES = {
  bag5: 1500,
  bag10: 2800,
  bag15: 3900
};
const TRAIN_MEAL_PRICES = {
  m1: 180,
  m2: 220,
  m3: 80
};
const BUS_MEAL_PRICES = {
  veg_combo: 160,
  sandwich_snack: 130,
  tea_snacks: 90,
  chicken_roll: 210,
  egg_puff: 140,
  grilled_wrap: 190
};
const HOTEL_MEAL_PRICES = {
  breakfast: 299,
  lunch: 399,
  dinner: 499
};
const CANCELLATION_LOCK_TTL_MS = 2 * 60 * 1000;
const generateComponentIdentifier = () => new mongoose.Types.ObjectId().toString();

const resolveTravelDate = (...candidates) => {
  for (const candidate of candidates) {
    if (!candidate) continue;
    if (candidate instanceof Date && !Number.isNaN(candidate.getTime())) return candidate;
    if (typeof candidate === "number") {
      const parsed = new Date(candidate);
      if (!Number.isNaN(parsed.getTime())) return parsed;
    }
    if (typeof candidate === "string") {
      const trimmed = candidate.trim();
      if (/^\d{1,2}:\d{2}(:\d{2})?$/.test(trimmed)) continue;
      const parsed = new Date(trimmed);
      if (!Number.isNaN(parsed.getTime())) return parsed;
    }
  }
  return undefined;
};
const getActiveBookedRoomCount = (booking = {}) => {
  const rooms = Array.isArray(booking.hotel?.rooms) ? booking.hotel.rooms : [];
  if (rooms.length > 0) {
    return rooms.filter((room) => !["cancelled", "fully cancelled"].includes(String(room?.status || "").trim().toLowerCase())).length;
  }

  return ["cancelled", "fully cancelled"].includes(String(booking.status || "").trim().toLowerCase()) ? 0 : 1;
};

const normalizeAmount = (value) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 0;
  return Math.max(0, Math.round(numeric));
};

const normalizeCategory = (value) => {
  const category = String(value || "").trim().toLowerCase();
  const map = {
    flights: "flight",
    hotels: "hotel",
    trains: "train",
    buses: "bus",
    packages: "package",
    cab: "cabs"
  };
  return map[category] || category;
};

const normalizeOfferCategory = (category = "all") => {
  const normalized = normalizeCategory(category);
  if (normalized === "flight") return "flights";
  if (normalized === "hotel") return "hotels";
  if (normalized === "train") return "trains";
  if (normalized === "bus") return "bus";
  if (normalized === "cabs") return "cabs";
  if (normalized === "package") return "packages";
  return "all";
};

const isPassengerPartialCategory = (category) => ["flight", "train", "bus"].includes(normalizeCategory(category));
const isHotelCategory = (category) => normalizeCategory(category) === "hotel";

const formatCurrency = (value) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(Number(value) || 0);

const allocateFareShares = (totalFare, count) => {
  const c = Math.max(0, Number(count) || 0);
  if (c <= 0) return [];
  const total = normalizeAmount(totalFare);
  const base = Math.floor(total / c);
  const rem = total - (base * c);
  return Array.from({ length: c }, (_, index) => base + (index < rem ? 1 : 0));
};

const toComponentStatus = (value) => {
  const normalized = String(value || "").trim().toLowerCase();
  return normalized === "cancelled" ? CANCELLED_COMPONENT_STATUS : ACTIVE_COMPONENT_STATUS;
};

const isComponentActive = (value) => toComponentStatus(value) === ACTIVE_COMPONENT_STATUS;
const normalizeBookingStatus = (value) => String(value || "").trim().toLowerCase();
const isFullyCancelledBooking = (booking) => {
  const status = normalizeBookingStatus(booking?.status);
  return status === "cancelled" || status === "fully cancelled";
};
const isCancelableBookingStatus = (booking) => {
  const status = normalizeBookingStatus(booking?.status);
  return status === "confirmed" || status === "partially cancelled";
};

const getRefundPolicy = (travelDate) => {
  const now = new Date();
  const diffInHrs = travelDate ? (travelDate - now) / (1000 * 60 * 60) : -1;
  let refundPercentage = 0;
  if (diffInHrs > 48) refundPercentage = 90;
  else if (diffInHrs >= 24) refundPercentage = 75;
  else if (diffInHrs >= 12) refundPercentage = 50;
  else if (diffInHrs >= 6) refundPercentage = 25;
  else if (diffInHrs >= 2) refundPercentage = 12;
  return { now, refundPercentage };
};

const getHotelNights = (checkIn, checkOut) => {
  const ci = resolveTravelDate(checkIn);
  const co = resolveTravelDate(checkOut);
  if (!ci || !co) return 1;
  const days = Math.ceil((co.getTime() - ci.getTime()) / 86400000);
  return Math.max(1, days);
};

const splitPassengerName = (fullName) => {
  const safeName = String(fullName || "").trim();
  if (!safeName) return { firstName: "", lastName: "" };
  const parts = safeName.split(/\s+/).filter(Boolean);
  return { firstName: parts[0] || "", lastName: parts.slice(1).join(" ") };
};

const normalizePassengers = (passengers) => {
  if (!Array.isArray(passengers)) return [];
  return passengers.map((passenger = {}) => ({
    passengerId: String(passenger.passengerId || "").trim() || generateComponentIdentifier(),
    firstName: String(passenger.firstName || "").trim(),
    lastName: String(passenger.lastName || "").trim(),
    age: passenger.age === "" || passenger.age === null || passenger.age === undefined ? undefined : Number(passenger.age),
    gender: passenger.gender ? String(passenger.gender).trim() : undefined
  }));
};

const normalizeCabPassengers = ({ passengers, passengerName, contactDetails }) => {
  const normalized = normalizePassengers(passengers).filter((p) => p.firstName || p.lastName || p.age !== undefined || p.gender);
  if (normalized.length > 0) return normalized;
  const splitName = splitPassengerName(passengerName || contactDetails?.name);
  if (splitName.firstName || splitName.lastName) return [{ passengerId: generateComponentIdentifier(), ...splitName, age: undefined, gender: undefined }];
  return [];
};

const pickAllowedFields = (source = {}, fields = []) =>
  fields.reduce((acc, field) => {
    if (source[field] !== undefined) acc[field] = source[field];
    return acc;
  }, {});

const findClassByType = (classes = [], selectedClass = "") => {
  const normalizedSelectedClass = String(selectedClass || "").trim().toUpperCase();
  return classes.find((item = {}) => String(item.type || "").trim().toUpperCase() === normalizedSelectedClass);
};

const getRequestedPassengerCount = (payload = {}, normalizedCategory = "") => {
  if (normalizedCategory === "hotel") {
    return Math.max(Number(payload.guests || payload.hotel?.guests || 1) || 1, 1);
  }

  const passengers = Array.isArray(payload.passengers) ? payload.passengers.filter(Boolean) : [];
  if (passengers.length > 0) return passengers.length;
  return 1;
};

const getLineItemTotal = (item = {}, priceMap = {}) => {
  const mappedPrice = priceMap[String(item.id || "").trim()];
  const unitPrice = mappedPrice !== undefined ? mappedPrice : normalizeAmount(item.price);
  const quantity = Math.max(Number(item.quantity) || 1, 1);
  return normalizeAmount(unitPrice * quantity);
};

const getFlightSeatUpgradeTotal = (selectedSeats = []) =>
  (Array.isArray(selectedSeats) ? selectedSeats : []).reduce((sum, seat) => {
    const seatId = String(seat?.id || seat || "").trim().toUpperCase();
    if (!seatId) return sum;
    return sum + (/[AF]$/.test(seatId) ? 250 : 0);
  }, 0);

const getFlightMealsTotal = (addOns = {}) =>
  (Array.isArray(addOns.meals) ? addOns.meals : []).reduce((sum, item) => sum + getLineItemTotal(item, FLIGHT_MEAL_PRICES), 0);

const getFlightBaggageTotal = (addOns = {}) =>
  (Array.isArray(addOns.baggage) ? addOns.baggage : []).reduce((sum, item) => sum + getLineItemTotal(item, FLIGHT_BAGGAGE_PRICES), 0);

const getTrainMealsTotal = ({ addOns = {}, passengerCount = 1 }) => {
  const selectedMeals = Array.isArray(addOns.meals) && addOns.meals.length > 0
    ? addOns.meals
    : (Array.isArray(addOns.catering) ? addOns.catering : []);
  const mealTotalPerPassenger = selectedMeals.reduce((sum, item) => sum + getLineItemTotal(item, TRAIN_MEAL_PRICES), 0);
  return mealTotalPerPassenger * Math.max(Number(passengerCount) || 1, 1);
};

const getBusMealsTotal = (addOns = {}) =>
  (Array.isArray(addOns.meals) ? addOns.meals : []).reduce((sum, item) => sum + getLineItemTotal(item, BUS_MEAL_PRICES), 0);

const getHotelMealAddOnTotal = ({ experienceAddOns = {}, guestCount = 1 }) => {
  const normalizedGuestCount = Math.max(Number(guestCount) || 1, 1);
  return Object.entries(HOTEL_MEAL_PRICES).reduce((sum, [key, price]) => (
    experienceAddOns?.[key] ? sum + (normalizeAmount(price) * normalizedGuestCount) : sum
  ), 0);
};

const validateBookingInventory = async ({
  normalizedCategory,
  flightId,
  trainId,
  hotelId,
  busId,
  packageId,
  cabId,
  payload
}) => {
  if (normalizedCategory === "flight") {
    if (!flightId) {
      return { error: "A valid flight is required for this booking." };
    }

    const flight = await Flight.findById(flightId).lean();
    if (!flight) {
      return { error: "The selected flight could not be found." };
    }
    if (Number(flight.availableSeats || 0) > 0 && Number(flight.availableSeats || 0) < getRequestedPassengerCount(payload, normalizedCategory)) {
      return { error: "Not enough seats are available on the selected flight." };
    }

    const selectedFare = payload.selectedFare || payload.flight?.selectedFare || {};
    const matchedFare = String(selectedFare?.type || "").trim()
      ? (Array.isArray(flight.fares) ? flight.fares.find((item = {}) => String(item.type || "").trim().toUpperCase() === String(selectedFare.type || "").trim().toUpperCase()) : null)
      : (Array.isArray(flight.fares) && flight.fares.length > 0 ? flight.fares[0] : null);

    if (String(selectedFare?.type || "").trim() && !matchedFare) {
      return { error: `The selected flight fare ${selectedFare.type} is not available.` };
    }
    if (matchedFare && selectedFare?.price !== undefined && normalizeAmount(selectedFare.price) !== normalizeAmount(matchedFare.price)) {
      return { error: "The selected flight fare pricing is no longer valid." };
    }

    return {
      flightSnapshot: {
        airline: flight.airlineName || flight.airline || "",
        flightNumber: flight.flightNumber,
        from: flight.from,
        to: flight.to,
        departureTime: flight.departureTime,
        arrivalTime: flight.arrivalTime,
        duration: flight.duration,
        stops: flight.stops,
        logo: flight.logo
      },
      pricingContext: {
        flight,
        matchedFare
      }
    };
  }

  if (normalizedCategory === "train") {
    if (!trainId) {
      return { error: "A valid train is required for this booking." };
    }

    const train = await Train.findById(trainId).lean();
    if (!train) {
      return { error: "The selected train could not be found." };
    }
    if (train.isActive === false) {
      return { error: "This train is not available for booking right now." };
    }

    const passengerCount = getRequestedPassengerCount(payload, normalizedCategory);
    const selectedClass = payload.train?.selectedClass || payload.selectedClass || "";
    const matchedClass = findClassByType(train.availableClasses, selectedClass);

    if (selectedClass && !matchedClass) {
      return { error: `The selected train class ${selectedClass} is not available.` };
    }
    if (matchedClass && Number(matchedClass.availableSeats || 0) < passengerCount) {
      return { error: "Not enough seats are available in the selected train class." };
    }

    return {
      trainSnapshot: {
        trainNumber: train.trainNumber,
        trainName: train.trainName,
        from: train.from,
        to: train.to,
        departureTime: train.departureTime,
        arrivalTime: train.arrivalTime,
        duration: train.duration,
        selectedClass: matchedClass?.type || selectedClass
      },
      pricingContext: {
        train,
        matchedClass
      }
    };
  }

  if (normalizedCategory === "hotel") {
    if (!hotelId) {
      return { error: "A valid hotel is required for this booking." };
    }

    const hotel = await Hotel.findById(hotelId).lean();
    if (!hotel) {
      return { error: "The selected hotel could not be found." };
    }
    if (hotel.isActive === false || String(hotel.bookingStatus || "").toLowerCase() === "full") {
      return { error: "This hotel is not available for booking right now." };
    }

    const requestedRooms = Math.max(Number(payload.roomCount || payload.hotel?.roomCount || 1) || 1, 1);
    const requestedCheckIn = resolveTravelDate(payload.checkIn || payload.hotel?.checkIn);
    const requestedCheckOut = resolveTravelDate(payload.checkOut || payload.hotel?.checkOut);

    let remainingRooms = Number(hotel.availableRooms || 0);
    if (requestedCheckIn && requestedCheckOut && requestedCheckOut > requestedCheckIn) {
      const overlappingBookings = await Booking.find({
        category: "hotel",
        hotelId,
        status: { $nin: ["Cancelled", "Fully Cancelled"] },
        "hotel.checkIn": { $lt: requestedCheckOut },
        "hotel.checkOut": { $gt: requestedCheckIn }
      }).select("hotel.rooms status").lean();

      const bookedRooms = overlappingBookings.reduce((sum, booking) => sum + getActiveBookedRoomCount(booking), 0);
      remainingRooms = Math.max(remainingRooms - bookedRooms, 0);
    }

    if (remainingRooms < requestedRooms) {
      return { error: "Not enough rooms are available for this hotel." };
    }

    const selectedRoomType = payload.selectedRoom?.type || payload.roomType || payload.hotel?.roomType || "";
    const matchedRoom = hotel.roomTypes?.find((room = {}) => String(room.type || "").trim() === String(selectedRoomType || "").trim());
    if (selectedRoomType && !matchedRoom) {
      return { error: `The selected room type ${selectedRoomType} is not available.` };
    }

    return {
      hotelSnapshot: {
        name: hotel.name,
        location: hotel.location,
        stars: hotel.stars,
        guests: Number(payload.guests || payload.hotel?.guests || 1) || 1,
        roomType: matchedRoom?.type || selectedRoomType || payload.hotel?.roomType,
        checkIn: payload.checkIn || payload.hotel?.checkIn,
        checkOut: payload.checkOut || payload.hotel?.checkOut
      },
      pricingContext: {
        hotel,
        matchedRoom
      }
    };
  }

  if (normalizedCategory === "bus") {
    if (!busId) {
      return { error: "A valid bus is required for this booking." };
    }

    const bus = await Bus.findById(busId).lean();
    if (!bus) {
      return { error: "The selected bus could not be found." };
    }
    if (String(bus.status || "").toLowerCase() !== "active") {
      return { error: "This bus is not available for booking right now." };
    }

    const requestedSeats = Array.isArray(payload.selectedSeats) && payload.selectedSeats.length > 0
      ? payload.selectedSeats.length
      : getRequestedPassengerCount(payload, normalizedCategory);

    const requestedSeatIds = Array.isArray(payload.selectedSeats)
      ? [...new Set(payload.selectedSeats.map((seat) => String(seat?.id || seat || "").trim().toUpperCase()).filter(Boolean))]
      : [];
    const activeBookings = await Booking.find({
      busId,
      status: { $nin: ["Cancelled", "Fully Cancelled"] }
    }).select("selectedSeats").lean();
    const occupiedSeatIds = new Set();
    activeBookings.forEach((booking = {}) => {
      (Array.isArray(booking.selectedSeats) ? booking.selectedSeats : []).forEach((seat) => {
        const seatId = String(seat?.id || seat || "").trim().toUpperCase();
        if (seatId) occupiedSeatIds.add(seatId);
      });
    });

    if (requestedSeatIds.some((seatId) => occupiedSeatIds.has(seatId))) {
      return { error: "One or more selected bus seats are no longer available. Please reselect your seats." };
    }

    const modeledRemainingSeats = Math.max(Number(bus.totalSeats || 0) - occupiedSeatIds.size, 0);
    const remainingSeats = Number(bus.totalSeats || 0) > 0
      ? Math.min(Number(bus.availableSeats || 0), modeledRemainingSeats)
      : Number(bus.availableSeats || 0);

    if (remainingSeats < requestedSeats) {
      return { error: "Not enough seats are available on the selected bus." };
    }

    return {
      busSnapshot: {
        operatorName: bus.operatorName,
        busType: bus.busType,
        from: bus.from,
        to: bus.to,
        departureTime: bus.departureTime,
        arrivalTime: bus.arrivalTime,
        duration: bus.duration,
        seatLayout: bus.seatLayout,
        boardingPoint: payload.boardingPoint || bus.boardingPoint,
        droppingPoint: payload.droppingPoint || bus.droppingPoint
      },
      pricingContext: {
        bus
      }
    };
  }

  if (normalizedCategory === "package") {
    if (!packageId) {
      return { error: "A valid package is required for this booking." };
    }

    const pkg = await Package.findById(packageId).lean();
    if (!pkg) {
      return { error: "The selected package could not be found." };
    }
    if (pkg.status !== "Active") {
      return { error: "This package is not available for booking right now." };
    }

    const requestedSeats = getRequestedPassengerCount(payload, normalizedCategory);
    if (Number(pkg.seatsAvailable || 0) < requestedSeats) {
      return { error: "Not enough seats are available for this package." };
    }

    return {
      packageSnapshot: {
        title: pkg.packageTitle,
        packageCode: pkg.packageId,
        destination: {
          country: pkg.country,
          state: pkg.destination || pkg.city,
          cities: [pkg.city].filter(Boolean)
        },
        duration: {
          nights: Number.parseInt(String(pkg.duration || "0"), 10) || 0,
          days: (Number.parseInt(String(pkg.duration || "0"), 10) || 0) + 1
        },
        media: {
          bannerImage: pkg.thumbnailImage
        }
      },
      pricingContext: {
        pkg
      }
    };
  }

  if (normalizedCategory === "cabs") {
    if (!cabId) {
      return { error: "A valid cab type is required for this booking." };
    }

    const cabType = await CabType.findById(cabId).lean();
    if (!cabType) {
      return { error: "The selected cab type could not be found." };
    }
    if (cabType.status !== "active") {
      return { error: "This cab type is not available for booking right now." };
    }
    if (getRequestedPassengerCount(payload, normalizedCategory) > Number(cabType.numberOfSeats || 0)) {
      return { error: "Passenger count exceeds the seating capacity of the selected cab." };
    }

    return {
      cabSnapshot: {
        cabType: cabType.cabTypeName,
        seats: cabType.numberOfSeats,
        baseFare: cabType.baseFare,
        perKmRate: cabType.pricePerKm
      },
      pricingContext: {
        cabType
      }
    };
  }

  return {};
};

const buildWalletTransaction = ({ type, amount, source, booking, balanceAfter, description, metadata = {} }) => ({
  type,
  amount: normalizeAmount(amount),
  source,
  bookingId: booking?._id,
  description,
  balanceAfter: normalizeAmount(balanceAfter),
  metadata: { category: booking?.category, ...metadata },
  createdAt: new Date()
});

const ensureWalletTransactionArray = (user) => {
  if (!Array.isArray(user.walletTransactions)) {
    user.walletTransactions = [];
  }
};

const getPackageTravellerCounts = (payload = {}) => {
  const passengers = normalizePassengers(payload.passengers).filter((passenger) => (
    passenger.firstName || passenger.lastName || passenger.age !== undefined || passenger.gender
  ));

  if (passengers.length > 0) {
    const counts = passengers.reduce((summary, passenger) => {
      if (Number(passenger.age) > 0 && Number(passenger.age) < 12) {
        summary.children += 1;
      } else {
        summary.adults += 1;
      }
      return summary;
    }, { adults: 0, children: 0 });

    if ((counts.adults + counts.children) > 0) {
      return counts;
    }
  }

  const adults = Math.max(Number(payload.adults) || 0, 0);
  const children = Math.max(Number(payload.children) || 0, 0);
  return { adults, children };
};

const buildPackageEmbeddedBooking = ({ booking, payload = {}, userName = "" }) => {
  const travelDate = resolveTravelDate(
    booking?.travelDate,
    payload.travelDate,
    payload.date,
    payload.package?.travelDate
  ) || new Date();
  const counts = getPackageTravellerCounts(payload);

  return {
    userId: booking.userId,
    userName: String(userName || payload.contactDetails?.name || "").trim() || "Customer",
    bookingId: String(booking._id),
    travelDate,
    adults: counts.adults,
    children: counts.children,
    totalAmount: normalizeAmount(booking.totalFare),
    paymentStatus: "Completed",
    status: "Confirmed",
    bookedAt: booking.createdAt || new Date()
  };
};

const reserveInventoryForBooking = async ({
  normalizedCategory,
  payload,
  flightId,
  trainId,
  hotelId,
  busId,
  packageId,
  inventoryValidation
}) => {
  const reservation = {};

  if (normalizedCategory === "flight" && mongoose.Types.ObjectId.isValid(flightId)) {
    const passengerCount = getRequestedPassengerCount(payload, normalizedCategory);
    const selectedSeatIds = Array.isArray(payload.selectedSeats)
      ? [...new Set(payload.selectedSeats.map((seat) => String(seat?.id || seat || "").trim().toUpperCase()).filter(Boolean))]
      : [];
    const flightQuery = {
      _id: flightId,
      availableSeats: { $gte: passengerCount }
    };

    if (selectedSeatIds.length > 0) {
      flightQuery.occupiedSeats = { $nin: selectedSeatIds };
    }

    const flightUpdate = {
      $inc: { availableSeats: -passengerCount }
    };

    if (selectedSeatIds.length > 0) {
      flightUpdate.$addToSet = {
        occupiedSeats: { $each: selectedSeatIds }
      };
    }

    const reservedFlight = await Flight.findOneAndUpdate(flightQuery, flightUpdate, { new: true });
    if (!reservedFlight) {
      return {
        error: selectedSeatIds.length > 0
          ? "One or more selected flight seats are no longer available. Please reselect your seats."
          : "Not enough seats are available on the selected flight."
      };
    }

    reservation.flight = {
      id: flightId,
      seatCount: passengerCount,
      selectedSeatIds
    };
  }

  if (normalizedCategory === "train" && mongoose.Types.ObjectId.isValid(trainId)) {
    const passengerCount = getRequestedPassengerCount(payload, normalizedCategory);
    const selectedClass = inventoryValidation?.pricingContext?.matchedClass?.type
      || payload.train?.selectedClass
      || payload.selectedClass;

    const updatedTrain = await Train.updateOne(
      {
        _id: trainId,
        availableClasses: {
          $elemMatch: {
            type: selectedClass,
            availableSeats: { $gte: passengerCount }
          }
        }
      },
      {
        $inc: {
          "availableClasses.$[matchedClass].availableSeats": -passengerCount
        }
      },
      {
        arrayFilters: [{ "matchedClass.type": selectedClass }]
      }
    );

    if (!updatedTrain.modifiedCount) {
      return { error: "Not enough seats are available in the selected train class." };
    }

    reservation.train = {
      id: trainId,
      seatCount: passengerCount,
      selectedClass
    };
  }

  if (normalizedCategory === "bus" && mongoose.Types.ObjectId.isValid(busId)) {
    const busSeatCount = Array.isArray(payload.selectedSeats) && payload.selectedSeats.length > 0
      ? payload.selectedSeats.length
      : getRequestedPassengerCount(payload, normalizedCategory);
    const selectedSeatIds = Array.isArray(payload.selectedSeats)
      ? [...new Set(payload.selectedSeats.map((seat) => String(seat?.id || seat || "").trim().toUpperCase()).filter(Boolean))]
      : [];

    const busQuery = {
      _id: busId,
      status: "Active",
      availableSeats: { $gte: busSeatCount }
    };

    if (selectedSeatIds.length > 0) {
      busQuery.occupiedSeats = { $nin: selectedSeatIds };
    }

    const busUpdate = { $inc: { availableSeats: -busSeatCount } };

    if (selectedSeatIds.length > 0) {
      busUpdate.$addToSet = {
        occupiedSeats: { $each: selectedSeatIds }
      };
    }

    const reservedBus = await Bus.findOneAndUpdate(
      busQuery,
      busUpdate,
      { new: true }
    );

    if (!reservedBus) {
      return {
        error: selectedSeatIds.length > 0
          ? "One or more selected bus seats are no longer available. Please reselect your seats."
          : "Not enough seats are available on the selected bus."
      };
    }

    reservation.bus = {
      id: busId,
      seatCount: busSeatCount,
      selectedSeatIds
    };
  }

  if (normalizedCategory === "package" && mongoose.Types.ObjectId.isValid(packageId)) {
    const requestedSeats = getRequestedPassengerCount(payload, normalizedCategory);
    // Atomic aggregation pipeline update: decrement seats AND conditionally set status to
    // "Inactive" in a single operation, eliminating the separate save() race condition.
    const reservedPackage = await Package.findOneAndUpdate(
      {
        _id: packageId,
        status: "Active",
        seatsAvailable: { $gte: requestedSeats }
      },
      [
        {
          $set: {
            seatsAvailable: { $subtract: ["$seatsAvailable", requestedSeats] },
            status: {
              $cond: {
                if: { $lte: [{ $subtract: ["$seatsAvailable", requestedSeats] }, 0] },
                then: "Inactive",
                else: "$status"
              }
            }
          }
        }
      ],
      { new: true }
    );

    if (!reservedPackage) {
      return { error: "Not enough seats are available for this package." };
    }

    const forcedInactive = reservedPackage.status === "Inactive";

    reservation.package = {
      id: packageId,
      seatCount: requestedSeats,
      forcedInactive
    };
  }

  if (normalizedCategory === "hotel" && mongoose.Types.ObjectId.isValid(hotelId)) {
    const requestedRooms = Math.max(Number(payload.roomCount || payload.hotel?.roomCount || 1) || 1, 1);
    const checkIn = resolveTravelDate(payload.checkIn || payload.hotel?.checkIn);
    const checkOut = resolveTravelDate(payload.checkOut || payload.hotel?.checkOut);

    if (!checkIn || !checkOut || checkOut <= checkIn) {
      return { error: "Valid check-in and check-out dates are required for hotel booking." };
    }

    const reservationId = generateComponentIdentifier();

    // Atomic operation: use $expr aggregation to count overlapping active reservations
    // and only push the new reservation if enough rooms remain. This eliminates the
    // read-then-write race condition window for hotel bookings.
    const updatedHotel = await Hotel.findOneAndUpdate(
      {
        _id: hotelId,
        isActive: { $ne: false },
        bookingStatus: { $ne: "Full" },
        $expr: {
          $gte: [
            "$availableRooms",
            {
              $add: [
                requestedRooms,
                {
                  $sum: {
                    $map: {
                      input: {
                        $filter: {
                          input: { $ifNull: ["$reservations", []] },
                          cond: {
                            $and: [
                              { $eq: ["$$this.status", "Active"] },
                              { $lt: ["$$this.checkIn", checkOut] },
                              { $gt: ["$$this.checkOut", checkIn] }
                            ]
                          }
                        }
                      },
                      as: "r",
                      in: "$$r.roomCount"
                    }
                  }
                }
              ]
            }
          ]
        }
      },
      {
        $push: {
          reservations: {
            bookingId: reservationId,
            checkIn,
            checkOut,
            roomCount: requestedRooms,
            status: "Active"
          }
        }
      },
      { new: true }
    );

    if (!updatedHotel) {
      return { error: "Not enough rooms are available for the selected dates." };
    }

    reservation.hotel = {
      id: hotelId,
      roomCount: requestedRooms,
      reservationId
    };
  }

  return { reservation };
};

const restoreReservedInventory = async (reservation = {}) => {
  if (reservation.flight?.seatCount > 0 && mongoose.Types.ObjectId.isValid(reservation.flight.id)) {
    const flightUpdate = {
      $inc: { availableSeats: reservation.flight.seatCount }
    };

    if (Array.isArray(reservation.flight.selectedSeatIds) && reservation.flight.selectedSeatIds.length > 0) {
      flightUpdate.$pull = {
        occupiedSeats: { $in: reservation.flight.selectedSeatIds }
      };
    }

    await Flight.findByIdAndUpdate(reservation.flight.id, flightUpdate);
  }

  if (reservation.train?.seatCount > 0 && reservation.train.selectedClass && mongoose.Types.ObjectId.isValid(reservation.train.id)) {
    await Train.updateOne(
      { _id: reservation.train.id },
      {
        $inc: {
          "availableClasses.$[matchedClass].availableSeats": reservation.train.seatCount
        }
      },
      {
        arrayFilters: [{ "matchedClass.type": reservation.train.selectedClass }]
      }
    );
  }

  if (reservation.bus?.seatCount > 0 && mongoose.Types.ObjectId.isValid(reservation.bus.id)) {
    const busUpdate = {
      $inc: { availableSeats: reservation.bus.seatCount }
    };

    if (Array.isArray(reservation.bus.selectedSeatIds) && reservation.bus.selectedSeatIds.length > 0) {
      busUpdate.$pull = {
        occupiedSeats: { $in: reservation.bus.selectedSeatIds }
      };
    }

    await Bus.findByIdAndUpdate(reservation.bus.id, busUpdate);
  }

  if (reservation.package?.seatCount > 0 && mongoose.Types.ObjectId.isValid(reservation.package.id)) {
    const packageUpdate = {
      $inc: { seatsAvailable: reservation.package.seatCount }
    };

    if (reservation.package.forcedInactive) {
      packageUpdate.$set = { status: "Active" };
    }

    await Package.findByIdAndUpdate(reservation.package.id, packageUpdate);
  }

  // Restore hotel reservation by marking the tracked reservation entry as Cancelled.
  // This preserves the audit trail while releasing the room for future bookings.
  if (reservation.hotel?.reservationId && mongoose.Types.ObjectId.isValid(reservation.hotel.id)) {
    await Hotel.findOneAndUpdate(
      {
        _id: reservation.hotel.id,
        "reservations.bookingId": reservation.hotel.reservationId,
        "reservations.status": "Active"
      },
      {
        $set: { "reservations.$.status": "Cancelled" }
      }
    );
  }
};

const buildHotelRoomBreakdown = ({ payload = {}, normalizedTotalFare, passengers = [] }) => {
  const rawRooms = Array.isArray(payload.rooms) ? payload.rooms : (Array.isArray(payload.hotel?.rooms) ? payload.hotel.rooms : []);
  let rooms = rawRooms.map((room, index) => ({
    roomId: String(room.roomId || room.id || `ROOM-${index + 1}`).trim(),
    roomType: String(room.roomType || room.type || "Standard").trim(),
    guests: Number(room.guests || room.maxOccupancy || 2),
    nights: Number(room.nights || 1),
    roomFare: normalizeAmount(room.roomFare || room.pricePerNight || room.fare || 0),
    status: ACTIVE_COMPONENT_STATUS,
    refundAmount: 0
  }));

  if (rooms.length === 0) {
    const selectedRoom = payload.selectedRoom || payload.hotel?.selectedRoom || {};
    const totalGuests = Number(payload.guests || payload.hotel?.guests || passengers.length || 2);
    const requestedRoomCount = Number(payload.roomCount || payload.hotel?.roomCount || 0);
    const inferredRoomCount = requestedRoomCount > 0 ? requestedRoomCount : Math.max(1, Math.ceil(totalGuests / 2));
    const shares = allocateFareShares(normalizedTotalFare, inferredRoomCount);
    rooms = Array.from({ length: inferredRoomCount }, (_, index) => ({
      roomId: `ROOM-${index + 1}`,
      roomType: String(selectedRoom.type || payload.roomType || payload.hotel?.roomType || "Standard").trim(),
      guests: Math.max(1, Math.ceil(totalGuests / inferredRoomCount)),
      nights: getHotelNights(payload.checkIn || payload.hotel?.checkIn, payload.checkOut || payload.hotel?.checkOut),
      roomFare: shares[index] || 0,
      status: ACTIVE_COMPONENT_STATUS,
      refundAmount: 0
    }));
  }

  const fareTotal = rooms.reduce((sum, room) => sum + normalizeAmount(room.roomFare), 0);
  if (fareTotal !== normalizeAmount(normalizedTotalFare)) {
    const shares = allocateFareShares(normalizedTotalFare, rooms.length);
    rooms = rooms.map((room, index) => ({ ...room, roomFare: shares[index] || 0 }));
  }
  return rooms;
};

const enrichBookingForCancellationBreakdown = ({ bookingData, normalizedCategory, normalizedTotalFare, payload }) => {
  if (isPassengerPartialCategory(normalizedCategory) && Array.isArray(bookingData.passengers) && bookingData.passengers.length > 0) {
    const shares = allocateFareShares(normalizedTotalFare, bookingData.passengers.length);
    bookingData.passengers = bookingData.passengers.map((passenger, index) => ({
      ...passenger,
      passengerId: String(passenger.passengerId || "").trim() || generateComponentIdentifier(),
      status: ACTIVE_COMPONENT_STATUS,
      fareShare: shares[index] || 0,
      refundAmount: 0
    }));
  }

  if (isHotelCategory(normalizedCategory)) {
    const rooms = buildHotelRoomBreakdown({ payload, normalizedTotalFare, passengers: bookingData.passengers || [] });
    bookingData.hotel = { ...(bookingData.hotel || {}), rooms };
  }
};

const ensurePassengerBreakdown = (booking) => {
  if (!Array.isArray(booking.passengers) || booking.passengers.length === 0) return;
  const hasValidShares = booking.passengers.every((passenger) => normalizeAmount(passenger.fareShare) > 0);
  const shares = hasValidShares ? booking.passengers.map((passenger) => normalizeAmount(passenger.fareShare)) : allocateFareShares(booking.totalFare, booking.passengers.length);

  booking.passengers = booking.passengers.map((passenger, index) => ({
    ...(passenger.toObject?.() || passenger),
    passengerId: String(passenger.passengerId || "").trim() || generateComponentIdentifier(),
    status: toComponentStatus(passenger.status),
    fareShare: shares[index] || 0,
    refundAmount: normalizeAmount(passenger.refundAmount)
  }));
  booking.markModified("passengers");
};

const ensureHotelRoomBreakdown = (booking) => {
  if (!isHotelCategory(booking.category)) return;
  let rooms = Array.isArray(booking.hotel?.rooms) ? booking.hotel.rooms : [];
  if (rooms.length === 0) {
    rooms = buildHotelRoomBreakdown({
      payload: { hotel: booking.hotel || {}, roomType: booking.hotel?.roomType, guests: booking.hotel?.guests, checkIn: booking.hotel?.checkIn, checkOut: booking.hotel?.checkOut },
      normalizedTotalFare: booking.totalFare,
      passengers: booking.passengers || []
    });
  } else {
    const hasValidFare = rooms.every((room) => normalizeAmount(room.roomFare) > 0);
    const shares = hasValidFare ? rooms.map((room) => normalizeAmount(room.roomFare)) : allocateFareShares(booking.totalFare, rooms.length);
    rooms = rooms.map((room, index) => ({
      ...(room.toObject?.() || room),
      roomId: String(room.roomId || room.id || `ROOM-${index + 1}`).trim(),
      status: toComponentStatus(room.status),
      roomFare: shares[index] || 0,
      refundAmount: normalizeAmount(room.refundAmount)
    }));
  }
  booking.hotel = { ...(booking.hotel?.toObject?.() || booking.hotel || {}), rooms };
  booking.markModified("hotel");
};

const getRemainingCancelableBaseAmount = (booking) => {
  if (isPassengerPartialCategory(booking.category) && Array.isArray(booking.passengers) && booking.passengers.length > 0) {
    const activePassengerBase = booking.passengers.reduce((sum, passenger) => (isComponentActive(passenger.status) ? sum + normalizeAmount(passenger.fareShare) : sum), 0);
    if (activePassengerBase > 0) return activePassengerBase;
  }
  if (isHotelCategory(booking.category) && Array.isArray(booking.hotel?.rooms) && booking.hotel.rooms.length > 0) {
    const activeRoomBase = booking.hotel.rooms.reduce((sum, room) => (isComponentActive(room.status) ? sum + normalizeAmount(room.roomFare) : sum), 0);
    if (activeRoomBase > 0) return activeRoomBase;
  }
  const alreadyCancelledBase = Array.isArray(booking.partialCancellations)
    ? booking.partialCancellations.reduce((sum, entry) => sum + normalizeAmount(entry.cancelledBaseAmount), 0)
    : 0;
  return Math.max(0, normalizeAmount(booking.totalFare) - alreadyCancelledBase);
};

const applyWalletRefund = async ({ user, booking, refundAmount, source, description, metadata }) => {
  // Guard: refund amount must be non-negative (prevents accidental debits).
  const normalizedRefund = Math.max(0, normalizeAmount(refundAmount));
  if (normalizedRefund <= 0) return user;

  const walletTransaction = buildWalletTransaction({
    type: "credit",
    amount: normalizedRefund,
    source,
    booking,
    balanceAfter: normalizeAmount(user.walletBalance) + normalizedRefund,
    description,
    metadata
  });

  // Atomic credit: use findOneAndUpdate with $inc to prevent race conditions
  // where concurrent refunds could produce incorrect balances.
  const updatedUser = await User.findOneAndUpdate(
    { _id: user._id },
    {
      $inc: { walletBalance: normalizedRefund },
      $push: { walletTransactions: { $each: [walletTransaction], $position: 0 } }
    },
    { new: true }
  );

  return updatedUser || user;
};

const generateBookingPnr = async () => {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const candidate = Math.floor(1000000000 + Math.random() * 9000000000).toString();
    const exists = await Booking.exists({ pnr: candidate });
    if (!exists) return candidate;
  }
  return `${Date.now()}`.slice(-10);
};

const validateRequestObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

const acquireCancellationLock = async ({ bookingId, userId, type }) => {
  const now = new Date();
  const lockOwner = generateComponentIdentifier();
  const lockExpiresAt = new Date(now.getTime() + CANCELLATION_LOCK_TTL_MS);

  const booking = await Booking.findOneAndUpdate(
    {
      _id: bookingId,
      userId,
      $or: [
        { cancellationLock: { $exists: false } },
        { "cancellationLock.expiresAt": { $lte: now } }
      ]
    },
    {
      $set: {
        cancellationLock: {
          owner: lockOwner,
          type,
          startedAt: now,
          expiresAt: lockExpiresAt
        }
      }
    },
    { new: true }
  );

  return booking ? { booking, lockOwner } : { booking: null, lockOwner: null };
};

const releaseCancellationLock = async ({ bookingId, lockOwner }) => {
  if (!bookingId || !lockOwner) return;
  await Booking.updateOne(
    { _id: bookingId, "cancellationLock.owner": lockOwner },
    { $unset: { cancellationLock: 1 } }
  );
};

const getOfferDiscountAmount = (offer = {}, subtotal = 0) => {
  const safeSubtotal = normalizeAmount(subtotal);
  const offerType = String(offer.discountType || "").trim().toLowerCase();
  const discountValue = normalizeAmount(offer.discountValue);

  let discount = 0;
  if (offerType === "flat") {
    discount = discountValue;
  } else {
    const percentageDiscount = Math.round((safeSubtotal * discountValue) / 100);
    const maxDiscount = normalizeAmount(offer.maxDiscount);
    discount = maxDiscount > 0 ? Math.min(percentageDiscount, maxDiscount) : percentageDiscount;
  }

  return Math.min(discount, safeSubtotal);
};

const validateCouponForBooking = async ({ normalizedCategory, subtotalFare, couponCode, couponDiscount }) => {
  const normalizedSubtotalFare = Math.max(normalizeAmount(subtotalFare), 0);
  const normalizedCouponCode = String(couponCode || "").trim().toUpperCase();
  const requestedCouponDiscount = normalizeAmount(couponDiscount);

  if (!normalizedCouponCode) {
    if (requestedCouponDiscount > 0) {
      return { error: "Coupon discount requires a valid coupon code." };
    }

    return {
      normalizedCouponCode: "",
      normalizedCouponDiscount: 0,
      normalizedSubtotalFare
    };
  }

  if (normalizedSubtotalFare <= 0) {
    return { error: "A valid subtotalFare is required when applying a coupon." };
  }

  const offerCategory = normalizeOfferCategory(normalizedCategory);
  const offer = await Offer.findOne({
    promoCode: normalizedCouponCode,
    isActive: true,
    validTill: { $gte: new Date() },
    category: { $in: [offerCategory, "all"] }
  }).lean();

  if (!offer) {
    return { error: "The selected coupon is invalid, expired, or not applicable to this booking." };
  }

  const minimumBookingAmount = normalizeAmount(offer.minBookingAmount);
  if (normalizedSubtotalFare < minimumBookingAmount) {
    return { error: `This coupon requires a minimum booking amount of ${formatCurrency(minimumBookingAmount)}.` };
  }

  const expectedDiscount = getOfferDiscountAmount(offer, normalizedSubtotalFare);
  if (expectedDiscount <= 0) {
    return { error: "This coupon is not applicable to the current fare." };
  }

  if (requestedCouponDiscount > 0 && requestedCouponDiscount !== expectedDiscount) {
    return { error: "Submitted coupon discount does not match the current offer rules." };
  }

  return {
    normalizedCouponCode,
    normalizedCouponDiscount: expectedDiscount,
    normalizedSubtotalFare
  };
};

const validateBookingPricing = ({ normalizedCategory, payload = {}, inventoryValidation = {} }) => {
  const passengerCount = Math.max(getRequestedPassengerCount(payload, normalizedCategory), 1);
  const submittedSubtotalFare = normalizeAmount(payload.subtotalFare);
  let normalizedSubtotalFare = 0;

  if (normalizedCategory === "flight") {
    const flight = inventoryValidation.pricingContext?.flight;
    const matchedFare = inventoryValidation.pricingContext?.matchedFare;
    const selectedFarePrice = normalizeAmount(matchedFare?.price);
    const perPassengerBaseFare = normalizeAmount(flight?.basePrice) + selectedFarePrice;
    const baseFare = perPassengerBaseFare * passengerCount;
    const taxes = Math.round(baseFare * 0.12);
    const convenienceFee = 350;
    const seatsTotal = getFlightSeatUpgradeTotal(payload.selectedSeats);
    const mealsTotal = getFlightMealsTotal(payload.addOns);
    const baggageTotal = getFlightBaggageTotal(payload.addOns);
    normalizedSubtotalFare = baseFare + taxes + convenienceFee + seatsTotal + mealsTotal + baggageTotal;
  } else if (normalizedCategory === "train") {
    const matchedClass = inventoryValidation.pricingContext?.matchedClass;
    const classFare = normalizeAmount(matchedClass?.fare);
    const baseFare = classFare * passengerCount;
    const taxes = Math.round(baseFare * 0.05);
    const serviceFee = 40;
    const mealTotal = getTrainMealsTotal({ addOns: payload.addOns || {}, passengerCount });
    const insuranceTotal = payload.addOns?.insurance ? (35 * passengerCount) : 0;
    normalizedSubtotalFare = baseFare + taxes + serviceFee + mealTotal + insuranceTotal;
  } else if (normalizedCategory === "hotel") {
    const matchedRoom = inventoryValidation.pricingContext?.matchedRoom;
    const nights = getHotelNights(payload.checkIn || payload.hotel?.checkIn, payload.checkOut || payload.hotel?.checkOut);
    const requestedRooms = Math.max(Number(payload.roomCount || payload.hotel?.roomCount || 1) || 1, 1);
    const baseFare = normalizeAmount(matchedRoom?.pricePerNight) * nights * requestedRooms;
    const mealAddOnTotal = getHotelMealAddOnTotal({
      experienceAddOns: payload.experienceAddOns || {},
      guestCount: passengerCount
    });
    const taxes = Math.round((baseFare + mealAddOnTotal) * 0.12);
    const convenienceFee = 150;
    normalizedSubtotalFare = baseFare + mealAddOnTotal + taxes + convenienceFee;
  } else if (normalizedCategory === "bus") {
    const bus = inventoryValidation.pricingContext?.bus;
    const seatCount = Array.isArray(payload.selectedSeats) && payload.selectedSeats.length > 0 ? payload.selectedSeats.length : passengerCount;
    const perSeatPrice = normalizeAmount(bus?.price);
    const baseFare = seatCount * perSeatPrice;
    const taxes = Math.round(baseFare * 0.05);
    const convenienceFee = seatCount > 0 ? 49 : 0;
    const operatorFee = seatCount > 0 ? 20 : 0;
    const mealsTotal = getBusMealsTotal(payload.addOns || {});
    normalizedSubtotalFare = baseFare + taxes + convenienceFee + operatorFee + mealsTotal;
  } else if (normalizedCategory === "cabs") {
    const cabType = inventoryValidation.pricingContext?.cabType;
    const safeDistance = Math.max(Number(payload.distance) || 0, 0);
    const rideFare = normalizeAmount(cabType?.baseFare) + Math.round(safeDistance * Number(cabType?.pricePerKm || 0));
    const serviceFee = rideFare > 0 ? Math.max(29, Math.round(rideFare * 0.04)) : 0;
    const gst = Math.round((rideFare + serviceFee) * 0.05);
    normalizedSubtotalFare = rideFare + serviceFee + gst;
  } else if (normalizedCategory === "package") {
    const pkg = inventoryValidation.pricingContext?.pkg;
    const travelerCount = Math.max(Array.isArray(payload.passengers) ? payload.passengers.length : passengerCount, 1);
    const basePrice = normalizeAmount(pkg?.pricePerPerson) * travelerCount;
    const packageDiscount = Math.round((basePrice * Math.max(Number(pkg?.discount) || 0, 0)) / 100);
    const taxes = Math.round((basePrice - packageDiscount) * 0.18);
    normalizedSubtotalFare = basePrice - packageDiscount + taxes;
  }

  normalizedSubtotalFare = normalizeAmount(normalizedSubtotalFare);

  if (normalizedSubtotalFare <= 0) {
    return { error: "Unable to validate booking fare for the selected inventory." };
  }

  if (submittedSubtotalFare !== normalizedSubtotalFare) {
    return { error: "Submitted subtotal does not match the validated booking amount." };
  }

  return { normalizedSubtotalFare };
};

exports.createBooking = async (req, res) => {
  let savedBooking = null;
  let inventoryReservation = null;
  let packageEmbeddedBookingId = null;
  try {
    const { category, trainId, flightId, hotelId, busId, packageId, cabId, totalFare, payment = {}, cabType, seats, baseFare, perKmRate, pickupLocation, dropLocation, pickupDateTime, distance, duration, specialRequirements, passengerName } = req.body;
    const normalizedCategory = normalizeCategory(category);
    const normalizedTotalFare = normalizeAmount(totalFare);

    if (!normalizedCategory || normalizedTotalFare <= 0) {
      return res.status(400).json({ success: false, message: "Category and a valid totalFare are required" });
    }

    const validateId = (id) => !(id && !mongoose.Types.ObjectId.isValid(id));
    if (!validateId(trainId) || !validateId(flightId) || !validateId(hotelId) || !validateId(busId) || !validateId(packageId) || !validateId(cabId)) {
      return res.status(400).json({ success: false, message: "Invalid ID format provided for one of the related entities" });
    }

    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    const inventoryValidation = await validateBookingInventory({
      normalizedCategory,
      flightId,
      trainId,
      hotelId,
      busId,
      packageId,
      cabId,
      payload: req.body
    });

    if (inventoryValidation.error) {
      return res.status(400).json({ success: false, message: inventoryValidation.error });
    }

    const pricingValidation = validateBookingPricing({
      normalizedCategory,
      payload: req.body,
      inventoryValidation
    });

    if (pricingValidation.error) {
      return res.status(400).json({ success: false, message: pricingValidation.error });
    }

    const couponValidation = await validateCouponForBooking({
      normalizedCategory,
      subtotalFare: pricingValidation.normalizedSubtotalFare,
      couponCode: req.body.couponCode,
      couponDiscount: req.body.couponDiscount
    });

    if (couponValidation.error) {
      return res.status(400).json({ success: false, message: couponValidation.error });
    }

    const normalizedCouponDiscount = Math.min(couponValidation.normalizedCouponDiscount, normalizedTotalFare);
    const normalizedSubtotalFare = Math.max(couponValidation.normalizedSubtotalFare, normalizedTotalFare);
    const expectedTotalFare = Math.max(normalizedSubtotalFare - normalizedCouponDiscount, 0);
    if (expectedTotalFare !== normalizedTotalFare) {
      return res.status(400).json({ success: false, message: "Submitted fare does not match the validated subtotal and coupon discount." });
    }

    const requestedWalletAmount = Math.min(normalizeAmount(payment.walletAmountUsed), normalizedTotalFare);
    if (requestedWalletAmount > normalizeAmount(user.walletBalance)) {
      return res.status(400).json({ success: false, message: "Insufficient wallet balance for this booking." });
    }

    const externalAmountPaid = Math.max(normalizedTotalFare - requestedWalletAmount, 0);
    // Validate payment method BEFORE reserving inventory to avoid stuck reservations.
    if (payment.method === "wallet" && externalAmountPaid > 0) {
      return res.status(400).json({ success: false, message: "Wallet balance is not enough for full wallet payment. Choose another payment method for the remaining amount." });
    }

    // Validate cab pickup/drop locations before reserving inventory.
    if (normalizedCategory === "cabs") {
      const pickup = String(pickupLocation || req.body.cab?.pickupLocation || "").trim();
      const drop = String(dropLocation || req.body.cab?.dropLocation || "").trim();
      if (!pickup || !drop) {
        return res.status(400).json({ success: false, message: "Pickup and drop locations are required for cab bookings." });
      }
    }

    // Validate that passenger-based bookings have at least one passenger.
    if (["flight", "train", "bus"].includes(normalizedCategory)) {
      const passengers = Array.isArray(req.body.passengers) ? req.body.passengers.filter(Boolean) : [];
      if (passengers.length === 0) {
        return res.status(400).json({ success: false, message: "At least one passenger is required for this booking." });
      }
    }

    const safeRootFields = pickAllowedFields(req.body, ["flight", "train", "hotel", "bus", "package", "from", "to", "contactDetails", "selectedSeats", "selectedBerths", "preferences", "experienceAddOns", "addOns"]);
    const normalizedCouponCode = couponValidation.normalizedCouponCode;
    const inferredFrom = req.body.from
      || req.body.flight?.from
      || req.body.train?.from
      || req.body.bus?.from
      || req.body.cab?.pickupLocation
      || req.body.pickupLocation
      || req.body.hotel?.location?.city
      || req.body.package?.destination?.state
      || "";
    const inferredTo = req.body.to
      || req.body.flight?.to
      || req.body.train?.to
      || req.body.bus?.to
      || req.body.cab?.dropLocation
      || req.body.dropLocation
      || req.body.hotel?.location?.address
      || req.body.hotel?.name
      || req.body.package?.destination?.country
      || "";

    const bookingData = {
      ...safeRootFields,
      userId: req.user._id,
      category: normalizedCategory,
      from: inferredFrom,
      to: inferredTo,
      couponCode: normalizedCouponCode,
      couponDiscount: normalizedCouponDiscount,
      subtotalFare: normalizedSubtotalFare,
      totalFare: normalizedTotalFare,
      trainId: mongoose.Types.ObjectId.isValid(trainId) ? new mongoose.Types.ObjectId(trainId) : undefined,
      flightId: mongoose.Types.ObjectId.isValid(flightId) ? new mongoose.Types.ObjectId(flightId) : undefined,
      hotelId: mongoose.Types.ObjectId.isValid(hotelId) ? new mongoose.Types.ObjectId(hotelId) : undefined,
      busId: mongoose.Types.ObjectId.isValid(busId) ? new mongoose.Types.ObjectId(busId) : undefined,
      packageId: mongoose.Types.ObjectId.isValid(packageId) ? new mongoose.Types.ObjectId(packageId) : undefined,
      cabId: mongoose.Types.ObjectId.isValid(cabId) ? new mongoose.Types.ObjectId(cabId) : undefined,
      flight: normalizedCategory === "flight" ? inventoryValidation.flightSnapshot : req.body.flight,
      train: normalizedCategory === "train" ? inventoryValidation.trainSnapshot : req.body.train,
      hotel: normalizedCategory === "hotel"
        ? { ...(inventoryValidation.hotelSnapshot || {}), ...(req.body.hotel || {}), ...(inventoryValidation.hotelSnapshot || {}) }
        : req.body.hotel,
      bus: normalizedCategory === "bus"
        ? { ...(req.body.bus || {}), ...(inventoryValidation.busSnapshot || {}) }
        : req.body.bus,
      package: normalizedCategory === "package"
        ? { ...(req.body.package || {}), ...(inventoryValidation.packageSnapshot || {}) }
        : req.body.package,
      cab: normalizedCategory === "cabs"
        ? {
            ...(inventoryValidation.cabSnapshot || {}),
            cabType: inventoryValidation.cabSnapshot?.cabType || cabType || "Standard Cab",
            seats: inventoryValidation.cabSnapshot?.seats || seats || 4,
            baseFare: inventoryValidation.cabSnapshot?.baseFare || baseFare || 200,
            perKmRate: inventoryValidation.cabSnapshot?.perKmRate || perKmRate || 15,
            pickupLocation,
            dropLocation,
            pickupDateTime: pickupDateTime ? new Date(pickupDateTime) : undefined,
            distance,
            duration,
            specialRequirements: specialRequirements || ""
          }
        : req.body.cab,
      passengers: normalizedCategory === "cabs" ? normalizeCabPassengers({ passengers: req.body.passengers, passengerName, contactDetails: req.body.contactDetails }) : normalizePassengers(req.body.passengers),
      payment: {
        method: externalAmountPaid > 0 ? (payment.method || "upi") : "wallet",
        provider: payment.provider || "",
        walletAmountUsed: requestedWalletAmount,
        externalAmountPaid,
        externalPaymentMethod: externalAmountPaid > 0 ? (payment.externalPaymentMethod || payment.method || "upi") : ""
      },
      travelDate: resolveTravelDate(
        req.body.travelDate,
        req.body.date,
        req.body.departureDate,
        req.body.checkIn,
        req.body.checkOut,
        normalizedCategory === "flight" ? req.body.flight?.date : undefined,
        normalizedCategory === "hotel" ? req.body.hotel?.checkIn : undefined,
        normalizedCategory === "hotel" ? req.body.hotel?.checkOut : undefined,
        normalizedCategory === "cabs" ? req.body.cab?.pickupDateTime : undefined,
        normalizedCategory === "cabs" ? req.body.pickupDateTime : undefined,
        normalizedCategory === "train" ? req.body.train?.date : undefined,
        normalizedCategory === "bus" ? req.body.bus?.date : undefined,
        normalizedCategory === "package" ? new Date(Date.now() + (req.body.package?.duration?.days || 0) * 86400000) : undefined
      )
    };

    enrichBookingForCancellationBreakdown({ bookingData, normalizedCategory, normalizedTotalFare, payload: req.body });
    if (normalizedCategory === "train" && !String(bookingData.pnr || "").trim()) bookingData.pnr = await generateBookingPnr();
    if (!bookingData.travelDate) delete bookingData.travelDate;

    const reservationResult = await reserveInventoryForBooking({
      normalizedCategory,
      payload: req.body,
      flightId,
      trainId,
      hotelId,
      busId,
      packageId,
      inventoryValidation
    });

    if (reservationResult.error) {
      return res.status(400).json({ success: false, message: reservationResult.error });
    }

    inventoryReservation = reservationResult.reservation;

    // Inject the hotel reservationId into bookingData so it can be used for cancellation cleanup.
    if (normalizedCategory === "hotel" && inventoryReservation.hotel?.reservationId) {
      bookingData.hotel = {
        ...(bookingData.hotel || {}),
        reservationId: inventoryReservation.hotel.reservationId
      };
    }

    savedBooking = await new Booking(bookingData).save();

    if (normalizedCategory === "package" && mongoose.Types.ObjectId.isValid(packageId)) {
      const embeddedPackageBooking = buildPackageEmbeddedBooking({
        booking: savedBooking,
        payload: req.body,
        userName: req.body.contactDetails?.name || user.name
      });

      const updatedPackage = await Package.findByIdAndUpdate(
        packageId,
        {
          $push: {
            bookings: embeddedPackageBooking
          }
        }
      );

      if (!updatedPackage) {
        throw new Error("Unable to sync package booking details.");
      }

      packageEmbeddedBookingId = embeddedPackageBooking.bookingId;
    }

    let updatedUser = user;
    if (requestedWalletAmount > 0) {
      // Atomic wallet debit: use findOneAndUpdate with $inc to prevent race conditions
      // where concurrent bookings could both read the same balance and both succeed.
      const walletTransaction = buildWalletTransaction({
        type: "debit",
        amount: requestedWalletAmount,
        source: "booking_payment",
        booking: savedBooking,
        balanceAfter: normalizeAmount(user.walletBalance) - requestedWalletAmount,
        description: `Wallet used for ${savedBooking.category} booking`,
        metadata: { paymentMethod: savedBooking.payment?.method, walletUsed: requestedWalletAmount, externalPaid: externalAmountPaid }
      });

      const atomicUser = await User.findOneAndUpdate(
        {
          _id: req.user._id,
          walletBalance: { $gte: requestedWalletAmount }
        },
        {
          $inc: { walletBalance: -requestedWalletAmount },
          $push: { walletTransactions: { $each: [walletTransaction], $position: 0 } }
        },
        { new: true }
      );

      if (!atomicUser) {
        // Wallet balance changed between validation and debit — rollback booking
        throw new Error("Wallet balance changed during booking. Please try again.");
      }

      updatedUser = atomicUser;
    }

    let ticketEmail = { success: false, skipped: true, reason: "not-attempted" };
    try {
      ticketEmail = await sendBookingTicketEmail({ booking: savedBooking, user: updatedUser });
    } catch (emailError) {
      console.error("Ticket email send failed:", emailError);
      ticketEmail = { success: false, skipped: false, reason: "send-failed" };
    }

    return res.status(201).json({
      success: true,
      message: "Booking history saved successfully",
      booking: savedBooking,
      ticketEmail,
      wallet: { balance: updatedUser.walletBalance || 0, walletAmountUsed: requestedWalletAmount, externalAmountPaid }
    });
  } catch (err) {
    if (packageEmbeddedBookingId && mongoose.Types.ObjectId.isValid(req.body?.packageId)) {
      await Package.findByIdAndUpdate(req.body.packageId, {
        $pull: {
          bookings: { bookingId: packageEmbeddedBookingId }
        }
      }).catch((cleanupError) => {
        console.error("package booking cleanup failed:", cleanupError);
      });
    }

    if (savedBooking?._id) {
      await Booking.findByIdAndDelete(savedBooking._id).catch((cleanupError) => {
        console.error("booking cleanup failed:", cleanupError);
      });
    }

    if (inventoryReservation) {
      await restoreReservedInventory(inventoryReservation).catch((cleanupError) => {
        console.error("inventory restore failed:", cleanupError);
      });
    }

    console.error("createBooking failed:", err);
    if (err.name === "ValidationError") {
      const detailMessages = Object.values(err.errors || {}).map((item) => item.message);
      return res.status(400).json({
        success: false,
        message: detailMessages.length ? `Validation failed: ${detailMessages.join(", ")}` : "Validation failed"
      });
    }
    return res.status(500).json({ success: false, message: "Unable to complete booking. Please try again." });
  }
};

exports.getMyBookings = async (req, res) => {
  try {
    const bookings = await Booking.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .limit(200); // safety cap
    return res.status(200).json(bookings);
  } catch (err) {
    return res.status(500).json({ success: false, message: "Failed to fetch bookings" });
  }
};

const getLatestPartialCancellationEmailDetails = (booking = {}) => {
  const partialCancellations = Array.isArray(booking.partialCancellations) ? booking.partialCancellations : [];
  const latestEntry = partialCancellations[partialCancellations.length - 1] || {};

  return {
    partialType: latestEntry.type || "passenger",
    cancelledItemNames: Array.isArray(latestEntry.itemNames) ? latestEntry.itemNames : [],
    refundAmount: normalizeAmount(latestEntry.refundAmount ?? booking.refundAmount),
    refundPercentage: Number(latestEntry.refundPercentage) || 0
  };
};

const handleResendBookingEmail = async (req, res, mode = "ticket") => {
  try {
    if (!validateRequestObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: "Invalid booking ID" });
    }

    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ success: false, message: "Booking not found" });
    }

    if (String(booking.userId) !== String(req.user._id)) {
      return res.status(403).json({ success: false, message: "Unauthorized. You do not own this booking." });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const recipientEmail = booking.contactDetails?.email || user.email;
    const bookingStatus = normalizeBookingStatus(booking.status);
    const isFullyCancelled = bookingStatus === "cancelled" || bookingStatus === "fully cancelled";
    const isPartiallyCancelled = bookingStatus === "partially cancelled";

    let emailResponse;
    let successMessage = `Ticket sent successfully to ${recipientEmail}`;
    let unavailableMessage = "Unable to send the ticket email right now.";

    if (mode === "cancellation") {
      if (isFullyCancelled) {
        emailResponse = await sendBookingCancellationEmail({ booking, user });
        successMessage = `Cancellation email sent successfully to ${recipientEmail}`;
        unavailableMessage = "Unable to send the cancellation email right now.";
      } else if (isPartiallyCancelled) {
        emailResponse = await sendBookingPartialCancellationEmail({
          booking,
          user,
          details: getLatestPartialCancellationEmailDetails(booking)
        });
        successMessage = `Cancellation update sent successfully to ${recipientEmail}`;
        unavailableMessage = "Unable to send the partial cancellation email right now.";
      } else {
        return res.status(400).json({
          success: false,
          message: "Cancellation email is only available for cancelled or partially cancelled bookings."
        });
      }
    } else {
      emailResponse = await sendBookingTicketEmail({ booking, user });
    }

    if (emailResponse?.success) {
      return res.status(200).json({
        success: true,
        message: successMessage,
        recipientEmail,
        mode
      });
    }

    if (emailResponse?.reason === "no-recipient-email") {
      return res.status(400).json({
        success: false,
        message: "No email address is available for this booking."
      });
    }

    if (emailResponse?.reason === "missing-mail-config") {
      return res.status(503).json({
        success: false,
        message: "Email service is not configured right now. Please try again later."
      });
    }

    return res.status(500).json({
      success: false,
      message: unavailableMessage
    });
  } catch (err) {
    const failureMessage = mode === "cancellation"
      ? "Failed to send cancellation email"
      : "Failed to send ticket email";
    return res.status(500).json({ success: false, message: failureMessage, error: err.message });
  }
};

exports.resendBookingTicketEmail = async (req, res) => handleResendBookingEmail(req, res, "ticket");

exports.resendBookingCancellationEmail = async (req, res) => handleResendBookingEmail(req, res, "cancellation");

const passengerDisplayName = (passenger = {}, index = 0) => {
  const fullName = [passenger.firstName, passenger.lastName].filter(Boolean).join(" ").trim();
  return fullName || `Passenger ${index + 1}`;
};

const roomDisplayName = (room = {}, index = 0) =>
  `${String(room.roomType || `Room ${index + 1}`).trim()} (${String(room.roomId || `ROOM-${index + 1}`).trim()})`;

const buildSeatPlaceholder = (seat = {}) => ({
  ...(seat?.toObject?.() || (typeof seat === "object" && seat !== null ? seat : {})),
  id: "",
  price: normalizeAmount(seat?.price)
});

const clearSelectedSeatsAtIndexes = (selectedSeats = [], indexes = []) => {
  if (!Array.isArray(selectedSeats) || selectedSeats.length === 0) return selectedSeats;
  const indexSet = new Set(indexes);
  return selectedSeats.map((seat, index) => (indexSet.has(index) ? buildSeatPlaceholder(seat) : (seat?.toObject?.() || seat)));
};

const restoreBookingSnapshot = async (booking, snapshot = {}) => {
  booking.set(snapshot);
  booking.markModified("passengers");
  booking.markModified("hotel");
  booking.markModified("selectedSeats");
  booking.markModified("partialCancellations");
  booking.markModified("payment");
  await booking.save();
};

const markEntireBookingCancelled = (booking, now) => {
  if (isPassengerPartialCategory(booking.category) && Array.isArray(booking.passengers)) {
    booking.passengers = booking.passengers.map((passenger) => ({
      ...(passenger.toObject?.() || passenger),
      status: CANCELLED_COMPONENT_STATUS,
      cancellationDate: passenger.cancellationDate || now
    }));
    booking.markModified("passengers");
  }

  if (isHotelCategory(booking.category) && Array.isArray(booking.hotel?.rooms)) {
    booking.hotel = {
      ...(booking.hotel?.toObject?.() || booking.hotel || {}),
      rooms: booking.hotel.rooms.map((room) => ({
        ...(room.toObject?.() || room),
        status: CANCELLED_COMPONENT_STATUS,
        cancellationDate: room.cancellationDate || now
      }))
    };
    booking.markModified("hotel");
  }

  booking.status = "Fully Cancelled";
  booking.cancellationDate = now;
  booking.cancellationLock = undefined;
};

exports.cancelBookingPartially = async (req, res) => {
  let lockOwner = "";
  let booking = null;
  let bookingSnapshot = null;
  let inventoryReleaseReservation = null;
  let inventoryReleased = false;
  let bookingSaved = false;
  try {
    if (!validateRequestObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: "Invalid booking ID" });
    }

    const existingBooking = await Booking.findById(req.params.id).select("userId");
    if (!existingBooking) return res.status(404).json({ success: false, message: "Booking not found" });
    if (existingBooking.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: "Unauthorized. You do not own this booking." });
    }

    const lockResult = await acquireCancellationLock({
      bookingId: req.params.id,
      userId: req.user._id,
      type: "partial"
    });
    booking = lockResult.booking;
    lockOwner = lockResult.lockOwner;
    if (!booking) {
      return res.status(409).json({
        success: false,
        message: "A cancellation request for this booking is already in progress. Please wait a moment and try again."
      });
    }

    if (isFullyCancelledBooking(booking)) {
      return res.status(400).json({ success: false, message: "Booking is already cancelled" });
    }
    if (!isCancelableBookingStatus(booking)) {
      return res.status(400).json({ success: false, message: "Only confirmed bookings can be partially cancelled." });
    }

    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    ensurePassengerBreakdown(booking);
    ensureHotelRoomBreakdown(booking);

    const travelDate = resolveTravelDate(
      booking.travelDate,
      booking.pickupDateTime,
      booking.checkIn,
      booking.checkOut,
      booking.checkInDate,
      booking.checkOutDate,
      booking.cab?.pickupDateTime,
      booking.hotel?.checkIn,
      booking.hotel?.checkOut
    );
    const { refundPercentage, now } = getRefundPolicy(travelDate);
    bookingSnapshot = booking.toObject({ depopulate: true });

    const category = normalizeCategory(booking.category);
    let cancelledBaseAmount = 0;
    let cancelledItemCount = 0;
    let cancelledItemIds = [];
    let cancelledItemNames = [];
    let partialType = "";

    let remainingActiveItems = 0;

    if (isPassengerPartialCategory(category)) {
      const activePassengers = booking.passengers.map((passenger, index) => ({ passenger, index })).filter(({ passenger }) => isComponentActive(passenger.status));

      const requestedIndexes = Array.isArray(req.body.passengerIndexes)
        ? [...new Set(req.body.passengerIndexes.map((item) => Number(item)).filter((item) => Number.isInteger(item) && item >= 0))]
        : [];
      const requestedPassengerIds = Array.isArray(req.body.passengerIds)
        ? [...new Set(req.body.passengerIds.map((item) => String(item || "").trim()).filter(Boolean))]
        : [];
      const activeIndexSet = new Set(activePassengers.map(({ index }) => index));
      const activeOrderIndexes = [...new Set(
        requestedIndexes
          .map((position) => activePassengers[position]?.index)
          .filter((item) => Number.isInteger(item) && item >= 0)
      )];
      const resolvedIndexes = requestedPassengerIds.length > 0
        ? activePassengers.filter(({ passenger }) => requestedPassengerIds.includes(String(passenger.passengerId || "").trim())).map(({ index }) => index)
        : (requestedIndexes.every((index) => activeIndexSet.has(index)) ? requestedIndexes : activeOrderIndexes);
      if (resolvedIndexes.length === 0) return res.status(400).json({ success: false, message: "Select at least one passenger to cancel." });

      if (resolvedIndexes.some((index) => !activeIndexSet.has(index))) {
        return res.status(400).json({ success: false, message: "One or more selected passengers are invalid or already cancelled." });
      }
      partialType = "passenger";
      cancelledItemCount = resolvedIndexes.length;
      cancelledBaseAmount = resolvedIndexes.reduce((sum, index) => sum + normalizeAmount(booking.passengers[index].fareShare), 0);
      cancelledItemIds = resolvedIndexes.map((index) => String(booking.passengers[index].passengerId || "").trim() || `passenger-${index + 1}`);
      cancelledItemNames = resolvedIndexes.map((index) => passengerDisplayName(booking.passengers[index], index));
      inventoryReleaseReservation = buildInventoryReservationForBooking(booking, {
        activeOnly: false,
        passengerIndexes: resolvedIndexes
      });
      booking.passengers = booking.passengers.map((passenger, index) => (
        resolvedIndexes.includes(index)
          ? {
              ...(passenger.toObject?.() || passenger),
              status: CANCELLED_COMPONENT_STATUS,
              refundAmount: normalizeAmount(passenger.refundAmount) + Math.floor(normalizeAmount(passenger.fareShare) * (refundPercentage / 100)),
              cancellationDate: passenger.cancellationDate || now
            }
          : (passenger.toObject?.() || passenger)
      ));
      booking.markModified("passengers");
      booking.selectedSeats = clearSelectedSeatsAtIndexes(booking.selectedSeats, resolvedIndexes);
      booking.markModified("selectedSeats");
      remainingActiveItems = booking.passengers.filter((passenger) => isComponentActive(passenger.status)).length;
    } else if (isHotelCategory(category)) {
      const rooms = Array.isArray(booking.hotel?.rooms) ? booking.hotel.rooms : [];
      const activeRooms = rooms.map((room, index) => ({ room, index })).filter(({ room }) => isComponentActive(room.status));

      const requestedIndexes = Array.isArray(req.body.roomIndexes)
        ? [...new Set(req.body.roomIndexes.map((item) => Number(item)).filter((item) => Number.isInteger(item) && item >= 0))]
        : [];
      const requestedRoomIds = Array.isArray(req.body.roomIds)
        ? [...new Set(req.body.roomIds.map((item) => String(item).trim()).filter(Boolean))]
        : [];
      const activeIndexSet = new Set(activeRooms.map(({ index }) => index));
      const activeOrderIndexes = [...new Set(
        requestedIndexes
          .map((position) => activeRooms[position]?.index)
          .filter((item) => Number.isInteger(item) && item >= 0)
      )];
      const resolvedIndexes = requestedRoomIds.length > 0
        ? activeRooms.filter(({ room }) => requestedRoomIds.includes(String(room.roomId || "").trim())).map(({ index }) => index)
        : (requestedIndexes.every((index) => activeIndexSet.has(index)) ? requestedIndexes : activeOrderIndexes);
      if (resolvedIndexes.length === 0) return res.status(400).json({ success: false, message: "Select at least one room to cancel." });

      if (resolvedIndexes.some((index) => !activeIndexSet.has(index))) {
        return res.status(400).json({ success: false, message: "One or more selected rooms are invalid or already cancelled." });
      }
      partialType = "room";
      cancelledItemCount = resolvedIndexes.length;
      cancelledBaseAmount = resolvedIndexes.reduce((sum, index) => sum + normalizeAmount(rooms[index].roomFare), 0);
      cancelledItemIds = resolvedIndexes.map((index) => String(rooms[index].roomId || "").trim() || `ROOM-${index + 1}`);
      cancelledItemNames = resolvedIndexes.map((index) => roomDisplayName(rooms[index], index));
      booking.hotel = {
        ...(booking.hotel?.toObject?.() || booking.hotel || {}),
        rooms: rooms.map((room, index) => (
          resolvedIndexes.includes(index)
            ? {
                ...(room.toObject?.() || room),
                status: CANCELLED_COMPONENT_STATUS,
                refundAmount: normalizeAmount(room.refundAmount) + Math.floor(normalizeAmount(room.roomFare) * (refundPercentage / 100)),
                cancellationDate: room.cancellationDate || now
              }
            : (room.toObject?.() || room)
        ))
      };
      booking.markModified("hotel");
      remainingActiveItems = booking.hotel.rooms.filter((room) => isComponentActive(room.status)).length;
    } else {
      return res.status(400).json({
        success: false,
        message: "Partial cancellation is currently available for flight/train/bus passengers and hotel rooms only."
      });
    }

    const refundAmount = Math.max(0, Math.floor(normalizeAmount(cancelledBaseAmount) * (refundPercentage / 100)));
    booking.refundAmount = normalizeAmount(booking.refundAmount) + refundAmount;
    booking.partialCancellations = Array.isArray(booking.partialCancellations) ? booking.partialCancellations : [];
    booking.partialCancellations.push({
      type: partialType,
      itemIds: cancelledItemIds,
      itemNames: cancelledItemNames,
      cancelledBaseAmount: normalizeAmount(cancelledBaseAmount),
      refundAmount,
      refundPercentage,
      cancelledAt: now
    });
    const fullyCancelledByPartial = remainingActiveItems === 0;
    booking.status = fullyCancelledByPartial ? "Fully Cancelled" : "Partially Cancelled";
    if (fullyCancelledByPartial) {
      booking.cancellationDate = now;
    }
    
    // Clear the cancellation lock before saving to avoid validation errors
    booking.cancellationLock = undefined;

    if (inventoryReleaseReservation) {
      await releaseInventoryReservation(inventoryReleaseReservation);
      inventoryReleased = true;
    }
    
    try {
      await booking.save();
      bookingSaved = true;
    } catch (saveError) {
      console.error("Booking save failed during partial cancellation:", saveError);
      throw new Error(`Failed to save booking partial cancellation: ${saveError.message}`);
    }

    let updatedUser;
    try {
      updatedUser = await applyWalletRefund({
        user,
        booking,
        refundAmount,
        source: "partial_booking_refund",
        description: `Partial refund (${refundPercentage}%) for ${booking.category} booking #${String(booking._id).slice(-6).toUpperCase()}`,
        metadata: { refundPercentage, refundType: partialType, refundedItems: cancelledItemCount }
      });
    } catch (walletError) {
      console.error("Wallet refund failed during partial cancellation:", walletError);
      throw new Error(`Failed to process wallet refund: ${walletError.message}`);
    }

    let notification = {
      partialCancellationEmail: { success: false, skipped: true, reason: "not-attempted" },
      updatedTicketEmail: { success: false, skipped: true, reason: "not-attempted" }
    };
    try {
      notification.partialCancellationEmail = await sendBookingPartialCancellationEmail({
        booking,
        user: updatedUser,
        details: { partialType, cancelledItemNames, refundAmount, refundPercentage }
      });
    } catch (emailError) {
      console.error("partial cancellation email failed:", emailError);
      notification.partialCancellationEmail = { success: false, skipped: false, reason: "send-failed", error: emailError.message };
    }

    if (remainingActiveItems > 0 && booking.status !== "Cancelled" && booking.status !== "cancelled") {
      try {
        notification.updatedTicketEmail = await sendBookingTicketEmail({
          booking,
          user: updatedUser,
          options: { variant: "updated-after-partial-cancellation" }
        });
      } catch (emailError) {
        console.error("updated ticket email after partial cancellation failed:", emailError);
        notification.updatedTicketEmail = { success: false, skipped: false, reason: "send-failed", error: emailError.message };
      }
    }

    return res.status(200).json({
      success: true,
      message: refundAmount > 0
        ? `${cancelledItemCount} ${partialType}${cancelledItemCount > 1 ? "s" : ""} cancelled. ${formatCurrency(refundAmount)} credited to your wallet. Booking status: ${booking.status}.`
        : `${cancelledItemCount} ${partialType}${cancelledItemCount > 1 ? "s" : ""} cancelled. No refund is applicable as per the policy. Booking status: ${booking.status}.`,
      details: {
        partial: true,
        partialType,
        bookingStatus: booking.status,
        remainingActiveItems,
        cancelledItemIds,
        cancelledItems: cancelledItemNames,
        refundAmount,
        refundPercentage,
        cumulativeRefundAmount: booking.refundAmount,
        newWalletBalance: updatedUser.walletBalance || 0,
        cancellationDate: now
      },
      notification: {
        emailSent: Boolean(notification.partialCancellationEmail?.success || notification.updatedTicketEmail?.success),
        email: notification
      }
    });
  } catch (err) {
    if (bookingSaved) {
      try {
        await restoreBookingSnapshot(booking, bookingSnapshot);
      } catch (rollbackError) {
        console.error("Partial cancellation booking rollback failed:", rollbackError);
      }
    }

    if (inventoryReleased && inventoryReleaseReservation) {
      try {
        await reserveInventoryReservation(inventoryReleaseReservation);
      } catch (inventoryRollbackError) {
        console.error("Partial cancellation inventory rollback failed:", inventoryRollbackError);
      }
    }

    console.error("cancelBookingPartially failed:", err);
    return res.status(500).json({ 
      success: false, 
      message: err.message || "Server error during partial cancellation"
    });
  } finally {
    try {
      await releaseCancellationLock({ bookingId: req.params.id, lockOwner });
    } catch (lockError) {
      console.error("Failed to release partial cancellation lock:", lockError);
    }
  }
};

exports.cancelBooking = async (req, res) => {
  let lockOwner = "";
  let booking = null;
  let bookingSnapshot = null;
  let inventoryReleaseReservation = null;
  let inventoryReleased = false;
  let bookingSaved = false;
  let packageStatusUpdated = false;
  try {
    if (!validateRequestObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: "Invalid booking ID" });
    }

    const existingBooking = await Booking.findById(req.params.id).select("userId");
    if (!existingBooking) return res.status(404).json({ success: false, message: "Booking not found" });
    if (existingBooking.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: "Unauthorized. You do not own this booking." });
    }

    const lockResult = await acquireCancellationLock({
      bookingId: req.params.id,
      userId: req.user._id,
      type: "full"
    });
    booking = lockResult.booking;
    lockOwner = lockResult.lockOwner;
    if (!booking) {
      return res.status(409).json({
        success: false,
        message: "A cancellation request for this booking is already in progress. Please wait a moment and try again."
      });
    }

    if (isFullyCancelledBooking(booking)) {
      return res.status(400).json({ success: false, message: "Booking is already cancelled" });
    }
    if (!isCancelableBookingStatus(booking)) {
      return res.status(400).json({ success: false, message: "Only confirmed bookings can be cancelled." });
    }

    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    ensurePassengerBreakdown(booking);
    ensureHotelRoomBreakdown(booking);

    const travelDate = resolveTravelDate(
      booking.travelDate,
      booking.pickupDateTime,
      booking.checkIn,
      booking.checkOut,
      booking.checkInDate,
      booking.checkOutDate,
      booking.cab?.pickupDateTime,
      booking.hotel?.checkIn,
      booking.hotel?.checkOut
    );
    const { refundPercentage, now } = getRefundPolicy(travelDate);
    bookingSnapshot = booking.toObject({ depopulate: true });
    const refundableBaseAmount = getRemainingCancelableBaseAmount(booking);
    if (refundableBaseAmount <= 0) {
      return res.status(400).json({ success: false, message: "No cancellable amount is left for this booking." });
    }

    inventoryReleaseReservation = buildInventoryReservationForBooking(booking, { activeOnly: true });
    const refundAmount = Math.floor(refundableBaseAmount * (refundPercentage / 100));
    booking.refundAmount = normalizeAmount(booking.refundAmount) + refundAmount;
    markEntireBookingCancelled(booking, now);
    
    // Clear the cancellation lock before saving to avoid validation errors
    booking.cancellationLock = undefined;

    if (inventoryReleaseReservation) {
      await releaseInventoryReservation(inventoryReleaseReservation);
      inventoryReleased = true;
    }
    
    try {
      await booking.save();
      bookingSaved = true;
    } catch (saveError) {
      console.error("Booking save failed during cancellation:", saveError);
      throw new Error(`Failed to save booking cancellation: ${saveError.message}`);
    }

    if (normalizeCategory(booking.category) === "package" && mongoose.Types.ObjectId.isValid(booking.packageId)) {
      await updatePackageEmbeddedBookingStatus({
        packageId: booking.packageId,
        bookingId: booking._id,
        status: "Cancelled"
      });
      packageStatusUpdated = true;
    }

    let updatedUser;
    try {
      updatedUser = await applyWalletRefund({
        user,
        booking,
        refundAmount,
        source: "booking_refund",
        description: `Refund (${refundPercentage}%) for cancelled ${booking.category} booking #${String(booking._id).slice(-6).toUpperCase()}`,
        metadata: { refundPercentage }
      });
    } catch (walletError) {
      console.error("Wallet refund failed during cancellation:", walletError);
      throw new Error(`Failed to process wallet refund: ${walletError.message}`);
    }

    let cancellationEmail = { success: false, skipped: true, reason: "not-attempted" };
    try {
      cancellationEmail = await sendBookingCancellationEmail({ booking, user: updatedUser });
    } catch (emailError) {
      console.error("cancelBooking email failed:", emailError);
      cancellationEmail = { success: false, skipped: false, reason: "send-failed", error: emailError.message };
    }

    return res.status(200).json({
      success: true,
      message: refundAmount > 0
        ? `Booking cancelled successfully. ${formatCurrency(refundAmount)} (${refundPercentage}%) credited to your wallet.`
        : "Booking cancelled successfully. No refund is applicable for this booking.",
      details: {
        bookingStatus: booking.status,
        refundAmount,
        cumulativeRefundAmount: booking.refundAmount,
        refundPercentage,
        newWalletBalance: updatedUser.walletBalance || 0,
        cancellationDate: booking.cancellationDate
      },
      notification: { emailSent: Boolean(cancellationEmail.success), email: cancellationEmail }
    });
  } catch (err) {
    if (packageStatusUpdated && booking?.packageId) {
      try {
        await updatePackageEmbeddedBookingStatus({
          packageId: booking.packageId,
          bookingId: booking._id,
          status: "Confirmed"
        });
      } catch (packageRollbackError) {
        console.error("Package embedded booking rollback failed:", packageRollbackError);
      }
    }

    if (bookingSaved && bookingSnapshot) {
      try {
        await restoreBookingSnapshot(booking, bookingSnapshot);
      } catch (rollbackError) {
        console.error("Booking cancellation rollback failed:", rollbackError);
      }
    }

    if (inventoryReleased && inventoryReleaseReservation) {
      try {
        await reserveInventoryReservation(inventoryReleaseReservation);
      } catch (inventoryRollbackError) {
        console.error("Booking cancellation inventory rollback failed:", inventoryRollbackError);
      }
    }

    console.error("cancelBooking failed:", err);
    return res.status(500).json({ 
      success: false, 
      message: err.message || "Server error during cancellation"
    });
  } finally {
    try {
      await releaseCancellationLock({ bookingId: req.params.id, lockOwner });
    } catch (lockError) {
      console.error("Failed to release cancellation lock:", lockError);
    }
  }
};

