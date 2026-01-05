import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, MapPin, Star, Check, X } from "lucide-react";
import { toast } from "sonner";

export default function Discover() {
  const { isAuthenticated } = useAuth();
  const [selectedCountryId, setSelectedCountryId] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRestaurantId, setSelectedRestaurantId] = useState<number | null>(null);

  const { data: countries } = trpc.countries.list.useQuery();
  const { data: allRestaurants, isLoading } = trpc.restaurants.list.useQuery();
  const { data: myVisits } = trpc.visits.myVisits.useQuery(undefined, { enabled: isAuthenticated });

  const utils = trpc.useUtils();

  // Filter restaurants
  const filteredRestaurants = allRestaurants?.filter((restaurant) => {
    const matchesCountry = selectedCountryId === "all" || restaurant.countryId === Number(selectedCountryId);
    const matchesSearch = searchQuery === "" || 
      restaurant.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      restaurant.address.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCountry && matchesSearch;
  });

  // Check if restaurant is visited
  const isVisited = (restaurantId: number) => {
    return myVisits?.some(visit => visit.restaurantId === restaurantId);
  };

  const getCountryName = (countryId: number) => {
    return countries?.find(c => c.id === countryId)?.cuisineType || "Unknown";
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
      <div className="hud-frame p-8 bg-card border border-border">
        <h1 className="text-4xl font-bold neon-pink mb-6">Discover Restaurants</h1>

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <div className="flex-1">
            <Input
              placeholder="Search restaurants..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-background border-input"
            />
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

        {/* Restaurant grid */}
        {filteredRestaurants && filteredRestaurants.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredRestaurants.map((restaurant) => (
              <RestaurantCard
                key={restaurant.id}
                restaurant={restaurant}
                countryName={getCountryName(restaurant.countryId)}
                isVisited={isVisited(restaurant.id)}
                isAuthenticated={isAuthenticated}
                onSelect={() => setSelectedRestaurantId(restaurant.id)}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No restaurants found matching your criteria.</p>
          </div>
        )}
      </div>

      {/* Restaurant detail dialog */}
      {selectedRestaurantId && (
        <RestaurantDetailDialog
          restaurantId={selectedRestaurantId}
          onClose={() => setSelectedRestaurantId(null)}
        />
      )}
    </div>
  );
}

