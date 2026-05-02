import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap, useMapEvents } from 'react-leaflet';
import { Icon, divIcon } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './MapView.css';
import { formatCabDuration } from '../../../../utils/cabBooking';

const INDIA_CENTER = [20.5937, 78.9629];

delete Icon.Default.prototype._getIconUrl;
Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png')
});

const formatPinnedLocationLabel = (type, coords) => {
  const label = type === 'pickup' ? 'Pickup' : 'Drop';
  return `${label} pin (${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)})`;
};

const MapEvents = ({ onLocationSelect, pickupCoords, dropCoords, activeLocationField }) => {
  useMapEvents({
    click: (event) => {
      const coords = {
        lat: event.latlng.lat,
        lng: event.latlng.lng
      };

      if (!pickupCoords) {
        onLocationSelect('pickup', formatPinnedLocationLabel('pickup', coords), coords);
        return;
      }

      if (!dropCoords) {
        onLocationSelect('drop', formatPinnedLocationLabel('drop', coords), coords);
        return;
      }

      onLocationSelect(activeLocationField || 'drop', formatPinnedLocationLabel(activeLocationField || 'drop', coords), coords);
    }
  });

  return null;
};

const DraggableMarker = ({ position, icon, onDragEnd, type }) => {
  const markerRef = useRef(null);

  const eventHandlers = {
    dragend() {
      const marker = markerRef.current;
      if (marker) {
        const newPosition = marker.getLatLng();
        const coords = { lat: newPosition.lat, lng: newPosition.lng };
        onDragEnd(type, formatPinnedLocationLabel(type, coords), coords);
      }
    }
  };

  return (
    <Marker draggable position={position} ref={markerRef} icon={icon} eventHandlers={eventHandlers}>
      <Popup>
        {type === 'pickup' ? 'Pickup location' : 'Drop location'}<br />
        Drag marker to fine-tune the stop.
      </Popup>
    </Marker>
  );
};

const MapUpdater = ({ pickupCoords, dropCoords }) => {
  const map = useMap();

  useEffect(() => {
    // Fix leaflet grey tile issue on modal/container resize.
    setTimeout(() => {
      map.invalidateSize();
    }, 200);
  }, [map]);

  useEffect(() => {
    if (pickupCoords && dropCoords) {
      const bounds = [
        [pickupCoords.lat, pickupCoords.lng],
        [dropCoords.lat, dropCoords.lng]
      ];
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
    } else if (pickupCoords) {
      map.setView([pickupCoords.lat, pickupCoords.lng], 14, { animate: true });
    } else if (dropCoords) {
      map.setView([dropCoords.lat, dropCoords.lng], 14, { animate: true });
    } else {
      map.setView(INDIA_CENTER, 5, { animate: true });
    }
  }, [pickupCoords, dropCoords, map]);

  return null;
};

const createCustomIcon = (letter, color) =>
  divIcon({
    html: `
      <div style="
        background:${color};
        color:white;
        border-radius:999px;
        width:34px;
        height:34px;
        display:flex;
        align-items:center;
        justify-content:center;
        font-weight:700;
        border:3px solid white;
        box-shadow:0 8px 20px rgba(15,23,42,0.25);
      ">${letter}</div>
    `,
    className: 'custom-marker',
    iconSize: [34, 34],
    iconAnchor: [17, 17]
  });

const MapView = ({ pickupCoords, dropCoords, route, isLoading, onLocationSelect, activeLocationField }) => {
  const [mapLoaded, setMapLoaded] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setMapLoaded(true), 100);
    return () => clearTimeout(timer);
  }, []);

  const handleMarkerDragEnd = (type, fallbackAddress, coords) => {
    onLocationSelect(type, fallbackAddress, coords);
  };

  const mapCenter = INDIA_CENTER;
  const initialZoom = 5;
  const pickupIcon = createCustomIcon('P', '#0ea5a4');
  const dropIcon = createCustomIcon('D', '#ef4444');

  return (
    <div className="map-view">
      <div className="map-header">
        <div>
          <h3>Live route planner</h3>
          <p>
            Click the map to pin {activeLocationField === 'pickup' ? 'pickup' : 'drop'} or drag an
            existing marker to correct the route.
          </p>
        </div>

        <div className="map-legend">
          <div className="legend-item">
            <div className="legend-marker pickup-marker" />
            <span>Pickup</span>
          </div>
          <div className="legend-item">
            <div className="legend-marker drop-marker" />
            <span>Drop</span>
          </div>
        </div>
      </div>

      <div className="map-container">
        {mapLoaded ? (
          <MapContainer
            center={mapCenter}
            zoom={initialZoom}
            style={{ width: '100%', height: '100%' }}
            className="leaflet-map"
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution="&copy; OpenStreetMap contributors"
              maxZoom={19}
            />

            <MapUpdater pickupCoords={pickupCoords} dropCoords={dropCoords} />

            <MapEvents
              onLocationSelect={onLocationSelect}
              pickupCoords={pickupCoords}
              dropCoords={dropCoords}
              activeLocationField={activeLocationField}
            />

            {pickupCoords && pickupCoords.lat && pickupCoords.lng && (
              <DraggableMarker
                position={[pickupCoords.lat, pickupCoords.lng]}
                icon={pickupIcon}
                onDragEnd={handleMarkerDragEnd}
                type="pickup"
              />
            )}

            {dropCoords && dropCoords.lat && dropCoords.lng && (
              <DraggableMarker
                position={[dropCoords.lat, dropCoords.lng]}
                icon={dropIcon}
                onDragEnd={handleMarkerDragEnd}
                type="drop"
              />
            )}

            {pickupCoords && dropCoords && pickupCoords.lat && dropCoords.lat && (
              <Polyline
                positions={[
                  [pickupCoords.lat, pickupCoords.lng],
                  [dropCoords.lat, dropCoords.lng]
                ]}
                color="#0ea5a4"
                weight={5}
                opacity={0.85}
                dashArray="10, 10"
              />
            )}
          </MapContainer>
        ) : (
          <div className="map-loading">
            <div className="map-loading-spinner" />
            <p>Loading map...</p>
          </div>
        )}

        {!pickupCoords && !dropCoords && (
          <div className="map-empty-hint">
            <strong>Pin your route on the map</strong>
            <span>Choose pickup first, then drop, or use the search fields on the left.</span>
          </div>
        )}

        {isLoading && (
          <div className="map-overlay">
            <div className="route-calculating">
              <div className="calculating-spinner" />
              <p>Calculating the best route...</p>
            </div>
          </div>
        )}
      </div>

      {route ? (
        <div className="route-info-map">
          <div className="route-stats">
            <div className="stat-item">
              <span className="stat-label">Distance</span>
              <span className="stat-value">{Number(route.distance).toFixed(1)} km</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Estimated time</span>
              <span className="stat-value">{formatCabDuration(route.duration)}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Traffic</span>
              <span className="stat-value">{route.trafficLabel}</span>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default MapView;
