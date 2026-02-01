import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useCountries } from "@/hooks/useCountries";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, AlertCircle, CheckCircle, MapPin } from "lucide-react";
import { toast } from "sonner";

interface GoogleMapsImportProps {
  open: boolean;
  onClose: () => void;
  countryId?: number;
}

export default function GoogleMapsImport({ open, onClose, countryId: defaultCountryId }: GoogleMapsImportProps) {
  const [mapsUrl, setMapsUrl] = useState("");
  const [selectedCountryId, setSelectedCountryId] = useState<string>(defaultCountryId?.toString() || "");
  const [parsedData, setParsedData] = useState<any>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [error, setError] = useState("");

  const { data: countries } = useCountries();
  const utils = trpc.useUtils();
  const importMutation = trpc.restaurants.importFromGoogleMaps.useMutation({
    onSuccess: () => {
      utils.restaurants.list.invalidate();
      toast.success("Restaurant imported successfully!");
      handleClose();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to import restaurant");
    },
  });

  const parseMapsUrlMutation = trpc.restaurants.parseMapsUrl.useMutation();

  const handleValidateUrl = async () => {
    if (!mapsUrl.trim()) {
      setError("Please paste a Google Maps URL");
      return;
    }

    if (!selectedCountryId) {
      setError("Please select a cuisine/country");
      return;
    }

    setIsValidating(true);
    setError("");

    try {
      const data = await parseMapsUrlMutation.mutateAsync({ url: mapsUrl.trim() });
      setParsedData({
        name: data.name ?? "Imported Place",
        address: data.address ?? data.name ?? "Unknown",
        latitude: data.latitude!,
        longitude: data.longitude!,
        countryId: Number(selectedCountryId),
        placeId: data.placeId,
        phoneNumber: data.phoneNumber,
        website: data.website,
        priceLevel: data.priceLevel,
        imageUrl: data.imageUrl,
        description: data.description,
      });
    } catch (err) {
      setError((err as Error).message ?? "Invalid Google Maps URL. Please paste a valid link.");
      setParsedData(null);
    } finally {
      setIsValidating(false);
    }
  };

  const handleImport = async () => {
    if (!parsedData) return;

    importMutation.mutate({
      name: parsedData.name,
      address: parsedData.address,
      latitude: parsedData.latitude,
      longitude: parsedData.longitude,
      countryId: parsedData.countryId,
      placeId: parsedData.placeId,
      phoneNumber: parsedData.phoneNumber,
      website: parsedData.website,
      priceLevel: parsedData.priceLevel,
      imageUrl: parsedData.imageUrl,
      description: parsedData.description,
    });
  };

  const handleClose = () => {
    setMapsUrl("");
    setParsedData(null);
    setError("");
    setSelectedCountryId(defaultCountryId?.toString() || "");
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md bg-card">
        <DialogHeader>
          <DialogTitle className="text-2xl neon-pink">Add Restaurant from Google Maps</DialogTitle>
          <DialogDescription>
            Paste a Google Maps link to add a new restaurant to the database
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {/* Instructions */}
          <Alert className="bg-muted/20 border-border">
            <MapPin className="h-4 w-4" />
            <AlertDescription className="text-sm">
              Open a restaurant on Google Maps, copy the URL (full or short link like maps.app.goo.gl), and paste it here.
            </AlertDescription>
          </Alert>

          {/* URL Input */}
          <div>
            <label className="text-sm font-semibold mb-2 block">Google Maps URL</label>
            <Input
              placeholder="https://maps.google.com/maps/place/..."
              value={mapsUrl}
              onChange={(e) => {
                setMapsUrl(e.target.value);
                setError("");
              }}
              disabled={isValidating || importMutation.isPending || parseMapsUrlMutation.isPending}
              className="bg-background"
            />
          </div>

          {/* Country Select */}
          <div>
            <label className="text-sm font-semibold mb-2 block">Cuisine/Country</label>
            <Select value={selectedCountryId} onValueChange={setSelectedCountryId}>
              <SelectTrigger className="bg-background" disabled={isValidating || importMutation.isPending}>
                <SelectValue placeholder="Select a cuisine..." />
              </SelectTrigger>
              <SelectContent>
                {countries?.map((country) => (
                  <SelectItem key={country.id} value={country.id.toString()}>
                    {country.flagEmoji} {country.cuisineType}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Error Alert */}
          {error && (
            <Alert className="bg-destructive/10 border-destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-sm text-destructive">{error}</AlertDescription>
            </Alert>
          )}

          {/* Parsed Data Preview */}
          {parsedData && (
            <Alert className="bg-primary/10 border-primary">
              <CheckCircle className="h-4 w-4 text-primary" />
              <AlertDescription className="text-sm">
                <div className="font-semibold mb-1">Ready to import:</div>
                <div className="text-xs space-y-0.5">
                  <div><strong>Name:</strong> {parsedData.name}</div>
                  <div><strong>Address:</strong> {parsedData.address}</div>
                  {parsedData.phoneNumber && <div><strong>Phone:</strong> {parsedData.phoneNumber}</div>}
                  {parsedData.website && <div><strong>Website:</strong> {parsedData.website}</div>}
                  {parsedData.priceLevel != null && <div><strong>Price:</strong> {"$".repeat(parsedData.priceLevel)}</div>}
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            {!parsedData ? (
              <Button
                onClick={handleValidateUrl}
                disabled={isValidating || parseMapsUrlMutation.isPending || !mapsUrl.trim() || !selectedCountryId}
                className="flex-1 gap-2"
              >
                {isValidating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Validating...
                  </>
                ) : (
                  "Fetch place details"
                )}
              </Button>
            ) : (
              <>
                <Button
                  variant="outline"
                  onClick={() => setParsedData(null)}
                  disabled={importMutation.isPending}
                  className="flex-1"
                >
                  Back
                </Button>
                <Button
                  onClick={handleImport}
                  disabled={importMutation.isPending}
                  className="flex-1 gap-2"
                >
                  {importMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Importing...
                    </>
                  ) : (
                    "Import"
                  )}
                </Button>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
