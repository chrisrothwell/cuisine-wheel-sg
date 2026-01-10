import { drizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";
import { countries } from "../drizzle/schema.ts";
import dotenv from "dotenv";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config({ path: path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../.env") });

if (!process.env.DATABASE_URL || !process.env.DATABASE_AUTH_TOKEN) {
  throw new Error("DATABASE_URL environment variable is required");
}

const client = createClient({
  url: process.env.DATABASE_URL,
  authToken: process.env.DATABASE_AUTH_TOKEN,
});

const db = drizzle(client);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function loadCountriesFromJson() {
  const filePath = path.join(__dirname, "display-countries.json");
  const raw = await fs.readFile(filePath, "utf-8");
  const data = JSON.parse(raw);

  return data.map(country => ({
    name: country.name,
    code: country["alpha-3"],
    description: null,
    region: country.region || null,
    subRegion: country["sub-region"] || null,
    unMember: Boolean(country.un_member),
    unMembershipStatus: country.un_membership_status || null,
  }));
}

async function seed() {
  const filePath = path.join(__dirname, "display-countries.json");
  console.log("Seeding countries from", filePath);

  const worldCountries = await loadCountriesFromJson();
  for (const country of worldCountries) {
    try {
      await db
        .insert(countries)
        .values(country)
        .onConflictDoUpdate({
          target: countries.code,
          set: {
            name: country.name
          },
        });
      console.log(`✓ ${country.name}`);
    } catch (error) {
      console.error(`✗ ${country.name}:`, error?.message ?? error);
    }
  }

  console.log("Seeding complete!");
  process.exit(0);
}

seed().catch(error => {
  console.error("Seeding failed:", error);
  process.exit(1);
});
