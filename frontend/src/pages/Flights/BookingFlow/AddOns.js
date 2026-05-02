import React, { useEffect, useMemo, useState } from "react";
import { formatCurrency } from "../../../utils/currency";

const MEAL_MENU = {
  veg: [
    { id: "veg_thali", name: "Veg Thali", price: 320 },
    { id: "veg_wrap", name: "Paneer Wrap", price: 280 },
    { id: "veg_snack", name: "Veg Snack Box", price: 220 },
  ],
  nonveg: [
    { id: "chicken_meal", name: "Chicken Meal", price: 420 },
    { id: "fish_rice", name: "Fish and Rice", price: 460 },
    { id: "egg_snack", name: "Egg Snack Box", price: 260 },
  ],
};

const NO_MEAL_OPTION = { id: "", name: "No Meal", price: 0 };
const MAX_MEAL_QUANTITY = 5;

const BAGGAGE_OPTIONS = [
  { id: "", name: "No Extra Baggage", price: 0 },
  { id: "bag5", name: "Extra 5 Kg", price: 1500 },
  { id: "bag10", name: "Extra 10 Kg", price: 2800 },
  { id: "bag15", name: "Extra 15 Kg", price: 3900 },
];

const AddOns = ({ data, onNext, onBack, onUpdate }) => {
  const passengerCount = Math.max(data.passengers?.length || 1, 1);
  const currentAddOns = data.addOns || {};
  const existingMeal = currentAddOns.meals?.[0] || null;
  const existingBaggage = currentAddOns.baggage?.[0] || null;

  const [mealType, setMealType] = useState(existingMeal?.mealType || "veg");
  const [mealId, setMealId] = useState(existingMeal?.id || "");
  const [mealQuantity, setMealQuantity] = useState(existingMeal?.quantity || 1);
  const [baggageId, setBaggageId] = useState(existingBaggage?.id || "");
  const maxMealQuantity = Math.min(Math.max(passengerCount, 1), MAX_MEAL_QUANTITY);

  const mealOptions = useMemo(
    () => [NO_MEAL_OPTION, ...(MEAL_MENU[mealType] || MEAL_MENU.veg)],
    [mealType]
  );

  useEffect(() => {
    const hasMeal = mealOptions.some((item) => item.id === mealId);
    if (!hasMeal) {
      setMealId(mealOptions[0].id);
    }
  }, [mealOptions, mealId]);

  useEffect(() => {
    setMealQuantity((current) => Math.min(Math.max(Number(current) || 1, 1), maxMealQuantity));
  }, [maxMealQuantity]);

  const selectedMeal = mealOptions.find((item) => item.id === mealId) || NO_MEAL_OPTION;
  const selectedBaggage = BAGGAGE_OPTIONS.find((item) => item.id === baggageId) || BAGGAGE_OPTIONS[0];

  const mealTotal =
    selectedMeal && selectedMeal.id
      ? selectedMeal.price * Math.max(Number(mealQuantity) || 1, 1)
      : 0;
  const baggageTotal = selectedBaggage?.price || 0;

  useEffect(() => {
    const meals = selectedMeal?.id
      ? [
          {
            id: selectedMeal.id,
            name: selectedMeal.name,
            price: selectedMeal.price,
            quantity: Math.max(Number(mealQuantity) || 1, 1),
            totalPrice: mealTotal,
            mealType,
          },
        ]
      : [];

    const baggage = selectedBaggage?.price
      ? [{ ...selectedBaggage, quantity: 1, totalPrice: selectedBaggage.price }]
      : [];

    onUpdate({
      addOns: {
        meals,
        baggage,
        insurance: false,
      },
    });
  }, [onUpdate, selectedMeal, selectedBaggage, mealQuantity, mealType, mealTotal]);

  return (
    <div className="addons-page elite-design-v4">
      <div className="card-v4 premium-glass">
        <div className="section-header-row">
          <h3>
            <span>MEAL</span> Meal Preferences
          </h3>
          <div className="elite-badge">Veg / Non-Veg</div>
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
                <option key={meal.id} value={meal.id}>
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
                disabled={!selectedMeal?.id || mealQuantity <= 1}
              >
                -
              </button>
              <span className="meal-stepper-value">{selectedMeal?.id ? mealQuantity : 0}</span>
              <button
                type="button"
                className="meal-stepper-btn"
                onClick={() => setMealQuantity((current) => Math.min(maxMealQuantity, current + 1))}
                disabled={!selectedMeal?.id || mealQuantity >= maxMealQuantity}
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

      <div className="card-v4 premium-glass mt-24">
        <div className="section-header-row">
          <h3>
            <span>BAG</span> Extra Baggage
          </h3>
          <div className="elite-badge">Single Select</div>
        </div>

        <div className="form-field-v2">
          <label>Choose Baggage Option</label>
          <select className="elite-select" value={baggageId} onChange={(event) => setBaggageId(event.target.value)}>
            {BAGGAGE_OPTIONS.map((bag) => (
              <option key={bag.id || "none"} value={bag.id}>
                {bag.name} {bag.price > 0 ? `(${formatCurrency(bag.price)})` : ""}
              </option>
            ))}
          </select>
        </div>

        <div className="summary-row total-box mt-24">
          <span className="white-bold">Baggage Total</span>
          <span className="total-amt">{formatCurrency(baggageTotal)}</span>
        </div>
      </div>

      <div className="card-v4 glass-warning mt-24">
        <p className="no-margin label-text-dim-large" style={{ textTransform: "none" }}>
          Travel insurance has been removed from this booking flow as requested.
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
