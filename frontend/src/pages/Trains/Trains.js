import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../../contexts/AuthContext";
import "./Trains.css";
import { API_BASE_URL as BASE_URL } from "../../utils/api";
import PremiumAutosuggest from "../../components/UI/PremiumAutosuggest";
import {
  TravelSearchButton,
  TravelSearchField,
  TravelSearchShell,
  TravelSearchSwapButton,
} from "../../components/UI/TravelSearchShell";
import { TRAIN_STATIONS } from "../../data/LocationData";
import { getTodayDateString } from "../../utils/dateShortcuts";
import { buildAuthRedirect } from "../../utils/authRedirect";
import { useToast } from "../../contexts/ToastContext";
import { formatCurrency } from "../../utils/currency";
import { matchesDateQuery, matchesPartialQuery } from "../../utils/travelSearch";

const API_BASE_URL = `${BASE_URL}/trains`;
const TRAIN_CITY_ALIASES = {
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
const normalizeTrainCity = (value = "") => {
  const cleaned = String(value || "").trim().toLowerCase();
  if (!cleaned) return "";

  const canonicalEntry = Object.entries(TRAIN_CITY_ALIASES).find(([, aliases]) => aliases.includes(cleaned));
  return canonicalEntry ? toTitleCase(canonicalEntry[0]) : toTitleCase(cleaned);
};
const extractTrainCity = (value = "") => {
  const cleaned = String(value || "").trim();
  if (!cleaned) return "";

  return normalizeTrainCity(cleaned.replace(/\s*\([A-Za-z0-9]+\)\s*$/, ""));
};
const resolveTrainSearchStation = (input, suggestions = []) => {
  const rawQuery = String(input || "").trim().toLowerCase();
  const normalizedCity = extractTrainCity(input);

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
      city: normalizeTrainCity(matchedSuggestion.city)
    };
  }

  if (!normalizedCity) return null;

  return {
    city: normalizedCity,
    code: normalizedCity.slice(0, 3).toUpperCase(),
    airport: `${normalizedCity} Railway Station`
  };
};

const getTrainClasses = (train) =>
  Array.isArray(train?.availableClasses) ? train.availableClasses : [];

