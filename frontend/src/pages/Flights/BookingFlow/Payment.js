import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useBookings } from "../../../contexts/BookingContext";
import { useAuth } from "../../../contexts/AuthContext";
import { PaymentMethodSection } from "../../../components/booking/PaymentMethodSection";
import { API_BASE_URL } from "../../../utils/api";
import { buildFlightSuccessState } from "../../../utils/bookingSuccess";
import {
  buildBookingPaymentPayload,
  getWalletPaymentBreakdown,
  validateBookingPaymentDetails,
} from "../../../utils/walletPayment";
import { useToast } from "../../../contexts/ToastContext";
import { formatCurrency } from "../../../utils/currency";
import { getFlightPricing } from "./flightPricing";

const Payment = ({ data, onBack }) => {
  const navigate = useNavigate();
  const { addBooking } = useBookings();
  const { user } = useAuth();
  const { showToast } = useToast();

  const [paymentMethod, setPaymentMethod] = useState("upi");
  const [paymentSubOption, setPaymentSubOption] = useState("upiId");
  const [isProcessing, setIsProcessing] = useState(false);
  const [netBankingProvider, setNetBankingProvider] = useState("HDFC Bank");
  const [upiId, setUpiId] = useState("");
  const [selectedUpiApp, setSelectedUpiApp] = useState(null);
  const [cardType, setCardType] = useState("credit");
  const [cardData, setCardData] = useState({
    number: "",
    expiry: "",
    cvv: "",
    name: "",
  });
  const [errors, setErrors] = useState({});
  const selectedSeats = Array.isArray(data.selectedSeats) ? data.selectedSeats : [];
  const airlineName = data.flight?.airlineName || data.flight?.airline || "Flight";

  const pricing = useMemo(() => getFlightPricing(data), [data]);

  const breakdown = getWalletPaymentBreakdown({
    totalAmount: pricing.totalAmount,
    walletBalance: user?.walletBalance || 0,
    useWallet: paymentMethod === "wallet",
    walletAmountInput: pricing.totalAmount,
    paymentMethod,
  });

  const getBookingErrorMessage = (result, fallback) => {
    const detailMessages = result?.details
      ? Object.values(result.details)
          .map((item) => item?.message)
          .filter(Boolean)
          .join(", ")
      : "";

    return detailMessages || result?.error || result?.message || fallback;
  };

  const validateForm = () => {
    const newErrors = validateBookingPaymentDetails({
      paymentMethod,
      paymentSubOption,
      upiId,
      selectedUpiApp,
      cardData,
      netBankingProvider,
    });
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handlePay = async () => {
    if (paymentMethod !== "wallet" && !validateForm()) return;

    if (paymentMethod === "wallet" && breakdown.externalPayable > 0) {
      showToast({
        type: "warning",
        title: "Insufficient wallet balance",
        message: "Please use UPI, Card, or Net Banking for the remaining amount.",
      });
      return;
    }

    setIsProcessing(true);

    try {
      const payment = buildBookingPaymentPayload({
        paymentMethod,
        paymentSubOption,
        upiId,
        selectedUpiApp,
        cardType,
        cardData,
        netBankingProvider,
        walletApplied: breakdown.walletApplied,
        externalPayable: breakdown.externalPayable,
      });

      const fullBookingData = {
        userId: user?._id || user?.id,
        category: "flight",
        flight: data.flight,
        flightId: data.flight?._id,
        passengers: data.passengers,
        contactDetails: data.contactDetails,
        selectedSeats,
        addOns: data.addOns,
        selectedFare: data.selectedFare
          ? { type: data.selectedFare.type, price: data.selectedFare.price }
          : undefined,
        couponCode: data.couponCode || "",
        couponDiscount: pricing.couponDiscount,
        subtotalFare: pricing.subtotal,
        totalFare: pricing.totalAmount,
        date: data.travelDate || data.date || data.flight?.date,
        travelDate: data.travelDate || data.date || data.flight?.date,
        status: "Confirmed",
        payment,
      };

      const token = localStorage.getItem("token");
      const response = await fetch(`${API_BASE_URL}/bookings`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(fullBookingData),
      });

      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(getBookingErrorMessage(result, "Payment failed. Please try again."));
      }

      const finalizedBooking = addBooking({
        _id: result.booking?._id,
        category: "flight",
        status: "Confirmed",
        totalFare: pricing.totalAmount,
        couponCode: data.couponCode || "",
        couponDiscount: pricing.couponDiscount,
        createdAt: result.booking?.createdAt || new Date().toISOString(),
        travelDate: fullBookingData.travelDate,
        passengers: data.passengers,
        contactDetails: data.contactDetails,
        selectedSeats,
        payment,
        flight: data.flight,
        title: `${airlineName} (${data.flight.flightNumber})`,
        details: {
          route: `${data.flight.from} -> ${data.flight.to}`,
          date: fullBookingData.travelDate,
          traveller: `${data.passengers[0]?.firstName || ""} ${data.passengers[0]?.lastName || ""}`.trim(),
          seats: selectedSeats.map((seat) => seat.id).join(", "),
        },
        image: data.flight.logo,
      });

      setTimeout(() => {
        setIsProcessing(false);
        navigate("/booking-success", {
          state: buildFlightSuccessState({
            data,
            amount: pricing.totalAmount,
            bookingId: result.booking?._id || finalizedBooking.id,
            title: finalizedBooking.title,
            paymentMethod,
          }),
        });
      }, 1000);
    } catch (error) {
      console.error("Payment failed:", error);
      setIsProcessing(false);
      showToast({
        type: "error",
        title: "Payment failed",
        message: error.message || "Payment failed. Please try again.",
      });
    }
  };

  return (
    <div className="payment-step elite-design-v4">
      <div className="card-v4 premium-glass">
        <div className="section-header-row">
          <h3>
            <span>PAY</span> Secure Payment
          </h3>
          <div className="elite-badge">256-bit SSL</div>
        </div>

        <PaymentMethodSection
          paymentMethod={paymentMethod}
          setPaymentMethod={setPaymentMethod}
          paymentSubOption={paymentSubOption}
          setPaymentSubOption={setPaymentSubOption}
          netBankingProvider={netBankingProvider}
          setNetBankingProvider={setNetBankingProvider}
          upiId={upiId}
          setUpiId={setUpiId}
          selectedUpiApp={selectedUpiApp}
          setSelectedUpiApp={setSelectedUpiApp}
          cardType={cardType}
          setCardType={setCardType}
          cardData={cardData}
          setCardData={setCardData}
          errors={errors}
          walletBalance={user?.walletBalance || 0}
          totalAmount={pricing.totalAmount}
        />

        <div className="payment-order-summary mt-24">
          <h4 className="white-bold no-margin">Payment Summary</h4>
          <div className="summary-row mt-15">
            <span>Subtotal</span>
            <span>{formatCurrency(pricing.subtotal)}</span>
          </div>
          {pricing.couponDiscount > 0 && (
            <div className="summary-row coupon-discount-row">
              <span>Coupon ({pricing.coupon.code})</span>
              <span>-{formatCurrency(pricing.couponDiscount)}</span>
            </div>
          )}
          <div className="summary-row total-box">
            <span className="white-bold">Payable Amount</span>
            <span className="total-amt">{formatCurrency(pricing.totalAmount)}</span>
          </div>
        </div>

        <div className="secure-badge-v4 mt-24">
          <div className="info-icon-v4">SEC</div>
          <div>
            <p className="white-bold no-margin">Bank-grade secure checkout</p>
            <p className="secure-text-v4 no-margin">
              All payments are encrypted. Card details are never stored in plain text.
            </p>
          </div>
        </div>
      </div>

      <div className="booking-actions-shell">
        <button className="btn-elite-outline" onClick={onBack} disabled={isProcessing}>
          <span>&lt;-</span> BACK
        </button>
        <button className="btn-elite-primary" onClick={handlePay} disabled={isProcessing} style={{ minWidth: "260px" }}>
          {isProcessing
            ? "PROCESSING..."
            : breakdown.externalPayable > 0
              ? `PAY ${formatCurrency(breakdown.externalPayable)} NOW ->`
              : "CONFIRM BOOKING ->"}
        </button>
      </div>
    </div>
  );
};

export default Payment;
