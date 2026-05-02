import React, { useState, useEffect, useCallback } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import "./Booking.css";

import FlightReview from "../Flights/BookingFlow/FlightReview";
import FlightSeatSelection from "../Flights/BookingFlow/SeatSelection";
import FlightTravellerDetails from "../Flights/BookingFlow/TravellerDetails";
import FlightAddOns from "../Flights/BookingFlow/AddOns";
import FlightPayment from "../Flights/BookingFlow/Payment";
import FlightBookingSidebar from "../Flights/BookingFlow/BookingSidebar";

import TrainReview from "../Trains/BookingFlow/TrainReview";
import TrainTravellerDetails from "../Trains/BookingFlow/TravellerDetails";
import TrainAddOns from "../Trains/BookingFlow/AddOns";
import TrainPayment from "../Trains/BookingFlow/Payment";
import TrainBookingSidebar from "../Trains/BookingFlow/TrainBookingSidebar";

import CabReview from "../Cabs/BookingFlow/CabReview";
import CabTravellerDetails from "../Cabs/BookingFlow/TravellerDetails";
import CabPickupDropConfirm from "../Cabs/BookingFlow/PickupDropConfirm";
import CabPayment from "../Cabs/BookingFlow/Payment";
import CabBookingSidebar from "../Cabs/BookingFlow/BookingSidebar";

import BusReview from "../Bus/BookingFlow/BusReview";
import BusTravellerDetails from "../Bus/BookingFlow/TravellerDetails";
import BusSeatSelection from "../Bus/BookingFlow/SeatSelection";
import BusBoardingDrop from "../Bus/BookingFlow/BoardingDrop";
import BusAddOns from "../Bus/BookingFlow/AddOns";
import BusPayment from "../Bus/BookingFlow/Payment";
import BusBookingSidebar from "../Bus/BookingFlow/BookingSidebar";

import HotelReview from "../Hotels/BookingFlow/HotelReview";
import HotelTravellerDetails from "../Hotels/BookingFlow/HotelTravellerDetails";
import HotelPreferences from "../Hotels/BookingFlow/HotelPreferences";
import HotelAddOns from "../Hotels/BookingFlow/AddOns";
import HotelPayment from "../Hotels/BookingFlow/HotelPayment";
import HotelBookingSidebar from "../Hotels/BookingFlow/HotelBookingSidebar";

const BOOKING_CONFIGS = {
    flights: {
        steps: [
            { id: 1, label: "Review", key: 'review' },
            { id: 2, label: "Traveller Info", key: 'travellers' },
            { id: 3, label: "Seat Selection", key: 'selection' },
            { id: 4, label: "Add-ons", key: 'addons' },
            { id: 5, label: "Payment", key: 'payment' }
        ],
        components: {
            review: FlightReview,
            travellers: FlightTravellerDetails,
            selection: FlightSeatSelection,
            addons: FlightAddOns,
            payment: FlightPayment,
            sidebar: FlightBookingSidebar
        }
    },
    trains: {
        steps: [
            { id: 1, label: "Review", key: 'review' },
            { id: 2, label: "Traveller Info", key: 'travellers' },
            { id: 3, label: "Catering & Insurance", key: 'addons' },
            { id: 4, label: "Payment", key: 'payment' }
        ],
        components: {
            review: TrainReview,
            travellers: TrainTravellerDetails,
            addons: TrainAddOns,
            payment: TrainPayment,
            sidebar: TrainBookingSidebar
        }
    },
    cabs: {
        steps: [
            { id: 1, label: "Review", key: 'review' },
            { id: 2, label: "Traveller Details", key: 'travellers' },
            { id: 3, label: "Pickup & Drop", key: 'selection' },
            { id: 4, label: "Payment", key: 'payment' }
        ],
        components: {
            review: CabReview,
            travellers: CabTravellerDetails,
            selection: CabPickupDropConfirm,
            payment: CabPayment,
            sidebar: CabBookingSidebar
        }
    },
    buses: {
        steps: [
            { id: 1, label: "Review", key: 'review' },
            { id: 2, label: "Traveller Details", key: 'travellers' },
            { id: 3, label: "Seat Selection", key: 'selection' },
            { id: 4, label: "Boarding & Drop", key: 'preferences' },
            { id: 5, label: "Amenities", key: 'addons' },
            { id: 6, label: "Payment", key: 'payment' }
        ],
        components: {
            review: BusReview,
            travellers: BusTravellerDetails,
            selection: BusSeatSelection,
            preferences: BusBoardingDrop,
            addons: BusAddOns,
            payment: BusPayment,
            sidebar: BusBookingSidebar
        }
    },
    hotels: {
        steps: [
            { id: 1, label: "Review", key: 'review' },
            { id: 2, label: "Guest Details", key: 'travellers' },
            { id: 3, label: "Preferences", key: 'selection' },
            { id: 4, label: "Special Requests", key: 'addons' },
            { id: 5, label: "Payment", key: 'payment' }
        ],
        components: {
            review: HotelReview,
            travellers: HotelTravellerDetails,
            selection: HotelPreferences,
            addons: HotelAddOns,
            payment: HotelPayment,
            sidebar: HotelBookingSidebar
        }
    }
};

