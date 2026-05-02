import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useBookings } from "../../../contexts/BookingContext";
import { useAuth } from "../../../contexts/AuthContext";
import { PaymentMethodSection } from "../../../components/booking/PaymentMethodSection";
import { API_BASE_URL } from "../../../utils/api";
import { buildCabSuccessState } from "../../../utils/bookingSuccess";
import { buildBookingPaymentPayload, validateBookingPaymentDetails, getWalletPaymentBreakdown } from "../../../utils/walletPayment";
import { getCabPricingBreakdown } from "../../../utils/cabBooking";
import { useToast } from "../../../contexts/ToastContext";
import { formatCurrency } from "../../../utils/currency";

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
    name: ""
  });
  const [errors, setErrors] = useState({});

  const selectedCab = data.selectedCab || data.cab || {};
  const pricing = data.fareBreakdown || getCabPricingBreakdown(selectedCab, data.distance || 0);
  const preCouponTotal = Number(data.totalFare || data.price || pricing.total || 0);
  const couponDiscount = Math.min(Number(data.couponDiscount) || 0, preCouponTotal);
  const finalTotal = preCouponTotal - couponDiscount;

  const validateForm = () => {
    const newErrors = validateBookingPaymentDetails({
      paymentMethod,
      paymentSubOption,
      upiId,
      selectedUpiApp,
      cardData,
      netBankingProvider
    });
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handlePay = async () => {
    if (paymentMethod !== 'wallet' && !validateForm()) return;
    
    const breakdown = getWalletPaymentBreakdown({
      totalAmount: finalTotal,
      walletBalance: user?.walletBalance || 0,
      useWallet: paymentMethod === 'wallet',
      walletAmountInput: finalTotal,
      paymentMethod
    });

    if (paymentMethod === 'wallet' && breakdown.externalPayable > 0) {
      showToast({
        type: "warning",
        title: "Insufficient wallet balance",
        message: "Please use another method for the remaining amount."
      });
      return;
    }

    setIsProcessing(true);

    try {
      const token = localStorage.getItem("token");
      if (!token) {
        setIsProcessing(false);
        showToast({
          type: "warning",
          title: "Login required",
          message: "Please login to continue."
        });
        navigate("/login");
        return;
      }

      const payment = buildBookingPaymentPayload({
        paymentMethod,
        paymentSubOption,
        upiId,
        selectedUpiApp,
        cardType,
        cardData,
        netBankingProvider,
        walletApplied: breakdown.walletApplied,
        externalPayable: breakdown.externalPayable
      });

      const cabTypeId = selectedCab.id || selectedCab._id || data.cabId;
      const mainBookingData = {
        category: "cabs",
        cabId: cabTypeId,
        totalFare: finalTotal,
        pickupLocation: data.pickupLocation,
        dropLocation: data.dropLocation,
        pickupDateTime: data.pickupDateTime,
        travelDate: data.pickupDateTime,
        distance: data.distance,
        duration: data.duration,
        passengers: data.passengers,
        contactDetails: data.contactDetails,
        passengerName: `${data.passengers[0]?.firstName || ""} ${data.passengers[0]?.lastName || ""}`.trim(),
        passengerEmail: data.passengers[0]?.email || data.contactDetails?.email,
        passengerPhone: data.passengers[0]?.phone || data.contactDetails?.phone,
        specialRequirements: data.specialRequirements || "",
        cabType: selectedCab.name || "Cab",
        seats: selectedCab.seats || 4,
        baseFare: pricing.rideFare,
        perKmRate: selectedCab.perKmRate || 15,
        couponCode: data.couponCode || "",
        couponDiscount,
        subtotalFare: preCouponTotal,
        payment
      };

      const response = await fetch(`${API_BASE_URL}/bookings`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(mainBookingData)
      });

      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.message || "Booking failed");
      }

      addBooking({
        _id: result.booking?._id,
        category: "cabs",
        status: "Confirmed",
        totalFare: finalTotal,
        createdAt: result.booking?.createdAt || new Date().toISOString(),
        travelDate: data.pickupDateTime,
        passengers: data.passengers,
        contactDetails: data.contactDetails,
        couponCode: data.couponCode || "",
        couponDiscount,
        subtotalFare: preCouponTotal,
        payment,
        cab: {
          cabType: selectedCab.name || "Cab",
          pickupLocation: data.pickupLocation,
          dropLocation: data.dropLocation,
          pickupDateTime: data.pickupDateTime,
          distance: data.distance,
          duration: data.duration
        },
        title: `${selectedCab.name || "Cab"} Booking`,
        details: {
          route: `${data.pickupLocation} -> ${data.dropLocation}`,
          distance: `${Number(data.distance || 0).toFixed(2)} km`,
          traveller: `${data.passengers[0]?.firstName || ""} ${data.passengers[0]?.lastName || ""}`.trim()
        }
      });

      setTimeout(() => {
        setIsProcessing(false);
        navigate("/booking-success", {
          state: buildCabSuccessState({
            data,
            amount: finalTotal,
            bookingId: result.booking?._id,
            title: `${selectedCab.name || "Cab"} Selection`,
            paymentMethod
          })
        });
      }, 1500);
    } catch (error) {
      console.error("Payment failed:", error);
      setIsProcessing(false);
      showToast({
        type: "error",
        title: "Payment failed",
        message: error.message || "Payment failed. Please try again."
      });
    }
  };

  const breakdown = getWalletPaymentBreakdown({
    totalAmount: finalTotal,
    walletBalance: user?.walletBalance || 0,
    useWallet: paymentMethod === 'wallet',
    walletAmountInput: finalTotal,
    paymentMethod
  });

  return (
    <div className="payment-step elite-design-v4">
      <div className="card-v4 premium-glass">
        <div className="section-header-row">
          <div className="label-col">
            <span className="elite-badge">Secure Checkout</span>
            <h3 className="no-margin mt-10"><span>Pay</span> Final Payment</h3>
          </div>
          <div className="secure-badge-v4" style={{ marginTop: 0, padding: '10px 20px' }}>
             <span className="secure-text-v4">🔒 256-BIT SSL SECURE</span>
          </div>
        </div>

        <div className="mt-30">
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
            totalAmount={finalTotal}
          />
        </div>
      </div>

      <div className="card-v4 glass-info mt-24">
        <div className="impact-row no-margin">
           <span className="label-text-dim">PAYMENT SECURITY PIN</span>
           <span className="info-text-sm-dim">Your transactions are protected by industry-standard encryption.</span>
        </div>
      </div>

      {/* ── ACTIONS ── */}
      <div className="booking-actions-shell mt-40">
        <button className="btn-elite-outline" onClick={onBack} disabled={isProcessing}>
          <span>←</span> Back to Travellers
        </button>
        <button 
          className="btn-elite-primary" 
          onClick={handlePay} 
          disabled={isProcessing} 
          style={{ minWidth: "320px", background: 'var(--blue-grad)', boxShadow: '0 15px 40px var(--blue-glow)' }}
        >
          {isProcessing ? (
            <div className="loading-spinner-mmt" style={{ width: '20px', height: '20px', borderWidth: '2px' }}></div>
          ) : (
            breakdown.externalPayable > 0 
              ? `PROCEED TO PAY ${formatCurrency(breakdown.externalPayable)} NOW`
              : "CONFIRM & BOOK CAB NOW"
          )}
        </button>
      </div>
    </div>
  );
};

export default Payment;
