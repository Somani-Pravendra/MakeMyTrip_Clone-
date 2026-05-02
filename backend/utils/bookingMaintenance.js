const mongoose = require("mongoose");
const Flight = require("../models/Flight");
const Train = require("../models/Train");
const Hotel = require("../models/Hotel");
const Bus = require("../models/Bus");
const Package = require("../models/Package");

const ACTIVE_COMPONENT_STATUS = "Active";

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

const normalizeBookingStatus = (value) => String(value || "").trim().toLowerCase();
const isComponentActive = (value) => String(value || ACTIVE_COMPONENT_STATUS).trim().toLowerCase() === "active";
const isFullyCancelledBooking = (booking) => {
  const status = normalizeBookingStatus(booking?.status);
  return status === "cancelled" || status === "fully cancelled";
};

const getSeatIdsForIndexes = (selectedSeats = [], indexes = []) => [...new Set(
  indexes
    .map((index) => selectedSeats[index])
    .map((seat) => String(seat?.id || seat || "").trim().toUpperCase())
    .filter(Boolean)
)];

const getFallbackTravellerCount = (booking = {}) => {
  if (Array.isArray(booking.passengers) && booking.passengers.length > 0) {
    return booking.passengers.length;
  }

  if (Array.isArray(booking.selectedSeats) && booking.selectedSeats.length > 0) {
    return booking.selectedSeats.filter((seat) => String(seat?.id || seat || "").trim()).length || booking.selectedSeats.length;
  }

  return isFullyCancelledBooking(booking) ? 0 : 1;
};

const getActivePassengerIndexes = (booking = {}) => {
  if (!Array.isArray(booking.passengers) || booking.passengers.length === 0) {
    return isFullyCancelledBooking(booking) ? [] : [0];
  }

  return booking.passengers
    .map((passenger, index) => (isComponentActive(passenger?.status) ? index : -1))
    .filter((index) => index >= 0);
};

const getPackageTravellerCount = (booking = {}, activeOnly = true) => {
  if (activeOnly && isFullyCancelledBooking(booking)) return 0;
  const passengerCount = Array.isArray(booking.passengers) ? booking.passengers.length : 0;
  return passengerCount > 0 ? passengerCount : (isFullyCancelledBooking(booking) ? 0 : 1);
};

const buildInventoryReservationForBooking = (booking = {}, options = {}) => {
  const normalizedCategory = normalizeCategory(booking.category);
  const activeOnly = options.activeOnly !== false;
  const reservation = {};

  if (normalizedCategory === "flight" && mongoose.Types.ObjectId.isValid(booking.flightId)) {
    const passengerIndexes = Array.isArray(options.passengerIndexes)
      ? options.passengerIndexes
      : (activeOnly ? getActivePassengerIndexes(booking) : []);
    const selectedSeatIds = getSeatIdsForIndexes(booking.selectedSeats, passengerIndexes);
    const seatCount = passengerIndexes.length || selectedSeatIds.length || getFallbackTravellerCount(booking);
    if (seatCount > 0) {
      reservation.flight = {
        id: String(booking.flightId),
        seatCount,
        selectedSeatIds
      };
    }
  }

  if (normalizedCategory === "train" && mongoose.Types.ObjectId.isValid(booking.trainId)) {
    const passengerIndexes = Array.isArray(options.passengerIndexes)
      ? options.passengerIndexes
      : (activeOnly ? getActivePassengerIndexes(booking) : []);
    const seatCount = passengerIndexes.length || getFallbackTravellerCount(booking);
    const selectedClass = String(booking.train?.selectedClass || "").trim();
    if (seatCount > 0 && selectedClass) {
      reservation.train = {
        id: String(booking.trainId),
        seatCount,
        selectedClass
      };
    }
  }

  if (normalizedCategory === "bus" && mongoose.Types.ObjectId.isValid(booking.busId)) {
    const passengerIndexes = Array.isArray(options.passengerIndexes)
      ? options.passengerIndexes
      : (activeOnly ? getActivePassengerIndexes(booking) : []);
    const selectedSeatIds = getSeatIdsForIndexes(booking.selectedSeats, passengerIndexes);
    const seatCount = passengerIndexes.length || selectedSeatIds.length || getFallbackTravellerCount(booking);
    if (seatCount > 0) {
      reservation.bus = {
        id: String(booking.busId),
        seatCount,
        selectedSeatIds
      };
    }
  }

  if (normalizedCategory === "package" && mongoose.Types.ObjectId.isValid(booking.packageId)) {
    const seatCount = getPackageTravellerCount(booking, activeOnly);
    if (seatCount > 0) {
      reservation.package = {
        id: String(booking.packageId),
        seatCount
      };
    }
  }

  // Hotel reservations are tracked via the Hotel.reservations array (atomic date-range tracking).
  // The reservationId stored on the booking links back to the Hotel.reservations entry.
  if (normalizedCategory === "hotel" && mongoose.Types.ObjectId.isValid(booking.hotelId)) {
    const reservationId = booking.hotel?.reservationId || booking.reservationId;
    if (reservationId) {
      reservation.hotel = {
        id: String(booking.hotelId),
        reservationId: String(reservationId)
      };
    }
  }

  return reservation;
};

