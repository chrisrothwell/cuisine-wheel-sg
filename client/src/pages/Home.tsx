import { useState } from "react";
import { trpc } from "@/lib/trpc";
import SpinningWheel from "@/components/SpinningWheel";
import MapSelector from "@/components/MapSelector";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, MapPin, Star, Users, ExternalLink } from "lucide-react";
import { Country } from "../../../drizzle/schema";
import { Link } from "wouter";

export default function Home() {
  const [selectedCountry, setSelectedCountry] = useState<Country | null>(null);
  const [isSpinning, setIsSpinning] = useState(false);
  const { data: countries, isLoading } = trpc.countries.list.useQuery();
  const { data: restaurants, refetch: refetchRestaurants } = trpc.restaurants.getByCountry.useQuery(
    { countryId: selectedCountry?.id || 0 },
    { enabled: !!selectedCountry }
  );

  const handleCountrySelected = (country: Country) => {
    setSelectedCountry(country);
    setIsSpinning(false);
    refetchRestaurants();
  };

  const handleSpin = () => {
    console.log('[Home] handleSpin called');
    setSelectedCountry(null);
    setTimeout(() => setIsSpinning(true), 0); // Force it to happen after state update
  };

  const generateGoogleMapsSearchUrl = (cuisineType: string) => {
    const searchQuery = `${cuisineType} restaurants in Singapore`;
    return `https://www.google.com/maps/search/${encodeURIComponent(searchQuery)}`;
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
      {/* Hero section */}
      <div className="text-center mb-12">
        <h1 className="text-5xl md:text-6xl font-bold neon-pink mb-4">
          Cuisine Wheel
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Spin the wheel to discover cuisines from around the world. Track your culinary journey across Singapore's diverse restaurant scene.
        </p>
      </div>

      {/* Spinning wheel */}
      <div className="mb-16">
        <div className="flex flex-col items-center gap-4">
          {!isSpinning && (
            <Button
              onClick={handleSpin}
              size="lg"
              className="gap-2"
            >
              Spin the Grid
            </Button>
          )}
          <MapSelector
            countries={countries || []}
            onCountrySelected={handleCountrySelected}
            isSpinning={isSpinning}
          />
        </div>
      </div>

      {/* Selected country restaurants */}
      {selectedCountry && (
        <div className="mb-16">
          <div className="hud-frame p-8 bg-card border border-border">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-3xl font-bold neon-cyan mb-2">
                  {selectedCountry.name} Restaurants
                </h2>
                <p className="text-muted-foreground">
                  Explore {selectedCountry.name} cuisine in Singapore
                </p>
              </div>
              <Link href="/discover">
                <Button variant="outline" className="gap-2">
                  <MapPin className="w-4 h-4" />
                  View All
                </Button>
              </Link>
            </div>

            {restaurants && restaurants.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {restaurants.slice(0, 6).map((restaurant) => (
                  <Card key={restaurant.id} className="bg-muted/20 border-border hover:border-primary transition-colors">
                    <CardHeader>
                      <CardTitle className="text-lg">{restaurant.name}</CardTitle>
                      <CardDescription className="line-clamp-1">
                        {restaurant.address}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <MapPin className="w-4 h-4" />
                          <span>Location</span>
                        </div>
                        {restaurant.priceLevel && (
                          <div className="flex items-center gap-1">
                            <span>{"$".repeat(restaurant.priceLevel)}</span>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-muted-foreground mb-4">
                  No restaurants found for this cuisine yet.
                </p>
                <p className="text-sm text-muted-foreground">
                  Be the first to add a {selectedCountry.name} restaurant!
                </p>
              </div>
            )}

            {/* Google Maps search link */}
            <div className="mt-8 pt-6 border-t border-border flex justify-center">
              <a
                href={generateGoogleMapsSearchUrl(selectedCountry.name)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-primary hover:text-primary/80 transition-colors font-semibold hover:underline"
              >
                <MapPin className="w-4 h-4" />
                Search with Google Maps
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Features section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
        <Card className="bg-card/50 border-border hover:border-primary transition-colors">
          <CardHeader>
            <div className="w-12 h-12 rounded-lg bg-primary/20 flex items-center justify-center mb-4">
              <MapPin className="w-6 h-6 text-primary" />
            </div>
            <CardTitle className="neon-pink">Discover Restaurants</CardTitle>
            <CardDescription>
              Explore restaurants from cuisines around the world, all located in Singapore
            </CardDescription>
          </CardHeader>
        </Card>

        <Card className="bg-card/50 border-border hover:border-accent transition-colors">
          <CardHeader>
            <div className="w-12 h-12 rounded-lg bg-accent/20 flex items-center justify-center mb-4">
              <Star className="w-6 h-6 text-accent" />
            </div>
            <CardTitle className="neon-cyan">Track & Review</CardTitle>
            <CardDescription>
              Mark restaurants as visited, rate your experiences, and share reviews with the community
            </CardDescription>
          </CardHeader>
        </Card>

        <Card className="bg-card/50 border-border hover:border-primary transition-colors">
          <CardHeader>
            <div className="w-12 h-12 rounded-lg bg-primary/20 flex items-center justify-center mb-4">
              <Users className="w-6 h-6 text-primary" />
            </div>
            <CardTitle className="neon-pink">Form Groups</CardTitle>
            <CardDescription>
              Create or join groups to collaboratively complete cuisines from all countries together
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    </div>
  );
}
