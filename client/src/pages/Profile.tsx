import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, MapPin, Star, Users, Trophy } from "lucide-react";
import { Link } from "wouter";

export default function Profile() {
  const { user, isAuthenticated, loading } = useAuth();
  const { data: myVisits, isLoading: visitsLoading } = trpc.visits.myVisits.useQuery(undefined, { enabled: isAuthenticated });
  const { data: myGroups, isLoading: groupsLoading } = trpc.groups.myGroups.useQuery(undefined, { enabled: isAuthenticated });
  const { data: countries } = trpc.countries.list.useQuery();
  const { data: restaurants } = trpc.restaurants.list.useQuery();

  if (loading || visitsLoading || groupsLoading) {
    return (
      <div className="container py-16 flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return (
      <div className="container py-16">
        <div className="hud-frame p-12 bg-card border border-border text-center max-w-md mx-auto">
          <h2 className="text-2xl font-bold neon-pink mb-4">Login Required</h2>
          <p className="text-muted-foreground mb-6">
            Please login to view your profile and track your culinary journey.
          </p>
          <Button onClick={() => window.location.href = getLoginUrl()} className="neon-border-cyan">
            Login
          </Button>
        </div>
      </div>
    );
  }

  // Calculate stats
  const visitedRestaurants = myVisits?.length || 0;
  const uniqueCountries = new Set(
    myVisits?.map(visit => {
      const restaurant = restaurants?.find(r => r.id === visit.restaurantId);
      return restaurant?.countryId;
    }).filter(Boolean)
  ).size;
  const totalCountries = countries?.length || 0;
  const completionPercentage = totalCountries > 0 ? Math.round((uniqueCountries / totalCountries) * 100) : 0;

  // Get visited countries with details
  const visitedCountriesDetails = Array.from(
    new Set(
      myVisits?.map(visit => {
        const restaurant = restaurants?.find(r => r.id === visit.restaurantId);
        return restaurant?.countryId;
      }).filter(Boolean)
    )
  ).map(countryId => {
    const country = countries?.find(c => c.id === countryId);
    const countryVisits = myVisits?.filter(visit => {
      const restaurant = restaurants?.find(r => r.id === visit.restaurantId);
      return restaurant?.countryId === countryId;
    }).length || 0;
    return { country, visits: countryVisits };
  }).filter(item => item.country);

  return (
    <div className="container py-8">
      {/* Profile header */}
      <div className="hud-frame p-8 bg-card border border-border mb-8">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-4xl font-bold neon-pink mb-2">{user.name || "User"}</h1>
            <p className="text-muted-foreground">{user.email}</p>
          </div>
          <Badge variant="secondary" className="text-lg px-4 py-2">
            Level {Math.floor(visitedRestaurants / 10) + 1}
          </Badge>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card className="bg-card/50 border-primary">
          <CardHeader>
            <CardTitle className="text-3xl font-bold neon-pink">{visitedRestaurants}</CardTitle>
            <CardDescription>Restaurants Visited</CardDescription>
          </CardHeader>
        </Card>

        <Card className="bg-card/50 border-accent">
          <CardHeader>
            <CardTitle className="text-3xl font-bold neon-cyan">{uniqueCountries}</CardTitle>
            <CardDescription>Countries Explored</CardDescription>
          </CardHeader>
        </Card>

        <Card className="bg-card/50 border-primary">
          <CardHeader>
            <CardTitle className="text-3xl font-bold neon-pink">{completionPercentage}%</CardTitle>
            <CardDescription>Completion Rate</CardDescription>
          </CardHeader>
        </Card>

        <Card className="bg-card/50 border-accent">
          <CardHeader>
            <CardTitle className="text-3xl font-bold neon-cyan">{myGroups?.length || 0}</CardTitle>
            <CardDescription>Groups Joined</CardDescription>
          </CardHeader>
        </Card>
      </div>

      {/* Visited countries */}
      <div className="hud-frame p-8 bg-card border border-border mb-8">
        <h2 className="text-2xl font-bold neon-cyan mb-6">Visited Cuisines</h2>
        {visitedCountriesDetails.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {visitedCountriesDetails.map(({ country, visits }) => (
              <div
                key={country!.id}
                className="p-4 bg-muted/20 border border-border rounded-lg text-center hover:border-primary transition-colors"
              >
                <div className="text-4xl mb-2">{country!.flagEmoji}</div>
                <div className="text-sm font-semibold">{country!.cuisineType}</div>
                <div className="text-xs text-muted-foreground mt-1">{visits} visits</div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-muted-foreground mb-4">You haven't visited any restaurants yet.</p>
            <Link href="/discover">
              <Button variant="outline">Start Exploring</Button>
            </Link>
          </div>
        )}
      </div>

      {/* Recent visits */}
      <div className="hud-frame p-8 bg-card border border-border mb-8">
        <h2 className="text-2xl font-bold neon-pink mb-6">Recent Visits</h2>
        {myVisits && myVisits.length > 0 ? (
          <div className="space-y-4">
            {myVisits.slice(0, 10).map((visit) => {
              const restaurant = restaurants?.find(r => r.id === visit.restaurantId);
              const country = countries?.find(c => c.id === restaurant?.countryId);
              return (
                <div
                  key={visit.id}
                  className="p-4 bg-muted/10 border border-border rounded-lg flex items-center justify-between hover:border-primary transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="text-3xl">{country?.flagEmoji}</div>
                    <div>
                      <h3 className="font-semibold">{restaurant?.name}</h3>
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {restaurant?.address}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge variant="secondary">{country?.cuisineType}</Badge>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(visit.visitedAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-muted-foreground">No visits recorded yet.</p>
          </div>
        )}
      </div>

      {/* Groups */}
      <div className="hud-frame p-8 bg-card border border-border">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold neon-cyan">My Groups</h2>
          <Link href="/groups">
            <Button variant="outline" className="gap-2">
              <Users className="w-4 h-4" />
              View All Groups
            </Button>
          </Link>
        </div>
        {myGroups && myGroups.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {myGroups.map(({ group, membership }) => (
              <Card key={group!.id} className="bg-muted/20 border-border hover:border-accent transition-colors">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{group!.name}</CardTitle>
                      <CardDescription className="mt-1">
                        {group!.description || "No description"}
                      </CardDescription>
                    </div>
                    <Badge variant={membership.role === 'owner' ? 'default' : 'secondary'}>
                      {membership.role}
                    </Badge>
                  </div>
                </CardHeader>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-muted-foreground mb-4">You haven't joined any groups yet.</p>
            <Link href="/groups">
              <Button variant="outline">Browse Groups</Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
