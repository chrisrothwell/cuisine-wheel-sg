/**
 * Helper functions for parsing Google Maps links and extracting place information
 */

export interface GoogleMapsPlaceInfo {
  placeId?: string;
  name?: string;
  address?: string;
  latitude?: string;
  longitude?: string;
  phoneNumber?: string;
  website?: string;
}

/**
 * Parse Google Maps URL to extract place ID
 * Supports formats:
 * - https://maps.google.com/maps/place/.../@lat,lng
 * - https://www.google.com/maps/place/.../@lat,lng
 * - https://goo.gl/maps/...
 */
export function parseGoogleMapsUrl(url: string): GoogleMapsPlaceInfo {
  const info: GoogleMapsPlaceInfo = {};

  try {
    const urlObj = new URL(url);
    
    // Extract place ID from URL path
    const pathMatch = urlObj.pathname.match(/\/place\/([^/]+)/);
    if (pathMatch) {
      info.name = decodeURIComponent(pathMatch[1]).replace(/\+/g, ' ');
    }

    // Extract coordinates from hash or search params
    // Format: /@lat,lng,zoom
    const hashMatch = urlObj.hash.match(/@([-\d.]+),([-\d.]+)/);
    if (hashMatch) {
      info.latitude = hashMatch[1];
      info.longitude = hashMatch[2];
    }

    // Try to extract from search params as well
    const dataMatch = urlObj.search.match(/data=([^&]+)/);
    if (dataMatch) {
      try {
        const data = JSON.parse(decodeURIComponent(dataMatch[1]));
        if (data.center) {
          info.latitude = data.center.lat?.toString();
          info.longitude = data.center.lng?.toString();
        }
      } catch (e) {
        // Ignore JSON parse errors
      }
    }

    return info;
  } catch (error) {
    console.error('Error parsing Google Maps URL:', error);
    return info;
  }
}

/**
 * Validate if a URL is a valid Google Maps link
 */
export function isValidGoogleMapsUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname;
    
    // Check if it's a Google Maps URL
    return (
      hostname.includes('google.com/maps') ||
      hostname.includes('maps.google.com') ||
      hostname.includes('goo.gl')
    );
  } catch (error) {
    return false;
  }
}

/**
 * Extract coordinates from Google Maps URL
 */
export function extractCoordinates(url: string): { lat: string; lng: string } | null {
  try {
    const urlObj = new URL(url);
    
    // Try hash format: /@lat,lng
    const hashMatch = urlObj.hash.match(/@([-\d.]+),([-\d.]+)/);
    if (hashMatch) {
      return {
        lat: hashMatch[1],
        lng: hashMatch[2],
      };
    }

    return null;
  } catch (error) {
    return null;
  }
}
