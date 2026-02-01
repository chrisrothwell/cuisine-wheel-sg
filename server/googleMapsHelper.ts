/**
 * Google Maps URL resolution and Places API integration
 *
 * Flow: URL -> resolve short link -> extract place ID -> Places API (Place Details) -> full place info
 */

import { makeRequest } from "./_core/map";
import type { PlaceDetailsResult, PlacesSearchResult } from "./_core/map";

export interface GoogleMapsPlaceInfo {
  placeId?: string;
  name?: string;
  address?: string;
  latitude?: string;
  longitude?: string;
  phoneNumber?: string;
  website?: string;
  priceLevel?: number;
  imageUrl?: string;
  description?: string;
}

const ALLOWED_MAPS_HOSTS = ["goo.gl", "maps.app.goo.gl", "google.com", "maps.google.com"];

const PLACE_DETAILS_FIELDS = [
  "name",
  "formatted_address",
  "formatted_phone_number",
  "international_phone_number",
  "website",
  "geometry",
  "place_id",
  "price_level",
  "editorial_summary",
  "reviews",
  "photos",
].join(",");

// ============================================================================
// URL Validation
// ============================================================================

function isAllowedMapsUrl(url: string): boolean {
  try {
    const host = new URL(url).hostname.replace(/^www\./, "");
    return ALLOWED_MAPS_HOSTS.some((h) => host === h || host.endsWith("." + h));
  } catch {
    return false;
  }
}

function isShortMapsUrl(url: string): boolean {
  try {
    const host = new URL(url).hostname;
    return host === "goo.gl" || host === "maps.app.goo.gl";
  } catch {
    return false;
  }
}

/**
 * Validate if a URL is a valid Google Maps link
 */
export function isValidGoogleMapsUrl(url: string): boolean {
  return isAllowedMapsUrl(url);
}

// ============================================================================
// URL Resolution
// ============================================================================

/** Resolve short URL to final destination (no CORS on server) */
export async function resolveShortUrl(url: string): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);

  try {
    const res = await fetch(url, {
      redirect: "follow",
      signal: controller.signal,
      headers: { "User-Agent": "Mozilla/5.0 (compatible; CuisineWheel/1.0)" },
    });
    return res.url;
  } finally {
    clearTimeout(timeout);
  }
}

// ============================================================================
// Place Info Extraction from URL
// ============================================================================

interface PlaceInfo {
  placeId?: string;
  coordinates?: { lat: number; lng: number };
  placeName?: string;
}

function extractPlaceInfoFromUrl(url: string): PlaceInfo | null {
  try {
    const urlObj = new URL(url);
    console.log("Extracting place info from URL: ", url);
    
    // Method 1: Direct place_id parameter
    const placeIdParam = urlObj.searchParams.get('place_id');
    if (placeIdParam) {
      console.log("Found place_id parameter: ", placeIdParam);
      return { placeId: placeIdParam };
    }

    // Method 2: Extract from data parameter
    const dataMatch = url.match(/data=([^&]+)/);
    if (dataMatch) {
      const dataParam = decodeURIComponent(dataMatch[1]);
      
      // Try to extract actual place coordinates (!3d = lat, !4d = lng)
      const coordMatch = dataParam.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/);
      if (coordMatch) {
        const lat = parseFloat(coordMatch[1]);
        const lng = parseFloat(coordMatch[2]);
        
        // Also extract place name from URL path
        const placeNameMatch = url.match(/\/place\/([^/@]+)/);
        const placeName = placeNameMatch 
          ? decodeURIComponent(placeNameMatch[1].replace(/\+/g, ' '))
          : undefined;
        
        console.log("Found place coordinates: ", { lat, lng, placeName });
        return { coordinates: { lat, lng }, placeName };
      }
    }

    // Method 3: Fallback to viewport coordinates from @ symbol
    const viewportMatch = url.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
    if (viewportMatch) {
      const lat = parseFloat(viewportMatch[1]);
      const lng = parseFloat(viewportMatch[2]);
      
      const placeNameMatch = url.match(/\/place\/([^/@]+)/);
      const placeName = placeNameMatch 
        ? decodeURIComponent(placeNameMatch[1].replace(/\+/g, ' '))
        : undefined;
      
      console.log("Found viewport coordinates: ", { lat, lng, placeName });
      return { coordinates: { lat, lng }, placeName };
    }

    console.warn("Could not extract place info from URL");
    return null;
  } catch (error) {
    console.error("Error parsing URL:", error);
    return null;
  }
}

// ============================================================================
// Place ID Resolution via Google APIs
// ============================================================================

/** Get Place ID from coordinates using Nearby Search API */
async function getPlaceIdFromCoordinates(
  lat: number, 
  lng: number,
  placeName?: string
): Promise<string | null> {
  try {
    const result = await makeRequest<PlacesSearchResult>(
      "/maps/api/place/nearbysearch/json",
      {
        location: `${lat},${lng}`,
        radius: "100", // Increased radius for better accuracy
      }
    );
    
    if (result.status !== "OK" || !result.results?.length) {
      console.error('Nearby Search error:', result.status);
      return null;
    }

    // If we have a place name, try to match it
    if (placeName) {
      const normalizedName = placeName.toLowerCase();
      const match = result.results.find((r) => 
        r.name?.toLowerCase().includes(normalizedName)
      );
      if (match?.place_id) {
        console.log(`Matched place by name: ${match.name}`);
        return match.place_id;
      }
    }
    
    // Return the closest place
    return result.results[0].place_id ?? null;
  } catch (error) {
    console.error('Failed to fetch place ID from coordinates:', error);
    return null;
  }
}

