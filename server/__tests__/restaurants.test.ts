import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  createAuthenticatedContext,
  createUnauthenticatedContext,
} from "./helpers/context";
import { mockRestaurant, mockCountry } from "./helpers/fixtures";

vi.mock("../db");
vi.mock("../googleMapsHelper");
import * as db from "../db";

describe("restaurants", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe("list", () => {
    it("returns transformed data with country sub-object", async () => {
      vi.mocked(db.getAllRestaurants).mockResolvedValue([
        { restaurant: mockRestaurant, country: mockCountry },
      ]);
      const { caller } = createUnauthenticatedContext();

      const result = await caller.restaurants.list();

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe("Test Restaurant");
      expect(result[0].country).toEqual({
        id: mockCountry.id,
        name: mockCountry.name,
        alpha2: mockCountry.alpha2,
        code: mockCountry.code,
      });
    });
  });

  describe("getById", () => {
    it("returns restaurant when found", async () => {
      vi.mocked(db.getRestaurantById).mockResolvedValue(mockRestaurant);
      const { caller } = createUnauthenticatedContext();

      const result = await caller.restaurants.getById({ id: 1 });

      expect(result).toEqual(mockRestaurant);
      expect(db.getRestaurantById).toHaveBeenCalledWith(1);
    });

    it("returns undefined when not found", async () => {
      vi.mocked(db.getRestaurantById).mockResolvedValue(undefined);
      const { caller } = createUnauthenticatedContext();

      const result = await caller.restaurants.getById({ id: 9999 });

      expect(result).toBeUndefined();
    });
  });

  describe("getByCountry", () => {
    it("returns restaurants for country", async () => {
      vi.mocked(db.getRestaurantsByCountry).mockResolvedValue([mockRestaurant]);
      const { caller } = createUnauthenticatedContext();

      const result = await caller.restaurants.getByCountry({ countryId: 10 });

      expect(result).toEqual([mockRestaurant]);
      expect(db.getRestaurantsByCountry).toHaveBeenCalledWith(10);
    });
  });

  describe("getByCountryCode", () => {
    it("returns restaurants for country code", async () => {
      vi.mocked(db.getRestaurantsByCountryCode).mockResolvedValue([
        mockRestaurant,
      ]);
      const { caller } = createUnauthenticatedContext();

      const result = await caller.restaurants.getByCountryCode({
        countryCode: "SG",
      });

      expect(result).toEqual([mockRestaurant]);
      expect(db.getRestaurantsByCountryCode).toHaveBeenCalledWith("SG");
    });
  });

  describe("search", () => {
    it("returns matching restaurants", async () => {
      vi.mocked(db.searchRestaurants).mockResolvedValue([mockRestaurant]);
      const { caller } = createUnauthenticatedContext();

      const result = await caller.restaurants.search({ query: "Test" });

      expect(result).toEqual([mockRestaurant]);
      expect(db.searchRestaurants).toHaveBeenCalledWith("Test");
    });
  });

  describe("create", () => {
    it("creates restaurant when authenticated", async () => {
      vi.mocked(db.createRestaurant).mockResolvedValue({} as any);
      const { caller } = createAuthenticatedContext();

      await caller.restaurants.create({
        countryId: 10,
        name: "New Place",
        address: "456 New St",
      });

      expect(db.createRestaurant).toHaveBeenCalledWith(
        expect.objectContaining({
          countryId: 10,
          name: "New Place",
          address: "456 New St",
        })
      );
    });

    it("rejects when unauthenticated", async () => {
      const { caller } = createUnauthenticatedContext();

      await expect(
        caller.restaurants.create({
          countryId: 10,
          name: "New Place",
          address: "456 New St",
        })
      ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    });
  });

  describe("importFromGoogleMaps", () => {
    it("rejects duplicate restaurants with CONFLICT", async () => {
      vi.mocked(db.getCountryByAlpha2).mockResolvedValue(mockCountry);
      vi.mocked(db.getRestaurantByName).mockResolvedValue(mockRestaurant);
      const { caller } = createAuthenticatedContext();

      // countryId 1 maps to the first entry in countries JSON (Afghanistan, alpha2=AF)
      // We need a countryId that exists in the static JSON. Let's use a valid one.
      // The static JSON is indexed 1..N. We'll mock the alpha2 lookup to return our country.
      // The router looks up countriesData.find(c => c.id === input.countryId)
      // so we need to pass a valid JSON country ID.
      // countriesData[0].id === 1 (Afghanistan, AF)
      // We mock getCountryByAlpha2("AF") to return mockCountry
      await expect(
        caller.restaurants.importFromGoogleMaps({
          name: "Test Restaurant",
          address: "123 Test St",
          latitude: "1.3521",
          longitude: "103.8198",
          countryId: 1, // JSON index 1 = Afghanistan (alpha2: AF)
        })
      ).rejects.toMatchObject({
        code: "CONFLICT",
        message: "Restaurant already exists in database",
      });
    });

    it("rejects invalid countryId with BAD_REQUEST", async () => {
      const { caller } = createAuthenticatedContext();

      await expect(
        caller.restaurants.importFromGoogleMaps({
          name: "Test Restaurant",
          address: "123 Test St",
          latitude: "1.3521",
          longitude: "103.8198",
          countryId: 99999, // does not exist in JSON
        })
      ).rejects.toMatchObject({
        code: "BAD_REQUEST",
      });
    });

    it("rejects unauthenticated users", async () => {
      const { caller } = createUnauthenticatedContext();

      await expect(
        caller.restaurants.importFromGoogleMaps({
          name: "Test Restaurant",
          address: "123 Test St",
          latitude: "1.3521",
          longitude: "103.8198",
          countryId: 1,
        })
      ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    });
  });
});
