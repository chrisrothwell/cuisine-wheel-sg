/// <reference types="@types/google.maps" />
/**
 * Google Maps integration using @react-google-maps/api
 *
 * USAGE FROM PARENT COMPONENT:
 * ======
 *
 * const mapRef = useRef<google.maps.Map | null>(null);
 *
 * <MapView
 *   initialCenter={{ lat: 40.7128, lng: -74.0060 }}
 *   initialZoom={15}
 *   onMapReady={(map) => {
 *     mapRef.current = map;
 *   }}
 * />
 *
 * ======
 * Libraries loaded: marker, places, geometry
 */

import { useCallback } from "react";
import { GoogleMap, useJsApiLoader } from "@react-google-maps/api";
import { cn } from "@/lib/utils";

const API_KEY = import.meta.env.VITE_FRONTEND_GOOGLEMAPS_API_KEY;

const LIBRARIES: ("marker" | "places" | "geometry")[] = [
  "marker",
  "places",
  "geometry",
];

const defaultCenter = { lat: 37.7749, lng: -122.4194 };
const defaultZoom = 12;

interface MapViewProps {
  className?: string;
  initialCenter?: google.maps.LatLngLiteral;
  initialZoom?: number;
  onMapReady?: (map: google.maps.Map) => void;
}

export function MapView({
  className,
  initialCenter = defaultCenter,
  initialZoom = defaultZoom,
  onMapReady,
}: MapViewProps) {
  const { isLoaded, loadError } = useJsApiLoader({
    id: "google-map-script",
    googleMapsApiKey: API_KEY ?? "",
    version: "weekly",
    libraries: LIBRARIES,
  });

  const onLoad = useCallback(
    (map: google.maps.Map) => {
      onMapReady?.(map);
    },
    [onMapReady]
  );

  const onUnmount = useCallback(() => {
    // Cleanup if needed
  }, []);

  if (loadError) {
    return (
      <div
        className={cn(
          "flex items-center justify-center bg-muted/20 rounded-lg border border-destructive/50",
          className
        )}
      >
        <p className="text-destructive text-sm">
          Failed to load Google Maps. Check your API key configuration.
        </p>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div
        className={cn(
          "flex items-center justify-center bg-muted/20 rounded-lg animate-pulse",
          className
        )}
      >
        <span className="text-muted-foreground text-sm">Loading map...</span>
      </div>
    );
  }

  return (
    <div className={cn("w-full h-[500px] overflow-hidden rounded-lg", className)}>
      <GoogleMap
        mapContainerStyle={{ width: "100%", height: "100%" }}
        center={initialCenter}
        zoom={initialZoom}
        onLoad={onLoad}
        onUnmount={onUnmount}
        options={{
          mapTypeControl: true,
          fullscreenControl: true,
          zoomControl: true,
          streetViewControl: true,
          mapId: "DEMO_MAP_ID",
        }}
      />
    </div>
  );
}
