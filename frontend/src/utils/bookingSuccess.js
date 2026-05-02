const buildPassengerSummary = (passengers = [], contactDetails = {}, selectedSeats = []) => {
  if (!Array.isArray(passengers) || passengers.length === 0) {
    return [];
  }

  return passengers.map((passenger, index) => ({
    name: `${passenger.firstName || ""} ${passenger.lastName || ""}`.trim() || "Guest",
    email: contactDetails.email || passenger.email || "",
    phone: contactDetails.phone || passenger.phone || "",
    age: passenger.age,
    gender: passenger.gender,
    seat: selectedSeats[index]?.id || selectedSeats[index] || undefined
  }));
};

export const buildBookingSuccessState = ({
  bookingType,
  title,
  amount,
  bookingId,
  paymentMethod = "online",
  basePrice,
  convenienceFee = 0,
  discount = 0,
  date = new Date().toISOString(),
  passenger,
  passengers = [],
  details = {}
}) => ({
  bookingType,
  title,
  amount,
  bookingId,
  paymentMethod,
  basePrice: basePrice ?? amount,
  convenienceFee,
  discount,
  date,
  passenger,
  passengers,
  details
});

export const buildFlightSuccessState = ({ data, amount, bookingId, title, paymentMethod }) => {
  const passengerList = buildPassengerSummary(data.passengers, data.contactDetails, data.selectedSeats);
  const travelDate = data.travelDate || data.date || data.flight?.date;
  const airlineName = data.flight?.airlineName || data.flight?.airline;

  return buildBookingSuccessState({
    bookingType: "flights",
    title,
    amount,
    bookingId,
    paymentMethod,
    date: travelDate || new Date().toISOString(),
    passenger: passengerList[0],
    passengers: passengerList,
    details: {
      from: data.flight?.from,
      to: data.flight?.to,
      travelDate,
      departureTime: data.flight?.departureTime,
      arrivalTime: data.flight?.arrivalTime,
      airline: airlineName,
      flightNumber: data.flight?.flightNumber,
      seats: data.selectedSeats?.map((seat) => seat.id || seat).join(", ")
    }
  });
};

export const buildBusSuccessState = ({ data, amount, bookingId, title, paymentMethod, basePrice, convenienceFee }) => {
  const passengerList = buildPassengerSummary(data.passengers, data.contactDetails, data.selectedSeats);

  return buildBookingSuccessState({
    bookingType: "bus",
    title,
    amount,
    bookingId,
    paymentMethod,
    basePrice,
    convenienceFee,
    passenger: passengerList[0],
    passengers: passengerList,
    details: {
      from: data.bus?.from || data.from,
      to: data.bus?.to || data.to,
      departureTime: data.bus?.departureTime,
      arrivalTime: data.bus?.arrivalTime,
      boardingPoint: data.boardingPoint || data.bus?.boardingPoint,
      droppingPoint: data.droppingPoint || data.bus?.droppingPoint,
      seats: data.selectedSeats?.map((seat) => seat.id || seat).join(", ")
    }
  });
};

export const buildCabSuccessState = ({ data, amount, bookingId, title, paymentMethod }) => {
  const passengerList = buildPassengerSummary(data.passengers, data.contactDetails);

  return buildBookingSuccessState({
    bookingType: "cabs",
    title,
    amount,
    bookingId,
    paymentMethod,
    passenger: passengerList[0],
    passengers: passengerList,
    details: {
      pickupLocation: data.pickupLocation,
      dropLocation: data.dropLocation,
      pickupDateTime: data.pickupDateTime,
      distance: data.distance,
      cabType: data.selectedCab?.name || data.cab?.cabType || title
    }
  });
};

export const buildHotelSuccessState = ({ data, amount, bookingId, title, paymentMethod, basePrice, convenienceFee }) => {
  const passengerList = buildPassengerSummary(data.passengers, data.contactDetails);

  return buildBookingSuccessState({
    bookingType: "hotels",
    title,
    amount,
    bookingId,
    paymentMethod,
    basePrice,
    convenienceFee,
    passenger: passengerList[0],
    passengers: passengerList,
    details: {
      checkIn: data.checkIn,
      checkOut: data.checkOut,
      guests: data.guests,
      location: `${data.hotel?.location?.city || ""}, ${data.hotel?.location?.state || ""}`.replace(/^,\s*|\s*,\s*$/g, ""),
      bedType: data.preferences?.bedType,
      breakfastPlan: data.preferences?.breakfastPlan
    }
  });
};

export const buildTrainSuccessState = ({ data, amount, bookingId, title, paymentMethod, convenienceFee }) => {
  const passengerList = buildPassengerSummary(data.passengers, data.contactDetails);

  return buildBookingSuccessState({
    bookingType: "trains",
    title,
    amount,
    bookingId,
    paymentMethod,
    basePrice: amount - convenienceFee,
    convenienceFee,
    passenger: passengerList[0],
    passengers: passengerList,
    details: {
      from: data.train?.from,
      to: data.train?.to,
      departureTime: data.train?.departureTime,
      arrivalTime: data.train?.arrivalTime,
      pnr: data.pnr,
      class: data.selectedClass,
      berthPreference: data.selectedBerths?.join(", ")
    }
  });
};

export const buildPackageSuccessState = ({ data, amount, bookingId, title, paymentMethod, basePrice, convenienceFee, discount }) => {
  const getTravellerName = (traveller = {}) =>
    `${traveller.firstName || ""} ${traveller.lastName || ""}`.trim() ||
    String(traveller.name || "").trim() ||
    "Guest";

  const passengerList = (data.travellers || []).map((traveller) => ({
    name: getTravellerName(traveller),
    email: data.contactDetails?.email || "",
    phone: data.contactDetails?.phone || "",
    age: traveller.age,
    gender: traveller.gender
  }));

  const nights = parseInt(data.package?.duration, 10) || 3;
  const checkInDate = new Date(data.travelDate || new Date());
  const checkOutDate = new Date(checkInDate);
  checkOutDate.setDate(checkOutDate.getDate() + nights);

  return buildBookingSuccessState({
    bookingType: "packages",
    title,
    amount,
    bookingId,
    paymentMethod,
    basePrice,
    convenienceFee,
    discount,
    passenger: passengerList[0],
    passengers: passengerList,
    details: {
      checkIn: checkInDate.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }),
      checkOut: checkOutDate.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }),
      rooms: Math.ceil(passengerList.length / 2) || 1,
      guests: passengerList.length,
      destination: `${data.package?.city || ""}, ${data.package?.country || ""}`.replace(/^,\s*|\s*,\s*$/g, ""),
      departureCity: data.preferences?.departureCity,
      roomSharing: data.preferences?.roomSharing
    }
  });
};
