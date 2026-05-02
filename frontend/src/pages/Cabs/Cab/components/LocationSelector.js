import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import './LocationSelector.css';
import {
  TravelSearchButton,
  TravelSearchField,
  TravelSearchShell,
  TravelSearchSwapButton
} from '../../../../components/UI/TravelSearchShell';
import { getDateTimeLocalShortcut } from '../../../../utils/dateShortcuts';
import { estimateCabDuration, getTrafficInfo } from '../../../../utils/cabBooking';

const DEFAULT_CITY_CENTER = { lat: 20.5937, lng: 78.9629 };

const CITY_CATALOGS = [
  {
    cityLabel: 'Ahmedabad',
    aliases: ['ahmedabad', 'motera', 'navrangpura', 'science city'],
    locations: [
      { name: 'Sardar Vallabhbhai Patel International Airport', shortLabel: 'Ahmedabad Airport', subtitle: 'Airport terminal pickup', coords: { lat: 23.0773, lng: 72.6347 } },
      { name: 'Sabarmati Railway Station', shortLabel: 'Sabarmati Station', subtitle: 'Railway station pickup', coords: { lat: 23.0702, lng: 72.5886 } },
      { name: 'Kalupur Railway Station', shortLabel: 'Kalupur Station', subtitle: 'Old city rail hub', coords: { lat: 23.0265, lng: 72.6014 } },
      { name: 'Science City Ahmedabad', shortLabel: 'Science City', subtitle: 'SG Highway landmark', coords: { lat: 23.0717, lng: 72.4992 } },
      { name: 'IIM Ahmedabad', shortLabel: 'IIM Ahmedabad', subtitle: 'Business and education district', coords: { lat: 23.0326, lng: 72.5461 } },
      { name: 'Kankaria Lake', shortLabel: 'Kankaria Lake', subtitle: 'Leisure and family destination', coords: { lat: 23.0069, lng: 72.6038 } }
    ]
  },
  {
    cityLabel: 'Bengaluru',
    aliases: ['bengaluru', 'bangalore', 'whitefield', 'indiranagar', 'electronic city'],
    locations: [
      { name: 'Kempegowda International Airport', shortLabel: 'Bengaluru Airport', subtitle: 'Airport terminal pickup', coords: { lat: 13.1986, lng: 77.7066 } },
      { name: 'KSR Bengaluru City Railway Station', shortLabel: 'Majestic Station', subtitle: 'Central railway station', coords: { lat: 12.9767, lng: 77.5713 } },
      { name: 'MG Road Bengaluru', shortLabel: 'MG Road', subtitle: 'Business and shopping district', coords: { lat: 12.9755, lng: 77.6067 } },
      { name: 'Electronic City Phase 1', shortLabel: 'Electronic City', subtitle: 'Tech park drop point', coords: { lat: 12.8399, lng: 77.677 } },
      { name: 'Whitefield Main Road', shortLabel: 'Whitefield', subtitle: 'Office and residential hub', coords: { lat: 12.9698, lng: 77.7499 } },
      { name: 'Indiranagar 100 Feet Road', shortLabel: 'Indiranagar', subtitle: 'Dining and nightlife district', coords: { lat: 12.9719, lng: 77.6412 } }
    ]
  },
  {
    cityLabel: 'Mumbai',
    aliases: ['mumbai', 'andheri', 'bandra', 'powai', 'borivali'],
    locations: [
      { name: 'Chhatrapati Shivaji Maharaj International Airport', shortLabel: 'Mumbai Airport', subtitle: 'Airport terminal pickup', coords: { lat: 19.0896, lng: 72.8656 } },
      { name: 'Bandra Kurla Complex', shortLabel: 'BKC', subtitle: 'Business district', coords: { lat: 19.0669, lng: 72.8697 } },
      { name: 'Dadar Railway Station', shortLabel: 'Dadar Station', subtitle: 'Central rail interchange', coords: { lat: 19.018, lng: 72.8422 } },
      { name: 'Gateway of India', shortLabel: 'Gateway', subtitle: 'Tourist landmark', coords: { lat: 18.922, lng: 72.8347 } },
      { name: 'Powai Hiranandani', shortLabel: 'Powai', subtitle: 'Residential and office hub', coords: { lat: 19.1176, lng: 72.906 } },
      { name: 'Borivali Railway Station', shortLabel: 'Borivali Station', subtitle: 'Western line hub', coords: { lat: 19.229, lng: 72.857 } }
    ]
  },
  {
    cityLabel: 'Delhi',
    aliases: ['delhi', 'new delhi', 'gurgaon', 'gurugram', 'noida', 'aerocity'],
    locations: [
      { name: 'Indira Gandhi International Airport', shortLabel: 'Delhi Airport', subtitle: 'Airport terminal pickup', coords: { lat: 28.5562, lng: 77.1 } },
      { name: 'New Delhi Railway Station', shortLabel: 'NDLS Station', subtitle: 'Major railway hub', coords: { lat: 28.6436, lng: 77.2192 } },
      { name: 'Connaught Place', shortLabel: 'Connaught Place', subtitle: 'City centre business district', coords: { lat: 28.6315, lng: 77.2167 } },
      { name: 'Cyber Hub Gurugram', shortLabel: 'Cyber Hub', subtitle: 'Corporate and dining district', coords: { lat: 28.495, lng: 77.0891 } },
      { name: 'Noida Sector 62', shortLabel: 'Noida Sector 62', subtitle: 'Office corridor', coords: { lat: 28.6285, lng: 77.3649 } },
      { name: 'Aerocity Delhi', shortLabel: 'Aerocity', subtitle: 'Airport hotel zone', coords: { lat: 28.5488, lng: 77.1218 } }
    ]
  },
  {
    cityLabel: 'Hyderabad',
    aliases: ['hyderabad', 'hitech city', 'gachibowli', 'secunderabad'],
    locations: [
      { name: 'Rajiv Gandhi International Airport', shortLabel: 'Hyderabad Airport', subtitle: 'Airport terminal pickup', coords: { lat: 17.2403, lng: 78.4294 } },
      { name: 'Secunderabad Junction', shortLabel: 'Secunderabad Station', subtitle: 'Railway station pickup', coords: { lat: 17.4399, lng: 78.4983 } },
      { name: 'HITEC City', shortLabel: 'HITEC City', subtitle: 'Technology hub', coords: { lat: 17.4435, lng: 78.3772 } },
      { name: 'Gachibowli Circle', shortLabel: 'Gachibowli', subtitle: 'Business district', coords: { lat: 17.4401, lng: 78.3489 } },
      { name: 'Charminar', shortLabel: 'Charminar', subtitle: 'Old city landmark', coords: { lat: 17.3616, lng: 78.4747 } },
      { name: 'Banjara Hills Road No. 12', shortLabel: 'Banjara Hills', subtitle: 'Hotel and dining district', coords: { lat: 17.4163, lng: 78.4345 } }
    ]
  },
  {
    cityLabel: 'Chennai',
    aliases: ['chennai', 'guindy', 'omr', 'tambaram', 'egmore'],
    locations: [
      { name: 'Chennai International Airport', shortLabel: 'Chennai Airport', subtitle: 'Airport terminal pickup', coords: { lat: 12.9941, lng: 80.1709 } },
      { name: 'Chennai Central Railway Station', shortLabel: 'Chennai Central', subtitle: 'Central railway station', coords: { lat: 13.0827, lng: 80.2757 } },
      { name: 'Tidel Park OMR', shortLabel: 'Tidel Park', subtitle: 'IT corridor pickup', coords: { lat: 12.9898, lng: 80.2472 } },
      { name: 'Guindy Industrial Estate', shortLabel: 'Guindy', subtitle: 'Business district', coords: { lat: 13.0067, lng: 80.2206 } },
      { name: 'Marina Beach', shortLabel: 'Marina Beach', subtitle: 'Tourist landmark', coords: { lat: 13.0505, lng: 80.2824 } },
      { name: 'Tambaram Railway Station', shortLabel: 'Tambaram Station', subtitle: 'Suburban rail hub', coords: { lat: 12.9249, lng: 80.1275 } }
    ]
  }
];