const CATEGORY_FALLBACK_ROUTES = {
    flights: "/flights",
    trains: "/trains",
    cabs: "/cabs",
    buses: "/bus",
    hotels: "/hotels"
};

const hasRequiredBookingState = (category, state = {}) => {
    if (!category) return false;

    switch (category) {
        case "flights":
            return Boolean(state.flight && state.selectedFare);
        case "trains":
            return Boolean(state.train);
        case "cabs":
            return Boolean(state.cab || state.selectedCab);
        case "buses":
            return Boolean(state.bus);
        case "hotels":
            return Boolean(state.hotel && (state.selectedRoom || state.roomType));
        default:
            return false;
    }
};

const Booking = () => {
    const { category } = useParams();
    const location = useLocation();
    const navigate = useNavigate();
    const [currentStep, setCurrentStep] = useState(1);
    const [bookingData, setBookingData] = useState(null);

    const isLegacyPackageRoute = category === "packages";
    const config = BOOKING_CONFIGS[category];

    useEffect(() => {
        setCurrentStep(1);
        setBookingData(null);
    }, [category]);

    useEffect(() => {
        if (isLegacyPackageRoute) {
            navigate("/packages/book", {
                replace: true,
                state: location.state ?? null
            });
            return;
        }

        if (!config) {
            navigate('/');
            return;
        }

        if (!bookingData) {
            const state = location.state || {};

            if (!hasRequiredBookingState(category, state)) {
                navigate(CATEGORY_FALLBACK_ROUTES[category] || "/", { replace: true });
                return;
            }
            
            const initialData = {
                category,
                from: (state.from || state.bus?.from || '').split('(')[0].trim(),
                to: (state.to || state.bus?.to || '').split('(')[0].trim(),
                date: state.date || state.bus?.departureDate || '',
                passengers: state.passengers || [{ firstName: "", lastName: "", email: "", phone: "", age: "", gender: "" }],
                contactDetails: state.contactDetails || { email: "", phone: "", name: "" },
                totalFare: state.totalFare || state.price || state.bus?.price || 0,
                basePrice: state.basePrice || state.price || state.bus?.price || 0,
                couponCode: state.couponCode || "",
                couponDiscount: state.couponDiscount || 0,
                addOns: state.addOns || { insurance: false, meals: [], baggage: [], catering: [] },
                selectedSeats: state.selectedSeats || [],
                selectedBerths: state.selectedBerths || [],
                preferences: state.preferences || {},
                experienceAddOns: state.experienceAddOns || {},
                boardingPoint: state.boardingPoint || state.bus?.boardingPoint || "",
                droppingPoint: state.droppingPoint || state.bus?.droppingPoint || "",
                boardingTime: state.boardingTime || state.bus?.departureTime || "",
                droppingTime: state.droppingTime || state.bus?.arrivalTime || "",
                termsAccepted: state.termsAccepted || false
            };

            if (category === 'flights') {
                initialData.flight = state.flight || null;
                initialData.selectedFare = state.selectedFare || null;
            } else if (category === 'trains') {
                initialData.train = state.train || null;
                initialData.trainId = state.trainId || null;
                initialData.selectedClass = state.train?.selectedClass || "SL";
            } else if (category === 'cabs') {
                initialData.cab = state.cab || state.selectedCab || null;
                initialData.selectedCab = state.selectedCab || state.cab || null;
                initialData.cabId = state.selectedCab?.id || state.cab?.id || state.cabId || null;
                initialData.numberOfPassengers = state.numberOfPassengers || state.passengers?.length || 1;
                initialData.pickupLocation = state.pickupLocation || '';
                initialData.dropLocation = state.dropLocation || '';
                initialData.distance = state.distance || 0;
                initialData.duration = state.duration || 0;
                initialData.pickupDateTime = state.pickupDateTime || '';
                initialData.specialRequirements = state.specialRequirements || '';
                initialData.fareBreakdown = state.fareBreakdown || null;
                initialData.totalFare = state.totalFare || state.fareBreakdown?.total || state.price || 0;
                initialData.basePrice = state.basePrice || state.fareBreakdown?.rideFare || state.price || 0;

            } else if (category === 'buses') {
                initialData.bus = state.bus || null;
                initialData.busId = state.busId || null;
            } else if (category === 'hotels') {
                initialData.hotel = state.hotel || null;
                initialData.hotelId = state.hotelId || null;
                initialData.selectedRoom = state.selectedRoom || state.roomType || null;
                initialData.roomType = state.roomType || null;
                initialData.checkIn = state.checkIn || state.checkInDate || null;
                initialData.checkOut = state.checkOut || state.checkOutDate || null;
                initialData.guests = state.guests || 2;
            }

            setBookingData(initialData);
        }

    }, [category, location.state, navigate, config, bookingData, isLegacyPackageRoute]);

    const updateBookingData = useCallback((newData) => {
        setBookingData(prev => ({ ...prev, ...newData }));
    }, []);

    const nextStep = () => {
        if (currentStep < config.steps.length) setCurrentStep(currentStep + 1);
        window.scrollTo(0, 0);
    };

    const prevStep = () => {
        if (currentStep > 1) {
            setCurrentStep(prev => prev - 1);
        } else {
            if (category === 'cabs') {
                navigate('/cabs');
            } else if (category === 'flights') {
                navigate('/flights');
            } else if (category === 'hotels') {
                navigate('/hotels');
            } else if (category === 'trains') {
                navigate('/trains');
            } else if (category === 'buses') {
                navigate('/bus');
            } else {
                navigate(-1);
            }
        }
        window.scrollTo(0, 0);
    };

    if (!config || !bookingData) return <div className="loading-state"><div className="loading-spinner-mmt"></div></div>;

    const currentStepConfig = config.steps.find(s => s.id === currentStep);
    const StepComponent = config.components[currentStepConfig.key];
    const SidebarComponent = config.components.sidebar;

    return (
        <div className="unified-booking-flow">
            <div className="booking-flow-header">
                <div className="mmt-container">
                    <div className="breadcrumb-steps">
                        {config.steps.map(step => (
                            <div
                                key={step.id}
                                className={`breadcrumb-item ${currentStep === step.id ? 'active' : ''} ${currentStep > step.id ? 'completed' : ''}`}
                            >
                                <span className="step-num">
                                    <span className="step-index">{step.id}</span>
                                </span>
                                <span className="step-text">{step.label}</span>
                                {step.id < config.steps.length && <div className="connector-line"></div>}
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div className="mmt-container booking-content-grid mt-40">
                <div className="booking-main-col">
                    <StepComponent 
                        data={bookingData} 
                        onNext={nextStep} 
                        onBack={prevStep} 
                        onUpdate={updateBookingData} 
                    />
                </div>
                <div className="booking-sidebar-col">
                    <SidebarComponent data={bookingData} currentStep={currentStep} onUpdate={updateBookingData} />
                </div>
            </div>
        </div>
    );
};

export default Booking;
