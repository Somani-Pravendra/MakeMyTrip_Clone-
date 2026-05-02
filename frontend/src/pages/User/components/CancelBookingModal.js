import React, { useEffect, useState } from "react";
import { useAuth } from "../../../contexts/AuthContext";
import { useBookings } from "../../../contexts/BookingContext";
import { useToast } from "../../../contexts/ToastContext";
import API_BASE_URL from "../../../utils/api";
import { formatCurrency } from "../../../utils/currency";
import { resolveBookingCancellationDate } from "../../../utils/bookingDates";
import "./CancelBookingModal.css";

const normalizeCategory = (value = "") => {
  const category = String(value || "").trim().toLowerCase();
  if (category === "flights") return "flight";
  if (category === "trains") return "train";
  if (category === "buses") return "bus";
  if (category === "hotels") return "hotel";
  return category;
};

const getRefundPercent = (booking) => {
  const effectiveTravelDate = resolveBookingCancellationDate(booking);
  if (!effectiveTravelDate) return 0;
  const diffHrs = (effectiveTravelDate - new Date()) / (1000 * 60 * 60);
  if (diffHrs > 48) return 90;
  if (diffHrs >= 24) return 75;
  if (diffHrs >= 12) return 50;
  if (diffHrs >= 6) return 25;
  if (diffHrs >= 2) return 12;
  return 0;
};

const allocateFareShares = (totalFare, count) => {
  const total = Number(totalFare) || 0;
  const c = Number(count) || 0;
  if (c <= 0) return [];
  const base = Math.floor(total / c);
  const rem = total - (base * c);
  return Array.from({ length: c }, (_, index) => base + (index < rem ? 1 : 0));
};

const normalizeAmount = (value = 0) => {
  const amount = Number(value);
  return Number.isFinite(amount) && amount > 0 ? amount : 0;
};

const getFriendlyPaymentMethod = (value = "") => {
  const method = String(value || "").trim().toLowerCase();
  if (!method || method === "online") return "original payment method";
  if (method.includes("wallet")) return "MakeMyTrip Wallet";
  if (method.includes("upi")) return "UPI";
  if (method.includes("netbanking") || method.includes("net banking")) return "Net Banking";
  if (method.includes("card") || method.includes("credit") || method.includes("debit") || method.includes("rupay")) {
    return "Card";
  }
  return "original payment method";
};

const getRefundDestinationLabel = (booking = {}, details = {}) => {
  const explicitDestination = String(
    details?.refundDestination || booking?.refundDestination || booking?.payment?.refundDestination || ""
  ).trim().toLowerCase();

  if (explicitDestination.includes("wallet")) return "MakeMyTrip Wallet";

  if (explicitDestination.includes("original") || explicitDestination.includes("payment")) {
    return getFriendlyPaymentMethod(details?.refundPaymentMethod || booking?.payment?.externalPaymentMethod || booking?.payment?.method);
  }

  if (Object.prototype.hasOwnProperty.call(details || {}, "newWalletBalance")) {
    return "MakeMyTrip Wallet";
  }

  return getFriendlyPaymentMethod(booking?.payment?.externalPaymentMethod || booking?.payment?.method || "wallet");
};

const getFareBreakdown = ({ totalOriginalFare = 0, cancelledBaseAmount = 0, refundAmount = 0, partial = false }) => {
  const totalFareValue = normalizeAmount(totalOriginalFare);
  const cancelledBaseValue = Math.min(normalizeAmount(cancelledBaseAmount), totalFareValue);
  const refundValue = Math.min(normalizeAmount(refundAmount), totalFareValue);
  const remainingActiveFare = partial ? Math.max(totalFareValue - cancelledBaseValue, 0) : 0;
  const cancellationCharges = Math.max(cancelledBaseValue - refundValue, 0);

  return {
    totalOriginalFare: totalFareValue,
    cancelledBaseAmount: cancelledBaseValue,
    refundAmount: refundValue,
    remainingActiveFare,
    cancellationCharges
  };
};

