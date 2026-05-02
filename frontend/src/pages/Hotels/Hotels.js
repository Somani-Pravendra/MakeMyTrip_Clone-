import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../../contexts/AuthContext";
import "./Hotels.css";
import { API_BASE_URL } from "../../utils/api";
import PremiumAutosuggest from "../../components/UI/PremiumAutosuggest";
import {
  TravelSearchButton,
  TravelSearchField,
  TravelSearchShell,
} from "../../components/UI/TravelSearchShell";
import { FLIGHT_LOCATIONS } from "../../data/LocationData";
import { getTodayDateString } from "../../utils/dateShortcuts";
import { buildAuthRedirect } from "../../utils/authRedirect";
import { formatCurrency } from "../../utils/currency";
import { applyImageFallback, MEDIA_FALLBACKS, resolveMediaUrl } from "../../utils/media";

const HOTEL_CITY_ALIASES = {
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
const normalizeHotelCity = (value = "") => {
  const cleaned = String(value || "").trim().toLowerCase();
  if (!cleaned) return "";

  const canonicalEntry = Object.entries(HOTEL_CITY_ALIASES).find(([, aliases]) => aliases.includes(cleaned));
  return canonicalEntry ? toTitleCase(canonicalEntry[0]) : toTitleCase(cleaned);
};
const resolveHotelSearchValue = (input, suggestions = []) => {
  const rawQuery = String(input || "").trim().toLowerCase();
  const normalizedValue = normalizeHotelCity(input);

  if (!rawQuery && !normalizedValue) return null;

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
        return normalizedField === rawQuery || normalizedField === normalizedValue.toLowerCase();
      })
  );

  if (!matchedSuggestion) {
    return normalizedValue ? { searchType: "city", city: normalizedValue } : null;
  }

  return {
    ...matchedSuggestion,
    city: normalizeHotelCity(matchedSuggestion.city),
    searchCity: normalizeHotelCity(matchedSuggestion.searchCity || matchedSuggestion.city)
  };
};
const getLowestPricedRoom = (hotel = {}) => {
  const roomTypes = Array.isArray(hotel.roomTypes) ? hotel.roomTypes : [];
  const pricedRooms = roomTypes
    .map((room) => ({
      ...room,
      pricePerNight: Number(room?.pricePerNight) || 0
    }))
    .filter((room) => room.pricePerNight > 0);

  if (pricedRooms.length === 0) {
    return null;
  }

  return pricedRooms.reduce((min, room) => (room.pricePerNight < min.pricePerNight ? room : min), pricedRooms[0]);
};