const GENERIC_LOCATION_TEMPLATES = [
  { name: 'Airport Terminal', shortLabel: 'Airport Terminal', subtitle: 'Terminal pickup and drop zone', latOffset: 0.07, lngOffset: 0.05 },
  { name: 'Main Railway Station', shortLabel: 'Railway Station', subtitle: 'Common station transfer point', latOffset: -0.03, lngOffset: 0.02 },
  { name: 'City Centre', shortLabel: 'City Centre', subtitle: 'Central commercial area', latOffset: 0, lngOffset: 0 },
  { name: 'Business District', shortLabel: 'Business District', subtitle: 'Office and hotel cluster', latOffset: 0.02, lngOffset: -0.04 },
  { name: 'Bus Terminal', shortLabel: 'Bus Terminal', subtitle: 'Intercity and local coach stop', latOffset: -0.05, lngOffset: -0.03 },
  { name: 'Hospital Zone', shortLabel: 'Hospital Zone', subtitle: 'Emergency and medical travel point', latOffset: 0.04, lngOffset: 0.01 }
];

const calculateDistance = (coord1, coord2) => {
  const earthRadius = 6371;
  const dLat = ((coord2.lat - coord1.lat) * Math.PI) / 180;
  const dLng = ((coord2.lng - coord1.lng) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((coord1.lat * Math.PI) / 180) * Math.cos((coord2.lat * Math.PI) / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return earthRadius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const getMatchedCityCatalog = (pickupInput, dropInput) => {
  const searchText = `${pickupInput} ${dropInput}`.toLowerCase();
  return CITY_CATALOGS.find((c) => c.aliases.some((a) => searchText.includes(a))) || null;
};

const buildSuggestions = ({ pickupInput, dropInput, pickupCoords, dropCoords }) => {
  const matched = getMatchedCityCatalog(pickupInput, dropInput);
  if (matched) return matched.locations;
  const center = pickupCoords || dropCoords || DEFAULT_CITY_CENTER;
  return GENERIC_LOCATION_TEMPLATES.map((item) => ({
    ...item,
    coords: { lat: center.lat + item.latOffset, lng: center.lng + item.lngOffset }
  }));
};

const reverseGeocode = async (coords) => {
  const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${coords.lat}&lon=${coords.lng}`;
  const response = await fetch(url, {
    headers: {
      Accept: 'application/json',
      'Accept-Language': 'en-IN'
    }
  });

  if (!response.ok) {
    throw new Error('Unable to fetch the current address.');
  }

  const result = await response.json();
  return result?.display_name || '';
};

const LocationSelector = ({
  pickupLocation,
  dropLocation,
  pickupCoords,
  dropCoords,
  pickupDateTime,
  onPickupDateTimeChange,
  activeLocationField,
  setActiveLocationField,
  onLocationSelect,
  onRouteCalculated,
  setIsLoading
}) => {
  const [pickupInput, setPickupInput] = useState(pickupLocation);
  const [dropInput, setDropInput] = useState(dropLocation);
  const [locationErrors, setLocationErrors] = useState({ pickup: '', drop: '' });
  const [pickupSuggestions, setPickupSuggestions] = useState([]);
  const [dropSuggestions, setDropSuggestions] = useState([]);
  const [showPickup, setShowPickup] = useState(false);
  const [showDrop, setShowDrop] = useState(false);
  const [isGettingLocation, setIsGettingLocation] = useState(false);

  const pickupRef = useRef(null);
  const dropRef = useRef(null);

  const allLocations = useMemo(
    () => buildSuggestions({ pickupInput, dropInput, pickupCoords, dropCoords }),
    [pickupInput, dropInput, pickupCoords, dropCoords]
  );

  const filterSuggestions = useCallback((input) => {
    const q = input.trim().toLowerCase();
    if (!q) return allLocations.slice(0, 6);
    return allLocations.filter(({ name, shortLabel, subtitle }) =>
      [name, shortLabel, subtitle].some((value) => value.toLowerCase().includes(q))
    );
  }, [allLocations]);

  const calculateRoute = useCallback(() => {
    if (!pickupCoords || !dropCoords) {
      setIsLoading(false);
      onRouteCalculated(null);
      return undefined;
    }

    setIsLoading(true);
    const timer = setTimeout(() => {
      const dist = calculateDistance(pickupCoords, dropCoords);
      const dur = estimateCabDuration(dist, pickupDateTime);
      const traffic = getTrafficInfo(pickupDateTime);
      onRouteCalculated({
        distance: dist,
        duration: dur,
        trafficLabel: traffic.label,
        roadNote: traffic.roadNote
      });
    }, 700);

    return () => clearTimeout(timer);
  }, [pickupCoords, dropCoords, pickupDateTime, onRouteCalculated, setIsLoading]);

  useEffect(() => {
    const cleanup = calculateRoute();
    return () => {
      if (typeof cleanup === 'function') cleanup();
    };
  }, [calculateRoute]);

  useEffect(() => {
    setPickupInput(pickupLocation);
    setLocationErrors((prev) => ({ ...prev, pickup: '' }));
  }, [pickupLocation]);

  useEffect(() => {
    setDropInput(dropLocation);
    setLocationErrors((prev) => ({ ...prev, drop: '' }));
  }, [dropLocation]);

  useEffect(() => {
    const handler = (event) => {
      if (pickupRef.current && !pickupRef.current.contains(event.target)) setShowPickup(false);
      if (dropRef.current && !dropRef.current.contains(event.target)) setShowDrop(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSuggestionSelect = useCallback((type, suggestion) => {
    if (type === 'pickup') {
      setPickupInput(suggestion.name);
      setShowPickup(false);
    } else {
      setDropInput(suggestion.name);
      setShowDrop(false);
    }
    onLocationSelect(type, suggestion.name, suggestion.coords);
    setActiveLocationField(type);
    setLocationErrors((prev) => ({ ...prev, [type]: '' }));
  }, [onLocationSelect, setActiveLocationField]);

  const handleSwap = () => {
    setPickupInput(dropLocation || '');
    setDropInput(pickupLocation || '');
    onLocationSelect('pickup', dropLocation || '', dropCoords || null);
    onLocationSelect('drop', pickupLocation || '', pickupCoords || null);
    setLocationErrors({ pickup: '', drop: '' });
  };

  const handleCurrentLocation = () => {
    setIsGettingLocation(true);
    setActiveLocationField('pickup');
    if (!navigator.geolocation) {
      setLocationErrors((prev) => ({
        ...prev,
        pickup: 'Live location is not supported in this browser.'
      }));
      setIsGettingLocation(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        const currentCoords = { lat: coords.latitude, lng: coords.longitude };
        const coordinateLabel = `Current location (${currentCoords.lat.toFixed(4)}, ${currentCoords.lng.toFixed(4)})`;

        try {
          const resolvedAddress = await reverseGeocode(currentCoords);
          const label = resolvedAddress || coordinateLabel;
          setPickupInput(label);
          onLocationSelect('pickup', label, currentCoords);
        } catch (error) {
          setPickupInput(coordinateLabel);
          onLocationSelect('pickup', coordinateLabel, currentCoords);
        } finally {
          setLocationErrors((prev) => ({ ...prev, pickup: '' }));
          setIsGettingLocation(false);
        }
      },
      (error) => {
        let message = 'Unable to fetch your live location.';

        if (error.code === error.PERMISSION_DENIED) {
          message = 'Please allow location access in your browser to use live location.';
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          message = 'Your current location is unavailable right now.';
        } else if (error.code === error.TIMEOUT) {
          message = 'Location request timed out. Please try again.';
        }

        setLocationErrors((prev) => ({ ...prev, pickup: message }));
        setIsGettingLocation(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  };

  const handleInputChange = (type, value) => {
    const setInput = type === 'pickup' ? setPickupInput : setDropInput;
    const setSuggestions = type === 'pickup' ? setPickupSuggestions : setDropSuggestions;
    const setDropdown = type === 'pickup' ? setShowPickup : setShowDrop;

    setInput(value);
    setSuggestions(filterSuggestions(value));
    setDropdown(true);
    setActiveLocationField(type);
    setLocationErrors((prev) => ({ ...prev, [type]: '' }));
  };

  const handleInputBlur = (type) => {
    const inputValue = type === 'pickup' ? pickupInput : dropInput;
    const confirmedValue = type === 'pickup' ? pickupLocation : dropLocation;
    const setInput = type === 'pickup' ? setPickupInput : setDropInput;

    if (!inputValue.trim()) {
      setInput(confirmedValue || '');
      return;
    }

    if (inputValue.trim() !== (confirmedValue || '').trim()) {
      setInput(confirmedValue || '');
      setLocationErrors((prev) => ({
        ...prev,
        [type]: 'Please choose a location from suggestions or map.'
      }));
    }
  };

  const handleInputKeyDown = (type, event, suggestions) => {
    if (event.key === 'Enter' && suggestions.length > 0) {
      event.preventDefault();
      handleSuggestionSelect(type, suggestions[0]);
    }
  };

  return (
    <TravelSearchShell
      className="cab-search-shell"
      columns="minmax(0, 1.15fr) 40px minmax(0, 1.15fr) minmax(210px, 0.86fr) 176px"
    >
      <TravelSearchField
        fieldRef={pickupRef}
        label="From"
        className={`cab-search-input-group ${locationErrors.pickup ? 'has-error' : ''}`}
        icon={
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
            <circle cx="12" cy="10" r="3"></circle>
          </svg>
        }
      >
        <input
          type="text"
          placeholder="Pickup location"
          value={pickupInput}
          onChange={(event) => handleInputChange('pickup', event.target.value)}
          onBlur={() => setTimeout(() => handleInputBlur('pickup'), 120)}
          onFocus={() => {
            setPickupSuggestions(filterSuggestions(pickupInput));
            setShowPickup(true);
            setActiveLocationField('pickup');
          }}
          onKeyDown={(event) => handleInputKeyDown('pickup', event, pickupSuggestions)}
        />
        {locationErrors.pickup && <p className="cab-input-error">{locationErrors.pickup}</p>}
        {showPickup && pickupSuggestions.length > 0 && (
          <div className="cab-suggestions-dropdown">
            {pickupSuggestions.map((suggestion) => (
              <button
                key={suggestion.name}
                type="button"
                className="cab-suggestion-item"
                onMouseDown={(event) => {
                  event.preventDefault();
                  handleSuggestionSelect('pickup', suggestion);
                }}
              >
                <span className="sug-title">{suggestion.shortLabel}</span>
                <span className="sug-sub">{suggestion.subtitle}</span>
              </button>
            ))}
          </div>
        )}
      </TravelSearchField>

      <TravelSearchSwapButton className="cab-swap-btn" onClick={handleSwap} title="Swap route">
        Swap
      </TravelSearchSwapButton>

      <TravelSearchField
        fieldRef={dropRef}
        label="To"
        className={`cab-search-input-group ${locationErrors.drop ? 'has-error' : ''}`}
        icon={
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
            <circle cx="12" cy="10" r="3"></circle>
          </svg>
        }
      >
        <input
          type="text"
          placeholder="Drop location"
          value={dropInput}
          onChange={(event) => handleInputChange('drop', event.target.value)}
          onBlur={() => setTimeout(() => handleInputBlur('drop'), 120)}
          onFocus={() => {
            setDropSuggestions(filterSuggestions(dropInput));
            setShowDrop(true);
            setActiveLocationField('drop');
          }}
          onKeyDown={(event) => handleInputKeyDown('drop', event, dropSuggestions)}
        />
        {locationErrors.drop && <p className="cab-input-error">{locationErrors.drop}</p>}
        {showDrop && dropSuggestions.length > 0 && (
          <div className="cab-suggestions-dropdown">
            {dropSuggestions.map((suggestion) => (
              <button
                key={suggestion.name}
                type="button"
                className="cab-suggestion-item"
                onMouseDown={(event) => {
                  event.preventDefault();
                  handleSuggestionSelect('drop', suggestion);
                }}
              >
                <span className="sug-title">{suggestion.shortLabel}</span>
                <span className="sug-sub">{suggestion.subtitle}</span>
              </button>
            ))}
          </div>
        )}
      </TravelSearchField>

      <TravelSearchField
        label="Pickup date and time"
        className="cab-search-input-group cab-date-group"
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
          type="datetime-local"
          value={pickupDateTime}
          min={getDateTimeLocalShortcut(0)}
          onChange={(event) => onPickupDateTimeChange(event.target.value)}
        />
      </TravelSearchField>

      <TravelSearchButton className="cab-location-btn" onClick={handleCurrentLocation} disabled={isGettingLocation} type="button">
        {isGettingLocation ? 'Locating...' : 'Use My Location'}
      </TravelSearchButton>
    </TravelSearchShell>
  );
};

export default LocationSelector;
