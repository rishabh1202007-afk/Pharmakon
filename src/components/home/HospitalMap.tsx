"use client";

import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";

// Fix for default marker icon in leaflet
const icon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// Component to handle map flyTo animation when active hospital changes
function MapController({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo(center, 14, {
      duration: 1.5,
    });
  }, [center, map]);
  return null;
}

interface HospitalMapProps {
  center: [number, number];
  hospitals: Array<{
    id: number;
    name: string;
    location: string;
    lat: number;
    lng: number;
  }>;
  activeId: number;
}

export default function HospitalMap({ center, hospitals, activeId }: HospitalMapProps) {
  return (
    <div className="w-full h-full relative z-0">
      <MapContainer
        center={center}
        zoom={14}
        scrollWheelZoom={false}
        className="w-full h-full rounded-3xl"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {hospitals.map((hospital) => (
          <Marker
            key={hospital.id}
            position={[hospital.lat, hospital.lng]}
            icon={icon}
          >
            <Popup>
              <div className="font-semibold text-primary-950">{hospital.name}</div>
              <div className="text-sm text-slate-500">{hospital.location}</div>
            </Popup>
          </Marker>
        ))}
        <MapController center={center} />
      </MapContainer>
    </div>
  );
}
