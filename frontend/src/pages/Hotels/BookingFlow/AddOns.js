import React, { useState } from "react";
import { formatCurrency } from "../../../utils/currency";
import { HOTEL_MEAL_ADDON_PRICES } from "../../../utils/hotelAddOns";

const defaultAddOns = {
    breakfast: false,
    lunch: false,
    dinner: false,
    gstRequired: false,
    specialRequest: ""
};

const HotelAddOns = ({ data, onNext, onBack, onUpdate }) => {
    const [stayAddOns, setStayAddOns] = useState({
        ...defaultAddOns,
        ...(data.experienceAddOns || {})
    });

    const toggleAddOn = (field) => {
        const updated = { ...stayAddOns, [field]: !stayAddOns[field] };
        setStayAddOns(updated);
        onUpdate({ experienceAddOns: updated });
    };

    const updateText = (field, value) => {
        const updated = { ...stayAddOns, [field]: value };
        setStayAddOns(updated);
        onUpdate({ experienceAddOns: updated });
    };

    return (
        <div className="addons-step elite-design-v4">
            <div className="card-v4 premium-glass">
                <div className="section-header-row">
                    <h3><span>MEAL</span> Meal Add-ons</h3>
                    <div className="elite-badge">Breakfast / Lunch / Dinner</div>
                </div>

                <div className="elite-selection-grid mt-30">
                    {[
                        {
                            key: "breakfast",
                            icon: "BRKF",
                            title: "Breakfast",
                            description: "Fresh breakfast service added to your hotel booking.",
                            price: `${formatCurrency(HOTEL_MEAL_ADDON_PRICES.breakfast)} / guest`
                        },
                        {
                            key: "lunch",
                            icon: "LNCH",
                            title: "Lunch",
                            description: "Add a daytime meal option for a more comfortable stay.",
                            price: `${formatCurrency(HOTEL_MEAL_ADDON_PRICES.lunch)} / guest`
                        },
                        {
                            key: "dinner",
                            icon: "DNNR",
                            title: "Dinner",
                            description: "Pre-book dinner so your meal arrangement is already ready.",
                            price: `${formatCurrency(HOTEL_MEAL_ADDON_PRICES.dinner)} / guest`
                        }
                    ].map((item) => (
                        <button
                            key={item.key}
                            type="button"
                            className={`addon-card-v4 ${stayAddOns[item.key] ? "active" : ""}`}
                            onClick={() => toggleAddOn(item.key)}
                        >
                            <div className="addon-icon-v4">{item.icon}</div>
                            <h4 className="white-bold">{item.title}</h4>
                            <p className="label-text-dim">{item.description}</p>
                            <div className="price-row-v4 mt-20">
                                <span className="cyan-highlight white-bold">{item.price}</span>
                                <span className="elite-badge">{stayAddOns[item.key] ? "Selected" : "Optional"}</span>
                            </div>
                        </button>
                    ))}
                </div>

                <div className="card-v4 glass-info mt-24">
                    <label className="custom-checkbox-v4">
                        <input
                            type="checkbox"
                            checked={stayAddOns.gstRequired}
                            onChange={() => toggleAddOn("gstRequired")}
                        />
                        <span className="checkmark"></span>
                        <div style={{ marginLeft: "10px" }}>
                            <p className="white-bold no-margin">Need GST invoice</p>
                            <p className="label-text-dim no-margin" style={{ textTransform: "none" }}>
                                We will keep tax invoice details ready for business travel.
                            </p>
                        </div>
                    </label>
                </div>

                <div className="form-field-v2 mt-24">
                    <label>SPECIAL REQUESTS FOR HOTEL</label>
                    <textarea
                        className="elite-input"
                        style={{ width: "100%", minHeight: "120px", padding: "20px", resize: "none", borderStyle: "dashed" }}
                        value={stayAddOns.specialRequest}
                        onChange={(e) => updateText("specialRequest", e.target.value)}
                        placeholder="Meal preference, quiet stay, accessibility support, or any arrival note."
                    />
                </div>
            </div>

            <div className="booking-actions-shell">
                <button className="btn-elite-outline" onClick={onBack}>
                    <span>&larr;</span> BACK
                </button>
                <button className="btn-elite-primary" onClick={onNext}>
                    CONTINUE TO PAYMENT <span>&rarr;</span>
                </button>
            </div>
        </div>
    );
};

export default HotelAddOns;