/** Get Place ID from place name using Text Search API */
async function getPlaceIdFromName(placeName: string): Promise<string | null> {
  try {
    const result = await makeRequest<PlacesSearchResult>(
      "/maps/api/place/textsearch/json",
      {
        query: placeName,
        type: "establishment",
      }
    );

    if (result.status === "OK" && result.results?.length > 0) {
      return result.results[0].place_id ?? null;
    }
    
    return null;
  } catch (error) {
    console.error('Failed to find place by name:', error);
    return null;
  }
}

// ============================================================================
// Place Details Fetching
// ============================================================================

/** Fetch full place details from Places API */
async function fetchPlaceDetails(placeId: string): Promise<GoogleMapsPlaceInfo> {
  const result = await makeRequest<PlaceDetailsResult>("/maps/api/place/details/json", {
    place_id: placeId,
    fields: PLACE_DETAILS_FIELDS,
  });

  if (result.status !== "OK" || !result.result) {
    throw new Error("Could not fetch place details from Google Places API.");
  }

  const r = result.result;
  const location = r.geometry?.location;
  const info: GoogleMapsPlaceInfo = {
    placeId: r.place_id ?? undefined,
    name: r.name ?? "Unknown Place",
    address: r.formatted_address ?? r.name ?? "Unknown",
    latitude: location?.lat != null ? String(location.lat) : undefined,
    longitude: location?.lng != null ? String(location.lng) : undefined,
    phoneNumber: r.formatted_phone_number ?? r.international_phone_number ?? undefined,
    website: r.website ?? undefined,
    priceLevel: r.price_level != null ? Number(r.price_level) : undefined,
  };

  // Add description from editorial summary or first review
  if (r.editorial_summary?.overview) {
    info.description = r.editorial_summary.overview;
  } else if (Array.isArray(r.reviews) && r.reviews.length > 0 && r.reviews[0].text) {
    info.description = r.reviews[0].text.slice(0, 500);
  }

  // Add photo reference
  if (Array.isArray(r.photos) && r.photos.length > 0 && r.photos[0].photo_reference) {
    info.imageUrl = `/api/place-photo?ref=${encodeURIComponent(r.photos[0].photo_reference)}`;
  }

  return info;
}

// ============================================================================
// Main Public API
// ============================================================================

/**
 * Resolve URL (including short links), extract place ID, and return full details.
 * Populates all relevant DB columns: name, address, lat/lng, placeId, phoneNumber, website, priceLevel, description, imageUrl.
 */
export async function resolveAndParseMapsUrl(url: string): Promise<GoogleMapsPlaceInfo> {
  if (!isAllowedMapsUrl(url)) {
    throw new Error("Invalid Google Maps URL. Please paste a link from Google Maps.");
  }

  // Step 1: Resolve short URLs
  let fullUrl = url;
  if (isShortMapsUrl(url)) {
    fullUrl = await resolveShortUrl(url);
  }

  // Step 2: Extract place info from URL
  const placeInfo = extractPlaceInfoFromUrl(fullUrl);
  if (!placeInfo) {
    throw new Error("Could not extract place information from URL. Make sure the link points to a specific place.");
  }

  // Step 3: Get Place ID
  let placeId: string | null = null;
  
  if (placeInfo.placeId) {
    // Already have Place ID
    placeId = placeInfo.placeId;
  } else if (placeInfo.coordinates) {
    // Use coordinates to find Place ID
    console.log("Resolving Place ID from coordinates...");
    placeId = await getPlaceIdFromCoordinates(
      placeInfo.coordinates.lat,
      placeInfo.coordinates.lng,
      placeInfo.placeName
    );
  } else if (placeInfo.placeName) {
    // Use place name to find Place ID
    console.log("Resolving Place ID from place name...");
    placeId = await getPlaceIdFromName(placeInfo.placeName);
  }
  
  if (!placeId) {
    throw new Error("Could not resolve Place ID. The URL may not point to a specific place.");
  }

  // Step 4: Fetch detailed place information
  const info = await fetchPlaceDetails(placeId);
  
  if (!info.latitude || !info.longitude) {
    throw new Error("Place details did not include coordinates.");
  }

  return info;
}

// ============================================================================
// Legacy Helper Functions (for backward compatibility)
// ============================================================================

/**
 * Extract coordinates from Google Maps URL
 * Note: This extracts viewport coordinates, not exact place coordinates
 * @deprecated Use resolveAndParseMapsUrl for accurate place information
 */
export function extractCoordinates(url: string): { lat: string; lng: string } | null {
  try {
    const coordMatch = url.match(/@([-\d.]+),([-\d.]+)/);
    if (coordMatch) {
      return { lat: coordMatch[1], lng: coordMatch[2] };
    }

    const urlObj = new URL(url);
    if (urlObj.hash) {
      const hashMatch = urlObj.hash.match(/@([-\d.]+),([-\d.]+)/);
      if (hashMatch) {
        return { lat: hashMatch[1], lng: hashMatch[2] };
      }
    }
    
    return null;
  } catch {
    return null;
  }
}