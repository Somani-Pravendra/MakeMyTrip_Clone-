import React, { useState } from "react";

const TrainAddOns = ({ data, onNext, onBack, onUpdate }) => {
    const [selectedMeals, setSelectedMeals] = useState(data.addOns.meals || []);
    const [insurance, setInsurance] = useState(data.addOns.insurance || false);

    const mealsList = [
        { id: 'm1', name: "Veg Thali", price: 180, icon: "🍱" },
        { id: 'm2', name: "Egg Thali", price: 220, icon: "🍳" },
        { id: 'm3', name: "Tea & Snacks", price: 80, icon: "☕" }
    ];

    const toggleMeal = (meal) => {
        const isSelected = selectedMeals.some(m => m.id === meal.id);
        const newList = isSelected
            ? selectedMeals.filter(m => m.id !== meal.id)
            : [...selectedMeals, meal];
        setSelectedMeals(newList);
        onUpdate({ addOns: { ...data.addOns, meals: newList } });
    };

    const toggleInsurance = () => {
        setInsurance(!insurance);
        onUpdate({ addOns: { ...data.addOns, insurance: !insurance } });
    };

    return (
        <div className="addons-page">
            <div className="card-v4">
                <h3><span>🍱</span> E-Catering Meals</h3>
                <p style={{ fontSize: '13px', color: '#777', marginBottom: '20px' }}>
                    Pre-book your meals and get them delivered to your seat.
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '15px' }}>
                    {mealsList.map(meal => {
                        const isSelected = selectedMeals.some(m => m.id === meal.id);
                        return (
                            <div
                                key={meal.id}
                                onClick={() => toggleMeal(meal)}
                                style={{
                                    padding: '15px',
                                    border: `2px solid ${isSelected ? '#008cff' : '#eee'}`,
                                    borderRadius: '12px',
                                    textAlign: 'center',
                                    cursor: 'pointer',
                                    background: isSelected ? '#f0f8ff' : '#fff'
                                }}
                            >
                                <div style={{ fontSize: '30px', marginBottom: '10px' }}>{meal.icon}</div>
                                <div style={{ fontWeight: '700', fontSize: '14px' }}>{meal.name}</div>
                                <div style={{ color: '#008cff', fontWeight: '900', marginTop: '5px' }}>₹{meal.price}</div>
                            </div>
                        );
                    })}
                </div>
            </div>

            <div className="card-v4" style={{ border: insurance ? '2px solid #219653' : '2px solid #eee' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                    <div style={{ fontSize: '40px' }}>🛡️</div>
                    <div style={{ flex: 1 }}>
                        <h3 style={{ margin: 0, fontSize: '18px' }}>Travel Insurance</h3>
                        <p style={{ margin: '5px 0', fontSize: '13px', color: '#777' }}>Enjoy risk-free travel with trip insurance for just ₹35 per person.</p>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                        <button
                            onClick={toggleInsurance}
                            style={{
                                background: insurance ? '#219653' : '#008cff',
                                color: '#fff',
                                border: 'none',
                                padding: '8px 20px',
                                borderRadius: '20px',
                                fontWeight: '700',
                                cursor: 'pointer'
                            }}
                        >
                            {insurance ? 'ADDED' : 'ADD'}
                        </button>
                    </div>
                </div>
            </div>

            <div className="booking-actions">
                <button className="booking-btn-outline" onClick={onBack}>Back</button>
                <button className="booking-btn-primary" onClick={onNext}>Continue</button>
            </div>
        </div>
    );
};

export default TrainAddOns;