function RestaurantCard({ restaurant, countryName, isVisited, isAuthenticated, onSelect }: any) {
  const utils = trpc.useUtils();
  const markVisitedMutation = trpc.visits.markVisited.useMutation({
    onSuccess: () => {
      utils.visits.myVisits.invalidate();
      toast.success("Marked as visited!");
    },
  });

  const unmarkVisitedMutation = trpc.visits.unmarkVisited.useMutation({
    onSuccess: () => {
      utils.visits.myVisits.invalidate();
      toast.success("Unmarked visit");
    },
  });

  const toggleVisit = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isAuthenticated) {
      toast.error("Please login to track visits");
      return;
    }

    if (isVisited) {
      unmarkVisitedMutation.mutate({ restaurantId: restaurant.id });
    } else {
      markVisitedMutation.mutate({ restaurantId: restaurant.id });
    }
  };

  return (
    <Card 
      className="bg-muted/20 border-border hover:border-primary transition-all cursor-pointer group"
      onClick={onSelect}
    >
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <CardTitle className="text-lg group-hover:text-primary transition-colors">
              {restaurant.name}
            </CardTitle>
            <CardDescription className="mt-1">
              <Badge variant="secondary" className="text-xs">
                {countryName}
              </Badge>
            </CardDescription>
          </div>
          {isAuthenticated && (
            <Button
              size="sm"
              variant={isVisited ? "default" : "outline"}
              onClick={toggleVisit}
              className="shrink-0"
            >
              {isVisited ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-start gap-2 text-sm text-muted-foreground">
          <MapPin className="w-4 h-4 mt-0.5 shrink-0" />
          <span className="line-clamp-2">{restaurant.address}</span>
        </div>
        {restaurant.priceLevel && (
          <div className="mt-2 text-sm text-accent">
            {"$".repeat(restaurant.priceLevel)}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function RestaurantDetailDialog({ restaurantId, onClose }: { restaurantId: number; onClose: () => void }) {
  const { isAuthenticated } = useAuth();
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");

  const { data: restaurant } = trpc.restaurants.getById.useQuery({ id: restaurantId });
  const { data: reviews } = trpc.reviews.getForRestaurant.useQuery({ restaurantId });
  const { data: avgRating } = trpc.reviews.getAverageRating.useQuery({ restaurantId });
  const { data: myReview } = trpc.reviews.getMyReview.useQuery({ restaurantId }, { enabled: isAuthenticated });

  const utils = trpc.useUtils();
  const createReviewMutation = trpc.reviews.create.useMutation({
    onSuccess: () => {
      utils.reviews.getForRestaurant.invalidate({ restaurantId });
      utils.reviews.getAverageRating.invalidate({ restaurantId });
      utils.reviews.getMyReview.invalidate({ restaurantId });
      toast.success("Review submitted!");
      setComment("");
    },
  });

  const handleSubmitReview = () => {
    if (!isAuthenticated) {
      toast.error("Please login to submit a review");
      return;
    }

    createReviewMutation.mutate({
      restaurantId,
      rating,
      comment,
      isPublic: true,
    });
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto bg-card">
        <DialogHeader>
          <DialogTitle className="text-2xl neon-pink">{restaurant?.name}</DialogTitle>
          <DialogDescription>
            <div className="flex items-center gap-2 mt-2">
              <MapPin className="w-4 h-4" />
              <span>{restaurant?.address}</span>
            </div>
            {avgRating && avgRating.count > 0 && (
              <div className="flex items-center gap-2 mt-2">
                <Star className="w-4 h-4 fill-accent text-accent" />
                <span className="font-semibold">{Number(avgRating.avgRating).toFixed(1)}</span>
                <span className="text-muted-foreground">({avgRating.count} reviews)</span>
              </div>
            )}
          </DialogDescription>
        </DialogHeader>

        {restaurant?.description && (
          <div className="mt-4">
            <p className="text-sm text-muted-foreground">{restaurant.description}</p>
          </div>
        )}

        {/* Review form */}
        {isAuthenticated && !myReview && (
          <div className="mt-6 p-4 bg-muted/20 rounded-lg border border-border">
            <h3 className="font-semibold mb-3">Leave a Review</h3>
            <div className="space-y-3">
              <div>
                <label className="text-sm text-muted-foreground mb-2 block">Rating</label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onClick={() => setRating(star)}
                      className="transition-transform hover:scale-110"
                    >
                      <Star
                        className={`w-6 h-6 ${star <= rating ? "fill-accent text-accent" : "text-muted"}`}
                      />
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-sm text-muted-foreground mb-2 block">Comment</label>
                <Textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Share your experience..."
                  className="bg-background"
                />
              </div>
              <Button onClick={handleSubmitReview} disabled={createReviewMutation.isPending}>
                {createReviewMutation.isPending ? "Submitting..." : "Submit Review"}
              </Button>
            </div>
          </div>
        )}

        {myReview && (
          <div className="mt-6 p-4 bg-primary/10 rounded-lg border border-primary">
            <p className="text-sm text-muted-foreground mb-2">Your review:</p>
            <div className="flex items-center gap-2 mb-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={`w-4 h-4 ${star <= myReview.rating ? "fill-accent text-accent" : "text-muted"}`}
                />
              ))}
            </div>
            {myReview.comment && <p className="text-sm">{myReview.comment}</p>}
          </div>
        )}

        {/* Reviews list */}
        {reviews && reviews.length > 0 && (
          <div className="mt-6">
            <h3 className="font-semibold mb-4">Reviews ({reviews.length})</h3>
            <div className="space-y-4">
              {reviews.map((review) => (
                <div key={review.review.id} className="p-4 bg-muted/10 rounded-lg border border-border">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold">{review.user?.name || "Anonymous"}</span>
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={`w-3 h-3 ${star <= review.review.rating ? "fill-accent text-accent" : "text-muted"}`}
                        />
                      ))}
                    </div>
                  </div>
                  {review.review.comment && (
                    <p className="text-sm text-muted-foreground">{review.review.comment}</p>
                  )}
                  <p className="text-xs text-muted-foreground mt-2">
                    {new Date(review.review.createdAt).toLocaleDateString()}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
