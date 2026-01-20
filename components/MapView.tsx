
import React, { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { UserLocation } from '../types';

// Fix for default marker icons in Leaflet + React
// @ts-ignore
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface MapViewProps {
  location: UserLocation;
  onLocationChange?: (lat: number, lng: number) => void;
}

// Helper to center map when props change
const RecenterMap: React.FC<{ lat: number; lng: number }> = ({ lat, lng }) => {
  const map = useMap();
  useEffect(() => {
    map.setView([lat, lng], 14, { animate: true });
  }, [lat, lng, map]);
  return null;
};

const MapView: React.FC<MapViewProps> = ({ location, onLocationChange }) => {
  const markerRef = useRef<L.Marker>(null);

  const eventHandlers = React.useMemo(
    () => ({
      dragend() {
        const marker = markerRef.current;
        if (marker != null && onLocationChange) {
          const { lat, lng } = marker.getLatLng();
          onLocationChange(lat, lng);
        }
      },
    }),
    [onLocationChange]
  );

  return (
    <div className="w-full h-full relative border-l border-gray-200">
      <MapContainer
        center={[location.lat, location.lng]}
        zoom={13}
        scrollWheelZoom={true}
        className="h-full w-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Marker
          position={[location.lat, location.lng]}
          draggable={true}
          eventHandlers={eventHandlers}
          ref={markerRef}
        >
          <Popup>
            <div className="text-sm font-medium">Your Focus Location</div>
            <div className="text-xs text-gray-500">I'll search around here.</div>
          </Popup>
        </Marker>
        <RecenterMap lat={location.lat} lng={location.lng} />
      </MapContainer>
      
      {/* Overlay controls */}
      <div className="absolute top-4 right-4 z-[1000] flex flex-col gap-2">
        <div className="bg-white p-3 rounded-lg shadow-md border border-gray-100 max-w-xs">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Active Context</h3>
          <p className="text-sm font-mono text-gray-700 truncate">
            {location.lat.toFixed(5)}, {location.lng.toFixed(5)}
          </p>
          <p className="text-[10px] text-gray-400 mt-1 italic">
            Drag the pin to change search area
          </p>
        </div>
      </div>
    </div>
  );
};

export default MapView;
