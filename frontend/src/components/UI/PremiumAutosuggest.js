import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import './PremiumAutosuggest.css';

const PremiumAutosuggest = ({
  label,
  value,
  placeholder,
  suggestions,
  onChange,
  onSuggestionSelect,
  onInputValidityChange,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [filtered, setFiltered] = useState([]);
  const wrapperRef = useRef(null);
  const inputRef = useRef(null);

  const normalizedSuggestions = useMemo(
    () => (suggestions || []).map((item) => ({
      raw: item,
      code: item?.code || '',
      city: item?.city || item?.name || item?.label || '',
      airport: item?.airport || item?.station || item?.terminal || item?.subtitle || '',
      country: item?.country || '',
    })),
    [suggestions]
  );

  const getDisplayValue = useCallback(
    (item) => (item.code ? `${item.city} (${item.code})` : item.city),
    []
  );

  const getMatches = useCallback((query) => {
    const cleanQuery = query.trim().toLowerCase();
    if (!cleanQuery) {
      return normalizedSuggestions.slice(0, 8);
    }

    return normalizedSuggestions.filter((item) =>
      [item.city, item.code, item.airport, item.country]
        .filter(Boolean)
        .some((field) => field.toLowerCase().includes(cleanQuery))
    );
  }, [normalizedSuggestions]);

  const getExactMatch = useCallback((query) => {
    const cleanQuery = query.trim().toLowerCase();
    if (!cleanQuery) return null;

    return normalizedSuggestions.find((item) =>
      [
        getDisplayValue(item),
        item.city,
        item.code,
        item.airport,
      ]
        .filter(Boolean)
        .some((field) => field.toLowerCase() === cleanQuery)
    ) || null;
  }, [getDisplayValue, normalizedSuggestions]);

  useEffect(() => {
    setFiltered(getMatches(value || ''));
  }, [value, getMatches]);

  useEffect(() => {
    if (!onInputValidityChange) return;
    onInputValidityChange(Boolean(getExactMatch(value || '')));
  }, [value, getExactMatch, onInputValidityChange]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleInputChange = (e) => {
    const val = e.target.value;
    onChange(val);
    setFiltered(getMatches(val));
    setIsOpen(true);
    onInputValidityChange?.(Boolean(getExactMatch(val)));
  };

  const selectItem = (item) => {
    const displayValue = getDisplayValue(item);
    onChange(displayValue);
    onSuggestionSelect?.(item.raw, displayValue);
    onInputValidityChange?.(true);
    setIsOpen(false);
  };

  return (
    <div className="premium-autosuggest-container" ref={wrapperRef}>
      <div
        className={`premium-input-box ${isOpen ? 'active' : ''}`}
        onClick={() => {
          setFiltered(getMatches(value || ''));
          setIsOpen(true);
          inputRef.current?.focus();
        }}
      >
        <label>{label}</label>
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={handleInputChange}
          onFocus={() => {
            setFiltered(getMatches(value || ''));
            setIsOpen(true);
          }}
          onBlur={() => {
            if (value && getExactMatch(value)) {
              onInputValidityChange?.(true);
            }
          }}
          onKeyDown={(event) => {
            if (event.key === 'Escape') {
              setIsOpen(false);
            }
            if (event.key === 'Enter' && filtered.length > 0) {
              event.preventDefault();
              selectItem(filtered[0]);
            }
          }}
          placeholder={placeholder}
          autoComplete="off"
        />
      </div>

      {isOpen && (
        <div className="premium-dropdown">
          {filtered.length > 0 ? filtered.map((item, idx) => (
            <div
              key={`${item.code}-${idx}`}
              className="suggestion-item"
              onMouseDown={(event) => {
                event.preventDefault();
                selectItem(item);
              }}
            >
              <div className="item-left">
                <span className="item-code">{item.code || item.city.slice(0, 3).toUpperCase()}</span>
              </div>
              <div className="item-right">
                <span className="item-city">{item.city}, {item.country}</span>
                <span className="item-airport">{item.airport || 'Select this location'}</span>
              </div>
            </div>
          )) : (
            <div className="suggestion-empty-state">No matching locations found.</div>
          )}
        </div>
      )}
    </div>
  );
};

export default PremiumAutosuggest;
