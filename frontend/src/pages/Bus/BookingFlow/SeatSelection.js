import React, { useEffect, useState } from "react";
import { useToast } from "../../../contexts/ToastContext";
import { API_BASE_URL } from "../../../utils/api";

const SeatSelection = ({ data, onNext, onBack, onUpdate }) => {
    const perSeatPrice = data.bus?.price || data.bus?.fare || data.basePrice || 0;

    const [selectedSeats, setSelectedSeats] = useState(
        data.selectedSeats.map((seat) => (typeof seat === "string" ? { id: seat, price: perSeatPrice } : seat)) || []
    );

    const rows = 10;
    const berthColumns = [
        { key: "L1", side: "left", tier: "lower" },
        { key: "L2", side: "left", tier: "upper" },
        null,
        { key: "R1", side: "right", tier: "lower" },
        { key: "R2", side: "right", tier: "upper" }
    ];

    const [occupiedSeats, setOccupiedSeats] = useState([]);
    const requiredSeats = data.passengers.length;
    const availableSeats = Math.max(Number(data.bus?.availableSeats) || 0, 0);
    const { showToast } = useToast();

    const isSeatSelected = (seatId) => selectedSeats.some((seat) => seat.id === seatId);

    useEffect(() => {
        let isMounted = true;

        const loadOccupiedSeats = async () => {
            if (!data.bus?._id) {
                setOccupiedSeats([]);
                return;
            }

            try {
                const response = await fetch(`${API_BASE_URL}/buses/${data.bus._id}/seats`);
                const result = await response.json();
                if (isMounted) {
                    setOccupiedSeats(Array.isArray(result?.data) ? result.data.map((seat) => String(seat).trim().toUpperCase()) : []);
                }
            } catch (error) {
                if (isMounted) {
                    setOccupiedSeats([]);
                }
            }
        };

        loadOccupiedSeats();
        return () => {
            isMounted = false;
        };
    }, [data.bus?._id]);

    const toggleSeat = (seatId) => {
        if (occupiedSeats.includes(seatId)) return;

        let nextSeats;
        if (isSeatSelected(seatId)) {
            nextSeats = selectedSeats.filter((seat) => seat.id !== seatId);
        } else {
            if (selectedSeats.length >= requiredSeats) {
                showToast({
                    type: "warning",
                    title: "Seat limit reached",
                    message: `You have already selected ${requiredSeats} seat(s) for your travellers.`
                });
                return;
            }
            nextSeats = [...selectedSeats, { id: seatId, price: perSeatPrice }];
        }

        setSelectedSeats(nextSeats);
        onUpdate({
            selectedSeats: nextSeats,
            totalFare: nextSeats.length * perSeatPrice
        });
    };

    return (
        <div className="seat-selection-step elite-design-v4">
            <div className="card-v4 premium-glass">
                <div className="section-header-row">
                    <h3><span>SEAT</span> Select Seats</h3>
                    <div className="elite-badge">{requiredSeats} Travellers</div>
                </div>
                <p className="label-text-dim" style={{ marginTop: "10px" }}>
                    Seats currently available: {availableSeats}
                </p>

                <div className="seat-map-shell mt-30">
                    <div className="bus-deck-shell">
                        <div className="bus-layout-header">
                            <div className="bus-layout-pill">Sleeper Coach Layout</div>
                            <div className="bus-layout-pill subtle">{requiredSeats} berth needed</div>
                        </div>

                        <div className="bus-layout-guide">
                            <span>Left Berths</span>
                            <span className="aisle-guide-pill">Aisle</span>
                            <span>Right Berths</span>
                        </div>

                        <div className="steering-wheel-indicator">DRV</div>

                        <div className="bus-internal-grid">
                            {Array.from({ length: rows }).map((_, rowIndex) => (
                                <div key={rowIndex} className="bus-row-shell">
                                    <div className="bus-row-label">{String(rowIndex + 1).padStart(2, "0")}</div>
                                    <div className="bus-row-v4">
                                        {berthColumns.map((column, columnIndex) => {
                                            if (!column) {
                                                return <div key={`aisle-${rowIndex}-${columnIndex}`} className="aisle-spacer-v4"></div>;
                                            }

                                            const normalizedIndex = columnIndex > 2 ? columnIndex - 1 : columnIndex;
                                            const seatNum = (rowIndex * 4) + normalizedIndex + 1;
                                            const seatId = `S${seatNum}`;
                                            const taken = occupiedSeats.includes(seatId);
                                            const selected = isSeatSelected(seatId);

                                            return (
                                                <div
                                                    key={seatId}
                                                    onClick={() => !taken && toggleSeat(seatId)}
                                                    className={`seat-v4 berth-seat ${column.side} ${column.tier} ${taken ? "occupied" : ""} ${selected ? "selected" : ""}`}
                                                >
                                                    <span className="seat-tier-tag">{column.tier === "upper" ? "U" : "L"}</span>
                                                    <span className="seat-id-text">{seatId}</span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="seat-legend-v4 mt-30">
                        <div className="legend-item-v4">
                            <div className="legend-box-v4 available"></div>
                            <span>Available</span>
                        </div>
                        <div className="legend-item-v4">
                            <div className="legend-box-v4 selected"></div>
                            <span>Selected</span>
                        </div>
                        <div className="legend-item-v4">
                            <div className="legend-box-v4 occupied"></div>
                            <span>Occupied</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="booking-actions-shell">
                <button className="btn-elite-outline" onClick={onBack}>
                    Back
                </button>
                <button
                    className="btn-elite-primary"
                    onClick={onNext}
                    disabled={selectedSeats.length !== requiredSeats || requiredSeats > availableSeats}
                >
                    {requiredSeats > availableSeats
                        ? `Only ${availableSeats} seat(s) available`
                        : selectedSeats.length === requiredSeats
                        ? `Continue with ${selectedSeats.length} seats`
                        : `Select ${requiredSeats - selectedSeats.length} more seats`}
                </button>
            </div>
        </div>
    );
};

export default SeatSelection;
