import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useBookings } from "../../../contexts/BookingContext";
import { useAuth } from "../../../contexts/AuthContext";
import { PaymentMethodSection } from "../../../components/booking/PaymentMethodSection";
import { API_BASE_URL } from "../../../utils/api";
import { buildBusSuccessState } from "../../../utils/bookingSuccess";
import { buildBookingPaymentPayload, validateBookingPaymentDetails, getWalletPaymentBreakdown } from "../../../utils/walletPayment";
import { useToast } from "../../../contexts/ToastContext";
import { formatCurrency } from "../../../utils/currency";

const getAddonLineTotal = (item = {}) => {
    const quantity = Math.max(Number(item.quantity) || 1, 1);
    const explicitTotal = Number(item.totalPrice);
    if (Number.isFinite(explicitTotal) && explicitTotal > 0) return explicitTotal;
    return (Number(item.price) || 0) * quantity;
};

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

    const selectedSeats = data.selectedSeats || [];
    const seatCount = selectedSeats.length;
    const selectedMeals = data.addOns?.meals || [];
    const perSeatPrice = data.bus?.price || data.bus?.fare || data.basePrice || 0;
    const baseFare = seatCount * perSeatPrice;
    const taxes = Math.round(baseFare * 0.05);
    const convenienceFee = seatCount > 0 ? 49 : 0;
    const operatorFee = seatCount > 0 ? 20 : 0;
    const mealsTotal = selectedMeals.reduce((sum, item) => sum + getAddonLineTotal(item), 0);
    const preCouponTotal = baseFare + taxes + convenienceFee + operatorFee + mealsTotal;
    const couponDiscount = Math.min(Number(data.couponDiscount) || 0, preCouponTotal);
    const finalTotal = preCouponTotal - couponDiscount;

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
        const nextErrors = validateBookingPaymentDetails({
            paymentMethod,
            paymentSubOption,
            upiId,
            selectedUpiApp,
            cardData,
            netBankingProvider
        });
        setErrors(nextErrors);
        return Object.keys(nextErrors).length === 0;
    };

    const breakdown = getWalletPaymentBreakdown({
        totalAmount: finalTotal,
        walletBalance: user?.walletBalance || 0,
        useWallet: paymentMethod === "wallet",
        walletAmountInput: finalTotal,
        paymentMethod
    });

    const handlePay = async () => {
        if (paymentMethod !== "wallet" && !validateForm()) return;
        if (paymentMethod === "wallet" && breakdown.externalPayable > 0) {
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
                category: "bus",
                bus: {
                    ...data.bus,
                    boardingPoint: data.boardingPoint || data.bus?.boardingPoint,
                    droppingPoint: data.droppingPoint || data.bus?.droppingPoint
                },
                busId: data.bus?._id,
                passengers: data.passengers,
                contactDetails: data.contactDetails,
                selectedSeats: data.selectedSeats,
                addOns: {
                    ...(data.addOns || {}),
                    meals: selectedMeals
                },
                boardingPoint: data.boardingPoint || data.bus?.boardingPoint,
                droppingPoint: data.droppingPoint || data.bus?.droppingPoint,
                date: data.date || data.bus?.date,
                travelDate: data.date || data.bus?.date,
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
                category: "bus",
                status: "Confirmed",
                totalFare: finalTotal,
                createdAt: result.booking?.createdAt || new Date().toISOString(),
                travelDate: fullBookingData.travelDate,
                passengers: data.passengers,
                contactDetails: data.contactDetails,
                selectedSeats: data.selectedSeats,
                addOns: {
                    ...(data.addOns || {}),
                    meals: selectedMeals
                },
                couponCode: data.couponCode || "",
                couponDiscount,
                subtotalFare: preCouponTotal,
                payment,
                bus: {
                    ...data.bus,
                    boardingPoint: data.boardingPoint || data.bus?.boardingPoint,
                    droppingPoint: data.droppingPoint || data.bus?.droppingPoint
                },
                title: `${data.bus.operatorName} (${data.bus.busType})`,
                details: {
                    route: `${data.from} -> ${data.to}`,
                    date: fullBookingData.travelDate,
                    traveller: `${data.passengers[0]?.firstName || ""} ${data.passengers[0]?.lastName || ""}`.trim(),
                    seats: data.selectedSeats.map((seat) => seat.id || seat).join(", ")
                },
                image: "BUS"
            });

            setTimeout(() => {
                setIsProcessing(false);
                navigate("/booking-success", {
                    state: buildBusSuccessState({
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

    return (
        <div className="payment-step elite-design-v4">
            <div className="card-v4 premium-glass">
                <div className="section-header-row">
                    <h3><span>PAY</span> Secure Payment</h3>
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
            </div>

            <div className="booking-actions-shell">
                <button className="btn-elite-outline" onClick={onBack} disabled={isProcessing}>
                    Back
                </button>
                <button className="btn-elite-primary" onClick={handlePay} disabled={isProcessing} style={{ minWidth: "240px" }}>
                    {isProcessing
                        ? "Processing..."
                        : breakdown.externalPayable > 0
                            ? `Pay ${formatCurrency(breakdown.externalPayable)} now`
                            : "Confirm Booking"}
                </button>
            </div>
        </div>
    );
};

export default Payment;
