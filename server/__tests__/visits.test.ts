import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  createAuthenticatedContext,
  createUnauthenticatedContext,
} from "./helpers/context";
import { mockVisit, mockUser } from "./helpers/fixtures";

vi.mock("../db");
import * as db from "../db";

describe("visits", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe("myVisits", () => {
    it("returns visits for authenticated user", async () => {
      vi.mocked(db.getUserVisits).mockResolvedValue([mockVisit]);
      const { caller, user } = createAuthenticatedContext();

      const result = await caller.visits.myVisits();

      expect(result).toEqual([mockVisit]);
      expect(db.getUserVisits).toHaveBeenCalledWith(user.id);
    });

    it("rejects unauthenticated users", async () => {
      const { caller } = createUnauthenticatedContext();

      await expect(caller.visits.myVisits()).rejects.toMatchObject({
        code: "UNAUTHORIZED",
      });
    });
  });

  describe("checkVisit", () => {
    it("returns visit with participants when found", async () => {
      vi.mocked(db.checkUserVisit).mockResolvedValue(mockVisit);
      vi.mocked(db.getVisitParticipants).mockResolvedValue([
        { participant: {} as any, user: mockUser },
      ]);
      const { caller, user } = createAuthenticatedContext();

      const result = await caller.visits.checkVisit({ restaurantId: 1 });

      expect(result).toMatchObject({
        id: mockVisit.id,
        restaurantId: mockVisit.restaurantId,
        participants: [user.id],
      });
    });

    it("returns null when no visit found", async () => {
      vi.mocked(db.checkUserVisit).mockResolvedValue(null);
      const { caller } = createAuthenticatedContext();

      const result = await caller.visits.checkVisit({ restaurantId: 999 });

      expect(result).toBeNull();
    });

    it("rejects unauthenticated users", async () => {
      const { caller } = createUnauthenticatedContext();

      await expect(
        caller.visits.checkVisit({ restaurantId: 1 })
      ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    });
  });

  describe("createOrUpdate", () => {
    it("creates new visit when none exists (updated: false)", async () => {
      vi.mocked(db.checkUserVisit).mockResolvedValue(null);
      vi.mocked(db.createVisit).mockResolvedValue({ insertId: 1 });
      const { caller, user } = createAuthenticatedContext();
      const visitedAt = new Date("2025-06-01");

      const result = await caller.visits.createOrUpdate({
        restaurantId: 1,
        visitedAt,
      });

      expect(result).toEqual({ success: true, updated: false });
      expect(db.createVisit).toHaveBeenCalledWith(
        expect.objectContaining({
          restaurantId: 1,
          visitedAt,
          participantIds: [user.id],
        })
      );
    });

    it("updates existing visit (updated: true)", async () => {
      vi.mocked(db.checkUserVisit).mockResolvedValue(mockVisit);
      vi.mocked(db.updateVisit).mockResolvedValue(undefined as any);
      const { caller } = createAuthenticatedContext();
      const visitedAt = new Date("2025-07-01");

      const result = await caller.visits.createOrUpdate({
        restaurantId: 1,
        visitedAt,
        notes: "Updated notes",
      });

      expect(result).toEqual({ success: true, updated: true });
      expect(db.updateVisit).toHaveBeenCalledWith(
        mockVisit.id,
        expect.objectContaining({
          visitedAt,
          notes: "Updated notes",
        })
      );
    });

    it("defaults participantIds to current user when not provided", async () => {
      vi.mocked(db.checkUserVisit).mockResolvedValue(null);
      vi.mocked(db.createVisit).mockResolvedValue({ insertId: 2 });
      const { caller, user } = createAuthenticatedContext();

      await caller.visits.createOrUpdate({
        restaurantId: 1,
        visitedAt: new Date(),
      });

      expect(db.createVisit).toHaveBeenCalledWith(
        expect.objectContaining({
          participantIds: [user.id],
        })
      );
    });

    it("rejects unauthenticated users", async () => {
      const { caller } = createUnauthenticatedContext();

      await expect(
        caller.visits.createOrUpdate({
          restaurantId: 1,
          visitedAt: new Date(),
        })
      ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    });
  });

  describe("delete", () => {
    it("deletes existing visit", async () => {
      vi.mocked(db.checkUserVisit).mockResolvedValue(mockVisit);
      vi.mocked(db.deleteVisit).mockResolvedValue(undefined as any);
      const { caller } = createAuthenticatedContext();

      const result = await caller.visits.delete({ restaurantId: 1 });

      expect(result).toEqual({ success: true });
      expect(db.deleteVisit).toHaveBeenCalledWith(mockVisit.id);
    });

    it("succeeds even when no visit exists", async () => {
      vi.mocked(db.checkUserVisit).mockResolvedValue(null);
      const { caller } = createAuthenticatedContext();

      const result = await caller.visits.delete({ restaurantId: 999 });

      expect(result).toEqual({ success: true });
      expect(db.deleteVisit).not.toHaveBeenCalled();
    });
  });

  describe("unmarkVisited", () => {
    it("deletes existing visit", async () => {
      vi.mocked(db.checkUserVisit).mockResolvedValue(mockVisit);
      vi.mocked(db.deleteVisit).mockResolvedValue(undefined as any);
      const { caller } = createAuthenticatedContext();

      const result = await caller.visits.unmarkVisited({ restaurantId: 1 });

      expect(result).toEqual({ success: true });
      expect(db.deleteVisit).toHaveBeenCalledWith(mockVisit.id);
    });
  });
});