const applyInventoryAdjustment = async (reservation = {}, direction = 1) => {
  if (reservation.flight?.seatCount > 0 && mongoose.Types.ObjectId.isValid(reservation.flight.id)) {
    const seatCount = normalizeAmount(reservation.flight.seatCount);
    const selectedSeatIds = Array.isArray(reservation.flight.selectedSeatIds) ? reservation.flight.selectedSeatIds : [];
    if (direction > 0) {
      const flightUpdate = { $inc: { availableSeats: seatCount } };
      if (selectedSeatIds.length > 0) {
        flightUpdate.$pull = { occupiedSeats: { $in: selectedSeatIds } };
      }
      await Flight.findByIdAndUpdate(reservation.flight.id, flightUpdate);
    } else {
      const flightQuery = { _id: reservation.flight.id, availableSeats: { $gte: seatCount } };
      if (selectedSeatIds.length > 0) {
        flightQuery.occupiedSeats = { $nin: selectedSeatIds };
      }

      const flightUpdate = { $inc: { availableSeats: -seatCount } };
      if (selectedSeatIds.length > 0) {
        flightUpdate.$addToSet = { occupiedSeats: { $each: selectedSeatIds } };
      }

      const updatedFlight = await Flight.findOneAndUpdate(flightQuery, flightUpdate, { new: true });
      if (!updatedFlight) {
        throw new Error("Unable to restore the flight inventory state.");
      }
    }
  }

  if (reservation.train?.seatCount > 0 && reservation.train.selectedClass && mongoose.Types.ObjectId.isValid(reservation.train.id)) {
    const seatCount = normalizeAmount(reservation.train.seatCount);
    if (direction > 0) {
      await Train.updateOne(
        { _id: reservation.train.id },
        { $inc: { "availableClasses.$[matchedClass].availableSeats": seatCount } },
        { arrayFilters: [{ "matchedClass.type": reservation.train.selectedClass }] }
      );
    } else {
      const updatedTrain = await Train.updateOne(
        {
          _id: reservation.train.id,
          availableClasses: {
            $elemMatch: {
              type: reservation.train.selectedClass,
              availableSeats: { $gte: seatCount }
            }
          }
        },
        { $inc: { "availableClasses.$[matchedClass].availableSeats": -seatCount } },
        { arrayFilters: [{ "matchedClass.type": reservation.train.selectedClass }] }
      );

      if (!updatedTrain.modifiedCount) {
        throw new Error("Unable to restore the train inventory state.");
      }
    }
  }

  if (reservation.bus?.seatCount > 0 && mongoose.Types.ObjectId.isValid(reservation.bus.id)) {
    const seatCount = normalizeAmount(reservation.bus.seatCount);
    const selectedSeatIds = Array.isArray(reservation.bus.selectedSeatIds) ? reservation.bus.selectedSeatIds : [];
    if (direction > 0) {
      const busUpdate = { $inc: { availableSeats: seatCount } };
      if (selectedSeatIds.length > 0) {
        busUpdate.$pull = { occupiedSeats: { $in: selectedSeatIds } };
      }
      await Bus.findByIdAndUpdate(reservation.bus.id, busUpdate);
    } else {
      const busQuery = { _id: reservation.bus.id, status: "Active", availableSeats: { $gte: seatCount } };
      if (selectedSeatIds.length > 0) {
        busQuery.occupiedSeats = { $nin: selectedSeatIds };
      }

      const busUpdate = { $inc: { availableSeats: -seatCount } };
      if (selectedSeatIds.length > 0) {
        busUpdate.$addToSet = { occupiedSeats: { $each: selectedSeatIds } };
      }

      const updatedBus = await Bus.findOneAndUpdate(
        busQuery,
        busUpdate,
        { new: true }
      );

      if (!updatedBus) {
        throw new Error("Unable to restore the bus inventory state.");
      }
    }
  }

  if (reservation.package?.seatCount > 0 && mongoose.Types.ObjectId.isValid(reservation.package.id)) {
    const seatCount = normalizeAmount(reservation.package.seatCount);

    if (direction > 0) {
      const pkg = await Package.findById(reservation.package.id);
      if (pkg) {
        pkg.seatsAvailable = normalizeAmount(pkg.seatsAvailable) + seatCount;
        if (pkg.status === "Inactive" && normalizeAmount(pkg.seatsAvailable) > 0) {
          pkg.status = "Active";
        }
        await pkg.save();
      }
    } else {
      const pkg = await Package.findOne({
        _id: reservation.package.id,
        status: "Active",
        seatsAvailable: { $gte: seatCount }
      });

      if (!pkg) {
        throw new Error("Unable to restore the package inventory state.");
      }

      pkg.seatsAvailable = normalizeAmount(pkg.seatsAvailable) - seatCount;
      if (pkg.seatsAvailable <= 0) {
        pkg.status = "Inactive";
      }
      await pkg.save();
    }
  }

  // Release hotel reservation by marking the tracked entry as Cancelled.
  // direction > 0 means release (cancellation), direction < 0 means re-reserve (not used for hotels).
  if (direction > 0 && reservation.hotel?.reservationId && mongoose.Types.ObjectId.isValid(reservation.hotel.id)) {
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

const releaseInventoryReservation = async (reservation = {}) => applyInventoryAdjustment(reservation, 1);
const reserveInventoryReservation = async (reservation = {}) => applyInventoryAdjustment(reservation, -1);

const updatePackageEmbeddedBookingStatus = async ({ packageId, bookingId, status }) => {
  if (!mongoose.Types.ObjectId.isValid(packageId) || !bookingId || !status) return;
  await Package.updateOne(
    { _id: packageId, "bookings.bookingId": String(bookingId) },
    { $set: { "bookings.$.status": status } }
  );
};

const removePackageEmbeddedBooking = async ({ packageId, bookingId }) => {
  if (!mongoose.Types.ObjectId.isValid(packageId) || !bookingId) return;
  await Package.updateOne(
    { _id: packageId },
    { $pull: { bookings: { bookingId: String(bookingId) } } }
  );
};

const removeUserPackageData = async ({ userId, bookingIds = [] }) => {
  const safeBookingIds = bookingIds.map((item) => String(item || "").trim()).filter(Boolean);
  if (!mongoose.Types.ObjectId.isValid(userId) && safeBookingIds.length === 0) return;

  const pull = {};
  if (mongoose.Types.ObjectId.isValid(userId)) {
    pull.reviews = { userId: new mongoose.Types.ObjectId(userId) };
    pull.bookings = { userId: new mongoose.Types.ObjectId(userId) };
  }

  if (Object.keys(pull).length > 0) {
    await Package.updateMany({}, { $pull: pull });
  }

  if (safeBookingIds.length > 0) {
    await Package.updateMany({}, {
      $pull: {
        bookings: { bookingId: { $in: safeBookingIds } }
      }
    });
  }
};

module.exports = {
  buildInventoryReservationForBooking,
  releaseInventoryReservation,
  reserveInventoryReservation,
  updatePackageEmbeddedBookingStatus,
  removePackageEmbeddedBooking,
  removeUserPackageData,
  isFullyCancelledBooking,
  isComponentActive
};