const parseApiResponse = async (response) => {
  const rawText = await response.text();
  if (!rawText) return { data: null, rawText: "" };

  try {
    return { data: JSON.parse(rawText), rawText };
  } catch {
    return { data: null, rawText };
  }
};

const CancelBookingModal = ({ booking, onClose, onSuccess }) => {
  const { user, updateUser } = useAuth();
  const { cancelBooking: cancelLocalBooking } = useBookings();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [successState, setSuccessState] = useState(null);
  const [mode, setMode] = useState("full");
  const [selectedPassengerIndexes, setSelectedPassengerIndexes] = useState([]);
  const [selectedRoomIndexes, setSelectedRoomIndexes] = useState([]);

  const safeBooking = booking || {};
  const category = normalizeCategory(safeBooking.category);
  const refundPercent = getRefundPercent(safeBooking);

  const passengers = Array.isArray(safeBooking.passengers) ? safeBooking.passengers : [];
  const passengerFallbackShares = allocateFareShares(safeBooking.totalFare || 0, passengers.length);
  const passengerItems = passengers
    .map((passenger, index) => {
      const fullName = [passenger?.firstName, passenger?.lastName].filter(Boolean).join(" ").trim() || `Passenger ${index + 1}`;
      const isCancelled = String(passenger?.status || "").toLowerCase() === "cancelled";
      const fareShare = Number(passenger?.fareShare) > 0 ? Number(passenger.fareShare) : passengerFallbackShares[index] || 0;
      const passengerId = String(passenger?.passengerId || "").trim();
      return { index, passengerId, fullName, fareShare, isCancelled };
    })
    .filter((item) => !item.isCancelled);

  const rooms = Array.isArray(safeBooking?.hotel?.rooms) ? safeBooking.hotel.rooms : [];
  const roomFallbackShares = allocateFareShares(safeBooking.totalFare || 0, rooms.length);
  const roomItems = rooms
    .map((room, index) => {
      const isCancelled = String(room?.status || "").toLowerCase() === "cancelled";
      const roomType = String(room?.roomType || `Room ${index + 1}`).trim();
      const roomId = String(room?.roomId || `ROOM-${index + 1}`).trim();
      const roomFare = Number(room?.roomFare) > 0 ? Number(room.roomFare) : roomFallbackShares[index] || 0;
      return { index, roomType, roomId, roomFare, isCancelled };
    })
    .filter((item) => !item.isCancelled);

  const supportsPassengerPartial = ["flight", "train", "bus"].includes(category) && passengerItems.length > 1;
  const supportsRoomPartial = category === "hotel" && roomItems.length > 1;
  const supportsPartial = supportsPassengerPartial || supportsRoomPartial;
  const partialEligibleCategory = ["flight", "train", "bus", "hotel"].includes(category);
  const activeItemCount = ["flight", "train", "bus"].includes(category) ? passengerItems.length : (category === "hotel" ? roomItems.length : 0);
  const partialSupportMessage = supportsPartial
    ? ["flight", "train", "bus"].includes(category)
      ? `Partial cancellation is available because this booking has ${passengerItems.length} active passenger${passengerItems.length === 1 ? "" : "s"}.`
      : `Partial cancellation is available because this booking has ${roomItems.length} active room${roomItems.length === 1 ? "" : "s"}.`
    : partialEligibleCategory
      ? `Partial cancellation is not available because only ${activeItemCount} active ${["flight", "train", "bus"].includes(category) ? "passenger" : "room"}${activeItemCount === 1 ? "" : "s"} ${activeItemCount === 1 ? "is" : "are"} left in this booking.`
      : "Partial cancellation is currently available only for flight, train, bus and hotel bookings.";

  const totalOriginalFare = normalizeAmount(safeBooking.totalFare || 0);

  useEffect(() => {
    setMode(supportsPartial ? "partial" : "full");
    setSelectedPassengerIndexes([]);
    setSelectedRoomIndexes([]);
    setSuccessState(null);
  }, [booking, supportsPartial]);

  let selectedBaseAmount = Number(safeBooking.totalFare || 0);
  if (mode === "partial") {
    if (supportsPassengerPartial) {
      selectedBaseAmount = selectedPassengerIndexes.reduce((sum, index) => {
        const selectedItem = passengerItems.find((item) => item.index === index);
        return sum + (selectedItem?.fareShare || 0);
      }, 0);
    } else if (supportsRoomPartial) {
      selectedBaseAmount = selectedRoomIndexes.reduce((sum, index) => {
        const selectedItem = roomItems.find((item) => item.index === index);
        return sum + (selectedItem?.roomFare || 0);
      }, 0);
    } else {
      selectedBaseAmount = 0;
    }
  }

  const estimatedRefund = Math.floor((selectedBaseAmount || 0) * (refundPercent / 100));
  const hasSelection = mode === "full" || selectedBaseAmount > 0;
  const isPartial = mode === "partial" && supportsPartial;
  const cancelledRefundLabel = isPartial
    ? (category === "hotel" ? "Cancelled Room Refund" : "Cancelled Traveller Refund")
    : "Cancellation Refund";
  const estimatedBreakdown = getFareBreakdown({
    totalOriginalFare,
    cancelledBaseAmount: isPartial ? selectedBaseAmount : totalOriginalFare,
    refundAmount: estimatedRefund,
    partial: isPartial
  });
  const estimatedRefundDestination = getRefundDestinationLabel(safeBooking);
  const confirmHeading = isPartial ? "Are you sure you want to cancel the selected items?" : "Are you sure you want to cancel this booking?";
  const confirmCopy = isPartial
    ? "Only the selected passengers or rooms will be cancelled. This action will be processed immediately."
    : "Your booking will be cancelled immediately and the refund will be applied according to the policy below.";
  const confirmButtonLabel = loading
    ? "Processing..."
    : isPartial
      ? "Yes, Cancel Selected"
      : "Yes, Cancel Booking";
  const secondaryButtonLabel = isPartial ? "Keep Current Booking" : "Keep Booking";

  const toggleIndex = (index, selectedList, setter) => {
    if (selectedList.includes(index)) {
      setter(selectedList.filter((item) => item !== index));
    } else {
      setter([...selectedList, index]);
    }
  };

  const handleConfirmCancel = async () => {
    setLoading(true);
    try {
      if (safeBooking.__local || safeBooking.source === "local-cache") {
        if (mode === "partial") {
          showToast({ type: "error", title: "Partial cancellation unavailable", message: "Partial cancellation is available only for server-synced bookings." });
          setLoading(false);
          return;
        }
        cancelLocalBooking(safeBooking.id || safeBooking._id);
        setSuccessState({
          title: "Booking Cancelled",
          message: "This locally saved booking has been marked as cancelled successfully.",
          walletCreditMessage: "",
          refundDestinationLabel: "MakeMyTrip Wallet",
          refundAmount: 0,
          refundPercentage: 0,
          totalOriginalFare,
          remainingActiveFare: 0,
          cancelledBaseAmount: totalOriginalFare,
          cancellationCharges: totalOriginalFare,
          cancelledRefundLabel: "Cancellation Refund",
          partial: false
        });
        return;
      }

      const token = localStorage.getItem("token");
      const endpoint = isPartial ? `${API_BASE_URL}/bookings/${safeBooking._id}/cancel/partial` : `${API_BASE_URL}/bookings/${safeBooking._id}/cancel`;

      const payload = isPartial
        ? (supportsPassengerPartial
          ? {
              passengerIndexes: selectedPassengerIndexes,
              passengerIds: selectedPassengerIndexes
                .map((index) => passengerItems.find((item) => item.index === index)?.passengerId)
                .filter(Boolean)
            }
          : { roomIndexes: selectedRoomIndexes, roomIds: selectedRoomIndexes.map((index) => roomItems.find((room) => room.index === index)?.roomId).filter(Boolean) })
        : null;

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          ...(payload ? { "Content-Type": "application/json" } : {})
        },
        ...(payload ? { body: JSON.stringify(payload) } : {})
      });

      const { data: result, rawText } = await parseApiResponse(response);

      if (!response.ok) {
        const fallback = `Cancellation failed with status ${response.status}.`;
        const looksLikeHtmlError = typeof rawText === "string" && rawText.toLowerCase().includes("<html");

        if (isPartial && response.status === 404) {
          throw new Error("Partial cancellation API not found. Please restart backend server.");
        }

        if (looksLikeHtmlError) {
          throw new Error(result?.message || `Server returned an unexpected response (${response.status}).`);
        }

        throw new Error(result?.message || rawText || fallback);
      }

      if (!result.success) {
        throw new Error(result.message || "Cancellation failed.");
      }

      const refundAmount = Number(result.details?.refundAmount || 0);
      const refundPercentage = Number(result.details?.refundPercentage || 0);
      const bookingStatus = result.details?.bookingStatus || "";
      const successTitle = isPartial ? "Partial Cancellation Completed" : "Booking Cancelled";
      const refundDestinationLabel = getRefundDestinationLabel(safeBooking, result.details);
      const emailSent = Boolean(result.notification?.emailSent);
      const emailStatusMessage = !emailSent && !(safeBooking.__local || safeBooking.source === "local-cache")
        ? "Cancellation completed, but the email confirmation could not be sent. You can resend it from Booking History."
        : "";
      const walletCreditMessage = refundAmount > 0
        ? `${formatCurrency(refundAmount)} successfully credited to your ${refundDestinationLabel}.`
        : isPartial
          ? "Selected items cancelled successfully. No refund is applicable for this selection."
          : "Booking cancelled successfully. No refund is applicable for this booking.";
      const successBreakdown = getFareBreakdown({
        totalOriginalFare,
        cancelledBaseAmount: isPartial ? selectedBaseAmount : totalOriginalFare,
        refundAmount,
        partial: Boolean(result.details?.partial)
      });

      updateUser({
        ...user,
        walletBalance: result.details?.newWalletBalance ?? user?.walletBalance ?? 0
      });

      showToast({
        type: "success",
        title: successTitle,
        message: bookingStatus
          ? `${walletCreditMessage} Booking status: ${bookingStatus}.`
          : walletCreditMessage
      });

      if (emailStatusMessage) {
        showToast({
          type: "info",
          title: "Email not sent",
          message: emailStatusMessage
        });
      }

      setSuccessState({
        title: successTitle,
        message: bookingStatus
          ? `${walletCreditMessage} Booking status: ${bookingStatus}.`
          : walletCreditMessage,
        walletCreditMessage,
        refundDestinationLabel,
        refundAmount,
        refundPercentage,
        totalOriginalFare: successBreakdown.totalOriginalFare,
        remainingActiveFare: successBreakdown.remainingActiveFare,
        cancelledBaseAmount: successBreakdown.cancelledBaseAmount,
        cancellationCharges: successBreakdown.cancellationCharges,
        cancelledRefundLabel,
        partial: Boolean(result.details?.partial),
        cancelledItems: Array.isArray(result.details?.cancelledItems) ? result.details.cancelledItems : [],
        bookingStatus,
        emailStatusMessage
      });
    } catch (error) {
      console.error("Frontend cancellation error:", error);
      showToast({ type: "error", title: "Cancellation failed", message: error.message || "Something went wrong. Please try again." });
    } finally {
      setLoading(false);
    }
  };

  const handleSuccessClose = () => {
    onSuccess();
    onClose();
  };

  if (!booking) return null;

  return (
    <div className="cb-overlay" onClick={(event) => event.target === event.currentTarget && onClose()}>
      <div className={`cb-modal premium-glass ${successState ? "cb-modal--success" : ""}`}>
        <button className="cb-close-btn" onClick={onClose} aria-label="Close cancellation dialog">&times;</button>
        <div className="cb-modal-content">
          {successState ? (
            <div className="cb-success-state">
            <div className="cb-success-icon" aria-hidden="true">✓</div>
            <h2>{successState.title}</h2>
            <p>{successState.message}</p>

            <div className="cb-success-summary">
              <div className="cb-success-summary__item">
                <span>Refund</span>
                <strong>{formatCurrency(successState.refundAmount)}</strong>
              </div>
              <div className="cb-success-summary__item">
                <span>Refund %</span>
                <strong>{successState.refundPercentage}%</strong>
              </div>
              {successState.bookingStatus && (
                <div className="cb-success-summary__item">
                  <span>Status</span>
                  <strong>{successState.bookingStatus}</strong>
                </div>
              )}
            </div>

            <div className="cb-fare-breakdown">
              <div className="cb-fare-breakdown__row">
                <span>Total Original Fare</span>
                <strong>{formatCurrency(successState.totalOriginalFare || 0)}</strong>
              </div>
              <div className="cb-fare-breakdown__row">
                <span>{successState.cancelledRefundLabel || "Cancellation Refund"}</span>
                <strong>{formatCurrency(successState.refundAmount || 0)}</strong>
              </div>
              <div className="cb-fare-breakdown__row">
                <span>Remaining Active Fare</span>
                <strong>{formatCurrency(successState.remainingActiveFare || 0)}</strong>
              </div>
            </div>

              {successState.walletCreditMessage && (
                <div className={`cb-wallet-credit ${successState.refundAmount > 0 ? "cb-wallet-credit--success" : ""}`}>
                  <strong>Refund Update</strong>
                  <p>{successState.walletCreditMessage}</p>
                {successState.refundDestinationLabel && (
                  <p className="cb-wallet-credit__meta">Refund destination: {successState.refundDestinationLabel}</p>
                )}
                {successState.cancellationCharges > 0 && (
                  <p className="cb-wallet-credit__meta">
                    Cancellation charges retained: {formatCurrency(successState.cancellationCharges)}
                  </p>
                )}
                </div>
              )}

              {successState.emailStatusMessage && (
                <div className="cb-wallet-credit">
                  <strong>Email Update</strong>
                  <p>{successState.emailStatusMessage}</p>
                </div>
              )}

              {successState.partial && successState.cancelledItems?.length > 0 && (
                <div className="cb-success-list">
                <span className="cb-success-list__label">Cancelled Items</span>
                <p>{successState.cancelledItems.join(", ")}</p>
              </div>
            )}

            <div className="cb-actions cb-actions--success">
              <button className="cb-confirm-btn" onClick={handleSuccessClose}>Done</button>
            </div>
            </div>
          ) : (
            <>
            <div className="cb-header">
              <div className="cb-danger-icon" aria-hidden="true">!</div>
              <h2>{isPartial ? "Cancel Selected Items?" : "Cancel Booking?"}</h2>
              <p>{confirmHeading}</p>
            </div>

            <div className="cb-warning-note">
              <strong>Confirmation Required</strong>
              <span>{confirmCopy}</span>
            </div>

            <div className={`cb-partial-note ${supportsPartial ? "cb-partial-note--active" : ""}`}>
              <strong>{supportsPartial ? "Partial Option Available" : "Partial Option Unavailable"}</strong>
              <span>{partialSupportMessage}</span>
            </div>

            {supportsPartial && (
              <div className="cb-mode-switch">
                <button className={`cb-mode-btn ${mode === "partial" ? "active" : ""}`} onClick={() => setMode("partial")}>Partial Cancellation</button>
                <button className={`cb-mode-btn ${mode === "full" ? "active" : ""}`} onClick={() => setMode("full")}>Full Cancellation</button>
              </div>
            )}

            {mode === "partial" && supportsPassengerPartial && (
              <div className="cb-selection-card">
                <h4>Select Passenger(s)</h4>
                {passengerItems.map((item) => (
                  <label key={item.index} className="cb-item-row">
                    <input type="checkbox" checked={selectedPassengerIndexes.includes(item.index)} onChange={() => toggleIndex(item.index, selectedPassengerIndexes, setSelectedPassengerIndexes)} />
                    <span>{item.fullName}</span>
                    <strong>{formatCurrency(item.fareShare)}</strong>
                  </label>
                ))}
              </div>
            )}

            {mode === "partial" && supportsRoomPartial && (
              <div className="cb-selection-card">
                <h4>Select Room(s)</h4>
                {roomItems.map((item) => (
                  <label key={item.index} className="cb-item-row">
                    <input type="checkbox" checked={selectedRoomIndexes.includes(item.index)} onChange={() => toggleIndex(item.index, selectedRoomIndexes, setSelectedRoomIndexes)} />
                    <span>{item.roomType} ({item.roomId})</span>
                    <strong>{formatCurrency(item.roomFare)}</strong>
                  </label>
                ))}
              </div>
            )}

            <div className="cb-policy-card">
              <div className="cb-policy-head"><span>PROPOSED REFUND POLICY</span></div>
              <table className="cb-refund-table">
                <thead><tr><th>Time Remaining</th><th>Refund %</th></tr></thead>
                <tbody>
                  <tr className={refundPercent === 90 ? "highlight" : ""}><td>&gt; 48 hours</td><td>90% refund</td></tr>
                  <tr className={refundPercent === 75 ? "highlight" : ""}><td>24 - 48 hours</td><td>75% refund</td></tr>
                  <tr className={refundPercent === 50 ? "highlight" : ""}><td>12 - 24 hours</td><td>50% refund</td></tr>
                  <tr className={refundPercent === 25 ? "highlight" : ""}><td>6 - 12 hours</td><td>25% refund</td></tr>
                  <tr className={refundPercent === 12 ? "highlight" : ""}><td>2 - 6 hours</td><td>12% refund</td></tr>
                  <tr className={refundPercent === 0 ? "highlight" : ""}><td>&lt; 2 hours</td><td>0% refund</td></tr>
                </tbody>
              </table>
              <div className="cb-estimated-refund">
                <div className="refund-label">ESTIMATED REFUND</div>
                <div className="refund-amount-box">
                  <span className="amount">{formatCurrency(estimatedRefund)}</span>
                  <span className="percent-tag">({refundPercent}%)</span>
                </div>
                <div className="cb-fare-breakdown cb-fare-breakdown--compact">
                  <div className="cb-fare-breakdown__row">
                    <span>Total Original Fare</span>
                    <strong>{formatCurrency(estimatedBreakdown.totalOriginalFare)}</strong>
                  </div>
                  <div className="cb-fare-breakdown__row">
                    <span>{cancelledRefundLabel}</span>
                    <strong>{formatCurrency(estimatedBreakdown.refundAmount)}</strong>
                  </div>
                  <div className="cb-fare-breakdown__row">
                    <span>Remaining Active Fare</span>
                    <strong>{formatCurrency(estimatedBreakdown.remainingActiveFare)}</strong>
                  </div>
                </div>
                <p className="cb-base-note">
                  Applied on selected base fare: {formatCurrency(isPartial ? selectedBaseAmount : totalOriginalFare)}.
                  Refund will reflect in {estimatedRefundDestination}.
                </p>
                {estimatedBreakdown.cancellationCharges > 0 && (
                  <p className="cb-charge-note">
                    Cancellation charges retained: {formatCurrency(estimatedBreakdown.cancellationCharges)}
                  </p>
                )}
              </div>
            </div>

            <div className="cb-actions">
              <button className="cb-confirm-btn" onClick={handleConfirmCancel} disabled={loading || !hasSelection}>
                {confirmButtonLabel}
              </button>
              <button className="cb-back-btn" onClick={onClose}>{secondaryButtonLabel}</button>
            </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default CancelBookingModal;
