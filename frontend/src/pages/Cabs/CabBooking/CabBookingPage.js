import React, { Suspense, useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import './CabBookingPage.css';
import { API_BASE_URL } from '../../../utils/api';
import { getDateTimeLocalShortcut } from '../../../utils/dateShortcuts';
import {
  normalizeCabType,
  getCabPricingBreakdown
} from '../../../utils/cabBooking';
import { lazyWithRetry } from '../../../utils/lazyWithRetry';
import { buildAuthRedirect } from '../../../utils/authRedirect';
import { useToast } from '../../../contexts/ToastContext';

const LocationSelector = lazyWithRetry(
  () => import('../Cab/components/LocationSelector'),
  'mmt:lazy-cab-location-selector'
);
const MapView = lazyWithRetry(
  () => import('../Cab/components/MapView'),
  'mmt:lazy-cab-map-view'
);
const CabOptions = lazyWithRetry(
  () => import('../Cab/components/CabOptions'),
  'mmt:lazy-cab-options'
);

const CabModuleLoader = ({ message }) => (
  <div className="cab-empty-state">
    <span className="empty-icon">CAB</span>
    <h3>Loading cab tools</h3>
    <p>{message}</p>
  </div>
);

const CabBookingPage = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { showToast } = useToast();

  const [pickupLocation, setPickupLocation] = useState('');
  const [dropLocation, setDropLocation] = useState('');
  const [pickupCoords, setPickupCoords] = useState(null);
  const [dropCoords, setDropCoords] = useState(null);
  const [activeLocationField, setActiveLocationField] = useState('pickup');

  const [distance, setDistance] = useState(0);
  const [travelTime, setTravelTime] = useState(0);
  const [route, setRoute] = useState(null);

  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingCabTypes, setIsFetchingCabTypes] = useState(true);
  const [cabTypesError, setCabTypesError] = useState('');
  const [pickupDateTime, setPickupDateTime] = useState(getDateTimeLocalShortcut(0));
  const [cabTypes, setCabTypes] = useState([]);

  useEffect(() => {
    const fetchCabTypes = async () => {
      setIsFetchingCabTypes(true);
      setCabTypesError('');
      try {
        const response = await fetch(`${API_BASE_URL}/cabs/types`);
        if (!response.ok) throw new Error('Cab categories could not be loaded.');
        const data = await response.json();
        if (!data.success) throw new Error(data.message || 'Cab categories could not be loaded.');
        setCabTypes(data.data.map(normalizeCabType));
      } catch (error) {
        console.error('Error fetching cab types:', error);
        setCabTypes([]);
        setCabTypesError(error.message || 'Unable to load cab categories right now.');
      } finally {
        setIsFetchingCabTypes(false);
      }
    };
    fetchCabTypes();
  }, []);

  useEffect(() => {
    if (pickupCoords && dropCoords) return;
    setDistance(0);
    setTravelTime(0);
    setRoute(null);
    setIsLoading(false);
  }, [pickupCoords, dropCoords]);

  const handleLocationSelect = useCallback((type, location, coords) => {
    setActiveLocationField(type);
    if (type === 'pickup') {
      setPickupLocation(location);
      setPickupCoords(coords);
    } else {
      setDropLocation(location);
      setDropCoords(coords);
    }
  }, []);

  const handleRouteCalculated = useCallback((routeData) => {
    if (!routeData) {
      setDistance(0);
      setTravelTime(0);
      setRoute(null);
      setIsLoading(false);
      return;
    }
    setDistance(routeData.distance);
    setTravelTime(routeData.duration);
    setRoute(routeData);
    setIsLoading(false);
  }, []);

  const handleCabSelect = useCallback((cab) => {
    if (!cab.available) return;
    if (!pickupLocation || !dropLocation || distance <= 0) {
      showToast({
        type: 'warning',
        title: 'Route details required',
        message: 'Please select pickup and drop locations before booking a cab.'
      });
      return;
    }

    const pricing = getCabPricingBreakdown(cab, distance);
    const bookingState = {
      cab,
      selectedCab: cab,
      cabId: cab.id,
      pickupLocation,
      dropLocation,
      pickupCoords,
      dropCoords,
      distance,
      duration: travelTime,
      pickupDateTime,
      basePrice: pricing.rideFare,
      totalFare: pricing.total,
      fareBreakdown: pricing,
      price: pricing.total
    };

    if (!isAuthenticated) {
      const authRedirect = buildAuthRedirect('/book/cabs', bookingState);
      navigate('/login', { state: { authRedirect } });
      return;
    }

    navigate('/book/cabs', { state: bookingState });
  }, [
    navigate,
    isAuthenticated,
    pickupLocation,
    dropLocation,
    pickupCoords,
    dropCoords,
    distance,
    travelTime,
    pickupDateTime,
    showToast
  ]);

  const canShowCabResults = distance > 0 && pickupLocation && dropLocation;

  const sortedCabTypes = useMemo(() => {
    const items = [...cabTypes];
    const getTotal = (cab) => getCabPricingBreakdown(cab, distance).total;

    items.sort((a, b) => getTotal(a) - getTotal(b));

    return items;
  }, [cabTypes, distance]);

  return (
    <div className="cab-page-v2">
      <Suspense fallback={<CabModuleLoader message="Preparing route search for your pickup and drop details." />}>
        <LocationSelector
          pickupLocation={pickupLocation}
          dropLocation={dropLocation}
          pickupCoords={pickupCoords}
          dropCoords={dropCoords}
          pickupDateTime={pickupDateTime}
          onPickupDateTimeChange={setPickupDateTime}
          activeLocationField={activeLocationField}
          setActiveLocationField={setActiveLocationField}
          onLocationSelect={handleLocationSelect}
          onRouteCalculated={handleRouteCalculated}
          setIsLoading={setIsLoading}
        />
      </Suspense>

      <div className="cab-results-area">
        <div className="cab-main-layout">
          <aside className="cab-map-sidebar">
            <Suspense fallback={<CabModuleLoader message="Loading the interactive route map." />}>
              <MapView
                pickupCoords={pickupCoords}
                dropCoords={dropCoords}
                route={route}
                isLoading={isLoading}
                onLocationSelect={handleLocationSelect}
                activeLocationField={activeLocationField}
              />
            </Suspense>
          </aside>

          <main className="cab-results-main">
            {!canShowCabResults ? (
              <div className="cab-empty-state">
                <span className="empty-icon">CAB</span>
                <h3>Select your journey details</h3>
                <p>Choose your pickup and drop locations above to view available cabs with live pricing.</p>
              </div>
            ) : (
              <Suspense fallback={<CabModuleLoader message="Loading live cab categories for your route." />}>
                <CabOptions
                  cabTypes={sortedCabTypes}
                  onCabSelect={handleCabSelect}
                  distance={distance}
                  hasRouteDetails={canShowCabResults}
                  isLoading={isFetchingCabTypes}
                  errorMessage={cabTypesError}
                />
              </Suspense>
            )}
          </main>
        </div>
      </div>
    </div>
  );
};

export default CabBookingPage;
