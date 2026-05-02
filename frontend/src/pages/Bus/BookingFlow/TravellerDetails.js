import React, { useEffect, useState } from "react";
import { useToast } from "../../../contexts/ToastContext";

const TravellerDetails = ({ data, onNext, onBack, onUpdate }) => {
    const { showToast } = useToast();
    const maxPassengers = Math.max(Number(data.bus?.availableSeats) || 0, 1);
    const [passengers, setPassengers] = useState(() => {
        if (data.passengers && data.passengers.length > 0 && data.passengers[0].firstName !== undefined) {
            return data.passengers
                .slice(0, maxPassengers)
                .map((passenger, index) => ({ ...passenger, id: passenger.id || `p-${Date.now()}-${index}` }));
        }
        return [{ id: `p-${Date.now()}-0`, firstName: "", lastName: "", age: "", gender: "Male" }];
    });
    const [contact, setContact] = useState(data.contactDetails || { email: "", phone: "" });
    const [errors, setErrors] = useState({});

    useEffect(() => {
        onUpdate({ passengers, contactDetails: contact });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [passengers, contact]);

    const handlePassengerChange = (id, field, value) => {
        const updated = passengers.map((passenger) => (passenger.id === id ? { ...passenger, [field]: value } : passenger));
        setPassengers(updated);

        const errorKey = `p_${id}_${field === "firstName" ? "fname" : field === "lastName" ? "lname" : "age"}`;
        if (errors[errorKey]) {
            const nextErrors = { ...errors };
            delete nextErrors[errorKey];
            setErrors(nextErrors);
        }
    };

    const handleAddPassenger = () => {
        if (passengers.length >= maxPassengers) {
            showToast({
                type: "warning",
                title: "Seat limit reached",
                message: `Only ${maxPassengers} seat(s) are currently available on this bus.`
            });
            return;
        }
        setPassengers([...passengers, { id: `p-${Date.now()}`, firstName: "", lastName: "", age: "", gender: "Male" }]);
    };

    const handleRemovePassenger = (id) => {
        if (passengers.length > 1) {
            setPassengers(passengers.filter((passenger) => passenger.id !== id));
        }
    };

    const validate = () => {
        const nextErrors = {};

        passengers.forEach((passenger) => {
            if (!passenger.firstName) nextErrors[`p_${passenger.id}_fname`] = "Required";
            if (!passenger.lastName) nextErrors[`p_${passenger.id}_lname`] = "Required";
            if (!passenger.age) nextErrors[`p_${passenger.id}_age`] = "Required";
        });

        if (!contact.email || !/\S+@\S+\.\S+/.test(contact.email)) nextErrors.email = "Valid email required";
        if (!contact.phone || contact.phone.length < 10) nextErrors.phone = "Valid 10-digit phone required";

        setErrors(nextErrors);
        return Object.keys(nextErrors).length === 0;
    };

    const handleContinue = () => {
        if (!validate()) return;
        onUpdate({ passengers, contactDetails: contact });
        onNext();
    };

    return (
        <div className="traveller-details-step elite-design-v4">
            <div className="card-v4 premium-glass">
                <div className="section-header-row">
                    <h3><span>TRV</span> Traveller Details</h3>
                    <div className="elite-badge">{passengers.length} Traveller(s)</div>
                </div>
                <p className="label-text-dim" style={{ marginTop: "10px" }}>
                    Seats currently available: {maxPassengers}
                </p>

                {passengers.map((passenger, index) => (
                    <div key={passenger.id} className="traveller-entry-card mt-24">
                        <div className="passenger-header">
                            <div className="index-pill-elite">P{index + 1}</div>
                            <div style={{ flex: 1 }}>
                                <h4 className="no-margin white-bold">Passenger {index + 1}</h4>
                                <span className="label-text-dim">Personal Information</span>
                            </div>
                            {passengers.length > 1 && (
                                <button className="remove-btn-elite" onClick={() => handleRemovePassenger(passenger.id)}>
                                    Remove
                                </button>
                            )}
                        </div>

                        <div className="elite-form-row mt-20">
                            <div className="form-field-v2">
                                <label>First Name</label>
                                <input
                                    type="text"
                                    className="elite-input"
                                    value={passenger.firstName}
                                    placeholder="e.g. Rahul"
                                    onChange={(event) => handlePassengerChange(passenger.id, "firstName", event.target.value)}
                                />
                                {errors[`p_${passenger.id}_fname`] && <p className="error-text-elite">{errors[`p_${passenger.id}_fname`]}</p>}
                            </div>
                            <div className="form-field-v2">
                                <label>Last Name</label>
                                <input
                                    type="text"
                                    className="elite-input"
                                    value={passenger.lastName}
                                    placeholder="e.g. Sharma"
                                    onChange={(event) => handlePassengerChange(passenger.id, "lastName", event.target.value)}
                                />
                                {errors[`p_${passenger.id}_lname`] && <p className="error-text-elite">{errors[`p_${passenger.id}_lname`]}</p>}
                            </div>
                            <div className="form-field-v2">
                                <label>Age (Years)</label>
                                <input
                                    type="number"
                                    className="elite-input"
                                    value={passenger.age}
                                    placeholder="25"
                                    onChange={(event) => handlePassengerChange(passenger.id, "age", event.target.value)}
                                />
                                {errors[`p_${passenger.id}_age`] && <p className="error-text-elite">{errors[`p_${passenger.id}_age`]}</p>}
                            </div>
                        </div>
                        <div className="elite-form-row double mt-20">
                            <div className="form-field-v2">
                                <label>Gender</label>
                                <select
                                    className="elite-select"
                                    value={passenger.gender}
                                    onChange={(event) => handlePassengerChange(passenger.id, "gender", event.target.value)}
                                >
                                    <option value="Male">Male</option>
                                    <option value="Female">Female</option>
                                    <option value="Other">Other</option>
                                </select>
                            </div>
                        </div>
                    </div>
                ))}

                <button className="btn-add-traveller mt-24" onClick={handleAddPassenger}>
                    Add Another Traveller
                </button>
            </div>

            <div className="card-v4 premium-glass mt-24">
                <div className="section-header-row">
                    <h3><span>CNT</span> Contact Details</h3>
                    <div className="elite-badge">For E-ticket</div>
                </div>
                <div className="elite-form-row mt-20">
                    <div className="form-field-v2">
                        <label>Email Address</label>
                        <input
                            type="email"
                            className="elite-input"
                            value={contact.email}
                            onChange={(event) => {
                                setContact({ ...contact, email: event.target.value });
                                if (errors.email) {
                                    const nextErrors = { ...errors };
                                    delete nextErrors.email;
                                    setErrors(nextErrors);
                                }
                            }}
                            placeholder="rahul.sharma@gmail.com"
                        />
                        {errors.email && <p className="error-text-elite">{errors.email}</p>}
                    </div>
                    <div className="form-field-v2">
                        <label>Mobile Number</label>
                        <input
                            type="tel"
                            className="elite-input"
                            value={contact.phone}
                            onChange={(event) => {
                                setContact({ ...contact, phone: event.target.value });
                                if (errors.phone) {
                                    const nextErrors = { ...errors };
                                    delete nextErrors.phone;
                                    setErrors(nextErrors);
                                }
                            }}
                            placeholder="9876543210"
                        />
                        {errors.phone && <p className="error-text-elite">{errors.phone}</p>}
                    </div>
                </div>
            </div>

            <div className="booking-actions-shell">
                <button className="btn-elite-outline" onClick={onBack}>
                    Back
                </button>
                <button className="btn-elite-primary" onClick={handleContinue}>
                    Continue to Seat Selection
                </button>
            </div>
        </div>
    );
};

export default TravellerDetails;
