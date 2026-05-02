import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../../contexts/AuthContext";
import "./Flights.css";
import PremiumAutosuggest from "../../components/UI/PremiumAutosuggest";
import {
  TravelSearchButton,
  TravelSearchField,
  TravelSearchShell,
  TravelSearchSwapButton,
} from "../../components/UI/TravelSearchShell";
import { FLIGHT_LOCATIONS } from "../../data/LocationData";
import { getTodayDateString } from "../../utils/dateShortcuts";
import { API_BASE_URL as BASE_URL } from "../../utils/api";
import { buildAuthRedirect } from "../../utils/authRedirect";
import { formatCurrency } from "../../utils/currency";
import { matchesDateQuery, matchesPartialQuery } from "../../utils/travelSearch";

const API_BASE_URL = `${BASE_URL}/flights`;
const FLIGHT_CITY_ALIASES = {
  bengaluru: ["bengaluru", "bangalore", "banglore"],
  mumbai: ["mumbai", "bombay"],
  delhi: ["delhi", "new delhi"],
  kolkata: ["kolkata", "calcutta"]
};
const toTitleCase = (value = "") =>
  String(value)
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
const normalizeFlightCity = (value = "") => {
  const cleaned = String(value || "").trim().toLowerCase();
  if (!cleaned) return "";

  const canonicalEntry = Object.entries(FLIGHT_CITY_ALIASES).find(([, aliases]) => aliases.includes(cleaned));
  return canonicalEntry ? toTitleCase(canonicalEntry[0]) : toTitleCase(cleaned);
};
const extractFlightCity = (value = "") => {
  const cleaned = String(value || "").trim();
  if (!cleaned) return "";

  const withoutCode = cleaned.replace(/\s*\([A-Za-z0-9]+\)\s*$/, "");
  return normalizeFlightCity(withoutCode);
};
const resolveFlightSearchLocation = (input, suggestions = []) => {
  const rawQuery = String(input || "").trim().toLowerCase();
  const normalizedCity = extractFlightCity(input);

  if (!rawQuery && !normalizedCity) return null;

  const matchedSuggestion = suggestions.find((item) =>
    [
      item.city,
      item.code,
      item.airport,
      `${item.city} (${item.code})`
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
      city: normalizeFlightCity(matchedSuggestion.city)
    };
  }

  if (!normalizedCity) return null;

  return {
    city: normalizedCity,
    code: normalizedCity.slice(0, 3).toUpperCase(),
    airport: `${normalizedCity} Airport`
  };
};
const getSelectedFareForFlight = (flight, selectedFareMap) =>
  selectedFareMap[flight._id] ||
  (flight.fares?.length > 0 ? flight.fares[0] : { type: "ECONOMY", price: 0, benefits: [] });

const getFlightDisplayPrice = (flight, selectedFareMap) =>
  (flight.basePrice || 0) + (getSelectedFareForFlight(flight, selectedFareMap)?.price || 0);

const getHourFromTime = (value) => {
  if (!value || typeof value !== "string") return null;
  const parsed = parseInt(value.split(":")[0], 10);
  return Number.isNaN(parsed) ? null : parsed;
};

const isHourInSlot = (hour, slot) => {
  if (hour === null) return false;
  if (slot === "0-6") return hour >= 0 && hour < 6;
  if (slot === "6-12") return hour >= 6 && hour < 12;
  if (slot === "12-18") return hour >= 12 && hour < 18;
  if (slot === "18-24") return hour >= 18 && hour < 24;
  return false;
};

const isNonStopFlight = (stops) => {
  const normalized = String(stops || "").trim().toLowerCase();
  return !normalized || normalized === "0" || normalized === "0 stops" || normalized === "non-stop" || normalized === "non stop" || normalized === "nonstop";
};

