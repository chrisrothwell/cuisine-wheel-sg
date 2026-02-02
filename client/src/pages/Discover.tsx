import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2, MapPin, Star, Check, X, Plus, Calendar, Trash2 } from "lucide-react";
import { toast } from "sonner";
import GoogleMapsImport from "@/components/GoogleMapsImport";
import { useCountries } from "@/hooks/useCountries";
import { Checkbox } from "@/components/ui/checkbox";

export default function Discover() {
  const { isAuthenticated } = useAuth();
  const [selectedCountryId, setSelectedCountryId] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRestaurantId, setSelectedRestaurantId] = useState<number | null>(null);
  const [importDialogOpen, setImportDialogOpen] = useState(false);

  const { data: countries } = useCountries();
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

  // Helper function to convert country code to flag emoji
  const getFlagEmoji = (alpha2: string | null | undefined): string => {
    if (!alpha2 || alpha2.length !== 2) return "🏳️";
    const codePoints = alpha2
      .toUpperCase()
      .split("")
      .map((char) => 127397 + char.charCodeAt(0));
    return String.fromCodePoint(...codePoints);
  };

  const getCountryName = (restaurant: any) => {
    // Restaurant now includes country info from the join
    if (restaurant.country?.name) {
      return restaurant.country.name;
    }
    // Fallback: try to find in countries array (for backward compatibility)
    const country = countries?.find(c => c.id === restaurant.countryId);
    if (country) {
      return country.cuisineType;
    }
    return "Unknown";
  };

  const getCountryFlag = (restaurant: any): string => {
    // Get flag from country data in restaurant
    if (restaurant.country?.alpha2) {
      return getFlagEmoji(restaurant.country.alpha2);
    }
    // Fallback: try to find in countries array
    const country = countries?.find(c => c.id === restaurant.countryId);
    if (country?.alpha2) {
      return getFlagEmoji(country.alpha2);
    }
    return "🏳️";
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
          {isAuthenticated && (
            <Button
              onClick={() => setImportDialogOpen(true)}
              variant="outline"
              className="gap-2 neon-border-cyan"
            >
              <Plus className="w-4 h-4" />
              Add from Maps
            </Button>
          )}
        </div>

        {/* Restaurant grid */}
        {filteredRestaurants && filteredRestaurants.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredRestaurants.map((restaurant) => (
              <RestaurantCard
                key={restaurant.id}
                restaurant={restaurant}
                countryName={getCountryName(restaurant)}
                countryFlag={getCountryFlag(restaurant)}
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

      {/* Google Maps import dialog */}
      <GoogleMapsImport
        open={importDialogOpen}
        onClose={() => setImportDialogOpen(false)}
        countryId={selectedCountryId !== "all" ? Number(selectedCountryId) : undefined}
      />
    </div>
  );
}

function RestaurantCard({ restaurant, countryName, countryFlag, isVisited, isAuthenticated, onSelect }: any) {
  const [logVisitDialogOpen, setLogVisitDialogOpen] = useState(false);
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
    <>
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
                  {countryFlag} {countryName}
                </Badge>
              </CardDescription>
            </div>
            {isAuthenticated && (
              <div className="flex gap-2 shrink-0">
                <Button
                  size="sm"
                  variant={isVisited ? "default" : "outline"}
                  onClick={toggleVisit}
                >
                  {isVisited ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={(e) => {
                    e.stopPropagation();
                    setLogVisitDialogOpen(true);
                  }}
                >
                  <Calendar className="w-4 h-4" />
                </Button>
              </div>
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
      {isAuthenticated && (
        <LogVisitDialog
          restaurantId={restaurant.id}
          restaurantName={restaurant.name}
          open={logVisitDialogOpen}
          onClose={() => setLogVisitDialogOpen(false)}
        />
      )}
    </>
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

function LogVisitDialog({ restaurantId, restaurantName, open, onClose }: { restaurantId: number; restaurantName: string; open: boolean; onClose: () => void }) {
  const { isAuthenticated, user } = useAuth();
  const [selectedGroupId, setSelectedGroupId] = useState<string>("nogroup");
  const [selectedParticipantIds, setSelectedParticipantIds] = useState<number[]>([]);
  const [visitDate, setVisitDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState<string>("");

  const { data: myGroups } = trpc.groups.myGroups.useQuery(undefined, { enabled: isAuthenticated });
  const { data: groupMembers } = trpc.groups.getMembers.useQuery(
    { groupId: Number(selectedGroupId) },
    { enabled: isAuthenticated && open && selectedGroupId !== "" && selectedGroupId !== "none" && selectedGroupId !== "nogroup" }
  );
  const { data: existingVisit } = trpc.visits.checkVisit.useQuery(
    { restaurantId }, 
    { 
      enabled: isAuthenticated && open,
      retry: false,
    }
  );
  
  const utils = trpc.useUtils();
  const createOrUpdateMutation = trpc.visits.createOrUpdate.useMutation({
    onSuccess: () => {
      utils.visits.myVisits.invalidate();
      utils.visits.checkVisit.invalidate({ restaurantId });
      toast.success(existingVisit ? "Visit updated!" : "Visit logged!");
      onClose();
      // Reset form
      setSelectedGroupId("nogroup");
      setSelectedParticipantIds([]);
      setVisitDate(new Date().toISOString().split('T')[0]);
      setNotes("");
    },
  });

  const deleteMutation = trpc.visits.delete.useMutation({
    onSuccess: () => {
      utils.visits.myVisits.invalidate();
      utils.visits.checkVisit.invalidate({ restaurantId });
      toast.success("Visit deleted!");
      onClose();
      // Reset form
      setSelectedGroupId("nogroup");
      setSelectedParticipantIds([]);
      setVisitDate(new Date().toISOString().split('T')[0]);
      setNotes("");
    },
  });

  // Load existing visit data when dialog opens
  useEffect(() => {
    if (!open) return;
    
    if (existingVisit) {
      setVisitDate(new Date(existingVisit.visitedAt).toISOString().split('T')[0]);
      setNotes(existingVisit.notes || "");
      if (existingVisit.groupId) {
        setSelectedGroupId(existingVisit.groupId.toString());
      }
      // Load existing participants
      if (existingVisit.participants && existingVisit.participants.length > 0) {
        setSelectedParticipantIds(existingVisit.participants);
      } else if (user?.id) {
        // Fallback to current user if no participants found
        setSelectedParticipantIds([user.id]);
      }
    } else {
      // Reset to defaults for new visit
      setVisitDate(new Date().toISOString().split('T')[0]);
      setNotes("");
      setSelectedGroupId("nogroup");
      // Include current user by default
      if (user?.id) {
        setSelectedParticipantIds([user.id]);
      } else {
        setSelectedParticipantIds([]);
      }
    }
  }, [open, existingVisit, user]);

  // Reset participants when group changes (but not when loading existing visit)
  useEffect(() => {
    // Don't reset if we're loading an existing visit
    if (existingVisit) return;
    
    if (selectedGroupId === "" || selectedGroupId === "none" || selectedGroupId === "nogroup") {
      // If no group selected, just include current user
      if (user?.id) {
        setSelectedParticipantIds([user.id]);
      } else {
        setSelectedParticipantIds([]);
      }
    } else if (groupMembers && user?.id) {
      // When a group is selected, include current user by default if they're in the group
      const currentUserInGroup = groupMembers.some((m: any) => m.user?.id === user.id);
      if (currentUserInGroup) {
        setSelectedParticipantIds([user.id]);
      } else {
        setSelectedParticipantIds([]);
      }
    }
  }, [selectedGroupId, groupMembers, user, existingVisit]);

  const handleSubmit = () => {
    const visitedAtDate = new Date(visitDate);
    if (isNaN(visitedAtDate.getTime())) {
      toast.error("Please select a valid date");
      return;
    }

    if (selectedParticipantIds.length === 0) {
      toast.error("Please select at least one participant");
      return;
    }

    createOrUpdateMutation.mutate({
      restaurantId,
      visitedAt: visitedAtDate,
      notes: notes.trim() || undefined,
      groupId: selectedGroupId && selectedGroupId !== "none" && selectedGroupId !== "nogroup" ? Number(selectedGroupId) : undefined,
      participantIds: selectedParticipantIds,
    });
  };

  const handleDelete = () => {
    if (!existingVisit) return;
    if (!confirm("Are you sure you want to delete this visit?")) return;
    
    deleteMutation.mutate({ restaurantId });
  };

  const toggleParticipant = (userId: number) => {
    setSelectedParticipantIds(prev => {
      if (prev.includes(userId)) {
        return prev.filter(id => id !== userId);
      } else {
        return [...prev, userId];
      }
    });
  };

  if (!isAuthenticated) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md bg-card">
        <DialogHeader>
          <DialogTitle className="text-2xl neon-pink">
            {existingVisit ? "Edit Visit" : "Log Visit"}
          </DialogTitle>
          <DialogDescription>
            Log a visit to <strong>{restaurantName}</strong> for one of your groups
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          <div>
            <Label htmlFor="group">Group (optional)</Label>
            <Select value={selectedGroupId || undefined} onValueChange={(value) => setSelectedGroupId(value || "nogroup")}>
              <SelectTrigger id="group" className="bg-background">
                <SelectValue placeholder="Select a group (optional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="nogroup">No group</SelectItem>
                {myGroups && myGroups.length > 0 ? (
                  myGroups.map((group: any) => (
                    <SelectItem key={group.group.id} value={group.group.id.toString()}>
                      {group.group.name}
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value="none" disabled>
                    No groups available
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-1">
              {selectedGroupId && selectedGroupId !== "none" && selectedGroupId !== "nogroup" 
                ? "Select which group members joined this visit."
                : "Select a group to track which members joined this visit."}
            </p>
          </div>

          {selectedGroupId && selectedGroupId !== "none" && selectedGroupId !== "nogroup" && groupMembers && (
            <div>
              <Label>Participants</Label>
              <div className="mt-2 space-y-2 max-h-[200px] overflow-y-auto p-3 bg-muted/20 rounded-lg border border-border">
                {groupMembers.length > 0 ? (
                  groupMembers.map((member: any) => {
                    const memberUserId = member.user?.id;
                    if (!memberUserId) return null;
                    const isSelected = selectedParticipantIds.includes(memberUserId);
                    return (
                      <div
                        key={memberUserId}
                        className="flex items-center gap-2 p-2 rounded hover:bg-muted/40 cursor-pointer"
                        onClick={() => toggleParticipant(memberUserId)}
                      >
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleParticipant(memberUserId)}
                        />
                        <span className="text-sm flex-1">
                          {member.user?.name || "Unknown User"}
                          {memberUserId === user?.id && (
                            <span className="text-xs text-muted-foreground ml-2">(You)</span>
                          )}
                        </span>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-sm text-muted-foreground">No members found in this group.</p>
                )}
              </div>
              {selectedParticipantIds.length === 0 && (
                <p className="text-xs text-destructive mt-1">Please select at least one participant.</p>
              )}
            </div>
          )}

          <div>
            <Label htmlFor="visitDate">Visit Date</Label>
            <Input
              id="visitDate"
              type="date"
              value={visitDate}
              onChange={(e) => setVisitDate(e.target.value)}
              className="bg-background"
              max={new Date().toISOString().split('T')[0]}
            />
          </div>

          <div>
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any notes about your visit..."
              className="bg-background min-h-[100px]"
            />
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              onClick={handleSubmit}
              disabled={createOrUpdateMutation.isPending}
              className="flex-1"
            >
              {createOrUpdateMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : existingVisit ? (
                "Update Visit"
              ) : (
                "Log Visit"
              )}
            </Button>
            {existingVisit && (
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
