import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Users, Plus, MapPin, Star } from "lucide-react";
import { toast } from "sonner";
import { useCountries } from "@/hooks/useCountries";

export default function Groups() {
  const { isAuthenticated } = useAuth();
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  const { data: publicGroups, isLoading: publicLoading } = trpc.groups.list.useQuery();
  const { data: myGroups, isLoading: myLoading } = trpc.groups.myGroups.useQuery(undefined, { enabled: isAuthenticated });

  if (publicLoading || myLoading) {
    return (
      <div className="container py-16 flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container py-8">
      <div className="hud-frame p-8 bg-card border border-border">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-4xl font-bold neon-cyan mb-2">Groups</h1>
            <p className="text-muted-foreground">
              Join or create groups to explore cuisines together
            </p>
          </div>
          {isAuthenticated && (
            <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2 neon-border-pink">
                  <Plus className="w-4 h-4" />
                  Create Group
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-card">
                <CreateGroupForm onSuccess={() => setCreateDialogOpen(false)} />
              </DialogContent>
            </Dialog>
          )}
        </div>

        <Tabs defaultValue="all" className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="all">All Groups</TabsTrigger>
            {isAuthenticated && <TabsTrigger value="my">My Groups</TabsTrigger>}
          </TabsList>

          <TabsContent value="all">
            {publicGroups && publicGroups.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {publicGroups.map(({ group, creator, memberCount }) => (
                  <GroupCard
                    key={group.id}
                    group={group}
                    creator={creator}
                    memberCount={Number(memberCount)}
                    onSelect={() => setSelectedGroupId(group.id)}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-muted-foreground">No public groups available yet.</p>
              </div>
            )}
          </TabsContent>

          {isAuthenticated && (
            <TabsContent value="my">
              {myGroups && myGroups.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {myGroups.map(({ group, membership, creator }) => (
                    <GroupCard
                      key={group!.id}
                      group={group!}
                      creator={creator}
                      memberCount={0}
                      membership={membership}
                      onSelect={() => setSelectedGroupId(group!.id)}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <p className="text-muted-foreground mb-4">You haven't joined any groups yet.</p>
                  <Button variant="outline" onClick={() => document.querySelector<HTMLButtonElement>('[value="all"]')?.click()}>
                    Browse Groups
                  </Button>
                </div>
              )}
            </TabsContent>
          )}
        </Tabs>
      </div>

      {/* Group detail dialog */}
      {selectedGroupId && (
        <GroupDetailDialog
          groupId={selectedGroupId}
          onClose={() => setSelectedGroupId(null)}
        />
      )}
    </div>
  );
}

function GroupCard({ group, creator, memberCount, membership, onSelect }: any) {
  return (
    <Card 
      className="bg-muted/20 border-border hover:border-accent transition-all cursor-pointer group"
      onClick={onSelect}
    >
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <CardTitle className="text-lg group-hover:text-accent transition-colors">
              {group.name}
            </CardTitle>
            <CardDescription className="mt-2 line-clamp-2">
              {group.description || "No description"}
            </CardDescription>
          </div>
          {membership && (
            <Badge variant={membership.role === 'owner' ? 'default' : 'secondary'}>
              {membership.role}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Users className="w-4 h-4" />
            <span>{memberCount} {memberCount === 1 ? "member" : "members"}</span>
          </div>
          {creator && (
            <span className="text-xs text-muted-foreground">
              by {creator.name}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function CreateGroupForm({ onSuccess }: { onSuccess: () => void }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isPublic, setIsPublic] = useState(true);

  const utils = trpc.useUtils();
  const createMutation = trpc.groups.create.useMutation({
    onSuccess: () => {
      utils.groups.list.invalidate();
      utils.groups.myGroups.invalidate();
      toast.success("Group created successfully!");
      onSuccess();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to create group");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Please enter a group name");
      return;
    }
    createMutation.mutate({ name, description, isPublic });
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle className="text-2xl neon-pink">Create New Group</DialogTitle>
        <DialogDescription>
          Start a group to explore cuisines together with friends
        </DialogDescription>
      </DialogHeader>
      <form onSubmit={handleSubmit} className="space-y-4 mt-4">
        <div>
          <label className="text-sm font-semibold mb-2 block">Group Name</label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter group name..."
            className="bg-background"
            required
          />
        </div>
        <div>
          <label className="text-sm font-semibold mb-2 block">Description</label>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe your group..."
            className="bg-background"
            rows={3}
          />
        </div>
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="isPublic"
            checked={isPublic}
            onChange={(e) => setIsPublic(e.target.checked)}
            className="w-4 h-4"
          />
          <label htmlFor="isPublic" className="text-sm">
            Make group public (visible to everyone)
          </label>
        </div>
        <div className="flex gap-3 pt-4">
          <Button type="submit" disabled={createMutation.isPending} className="flex-1">
            {createMutation.isPending ? "Creating..." : "Create Group"}
          </Button>
        </div>
      </form>
    </>
  );
}

function GroupDetailDialog({ groupId, onClose }: { groupId: number; onClose: () => void }) {
  const { isAuthenticated, user } = useAuth();
  const { data: group } = trpc.groups.getById.useQuery({ id: groupId });
  const { data: members } = trpc.groups.getMembers.useQuery({ groupId });
  const { data: visits } = trpc.groups.getVisits.useQuery({ groupId });
  const { data: countries } = useCountries();
  const { data: myGroups } = trpc.groups.myGroups.useQuery(undefined, { enabled: isAuthenticated });

  const utils = trpc.useUtils();
  const joinMutation = trpc.groups.join.useMutation({
    onSuccess: () => {
      utils.groups.getMembers.invalidate({ groupId });
      utils.groups.myGroups.invalidate();
      toast.success("Joined group successfully!");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to join group");
    },
  });

  const isMember = myGroups?.some(({ group: g }) => g!.id === groupId);

  // Calculate group progress
  const visitedCountries = new Set(
    visits?.map(({ restaurant }) => restaurant?.countryId).filter(Boolean)
  ).size;
  const totalCountries = countries?.length || 0;
  const completionPercentage = totalCountries > 0 ? Math.round((visitedCountries / totalCountries) * 100) : 0;

  const handleJoin = () => {
    if (!isAuthenticated) {
      toast.error("Please login to join groups");
      window.location.href = getLoginUrl();
      return;
    }
    joinMutation.mutate({ groupId });
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto bg-card">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <div>
              <DialogTitle className="text-3xl neon-cyan">{group?.name}</DialogTitle>
              <DialogDescription className="mt-2">
                {group?.description || "No description"}
              </DialogDescription>
            </div>
            {isAuthenticated && !isMember && (
              <Button onClick={handleJoin} disabled={joinMutation.isPending} className="gap-2">
                <Plus className="w-4 h-4" />
                {joinMutation.isPending ? "Joining..." : "Join Group"}
              </Button>
            )}
          </div>
        </DialogHeader>

        {/* Group stats */}
        <div className="grid grid-cols-3 gap-4 mt-6">
          <div className="p-4 bg-muted/20 rounded-lg border border-border text-center">
            <div className="text-2xl font-bold neon-pink">{members?.length || 0}</div>
            <div className="text-sm text-muted-foreground">Members</div>
          </div>
          <div className="p-4 bg-muted/20 rounded-lg border border-border text-center">
            <div className="text-2xl font-bold neon-cyan">{visitedCountries}</div>
            <div className="text-sm text-muted-foreground">Countries</div>
          </div>
          <div className="p-4 bg-muted/20 rounded-lg border border-border text-center">
            <div className="text-2xl font-bold neon-pink">{completionPercentage}%</div>
            <div className="text-sm text-muted-foreground">Complete</div>
          </div>
        </div>

        {/* Members */}
        <div className="mt-6">
          <h3 className="font-semibold mb-4">Members ({members?.length || 0})</h3>
          <div className="grid grid-cols-2 gap-3">
            {members?.map(({ membership, user }) => (
              <div
                key={membership.id}
                className="p-3 bg-muted/10 rounded-lg border border-border flex items-center justify-between"
              >
                <span className="font-medium">{user?.name || "Anonymous"}</span>
                <Badge variant={membership.role === 'owner' ? 'default' : 'secondary'} className="text-xs">
                  {membership.role}
                </Badge>
              </div>
            ))}
          </div>
        </div>

        {/* Group visits */}
        <div className="mt-6">
          <h3 className="font-semibold mb-4">Recent Group Visits ({visits?.length || 0})</h3>
          {visits && visits.length > 0 ? (
            <div className="space-y-3 max-h-[300px] overflow-y-auto">
              {visits.slice(0, 20).map(({ visit, user, restaurant }) => {
                const country = countries?.find(c => c.id === restaurant?.countryId);
                return (
                  <div
                    key={visit.id}
                    className="p-3 bg-muted/10 rounded-lg border border-border flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div className="text-2xl">{country?.flagEmoji}</div>
                      <div>
                        <div className="font-medium text-sm">{restaurant?.name}</div>
                        <div className="text-xs text-muted-foreground">
                          by {user?.name} • {new Date(visit.visitedAt).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {country?.cuisineType}
                    </Badge>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No visits recorded yet. Start exploring!
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
