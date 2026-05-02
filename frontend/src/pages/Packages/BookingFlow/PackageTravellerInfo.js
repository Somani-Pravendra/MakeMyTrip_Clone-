import React, { useState, useEffect } from "react";

const PackageTravellerInfo = ({ data, onNext, onBack, onUpdate }) => {
    const initialPassengers = data.passengers || data.travellers || [
        { id: `p-${Date.now()}-0`, firstName: "", lastName: "", age: "", gender: "Male" }
    ];

    const [passengers, setPassengers] = useState(initialPassengers);
    const [contact, setContact] = useState(data.contactDetails || { email: "", phone: "" });
    const [errors, setErrors] = useState({});

    useEffect(() => {
        onUpdate({
            passengers,
            travellers: passengers,
            contactDetails: contact
        });
    }, [passengers, contact, onUpdate]);

    const handleAddPassenger = () => {
        const newPassenger = {
            id: `p-${Date.now()}-${passengers.length}`,
            firstName: "",
            lastName: "",
            age: "",
            gender: "Male"
        };
        setPassengers([...passengers, newPassenger]);
    };

    const handleRemovePassenger = (id) => {
        if (passengers.length > 1) {
            setPassengers(passengers.filter((p) => p.id !== id));
        }
    };

    const handlePassengerChange = (id, field, value) => {
        setPassengers(passengers.map((p) => (
            p.id === id ? { ...p, [field]: value } : p
        )));

        if (errors[`${id}_${field}`]) {
            setErrors((prev) => {
                const newErrs = { ...prev };
                delete newErrs[`${id}_${field}`];
                return newErrs;
            });
        }
    };

    const validate = () => {
        const newErrors = {};

        passengers.forEach((p) => {
            if (!p.firstName?.trim()) newErrors[`${p.id}_firstName`] = "First name required";
            if (!p.lastName?.trim()) newErrors[`${p.id}_lastName`] = "Last name required";
            if (!p.age) newErrors[`${p.id}_age`] = "Age required";
        });

        if (!contact.email?.trim()) {
            newErrors.email = "Email is required";
        } else if (!/\S+@\S+\.\S+/.test(contact.email)) {
            newErrors.email = "Invalid email format";
        }

        if (!contact.phone?.trim()) {
            newErrors.phone = "Phone is required";
        } else if (contact.phone.replace(/\D/g, "").length < 10) {
            newErrors.phone = "10 digits required";
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = () => {
        if (validate()) {
            onUpdate({ contactDetails: contact, passengers });
            onNext();
        }
    };

    return (
        <div className="traveller-info-step elite-design-v4 fade-in">
            <div className="card-v4 premium-glass">
                <div className="section-header-row">
                    <h3><span>Guest</span> Traveller Details</h3>
                    <div className="elite-badge">{passengers.length} TRAVELLER{passengers.length > 1 ? "S" : ""}</div>
                </div>

                {passengers.map((p, i) => (
                    <div key={p.id} className="traveller-entry-card mt-24">
                        <div className="passenger-header">
                            <div className="index-pill-elite">P{i + 1}</div>
                            <div style={{ flex: 1 }}>
                                <h4 className="no-margin white-bold">
                                    {i === 0 ? "Primary Traveller" : `Passenger ${i + 1}`}
                                </h4>
                                <span className="label-text-dim">PERSONAL INFORMATION</span>
                            </div>
                            {passengers.length > 1 && (
                                <button className="remove-btn-elite" onClick={() => handleRemovePassenger(p.id)}>
                                    REMOVE
                                </button>
                            )}
                        </div>

                        <div className="elite-form-row mt-20">
                            <div className="form-field-v2">
                                <label>FIRST NAME</label>
                                <input
                                    type="text"
                                    className="elite-input"
                                    placeholder="e.g. John"
                                    value={p.firstName}
                                    onChange={(e) => handlePassengerChange(p.id, "firstName", e.target.value)}
                                />
                                {errors[`${p.id}_firstName`] && (
                                    <p className="error-text-elite">{errors[`${p.id}_firstName`]}</p>
                                )}
                            </div>
                            <div className="form-field-v2">
                                <label>LAST NAME</label>
                                <input
                                    type="text"
                                    className="elite-input"
                                    placeholder="e.g. Doe"
                                    value={p.lastName}
                                    onChange={(e) => handlePassengerChange(p.id, "lastName", e.target.value)}
                                />
                                {errors[`${p.id}_lastName`] && (
                                    <p className="error-text-elite">{errors[`${p.id}_lastName`]}</p>
                                )}
                            </div>
                            <div className="form-field-v2">
                                <label>AGE</label>
                                <input
                                    type="number"
                                    className="elite-input"
                                    placeholder="Age"
                                    value={p.age}
                                    onChange={(e) => handlePassengerChange(p.id, "age", e.target.value)}
                                />
                                {errors[`${p.id}_age`] && (
                                    <p className="error-text-elite">{errors[`${p.id}_age`]}</p>
                                )}
                            </div>
                        </div>
                        <div className="elite-form-row double mt-20">
                            <div className="form-field-v2">
                                <label>GENDER</label>
                                <select
                                    className="elite-select"
                                    value={p.gender}
                                    onChange={(e) => handlePassengerChange(p.id, "gender", e.target.value)}
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
                    + ADD ANOTHER TRAVELLER
                </button>
            </div>

            <div className="card-v4 premium-glass mt-24">
                <div className="section-header-row">
                    <h3><span>Contact</span> Contact Information</h3>
                    <div className="elite-badge">FOR E-TICKET</div>
                </div>
                <div className="elite-form-row double mt-20">
                    <div className="form-field-v2">
                        <label>CONTACT EMAIL</label>
                        <input
                            type="email"
                            className="elite-input"
                            placeholder="email@example.com"
                            value={contact.email}
                            onChange={(e) => {
                                setContact({ ...contact, email: e.target.value });
                                if (errors.email) setErrors({ ...errors, email: null });
                            }}
                        />
                        {errors.email && <p className="error-text-elite">{errors.email}</p>}
                    </div>
                    <div className="form-field-v2">
                        <label>MOBILE NUMBER</label>
                        <input
                            type="tel"
                            className="elite-input"
                            placeholder="10-digit mobile number"
                            value={contact.phone}
                            onChange={(e) => {
                                setContact({ ...contact, phone: e.target.value });
                                if (errors.phone) setErrors({ ...errors, phone: null });
                            }}
                        />
                        {errors.phone && <p className="error-text-elite">{errors.phone}</p>}
                    </div>
                </div>
            </div>

            <div className="booking-actions-shell">
                <button className="btn-elite-outline" onClick={onBack}>
                    <span>&lt;-</span> BACK
                </button>
                <button className="btn-elite-primary" onClick={handleSubmit}>
                    CONTINUE TO PREFERENCES <span>-&gt;</span>
                </button>
            </div>
        </div>
    );
};

export default PackageTravellerInfo;
