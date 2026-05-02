import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useBookings } from "../../../contexts/BookingContext";
import { useAuth } from "../../../contexts/AuthContext";
import { PaymentMethodSection } from "../../../components/booking/PaymentMethodSection";
import { API_BASE_URL } from "../../../utils/api";
import { buildHotelSuccessState } from "../../../utils/bookingSuccess";
import { buildBookingPaymentPayload, validateBookingPaymentDetails, getWalletPaymentBreakdown } from "../../../utils/walletPayment";
import { useToast } from "../../../contexts/ToastContext";
import { formatCurrency } from "../../../utils/currency";
import { getHotelMealSelections, getHotelMealAddOnTotal } from "../../../utils/hotelAddOns";

const HotelPayment = ({ data, onBack }) => {
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

    const guestCount = Math.max(Number(data.guests) || 1, 1);
    const nights = data.checkIn && data.checkOut
        ? Math.ceil((new Date(data.checkOut) - new Date(data.checkIn)) / (1000 * 60 * 60 * 24))
        : 1;
    const roomPrice = data.selectedRoom?.pricePerNight || data.basePrice || 0;
    const staySubtotal = roomPrice * nights;
    const selectedMeals = getHotelMealSelections(data.experienceAddOns, guestCount);
    const addOnSubtotal = getHotelMealAddOnTotal(data.experienceAddOns, guestCount);
    const subtotal = staySubtotal + addOnSubtotal;
    const taxes = Math.round(subtotal * 0.12);
    const convenienceFee = 150;
    const preCouponTotal = subtotal + taxes + convenienceFee;
    const couponDiscount = Math.min(Number(data.couponDiscount) || 0, preCouponTotal);
    const finalTotal = preCouponTotal - couponDiscount;

    const getBookingErrorMessage = (result, fallback) => {
        const detailMessages = result?.details
            ? Object.values(result.details).map((item) => item?.message).filter(Boolean).join(", ")
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
            netBankingProvider
        });
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handlePay = async () => {
        // Breakdown already calculated in render scope for consistent UI
        if (paymentMethod !== 'wallet' && !validateForm()) return;
        if (paymentMethod === 'wallet' && breakdown.externalPayable > 0) {
            showToast({
                type: "warning",
                title: "Insufficient wallet balance",
                message: "Please use UPI, Card, or Net Banking for the remaining amount."
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
                externalPayable: breakdown.externalPayable
            });

            const fullBookingData = {
                userId: user?._id || user?.id,
                category: "hotel",
                hotel: {
                    ...data.hotel,
                    checkIn: data.checkIn,
                    checkOut: data.checkOut,
                    guests: data.guests,
                    roomType: data.selectedRoom?.type || data.roomType || "Standard"
                },
                hotelId: data.hotel?._id,
                passengers: data.passengers,
                contactDetails: data.contactDetails,
                preferences: data.preferences,
                experienceAddOns: data.experienceAddOns,
                checkIn: data.checkIn,
                checkOut: data.checkOut,
                travelDate: data.checkIn,
                guests: data.guests,
                selectedRoom: data.selectedRoom,
                couponCode: data.couponCode || "",
                couponDiscount,
                subtotalFare: preCouponTotal,
                totalFare: finalTotal,
                status: "Confirmed",
                payment
            };

            const token = localStorage.getItem("token");
            const response = await fetch(`${API_BASE_URL}/bookings`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify(fullBookingData)
            });

            const result = await response.json();
            if (!response.ok || !result.success) {
                throw new Error(getBookingErrorMessage(result, "Payment failed. Please try again."));
            }

            const finalizedBooking = addBooking({
                _id: result.booking?._id,
                category: "hotel",
                status: "Confirmed",
                totalFare: finalTotal,
                createdAt: result.booking?.createdAt || new Date().toISOString(),
                travelDate: data.checkIn,
                passengers: data.passengers,
                contactDetails: data.contactDetails,
                preferences: data.preferences,
                experienceAddOns: data.experienceAddOns,
                couponCode: data.couponCode || "",
                couponDiscount,
                subtotalFare: preCouponTotal,
                payment,
                hotel: data.hotel,
                checkInDate: data.checkIn,
                checkOutDate: data.checkOut,
                roomType: data.selectedRoom?.type || data.roomType || "Standard",
                title: data.hotel.name,
                details: {
                    location: `${data.hotel.location.city}, ${data.hotel.location.state}`,
                    checkIn: data.checkIn,
                    checkOut: data.checkOut,
                    nights,
                    guests: `${data.guests} Adult(s)`,
                    roomType: data.selectedRoom?.type || "Standard",
                    bedType: data.preferences?.bedType || "Default",
                    traveller: `${data.passengers[0]?.firstName || ""} ${data.passengers[0]?.lastName || ""}`.trim()
                },
                image: data.hotel.images?.[0] || "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400"
            });

            setTimeout(() => {
                setIsProcessing(false);
                navigate("/booking-success", {
                    state: buildHotelSuccessState({
                        data,
                        amount: finalTotal,
                        bookingId: result.booking?._id || finalizedBooking.id,
                        title: finalizedBooking.title,
                        paymentMethod,
                        basePrice: preCouponTotal,
                        convenienceFee
                    })
                });
            }, 1000);
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
                    <h3><span>Pay</span> Secure Payment</h3>
                    <div className="elite-badge">Verified Checkout</div>
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
                    totalAmount={finalTotal}
                />

                <div className="payment-order-summary">
                    <div className="summary-row">
                        <span>Stay Charges</span>
                        <span>{formatCurrency(staySubtotal)}</span>
                    </div>
                    {selectedMeals.map((meal) => (
                        <div className="summary-row" key={meal.key}>
                            <span>{meal.label} ({guestCount} Guest{guestCount > 1 ? "s" : ""})</span>
                            <span>{formatCurrency(meal.totalPrice)}</span>
                        </div>
                    ))}
                    <div className="summary-row">
                        <span>Taxes & Fees</span>
                        <span>{formatCurrency(taxes)}</span>
                    </div>
                    <div className="summary-row">
                        <span>Convenience Fee</span>
                        <span>{formatCurrency(convenienceFee)}</span>
                    </div>
                    {couponDiscount > 0 && (
                        <div className="summary-row coupon-discount-row">
                            <span>Coupon Discount</span>
                            <span>-{formatCurrency(couponDiscount)}</span>
                        </div>
                    )}
                    <div className="summary-row total-box">
                        <span className="white-bold">Payable Amount</span>
                        <span className="total-amt">{formatCurrency(finalTotal)}</span>
                    </div>
                </div>
            </div>

            <div className="booking-actions-shell">
                <button className="btn-elite-outline" onClick={onBack} disabled={isProcessing}>
                    <span>←</span> BACK
                </button>
                <button className="btn-elite-primary payment-submit-btn" onClick={handlePay} disabled={isProcessing}>
                    {isProcessing ? "PROCESSING..." : (
                        breakdown.externalPayable > 0 
                            ? `PAY ${formatCurrency(breakdown.externalPayable)} NOW`
                            : "CONFIRM BOOKING"
                    )}
                </button>
            </div>
        </div>
    );
};

export default HotelPayment;
