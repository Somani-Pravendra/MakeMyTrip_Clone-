import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { API_BASE_URL } from "../../utils/api";
import "./HolidayPackages.css";
import {
    TravelSearchButton,
    TravelSearchField,
    TravelSearchShell,
} from "../../components/UI/TravelSearchShell";
import PremiumAutosuggest from "../../components/UI/PremiumAutosuggest";
import { getTodayDateString } from "../../utils/dateShortcuts";
import { formatCurrency } from "../../utils/currency";
import { applyImageFallback, MEDIA_FALLBACKS, resolveMediaUrl } from "../../utils/media";

const API_URL = `${API_BASE_URL}/packages`;
const toTitleCase = (value = "") =>
    String(value)
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
        .join(" ");
const normalizePackageValue = (value = "") => toTitleCase(value);
const sortUniqueValues = (values = []) =>
    [...new Set(values.map((item) => normalizePackageValue(item)).filter(Boolean))].sort((a, b) => a.localeCompare(b));
const getPackageDurationValue = (pkg = {}) => {
    if (typeof pkg.duration === "number") return pkg.duration;
    if (typeof pkg.duration === "string") {
        const matched = pkg.duration.match(/\d+/);
        return matched ? Number(matched[0]) : 0;
    }

    if (typeof pkg.duration?.nights === "number") return pkg.duration.nights;
    if (typeof pkg.duration?.days === "number") return pkg.duration.days;
    return 0;
};

