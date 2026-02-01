import { useState, useCallback, useEffect, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { MapView } from "@/components/Map";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, MapPin, Navigation } from "lucide-react";
import { toast } from "sonner";
import { useCountries } from "@/hooks/useCountries";

export default function MapPage() {
  const [selectedCountryId, setSelectedCountryId] = useState<string>("all");
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.marker.AdvancedMarkerElement[]>([]);
  const [selectedRestaurant, setSelectedRestaurant] = useState<any>(null);

  const { data: countries } = useCountries();
  const { data: allRestaurants, isLoading } = trpc.restaurants.list.useQuery();

  // Filter restaurants
  const filteredRestaurants = allRestaurants?.filter((restaurant) => {
    const matchesCountry = selectedCountryId === "all" || restaurant.countryId === Number(selectedCountryId);
    const hasLocation = restaurant.latitude && restaurant.longitude;
    return matchesCountry && hasLocation;
  });

  const getCountryName = (countryId: number) => {
    return countries?.find(c => c.id === countryId)?.cuisineType || "Unknown";
  };

  const getCountryFlag = (countryId: number) => {
    return countries?.find(c => c.id === countryId)?.flagEmoji || "🏳️";
  };

  const handleMapReady = useCallback((googleMap: google.maps.Map) => {
    setMap(googleMap);
    
    // Set initial center to Singapore
    googleMap.setCenter({ lat: 1.3521, lng: 103.8198 });
    googleMap.setZoom(12);
  }, []);

  // Update markers when filtered restaurants change
  useEffect(() => {
    if (!map || !filteredRestaurants || !countries) return;

    // Create a custom marker content with flag emoji for AdvancedMarkerElement
    const createFlagMarkerContent = (flagEmoji: string) => {
      const div = document.createElement("div");
      div.style.width = "40px";
      div.style.height = "50px";
      div.style.display = "flex";
      div.style.alignItems = "center";
      div.style.justifyContent = "center";
      div.style.backgroundImage = `url("data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
        <svg xmlns="http://www.w3.org/2000/svg" width="40" height="50" viewBox="0 0 40 50">
          <path d="M20 0 C12 0 6 6 6 14 C6 22 20 50 20 50 C20 50 34 22 34 14 C34 6 28 0 20 0 Z" 
                fill="#ffffff" stroke="#333" stroke-width="2"/>
        </svg>
      `)}")`;
      div.style.backgroundSize = "contain";
      div.style.backgroundRepeat = "no-repeat";
      div.style.backgroundPosition = "center";
      div.style.fontSize = "20px";
      div.style.lineHeight = "1";
      div.style.cursor = "pointer";
      div.textContent = flagEmoji;
      return div;
    };

    // Clear existing markers
    markersRef.current.forEach(marker => {
      marker.map = null;
    });
    markersRef.current = [];

    const newMarkers: google.maps.marker.AdvancedMarkerElement[] = [];
    const bounds = new google.maps.LatLngBounds();

    filteredRestaurants.forEach((restaurant) => {
      if (!restaurant.latitude || !restaurant.longitude) return;

      const position = {
        lat: restaurant.latitude,
        lng: restaurant.longitude,
      };

      // Get flag emoji for this restaurant's country
      const flagEmoji = getCountryFlag(restaurant.countryId);
      const markerContent = createFlagMarkerContent(flagEmoji);

      const marker = new google.maps.marker.AdvancedMarkerElement({
        map,
        position,
        title: restaurant.name,
        content: markerContent,
      });

      marker.addListener("click", () => {
        setSelectedRestaurant(restaurant);
        map.panTo(position);
      });

      newMarkers.push(marker);
      bounds.extend(position);
    });

    markersRef.current = newMarkers;

    // Fit map to show all markers
    if (newMarkers.length > 0) {
      map.fitBounds(bounds);
      // Prevent over-zooming for single marker
      const listener = google.maps.event.addListener(map, "idle", () => {
        if (map.getZoom()! > 15) map.setZoom(15);
        google.maps.event.removeListener(listener);
      });
    }

    // Cleanup function
    return () => {
      markersRef.current.forEach(marker => {
        marker.map = null;
      });
      markersRef.current = [];
    };
  }, [map, filteredRestaurants, countries]);

  const handleGetDirections = (restaurant: any) => {
    if (!restaurant.latitude || !restaurant.longitude) {
      toast.error("Location not available");
      return;
    }
    const url = `https://www.google.com/maps/dir/?api=1&destination=${restaurant.latitude},${restaurant.longitude}`;
    window.open(url, "_blank");
  };

  if (isLoading) {
    return (
      <div className="container py-16 flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container py-8">
      <div className="hud-frame p-8 bg-card border border-border mb-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-4xl font-bold neon-pink mb-2">Restaurant Map</h1>
            <p className="text-muted-foreground">
              Explore restaurants on an interactive map
            </p>
          </div>
          <Select value={selectedCountryId} onValueChange={setSelectedCountryId}>
            <SelectTrigger className="w-full md:w-[200px] bg-background">
              <SelectValue placeholder="All Cuisines" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Cuisines</SelectItem>
              {countries?.map((country) => (
                <SelectItem key={country.id} value={country.id.toString()}>
                  {country.flagEmoji} {country.cuisineType}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Map */}
          <div className="lg:col-span-2">
            <div className="border-2 border-primary rounded-lg overflow-hidden neon-border-pink" style={{ height: "600px" }}>
              <MapView
                onMapReady={handleMapReady}
                className="w-full h-full"
              />
            </div>
            <p className="text-xs text-muted-foreground mt-2 text-center">
              Showing {filteredRestaurants?.length || 0} restaurants
            </p>
          </div>

          {/* Restaurant list */}
          <div className="space-y-4 max-h-[600px] overflow-y-auto">
            {filteredRestaurants && filteredRestaurants.length > 0 ? (
              filteredRestaurants.map((restaurant) => (
                <Card
                  key={restaurant.id}
                  className={`bg-muted/20 border-border hover:border-primary transition-all cursor-pointer ${
                    selectedRestaurant?.id === restaurant.id ? "border-primary neon-border-pink" : ""
                  }`}
                  onClick={() => {
                    setSelectedRestaurant(restaurant);
                    if (map && restaurant.latitude && restaurant.longitude) {
                      map.panTo({
                        lat: restaurant.latitude,
                        lng: restaurant.longitude,
                      });
                      map.setZoom(16);
                    }
                  }}
                >
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">{restaurant.name}</CardTitle>
                    <CardDescription>
                      <Badge variant="secondary" className="text-xs">
                        {getCountryName(restaurant.countryId)}
                      </Badge>
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="flex items-start gap-2 text-xs text-muted-foreground mb-2">
                      <MapPin className="w-3 h-3 mt-0.5 shrink-0" />
                      <span className="line-clamp-2">{restaurant.address}</span>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full gap-2 mt-2"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleGetDirections(restaurant);
                      }}
                    >
                      <Navigation className="w-3 h-3" />
                      Get Directions
                    </Button>
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="text-center py-12">
                <p className="text-muted-foreground">
                  No restaurants with location data found.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
