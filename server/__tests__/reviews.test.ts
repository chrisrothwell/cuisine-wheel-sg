import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  createAuthenticatedContext,
  createUnauthenticatedContext,
} from "./helpers/context";
import { mockReview, mockUser } from "./helpers/fixtures";

vi.mock("../db");
import * as db from "../db";

describe("reviews", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe("getForRestaurant", () => {
    it("returns reviews with user info", async () => {
      vi.mocked(db.getRestaurantReviews).mockResolvedValue([
        { review: mockReview, user: mockUser },
      ]);
      const { caller } = createUnauthenticatedContext();

      const result = await caller.reviews.getForRestaurant({
        restaurantId: 1,
      });

      expect(result).toHaveLength(1);
      expect(result[0].review).toEqual(mockReview);
      expect(result[0].user).toEqual(mockUser);
    });

    it("returns empty array when no reviews", async () => {
      vi.mocked(db.getRestaurantReviews).mockResolvedValue([]);
      const { caller } = createUnauthenticatedContext();

      const result = await caller.reviews.getForRestaurant({
        restaurantId: 999,
      });

      expect(result).toEqual([]);
    });
  });

  describe("getAverageRating", () => {
    it("returns average rating when reviews exist", async () => {
      vi.mocked(db.getRestaurantAverageRating).mockResolvedValue({
        avgRating: "4.0",
        count: 3,
      });
      const { caller } = createUnauthenticatedContext();

      const result = await caller.reviews.getAverageRating({
        restaurantId: 1,
      });

      expect(result).toEqual({ avgRating: "4.0", count: 3 });
    });

    it("returns null when no reviews", async () => {
      vi.mocked(db.getRestaurantAverageRating).mockResolvedValue(null);
      const { caller } = createUnauthenticatedContext();

      const result = await caller.reviews.getAverageRating({
        restaurantId: 999,
      });

      expect(result).toBeNull();
    });
  });

  describe("getMyReview", () => {
    it("returns review when found", async () => {
      vi.mocked(db.getUserReview).mockResolvedValue(mockReview);
      const { caller, user } = createAuthenticatedContext();

      const result = await caller.reviews.getMyReview({ restaurantId: 1 });

      expect(result).toEqual(mockReview);
      expect(db.getUserReview).toHaveBeenCalledWith(user.id, 1);
    });

    it("returns undefined when no review", async () => {
      vi.mocked(db.getUserReview).mockResolvedValue(undefined);
      const { caller } = createAuthenticatedContext();

      const result = await caller.reviews.getMyReview({ restaurantId: 999 });

      expect(result).toBeUndefined();
    });

    it("rejects unauthenticated users", async () => {
      const { caller } = createUnauthenticatedContext();

      await expect(
        caller.reviews.getMyReview({ restaurantId: 1 })
      ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    });
  });

  describe("create", () => {
    it("creates review with valid data", async () => {
      vi.mocked(db.createReview).mockResolvedValue({} as any);
      const { caller, user } = createAuthenticatedContext();

      await caller.reviews.create({
        restaurantId: 1,
        rating: 5,
        comment: "Amazing!",
      });

      expect(db.createReview).toHaveBeenCalledWith({
        userId: user.id,
        restaurantId: 1,
        rating: 5,
        comment: "Amazing!",
        isPublic: true, // default
      });
    });

    it("rejects rating below 1 (Zod validation)", async () => {
      const { caller } = createAuthenticatedContext();

      await expect(
        caller.reviews.create({
          restaurantId: 1,
          rating: 0,
        })
      ).rejects.toThrow();
    });

    it("rejects rating above 5 (Zod validation)", async () => {
      const { caller } = createAuthenticatedContext();

      await expect(
        caller.reviews.create({
          restaurantId: 1,
          rating: 6,
        })
      ).rejects.toThrow();
    });

    it("defaults isPublic to true", async () => {
      vi.mocked(db.createReview).mockResolvedValue({} as any);
      const { caller } = createAuthenticatedContext();

      await caller.reviews.create({
        restaurantId: 1,
        rating: 3,
      });

      expect(db.createReview).toHaveBeenCalledWith(
        expect.objectContaining({ isPublic: true })
      );
    });

    it("rejects unauthenticated users", async () => {
      const { caller } = createUnauthenticatedContext();

      await expect(
        caller.reviews.create({ restaurantId: 1, rating: 4 })
      ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    });
  });

  describe("update", () => {
    it("updates review fields", async () => {
      vi.mocked(db.updateReview).mockResolvedValue({} as any);
      const { caller, user } = createAuthenticatedContext();

      await caller.reviews.update({
        restaurantId: 1,
        rating: 3,
        comment: "Changed my mind",
      });

      expect(db.updateReview).toHaveBeenCalledWith(user.id, 1, {
        rating: 3,
        comment: "Changed my mind",
      });
    });

    it("rejects unauthenticated users", async () => {
      const { caller } = createUnauthenticatedContext();

      await expect(
        caller.reviews.update({ restaurantId: 1, rating: 2 })
      ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    });
  });
});
