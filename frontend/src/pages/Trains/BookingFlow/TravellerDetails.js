import React, { useState, useEffect } from "react";

const TravellerDetails = ({ data, onNext, onBack, onUpdate }) => {
    const initialPassengers = data.passengers?.map((p, i) => ({
        ...p,
        id: p.id || `tp-${Date.now()}-${i}`
    })) || [
        { id: `tp-${Date.now()}-0`, firstName: "", lastName: "", age: "", gender: "Male", berthPreference: "No Preference" }
    ];

    const [passengers, setPassengers] = useState(initialPassengers);
    const [contact, setContact] = useState(data.contactDetails || { email: "", phone: "", name: "" });
    const [errors, setErrors] = useState({});

    useEffect(() => {
        onUpdate({ passengers });
    }, [passengers, onUpdate]);

    const handlePassengerChange = (id, field, value) => {
        setPassengers(passengers.map((p) =>
            p.id === id ? { ...p, [field]: value } : p
        ));
        if (errors[`${id}_${field}`]) {
            setErrors((prev) => {
                const nextErrors = { ...prev };
                delete nextErrors[`${id}_${field}`];
                return nextErrors;
            });
        }
    };

    const addPassenger = () => {
        const newPassenger = {
            id: `tp-${Date.now()}-${passengers.length}`,
            firstName: "",
            lastName: "",
            age: "",
            gender: "Male",
            berthPreference: "No Preference"
        };
        setPassengers([...passengers, newPassenger]);
    };

    const removePassenger = (id) => {
        if (passengers.length > 1) {
            setPassengers(passengers.filter((p) => p.id !== id));
        }
    };

    const validate = () => {
        const nextErrors = {};

        passengers.forEach((p) => {
            if (!p.firstName?.trim()) nextErrors[`${p.id}_firstName`] = "Required";
            if (!p.lastName?.trim()) nextErrors[`${p.id}_lastName`] = "Required";
            if (!p.age) nextErrors[`${p.id}_age`] = "Required";
        });

        if (!contact.email?.trim() || !/\S+@\S+\.\S+/.test(contact.email)) {
            nextErrors.email = "Valid email required";
        }
        if (!contact.phone?.trim() || contact.phone.replace(/\D/g, "").length < 10) {
            nextErrors.phone = "10-digit phone required";
        }

        setErrors(nextErrors);
        return Object.keys(nextErrors).length === 0;
    };

    const handleContinue = () => {
        if (validate()) {
            onUpdate({
                contactDetails: {
                    ...contact,
                    name: `${passengers[0].firstName} ${passengers[0].lastName}`.trim()
                },
                totalFare: data.basePrice * passengers.length
            });
            onNext();
        }
    };

    return (
        <div className="traveller-details-step elite-design-v4 fade-in">
            <div className="card-v4 premium-glass">
                <div className="section-header-row">
                    <h3><span>TRV</span> Traveller Details</h3>
                    <div className="elite-badge">{passengers.length} Traveller(s)</div>
                </div>

                {passengers.map((p, index) => (
                    <div key={p.id} className="traveller-entry-card mt-24">
                        <div className="passenger-header">
                            <div className="index-pill-elite">P{index + 1}</div>
                            <div style={{ flex: 1 }}>
                                <h4 className="no-margin white-bold">{index === 0 ? "Primary Adult" : `Adult ${index + 1}`}</h4>
                                <span className="label-text-dim">PERSONAL INFORMATION</span>
                            </div>
                            {passengers.length > 1 && (
                                <button className="remove-btn-elite" onClick={() => removePassenger(p.id)}>
                                    REMOVE
                                </button>
                            )}
                        </div>

                        <div className="elite-form-row mt-20">
                            <div className="form-field-v2">
                                <label>FIRST NAME</label>
                                <input
                                    type="text"
                                    value={p.firstName}
                                    onChange={(e) => handlePassengerChange(p.id, "firstName", e.target.value)}
                                    placeholder="e.g. Rahul"
                                    className="elite-input"
                                />
                                {errors[`${p.id}_firstName`] && <p className="error-text-elite">{errors[`${p.id}_firstName`]}</p>}
                            </div>
                            <div className="form-field-v2">
                                <label>LAST NAME</label>
                                <input
                                    type="text"
                                    value={p.lastName}
                                    onChange={(e) => handlePassengerChange(p.id, "lastName", e.target.value)}
                                    placeholder="e.g. Sharma"
                                    className="elite-input"
                                />
                                {errors[`${p.id}_lastName`] && <p className="error-text-elite">{errors[`${p.id}_lastName`]}</p>}
                            </div>
                            <div className="form-field-v2">
                                <label>AGE (YEARS)</label>
                                <input
                                    type="number"
                                    value={p.age}
                                    onChange={(e) => handlePassengerChange(p.id, "age", e.target.value)}
                                    placeholder="25"
                                    className="elite-input"
                                />
                                {errors[`${p.id}_age`] && <p className="error-text-elite">{errors[`${p.id}_age`]}</p>}
                            </div>
                        </div>

                        <div className="elite-form-row double mt-20">
                            <div className="form-field-v2">
                                <label>GENDER</label>
                                <select
                                    value={p.gender}
                                    onChange={(e) => handlePassengerChange(p.id, "gender", e.target.value)}
                                    className="elite-select"
                                >
                                    <option value="Male">Male</option>
                                    <option value="Female">Female</option>
                                    <option value="Other">Other</option>
                                </select>
                            </div>
                            <div className="form-field-v2">
                                <label>BERTH PREFERENCE</label>
                                <select
                                    value={p.berthPreference || "No Preference"}
                                    onChange={(e) => handlePassengerChange(p.id, "berthPreference", e.target.value)}
                                    className="elite-select"
                                >
                                    <option value="No Preference">No Preference</option>
                                    <option value="Lower">Lower</option>
                                    <option value="Middle">Middle</option>
                                    <option value="Upper">Upper</option>
                                    <option value="Side Lower">Side Lower</option>
                                    <option value="Side Upper">Side Upper</option>
                                </select>
                            </div>
                        </div>
                    </div>
                ))}

                <button className="btn-add-traveller mt-24" onClick={addPassenger}>
                    + ADD ANOTHER TRAVELLER
                </button>
            </div>

            <div className="card-v4 premium-glass mt-24">
                <div className="section-header-row">
                    <h3><span>CT</span> Contact Details</h3>
                    <div className="elite-badge">FOR E-TICKET</div>
                </div>
                <div className="elite-form-row double mt-20">
                    <div className="form-field-v2">
                        <label>EMAIL ADDRESS</label>
                        <input
                            type="email"
                            value={contact.email}
                            onChange={(e) => setContact({ ...contact, email: e.target.value })}
                            placeholder="rahul.sharma@gmail.com"
                            className="elite-input"
                        />
                        {errors.email && <p className="error-text-elite">{errors.email}</p>}
                    </div>
                    <div className="form-field-v2">
                        <label>MOBILE NUMBER</label>
                        <input
                            type="text"
                            value={contact.phone}
                            onChange={(e) => setContact({ ...contact, phone: e.target.value })}
                            placeholder="9876543210"
                            className="elite-input"
                        />
                        {errors.phone && <p className="error-text-elite">{errors.phone}</p>}
                    </div>
                </div>
            </div>

            <div className="card-v4 glass-warning mt-24">
                <div style={{ display: "flex", gap: "15px", alignItems: "center" }}>
                    <span style={{ fontSize: "24px" }}>INFO</span>
                    <div>
                        <strong className="white-bold">Train Travel Policy:</strong>
                        <p className="label-text-dim no-margin mt-5" style={{ textTransform: "none" }}>
                            Carry valid ID proof and verify coach details before departure. Final berth allocation remains subject to railway availability and coach charting.
                        </p>
                    </div>
                </div>
            </div>

            <div className="booking-actions-shell">
                <button className="btn-elite-outline" onClick={onBack}>
                    <span>&lt;-</span> BACK
                </button>
                <button className="btn-elite-primary" onClick={handleContinue}>
                    PROCEED TO ADD-ONS <span>-&gt;</span>
                </button>
            </div>
        </div>
    );
};

export default TravellerDetails;