function Trains() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated } = useAuth();
  const searchState = location.state || {};
  const { showToast } = useToast();

  const [source, setSource] = useState(searchState.from || "");
  const [dest, setDest] = useState(searchState.to || "");
  const today = getTodayDateString();
  const [date, setDate] = useState(searchState.date || searchState.departure || "");
  const [selectedFareMap, setSelectedFareMap] = useState({});
  const [trainsList, setTrainsList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [hasSearched, setHasSearched] = useState(Boolean(searchState.from || searchState.to || searchState.date || searchState.departure));
  const [isSourceValid, setIsSourceValid] = useState(Boolean(extractTrainCity(searchState.from)));
  const [isDestValid, setIsDestValid] = useState(Boolean(extractTrainCity(searchState.to)));

  const [filterClasses, setFilterClasses] = useState([]);
  const [filterPriceRange, setFilterPriceRange] = useState([0, 10000]);
  const [filterDepartSlots, setFilterDepartSlots] = useState([]);
  const [filterTrainTypes, setFilterTrainTypes] = useState([]);
  const [filterTravelDate, setFilterTravelDate] = useState("");
  const [filterSortBy, setFilterSortBy] = useState("price_low_high");
  const trainSuggestions = useMemo(() => {
    const byKey = new Map();

    TRAIN_STATIONS.forEach((item) => {
      const normalizedCity = normalizeTrainCity(item.city);
      byKey.set(normalizedCity.toLowerCase(), {
        ...item,
        city: normalizedCity
      });
    });

    trainsList.forEach((train) => {
      [train.from, train.to].forEach((city) => {
        const normalizedCity = extractTrainCity(city);
        if (!normalizedCity) return;

        const key = normalizedCity.toLowerCase();
        if (!byKey.has(key)) {
          byKey.set(key, {
            code: normalizedCity.slice(0, 3).toUpperCase(),
            city: normalizedCity,
            airport: `${normalizedCity} Railway Station`,
            country: "India"
          });
        }
      });
    });

    return Array.from(byKey.values());
  }, [trainsList]);

  const fetchTrains = useCallback(async (searchParams = {}) => {
    setLoading(true);
    setError("");
    try {
      const res = await axios.get(API_BASE_URL, { params: searchParams });
      const data = Array.isArray(res.data) ? res.data : [];
      setTrainsList(data);

      if (data.length > 0) {
        const allFares = data.flatMap((train) => getTrainClasses(train).map((coach) => coach.fare));
        if (allFares.length > 0) {
          setFilterPriceRange([Math.min(...allFares), Math.max(...allFares)]);
        }
      }
    } catch (err) {
      console.error("Error fetching trains:", err);
      setTrainsList([]);
      setError("Could not load trains right now. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTrains({});
  }, [fetchTrains]);

  useEffect(() => {
    setHasSearched(Boolean(source.trim() || dest.trim() || date.trim()));
    if (error) {
      setError("");
    }
  }, [source, dest, date, error]);

  const toggleFilter = (id, list, setList) => {
    if (list.includes(id)) {
      setList(list.filter((item) => item !== id));
    } else {
      setList([...list, id]);
    }
  };

  const effectiveTravelDate = filterTravelDate || date;

  const getFilteredTrains = () =>
    trainsList.filter((train) => {
      if (!matchesPartialQuery(source, [train.from, train.trainName, train.trainNumber])) return false;
      if (!matchesPartialQuery(dest, [train.to, train.trainName, train.trainNumber])) return false;
      if (!matchesDateQuery(effectiveTravelDate, [train.date, train.travelDate, train.departureDate])) return false;

      if (filterTrainTypes.length > 0) {
        const trainName = (train.trainName || "").toLowerCase();
        const isExpress = filterTrainTypes.includes("Express") && trainName.includes("express");
        const isShatabdi = filterTrainTypes.includes("Shatabdi") && trainName.includes("shatabdi");
        const isRajdhani = filterTrainTypes.includes("Rajdhani") && trainName.includes("rajdhani");
        if (!isExpress && !isShatabdi && !isRajdhani) return false;
      }

      const trainClasses = getTrainClasses(train);
      const lowestFare = trainClasses.length ? Math.min(...trainClasses.map((coach) => coach.fare)) : 0;
      if (lowestFare < filterPriceRange[0] || lowestFare > filterPriceRange[1]) return false;

      if (filterDepartSlots.length > 0 && train.departureTime) {
        const hour = parseInt(train.departureTime.split(":")[0], 10);
        const matched = filterDepartSlots.some((slot) => {
          if (slot === "0-6") return hour >= 0 && hour < 6;
          if (slot === "6-12") return hour >= 6 && hour < 12;
          if (slot === "12-18") return hour >= 12 && hour < 18;
          if (slot === "18-24") return hour >= 18 && hour < 24;
          return false;
        });
        if (!matched) return false;
      }

      if (filterClasses.length > 0) {
        const hasClass = trainClasses.some((coach) => filterClasses.includes(coach.type));
        if (!hasClass) return false;
      }

      return true;
    });

  const getSortedTrains = (items = []) => {
    const list = [...items];
    const getTimeValue = (value) => {
      const [hours, minutes] = String(value || "").split(":").map((part) => Number(part));
      return (Number.isFinite(hours) ? hours : 0) * 60 + (Number.isFinite(minutes) ? minutes : 0);
    };
    const getLowestFare = (train) => {
      const classes = getTrainClasses(train);
      return classes.length ? Math.min(...classes.map((coach) => Number(coach.fare) || 0)) : 0;
    };

    if (filterSortBy === "price_high_low") {
      list.sort((a, b) => getLowestFare(b) - getLowestFare(a));
    } else if (filterSortBy === "departure_early") {
      list.sort((a, b) => getTimeValue(a.departureTime) - getTimeValue(b.departureTime));
    } else if (filterSortBy === "departure_late") {
      list.sort((a, b) => getTimeValue(b.departureTime) - getTimeValue(a.departureTime));
    } else if (filterSortBy === "arrival_early") {
      list.sort((a, b) => getTimeValue(a.arrivalTime) - getTimeValue(b.arrivalTime));
    } else if (filterSortBy === "arrival_late") {
      list.sort((a, b) => getTimeValue(b.arrivalTime) - getTimeValue(a.arrivalTime));
    } else {
      list.sort((a, b) => getLowestFare(a) - getLowestFare(b));
    }

    return list;
  };

  const handleSwap = () => {
    setSource(dest);
    setDest(source);
  };

  const handleSearch = (isInitialLoad = false) => {
    if (!source.trim() || !dest.trim()) {
      if (!isInitialLoad) setError("Please enter both FROM and TO destinations.");
      return;
    }

    if (!date) {
      if (!isInitialLoad) setError("Please select a travel date.");
      return;
    }

    const fromMatch = resolveTrainSearchStation(source, trainSuggestions);
    const toMatch = resolveTrainSearchStation(dest, trainSuggestions);

    if (!fromMatch || !toMatch) {
      if (!isInitialLoad) {
        setError("Please select valid FROM and TO stations from the suggestions.");
      }
      return;
    }

    setError("");
    setHasSearched(true);
    setFilterTravelDate(date);
    fetchTrains({
      from: fromMatch.city,
      to: toMatch.city,
      date,
    });
  };

  const handleFareSelect = (trainId, fare) => {
    setSelectedFareMap((prev) => ({ ...prev, [trainId]: fare }));
  };

  const handleBookNow = (train) => {
    const trainClasses = getTrainClasses(train);
    const selectedFare = selectedFareMap[train._id] || trainClasses[0];
    if (!selectedFare) {
      showToast({
        type: "warning",
        title: "Class selection required",
        message: "Please select a class first."
      });
      return;
    }

    const bookingState = {
      category: "train",
      date,
      travelDate: date,
      train: {
        trainName: train.trainName,
        trainNumber: train.trainNumber,
        from: train.from,
        to: train.to,
        departureTime: train.departureTime,
        arrivalTime: train.arrivalTime,
        duration: train.duration,
        selectedClass: selectedFare.type,
        date,
      },
      trainId: train._id,
      passengers: [{ firstName: "", lastName: "", age: "", gender: "Male" }],
      contactDetails: { email: "", phone: "" },
      addOns: { catering: [], insurance: false },
      totalFare: selectedFare.fare,
      basePrice: selectedFare.fare,
      status: "Pending",
    };

    if (!isAuthenticated) {
      const authRedirect = buildAuthRedirect("/book/trains", bookingState);
      navigate("/login", { state: { authRedirect } });
      return;
    }

    navigate("/book/trains", {
      state: bookingState,
    });
  };

  const clearAllFilters = () => {
    setFilterClasses([]);
    setFilterDepartSlots([]);
    setFilterTrainTypes([]);
    setFilterTravelDate("");
    setFilterSortBy("price_low_high");
    const allFares = trainsList.flatMap((train) => getTrainClasses(train).map((coach) => coach.fare));
    if (allFares.length > 0) {
      setFilterPriceRange([Math.min(...allFares), Math.max(...allFares)]);
    } else {
      setFilterPriceRange([0, 10000]);
    }
  };

  const displayList = getSortedTrains(getFilteredTrains());

  return (
    <div className="trains-page-v2">
      <section className="trains-hero-v2">
        <div className="mmt-container">
          <h1>Indian Railways Train Booking</h1>
          <p>Book with India's No. 1 Travel Site</p>
        </div>
      </section>

      <TravelSearchShell
        className="travel-search-shell--hero"
        columns="1fr 40px 1fr minmax(180px, 0.9fr) 152px"
      >
        <PremiumAutosuggest
          label="FROM"
          value={source}
          placeholder="Enter Source Station"
          suggestions={trainSuggestions}
          onChange={setSource}
          onInputValidityChange={setIsSourceValid}
        />
        <TravelSearchSwapButton onClick={handleSwap} title="Swap stations">
          SWAP
        </TravelSearchSwapButton>
        <PremiumAutosuggest
          label="TO"
          value={dest}
          placeholder="Enter Destination"
          suggestions={trainSuggestions}
          onChange={setDest}
          onInputValidityChange={setIsDestValid}
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
          />
        </TravelSearchField>
        <TravelSearchButton
          onClick={() => handleSearch(false)}
          disabled={loading || !source.trim() || !dest.trim() || !isSourceValid || !isDestValid}
        >
          {loading ? "SEARCHING..." : "SEARCH"}
        </TravelSearchButton>
      </TravelSearchShell>

      {false && <div className="trains-search-bar-v2">
        <PremiumAutosuggest
          label="FROM"
          value={source}
          placeholder="Enter Source Station"
          suggestions={trainSuggestions}
          onChange={setSource}
          onInputValidityChange={setIsSourceValid}
        />
        <button className="swap-cities-btn" type="button" onClick={handleSwap} title="Swap stations">
          SWAP
        </button>
        <PremiumAutosuggest
          label="TO"
          value={dest}
          placeholder="Enter Destination"
          suggestions={trainSuggestions}
          onChange={setDest}
          onInputValidityChange={setIsDestValid}
        />
        <div className="search-input-group">
          <label>DATE</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} min={today} />
        </div>
        <button
          className="search-btn-v2"
          onClick={() => handleSearch(false)}
          disabled={loading || !source.trim() || !dest.trim() || !isSourceValid || !isDestValid}
        >
          {loading ? "SEARCHING..." : "SEARCH"}
        </button>
      </div>}

      <div className="trains-results-area">
        
        <div className="trains-main-layout">
          <aside className="trains-filters-sidebar">
            <div className="sidebar-header-inline">
              <h3>Filters</h3>
              <button className="clear-all-link" onClick={clearAllFilters}>Clear All</button>
            </div>

            <div className="sidebar-content">
              <div className="sidebar-field">
                <label>TRAIN TYPE</label>
                <div className="checkbox-group">
                  {["Rajdhani", "Shatabdi", "Express"].map((type) => (
                    <label key={type} className="custom-checkbox">
                      <input
                        type="checkbox"
                        checked={filterTrainTypes.includes(type)}
                        onChange={() => toggleFilter(type, filterTrainTypes, setFilterTrainTypes)}
                      />
                      <span>{type}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="sidebar-field">
                <label>PRICE RANGE (₹)</label>
                <div className="price-inputs-row">
                  <input
                    type="number"
                    className="price-input-small"
                    value={filterPriceRange[0]}
                    onChange={(e) => setFilterPriceRange([parseInt(e.target.value, 10) || 0, filterPriceRange[1]])}
                  />
                  <span>-</span>
                  <input
                    type="number"
                    className="price-input-small"
                    value={filterPriceRange[1]}
                    onChange={(e) => setFilterPriceRange([filterPriceRange[0], parseInt(e.target.value, 10) || 0])}
                  />
                </div>
                <input
                  type="range"
                  className="price-range-slider"
                  min="0"
                  max="10000"
                  step="100"
                  value={filterPriceRange[1]}
                  onChange={(e) => setFilterPriceRange([filterPriceRange[0], parseInt(e.target.value, 10)])}
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
                  onChange={(e) => {
                    const nextDate = e.target.value;
                    const fromMatch = resolveTrainSearchStation(source, trainSuggestions);
                    const toMatch = resolveTrainSearchStation(dest, trainSuggestions);
                    setFilterTravelDate(nextDate);
                    setDate(nextDate);
                    if (fromMatch && toMatch && nextDate) {
                      fetchTrains({
                        from: fromMatch.city,
                        to: toMatch.city,
                        date: nextDate,
                      });
                    }
                  }}
                />
              </div>

              <div className="sidebar-field">
                <label>TIME SLOT</label>
                <div className="time-grid-mini">
                  {[
                    { id: "0-6", label: "Early Morning", icon: "EM" },
                    { id: "6-12", label: "Morning", icon: "AM" },
                    { id: "12-18", label: "Afternoon", icon: "PM" },
                    { id: "18-24", label: "Evening", icon: "EV" },
                  ].map((opt) => (
                    <button
                      key={opt.id}
                      className={`mini-time-btn ${filterDepartSlots.includes(opt.id) ? "active" : ""}`}
                      onClick={() => toggleFilter(opt.id, filterDepartSlots, setFilterDepartSlots)}
                    >
                      <span className="icon">{opt.icon}</span>
                      <span className="text">{opt.id}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="sidebar-field">
                <label>QUOTA / CLASS</label>
                <div className="checkbox-group">
                  {["1A", "2A", "3A", "SL", "CC", "2S"].map((coachClass) => (
                    <label key={coachClass} className="custom-checkbox">
                      <input
                        type="checkbox"
                        checked={filterClasses.includes(coachClass)}
                        onChange={() => toggleFilter(coachClass, filterClasses, setFilterClasses)}
                      />
                      <span>{coachClass}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </aside>

          <main className="trains-results-main">
            {!loading && !error && hasSearched && (
              <div className="results-toolbar-v2">
                <div className="results-count">
                  <span className="count-num">{displayList.length}</span>
                  <span className="count-label">Trains Found</span>
                </div>
                <div className="route-info-badge">
                  {source} -&gt; {dest}
                </div>
              </div>
            )}

            {!loading && error ? (
              <div className="trains-empty-state">
                <span className="empty-icon">SEARCH</span>
                <h3>No trains found</h3>
                <p>Try adjusting your search or clearing filters.</p>
                <button className="clear-filters-btn" onClick={clearAllFilters}>Clear All Filters</button>
              </div>
            ) : !error && hasSearched && displayList.length === 0 ? (
              <div className="trains-empty-state">
                <span className="empty-icon">SEARCH</span>
                <h3>No trains found</h3>
                <p>Try adjusting your route or date.</p>
                <button className="clear-filters-btn" onClick={clearAllFilters}>Clear All Filters</button>
              </div>
            ) : !error && (
              displayList.map((train) => {
                const trainClasses = getTrainClasses(train);
                const selectedFare = selectedFareMap[train._id] || trainClasses[0];

                return (
                  <div key={train._id} className="premium-train-card">
                    <div className="card-top-header">
                      <div className="train-engine-icon">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                          <path d="M4 18V19C4 20.1046 4.89543 21 6 21H18C19.1046 21 20 20.1046 20 19V18M4 18V11C4 7.68629 6.68629 5 10 5H14C17.3137 5 20 7.68629 20 11V18M4 18H20M15 11H17M15 14H17M7 11H9M7 14H9" stroke="#008cff" strokeWidth="2" strokeLinecap="round" />
                        </svg>
                      </div>
                      <div className="train-name-info">
                        <h4>{train.trainName}</h4>
                        <p>{train.trainNumber} | Runs: {train.days}</p>
                      </div>
                    </div>

                    <div className="route-visual-line">
                      <div className="station-point left">
                        <span className="code">{train.from}</span>
                        <span className="label">FROM</span>
                        <span className="station-time">{train.departureTime}</span>
                      </div>
                      <div className="line-connector">
                        <div className="main-blue-line"></div>
                        <div className="duration-bubble">{train.duration}</div>
                      </div>
                      <div className="station-point right">
                        <span className="code">{train.to}</span>
                        <span className="label">ARRIVAL</span>
                        <span className="station-time">{train.arrivalTime}</span>
                      </div>
                    </div>

                    <div className="classes-pills-section">
                      <p className="section-title">AVAILABLE CLASSES</p>
                      <div className="pills-container">
                        {trainClasses.map((coach) => (
                          <div
                            key={coach.type}
                            className={`class-pill-item ${selectedFare?.type === coach.type ? "active" : ""}`}
                            onClick={() => handleFareSelect(train._id, coach)}
                          >
                            <span className="type-name">{coach.type}</span>
                            <span className="price-tag">{formatCurrency(coach.fare)}</span>
                            <span className="status-text">{coach.status}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="card-action-footer">
                      <div className="bottom-price-info">
                        <span className="label">STARTING FROM</span>
                        <h3 className="final-price">{selectedFare?.fare ? formatCurrency(selectedFare.fare) : "---"}</h3>
                      </div>
                      <button className="premium-book-btn" onClick={() => handleBookNow(train)}>
                        BOOK NOW
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </main>
        </div>
      </div>
    </div>
  );
}

export default Trains;


