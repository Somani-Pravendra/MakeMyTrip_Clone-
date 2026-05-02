import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { useBookings } from "../../../contexts/BookingContext";
import { useAuth } from "../../../contexts/AuthContext";
import { PaymentMethodSection } from "../../../components/booking/PaymentMethodSection";
import { API_BASE_URL } from "../../../utils/api";
import { buildPackageSuccessState } from "../../../utils/bookingSuccess";
import { buildBookingPaymentPayload, validateBookingPaymentDetails, getWalletPaymentBreakdown } from "../../../utils/walletPayment";
import { useToast } from "../../../contexts/ToastContext";
import { formatCurrency } from "../../../utils/currency";

const PackagePayment = ({ data, onBack }) => {
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

    const travelers = data.travellers || [];
    const pkg = data.package;
    const basePrice = pkg.pricePerPerson * travelers.length;
    const discountAmount = (basePrice * (pkg.discount || 0)) / 100;
    const taxes = (basePrice - discountAmount) * 0.18;
    const preCouponTotal = Math.round(basePrice - discountAmount + taxes);
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

    const getBookingErrorMessage = (error, fallback) => {
        const detailMessages = error?.response?.data?.details
            ? Object.values(error.response.data.details).map((item) => item?.message).filter(Boolean).join(", ")
            : "";

        return detailMessages || error?.response?.data?.error || error?.response?.data?.message || error?.message || fallback;
    };

    const getTravellerName = (traveller = {}) =>
        `${traveller.firstName || ""} ${traveller.lastName || ""}`.trim() ||
        String(traveller.name || "").trim() ||
        "Guest Traveller";

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
            const token = localStorage.getItem("token");
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
                userId: user?._id || user?.id,
                category: "package",
                packageId: data.package._id,
                package: {
                    title: data.package.packageTitle,
                    packageCode: data.package.packageId,
                    destination: {
                        country: data.package.country,
                        state: data.package.country,
                        cities: [data.package.city]
                    },
                    duration: {
                        nights: parseInt(data.package.duration, 10) || 0,
                        days: (parseInt(data.package.duration, 10) || 0) + 1
                    },
                    media: {
                        bannerImage: data.package.thumbnailImage
                    }
                },
                passengers: travelers.map((traveller) => {
                    const names = getTravellerName(traveller).split(" ");
                    return {
                        firstName: names[0] || "Guest",
                        lastName: names.length > 1 ? names.slice(1).join(" ") : "Traveller",
                        age: Number(traveller.age) || 0,
                        gender: traveller.gender || "Male"
                    };
                }),
                contactDetails: {
                    email: data.contactDetails.email,
                    phone: data.contactDetails.phone
                },
                preferences: data.preferences,
                experienceAddOns: data.experienceAddOns,
                date: data.travelDate || new Date(),
                couponCode: data.couponCode || "",
                couponDiscount,
                subtotalFare: preCouponTotal,
                totalFare: finalTotal,
                travelDate: data.travelDate || new Date(),
                status: "Confirmed",
                payment
            };

            const response = await axios.post(`${API_BASE_URL}/bookings`, bookingPayload, {
                headers: { Authorization: `Bearer ${token}` },
                withCredentials: true
            });

            const finalizedBooking = addBooking({
                _id: response.data.booking?._id,
                category: "package",
                status: "Confirmed",
                totalFare: finalTotal,
                createdAt: response.data.booking?.createdAt || new Date().toISOString(),
                travelDate: data.travelDate || new Date(),
                passengers: bookingPayload.passengers,
                contactDetails: bookingPayload.contactDetails,
                preferences: data.preferences,
                experienceAddOns: data.experienceAddOns,
                couponCode: data.couponCode || "",
                couponDiscount,
                subtotalFare: preCouponTotal,
                payment,
                package: bookingPayload.package,
                title: data.package.packageTitle,
                details: {
                    destination: `${data.package.city}, ${data.package.country}`,
                    date: data.travelDate || "Today",
                    traveller: getTravellerName(travelers[0]),
                    duration: data.package.duration,
                    roomSharing: data.preferences?.roomSharing || "Twin Sharing"
                },
                image: data.package.thumbnailImage
            });

            const subtotalBase = basePrice;
            const discAmount = Math.round(discountAmount);
            const taxAmount = Math.round(taxes);

            setTimeout(() => {
                setIsProcessing(false);
                navigate("/booking-success", {
                    state: buildPackageSuccessState({
                        data,
                        amount: finalTotal,
                        bookingId: response.data.booking?._id || finalizedBooking.id,
                        title: finalizedBooking.title,
                        paymentMethod,
                        basePrice: subtotalBase,
                        convenienceFee: taxAmount,
                        discount: discAmount
                    })
                });
            }, 1000);
        } catch (error) {
            console.error("Payment failed:", error);
            showToast({
                type: "error",
                title: "Payment failed",
                message: getBookingErrorMessage(error, "Payment failed. Please try again.")
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
            </div>

            <div className="booking-actions-shell">
                <button className="btn-elite-outline" onClick={onBack} disabled={isProcessing}>
                    <span>&lt;-</span> BACK
                </button>
                <button className="btn-elite-primary" onClick={handlePay} disabled={isProcessing} style={{ minWidth: "240px" }}>
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

export default PackagePayment;

