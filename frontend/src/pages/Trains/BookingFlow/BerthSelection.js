import React, { useState } from "react";

const BerthSelection = ({ data, onNext, onBack, onUpdate }) => {
    const [selectedBerths, setSelectedBerths] = useState(data.selectedBerths || []);
    const passengerCount = data.passengers.length || 1;

    const berths = [
        { id: 'LB', name: "Lower Berth", icon: "⫗" },
        { id: 'MB', name: "Middle Berth", icon: "⫗" },
        { id: 'UB', name: "Upper Berth", icon: "⫗" },
        { id: 'SU', name: "Side Upper", icon: "⫗" },
        { id: 'SL', name: "Side Lower", icon: "⫗" }
    ];

    const toggleBerth = (berthId) => {
        const updated = selectedBerths.includes(berthId)
            ? selectedBerths.filter(id => id !== berthId)
            : [...selectedBerths, berthId].slice(-passengerCount);

        setSelectedBerths(updated);
        onUpdate({ selectedBerths: updated });
    };

    return (
        <div className="berth-selection-page elite-design-v4">
            <div className="card-v4 premium-glass">
                <div className="section-header-row">
                    <h3><span>🛋️</span> Berth Preference</h3>
                    <div className="category-badge elite-badge">PREFERENCE MODE</div>
                </div>
                
                <p className="label-text-dim-large">
                    Select preferred berths for {passengerCount} passenger(s). We will coordinate with IRCTC to allocate these.
                </p>

                <div className="elite-berth-grid mt-24">
                    {berths.map(berth => {
                        const isSelected = selectedBerths.includes(berth.id);
                        return (
                            <div
                                key={berth.id}
                                onClick={() => toggleBerth(berth.id)}
                                className={`elite-berth-card ${isSelected ? 'active' : ''}`}
                            >
                                <div className="berth-icon-v2">{berth.icon}</div>
                                <div className="berth-name-v2">{berth.name}</div>
                                {isSelected && (
                                    <div className="selected-indicator-v2">
                                        <span className="dot"></span> SELECTED
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            <div className="card-v4 premium-glass glass-warning mt-24">
                <div className="warning-notice-v2">
                    <span className="info-icon">💡</span>
                    <p className="no-margin font-500">
                        <strong>Indian Railways Policy:</strong> Final berth allocation is subject to technical availability by IRCTC.
                    </p>
                </div>
            </div>

            <div className="booking-actions-footer mt-40">
                <button className="elite-btn-outline" onClick={onBack}>
                    <span>←</span> BACK
                </button>
                <button className="elite-btn-primary" onClick={onNext}>
                    CONTINUE TO ADD-ONS <span>→</span>
                </button>
            </div>
        </div>
    );
};

export default BerthSelection;
