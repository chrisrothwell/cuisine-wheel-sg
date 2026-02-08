import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  createAuthenticatedContext,
  createUnauthenticatedContext,
} from "./helpers/context";
import { mockCountry } from "./helpers/fixtures";

vi.mock("../db");
import * as db from "../db";

describe("countries", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe("list", () => {
    it("returns array from static JSON (no DB needed)", async () => {
      const { caller } = createUnauthenticatedContext();

      const result = await caller.countries.list();

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
    });

    it("items have correct schema fields (no cuisineType or flagEmoji)", async () => {
      const { caller } = createUnauthenticatedContext();

      const result = await caller.countries.list();
      const first = result[0];

      expect(first).toHaveProperty("id");
      expect(first).toHaveProperty("name");
      expect(first).toHaveProperty("code");
      expect(first).toHaveProperty("alpha2");
      expect(first).toHaveProperty("alpha3");
      expect(first).toHaveProperty("region");
      expect(first).toHaveProperty("subRegion");
      expect(first).toHaveProperty("unMember");

      // These fields were removed
      expect(first).not.toHaveProperty("cuisineType");
      expect(first).not.toHaveProperty("flagEmoji");
    });
  });

  describe("getById", () => {
    it("returns country when found", async () => {
      vi.mocked(db.getCountryById).mockResolvedValue(mockCountry);
      const { caller } = createUnauthenticatedContext();

      const result = await caller.countries.getById({ id: 10 });

      expect(result).toEqual(mockCountry);
      expect(db.getCountryById).toHaveBeenCalledWith(10);
    });

    it("returns undefined when not found", async () => {
      vi.mocked(db.getCountryById).mockResolvedValue(undefined);
      const { caller } = createUnauthenticatedContext();

      const result = await caller.countries.getById({ id: 9999 });

      expect(result).toBeUndefined();
    });
  });

  describe("getByCode", () => {
    it("returns country when found", async () => {
      vi.mocked(db.getCountryByCode).mockResolvedValue(mockCountry);
      const { caller } = createUnauthenticatedContext();

      const result = await caller.countries.getByCode({ code: "SG" });

      expect(result).toEqual(mockCountry);
      expect(db.getCountryByCode).toHaveBeenCalledWith("SG");
    });

    it("returns undefined when not found", async () => {
      vi.mocked(db.getCountryByCode).mockResolvedValue(undefined);
      const { caller } = createUnauthenticatedContext();

      const result = await caller.countries.getByCode({ code: "XX" });

      expect(result).toBeUndefined();
    });
  });
});
