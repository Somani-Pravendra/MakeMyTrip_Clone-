import React, { useState, useEffect } from "react";

const TravellerDetails = ({ data, onNext, onBack, onUpdate }) => {
    const [passengers, setPassengers] = useState(() => {
        if (data.passengers && data.passengers.length > 0 && data.passengers[0].firstName !== undefined) {
            return data.passengers.map((p, i) => ({ ...p, id: p.id || `p-${Date.now()}-${i}` }));
        }
        return [{ id: `p-${Date.now()}-0`, firstName: "", lastName: "", age: "", gender: "Male" }];
    });
    const [contact, setContact] = useState(data.contactDetails || { email: "", phone: "" });
    const [errors, setErrors] = useState({});

    // Keep parent updated
    useEffect(() => {
        onUpdate({ passengers, contactDetails: contact });
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [passengers, contact]);

    const handlePassengerChange = (id, field, value) => {
        const updated = passengers.map(p => p.id === id ? { ...p, [field]: value } : p);
        setPassengers(updated);
        if (errors[`p_${id}_${field === 'firstName' ? 'fname' : field === 'lastName' ? 'lname' : 'age'}`]) {
             const newErrors = {...errors};
             delete newErrors[`p_${id}_${field === 'firstName' ? 'fname' : field === 'lastName' ? 'lname' : 'age'}`];
             setErrors(newErrors);
        }
    };

    const handleAddPassenger = () => {
        setPassengers([...passengers, { id: `p-${Date.now()}`, firstName: "", lastName: "", age: "", gender: "Male" }]);
    };

    const handleRemovePassenger = (id) => {
        if (passengers.length > 1) {
            setPassengers(passengers.filter(p => p.id !== id));
        }
    };

    const validate = () => {
        const newErrors = {};
        passengers.forEach(p => {
            if (!p.firstName) newErrors[`p_${p.id}_fname`] = "Required";
            if (!p.lastName) newErrors[`p_${p.id}_lname`] = "Required";
            if (!p.age) newErrors[`p_${p.id}_age`] = "Required";
        });
        if (!contact.email || !/\S+@\S+\.\S+/.test(contact.email)) newErrors.email = "Valid email required";
        if (!contact.phone || contact.phone.length < 10) newErrors.phone = "Valid 10-digit phone required";

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleContinue = () => {
        if (validate()) {
            onUpdate({ passengers, contactDetails: contact });
            onNext();
        }
    };

    return (
        <div className="traveller-details-step elite-design-v4">
            <div className="card-v4 premium-glass">
                <div className="section-header-row">
                    <h3><span>TRV</span> Traveller Details</h3>
                    <div className="elite-badge">{passengers.length} Passenger(s)</div>
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
                                <button className="remove-btn-elite" onClick={() => handleRemovePassenger(p.id)}>
                                    REMOVE
                                </button>
                            )}
                        </div>
                        
                        <div className="elite-form-row mt-20">
                            <div className="form-field-v2">
                                <label>FIRST & MIDDLE NAME</label>
                                <input
                                    type="text"
                                    className="elite-input"
                                    value={p.firstName}
                                    placeholder="e.g. John"
                                    onChange={(e) => handlePassengerChange(p.id, 'firstName', e.target.value)}
                                />
                                {errors[`p_${p.id}_fname`] && <p className="error-text-elite">{errors[`p_${p.id}_fname`]}</p>}
                            </div>
                            <div className="form-field-v2">
                                <label>LAST NAME</label>
                                <input
                                    type="text"
                                    className="elite-input"
                                    value={p.lastName}
                                    placeholder="e.g. Doe"
                                    onChange={(e) => handlePassengerChange(p.id, 'lastName', e.target.value)}
                                />
                                {errors[`p_${p.id}_lname`] && <p className="error-text-elite">{errors[`p_${p.id}_lname`]}</p>}
                            </div>
                            <div className="form-field-v2">
                                <label>AGE (YEARS)</label>
                                <input
                                    type="number"
                                    className="elite-input"
                                    value={p.age}
                                    placeholder="25"
                                    onChange={(e) => handlePassengerChange(p.id, 'age', e.target.value)}
                                />
                                {errors[`p_${p.id}_age`] && <p className="error-text-elite">{errors[`p_${p.id}_age`]}</p>}
                            </div>
                        </div>
                        <div className="elite-form-row double mt-20">
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

                <button className="btn-add-traveller mt-24" onClick={handleAddPassenger}>
                    + ADD ANOTHER TRAVELLER
                </button>
            </div>

            <div className="card-v4 premium-glass mt-24">
                <div className="section-header-row">
                    <h3><span>CNT</span> Contact Details</h3>
                    <div className="elite-badge">FOR E-TICKET</div>
                </div>
                <div className="elite-form-row mt-20">
                    <div className="form-field-v2">
                        <label>EMAIL ADDRESS</label>
                        <input
                            type="email"
                            className="elite-input"
                            value={contact.email}
                            onChange={(e) => {
                                setContact({ ...contact, email: e.target.value });
                                if (errors.email) {
                                    const newErrors = {...errors}; delete newErrors.email; setErrors(newErrors);
                                }
                            }}
                            placeholder="john.doe@example.com"
                        />
                        {errors.email && <p className="error-text-elite">{errors.email}</p>}
                    </div>
                    <div className="form-field-v2">
                        <label>MOBILE NUMBER</label>
                        <input
                            type="tel"
                            className="elite-input"
                            value={contact.phone}
                            onChange={(e) => {
                                setContact({ ...contact, phone: e.target.value });
                                if (errors.phone) {
                                    const newErrors = {...errors}; delete newErrors.phone; setErrors(newErrors);
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
                    <span>&lt;-</span> BACK
                </button>
                <button className="btn-elite-primary" onClick={handleContinue}>
                    CONTINUE TO SEAT SELECTION <span>-&gt;</span>
                </button>
            </div>
        </div>
    );
};

export default TravellerDetails;
