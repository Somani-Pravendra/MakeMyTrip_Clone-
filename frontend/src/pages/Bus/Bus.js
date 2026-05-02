import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../contexts/AuthContext';
import './Bus.css';
import { API_BASE_URL } from '../../utils/api';
import PremiumAutosuggest from '../../components/UI/PremiumAutosuggest';
import {
  TravelSearchActions,
  TravelSearchButton,
  TravelSearchField,
  TravelSearchShell,
  TravelSearchSwapButton
} from '../../components/UI/TravelSearchShell';
import { BUS_STOPS } from '../../data/LocationData';
import { getTodayDateString } from '../../utils/dateShortcuts';
import { buildAuthRedirect } from '../../utils/authRedirect';
import { matchesDateQuery, matchesPartialQuery } from '../../utils/travelSearch';

const API = `${API_BASE_URL}/buses`;
const BUS_CITY_ALIASES = {
  bengaluru: ['bengaluru', 'bangalore', 'banglore'],
  mumbai: ['mumbai', 'bombay'],
  delhi: ['delhi', 'new delhi'],
  kolkata: ['kolkata', 'calcutta']
};
const toTitleCase = (value = '') =>
  String(value)
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');
const normalizeBusCity = (value = '') => {
  const cleaned = String(value || '').trim().toLowerCase();
  if (!cleaned) return '';

  const canonicalEntry = Object.entries(BUS_CITY_ALIASES).find(([, aliases]) => aliases.includes(cleaned));
  return canonicalEntry ? toTitleCase(canonicalEntry[0]) : toTitleCase(cleaned);
};
const extractBusCity = (value = '') => {
  const cleaned = String(value || '').trim();
  if (!cleaned) return '';

  return normalizeBusCity(cleaned.replace(/\s*\([A-Za-z0-9]+\)\s*$/, ''));
};
const resolveBusSearchStop = (input, suggestions = []) => {
  const rawQuery = String(input || '').trim().toLowerCase();
  const normalizedCity = extractBusCity(input);

  if (!rawQuery && !normalizedCity) return null;

  const matchedSuggestion = suggestions.find((item) =>
    [
      item.city,
      item.code,
      item.airport,
      `${item.city} (${item.code})`,
    ]
      .filter(Boolean)
      .some((field) => {
        const normalizedField = String(field).trim().toLowerCase();
        return normalizedField === rawQuery || normalizedField === normalizedCity.toLowerCase();
      })
  );

  if (matchedSuggestion) {
    return {
      ...matchedSuggestion,
      city: normalizeBusCity(matchedSuggestion.city)
    };
  }

  if (!normalizedCity) return null;

  return {
    city: normalizedCity,
    code: normalizedCity.slice(0, 3).toUpperCase(),
    airport: `${normalizedCity} Bus Stand`
  };
};

