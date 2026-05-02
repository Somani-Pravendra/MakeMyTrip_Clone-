import React, { useEffect, useMemo, useState } from "react";
import { formatCurrency } from "../../../utils/currency";

const MEAL_MENU = {
    veg: [
        { id: "veg_combo", name: "Highway Veg Combo", price: 160 },
        { id: "sandwich_snack", name: "Sandwich & Juice", price: 130 },
        { id: "tea_snacks", name: "Tea & Snacks Pack", price: 90 }
    ],
    nonveg: [
        { id: "chicken_roll", name: "Chicken Roll Combo", price: 210 },
        { id: "egg_puff", name: "Egg Puff Box", price: 140 },
        { id: "grilled_wrap", name: "Grilled Chicken Wrap", price: 190 }
    ]
};

const NO_MEAL_OPTION = { id: "", name: "No Meal", price: 0 };
const MAX_MEAL_QUANTITY = 5;

const BusAddOns = ({ data, onNext, onBack, onUpdate }) => {
    const passengerCount = Math.max(data.passengers?.length || data.selectedSeats?.length || 1, 1);
    const existingMeal = data.addOns?.meals?.[0] || null;

    const [mealType, setMealType] = useState(existingMeal?.mealType || "veg");
    const [mealId, setMealId] = useState(existingMeal?.id || "");
    const [mealQuantity, setMealQuantity] = useState(existingMeal?.quantity || 1);
    const maxMealQuantity = Math.min(Math.max(passengerCount, 1), MAX_MEAL_QUANTITY);

    const mealOptions = useMemo(
        () => [NO_MEAL_OPTION, ...(MEAL_MENU[mealType] || MEAL_MENU.veg)],
        [mealType]
    );

    useEffect(() => {
        const hasMeal = mealOptions.some((meal) => meal.id === mealId);
        if (!hasMeal) {
            setMealId(mealOptions[0].id);
        }
    }, [mealId, mealOptions]);

    useEffect(() => {
        setMealQuantity((current) => Math.min(Math.max(Number(current) || 1, 1), maxMealQuantity));
    }, [maxMealQuantity]);

    const selectedMeal = mealOptions.find((meal) => meal.id === mealId) || NO_MEAL_OPTION;
    const mealTotal = selectedMeal.id
        ? selectedMeal.price * Math.max(Number(mealQuantity) || 1, 1)
        : 0;

    useEffect(() => {
        const meals = selectedMeal.id
            ? [{
                id: selectedMeal.id,
                name: selectedMeal.name,
                price: selectedMeal.price,
                quantity: Math.max(Number(mealQuantity) || 1, 1),
                totalPrice: mealTotal,
                mealType
            }]
            : [];

        onUpdate({
            addOns: {
                meals,
                insurance: false
            }
        });
    }, [mealQuantity, mealTotal, mealType, onUpdate, selectedMeal]);

    return (
        <div className="addons-step elite-design-v4">
            <div className="card-v4 premium-glass">
                <div className="section-header-row">
                    <h3><span>MEAL</span> Bus Meal Selection</h3>
                    <div className="elite-badge">Pit-stop Meals</div>
                </div>

                <div className="elite-form-row double">
                    <div className="form-field-v2">
                        <label>Meal Type</label>
                        <select className="elite-select" value={mealType} onChange={(event) => setMealType(event.target.value)}>
                            <option value="veg">Vegetarian</option>
                            <option value="nonveg">Non-Vegetarian</option>
                        </select>
                    </div>

                    <div className="form-field-v2">
                        <label>Meal Option</label>
                        <select className="elite-select" value={mealId} onChange={(event) => setMealId(event.target.value)}>
                            {mealOptions.map((meal) => (
                                <option key={meal.id || "no-meal"} value={meal.id}>
                                    {meal.name} ({formatCurrency(meal.price)})
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="elite-form-row double mt-20">
                    <div className="form-field-v2">
                        <label>Quantity</label>
                        <div className="meal-quantity-stepper">
                            <button
                                type="button"
                                className="meal-stepper-btn"
                                onClick={() => setMealQuantity((current) => Math.max(1, current - 1))}
                                disabled={!selectedMeal.id || mealQuantity <= 1}
                            >
                                -
                            </button>
                            <span className="meal-stepper-value">{selectedMeal.id ? mealQuantity : 0}</span>
                            <button
                                type="button"
                                className="meal-stepper-btn"
                                onClick={() => setMealQuantity((current) => Math.min(maxMealQuantity, current + 1))}
                                disabled={!selectedMeal.id || mealQuantity >= maxMealQuantity}
                            >
                                +
                            </button>
                        </div>
                        <p className="meal-stepper-note">You can select up to {maxMealQuantity} meals for this booking.</p>
                    </div>

                    <div className="form-field-v2">
                        <label>Meal Total</label>
                        <input className="elite-input" type="text" value={formatCurrency(mealTotal)} readOnly />
                    </div>
                </div>
            </div>

            <div className="card-v4 glass-warning mt-24">
                <p className="no-margin label-text-dim-large" style={{ textTransform: "none" }}>
                    Traveller insurance has been removed from bus booking add-ons. Only meal selection is available here.
                </p>
            </div>

            <div className="booking-actions-shell">
                <button className="btn-elite-outline" onClick={onBack}>
                    Back
                </button>
                <button className="btn-elite-primary" onClick={onNext}>
                    Continue to Payment
                </button>
            </div>
        </div>
    );
};

export default BusAddOns;
