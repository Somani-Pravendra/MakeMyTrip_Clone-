const nodemailer = require("nodemailer");

const SUPPORT_EMAIL = process.env.EMAIL_USER || "support@makemytrip.com";
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000";

const hasMailConfig = () => Boolean(process.env.EMAIL_USER && process.env.EMAIL_PASS);

const createTransporter = () => nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

const formatCurrency = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0
  }).format(Number(value) || 0);

const formatDate = (value) => {
  if (!value) return "To be confirmed";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return String(value);
  return parsed.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
};

const escapePdfText = (value = "") =>
  String(value)
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");

const sanitizePdfText = (value = "") =>
  String(value)
    .replace(/₹/g, "INR ")
    .replace(/[^\x20-\x7E]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const formatCurrencyForPdf = (value) =>
  `INR ${Math.round(Number(value) || 0).toLocaleString("en-IN")}`;

const splitPdfLines = (text, maxChars = 60) => {
  const safeText = sanitizePdfText(text);
  if (!safeText) return [""];
  if (safeText.length <= maxChars) return [safeText];

  const words = safeText.split(" ");
  const lines = [];
  let current = "";

  words.forEach((word) => {
    const next = current ? `${current} ${word}` : word;
    if (next.length > maxChars && current) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  });

  if (current) lines.push(current);
  return lines;
};

const toTitleCase = (value = "") =>
  String(value)
    .toLowerCase()
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

const normalizeCategory = (value = "") => {
  const category = String(value || "").trim().toLowerCase();
  if (category === "flights") return "flight";
  if (category === "trains") return "train";
  if (category === "buses") return "bus";
  if (category === "hotels") return "hotel";
  if (category === "packages") return "package";
  return category;
};

const getRouteParts = (booking = {}) => {
  const rawRoute = String(booking.details?.route || "").trim();
  const routeParts = rawRoute.includes("->")
    ? rawRoute.split("->").map((part) => part.trim())
    : rawRoute.includes("-")
      ? rawRoute.split("-").map((part) => part.trim())
      : [];

  return {
    from: routeParts[0] || "",
    to: routeParts[1] || ""
  };
};

const getJourneyValue = (booking = {}, keys = []) => {
  for (const key of keys) {
    const value = key.split(".").reduce((acc, part) => acc?.[part], booking);
    if (value) return value;
  }
  return "";
};

const buildTicketSummary = (booking) => {
  const category = normalizeCategory(booking.category);
  const routeParts = getRouteParts(booking);

  if (category === "flight") {
    return {
      title: getJourneyValue(booking, ["flight.airline", "details.airline", "title"]) || "Flight Booking",
      subtitle: getJourneyValue(booking, ["flight.flightNumber", "details.flightNumber"]) || "Flight ticket",
      origin: getJourneyValue(booking, ["flight.from", "from", "details.from"]) || routeParts.from || "Origin",
      destination: getJourneyValue(booking, ["flight.to", "to", "details.to"]) || routeParts.to || "Destination",
      departAt: getJourneyValue(booking, ["flight.departureTime", "details.departureTime"]) || formatDate(booking.travelDate),
      arriveAt: getJourneyValue(booking, ["flight.arrivalTime", "details.arrivalTime"]) || "Scheduled"
    };
  }

  if (category === "train") {
    return {
      title: getJourneyValue(booking, ["train.trainName", "details.trainName", "title"]) || "Train Booking",
      subtitle: getJourneyValue(booking, ["train.trainNumber", "pnr", "details.trainNumber"]) || "Train ticket",
      origin: getJourneyValue(booking, ["train.from", "from", "details.from"]) || routeParts.from || "Origin",
      destination: getJourneyValue(booking, ["train.to", "to", "details.to"]) || routeParts.to || "Destination",
      departAt: getJourneyValue(booking, ["train.departureTime", "details.departureTime"]) || formatDate(booking.travelDate),
      arriveAt: getJourneyValue(booking, ["train.arrivalTime", "details.arrivalTime"]) || "Scheduled"
    };
  }

  if (category === "bus") {
    return {
      title: getJourneyValue(booking, ["bus.operatorName", "details.operatorName", "title"]) || "Bus Booking",
      subtitle: getJourneyValue(booking, ["bus.busType", "details.busType"]) || "Bus ticket",
      origin: getJourneyValue(booking, ["bus.from", "from", "details.from"]) || routeParts.from || "Origin",
      destination: getJourneyValue(booking, ["bus.to", "to", "details.to"]) || routeParts.to || "Destination",
      departAt: getJourneyValue(booking, ["bus.departureTime", "details.departureTime"]) || formatDate(booking.travelDate),
      arriveAt: getJourneyValue(booking, ["bus.arrivalTime", "details.arrivalTime"]) || "Scheduled"
    };
  }

  if (category === "hotel") {
    return {
      title: getJourneyValue(booking, ["hotel.name", "details.hotelName", "title"]) || "Hotel Booking",
      subtitle: getJourneyValue(booking, ["hotel.roomType", "roomType", "details.roomType"]) || "Stay confirmation",
      origin: getJourneyValue(booking, ["hotel.location.city", "details.location", "from"]) || "Check-in",
      destination: getJourneyValue(booking, ["hotel.location.address", "hotel.name", "details.location", "to"]) || "Hotel",
      departAt: formatDate(getJourneyValue(booking, ["hotel.checkIn", "checkInDate", "checkIn", "travelDate"])),
      arriveAt: formatDate(getJourneyValue(booking, ["hotel.checkOut", "checkOutDate", "checkOut"]))
    };
  }

  if (category === "cabs") {
    return {
      title: getJourneyValue(booking, ["cab.cabType", "cabType", "details.cabType"]) || "Cab Booking",
      subtitle: getJourneyValue(booking, ["cab.vehicleNumber", "details.vehicleNumber"]) || "Ride confirmation",
      origin: getJourneyValue(booking, ["cab.pickupLocation", "pickupLocation", "from", "details.pickupLocation"]) || routeParts.from || "Pickup",
      destination: getJourneyValue(booking, ["cab.dropLocation", "dropLocation", "to", "details.dropLocation"]) || routeParts.to || "Drop-off",
      departAt: formatDate(getJourneyValue(booking, ["cab.pickupDateTime", "pickupDateTime", "travelDate"])),
      arriveAt: getJourneyValue(booking, ["cab.duration", "details.duration"]) ? `${getJourneyValue(booking, ["cab.duration", "details.duration"])} mins` : "On route"
    };
  }

  if (category === "package") {
    return {
      title: getJourneyValue(booking, ["package.title", "title", "details.packageTitle"]) || "Holiday Package",
      subtitle: getJourneyValue(booking, ["package.packageCode", "details.packageCode"]) || "Package confirmation",
      origin: getJourneyValue(booking, ["package.destination.state", "from", "details.departureCity"]) || "Departure",
      destination: getJourneyValue(booking, ["package.destination.country", "details.destination"]) || "Destination",
      departAt: formatDate(getJourneyValue(booking, ["travelDate", "details.checkIn"])),
      arriveAt: getJourneyValue(booking, ["package.duration.days", "details.duration"])
        ? `${getJourneyValue(booking, ["package.duration.nights", "details.nights"]) || 0}N / ${getJourneyValue(booking, ["package.duration.days", "details.duration"])}D`
        : "Scheduled"
    };
  }

  return {
    title: "Travel Booking",
    subtitle: "Booking confirmation",
    origin: routeParts.from || booking.from || "Origin",
    destination: routeParts.to || booking.to || "Destination",
    departAt: formatDate(booking.travelDate),
    arriveAt: "Scheduled"
  };
};

const buildPassengerSummary = (booking) => {
  const passengers = Array.isArray(booking.passengers) ? booking.passengers : [];
  if (!passengers.length) return ["Primary traveller"];

  const selectedSeats = Array.isArray(booking.selectedSeats) ? booking.selectedSeats : [];
  const selectedBerths = Array.isArray(booking.selectedBerths) ? booking.selectedBerths : [];

  return passengers.map((passenger, index) => {
    const name = [passenger.firstName, passenger.lastName].filter(Boolean).join(" ").trim() || `Traveller ${index + 1}`;
    const metaParts = [];
    
    if (passenger.gender) metaParts.push(passenger.gender);
    if (passenger.age) metaParts.push(`${passenger.age} yrs`);
    
    // Add seat/berth info if available
    const seat = selectedSeats[index];
    const berth = selectedBerths[index];
    
    if (seat) {
      const seatDisplay = typeof seat === 'string' ? seat : (seat.id || seat.seatNumber);
      if (seatDisplay) metaParts.push(`Seat ${seatDisplay}`);
    }
    
    if (berth) {
      metaParts.push(`Berth ${berth}`);
    }
    
    const meta = metaParts.join(", ");
    return meta ? `${name} (${meta})` : name;
  });
};

const getServiceLabel = (booking = {}) => {
  const category = String(booking.category || "").toLowerCase();

  if (category === "flight" || category === "flights") return "Flight";
  if (category === "bus" || category === "buses") return "Bus";
  if (category === "train" || category === "trains") return "Train";
  if (category === "hotel" || category === "hotels") return "Hotel";
  if (category === "cab" || category === "cabs") return "Cab";
  if (category === "package" || category === "packages") return "Holiday Package";

  return "Travel Booking";
};

const createPdfBuffer = (booking, recipientName) => {
  const summary = buildTicketSummary(booking);
  const rawPassengers = buildPassengerSummary(booking);
  const passengers = rawPassengers.slice(0, 4);
  const hiddenPassengerCount = Math.max(rawPassengers.length - passengers.length, 0);

  const bookingId = sanitizePdfText(String(booking._id || "N/A"));
  const pnr = booking.pnr ? sanitizePdfText(String(booking.pnr)) : "";
  const status = sanitizePdfText(booking.status || "Confirmed");
  const category = sanitizePdfText(toTitleCase(booking.category || "Travel"));
  const travellerName = sanitizePdfText(recipientName || booking.contactDetails?.name || "Customer");
  const contactEmail = sanitizePdfText(booking.contactDetails?.email || "Not provided");
  const contactPhone = sanitizePdfText(booking.contactDetails?.phone || "Not provided");
  const bookingDate = sanitizePdfText(formatDate(booking.bookingDate || booking.createdAt));
  const travelDate = sanitizePdfText(formatDate(booking.travelDate));
  const paymentMethod = sanitizePdfText(
    toTitleCase(booking.payment?.externalPaymentMethod || booking.payment?.method || "Online")
  );
  const totalPaid = formatCurrencyForPdf(booking.totalFare);
  const walletUsed = Number(booking.payment?.walletAmountUsed || 0);
  const externalPaid = Number(booking.payment?.externalAmountPaid || 0);
  const couponDiscount = Number(booking.couponDiscount || 0);
  const subtotalFare = Number(booking.subtotalFare || booking.totalFare || 0);

  const sectionRows = [
    { label: "Booking ID", value: bookingId },
    { label: "Status", value: status },
    { label: "Category", value: category },
    { label: "Traveller", value: travellerName },
    { label: "Contact Email", value: contactEmail },
    { label: "Contact Phone", value: contactPhone },
    { label: "Booked On", value: bookingDate },
    { label: "Travel Date", value: travelDate }
  ];

  if (pnr) {
    sectionRows.splice(1, 0, { label: "PNR", value: pnr });
  }

  const journeyRows = [
    { label: "Service", value: sanitizePdfText(summary.title) },
    { label: "Reference", value: sanitizePdfText(summary.subtitle) },
    { label: "From", value: sanitizePdfText(summary.origin) },
    { label: "To", value: sanitizePdfText(summary.destination) },
    { label: "Departure / Check-in", value: sanitizePdfText(summary.departAt) },
    { label: "Arrival / Check-out", value: sanitizePdfText(summary.arriveAt) }
  ];

  const paymentRows = [];
  
  if (subtotalFare > 0 && couponDiscount > 0) {
    paymentRows.push({ label: "Subtotal", value: formatCurrencyForPdf(subtotalFare) });
    paymentRows.push({ label: "Coupon Discount", value: `- ${formatCurrencyForPdf(couponDiscount)}` });
  }
  
  paymentRows.push({ label: "Total Paid", value: totalPaid });
  paymentRows.push({ label: "Payment Method", value: paymentMethod });
  
  if (walletUsed > 0) {
    paymentRows.push({ label: "Wallet Used", value: formatCurrencyForPdf(walletUsed) });
  }
  
  if (externalPaid > 0) {
    paymentRows.push({ label: "External Paid", value: formatCurrencyForPdf(externalPaid) });
  }

  const commands = [];
  const pageWidth = 595;
  const startX = 40;
  const cardWidth = pageWidth - (startX * 2);

  const pushText = (text, x, y, font = "F1", size = 11, color = "0 0 0") => {
    const safeText = escapePdfText(sanitizePdfText(text));
    commands.push("BT");
    commands.push(`${color} rg`);
    commands.push(`/${font} ${size} Tf`);
    commands.push(`${x} ${y} Td`);
    commands.push(`(${safeText}) Tj`);
    commands.push("ET");
  };

  const pushRect = (x, y, width, height, fillColor, borderColor = null) => {
    if (fillColor) {
      commands.push(`${fillColor} rg`);
      commands.push(`${x} ${y} ${width} ${height} re f`);
    }
    if (borderColor) {
      commands.push(`${borderColor} RG`);
      commands.push("1 w");
      commands.push(`${x} ${y} ${width} ${height} re S`);
    }
  };

  const drawRowsSection = (title, rows, yTop) => {
    const baseRowHeight = 18;
    let requiredHeight = 42;

    rows.forEach((row) => {
      const wrappedValues = splitPdfLines(row.value, 52);
      requiredHeight += Math.max(baseRowHeight, 10 + (wrappedValues.length * 11));
    });

    const sectionBottom = yTop - requiredHeight;
    pushRect(startX, sectionBottom, cardWidth, requiredHeight, "0.98 0.99 1", "0.86 0.91 0.97");
    pushText(title, startX + 14, yTop - 22, "F2", 13, "0.07 0.23 0.45");

    let rowY = yTop - 44;
    rows.forEach((row) => {
      pushText(`${row.label}:`, startX + 14, rowY, "F2", 10, "0.36 0.45 0.56");
      const wrappedValues = splitPdfLines(row.value, 52);
      wrappedValues.forEach((valueLine, idx) => {
        pushText(valueLine, startX + 170, rowY - (idx * 12), "F1", 10.5, "0.08 0.12 0.18");
      });

      const consumedHeight = Math.max(baseRowHeight, 10 + (wrappedValues.length * 11));
      rowY -= consumedHeight;
    });

    return sectionBottom - 12;
  };

  pushRect(0, 0, 595, 842, "1 1 1");
  pushRect(0, 760, 595, 82, "0.05 0.23 0.49");
  pushText("MakeMyTrip E-Ticket", 40, 808, "F2", 26, "1 1 1");
  pushText(`Booking ${bookingId}`, 40, 786, "F1", 11, "0.86 0.93 1");
  pushText(`Generated on ${sanitizePdfText(formatDate(new Date()))}`, 355, 786, "F1", 10, "0.86 0.93 1");

  let yCursor = 736;
  yCursor = drawRowsSection("Booking Details", sectionRows, yCursor);
  yCursor = drawRowsSection("Journey Details", journeyRows, yCursor);
  yCursor = drawRowsSection("Payment Details", paymentRows, yCursor);

  const passengerHeaderHeight = 34;
  const passengerLineHeight = 14;
  const passengerCardHeight =
    passengerHeaderHeight +
    (passengers.length * passengerLineHeight) +
    (hiddenPassengerCount > 0 ? passengerLineHeight : 0) +
    16;
  const passengerBottom = yCursor - passengerCardHeight;
  pushRect(startX, passengerBottom, cardWidth, passengerCardHeight, "0.98 0.99 1", "0.86 0.91 0.97");
  pushText("Passenger Details", startX + 14, yCursor - 22, "F2", 13, "0.07 0.23 0.45");

  let passengerY = yCursor - 44;
  passengers.forEach((passenger, index) => {
    pushText(`${index + 1}. ${passenger}`, startX + 18, passengerY, "F1", 10.5, "0.08 0.12 0.18");
    passengerY -= passengerLineHeight;
  });

  if (hiddenPassengerCount > 0) {
    pushText(`+${hiddenPassengerCount} more passenger(s)`, startX + 18, passengerY, "F1", 10, "0.34 0.45 0.58");
    passengerY -= passengerLineHeight;
  }

  yCursor = passengerBottom - 12;

  const noteLines = [
    ...splitPdfLines("Please carry a valid photo ID during travel or check-in.", 78),
    ...splitPdfLines(`Manage your booking: ${FRONTEND_URL}/profile`, 78)
  ];
  const adjustedNoteLines = noteLines.slice(0, Math.max(1, Math.min(2, noteLines.length)));
  const noteCardHeight = 34 + (adjustedNoteLines.length * 12);
  const noteBottom = Math.max(22, yCursor - noteCardHeight);
  const noteTop = noteBottom + noteCardHeight;
  pushRect(startX, noteBottom, cardWidth, noteCardHeight, "0.95 0.98 1", "0.78 0.88 0.97");
  pushText("Important", startX + 14, noteTop - 22, "F2", 12, "0.04 0.28 0.58");
  adjustedNoteLines.forEach((line, index) => {
    pushText(line, startX + 14, noteTop - 40 - (index * 13), "F1", 10, "0.14 0.2 0.28");
  });

  const content = commands.join("\n");

  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R /F2 6 0 R >> >> >>",
    `<< /Length ${Buffer.byteLength(content, "utf8")} >>\nstream\n${content}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>"
  ];

  let pdf = "%PDF-1.4\n";
  const offsets = [0];

  objects.forEach((object, index) => {
    offsets.push(Buffer.byteLength(pdf, "utf8"));
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });

  const xrefOffset = Buffer.byteLength(pdf, "utf8");
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += "0000000000 65535 f \n";
  offsets.slice(1).forEach((offset) => {
    pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
  });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return Buffer.from(pdf, "utf8");
};

const sendBookingTicketEmail = async ({ booking, user, options = {} }) => {
  const recipientEmail = booking.contactDetails?.email || user?.email;
  const recipientName = booking.contactDetails?.name || user?.name || "Customer";

  if (!recipientEmail) {
    return { success: false, skipped: true, reason: "no-recipient-email" };
  }

  if (!hasMailConfig()) {
    console.log(`[BOOKING EMAIL SKIPPED] Missing email config. Ticket would be sent to ${recipientEmail} for booking ${booking._id}`);
    return { success: false, skipped: true, reason: "missing-mail-config" };
  }

  const summary = buildTicketSummary(booking);
  const pdfBuffer = createPdfBuffer(booking, recipientName);
  const manageUrl = `${FRONTEND_URL}/profile`;
  const variant = options.variant || "confirmed";
  const isUpdatedTicket = variant === "updated-after-partial-cancellation";
  const subjectLine = isUpdatedTicket
    ? `Updated Ticket Details - ${summary.title} | MakeMyTrip`
    : `Booking Confirmed - ${summary.title} | MakeMyTrip`;
  const headerCaption = isUpdatedTicket ? "Updated ticket details" : "Booking confirmation";
  const heroTitle = isUpdatedTicket ? "Your updated ticket is ready" : "Your booking is confirmed";
  const introLine = isUpdatedTicket
    ? "Some travellers or rooms from this booking were cancelled. Your updated e-ticket for the active booking details is attached to this email."
    : "Thank you for booking with MakeMyTrip. Your e-ticket is attached to this email as a PDF for easy download and sharing.";
  const plainTextOpening = isUpdatedTicket
    ? "Your booking has been partially updated. The attached e-ticket contains the active ticket details only."
    : "Your booking has been confirmed successfully.";
  const plainTextAttachmentLine = isUpdatedTicket
    ? "Your updated e-ticket is attached to this email in PDF format."
    : "Your e-ticket is attached to this email in PDF format.";
  const actionButtonLabel = isUpdatedTicket ? "View updated booking" : "Manage booking";
  
  const walletUsed = Number(booking.payment?.walletAmountUsed || 0);
  const externalPaid = Number(booking.payment?.externalAmountPaid || 0);
  const couponDiscount = Number(booking.couponDiscount || 0);
  const subtotalFare = Number(booking.subtotalFare || booking.totalFare || 0);
  const couponCode = booking.couponCode ? String(booking.couponCode).toUpperCase() : null;
  const pnr = booking.pnr ? String(booking.pnr) : null;

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: recipientEmail,
    subject: subjectLine,
    text: [
      `Hello ${recipientName},`,
      "",
      plainTextOpening,
      plainTextAttachmentLine,
      "",
      `Booking ID: ${booking._id}`,
      pnr ? `PNR: ${pnr}` : null,
      `Service: ${summary.title}`,
      `Route / Stay: ${summary.origin} to ${summary.destination}`,
      `Travel / Check-in: ${summary.departAt}`,
      "",
      subtotalFare > 0 && couponDiscount > 0 ? `Subtotal: ${formatCurrency(subtotalFare)}` : null,
      couponDiscount > 0 && couponCode ? `Coupon (${couponCode}): -${formatCurrency(couponDiscount)}` : null,
      `Total Paid: ${formatCurrency(booking.totalFare)}`,
      walletUsed > 0 ? `Wallet Used: ${formatCurrency(walletUsed)}` : null,
      externalPaid > 0 ? `External Paid: ${formatCurrency(externalPaid)}` : null,
      "",
      `You can manage your booking here: ${manageUrl}`,
      "",
      "Please carry a valid photo ID during travel or check-in.",
      "",
      "Thank you,",
      "Support Team"
    ].filter(line => line !== null).join("\n"),
    html: `
      <div style="margin:0;padding:0;background:#f4f7fb;font-family:Arial,sans-serif;color:#10213a;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:32px 16px;background:#f4f7fb;">
          <tr>
            <td align="center">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:680px;background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 18px 60px rgba(16,33,58,0.12);">
                <tr>
                  <td style="padding:28px 32px;background:linear-gradient(135deg,#052451 0%,#0b5bd3 100%);color:#ffffff;">
                    <div style="font-size:30px;font-weight:800;letter-spacing:-0.5px;">MakeMyTrip</div>
                    <div style="margin-top:10px;font-size:14px;opacity:0.86;">${headerCaption}</div>
                  </td>
                </tr>
                <tr>
                  <td style="padding:32px;">
                    <p style="margin:0 0 12px;font-size:15px;color:#334155;line-height:1.7;">Hello ${recipientName},</p>
                    <h1 style="margin:0 0 14px;font-size:28px;line-height:1.2;color:#0f172a;">${heroTitle}</h1>
                    <p style="margin:0 0 18px;font-size:15px;line-height:1.8;color:#334155;">
                      ${introLine}
                    </p>

                    <div style="margin:24px 0;padding:22px;border-radius:18px;background:#f8fbff;border:1px solid #dbeafe;">
                      <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;">
                        <div>
                          <div style="font-size:12px;letter-spacing:0.16em;text-transform:uppercase;color:#64748b;margin-bottom:6px;">Booking ID</div>
                          <div style="font-size:18px;font-weight:700;color:#0f172a;">${booking._id}</div>
                        </div>
                        ${pnr ? `
                        <div>
                          <div style="font-size:12px;letter-spacing:0.16em;text-transform:uppercase;color:#64748b;margin-bottom:6px;">PNR</div>
                          <div style="font-size:18px;font-weight:700;color:#0f172a;">${pnr}</div>
                        </div>
                        ` : `
                        <div>
                          <div style="font-size:12px;letter-spacing:0.16em;text-transform:uppercase;color:#64748b;margin-bottom:6px;">Status</div>
                          <div style="font-size:18px;font-weight:700;color:#0f172a;">${booking.status || 'Confirmed'}</div>
                        </div>
                        `}
                        ${subtotalFare > 0 && couponDiscount > 0 ? `
                        <div>
                          <div style="font-size:12px;letter-spacing:0.16em;text-transform:uppercase;color:#64748b;margin-bottom:6px;">Subtotal</div>
                          <div style="font-size:16px;font-weight:700;color:#0f172a;">${formatCurrency(subtotalFare)}</div>
                        </div>
                        <div>
                          <div style="font-size:12px;letter-spacing:0.16em;text-transform:uppercase;color:#64748b;margin-bottom:6px;">${couponCode ? `Coupon (${couponCode})` : 'Discount'}</div>
                          <div style="font-size:16px;font-weight:700;color:#16a34a;">-${formatCurrency(couponDiscount)}</div>
                        </div>
                        ` : ''}
                        <div>
                          <div style="font-size:12px;letter-spacing:0.16em;text-transform:uppercase;color:#64748b;margin-bottom:6px;">Total Paid</div>
                          <div style="font-size:18px;font-weight:700;color:#0f172a;">${formatCurrency(booking.totalFare)}</div>
                        </div>
                        <div>
                          <div style="font-size:12px;letter-spacing:0.16em;text-transform:uppercase;color:#64748b;margin-bottom:6px;">Travel / Check-in</div>
                          <div style="font-size:16px;font-weight:700;color:#0f172a;">${summary.departAt}</div>
                        </div>
                        ${walletUsed > 0 ? `
                        <div>
                          <div style="font-size:12px;letter-spacing:0.16em;text-transform:uppercase;color:#64748b;margin-bottom:6px;">Wallet Used</div>
                          <div style="font-size:16px;font-weight:700;color:#0f172a;">${formatCurrency(walletUsed)}</div>
                        </div>
                        ` : ''}
                        ${externalPaid > 0 ? `
                        <div>
                          <div style="font-size:12px;letter-spacing:0.16em;text-transform:uppercase;color:#64748b;margin-bottom:6px;">External Paid</div>
                          <div style="font-size:16px;font-weight:700;color:#0f172a;">${formatCurrency(externalPaid)}</div>
                        </div>
                        ` : ''}
                        <div>
                          <div style="font-size:12px;letter-spacing:0.16em;text-transform:uppercase;color:#64748b;margin-bottom:6px;">Service</div>
                          <div style="font-size:16px;font-weight:700;color:#0f172a;">${summary.title}</div>
                        </div>
                        <div>
                          <div style="font-size:12px;letter-spacing:0.16em;text-transform:uppercase;color:#64748b;margin-bottom:6px;">Travel / Check-in</div>
                          <div style="font-size:16px;font-weight:700;color:#0f172a;">${summary.departAt}</div>
                        </div>
                      </div>
                    </div>

                    <div style="padding:18px 20px;border-radius:16px;background:#0f172a;color:#ffffff;">
                      <div style="font-size:12px;letter-spacing:0.16em;text-transform:uppercase;color:rgba(255,255,255,0.62);margin-bottom:8px;">Trip summary</div>
                      <div style="font-size:24px;font-weight:800;line-height:1.2;">${summary.origin} to ${summary.destination}</div>
                      <div style="margin-top:10px;font-size:14px;color:rgba(255,255,255,0.78);">${summary.subtitle}</div>
                    </div>

                    <div style="margin:28px 0 22px;">
                      <a href="${manageUrl}" style="display:inline-block;padding:14px 24px;border-radius:12px;background:#0b5bd3;color:#ffffff;text-decoration:none;font-size:15px;font-weight:700;">
                        ${actionButtonLabel}
                      </a>
                    </div>

                    <p style="margin:0 0 10px;font-size:14px;line-height:1.8;color:#475569;">
                      Please carry a valid photo ID during travel or check-in. If you need any help, you can reach out to our support team at
                      <a href="mailto:${SUPPORT_EMAIL}" style="color:#0b5bd3;"> ${SUPPORT_EMAIL}</a>.
                    </p>

                    <p style="margin:18px 0 0;font-size:14px;line-height:1.8;color:#475569;">
                      Thank you,<br />
                      <strong style="color:#0f172a;">Support Team</strong>
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </div>
    `,
    attachments: [
      {
        filename: `MakeMyTrip-Ticket-${String(booking._id).slice(-8)}.pdf`,
        content: pdfBuffer,
        contentType: "application/pdf"
      }
    ]
  };

  const transporter = createTransporter();
  await transporter.sendMail(mailOptions);
  return { success: true, skipped: false, recipientEmail };
};

const sendBookingCancellationEmail = async ({ booking, user }) => {
  const recipientEmail = booking.contactDetails?.email || user?.email;
  const recipientName = booking.contactDetails?.name || user?.name || "Customer";

  if (!recipientEmail) {
    return { success: false, skipped: true, reason: "no-recipient-email" };
  }

  if (!hasMailConfig()) {
    console.log(`[CANCELLATION EMAIL SKIPPED] Missing email config. Cancellation email would be sent to ${recipientEmail} for booking ${booking._id}`);
    return { success: false, skipped: true, reason: "missing-mail-config" };
  }

  const summary = buildTicketSummary(booking);
  const serviceLabel = getServiceLabel(booking);
  const totalAmountPaid = Number(booking.totalFare) || 0;
  const refundAmount = Number(booking.refundAmount) || 0;
  const cancellationCharges = Math.max(totalAmountPaid - refundAmount, 0);
  const cancelledOn = formatDate(booking.cancellationDate || new Date());
  const manageUrl = `${FRONTEND_URL}/profile`;
  const refundLine = refundAmount > 0
    ? `The refund amount of ${formatCurrency(refundAmount)} has been instantly credited to your MakeMyTrip Wallet.`
    : "No refund is applicable for this cancellation as per the policy.";

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: recipientEmail,
    subject: `Booking Cancelled - ${serviceLabel} | MakeMyTrip`,
    text: [
      `Dear ${recipientName},`,
      "",
      "Greetings from MakeMyTrip!",
      "",
      "Your booking has been successfully cancelled. Below are the details of your refund:",
      "",
      `Booking ID: ${booking._id}`,
      `Service: ${serviceLabel}`,
      `Cancelled On: ${cancelledOn}`,
      "",
      "Refund Summary:",
      `- Total Amount Paid: ${formatCurrency(totalAmountPaid)}`,
      `- Cancellation Charges: ${formatCurrency(cancellationCharges)}`,
      `- Refund Amount: ${formatCurrency(refundAmount)}`,
      "",
      refundLine,
      "",
      `Cancelled Ticket Details: ${summary.title} | ${summary.origin} to ${summary.destination}`,
      `Travel / Check-in: ${summary.departAt}`,
      "",
      "You can use your wallet balance for future bookings across flights, hotels, buses, trains, cabs, and holiday packages.",
      `You can check your wallet balance anytime in My Wallet or My Bookings: ${manageUrl}`,
      "",
      `For any further assistance, feel free to contact our support team at ${SUPPORT_EMAIL}.`,
      "",
      "Thank you for choosing MakeMyTrip. We look forward to serving you again.",
      "",
      "Warm regards,",
      "Team MakeMyTrip"
    ].join("\n"),
    html: `
      <div style="margin:0;padding:0;background:#f4f7fb;font-family:Arial,sans-serif;color:#10213a;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:32px 16px;background:#f4f7fb;">
          <tr>
            <td align="center">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:680px;background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 18px 60px rgba(16,33,58,0.12);">
                <tr>
                  <td style="padding:28px 32px;background:linear-gradient(135deg,#7f1d1d 0%,#dc2626 100%);color:#ffffff;">
                    <div style="font-size:30px;font-weight:800;letter-spacing:-0.5px;">MakeMyTrip</div>
                    <div style="margin-top:10px;font-size:14px;opacity:0.86;">Booking cancellation confirmation</div>
                  </td>
                </tr>
                <tr>
                  <td style="padding:32px;">
                    <p style="margin:0 0 8px;font-size:15px;line-height:1.7;color:#334155;">Dear ${recipientName},</p>
                    <p style="margin:0 0 18px;font-size:15px;line-height:1.7;color:#334155;">Greetings from MakeMyTrip!</p>
                    <h1 style="margin:0 0 14px;font-size:28px;line-height:1.2;color:#0f172a;">Your booking has been successfully cancelled</h1>
                    <p style="margin:0 0 20px;font-size:15px;line-height:1.8;color:#334155;">
                      Below are the details of your cancelled ticket and refund summary.
                    </p>

                    <div style="margin:24px 0;padding:22px;border-radius:18px;background:#fff5f5;border:1px solid #fecaca;">
                      <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;">
                        <div>
                          <div style="font-size:12px;letter-spacing:0.16em;text-transform:uppercase;color:#64748b;margin-bottom:6px;">Booking ID</div>
                          <div style="font-size:18px;font-weight:700;color:#0f172a;">${booking._id}</div>
                        </div>
                        <div>
                          <div style="font-size:12px;letter-spacing:0.16em;text-transform:uppercase;color:#64748b;margin-bottom:6px;">Service</div>
                          <div style="font-size:18px;font-weight:700;color:#0f172a;">${serviceLabel}</div>
                        </div>
                        <div>
                          <div style="font-size:12px;letter-spacing:0.16em;text-transform:uppercase;color:#64748b;margin-bottom:6px;">Cancelled On</div>
                          <div style="font-size:16px;font-weight:700;color:#0f172a;">${cancelledOn}</div>
                        </div>
                        <div>
                          <div style="font-size:12px;letter-spacing:0.16em;text-transform:uppercase;color:#64748b;margin-bottom:6px;">Cancelled Ticket</div>
                          <div style="font-size:16px;font-weight:700;color:#0f172a;">${summary.title}</div>
                        </div>
                      </div>
                    </div>

                    <div style="padding:22px;border-radius:18px;background:#f8fafc;border:1px solid #e2e8f0;">
                      <div style="font-size:12px;letter-spacing:0.16em;text-transform:uppercase;color:#64748b;margin-bottom:16px;">Refund Summary</div>
                      <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                        <tr>
                          <td style="padding:8px 0;font-size:15px;color:#475569;">Total Amount Paid</td>
                          <td align="right" style="padding:8px 0;font-size:15px;font-weight:700;color:#0f172a;">${formatCurrency(totalAmountPaid)}</td>
                        </tr>
                        <tr>
                          <td style="padding:8px 0;font-size:15px;color:#475569;">Cancellation Charges</td>
                          <td align="right" style="padding:8px 0;font-size:15px;font-weight:700;color:#0f172a;">${formatCurrency(cancellationCharges)}</td>
                        </tr>
                        <tr>
                          <td style="padding:12px 0 0;font-size:16px;font-weight:700;color:#0f172a;">Refund Amount</td>
                          <td align="right" style="padding:12px 0 0;font-size:20px;font-weight:800;color:#16a34a;">${formatCurrency(refundAmount)}</td>
                        </tr>
                      </table>
                    </div>

                    <div style="margin-top:22px;padding:18px 20px;border-radius:16px;background:${refundAmount > 0 ? "#eff6ff" : "#fff7ed"};color:#0f172a;border:1px solid ${refundAmount > 0 ? "#bfdbfe" : "#fed7aa"};">
                      <div style="font-size:15px;line-height:1.8;color:#334155;">${refundLine}</div>
                    </div>

                    <div style="margin-top:22px;padding:18px 20px;border-radius:16px;background:#0f172a;color:#ffffff;">
                      <div style="font-size:12px;letter-spacing:0.16em;text-transform:uppercase;color:rgba(255,255,255,0.62);margin-bottom:8px;">Cancelled ticket details</div>
                      <div style="font-size:22px;font-weight:800;line-height:1.2;">${summary.origin} to ${summary.destination}</div>
                      <div style="margin-top:10px;font-size:14px;color:rgba(255,255,255,0.78);">${summary.subtitle} | ${summary.departAt}</div>
                    </div>

                    <div style="margin:28px 0 18px;">
                      <a href="${manageUrl}" style="display:inline-block;padding:14px 24px;border-radius:12px;background:#0b5bd3;color:#ffffff;text-decoration:none;font-size:15px;font-weight:700;">
                        View My Bookings
                      </a>
                    </div>

                    <p style="margin:0 0 10px;font-size:14px;line-height:1.8;color:#475569;">
                      You can check your wallet balance anytime in the <strong>My Wallet</strong> or <strong>My Bookings</strong> section.
                    </p>
                    <p style="margin:0;font-size:14px;line-height:1.8;color:#475569;">
                      For any further assistance, feel free to contact our support team at
                      <a href="mailto:${SUPPORT_EMAIL}" style="color:#0b5bd3;"> ${SUPPORT_EMAIL}</a>.
                    </p>

                    <p style="margin:18px 0 0;font-size:14px;line-height:1.8;color:#475569;">
                      Thank you for choosing MakeMyTrip. We look forward to serving you again.<br /><br />
                      Warm regards,<br />
                      <strong style="color:#0f172a;">Team MakeMyTrip</strong>
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </div>
    `
  };

  const transporter = createTransporter();
  await transporter.sendMail(mailOptions);
  return { success: true, skipped: false, recipientEmail };
};

const sendBookingPartialCancellationEmail = async ({ booking, user, details = {} }) => {
  const recipientEmail = booking.contactDetails?.email || user?.email;
  const recipientName = booking.contactDetails?.name || user?.name || "Customer";

  if (!recipientEmail) {
    return { success: false, skipped: true, reason: "no-recipient-email" };
  }

  if (!hasMailConfig()) {
    console.log(`[PARTIAL CANCELLATION EMAIL SKIPPED] Missing email config. Email would be sent to ${recipientEmail} for booking ${booking._id}`);
    return { success: false, skipped: true, reason: "missing-mail-config" };
  }

  const summary = buildTicketSummary(booking);
  const partialType = details.partialType === "room" ? "Room" : "Passenger";
  const cancelledItems = Array.isArray(details.cancelledItemNames) ? details.cancelledItemNames : [];
  const refundAmount = Number(details.refundAmount) || 0;
  const refundPercentage = Number(details.refundPercentage) || 0;
  const cancelledOn = formatDate(new Date());
  const manageUrl = `${FRONTEND_URL}/profile`;

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: recipientEmail,
    subject: `Partial Cancellation Confirmed - ${summary.title} | MakeMyTrip`,
    text: [
      `Dear ${recipientName},`,
      "",
      "Your partial cancellation request has been processed successfully.",
      "",
      `Booking ID: ${booking._id}`,
      `Service: ${summary.title}`,
      `Cancelled On: ${cancelledOn}`,
      `Cancelled ${partialType}${cancelledItems.length > 1 ? "s" : ""}: ${cancelledItems.length || 0}`,
      ...cancelledItems.map((item) => `- ${item}`),
      "",
      `Refund Amount: ${formatCurrency(refundAmount)} (${refundPercentage}%)`,
      refundAmount > 0
        ? `This refund has been credited to your MakeMyTrip Wallet.`
        : "No refund is applicable as per the policy.",
      "If any active travellers or rooms remain in this booking, their updated ticket details will be shared in a separate email.",
      "",
      `Manage booking: ${manageUrl}`,
      "",
      "Warm regards,",
      "Team MakeMyTrip"
    ].join("\n"),
    html: `
      <div style="margin:0;padding:24px;background:#f4f7fb;font-family:Arial,sans-serif;color:#10213a;">
        <div style="max-width:680px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;border:1px solid #dbeafe;">
          <div style="padding:22px 28px;background:linear-gradient(135deg,#1d4ed8 0%,#0ea5e9 100%);color:#fff;">
            <h2 style="margin:0;font-size:24px;">Partial Cancellation Confirmed</h2>
            <p style="margin:8px 0 0;font-size:13px;opacity:0.9;">Booking ID: ${booking._id}</p>
          </div>
          <div style="padding:24px 28px;">
            <p style="margin:0 0 14px;">Dear ${recipientName},</p>
            <p style="margin:0 0 14px;">We have processed your partial cancellation request.</p>
            <div style="padding:16px;border-radius:12px;background:#f8fafc;border:1px solid #e2e8f0;">
              <p style="margin:0 0 8px;"><strong>Service:</strong> ${summary.title}</p>
              <p style="margin:0 0 8px;"><strong>Cancelled On:</strong> ${cancelledOn}</p>
              <p style="margin:0 0 8px;"><strong>Cancelled ${partialType}${cancelledItems.length > 1 ? "s" : ""}:</strong> ${cancelledItems.length || 0}</p>
              ${cancelledItems.length > 0 ? `<ul style="margin:8px 0 0;padding-left:18px;">${cancelledItems.map((item) => `<li>${item}</li>`).join("")}</ul>` : ""}
            </div>
            <div style="margin-top:14px;padding:16px;border-radius:12px;background:#eff6ff;border:1px solid #bfdbfe;">
              <p style="margin:0 0 8px;"><strong>Refund Amount:</strong> ${formatCurrency(refundAmount)} (${refundPercentage}%)</p>
              <p style="margin:0;">${refundAmount > 0 ? "This amount has been credited to your MakeMyTrip Wallet." : "No refund is applicable as per policy."}</p>
            </div>
            <p style="margin:14px 0 0;font-size:14px;line-height:1.8;color:#475569;">
              If any active travellers or rooms remain in this booking, their updated ticket details will be shared in a separate email.
            </p>
            <p style="margin:18px 0 0;"><a href="${manageUrl}" style="display:inline-block;padding:10px 16px;border-radius:10px;background:#0b5bd3;color:#fff;text-decoration:none;">View My Bookings</a></p>
          </div>
        </div>
      </div>
    `
  };

  const transporter = createTransporter();
  await transporter.sendMail(mailOptions);
  return { success: true, skipped: false, recipientEmail };
};

module.exports = {
  sendBookingTicketEmail,
  sendBookingCancellationEmail,
  sendBookingPartialCancellationEmail
};