const toDateInputValue = (value) => {
  if (!value) return "";
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";

  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, "0");
  const day = String(parsed.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const getDateDaysAhead = (days = 0) => {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + days);

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const isDateWithinWindow = (value, maxDays = 15) => {
  const candidate = toDateInputValue(value);
  if (!candidate) return false;

  const today = getDateDaysAhead(0);
  const maxDate = getDateDaysAhead(maxDays);
  return candidate >= today && candidate <= maxDate;
};

function Flights() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated } = useAuth();
  const searchState = location.state || {};
  const [source, setSource] = useState(searchState.from || "");
  const [dest, setDest] = useState(searchState.to || "");
  const [date, setDate] = useState(toDateInputValue(searchState.departure || ""));
  const [selectedFareMap] = useState({});
  const [flightsList, setFlightsList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(Boolean(searchState.from || searchState.to || searchState.departure));
  const [expandedItinerary, setExpandedItinerary] = useState(null);

  // Advanced Filters State
  const [filterStops, setFilterStops] = useState([]); // Array: ['direct', '1stop', '2stop']
  const [filterAirlines, setFilterAirlines] = useState([]);
  const [filterPriceRange, setFilterPriceRange] = useState([0, 150000]);
  const [priceBounds, setPriceBounds] = useState([0, 150000]);
  const [filterDepartSlots, setFilterDepartSlots] = useState([]); // ['0-6', '6-12', '12-18', '18-24']
  const [filterArrivalSlots, setFilterArrivalSlots] = useState([]);
  const [filterRefundable, setFilterRefundable] = useState(null); // 'Refundable' | 'Non-refundable' | null
  const [filterTravelDate, setFilterTravelDate] = useState("");
  const [filterSortBy, setFilterSortBy] = useState("price_low_high");

  const [showAllAirlines, setShowAllAirlines] = useState(false);
  const [error, setError] = useState('');
  const today = getTodayDateString();
  const isRebookFlow = Boolean(searchState.rebookFromBookingId);
  const rebookMaxDate = isRebookFlow ? getDateDaysAhead(15) : "";
  const flightSuggestions = useMemo(() => {
    const byKey = new Map();

    FLIGHT_LOCATIONS.forEach((item) => {
      const normalizedCity = normalizeFlightCity(item.city);
      byKey.set(normalizedCity.toLowerCase(), {
        ...item,
        city: normalizedCity
      });
    });

    flightsList.forEach((flight) => {
      [flight.from, flight.to, flight.departureCity, flight.arrivalCity].forEach((city) => {
        const normalizedCity = normalizeFlightCity(city);
        if (!normalizedCity) return;

        const key = normalizedCity.toLowerCase();
        if (!byKey.has(key)) {
          byKey.set(key, {
            code: normalizedCity.slice(0, 3).toUpperCase(),
            city: normalizedCity,
            airport: `${normalizedCity} Airport`,
            country: "India"
          });
        }
      });
    });

    return Array.from(byKey.values());
  }, [flightsList]);
  const fetchFlights = useCallback(async (searchParams = {}) => {
    setLoading(true);
    setError('');
    try {
      const res = await axios.get(API_BASE_URL, { params: searchParams });
      setFlightsList(res.data || []);
      // Auto-set price range based on data
      if (res.data && res.data.length > 0) {
        const prices = res.data.map(f => (f.basePrice || 0) + (f.fares?.[0]?.price || 0));
        const minP = Math.min(...prices);
        const maxP = Math.max(...prices);
        const nextBounds = [minP, maxP];
        setPriceBounds(nextBounds);
        setFilterPriceRange(nextBounds);
      } else {
        setPriceBounds([0, 150000]);
        setFilterPriceRange([0, 150000]);
      }
    } catch (err) {
      console.error("Error fetching flights:", err);
      setFlightsList([]);
      setError("Unable to load flights right now. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const sourceMatch = resolveFlightSearchLocation(source, flightSuggestions);
    const destMatch = resolveFlightSearchLocation(dest, flightSuggestions);

    if (sourceMatch && destMatch && date) {
      fetchFlights({
        from: sourceMatch.city,
        to: destMatch.city,
        date
      });
      return;
    }

    fetchFlights({});
    // We only want the initial query bootstrap here; interactive searches use explicit handlers.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchFlights]);

  useEffect(() => {
    setHasSearched(Boolean(source.trim() || dest.trim() || date.trim()));
    setError("");
  }, [source, dest, date]);

  const handleSwap = () => {
    const temp = source;
    setSource(dest);
    setDest(temp);
  };

  const handleSearch = () => {
    if (!source.trim() || !dest.trim()) {
      setError("Please enter both FROM and TO destinations.");
      return;
    }

    if (!date) {
      setError("Please select a travel date.");
      return;
    }

    if (isRebookFlow && !isDateWithinWindow(date, 15)) {
      setError("Rebooking is available only for today and the next 15 days.");
      return;
    }

    const sourceMatch = resolveFlightSearchLocation(source, flightSuggestions);
    const destMatch = resolveFlightSearchLocation(dest, flightSuggestions);

    if (!sourceMatch || !destMatch) {
      setError("Please select valid FROM and TO cities from the suggestions.");
      return;
    }

    setError('');
    setHasSearched(true);
    setFilterTravelDate(date);
    fetchFlights({
      from: sourceMatch.city,
      to: destMatch.city,
      date,
    });
  };

  const handleBookNow = (flight) => {
    const selectedFare = selectedFareMap[flight._id] ||
      (flight.fares?.length > 0 ? flight.fares[0] : { type: 'ECONOMY', price: 0 });
    const bookingState = {
      flight,
      selectedFare,
      price: (flight.basePrice || 0) + (selectedFare?.price || 0),
      travelDate: date || searchState.departure
    };

    if (!isAuthenticated) {
      const authRedirect = buildAuthRedirect("/book/flights", bookingState);
      navigate("/login", { state: { authRedirect } });
      return;
    }

    navigate(`/book/flights`, {
      state: bookingState,
    });
  };

  const toggleFilter = (val, state, setState) => {
    if (state.includes(val)) {
      setState(state.filter(item => item !== val));
    } else {
      setState([...state, val]);
    }
  };

  // Sort & Filter Logic
  const effectiveTravelDate = filterTravelDate || date;

  const liveMatchedFlights = useMemo(() => flightsList.filter((flight) => (
    matchesPartialQuery(source, [
      flight.from,
      flight.fromCode,
      flight.departureCity,
      flight.airportFrom,
      flight.airlineName,
      flight.airline
    ]) &&
    matchesPartialQuery(dest, [
      flight.to,
      flight.toCode,
      flight.arrivalCity,
      flight.airportTo
    ]) &&
    matchesDateQuery(effectiveTravelDate, [flight.date, flight.departureDate, flight.travelDate])
  )), [flightsList, source, dest, effectiveTravelDate]);

  const getSortedFiltered = () => {
    let list = [...liveMatchedFlights];

    // Filter by Stops
    if (filterStops.length > 0) {
      list = list.filter(f => {
        const s = f.stops || "0";
        if (filterStops.includes('direct') && (s.includes('0') || s.toLowerCase().includes('non'))) return true;
        if (filterStops.includes('1stop') && s.includes('1')) return true;
        if (filterStops.includes('2stop') && (parseInt(s) >= 2 || s.includes('2'))) return true;
        return false;
      });
    }

    // Filter by Airlines
    if (filterAirlines.length > 0) {
      list = list.filter(f => filterAirlines.includes(f.airlineName || f.airline));
    }

    // Filter by Price
    list = list.filter(f => {
      const price = getFlightDisplayPrice(f, selectedFareMap);
      return price >= filterPriceRange[0] && price <= filterPriceRange[1];
    });

    // Filter by Departure Time
    if (filterDepartSlots.length > 0) {
      list = list.filter(f => {
        const hour = getHourFromTime(f.departureTime);
        return filterDepartSlots.some((slot) => isHourInSlot(hour, slot));
      });
    }

    // Filter by Arrival Time
    if (filterArrivalSlots.length > 0) {
      list = list.filter(f => {
        const hour = getHourFromTime(f.arrivalTime);
        return filterArrivalSlots.some((slot) => isHourInSlot(hour, slot));
      });
    }

    // Filter by Refundability
    if (filterRefundable) {
      list = list.filter(f => {
        const isRef = getSelectedFareForFlight(f, selectedFareMap)?.benefits?.some(b => /refundable/i.test(b));
        return filterRefundable === 'Refundable' ? isRef : !isRef;
      });
    }

    const getTimeValue = (value) => {
      const [hours, minutes] = String(value || "").split(":").map((part) => Number(part));
      return (Number.isFinite(hours) ? hours : 0) * 60 + (Number.isFinite(minutes) ? minutes : 0);
    };

    if (filterSortBy === "price_high_low") {
      list.sort((a, b) => getFlightDisplayPrice(b, selectedFareMap) - getFlightDisplayPrice(a, selectedFareMap));
    } else if (filterSortBy === "departure_early") {
      list.sort((a, b) => getTimeValue(a.departureTime) - getTimeValue(b.departureTime));
    } else if (filterSortBy === "departure_late") {
      list.sort((a, b) => getTimeValue(b.departureTime) - getTimeValue(a.departureTime));
    } else if (filterSortBy === "arrival_early") {
      list.sort((a, b) => getTimeValue(a.arrivalTime) - getTimeValue(b.arrivalTime));
    } else if (filterSortBy === "arrival_late") {
      list.sort((a, b) => getTimeValue(b.arrivalTime) - getTimeValue(a.arrivalTime));
    } else {
      list.sort((a, b) => getFlightDisplayPrice(a, selectedFareMap) - getFlightDisplayPrice(b, selectedFareMap));
    }

    return list;
  };

  const clearAllFilters = () => {
    setFilterStops([]);
    setFilterAirlines([]);
    setFilterDepartSlots([]);
    setFilterArrivalSlots([]);
    setFilterRefundable(null);
    setFilterTravelDate("");
    setFilterSortBy("price_low_high");
    setFilterPriceRange(priceBounds);
  };

  const displayList = getSortedFiltered();
  const hasLiveMatches = liveMatchedFlights.length > 0;
  const getItineraryDateLabel = (flight, formatOptions) => {
    const selectedDate = toDateInputValue(date || flight?.date || flight?.departureDate || flight?.travelDate);
    if (!selectedDate) return "Date unavailable";

    return new Date(selectedDate).toLocaleDateString("en-US", formatOptions);
  };

  return (
    <div className="flights-page-v2">

      {/* Hero */}
      <section className="flights-hero-v2">
        <div className="flights-hero-content">
          <p className="hero-eyebrow">Book Flights</p>
          <h1>Domestic &amp; International Flights</h1>
          <p className="hero-sub">India's No. 1 Travel Site | Best Fares Guaranteed</p>
        </div>
      </section>

      <TravelSearchShell
        className="travel-search-shell--hero"
        columns="1fr 40px 1fr minmax(190px, 0.92fr) 152px"
        error={error}
      >
        <PremiumAutosuggest
          label="FROM"
          value={source}
          placeholder="City or Airport"
          suggestions={flightSuggestions}
          onChange={(val) => setSource(val)}
        />

        <TravelSearchSwapButton onClick={handleSwap} title="Swap cities">
          SWAP
        </TravelSearchSwapButton>

        <PremiumAutosuggest
          label="TO"
          value={dest}
          placeholder="City or Airport"
          suggestions={flightSuggestions}
          onChange={(val) => setDest(val)}
        />

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
            onChange={(e) => {
              const nextDate = e.target.value;
              setDate(nextDate);
              setFilterTravelDate(nextDate);
            }}
            min={today}
            max={rebookMaxDate || undefined}
          />
        </TravelSearchField>

        <TravelSearchButton
          onClick={handleSearch}
          disabled={loading || !source.trim() || !dest.trim()}
        >
          {loading ? <span className="btn-spinner" /> : "SEARCH"}
        </TravelSearchButton>
      </TravelSearchShell>

      {/* Results Area */}
      <div className="flights-results-area">
        
        <div className="flights-main-layout">
          {/* Left Sidebar: Filters */}
          <aside className="flights-filters-sidebar">
            <div className="sidebar-header-inline">
              <h3>Filters</h3>
              <button className="clear-all-link" onClick={clearAllFilters}>Clear All</button>
            </div>

            <div className="sidebar-content">
              {/* Stops Filter */}
              <div className="sidebar-field">
                <label>STOPS</label>
                <div className="checkbox-group">
                  {[
                    { id: 'direct', label: 'Non-stop' },
                    { id: '1stop', label: '1 Stop' },
                    { id: '2stop', label: '2+ Stops' },
                  ].map(opt => (
                    <label key={opt.id} className="custom-checkbox">
                      <input
                        type="checkbox"
                        checked={filterStops.includes(opt.id)}
                        onChange={() => toggleFilter(opt.id, filterStops, setFilterStops)}
                      />
                      <span>{opt.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Price Range Filter */}
              <div className="sidebar-field">
                <label>PRICE RANGE (INR)</label>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <input
                    type="number"
                    className="price-input-small"
                    value={filterPriceRange[0]}
                    onChange={(e) => setFilterPriceRange([parseInt(e.target.value) || 0, filterPriceRange[1]])}
                  />
                  <span>-</span>
                  <input
                    type="number"
                    className="price-input-small"
                    value={filterPriceRange[1]}
                    onChange={(e) => setFilterPriceRange([filterPriceRange[0], parseInt(e.target.value) || 0])}
                  />
                </div>
                <input
                  type="range"
                  className="price-range-slider"
                  min={priceBounds[0]}
                  max={priceBounds[1] || 150000}
                  step="500"
                  value={filterPriceRange[1]}
                  onChange={(e) => setFilterPriceRange([filterPriceRange[0], parseInt(e.target.value)])}
                />
              </div>

              <div className="sidebar-field">
                <label>SORT BY</label>
                <select
                  className="date-filter-select"
                  value={filterSortBy}
                  onChange={(e) => setFilterSortBy(e.target.value)}
                >
                  <option value="price_low_high">Price: Low to High</option>
                  <option value="price_high_low">Price: High to Low</option>
                  <option value="departure_early">Departure: Early First</option>
                  <option value="departure_late">Departure: Late First</option>
                  <option value="arrival_early">Arrival: Early First</option>
                  <option value="arrival_late">Arrival: Late First</option>
                </select>
              </div>

              <div className="sidebar-field">
                <label>TRAVEL DATE</label>
                <input
                  type="date"
                  className="date-filter-select"
                  value={effectiveTravelDate}
                  min={today}
                  max={rebookMaxDate || undefined}
                  onChange={(e) => {
                    const nextDate = e.target.value;
                    const sourceMatch = resolveFlightSearchLocation(source, flightSuggestions);
                    const destMatch = resolveFlightSearchLocation(dest, flightSuggestions);
                    setFilterTravelDate(nextDate);
                    setDate(nextDate);
                    if (sourceMatch && destMatch && nextDate) {
                      fetchFlights({
                        from: sourceMatch.city,
                        to: destMatch.city,
                        date: nextDate,
                      });
                    }
                  }}
                />
              </div>

              {/* Departure Time Filter */}
              <div className="sidebar-field">
                <label>DEPARTURE TIMING</label>
                <div className="time-grid-mini">
                  {[
                    { id: '0-6', label: 'Early Morning', icon: 'EM' },
                    { id: '6-12', label: 'Morning', icon: 'AM' },
                    { id: '12-18', label: 'Afternoon', icon: 'PM' },
                    { id: '18-24', label: 'Evening', icon: 'EV' },
                  ].map(opt => (
                    <button
                      key={opt.id}
                      className={`mini-time-btn ${filterDepartSlots.includes(opt.id) ? 'active' : ''}`}
                      onClick={() => toggleFilter(opt.id, filterDepartSlots, setFilterDepartSlots)}
                    >
                      <span className="icon">{opt.icon}</span>
                      <span className="text">{opt.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Arrival Time Filter */}
              <div className="sidebar-field">
                <label>ARRIVAL TIMING</label>
                <div className="time-grid-mini">
                  {[
                    { id: '0-6', label: 'Early Morning', icon: 'EM' },
                    { id: '6-12', label: 'Morning', icon: 'AM' },
                    { id: '12-18', label: 'Afternoon', icon: 'PM' },
                    { id: '18-24', label: 'Evening', icon: 'EV' },
                  ].map(opt => (
                    <button
                      key={opt.id}
                      className={`mini-time-btn ${filterArrivalSlots.includes(opt.id) ? 'active' : ''}`}
                      onClick={() => toggleFilter(opt.id, filterArrivalSlots, setFilterArrivalSlots)}
                    >
                      <span className="icon">{opt.icon}</span>
                      <span className="text">{opt.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Airlines Filter */}
              <div className="sidebar-field">
                <label>AIRLINES</label>
                <div className="checkbox-group">
                  {(() => {
                    const allAirlines = [...new Set(liveMatchedFlights.map(f => f.airlineName || f.airline))].sort().filter(Boolean);
                    const visibleAirlines = showAllAirlines ? allAirlines : allAirlines.slice(0, 5);
                    return (
                      <>
                        {visibleAirlines.map(airline => (
                          <label key={airline} className="custom-checkbox">
                            <input
                              type="checkbox"
                              checked={filterAirlines.includes(airline)}
                              onChange={() => toggleFilter(airline, filterAirlines, setFilterAirlines)}
                            />
                            <span>{airline}</span>
                          </label>
                        ))}
                        {allAirlines.length > 5 && (
                          <button
                            className="view-more-link"
                            onClick={() => setShowAllAirlines(!showAllAirlines)}
                          >
                            {showAllAirlines ? '- View Less' : '+ View More'}
                          </button>
                        )}
                      </>
                    );
                  })()}
                </div>
              </div>

              {/* Refundability Filter */}
              <div className="sidebar-field">
                <label>REFUNDABILITY</label>
                <div className="radio-group-vertical">
                  {['Refundable', 'Non-refundable'].map(opt => (
                    <label key={opt} className="custom-checkbox">
                      <input
                        type="radio"
                        name="refundFilter"
                        checked={filterRefundable === opt}
                        onChange={() => setFilterRefundable(filterRefundable === opt ? null : opt)}
                      />
                      <span>{opt}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </aside>

          {/* Right Column: Results */}
          <main className="flights-results-main">
            {/* Sort / Toolbar Area */}
            {!loading && (
              <div className="results-toolbar-v2">
                <div className="results-count">
                  <span className="count-num">{displayList.length}</span>
                  <span className="count-label">Flights Found</span>
                </div>

                <div className="toolbar-controls">

                </div>
              </div>
            )}

            {/* Loading State */}
            {loading && (
              <div className="flights-loading-state">
                <div className="loading-plane">FLT</div>
                <p>Searching for the best fares...</p>
              </div>
            )}

            {/* Error / Empty States */}
            {!loading && error && (
              <div className="flights-empty-state">
                <span className="empty-icon">SEARCH</span>
                <h3>Oops! Something went wrong</h3>
                <p>{error}</p>
                <button className="retry-search-btn" onClick={() => fetchFlights({})}>Try Again</button>
              </div>
            )}

            {!loading && !error && hasSearched && !hasLiveMatches && (
              <div className="flights-empty-state">
                <span className="empty-icon">FILTER</span>
                <h3>No flights found</h3>
                <p>Try adjusting your search criteria or dates.</p>
              </div>
            )}

            {!loading && !error && hasLiveMatches && displayList.length === 0 && (
              <div className="flights-empty-state">
                <span className="empty-icon">SEARCH</span>
                <h3>No flights match your filters</h3>
                <p>Try clearing some filters to see more options.</p>
                <button className="retry-search-btn" onClick={clearAllFilters}>Clear All Filters</button>
              </div>
            )}

            {/* Flight Cards List */}
            {!loading && displayList.map(flight => {
              const selectedFare = selectedFareMap[flight._id] || (flight.fares?.[0] || { type: 'ECONOMY', price: 0 });
              const totalPrice = (flight.basePrice || 0) + (selectedFare?.price || 0);
              const isNonStop = isNonStopFlight(flight.stops);
              const isItineraryOpen = expandedItinerary === flight._id;
              
              const baggageInfo = flight.baggage || {
                checkIn: "15 Kgs (1 piece only)",
                cabin: "7 Kgs (1 piece only)"
              };

              return (
                <div key={flight._id} className={`premium-flight-card ${isItineraryOpen ? 'itinerary-open' : ''}`}>
                  <div className="flight-card-main-row">
                    <div className="flight-info-left">
                      <div className="flight-engine-icon">
                        {flight.logo
                          ? <img src={flight.logo} alt={flight.airlineName || flight.airline} />
                          : <span className="airline-fallback-icon">FLT</span>
                        }
                      </div>
                      <div className="flight-names">
                        <h4>{flight.airlineName || flight.airline}</h4>
                        <p>{flight.flightNumber}</p>
                      </div>
                    </div>

                    <div className="flight-timing-cell departure">
                      <div className="time-val">{flight.departureTime}</div>
                      <div className="city-val">{normalizeFlightCity(flight.from || flight.departureCity || 'New Delhi')}</div>
                    </div>

                    <div className="flight-duration-center">
                      <div className="duration-text">{flight.duration}</div>
                      <div className="duration-line-visual">
                        <span className="line-dot left" />
                        <span className="line-fill" />
                        <span className="line-dot right" />
                      </div>
                      <div className="stops-text">{isNonStop ? 'Non-stop' : flight.stops}</div>
                    </div>

                    <div className="flight-timing-cell arrival">
                      <div className="time-val">
                        {flight.arrivalTime}
                        {flight.dayOffset > 0 && <span className="day-offset">+{flight.dayOffset} DAY</span>}
                      </div>
                      <div className="city-val">{normalizeFlightCity(flight.to || flight.arrivalCity || 'Bengaluru')}</div>
                    </div>

                    <div className="flight-pricing-right">
                      <div className="price-stack">
                        <div className="actual-price">{formatCurrency(totalPrice)}</div>
                        <div className="price-caption">/adult</div>
                      </div>
                      <button 
                        className="view-prices-btn"
                        onClick={() => handleBookNow(flight)}
                      >
                        BOOK NOW
                      </button>
                    </div>
                  </div>

                  <div className="flight-card-secondary-row">
                    <div className="lock-price-badge">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                        <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                      </svg>
                      Lock this price @ {formatCurrency(Math.round(totalPrice * 0.06))} <span>→</span>
                    </div>
                  </div>

                  <div className="flight-card-promo-strip">
                    <span className="promo-dot" />
                    Get FLAT ₹ 600 OFF using <strong>TRYMMT</strong> code
                  </div>

                  <div className="flight-card-footer-trigger">
                    <button 
                      className="view-details-link"
                      onClick={() => setExpandedItinerary(isItineraryOpen ? null : flight._id)}
                    >
                      {isItineraryOpen ? 'Hide Flight Details' : 'View Flight Details'}
                    </button>
                  </div>

                  {isItineraryOpen && (
                    <div className="itinerary-expansion-tray details-view">
                      <div className="itinerary-header">
                        {normalizeFlightCity(flight.from || flight.departureCity)} to {normalizeFlightCity(flight.to || flight.arrivalCity)}, {getItineraryDateLabel(flight, { day: 'numeric', month: 'short' })}
                      </div>
                      
                      <div className="itinerary-content">
                        <div className="itinerary-airline-row">
                          <img src={flight.logo} alt="" className="tiny-logo" />
                          <span className="airline-name">{flight.airlineName || flight.airline}</span>
                          <span className="flight-num-sep">|</span>
                          <span className="flight-num">{flight.flightNumber}</span>
                        </div>

                        <div className="itinerary-timeline-grid">
                          <div className="timeline-node start">
                            <div className="node-time">{flight.departureTime}</div>
                            <div className="node-date">{getItineraryDateLabel(flight, { weekday: 'short', day: 'numeric', month: 'short' })}</div>
                            <div className="node-terminal">{flight.departureTerminal || 'Terminal T1D'}</div>
                            <div className="node-city">{normalizeFlightCity(flight.from || flight.departureCity)}, India</div>
                          </div>
                          
                          <div className="timeline-visual">
                            <span className="duration-label">{flight.duration}</span>
                            <div className="visual-line" />
                          </div>

                          <div className="timeline-node end">
                            <div className="node-time">{flight.arrivalTime}</div>
                            <div className="node-date">{getItineraryDateLabel(flight, { weekday: 'short', day: 'numeric', month: 'short' })}</div>
                            <div className="node-terminal">{flight.arrivalTerminal || 'Terminal T2'}</div>
                            <div className="node-city">{normalizeFlightCity(flight.to || flight.arrivalCity)}, India</div>
                          </div>

                          <div className="itinerary-baggage-area">
                            <div className="bag-group">
                              <label>BAGGAGE:</label>
                              <span>ADULT</span>
                            </div>
                            <div className="bag-group">
                              <label>CHECK-IN:</label>
                              <span>{baggageInfo.checkIn}</span>
                            </div>
                            <div className="bag-group">
                              <label>CABIN:</label>
                              <span>{baggageInfo.cabin}</span>
                            </div>
                          </div>
                        </div>

                        <div className="itinerary-footer-amenities">
                          <div className="amenity-item">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"></path></svg>
                            {flight.aircraftLayout || '3-3 Layout'}
                          </div>
                          <div className="amenity-item">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8h1a4 4 0 0 1 0 8h-1M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8zM6 1v3M10 1v3M14 1v3"></path></svg>
                            Beverage Available
                          </div>
                          <div className="amenity-item">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"></rect><line x1="7" y1="2" x2="7" y2="22"></line><line x1="17" y1="2" x2="17" y2="22"></line><line x1="2" y1="12" x2="22" y2="12"></line><line x1="2" y1="7" x2="7" y2="7"></line><line x1="2" y1="17" x2="7" y2="17"></line><line x1="17" y1="17" x2="22" y2="17"></line><line x1="17" y1="7" x2="22" y2="7"></line></svg>
                            Streaming Entertainment
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

export default Flights;


