import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { useBookings } from "../../../contexts/BookingContext";
import { useAuth } from "../../../contexts/AuthContext";
import { PaymentMethodSection } from "../../../components/booking/PaymentMethodSection";
import { API_BASE_URL } from "../../../utils/api";
import { buildTrainSuccessState } from "../../../utils/bookingSuccess";
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
    const [isProcessing, setIsProcessing] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState("upi");
    const [paymentSubOption, setPaymentSubOption] = useState("upiId");
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

    const passengerCount = data.passengers.length || 1;
    const selectedMeals = data.addOns.meals || data.addOns.catering || [];
    const mealsTotal = selectedMeals.reduce((sum, item) => sum + getAddonLineTotal(item), 0);
    const baseFare = (data.basePrice || 0) * passengerCount;
    const taxes = Math.round(baseFare * 0.05);
    const serviceFee = 40;
    const preCouponTotal = baseFare + taxes + serviceFee + mealsTotal;
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

    const handleConfirmBooking = async (event) => {
        if (event) event.preventDefault();
        
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
            const token = localStorage.getItem("token");
            if (!token) throw new Error("Please log in to complete your booking.");

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

            const bookingPayload = {
                category: "train",
                trainId: data.trainId && data.trainId !== "mock-id" ? data.trainId : undefined,
                train: {
                    trainNumber: data.train.trainNumber,
                    trainName: data.train.trainName,
                    from: data.train.from,
                    to: data.train.to,
                    departureTime: data.train.departureTime,
                    arrivalTime: data.train.arrivalTime,
                    duration: data.train.duration,
                    selectedClass: data.selectedClass
                },
                passengers: data.passengers,
                contactDetails: data.contactDetails,
                selectedBerths: data.selectedBerths,
                addOns: {
                    ...data.addOns,
                    meals: selectedMeals,
                    catering: selectedMeals
                },
                date: data.date,
                travelDate: data.date,
                couponCode: data.couponCode || "",
                couponDiscount,
                subtotalFare: preCouponTotal,
                totalFare: finalTotal,
                status: "Confirmed",
                payment
            };

            const response = await axios.post(`${API_BASE_URL}/bookings`, bookingPayload, {
                headers: { Authorization: `Bearer ${token}` },
                withCredentials: true
            });

            const savedPnr = response.data.booking?.pnr;

            addBooking({
                _id: response.data.booking?._id,
                category: "train",
                status: "Confirmed",
                totalFare: finalTotal,
                createdAt: response.data.booking?.createdAt || new Date().toISOString(),
                travelDate: data.date,
                pnr: savedPnr,
                passengers: data.passengers,
                contactDetails: data.contactDetails,
                selectedBerths: data.selectedBerths,
                addOns: {
                    ...data.addOns,
                    meals: selectedMeals,
                    catering: selectedMeals
                },
                couponCode: data.couponCode || "",
                couponDiscount,
                subtotalFare: preCouponTotal,
                payment,
                train: {
                    trainName: data.train.trainName,
                    trainNumber: data.train.trainNumber,
                    from: data.train.from,
                    to: data.train.to,
                    departureTime: data.train.departureTime,
                    arrivalTime: data.train.arrivalTime,
                    duration: data.train.duration,
                    selectedClass: data.selectedClass
                }
            });

            setTimeout(() => {
                navigate("/booking-success", {
                    state: buildTrainSuccessState({
                        data: { ...data, pnr: savedPnr },
                        amount: finalTotal,
                        bookingId: response.data.booking._id,
                        title: `${data.train.trainName} (${data.train.trainNumber})`,
                        paymentMethod,
                        convenienceFee: serviceFee
                    })
                });
            }, 1000);
        } catch (error) {
            console.error("Booking failed:", error);
            const validationDetails = error.response?.data?.details
                ? Object.values(error.response.data.details).map((item) => item?.message).filter(Boolean).join(", ")
                : "";
            const errorMessage = validationDetails || error.response?.data?.error || error.response?.data?.message || error.message || "Payment failed. Please try again.";
            showToast({
                type: "error",
                title: "Booking failed",
                message: errorMessage
            });
            setIsProcessing(false);
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
                    <h3><span>Pay</span> Secure Checkout</h3>
                    <div className="elite-badge">100% SECURE SSL</div>
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
                    <span>←</span> BACK
                </button>
                <button className="btn-elite-primary" onClick={handleConfirmBooking} disabled={isProcessing}>
                    {isProcessing ? "PROCESSING..." : (
                        breakdown.externalPayable > 0 
                            ? `PAY ${formatCurrency(breakdown.externalPayable)} NOW ->`
                            : "CONFIRM BOOKING ->"
                    )}
                </button>
            </div>
        </div>
    );
};

export default Payment;
