import React, { useMemo, useRef } from "react";
import { formatCurrency } from "../../utils/currency";
import { parseDateInput, toDateInputValue } from "../../utils/dateTokens";
import "./DatePriceStrip.css";

const DAY_COUNT = 8;

const PRICE_VARIATIONS = [0, -0.06, -0.04, -0.02, -0.02, -0.08, -0.05, -0.05];

const getSafeDate = (value) => {
  return parseDateInput(value) || new Date();
};

const getDateItems = (selectedDate, basePrice) => {
  const startDate = getSafeDate(selectedDate);
  const safeBasePrice = Math.max(Number(basePrice) || 0, 0);

  return Array.from({ length: DAY_COUNT }, (_, index) => {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + index);

    const adjustedPrice = index === 0
      ? safeBasePrice
      : Math.max(Math.round(safeBasePrice * (1 + (PRICE_VARIATIONS[index] || 0))), 0);

    return {
      id: toDateInputValue(date),
      label: date.toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric"
      }),
      price: adjustedPrice,
      available: true
    };
  });
};

const normalizeItems = (items = []) =>
  items.map((item) => {
    const safeDate = getSafeDate(item.date || item.id);
    const normalizedId = item.id || toDateInputValue(safeDate);

    return {
      id: normalizedId,
      label:
        item.label ||
        safeDate.toLocaleDateString("en-US", {
          weekday: "short",
          month: "short",
          day: "numeric"
        }),
      price: typeof item.price === "number" ? item.price : null,
      available: item.available !== false && typeof item.price === "number"
    };
  });

function DatePriceStrip({
  selectedDate,
  minPrice,
  items: providedItems,
  onSelect,
  title = "Prices for nearby dates",
  className = ""
}) {
  const railRef = useRef(null);
  const items = useMemo(() => {
    if (Array.isArray(providedItems) && providedItems.length > 0) {
      return normalizeItems(providedItems);
    }

    return getDateItems(selectedDate, minPrice);
  }, [providedItems, selectedDate, minPrice]);

  const handleScroll = (direction) => {
    if (!railRef.current) return;
    railRef.current.scrollBy({
      left: direction * 280,
      behavior: "smooth"
    });
  };

  return (
    <div className={`date-price-strip ${className}`.trim()}>
      <div className="date-price-strip__top">
        <p>{title}</p>
      </div>

      <div className="date-price-strip__shell">
        <button
          type="button"
          className="date-price-strip__nav"
          onClick={() => handleScroll(-1)}
          aria-label="Scroll previous dates"
        >
          {"<"}
        </button>

        <div className="date-price-strip__rail" ref={railRef}>
          {items.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`date-price-strip__item ${item.id === selectedDate ? "active" : ""} ${!item.available ? "disabled" : ""}`.trim()}
              onClick={() => item.available && onSelect?.(item.id)}
              disabled={!item.available}
            >
              <span className="date-price-strip__date">{item.label}</span>
              <span className="date-price-strip__price">
                {item.available ? formatCurrency(item.price) : "Sold out"}
              </span>
            </button>
          ))}
        </div>

        <button
          type="button"
          className="date-price-strip__nav"
          onClick={() => handleScroll(1)}
          aria-label="Scroll next dates"
        >
          {">"}
        </button>
      </div>
    </div>
  );
}

export default DatePriceStrip;
