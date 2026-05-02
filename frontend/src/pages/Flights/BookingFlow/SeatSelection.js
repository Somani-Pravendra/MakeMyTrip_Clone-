import React, { useState } from "react";
import { API_BASE_URL } from "../../../utils/api";
import { useToast } from "../../../contexts/ToastContext";
import { formatCurrency } from "../../../utils/currency";

const SeatSelection = ({ data, onNext, onBack, onUpdate }) => {
    const [selectedSeats, setSelectedSeats] = useState(data.selectedSeats || []);
    const [occupiedSeats, setOccupiedSeats] = useState([]);
    const { showToast } = useToast();

    React.useEffect(() => {
        const fetchOccupiedSeats = async () => {
            try {
                if (data.flight && data.flight._id) {
                    const res = await fetch(`${API_BASE_URL}/flights/${data.flight._id}/seats`);
                    const occupied = await res.json();
                    setOccupiedSeats(occupied || []);
                }
            } catch (err) {
                console.error("Error fetching seats:", err);
            }
        };
        fetchOccupiedSeats();
    }, [data.flight]);

    const rows = 10;
    const cols = ["A", "B", "C", "", "D", "E", "F"]; // empty string for aisle

    const isSeatSelected = (seatId) => selectedSeats.some(s => s.id === seatId);
    const isSeatTaken = (seatId) => occupiedSeats.includes(seatId);

    const requiredSeats = Math.max(data.passengers?.length || 1, 1);

    const toggleSeat = (seatId) => {
        if (isSeatTaken(seatId)) return;

        if (isSeatSelected(seatId)) {
            const removedSeat = selectedSeats.find(s => s.id === seatId);
            const newList = selectedSeats.filter(s => s.id !== seatId);
            setSelectedSeats(newList);
            onUpdate({ selectedSeats: newList, totalFare: (data.totalFare || 0) - (removedSeat?.price || 0) });
        } else {
            if (selectedSeats.length >= requiredSeats) {
                showToast({
                    type: "warning",
                    title: "Seat limit reached",
                    message: `You have already selected ${requiredSeats} seat(s) for your travellers.`
                });
                return;
            }
            const price = seatId.includes("A") || seatId.includes("F") ? 250 : 0; 
            const newList = [...selectedSeats, { id: seatId, price }];
            setSelectedSeats(newList);
            onUpdate({ selectedSeats: newList });
        }
    };

    return (
        <div className="seat-selection-step elite-design-v4">
            <div className="card-v4 premium-glass">
                <div className="section-header-row">
                    <h3><span>SEAT</span> Select Your Seats</h3>
                    <div className="elite-badge">{selectedSeats.length} / {requiredSeats} Selected</div>
                </div>
                
                <p className="label-text-dim-large mt-10">
                    Window seats (A and F) have an additional convenience fee of <span className="cyan-highlight">{formatCurrency(250)}</span>.
                </p>

                <div className="seat-map-shell mt-40">
                    <div className="seat-grid-header">
                        {cols.map((c, i) => (
                            <div key={i} className="column-label">{c}</div>
                        ))}
                    </div>

                    <div className="seat-rows-container">
                        {Array.from({ length: rows }).map((_, r) => (
                            <div key={r} className="seat-row-v4">
                                {cols.map((c, i) => {
                                    if (c === "") return <div key={i} className="row-number-pill">{r + 1}</div>;

                                    const seatId = `${r + 1}${c}`;
                                    const taken = isSeatTaken(seatId);
                                    const selected = isSeatSelected(seatId);

                                    return (
                                        <div
                                            key={seatId}
                                            onClick={() => toggleSeat(seatId)}
                                            className={`seat-v4 flight-seat-tile ${taken ? 'occupied' : selected ? 'selected' : ''}`}
                                        >
                                            <span className="seat-id-text">{seatId}</span>
                                            {selected && <span className="flight-seat-badge">SEL</span>}
                                        </div>
                                    );
                                })}
                            </div>
                        ))}
                    </div>
                </div>

                <div className="seat-legend-v4 mt-40">
                    <div className="legend-item">
                        <div className="seat-v4 mini"></div>
                        <span>Available</span>
                    </div>
                    <div className="legend-item">
                        <div className="seat-v4 selected mini">S</div>
                        <span>Selected</span>
                    </div>
                    <div className="legend-item">
                        <div className="seat-v4 occupied mini"></div>
                        <span>Occupied</span>
                    </div>
                </div>
            </div>

            <div className="booking-actions-shell">
                <button className="btn-elite-outline" onClick={onBack}>
                    <span>&lt;-</span> BACK
                </button>
                <button 
                    className="btn-elite-primary" 
                    onClick={onNext}
                    disabled={selectedSeats.length !== requiredSeats}
                >
                    {selectedSeats.length === requiredSeats 
                        ? `CONFIRM ${selectedSeats.length} SEAT(S) ->` 
                        : `SELECT ${requiredSeats - selectedSeats.length} MORE SEAT(S)`}
                </button>
            </div>
        </div>
    );
};

export default SeatSelection;
