import { Country } from "../../../drizzle/schema";
import { trpc } from "@/lib/trpc";

// Extended country type with frontend-specific fields
export interface CountryWithDisplay extends Country {
  cuisineType: string;
  flagEmoji: string;
}

// Helper function to convert country code to flag emoji
function getFlagEmoji(alpha2: string): string {
  if (!alpha2 || alpha2.length !== 2) return "🏳️";

  const codePoints = alpha2
    .toUpperCase()
    .split("")
    .map((char) => 127397 + char.charCodeAt(0));

  return String.fromCodePoint(...codePoints);
}

// Add display fields to API country data
function withDisplayFields(country: Country): CountryWithDisplay {
  return {
    ...country,
    cuisineType: country.name,
    flagEmoji: getFlagEmoji(country.alpha2),
  };
}

export function useCountries() {
  const query = trpc.countries.list.useQuery();
  return {
    ...query,
    data: query.data?.map(withDisplayFields),
  };
}
