import React, { useEffect, useMemo, useState } from "react";
import { formatCurrency } from "../../../utils/currency";

const MEAL_MENU = {
    veg: [
        { id: "rajdhani_veg", name: "Rajdhani Veg Meal", price: 180 },
        { id: "mini_thali", name: "Mini Veg Thali", price: 150 },
        { id: "breakfast_combo", name: "Breakfast Combo", price: 120 }
    ],
    nonveg: [
        { id: "chicken_meal", name: "Chicken Curry Meal", price: 220 },
        { id: "egg_biryani", name: "Egg Biryani Box", price: 190 },
        { id: "omelette_combo", name: "Omelette Combo", price: 140 }
    ]
};

const NO_MEAL_OPTION = { id: "", name: "No Meal", price: 0 };
const MAX_MEAL_QUANTITY = 5;

const AddOns = ({ data, onNext, onBack, onUpdate }) => {
    const passengerCount = Math.max(data.passengers?.length || 1, 1);
    const existingMeal = data.addOns?.meals?.[0] || data.addOns?.catering?.[0] || null;

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
                catering: meals,
                insurance: false
            }
        });
    }, [mealQuantity, mealTotal, mealType, onUpdate, selectedMeal]);

    return (
        <div className="addons-page elite-design-v4">
            <div className="card-v4 premium-glass">
                <div className="section-header-row">
                    <h3><span>MEAL</span> Train Meal Selection</h3>
                    <div className="elite-badge">E-Catering</div>
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
                    Traveller insurance has been removed from train booking add-ons. Only meal selection is available here.
                </p>
            </div>

            <div className="booking-actions-shell">
                <button className="btn-elite-outline" onClick={onBack}>
                    <span>&lt;-</span> BACK
                </button>
                <button className="btn-elite-primary" onClick={onNext}>
                    CONTINUE TO PAYMENT <span>-&gt;</span>
                </button>
            </div>
        </div>
    );
};

export default AddOns;