function Hotels() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const today = getTodayDateString();

  function getNextDateValue(value) {
    const nextDate = new Date(value);
    nextDate.setDate(nextDate.getDate() + 1);
    return nextDate.toISOString().split("T")[0];
  }

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCity, setSelectedCity] = useState("");
  const [checkIn, setCheckIn] = useState(today);
  const [checkOut, setCheckOut] = useState(getNextDateValue(today));
  const [guests, setGuests] = useState(2);
  const [selectedHotel, setSelectedHotel] = useState(null);
  const [activeFilters, setActiveFilters] = useState({ star: [], propertyType: [] });
  const [hotels, setHotels] = useState([]);
  const [cities, setCities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAllCities, setShowAllCities] = useState(false);
  const [priceBounds, setPriceBounds] = useState([0, 50000]);
  const [priceRange, setPriceRange] = useState([0, 50000]);
  const [minGuestRating, setMinGuestRating] = useState(null);
  const [sortBy, setSortBy] = useState("price_low_high");

  const API_URL = `${API_BASE_URL}/hotels`;
  const propertyTypes = ["Hotel", "Resort", "Guest House", "Villa", "Boutique Hotel"];
  const hotelSearchSuggestions = useMemo(() => [
    ...cities.map((city) => ({
      searchType: "city",
      code: normalizeHotelCity(city).slice(0, 3).toUpperCase(),
      city: normalizeHotelCity(city),
      airport: `${normalizeHotelCity(city)} stays`,
      country: "India",
    })),
    ...hotels.map((hotel) => ({
      searchType: "hotel",
      code: "HTL",
      city: hotel.name || "",
      airport: [normalizeHotelCity(hotel.location?.city), hotel.location?.address].filter(Boolean).join(" • "),
      country: hotel.location?.state || "India",
      searchCity: normalizeHotelCity(hotel.location?.city || ""),
    })),
    ...FLIGHT_LOCATIONS.map((item) => ({
      ...item,
      city: normalizeHotelCity(item.city)
    })),
  ], [cities, hotels]);

  const fetchHotels = useCallback(async (searchOverrides = {}) => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      const nextSelectedCity = searchOverrides.selectedCity ?? selectedCity;
      const nextSearchTerm = searchOverrides.searchTerm ?? searchTerm;
      const nextCheckIn = searchOverrides.checkIn ?? checkIn;
      const nextCheckOut = searchOverrides.checkOut ?? checkOut;

      if (nextSelectedCity) {
        params.append("city", nextSelectedCity);
      }

      if (nextCheckIn) {
        params.append("checkIn", nextCheckIn);
      }

      if (nextCheckOut) {
        params.append("checkOut", nextCheckOut);
      }

      if (activeFilters.star.length > 0) {
        params.append("rating", Math.min(...activeFilters.star));
      }

      const response = await axios.get(`${API_URL}?${params}`);
      const responseData = response.data || [];
      const prices = responseData
        .map((hotel) => {
          if (!hotel.roomTypes || hotel.roomTypes.length === 0) {
            return 0;
          }

          return Math.min(...hotel.roomTypes.map((room) => Number(room.pricePerNight) || 0));
        })
        .filter((price) => price > 0);

      if (prices.length > 0) {
        const nextBounds = [Math.min(...prices), Math.max(...prices)];
        setPriceBounds(nextBounds);
        setPriceRange((current) => {
          const isDefaultRange = current[0] === 0 && current[1] === 50000;
          return isDefaultRange ? nextBounds : current;
        });
      } else {
        setPriceBounds([0, 50000]);
        setPriceRange((current) => (
          current[0] === 0 && current[1] === 50000 ? current : [0, 50000]
        ));
      }

      let filteredData = responseData;

      if (nextSearchTerm) {
        filteredData = filteredData.filter((hotel) => {
          const hotelName = hotel.name || "";
          const cityName = normalizeHotelCity(hotel.location?.city || "");
          const query = nextSearchTerm.toLowerCase();
          return (
            hotelName.toLowerCase().includes(query) ||
            cityName.toLowerCase().includes(query)
          );
        });
      }

      if (activeFilters.star.length > 0) {
        filteredData = filteredData.filter((hotel) => activeFilters.star.includes(hotel.stars));
      }

      if (activeFilters.propertyType.length > 0) {
        filteredData = filteredData.filter((hotel) => activeFilters.propertyType.includes(hotel.category));
      }

      filteredData = filteredData.filter((hotel) => {
        const price = getDisplayPrice(hotel);
        return price >= priceRange[0] && price <= priceRange[1];
      });

      if (minGuestRating !== null) {
        filteredData = filteredData.filter((hotel) => Number(hotel.rating || 0) >= minGuestRating);
      }

      setHotels(filteredData);
    } catch (error) {
      console.error("Error fetching hotels:", error);
      setHotels([]);
    } finally {
      setLoading(false);
    }
  }, [API_URL, activeFilters, searchTerm, selectedCity, priceRange, minGuestRating, checkIn, checkOut]);

  const fetchCities = useCallback(async () => {
    try {
      const response = await axios.get(`${API_URL}/cities/list`);
      setCities(response.data || []);
    } catch (error) {
      console.error("Error fetching cities:", error);
    }
  }, [API_URL]);

  useEffect(() => {
    fetchCities();
  }, [fetchCities]);

  useEffect(() => {
    fetchHotels();
  }, [fetchHotels]);

  const toggleFilter = (type, value) => {
    setActiveFilters((prev) => {
      const items = prev[type].includes(value) ? prev[type].filter((item) => item !== value) : [...prev[type], value];
      return { ...prev, [type]: items };
    });
  };

  const getDisplayPrice = (hotel) => {
    if (!hotel.roomTypes || hotel.roomTypes.length === 0) {
      return 0;
    }

    return Math.min(...hotel.roomTypes.map((room) => room.pricePerNight));
  };

  const clearAllFilters = () => {
    setActiveFilters({ star: [], propertyType: [] });
    setMinGuestRating(null);
    setSortBy("price_low_high");
    setPriceRange(priceBounds);
  };

  const sortedHotels = useMemo(() => {
    const items = [...hotels];

    if (sortBy === "price_high_low") {
      items.sort((a, b) => getDisplayPrice(b) - getDisplayPrice(a));
    } else if (sortBy === "rating_high_low") {
      items.sort((a, b) => (Number(b.rating) || 0) - (Number(a.rating) || 0));
    } else if (sortBy === "rooms_high_low") {
      items.sort((a, b) => (Number(b.availableRooms) || 0) - (Number(a.availableRooms) || 0));
    } else if (sortBy === "stars_high_low") {
      items.sort((a, b) => (Number(b.stars) || 0) - (Number(a.stars) || 0));
    } else {
      items.sort((a, b) => getDisplayPrice(a) - getDisplayPrice(b));
    }

    return items;
  }, [hotels, sortBy]);

  const getDisplayImage = (hotel) =>
    resolveMediaUrl(
      hotel.images && hotel.images.length > 0 ? hotel.images[0] : "",
      MEDIA_FALLBACKS.hotel
    );

  const getTags = (hotel) => {
    const tags = [];

    if (hotel.category === "Resort") tags.push("Resort");
    if (hotel.category === "Boutique Hotel") tags.push("Boutique");
    if (hotel.stars === 5) tags.push("Luxury");
    if (hotel.amenities?.includes("Beach Access")) tags.push("Beach Front");
    if (hotel.amenities?.includes("Swimming Pool")) tags.push("Pool");

    return tags;
  };

  const handleBookNow = (hotel) => {
    const lowestPriceRoom = getLowestPricedRoom(hotel);

    if (!lowestPriceRoom) {
      return;
    }

    const bookingState = {
      hotel,
      selectedRoom: lowestPriceRoom,
      checkIn,
      checkOut,
      guests,
      price: lowestPriceRoom.pricePerNight,
      basePrice: lowestPriceRoom.pricePerNight,
    };

    if (!isAuthenticated) {
      const authRedirect = buildAuthRedirect("/book/hotels", bookingState);
      navigate("/login", { state: { authRedirect } });
      return;
    }

    navigate("/book/hotels", {
      state: bookingState,
    });
  };

  const handleHotelSearch = () => {
    const resolvedSearch = resolveHotelSearchValue(searchTerm || selectedCity, hotelSearchSuggestions);
    const nextSearchTerm = searchTerm || selectedCity;

    if (!resolvedSearch) {
      setSelectedCity("");
      fetchHotels({ selectedCity: "", searchTerm: nextSearchTerm });
      return;
    }

    if (resolvedSearch.searchType === "hotel") {
      setSearchTerm(resolvedSearch.city || nextSearchTerm);
      setSelectedCity(resolvedSearch.searchCity || "");
      fetchHotels({
        selectedCity: resolvedSearch.searchCity || "",
        searchTerm: resolvedSearch.city || nextSearchTerm
      });
      return;
    }

    setSearchTerm(resolvedSearch.city || nextSearchTerm);
    setSelectedCity(resolvedSearch.city || "");
    fetchHotels({
      selectedCity: resolvedSearch.city || "",
      searchTerm: resolvedSearch.city || nextSearchTerm
    });
  };

  return (
    <div className="hotels-page">
      <header className="hotels-header">
        <div className="mmt-container">
          <h1>Hotels, Resorts & More</h1>
          <p>Handpicked properties with dependable pricing and polished booking</p>
        </div>
      </header>

      <TravelSearchShell
        className="travel-search-shell--hero"
        columns="minmax(0, 1.45fr) minmax(0, 0.95fr) minmax(0, 0.95fr) minmax(0, 0.78fr) 152px"
      >
        <PremiumAutosuggest
          label="CITY / HOTEL / AREA"
          value={searchTerm || selectedCity}
          placeholder="Where to?"
          suggestions={hotelSearchSuggestions}
          onChange={(val) => {
            setSearchTerm(val);
            setSelectedCity("");
          }}
          onSuggestionSelect={(item, displayValue) => {
            setSearchTerm(displayValue);
            if (item.searchType === "city") {
              setSelectedCity(item.city);
            } else if (item.searchType === "hotel") {
              setSelectedCity(item.searchCity || "");
            } else {
              setSelectedCity(item.city || "");
            }
          }}
        />

        <TravelSearchField
          label="CHECK IN"
          meta={new Date(checkIn).toLocaleDateString("en-US", { weekday: "long" })}
          icon={
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="16" y1="2" x2="16" y2="6"></line>
              <line x1="8" y1="2" x2="8" y2="6"></line>
              <line x1="3" y1="10" x2="21" y2="10"></line>
            </svg>
          }
        >
          <input type="date" value={checkIn} onChange={(e) => setCheckIn(e.target.value)} min={today} />
        </TravelSearchField>

        <TravelSearchField
          label="CHECK OUT"
          meta={new Date(checkOut).toLocaleDateString("en-US", { weekday: "long" })}
          icon={
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="16" y1="2" x2="16" y2="6"></line>
              <line x1="8" y1="2" x2="8" y2="6"></line>
              <line x1="3" y1="10" x2="21" y2="10"></line>
            </svg>
          }
        >
          <input type="date" value={checkOut} onChange={(e) => setCheckOut(e.target.value)} min={checkIn || today} />
        </TravelSearchField>

        <TravelSearchField
          label="GUESTS"
          icon={
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
              <circle cx="9" cy="7" r="4"></circle>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
            </svg>
          }
        >
          <select value={guests} onChange={(e) => setGuests(Number(e.target.value))}>
            {[1, 2, 3, 4, 5].map((count) => (
              <option key={count} value={count}>
                {count} Adult{count > 1 ? "s" : ""}
              </option>
            ))}
          </select>
        </TravelSearchField>

        <TravelSearchButton onClick={handleHotelSearch} type="button">
          Search
        </TravelSearchButton>
      </TravelSearchShell>

      {false && <div className="hotels-search-container">
        <PremiumAutosuggest
          label="CITY / HOTEL / AREA"
          value={searchTerm || selectedCity}
          placeholder="Where to?"
          suggestions={hotelSearchSuggestions}
          onChange={(val) => {
            setSearchTerm(val);
            setSelectedCity("");
          }}
          onSuggestionSelect={(item, displayValue) => {
            setSearchTerm(displayValue);
            if (item.searchType === "city") {
              setSelectedCity(item.city);
            } else if (item.searchType === "hotel") {
              setSelectedCity(item.searchCity || "");
            } else {
              setSelectedCity(item.city || "");
            }
          }}
        />

        <div className="search-field-v2">
          <label>
            Check In{" "}
            <span className="day-name">
              {new Date(checkIn).toLocaleDateString("en-US", { weekday: "long" })}
            </span>
          </label>
          <input type="date" value={checkIn} onChange={(e) => setCheckIn(e.target.value)} min={today} />
        </div>

        <div className="search-field-v2">
          <label>
            Check Out{" "}
            <span className="day-name">
              {new Date(checkOut).toLocaleDateString("en-US", { weekday: "long" })}
            </span>
          </label>
          <input type="date" value={checkOut} onChange={(e) => setCheckOut(e.target.value)} min={checkIn || today} />
        </div>

        <div className="search-field-v2">
          <label>Guests</label>
          <select value={guests} onChange={(e) => setGuests(Number(e.target.value))}>
            {[1, 2, 3, 4, 5].map((count) => (
              <option key={count} value={count}>
                {count} Adult{count > 1 ? "s" : ""}
              </option>
            ))}
          </select>
        </div>

        <button className="search-btn-v2" onClick={handleHotelSearch} type="button">
          Search
        </button>
      </div>}

      

      <div className="hotels-layout">
        <aside className="filters-sidebar">
          <div className="filters-header-inline">
            <h3>Filters</h3>
            <button className="clear-filter-link" type="button" onClick={clearAllFilters}>
              Clear All
            </button>
          </div>

          <div className="filter-group-v2">
            <h4>City</h4>
            {(showAllCities ? cities : cities.slice(0, 5)).map((city) => (
              <label key={city} className="checkbox-label">
                <input type="radio" name="city" checked={selectedCity === city} onChange={() => setSelectedCity(city)} />
                {city}
              </label>
            ))}

            {cities.length > 5 && (
              <button className="view-more-link" onClick={() => setShowAllCities((open) => !open)} type="button">
                {showAllCities ? "- View Less" : "+ View More"}
              </button>
            )}
          </div>

          <div className="filter-group-v2">
            <h4>Star Rating</h4>
            {[5, 4, 3].map((stars) => (
              <label key={stars} className="checkbox-label">
                <input
                  type="checkbox"
                  checked={activeFilters.star.includes(stars)}
                  onChange={() => toggleFilter("star", stars)}
                />
                {stars} Star {stars === 5 ? "Luxury" : stars === 4 ? "Premium" : "Comfort"}
              </label>
            ))}
          </div>

          <div className="filter-group-v2">
            <h4>Price Per Night</h4>
            <div className="filter-input-row">
              <input
                type="number"
                className="filter-price-input"
                value={priceRange[0]}
                onChange={(e) => setPriceRange([Number(e.target.value) || 0, priceRange[1]])}
              />
              <span>-</span>
              <input
                type="number"
                className="filter-price-input"
                value={priceRange[1]}
                onChange={(e) => setPriceRange([priceRange[0], Number(e.target.value) || 0])}
              />
            </div>
            <input
              type="range"
              className="filter-price-range"
              min={priceBounds[0]}
              max={priceBounds[1] || 50000}
              step="100"
              value={priceRange[1]}
              onChange={(e) => setPriceRange([priceRange[0], Number(e.target.value)])}
            />
            <p className="range-caption">Tune your stay budget instantly.</p>
          </div>

          <div className="filter-group-v2">
            <h4>Sort By</h4>
            <select
              className="filter-select-input"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
            >
              <option value="price_low_high">Price: Low to High</option>
              <option value="price_high_low">Price: High to Low</option>
              <option value="rating_high_low">Guest Rating: High to Low</option>
              <option value="stars_high_low">Star Rating: High to Low</option>
              <option value="rooms_high_low">Rooms: High to Low</option>
            </select>
          </div>

          <div className="filter-group-v2">
            <h4>Check-in Date</h4>
            <input
              type="date"
              className="filter-select-input"
              min={today}
              value={checkIn}
              onChange={(e) => {
                const nextCheckIn = e.target.value;
                setCheckIn(nextCheckIn);
                if (checkOut <= nextCheckIn) {
                  setCheckOut(getNextDateValue(nextCheckIn));
                }
              }}
            />
          </div>

          <div className="filter-group-v2">
            <h4>Guest Rating</h4>
            <div className="radio-filter-group">
              {[4.5, 4, 3.5].map((rating) => (
                <label key={rating} className="checkbox-label">
                  <input
                    type="radio"
                    name="hotel-rating-filter"
                    checked={minGuestRating === rating}
                    onChange={() => setMinGuestRating(minGuestRating === rating ? null : rating)}
                  />
                  {rating}+ Rated
                </label>
              ))}
            </div>
          </div>

          <div className="filter-group-v2">
            <h4>Property Type</h4>
            {propertyTypes.map((type) => (
              <label key={type} className="checkbox-label">
                <input
                  type="checkbox"
                  checked={activeFilters.propertyType.includes(type)}
                  onChange={() => toggleFilter("propertyType", type)}
                />
                {type}
              </label>
            ))}
          </div>
        </aside>

        <main className="hotels-list">
          <div className="list-header hotels-list-header">
            <h2>{selectedCity ? `Properties in ${selectedCity}` : "Recommended stays"} ({sortedHotels.length})</h2>
          </div>

          {loading ? (
            <div className="hotels-state-card">
              <p>Loading hotels...</p>
            </div>
          ) : sortedHotels.length === 0 ? (
            <div className="hotels-state-card">
              <p>No hotels found matching your criteria.</p>
            </div>
          ) : (
            sortedHotels.map((hotel) => (
              <div key={hotel._id} className="hotel-card-v2">
                <div className="hotel-img-v2">
                  <img
                    src={getDisplayImage(hotel)}
                    alt={hotel.name}
                    loading="lazy"
                    onError={(event) => applyImageFallback(event, MEDIA_FALLBACKS.hotel)}
                  />
                </div>

                <div className="hotel-info-v2">
                  <div className="hotel-card-head">
                    <h3>{hotel.name}</h3>
                    <div className="hotel-rating-chip">{hotel.rating}</div>
                  </div>

                  <p className="hotel-location-line">
                    {hotel.location.city}, {hotel.location.state}
                  </p>

                  <div className="hotel-tag-row">
                    {getTags(hotel).map((tag) => (
                      <span key={tag} className={`tag-v2 ${tag.includes("Luxury") ? "premium" : ""}`}>
                        {tag}
                      </span>
                    ))}
                  </div>

                  <div className="amenity-icons">
                    {(hotel.amenities || []).slice(0, 4).map((amenity) => (
                      <span key={amenity}>{amenity}</span>
                    ))}
                    {(hotel.amenities || []).length > 4 && <span>+{hotel.amenities.length - 4} more</span>}
                  </div>

                  <div className="hotel-availability-line">
                    {hotel.availableRooms} rooms available • {hotel.category}
                  </div>
                </div>

                <div className="hotel-price-v2">
                  <span className="price-now">{formatCurrency(getDisplayPrice(hotel))}</span>
                  <p className="hotel-price-note">per night</p>
                  <button className="book-btn-v2" onClick={() => handleBookNow(hotel)} type="button">
                    Book Now
                  </button>
                  <button className="hotel-detail-link" onClick={() => setSelectedHotel(hotel)} type="button">
                    View Details
                  </button>
                </div>
              </div>
            ))
          )}
        </main>
      </div>

      {selectedHotel && (
        <div className="modal-overlay" onClick={() => setSelectedHotel(null)}>
          <div className="modal-content hotel-detail-modal" onClick={(e) => e.stopPropagation()}>
            <button className="hotel-detail-close" onClick={() => setSelectedHotel(null)} type="button">
              ×
            </button>

            <div className="hotel-detail-grid">
              <img
                src={getDisplayImage(selectedHotel)}
                alt={selectedHotel.name}
                className="hotel-detail-image"
                loading="lazy"
                onError={(event) => applyImageFallback(event, MEDIA_FALLBACKS.hotel)}
              />

              <div className="hotel-detail-body">
                <h2>{selectedHotel.name}</h2>
                <div className="hotel-detail-rating">
                  {selectedHotel.rating} / 5 ({selectedHotel.stars} Star)
                </div>
                <p className="hotel-detail-copy">{selectedHotel.description}</p>

                <div className="hotel-detail-section">
                  <h4>Location</h4>
                  <p className="hotel-detail-meta">
                    {selectedHotel.location.address}, {selectedHotel.location.city}, {selectedHotel.location.state}
                  </p>
                </div>

                <div className="hotel-detail-section">
                  <h4>Room Types</h4>
                  {(selectedHotel.roomTypes || []).map((room, index) => (
                    <div key={index} className="hotel-room-card">
                      <div className="hotel-room-title">{room.type}</div>
                      <div className="hotel-room-price">{formatCurrency(room.pricePerNight)}/night</div>
                      <div className="hotel-room-meta">
                        Max occupancy: {room.maxOccupancy} • {room.amenities.join(", ")}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="hotel-detail-section">
                  <h4>Amenities</h4>
                  <div className="hotel-amenity-cloud">
                    {(selectedHotel.amenities || []).map((amenity) => (
                      <span key={amenity} className="hotel-amenity-pill">
                        {amenity}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="hotel-detail-section">
                  <h4>Property Highlights</h4>
                  <ul className="hotel-highlight-list">
                    <li>{selectedHotel.availableRooms} rooms available</li>
                    <li>
                      Check-in: {selectedHotel.checkInTime}, Check-out: {selectedHotel.checkOutTime}
                    </li>
                    <li>{selectedHotel.policies?.cancellationPolicy || "Standard cancellation policy"}</li>
                  </ul>
                </div>

                <button className="book-btn-v2 hotel-detail-book" onClick={() => handleBookNow(selectedHotel)} type="button">
                  Confirm & Book
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Hotels;

