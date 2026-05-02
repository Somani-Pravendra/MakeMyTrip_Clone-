import React, { useState, useEffect } from "react";

const HotelTravellerDetails = ({ data, onNext, onBack, onUpdate }) => {
    const [passengers, setPassengers] = useState(() => {
        if (data.passengers && data.passengers.length > 0 && data.passengers[0].firstName !== undefined) {
            return data.passengers.map((p, i) => ({ ...p, id: p.id || `p-${Date.now()}-${i}` }));
        }
        return [{ id: `p-${Date.now()}-0`, firstName: "", lastName: "", age: "", gender: "Male" }];
    });
    const [contactDetails, setContactDetails] = useState(data.contactDetails || { email: "", phone: "" });
    const [errors, setErrors] = useState({});

    useEffect(() => {
        onUpdate({ passengers, contactDetails });
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [passengers, contactDetails]);

    const handlePassengerChange = (id, field, value) => {
        const updated = passengers.map(p => p.id === id ? { ...p, [field]: value } : p);
        setPassengers(updated);
        
        if (errors[`p_${id}_${field === 'firstName' ? 'fname' : field === 'lastName' ? 'lname' : 'age'}`]) {
            const newErrors = {...errors};
            delete newErrors[`p_${id}_${field === 'firstName' ? 'fname' : field === 'lastName' ? 'lname' : 'age'}`];
            setErrors(newErrors);
        }
    };

    const handleAddGuest = () => {
        setPassengers([...passengers, { id: `p-${Date.now()}`, firstName: "", lastName: "", age: "", gender: "Male" }]);
    };

    const handleRemoveGuest = (id) => {
        if (passengers.length > 1) {
            setPassengers(passengers.filter(p => p.id !== id));
        }
    };

    const validateForm = () => {
        const newErrors = {};

        passengers.forEach((p) => {
            if (!p.firstName.trim()) {
                newErrors[`p_${p.id}_fname`] = "First name is required";
            }
            if (!p.lastName.trim()) {
                newErrors[`p_${p.id}_lname`] = "Last name is required";
            }
        });

        if (!contactDetails.email || !/\S+@\S+\.\S+/.test(contactDetails.email)) {
            newErrors.contactEmail = "Valid email required";
        }
        if (!contactDetails.phone || contactDetails.phone.length < 10) {
            newErrors.contactPhone = "Valid 10-digit phone required";
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleContinue = () => {
        if (!validateForm()) return;
        onNext();
    };

    return (
        <div className="traveller-details-step elite-design-v4">
            <div className="card-v4 premium-glass">
                <div className="section-header-row">
                    <h3><span>👤</span> Traveller Details</h3>
                    <div className="elite-badge">{passengers.length} PASSENGER(S)</div>
                </div>
                
                {passengers.map((p, index) => (
                    <div key={p.id} className="traveller-entry-card mt-24">
                        <div className="passenger-header">
                            <div className="index-pill-elite">P{index + 1}</div>
                            <div style={{ flex: 1 }}>
                                <h4 className="no-margin white-bold">Passenger {index + 1}</h4>
                                <span className="label-text-dim">PERSONAL INFORMATION</span>
                            </div>
                            {passengers.length > 1 && (
                                <button className="remove-btn-elite" onClick={() => handleRemoveGuest(p.id)}>
                                    ✕ REMOVE
                                </button>
                            )}
                        </div>
                        
                        <div className="elite-form-row double mt-20">
                            <div className="form-field-v2">
                                <label>FIRST & MIDDLE NAME</label>
                                <input
                                    type="text"
                                    className="elite-input"
                                    value={p.firstName}
                                    onChange={(e) => handlePassengerChange(p.id, 'firstName', e.target.value)}
                                    placeholder="e.g. John"
                                />
                                {errors[`p_${p.id}_fname`] && <p className="error-text-elite">{errors[`p_${p.id}_fname`]}</p>}
                            </div>
                            <div className="form-field-v2">
                                <label>LAST NAME</label>
                                <input
                                    type="text"
                                    className="elite-input"
                                    value={p.lastName}
                                    onChange={(e) => handlePassengerChange(p.id, 'lastName', e.target.value)}
                                    placeholder="e.g. Doe"
                                />
                                {errors[`p_${p.id}_lname`] && <p className="error-text-elite">{errors[`p_${p.id}_lname`]}</p>}
                            </div>
                        </div>

                        <div className="elite-form-row mt-20">
                            <div className="form-field-v2">
                                <label>AGE (YEARS)</label>
                                <input
                                    type="number"
                                    className="elite-input"
                                    value={p.age}
                                    onChange={(e) => handlePassengerChange(p.id, 'age', e.target.value)}
                                    placeholder="25"
                                />
                                {errors[`p_${p.id}_age`] && <p className="error-text-elite">{errors[`p_${p.id}_age`]}</p>}
                            </div>
                        </div>

                        <div className="elite-form-row mt-20">
                            <div className="form-field-v2">
                                <label>GENDER</label>
                                <select
                                    className="elite-select"
                                    value={p.gender}
                                    onChange={(e) => handlePassengerChange(p.id, 'gender', e.target.value)}
                                >
                                    <option value="Male">Male</option>
                                    <option value="Female">Female</option>
                                    <option value="Other">Other</option>
                                </select>
                            </div>
                        </div>
                    </div>
                ))}

                <button className="btn-add-traveller mt-24" onClick={handleAddGuest}>
                    + ADD ANOTHER PASSENGER
                </button>
            </div>

            <div className="card-v4 premium-glass mt-24">
                <div className="section-header-row">
                    <h3><span>📞</span> Booking Contact</h3>
                    <div className="elite-badge uppercase">FOR VOUCHER</div>
                </div>
                <div className="elite-form-row double mt-20">
                    <div className="form-field-v2">
                        <label>CONTACT EMAIL</label>
                        <input
                            type="email"
                            className="elite-input"
                            value={contactDetails.email}
                            onChange={(e) => {
                                setContactDetails({ ...contactDetails, email: e.target.value });
                                if (errors.contactEmail) {
                                    const newErrors = {...errors}; delete newErrors.contactEmail; setErrors(newErrors);
                                }
                            }}
                            placeholder="contact@example.com"
                        />
                        {errors.contactEmail && <p className="error-text-elite">{errors.contactEmail}</p>}
                    </div>
                    <div className="form-field-v2">
                        <label>CONTACT PHONE</label>
                        <input
                            type="tel"
                            className="elite-input"
                            value={contactDetails.phone}
                            onChange={(e) => {
                                setContactDetails({ ...contactDetails, phone: e.target.value });
                                if (errors.contactPhone) {
                                    const newErrors = {...errors}; delete newErrors.contactPhone; setErrors(newErrors);
                                }
                            }}
                            placeholder="10-digit mobile number"
                        />
                        {errors.contactPhone && <p className="error-text-elite">{errors.contactPhone}</p>}
                    </div>
                </div>
            </div>


            <div className="booking-actions-shell">
                <button className="btn-elite-outline" onClick={onBack}>
                    <span>←</span> BACK
                </button>
                <button className="btn-elite-primary" onClick={handleContinue}>
                    PROCEED TO PREFERENCES <span>→</span>
                </button>
            </div>
        </div>
    );
};

export default HotelTravellerDetails;
