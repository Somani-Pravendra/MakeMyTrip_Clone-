import React, { useCallback, useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import PackageReview from "./PackageReview";
import PackageTravellerInfo from "./PackageTravellerInfo";
import PackagePayment from "./PackagePayment";
import PackageBookingSidebar from "./PackageBookingSidebar";
import axios from "axios";
import { API_BASE_URL } from "../../../utils/api";
import "../../Booking/Booking.css";

const steps = [
    { id: 1, label: "Review", key: 'review' },
    { id: 2, label: "Travellers", key: 'travellers' },
    { id: 3, label: "Payment", key: 'payment' }
];

const buildInitialBookingData = (pkg) => ({
    package: pkg,
    travellers: [
        { id: `p-${Date.now()}-0`, firstName: "", lastName: "", age: "", gender: "Male" }
    ],
    contactDetails: { email: "", phone: "" },
    travelDate: new Date(),
    totalFare: (pkg?.pricePerPerson || 0),
    couponCode: "",
    couponDiscount: 0
});

const PackageBooking = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const [currentStep, setCurrentStep] = useState(1);
    const [bookingData, setBookingData] = useState(null);
    const [loading, setLoading] = useState(true);

    const fetchPackage = useCallback(async (id) => {
        try {
            const res = await axios.get(`${API_BASE_URL}/packages/${id}`);
            setBookingData(buildInitialBookingData(res.data));
        } catch (err) {
            console.error("Error fetching package:", err);
            navigate('/packages');
            return;
        } finally {
            setLoading(false);
        }
    }, [navigate]);

    useEffect(() => {
        if (location.state?.package) {
            setBookingData(buildInitialBookingData(location.state.package));
            setLoading(false);
            return;
        }

        if (location.state?.packageId) {
            fetchPackage(location.state.packageId);
            return;
        }

        setLoading(false);
        if (!location.state?.package && !location.state?.packageId) {
            navigate('/packages');
        }
    }, [fetchPackage, location.state, navigate]);

    const updateBookingData = (newData) => {
        setBookingData(prev => ({ ...prev, ...newData }));
    };

    const nextStep = () => {
        if (currentStep < 3) setCurrentStep(currentStep + 1);
    };

    const prevStep = () => {
        if (currentStep > 1) setCurrentStep(currentStep - 1);
    };

    if (loading || !bookingData) return <div className="loading-state">Loading...</div>;

    const renderStep = () => {
        switch (currentStep) {
            case 1:
                return <PackageReview data={bookingData} onNext={nextStep} />;
            case 2:
                return <PackageTravellerInfo data={bookingData} onNext={nextStep} onBack={prevStep} onUpdate={updateBookingData} />;
            case 3:
                return <PackagePayment data={bookingData} onBack={prevStep} onUpdate={updateBookingData} />;
            default:
                return <PackageReview data={bookingData} onNext={nextStep} />;
        }
    };

    return (
        <div className="unified-booking-flow elite-design-v4 booking-category-packages">
            <div className="booking-flow-header">
                <div className="mmt-container">
                    <div className="breadcrumb-steps">
                        {steps.map(step => (
                            <div
                                key={step.id}
                                className={`breadcrumb-item ${currentStep === step.id ? 'active' : ''} ${currentStep > step.id ? 'completed' : ''}`}
                            >
                                <span className="step-num">
                                    <span className="step-index">{step.id}</span>
                                </span>
                                <span className="step-text">{step.label}</span>
                                {step.id < steps.length && <div className="connector-line"></div>}
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div className="mmt-container booking-content-grid" style={{ marginTop: '40px' }}>
                <div className="booking-main-col">
                    {renderStep()}
                </div>
                <div className="booking-sidebar-col">
                    <PackageBookingSidebar data={bookingData} currentStep={currentStep} onUpdate={updateBookingData} />
                </div>
            </div>
        </div>
    );
};

export default PackageBooking;