export default function Bus() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated } = useAuth();

  const today = getTodayDateString();
  const nav = location.state || {};

  /* ── Search inputs ─────────────────────────────── */
  const [from, setFrom] = useState(nav.from || '');
  const [to, setTo] = useState(nav.to || '');
  const [date, setDate] = useState(nav.date || '');

  /* ── Results ───────────────────────────────────── */
  const [buses, setBuses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(Boolean(nav.from || nav.to || nav.date));
  const [error, setError] = useState('');
  const [expandedId, setExpandedId] = useState(null);
  const [isFromValid, setIsFromValid] = useState(Boolean(extractBusCity(nav.from)));
  const [isToValid, setIsToValid] = useState(Boolean(extractBusCity(nav.to)));

  // Refs so the fetch function always reads the latest values WITHOUT being
  // recreated every keystroke (avoids triggering the auth useEffect on clear)
  const fromRef = useRef(from);
  const toRef = useRef(to);
  const dateRef = useRef(date);
  useEffect(() => { fromRef.current = from; }, [from]);
  useEffect(() => { toRef.current = to; }, [to]);
  useEffect(() => { dateRef.current = date; }, [date]);

  /* ── Filters ────────────────────────────────────── */
  const [fOperators, setFOperators] = useState([]);
  const [fBusTypes, setFBusTypes] = useState([]);
  const [fPrice, setFPrice] = useState([0, 5000]);
  const [priceBounds, setPriceBounds] = useState([0, 5000]);
  const [fSlots, setFSlots] = useState([]);
  const [fMinRating, setFMinRating] = useState(null);
  const [fTravelDate, setFTravelDate] = useState('');
  const [fSortBy, setFSortBy] = useState('recommended');
  const [showMoreOps, setShowMoreOps] = useState(false);
  const [showMoreBT, setShowMoreBT] = useState(false);
  const busSuggestions = useMemo(() => {
    const byKey = new Map();

    BUS_STOPS.forEach((item) => {
      const normalizedCity = normalizeBusCity(item.city);
      byKey.set(normalizedCity.toLowerCase(), {
        ...item,
        city: normalizedCity
      });
    });

    buses.forEach((bus) => {
      [bus.from, bus.to, bus.boardingPoint, bus.droppingPoint].forEach((city) => {
        const normalizedCity = extractBusCity(city);
        if (!normalizedCity) return;

        const key = normalizedCity.toLowerCase();
        if (!byKey.has(key)) {
          byKey.set(key, {
            code: normalizedCity.slice(0, 3).toUpperCase(),
            city: normalizedCity,
            airport: `${normalizedCity} Bus Stand`,
            country: 'India'
          });
        }
      });
    });

    return Array.from(byKey.values());
  }, [buses]);

  /* ── Fetch ──────────────────────────────────────── */
  // Stable reference — never recreated, always reads latest values via refs
  const fetchBuses = useCallback(async (p = {}) => {
    setLoading(true);
    setError('');
    try {
      const clean = s => (s ? s.split('(')[0].trim() : '');
      const res = await axios.get(API, {
        params: {
          from: clean(p.from !== undefined ? p.from : fromRef.current),
          to: clean(p.to !== undefined ? p.to : toRef.current),
          date: p.date !== undefined ? p.date : dateRef.current,
        },
      });
      const data = res.data.data || [];
      setBuses(data);
      if (data.length) {
        const prices = data.map(b => b.price || 0);
        const nextBounds = [Math.min(...prices), Math.max(...prices)];
        setPriceBounds(nextBounds);
        setFPrice(nextBounds);
      } else {
        setPriceBounds([0, 5000]);
        setFPrice([0, 5000]);
      }
    } catch {
      setError('Could not load buses. Please try again.');
      setBuses([]);
    } finally {
      setLoading(false);
    }
  }, []); // stable — reads latest via refs

  useEffect(() => {
    if (nav.from || nav.to || nav.date) {
      fetchBuses({ from: nav.from || '', to: nav.to || '', date: nav.date || '' });
    }
  }, [fetchBuses, nav.from, nav.to, nav.date]);

  useEffect(() => {
    if (!loading && !error && buses.length === 0 && (!hasSearched || (!from.trim() && !to.trim() && !date.trim()))) {
      fetchBuses({ from: '', to: '', date: '' });
    }
  }, [fetchBuses, loading, error, buses.length, hasSearched, from, to, date]);

  useEffect(() => {
    setHasSearched(Boolean(from.trim() || to.trim() || date.trim()));
    if (error) setError('');
  }, [from, to, date, error]);

  /* ── Handlers ───────────────────────────────────── */
  const handleSearch = () => {
    if (!from.trim() || !to.trim()) {
      setError('Please enter both FROM and TO cities.');
      return;
    }

    if (!date) {
      setError('Please select a travel date.');
      return;
    }

    const fromMatch = resolveBusSearchStop(from, busSuggestions);
    const toMatch = resolveBusSearchStop(to, busSuggestions);

    if (!fromMatch || !toMatch) {
      setError('Please select valid FROM and TO cities from the suggestions.');
      return;
    }

    setError('');
    setHasSearched(true);
    setFTravelDate(date);
    fetchBuses({
      from: fromMatch.city,
      to: toMatch.city,
      date,
    });
  };

  const swapCities = () => { setFrom(to); setTo(from); };

  // ✅ CLEAR: wipes inputs AND results — does NOT trigger a re-fetch
  const clearSearch = () => {
    setFrom('');
    setTo('');
    setDate(today);
    setBuses([]);        // ← clears the results area
    setHasSearched(false);
    setError('');
    setIsFromValid(false);
    setIsToValid(false);
    setFOperators([]);
    setFBusTypes([]);
    setFSlots([]);
    setFMinRating(null);
    setFTravelDate('');
    setFSortBy('recommended');
    setFPrice([0, 5000]);
    setExpandedId(null);
  };

  const toggle = (id, list, set) =>
    set(list.includes(id) ? list.filter(x => x !== id) : [...list, id]);

  const clearFilters = () => {
    setFOperators([]); setFBusTypes([]); setFSlots([]);
    setFMinRating(null);
    setFTravelDate('');
    setFSortBy('recommended');
    setFPrice(priceBounds);
  };

  const effectiveTravelDate = fTravelDate || date;

  /* ── Filter / Display list ──────────────────────── */
  const displayList = useMemo(() => buses.filter(bus => {
    if (!matchesPartialQuery(from, [bus.from, bus.boardingPoint, bus.operatorName])) return false;
    if (!matchesPartialQuery(to, [bus.to, bus.droppingPoint])) return false;
    if (!matchesDateQuery(effectiveTravelDate, [bus.date, bus.travelDate, bus.departureDate])) return false;
    if (fOperators.length && !fOperators.includes(bus.operatorName)) return false;
    if (fBusTypes.length && !fBusTypes.includes(bus.busType)) return false;
    if (bus.price < fPrice[0] || bus.price > fPrice[1]) return false;
    if (fMinRating !== null && Number(bus.rating || 0) < fMinRating) return false;
    if (fSlots.length && bus.departureTime) {
      const h = parseInt(bus.departureTime.split(':')[0], 10);
      if (!fSlots.some(s =>
        (s === '0-6' && h < 6) || (s === '6-12' && h >= 6 && h < 12) ||
        (s === '12-18' && h >= 12 && h < 18) || (s === '18-24' && h >= 18)
      )) return false;
    }
    return true;
  }), [buses, from, to, effectiveTravelDate, fOperators, fBusTypes, fPrice, fMinRating, fSlots]);

  const sortedDisplayList = useMemo(() => {
    const items = [...displayList];
    const getDepartureMinutes = (value = '') => {
      const [hours, minutes] = String(value || '').split(':').map((part) => Number(part));
      return (Number.isFinite(hours) ? hours : 0) * 60 + (Number.isFinite(minutes) ? minutes : 0);
    };

    if (fSortBy === 'price_low_high') {
      items.sort((a, b) => (Number(a.price) || 0) - (Number(b.price) || 0));
    } else if (fSortBy === 'price_high_low') {
      items.sort((a, b) => (Number(b.price) || 0) - (Number(a.price) || 0));
    } else if (fSortBy === 'departure_early') {
      items.sort((a, b) => getDepartureMinutes(a.departureTime) - getDepartureMinutes(b.departureTime));
    } else if (fSortBy === 'departure_late') {
      items.sort((a, b) => getDepartureMinutes(b.departureTime) - getDepartureMinutes(a.departureTime));
    } else if (fSortBy === 'seats_high_low') {
      items.sort((a, b) => (Number(b.availableSeats) || 0) - (Number(a.availableSeats) || 0));
    }

    return items;
  }, [displayList, fSortBy]);

  const handleBook = (bus) => {
    const bookingState = { bus, selectedSeats: [], price: bus.price, from, to, date };

    if (!isAuthenticated) {
      const authRedirect = buildAuthRedirect('/book/buses', bookingState);
      navigate('/login', { state: { authRedirect } });
      return;
    }

    navigate('/book/buses', { state: bookingState });
  };

  /* ── UI ─────────────────────────────────────────── */
  return (
    <div className="bus-page-v2">

      {/* Hero */}
      <section className="bus-hero-v2">
        <div className="mmt-container">
          <h1>Bus Ticket Booking</h1>
          <p>Get best deals on bus tickets from top operators</p>
        </div>
      </section>

      <TravelSearchShell
        className="travel-search-shell--hero"
        columns="1fr 40px 1fr minmax(180px, 0.9fr) auto"
      >
        <PremiumAutosuggest label="FROM" value={from} placeholder="Source City"
          suggestions={busSuggestions} onChange={setFrom} onInputValidityChange={setIsFromValid} />

        <TravelSearchSwapButton onClick={swapCities} title="Swap">
          SWAP
        </TravelSearchSwapButton>

        <PremiumAutosuggest label="TO" value={to} placeholder="Destination City"
          suggestions={busSuggestions} onChange={setTo} onInputValidityChange={setIsToValid} />

        <TravelSearchField
          label="DATE"
          icon={
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="16" y1="2" x2="16" y2="6"></line>
              <line x1="8" y1="2" x2="8" y2="6"></line>
              <line x1="3" y1="10" x2="21" y2="10"></line>
            </svg>
          }
        >
          <input
            type="date"
            value={date}
            min={today}
            onChange={e => {
              const nextDate = e.target.value;
              setDate(nextDate);
              setFTravelDate(nextDate);
            }}
          />
        </TravelSearchField>

        <TravelSearchActions>
          <TravelSearchButton onClick={handleSearch} disabled={loading || !from.trim() || !to.trim() || !isFromValid || !isToValid}>
            {loading ? 'SEARCHING…' : 'SEARCH'}
          </TravelSearchButton>

          {(from || to) && (
            <TravelSearchButton secondary onClick={clearSearch}>CLEAR</TravelSearchButton>
          )}
        </TravelSearchActions>
      </TravelSearchShell>

      {false && <div className="bus-search-bar-v2">
        <PremiumAutosuggest label="FROM" value={from} placeholder="Source City"
          suggestions={busSuggestions} onChange={setFrom} onInputValidityChange={setIsFromValid} />

        <button className="swap-btn-v2" onClick={swapCities} title="Swap">⇄</button>

        <PremiumAutosuggest label="TO" value={to} placeholder="Destination City"
          suggestions={busSuggestions} onChange={setTo} onInputValidityChange={setIsToValid} />

        <div className="search-input-group">
          <label>DATE</label>
          <input type="date" value={date} min={today} onChange={e => setDate(e.target.value)} />
        </div>

        <button className="search-btn-v2" onClick={handleSearch} disabled={loading || !from.trim() || !to.trim() || !isFromValid || !isToValid}>
          {loading ? 'SEARCHING…' : 'SEARCH'}
        </button>

        {(from || to) && (
          <button className="clear-search-btn" onClick={clearSearch}>✕ CLEAR</button>
        )}
      </div>}

      {/* Main Layout */}
      <div className="bus-results-area">
        
        <div className="bus-main-layout">

          {/* ── Sidebar ── */}
          <aside className="bus-filters-sidebar">
            <div className="sidebar-header-inline">
              <h3>Filters</h3>
              <button className="clear-all-link" onClick={clearFilters}>Clear All</button>
            </div>

            <div className="sidebar-content">
              {/* Bus Type */}
              <div className="sidebar-field">
                <label>BUS TYPE</label>
                <div className="checkbox-group">
                  {(() => {
                    const all = [...new Set(buses.map(b => b.busType))].sort().filter(Boolean);
                    return <>
                      {(showMoreBT ? all : all.slice(0, 5)).map(t => (
                        <label key={t} className="custom-checkbox">
                          <input type="checkbox" checked={fBusTypes.includes(t)}
                            onChange={() => toggle(t, fBusTypes, setFBusTypes)} />
                          <span>{t}</span>
                        </label>
                      ))}
                      {all.length > 5 && (
                        <button className="view-more-btn-filter" onClick={() => setShowMoreBT(!showMoreBT)}>
                          {showMoreBT ? '- View Less' : `+ ${all.length - 5} More`}
                        </button>
                      )}
                    </>;
                  })()}
                </div>
              </div>

              {/* Price */}
              <div className="sidebar-field">
                <label>PRICE RANGE (₹)</label>
                <div className="price-inputs-row">
                  <input type="number" className="price-input-small" value={fPrice[0]}
                    onChange={e => setFPrice([+e.target.value || 0, fPrice[1]])} />
                  <span>—</span>
                  <input type="number" className="price-input-small" value={fPrice[1]}
                    onChange={e => setFPrice([fPrice[0], +e.target.value || 0])} />
                </div>
                <input type="range" className="price-range-slider" step="100"
                  min={priceBounds[0]}
                  max={priceBounds[1] || 10000}
                  value={fPrice[1]} onChange={e => setFPrice([fPrice[0], +e.target.value])} />
              </div>

              <div className="sidebar-field">
                <label>SORT BY</label>
                <select
                  className="date-filter-select"
                  value={fSortBy}
                  onChange={(e) => setFSortBy(e.target.value)}
                >
                  <option value="recommended">Recommended</option>
                  <option value="price_low_high">Price: Low to High</option>
                  <option value="price_high_low">Price: High to Low</option>
                  <option value="departure_early">Departure: Early First</option>
                  <option value="departure_late">Departure: Late First</option>
                  <option value="seats_high_low">Seats: High to Low</option>
                </select>
              </div>

              <div className="sidebar-field">
                <label>TRAVEL DATE</label>
                <input
                  className="date-filter-select"
                  value={effectiveTravelDate}
                  type="date"
                  min={today}
                  onChange={(e) => {
                    const nextDate = e.target.value;
                    const fromMatch = resolveBusSearchStop(from, busSuggestions);
                    const toMatch = resolveBusSearchStop(to, busSuggestions);
                    setFTravelDate(nextDate);
                    setDate(nextDate);
                    if (fromMatch && toMatch && nextDate) {
                      fetchBuses({
                        from: fromMatch.city,
                        to: toMatch.city,
                        date: nextDate,
                      });
                    }
                  }}
                />
              </div>

              <div className="sidebar-field">
                <label>RATING</label>
                <div className="checkbox-group">
                  {[4.5, 4, 3.5].map((rating) => (
                    <label key={rating} className="custom-checkbox">
                      <input
                        type="radio"
                        name="bus-rating-filter"
                        checked={fMinRating === rating}
                        onChange={() => setFMinRating(fMinRating === rating ? null : rating)}
                      />
                      <span>{rating}+ rating</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Time */}
              <div className="sidebar-field">
                <label>TIME SLOT</label>
                <div className="time-grid-mini">
                  {[
                    { id: '0-6', icon: '🌅', label: 'Early' },
                    { id: '6-12', icon: '☀️', label: 'Morning' },
                    { id: '12-18', icon: '🌤️', label: 'Afternoon' },
                    { id: '18-24', icon: '🌙', label: 'Night' },
                  ].map(o => (
                    <button key={o.id}
                      className={`mini-time-btn ${fSlots.includes(o.id) ? 'active' : ''}`}
                      onClick={() => toggle(o.id, fSlots, setFSlots)}>
                      <span className="icon">{o.icon}</span>
                      <span className="text">{o.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Operators */}
              <div className="sidebar-field">
                <label>OPERATORS</label>
                <div className="checkbox-group">
                  {(() => {
                    const all = [...new Set(buses.map(b => b.operatorName))].sort().filter(Boolean);
                    return <>
                      {(showMoreOps ? all : all.slice(0, 5)).map(op => (
                        <label key={op} className="custom-checkbox">
                          <input type="checkbox" checked={fOperators.includes(op)}
                            onChange={() => toggle(op, fOperators, setFOperators)} />
                          <span>{op}</span>
                        </label>
                      ))}
                      {all.length > 5 && (
                        <button className="view-more-btn-filter" onClick={() => setShowMoreOps(!showMoreOps)}>
                          {showMoreOps ? '- View Less' : `+ ${all.length - 5} More`}
                        </button>
                      )}
                    </>;
                  })()}
                </div>
              </div>
            </div>
          </aside>

          {/* ── Results ── */}
          <main className="bus-results-main">

            {!loading && hasSearched && (
              <div className="results-toolbar-v2">
                <div className="results-count">
                  <span className="count-num">{sortedDisplayList.length}</span>
                  <span className="count-label">&nbsp;Buses Found</span>
                </div>
                <div className="route-info-badge">{from} → {to} • {date}</div>
              </div>
            )}

            {loading ? (
              <div className="bus-loading-state">
                <div className="loading-spinner">🚌</div>
                <h3>Searching best buses…</h3>
                <p>Finding the perfect ride for you</p>
              </div>

            ) : error ? (
              <div className="bus-empty-state">
                <span className="empty-icon">❌</span>
                <h3>{error}</h3>
                <button className="clear-filters-btn" onClick={() => fetchBuses()}>Retry</button>
              </div>

            ) : hasSearched && sortedDisplayList.length === 0 ? (
              <div className="bus-empty-state">
                <span className="empty-icon">🚌</span>
                <h3>No Buses Found</h3>
                <p>No buses available for <strong>{from} → {to}</strong>. Try a different route or date.</p>
                <button className="clear-filters-btn" onClick={clearFilters}>Clear Filters</button>
              </div>

            ) : sortedDisplayList.map(bus => {
              const rating = bus.rating || 4.2;
              const good = rating >= 4;
              const isOpen = expandedId === bus._id;

              return (
                <div key={bus._id} className="premium-bus-card">

                  {/* Header */}
                  <div className="card-top-header">
                    <div className="bus-operator-icon">
                      <div className="operator-initial">{bus.operatorName?.charAt(0) || 'B'}</div>
                    </div>
                    <div className="bus-name-info">
                      <h4>{bus.operatorName}</h4>
                      <p>{bus.busType} • {bus.seatLayout || '2+2'}</p>
                    </div>
                    <div className="rating-badge" style={{
                      background: good ? 'rgba(16,185,129,0.1)' : 'rgba(251,191,36,0.1)',
                      color: good ? '#10b981' : '#fbbf24',
                      border: `1px solid ${good ? 'rgba(16,185,129,0.3)' : 'rgba(251,191,36,0.3)'}`,
                    }}>⭐ {rating}</div>
                  </div>

                  {/* Route */}
                  <div className="route-visual-line">
                    <div className="station-point left">
                      <span className="city-name">{bus.from}</span>
                      <span className="station-label">BOARDING</span>
                      <span className="station-time">{bus.departureTime}</span>
                    </div>
                    <div className="line-connector">
                      <div className="main-red-line" />
                      <div className="duration-bubble">{bus.duration}</div>
                    </div>
                    <div className="station-point right">
                      <span className="city-name">{bus.to}</span>
                      <span className="station-label">ARRIVAL</span>
                      <span className="station-time">{bus.arrivalTime}</span>
                    </div>
                  </div>

                  {/* Amenity pills */}
                  <div className="amenities-pills">
                    {(bus.amenities || []).slice(0, 4).map(a => (
                      <span key={a} className="amenity-pill">
                        {a === 'WiFi' ? '📶' : a.includes('Water') ? '💧' : a === 'Blanket' ? '🛌' : a === 'Snacks' ? '🍩' : '✅'} {a}
                      </span>
                    ))}
                    {(bus.amenities || []).length > 4 && (
                      <span className="amenity-pill">+{bus.amenities.length - 4} More</span>
                    )}
                  </div>

                  {/* Footer */}
                  <div className="card-action-footer">
                    <div className="bottom-price-info">
                      <span className="price-label">STARTING FROM</span>
                      <h3 className="final-price">₹{bus.price}</h3>
                      <span className="seats-left">{bus.availableSeats} seats left</span>
                    </div>
                    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                      <button className="view-details-btn"
                        onClick={() => setExpandedId(isOpen ? null : bus._id)}>
                        {isOpen ? '▲ Hide Details' : '▼ View Details'}
                      </button>
                      <button className="premium-book-btn" onClick={() => handleBook(bus)} disabled={Number(bus.availableSeats || 0) <= 0}>
                        {Number(bus.availableSeats || 0) <= 0 ? 'SOLD OUT' : 'BOOK NOW'}
                      </button>
                    </div>
                  </div>

                  {/* Expandable Tray */}
                  {isOpen && (
                    <div className="bus-expanded-tray">
                      <div className="expanded-info-grid">

                        <div className="expanded-column">
                          <label className="exp-col-label">PICKUP &amp; DROPOFF</label>
                          <div className="timeline-v2">
                            <div className="timeline-item-v2">
                              <span className="tl-icon">🏠</span>
                              <div>
                                <h5>{bus.boardingPoint || 'Main Bus Stand'}</h5>
                                <p>Pickup at {bus.departureTime}</p>
                              </div>
                            </div>
                            <div className="tl-connector-line" />
                            <div className="timeline-item-v2">
                              <span className="tl-icon">📍</span>
                              <div>
                                <h5>{bus.droppingPoint || 'City Center'}</h5>
                                <p>Arrival at {bus.arrivalTime}</p>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="expanded-column">
                          <label className="exp-col-label">ALL AMENITIES</label>
                          <div className="full-amenities-grid">
                            {(bus.amenities?.length ? bus.amenities : ['WiFi', 'Water', 'Charging']).map(a => (
                              <span key={a} className="amenity-check-item">
                                <span className="check-icon">✓</span> {a}
                              </span>
                            ))}
                          </div>
                        </div>

                        <div className="expanded-column">
                          <label className="exp-col-label">BUS INFO &amp; POLICY</label>
                          <div className="policy-box">
                            {[
                              ['BUS NUMBER', bus.busNumber || 'N/A'],
                              ['TOTAL SEATS', bus.totalSeats || 'N/A'],
                              ['SEAT LAYOUT', bus.seatLayout || '2+2'],
                              ['TRAVEL DATE', bus.date || date],
                            ].map(([k, v]) => (
                              <div key={k} className="policy-row">
                                <p className="policy-key">{k}</p>
                                <span className="policy-val">{v}</span>
                              </div>
                            ))}
                            <div className="policy-row">
                              <p className="policy-key">CANCELLATION</p>
                              <span className="policy-val cancellation">
                                {bus.cancellationPolicy || 'Refundable up to 24h before'}
                              </span>
                            </div>
                          </div>
                        </div>

                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </main>
        </div>
      </div>
    </div>
  );
}