function PackageSearchSelect({ value, options = [], onChange, placeholder = "Select option" }) {
    const [isOpen, setIsOpen] = useState(false);
    const wrapperRef = React.useRef(null);

    useEffect(() => {
        if (!isOpen) return undefined;

        const handleClickOutside = (event) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [isOpen]);

    return (
        <div className={`package-search-select ${isOpen ? "is-open" : ""}`} ref={wrapperRef}>
            <button
                type="button"
                className="package-search-select__trigger"
                onClick={(event) => {
                    event.stopPropagation();
                    setIsOpen((current) => !current);
                }}
                aria-haspopup="listbox"
                aria-expanded={isOpen}
            >
                <span>{value || placeholder}</span>
            </button>

            {isOpen && (
                <div className="package-search-select__menu" role="listbox">
                    {options.map((option) => {
                        const normalizedOption = typeof option === "string"
                            ? { label: option, value: option }
                            : option;

                        return (
                            <button
                                key={normalizedOption.value}
                                type="button"
                                className={`package-search-select__option ${normalizedOption.value === value ? "is-active" : ""}`}
                                onClick={(event) => {
                                    event.stopPropagation();
                                    onChange(normalizedOption.value);
                                    setIsOpen(false);
                                }}
                                role="option"
                                aria-selected={normalizedOption.value === value}
                            >
                                {normalizedOption.label}
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

function HolidayPackages() {
    const navigate = useNavigate();
    const today = getTodayDateString();
    const [packages, setPackages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeFilter, setActiveFilter] = useState('All');

    // Filter state
    const [selectedDestinations, setSelectedDestinations] = useState([]);
    const [selectedCountries, setSelectedCountries] = useState([]);
    const [destinationInput, setDestinationInput] = useState("");
    const [budget, setBudget] = useState("");
    const [duration, setDuration] = useState("");
    const [startDate, setStartDate] = useState(today);
    const [sortBy, setSortBy] = useState("price_low_high");
    const [guestLabel, setGuestLabel] = useState("2 Adult(s)");

    const [showAllDestinations, setShowAllDestinations] = useState(false);

    const [dynamicOptions, setDynamicOptions] = useState({
        categories: ['All'],
        destinations: [],
        countries: [],
        themes: [],
        transportTypes: []
    });

    const fetchFilters = useCallback(async () => {
        try {
            const res = await axios.get(`${API_URL}/filters`);
            
            // Ensure popular categories are always present even if DB doesn't return them
            const fallbackCategories = ['All', 'Honeymoon', 'Family', 'Adventure', 'Romantic', 'Luxury', 'Pilgrimage', 'Wildlife'];
            const backendCats = (res.data.categories || []).map((item) => normalizePackageValue(item));
            const mergedCategories = [...new Set([...fallbackCategories, ...backendCats])];

            setDynamicOptions({
                categories: mergedCategories,
                destinations: sortUniqueValues(res.data.destinations || []),
                countries: sortUniqueValues(res.data.countries || []),
                themes: sortUniqueValues(res.data.themes || []),
                transportTypes: sortUniqueValues(res.data.transportTypes || [])
            });
        } catch (err) {
            console.error("Error fetching filters:", err);
        }
    }, []);

    const fetchPackages = useCallback(async (searchParams = {}) => {
        try {
            setLoading(true);
            const params = new URLSearchParams();
            params.append('category', searchParams.category || activeFilter);

            if (selectedDestinations.length > 0) params.append('destination', selectedDestinations.map((item) => normalizePackageValue(item)).join(','));
            if (selectedCountries.length > 0) params.append('countries', selectedCountries.map((item) => normalizePackageValue(item)).join(','));
            if (budget) {
                const [min, max] = budget.split('-');
                if (min) params.append('minPrice', min);
                if (max) params.append('maxPrice', max);
            }
            if (duration) params.append('duration', duration);
            if (searchParams.startDate || startDate) params.append('startDate', searchParams.startDate || startDate);

            const res = await axios.get(`${API_URL}?${params.toString()}`);
            setPackages(res.data);
            setLoading(false);
        } catch (err) {
            console.error("Error fetching packages:", err);
            setLoading(false);
        }
    }, [activeFilter, selectedDestinations, selectedCountries, budget, duration, startDate]);

    useEffect(() => {
        window.scrollTo(0, 0);
        fetchFilters();
    }, [fetchFilters]);

    useEffect(() => {
        fetchPackages();
    }, [fetchPackages]);

    const handleApplyFilters = () => fetchPackages();

    const toggleSelection = (val, state, setState) => {
        if (state.includes(val)) {
            setState(state.filter(item => item !== val));
        } else {
            setState([...state, val]);
        }
    };

    const { categories, destinations: popularDestinations, countries: countryOptions } = dynamicOptions;

    const packageLocationSuggestions = useMemo(() => ([
        ...countryOptions.map((country) => ({
            name: country,
            city: country,
            country: "Country",
            subtitle: "Browse packages across this country",
            type: "country"
        })),
        ...popularDestinations.map((destination) => ({
            name: destination,
            city: destination,
            country: "Destination",
            subtitle: "Explore curated packages in this city",
            type: "destination"
        }))
    ]), [countryOptions, popularDestinations]);

    const applyLocationSelection = useCallback((value) => {
        const normalizedValue = normalizePackageValue(value);

        if (!normalizedValue) {
            setSelectedCountries([]);
            setSelectedDestinations([]);
            return;
        }

        if (countryOptions.includes(normalizedValue)) {
            setSelectedCountries([normalizedValue]);
            setSelectedDestinations([]);
            return;
        }

        if (popularDestinations.includes(normalizedValue)) {
            setSelectedDestinations([normalizedValue]);
            setSelectedCountries([]);
            return;
        }

        setSelectedCountries([]);
        setSelectedDestinations([]);
    }, [countryOptions, popularDestinations]);

    const budgetOptions = [
        { label: `Under ${formatCurrency(20000)}`, value: '0-20000' },
        { label: `${formatCurrency(20000)} - ${formatCurrency(50000)}`, value: '20000-50000' },
        { label: `${formatCurrency(50000)} - ${formatCurrency(100000)}`, value: '50000-100000' },
        { label: `Premium (> ${formatCurrency(100000)})`, value: '100000-' }
    ];

    const durationOptions = [
        { label: 'Quick Getaway (1-3 N)', value: '1-3' },
        { label: 'Standard (4-6 N)', value: '4-6' },
        { label: 'Relaxed (7-9 N)', value: '7-9' },
        { label: 'Explorer (10+ N)', value: '10-30' }
    ];

    const guestOptions = [
        { label: "2 Adult(s)", value: "2 Adult(s)" },
        { label: "1 Adult", value: "1 Adult" },
        { label: "3 Adult(s)", value: "3 Adult(s)" },
        { label: "4 Adult(s)", value: "4 Adult(s)" }
    ];

    const clearAllFilters = () => {
        setSelectedDestinations([]);
        setSelectedCountries([]);
        setDestinationInput("");
        setBudget("");
        setDuration("");
        setActiveFilter('All');
        setStartDate(today);
        setSortBy("price_low_high");
        setGuestLabel("2 Adult(s)");
    };

    useEffect(() => {
        setDestinationInput(selectedDestinations[0] || selectedCountries[0] || "");
    }, [selectedCountries, selectedDestinations]);

    const sortedPackages = useMemo(() => {
        const items = [...packages];

        if (sortBy === "price_high_low") {
            items.sort((a, b) => (Number(b.pricePerPerson) || 0) - (Number(a.pricePerPerson) || 0));
        } else if (sortBy === "rating_high_low") {
            items.sort((a, b) => (Number(b.rating) || 0) - (Number(a.rating) || 0));
        } else if (sortBy === "duration_short_long") {
            items.sort((a, b) => getPackageDurationValue(a) - getPackageDurationValue(b));
        } else if (sortBy === "duration_long_short") {
            items.sort((a, b) => getPackageDurationValue(b) - getPackageDurationValue(a));
        } else {
            items.sort((a, b) => (Number(a.pricePerPerson) || 0) - (Number(b.pricePerPerson) || 0));
        }

        return items;
    }, [packages, sortBy]);

    return (
        <div className="elite-packages-page fade-in">
            {/* Cinematic Hero Section */}
            <section className="elite-pkg-hero">
                <div className="hero-overlay-gradient"></div>
                <div className="mmt-container hero-content-main">
                    <span className="premium-tag">Elite Collection</span>
                    <h1>Extraordinary Holidays Await</h1>
                    <p>Discover handpicked global destinations with our signature premium service</p>
                </div>
            </section>

            {/* Horizontal Search Bar (Image Match) */}
            <div className="mmt-container relative-z search-bar-offset">
                <TravelSearchShell
                    className="travel-search-shell--inline"
                    columns="minmax(0, 1.2fr) minmax(0, 0.9fr) minmax(0, 0.9fr) minmax(0, 0.8fr) 152px"
                >
                    <PremiumAutosuggest
                        label="DESTINATION / AREA"
                        value={destinationInput}
                        placeholder="Where to?"
                        suggestions={packageLocationSuggestions}
                        onChange={(val) => {
                            setDestinationInput(val);
                            applyLocationSelection(val);
                        }}
                        onSuggestionSelect={(item) => {
                            const selectedValue = item?.city || item?.name || "";
                            setDestinationInput(selectedValue);
                            applyLocationSelection(selectedValue);
                        }}
                    />

                    <TravelSearchField
                        label="START DATE"
                        icon={
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                                <line x1="16" y1="2" x2="16" y2="6"></line>
                                <line x1="8" y1="2" x2="8" y2="6"></line>
                                <line x1="3" y1="10" x2="21" y2="10"></line>
                            </svg>
                        }
                    >
                         <input type="date" min={today} value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                    </TravelSearchField>

                    <TravelSearchField
                        label="EXPERIENCE"
                        icon={
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"></path>
                            </svg>
                        }
                    >
                        <PackageSearchSelect
                            value={activeFilter}
                            options={categories.map((category) => ({ label: category, value: category }))}
                            onChange={setActiveFilter}
                        />
                    </TravelSearchField>

                    <TravelSearchField
                        label="GUESTS"
                        className="travel-search-shell__field--no-border"
                        icon={
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                                <circle cx="9" cy="7" r="4"></circle>
                                <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                                <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                            </svg>
                        }
                    >
                        <PackageSearchSelect
                            value={guestLabel}
                            options={guestOptions}
                            onChange={setGuestLabel}
                        />
                    </TravelSearchField>

                    <TravelSearchButton onClick={handleApplyFilters}>SEARCH</TravelSearchButton>
                </TravelSearchShell>

                {false && <div className="elite-horizontal-search">
                    <div className="hs-field">
                        <label className="hs-label">DESTINATION / AREA</label>
                        <select 
                            className="hs-input"
                            value={selectedDestinations[0] || selectedCountries[0] || ""}
                            onChange={(e) => {
                                const val = e.target.value;
                                if (val === "") {
                                    setSelectedCountries([]);
                                    setSelectedDestinations([]);
                                } else {
                                    if (countryOptions.includes(val)) {
                                        setSelectedCountries([val]);
                                        setSelectedDestinations([]);
                                    } else {
                                        setSelectedDestinations([val]);
                                        setSelectedCountries([]);
                                    }
                                }
                            }}
                        >
                            <option value="">Where to?</option>
                            {countryOptions.length > 0 && (
                                <optgroup label="Countries">
                                    {countryOptions.map(c => <option key={c} value={c}>{c}</option>)}
                                </optgroup>
                            )}
                            {popularDestinations.length > 0 && (
                                <optgroup label="Cities">
                                    {popularDestinations.map(d => <option key={d} value={d}>{d}</option>)}
                                </optgroup>
                            )}
                        </select>
                    </div>

                    <div className="hs-field">
                         <label className="hs-label">START DATE</label>
                         <input type="date" className="hs-input" min={today} value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                    </div>

                    <div className="hs-field">
                         <label className="hs-label">EXPERIENCE</label>
                         <select className="hs-input" value={activeFilter} onChange={e => setActiveFilter(e.target.value)}>
                              {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                         </select>
                    </div>

                    <div className="hs-field no-border">
                         <label className="hs-label">GUESTS</label>
                         <select className="hs-input defaultValue">
                              <option>2 Adult(s)</option>
                              <option>1 Adult</option>
                              <option>3 Adult(s)</option>
                              <option>4 Adult(s)</option>
                         </select>
                    </div>

                    <div className="hs-btn-container">
                         <button className="hs-search-btn" onClick={handleApplyFilters}>SEARCH</button>
                    </div>
                </div>}
            </div>

            {/* Top Minimal Toolbar for Mobile/Summary */}
            <div className="mmt-container relative-z">
                <div className="secondary-toolbar pb-20 mt-20">
                    <div className="active-tags-row">
                        {(selectedDestinations.length > 0 || selectedCountries.length > 0 || budget || duration || activeFilter !== 'All') && (
                            <button className="clear-btn-small" onClick={clearAllFilters}>Reset Settings</button>
                        )}
                    </div>
                </div>

                
            </div>

            {/* Main Package Split Layout (Sidebar + Grid) */}
            <div className="mmt-container pkg-split-layout">
                {/* Left Sidebar - High Fidelity Chunky Boxes */}
                <aside className="elite-filters-sidebar">
                    <h2 className="filter-main-title">Filters</h2>
                    
                    {popularDestinations.length > 0 && (
                        <div className="filter-group">
                             <h4 className="filter-group-title">CITY / DESTINATION</h4>
                             {(showAllDestinations ? popularDestinations : popularDestinations.slice(0, 4)).map(dest => (
                                 <label key={dest} className="filter-option-box">
                                     <input 
                                         type="checkbox" 
                                         className="custom-box-input"
                                         checked={selectedDestinations.includes(dest)} 
                                         onChange={() => toggleSelection(dest, selectedDestinations, setSelectedDestinations)} 
                                     />
                                     <span className="box-indicator circle"></span>
                                     <span className="box-label">{dest}</span>
                                 </label>
                             ))}
                             {popularDestinations.length > 4 && (
                                 <button className="view-more-cyan" onClick={() => setShowAllDestinations(!showAllDestinations)}>
                                     {showAllDestinations ? '- VIEW LESS' : '+ VIEW MORE'}
                                 </button>
                             )}
                        </div>
                    )}

                    <div className="filter-group">
                         <h4 className="filter-group-title">EXPERIENCE TYPE</h4>
                         {categories.map(cat => (
                             <label key={cat} className="filter-option-box">
                                 <input 
                                     type="radio" 
                                     name="category"
                                     className="custom-box-input"
                                     checked={activeFilter === cat} 
                                     onChange={() => setActiveFilter(cat)} 
                                 />
                                 <span className="box-indicator square"></span>
                                 <span className="box-label">{cat}</span>
                             </label>
                         ))}
                    </div>

                    <div className="filter-group">
                         <h4 className="filter-group-title">DURATION</h4>
                         {durationOptions.map(opt => (
                             <label key={opt.value} className="filter-option-box">
                                 <input 
                                     type="checkbox" 
                                     className="custom-box-input"
                                     checked={duration === opt.value} 
                                     onChange={() => setDuration(duration === opt.value ? "" : opt.value)} 
                                 />
                                 <span className="box-indicator square"></span>
                                 <span className="box-label">{opt.label}</span>
                             </label>
                         ))}
                    </div>

                    <div className="filter-group">
                         <h4 className="filter-group-title">SORT BY</h4>
                         <select
                             className="filter-select-input"
                             value={sortBy}
                             onChange={(e) => setSortBy(e.target.value)}
                         >
                             <option value="price_low_high">Price: Low to High</option>
                             <option value="price_high_low">Price: High to Low</option>
                             <option value="rating_high_low">Rating: High to Low</option>
                             <option value="duration_short_long">Duration: Short to Long</option>
                             <option value="duration_long_short">Duration: Long to Short</option>
                         </select>
                    </div>

                    <div className="filter-group">
                         <h4 className="filter-group-title">START DATE</h4>
                         <input
                             type="date"
                             className="filter-select-input"
                             min={today}
                             value={startDate}
                             onChange={(e) => setStartDate(e.target.value)}
                         />
                    </div>

                    <div className="filter-group border-bottom-none">
                         <h4 className="filter-group-title">BUDGET (P.P)</h4>
                         {budgetOptions.map(opt => (
                             <label key={opt.value} className="filter-option-box">
                                 <input 
                                     type="checkbox"
                                     className="custom-box-input"
                                     checked={budget === opt.value} 
                                     onChange={() => setBudget(budget === opt.value ? "" : opt.value)} 
                                 />
                                 <span className="box-indicator square"></span>
                                 <span className="box-label">{opt.label}</span>
                             </label>
                         ))}
                    </div>
                </aside>

                {/* Main Grid View */}
                <div className="pkg-grid-main">
                    {loading ? (
                        <div className="pkg-detail-loading min-h-loading">
                            <div className="elite-spinner"></div>
                            <p>Curating luxury experiences...</p>
                        </div>
                    ) : sortedPackages.length > 0 ? (
                        <div className="elite-cards-grid">
                            {sortedPackages.map(pkg => (
                                <div key={pkg._id} className="elite-pkg-card" onClick={() => navigate(`/packages/${pkg._id}`)}>
                                    <div className="card-img-wrapper">
                                        <img
                                            src={resolveMediaUrl(pkg.thumbnailImage, MEDIA_FALLBACKS.package)}
                                            alt={pkg.packageTitle}
                                            loading="lazy"
                                            onError={(event) => applyImageFallback(event, MEDIA_FALLBACKS.package)}
                                        />
                                        <div className="card-overlays">
                                            <span className="category-badge">{pkg.category}</span>
                                            <span className="duration-badge">{pkg.duration}</span>
                                        </div>
                                    </div>
                                    <div className="card-info-wrapper">
                                        <div className="pkg-meta-top">
                                            <span className="location">Location: {pkg.city || 'Dest'}, {pkg.country}</span>
                                            <span className="rating">&#9733; {pkg.rating || 4.5} <span className="rev-count">({pkg.totalReviews || 0})</span></span>
                                        </div>
                                        <h3 className="card-title-v2">{pkg.packageTitle}</h3>
                                        <div className="pkg-inclusions-mini">
                                            {pkg.included && Array.isArray(pkg.included) && pkg.included.slice(0, 3).map((inc, i) => (
                                                <span key={i} className="inc-pill">&#10003; {inc}</span>
                                            ))}
                                            {pkg.included?.length > 3 && <span className="more-inc">+{pkg.included.length - 3}</span>}
                                        </div>
                                        <div className="pkg-card-footer">
                                            <div className="price-block">
                                                <span className="price-label">Starts from</span>
                                                <div className="price-val-container">
                                                    <h4>{formatCurrency(pkg.pricePerPerson)}</h4>
                                                </div>
                                                {pkg.discount > 0 && <span className="discount-tag">Save {pkg.discount}%</span>}
                                            </div>
                                            <button className="btn-view-details" onClick={(e) => { e.stopPropagation(); navigate(`/packages/${pkg._id}`); }}>
                                                View Details
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="pkg-not-found min-h-loading">
                            <h2>No Elite Packages Found</h2>
                            <p>Try refining your filters or exploring another category.</p>
                            <button onClick={clearAllFilters} className="btn-book-now lrg mt-20">View All Packages</button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default HolidayPackages;


