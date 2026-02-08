import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  createAuthenticatedContext,
  createUnauthenticatedContext,
} from "./helpers/context";
import {
  mockGroup,
  mockGroupMember,
  mockUser,
  mockVisit,
  mockRestaurant,
} from "./helpers/fixtures";

vi.mock("../db");
import * as db from "../db";

describe("groups", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe("list", () => {
    it("returns public groups", async () => {
      vi.mocked(db.getAllPublicGroups).mockResolvedValue([
        { group: mockGroup, creator: mockUser, memberCount: 3 },
      ]);
      const { caller } = createUnauthenticatedContext();

      const result = await caller.groups.list();

      expect(result).toHaveLength(1);
      expect(result[0].group.name).toBe("Foodies SG");
      expect(result[0].memberCount).toBe(3);
    });
  });

  describe("myGroups", () => {
    it("returns user groups when authenticated", async () => {
      vi.mocked(db.getUserGroups).mockResolvedValue([
        { group: mockGroup, membership: mockGroupMember, creator: mockUser },
      ]);
      const { caller, user } = createAuthenticatedContext();

      const result = await caller.groups.myGroups();

      expect(result).toHaveLength(1);
      expect(db.getUserGroups).toHaveBeenCalledWith(user.id);
    });

    it("rejects unauthenticated users", async () => {
      const { caller } = createUnauthenticatedContext();

      await expect(caller.groups.myGroups()).rejects.toMatchObject({
        code: "UNAUTHORIZED",
      });
    });
  });

  describe("getById", () => {
    it("returns group when found", async () => {
      vi.mocked(db.getGroupById).mockResolvedValue(mockGroup);
      const { caller } = createUnauthenticatedContext();

      const result = await caller.groups.getById({ id: 1 });

      expect(result).toEqual(mockGroup);
    });

    it("returns undefined when not found", async () => {
      vi.mocked(db.getGroupById).mockResolvedValue(undefined);
      const { caller } = createUnauthenticatedContext();

      const result = await caller.groups.getById({ id: 9999 });

      expect(result).toBeUndefined();
    });
  });

  describe("getMembers", () => {
    it("returns group members", async () => {
      vi.mocked(db.getGroupMembers).mockResolvedValue([
        { membership: mockGroupMember, user: mockUser },
      ]);
      const { caller } = createUnauthenticatedContext();

      const result = await caller.groups.getMembers({ groupId: 1 });

      expect(result).toHaveLength(1);
      expect(result[0].user).toEqual(mockUser);
      expect(result[0].membership.role).toBe("owner");
    });
  });

  describe("getVisits", () => {
    it("returns group visits", async () => {
      vi.mocked(db.getGroupVisits).mockResolvedValue([
        { visit: mockVisit, user: mockUser, restaurant: mockRestaurant },
      ]);
      const { caller } = createUnauthenticatedContext();

      const result = await caller.groups.getVisits({ groupId: 1 });

      expect(result).toHaveLength(1);
      expect(result[0].visit).toEqual(mockVisit);
    });
  });

  describe("create", () => {
    it("creates group and adds creator as owner", async () => {
      vi.mocked(db.createGroup).mockResolvedValue({ insertId: 5 });
      vi.mocked(db.addGroupMember).mockResolvedValue({} as any);
      const { caller, user } = createAuthenticatedContext();

      const result = await caller.groups.create({
        name: "New Group",
        description: "A new group",
        isPublic: true,
      });

      expect(result).toEqual({ groupId: 5 });
      expect(db.createGroup).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "New Group",
          creatorId: user.id,
          isPublic: true,
        })
      );
      expect(db.addGroupMember).toHaveBeenCalledWith({
        groupId: 5,
        userId: user.id,
        role: "owner",
      });
    });

    it("rejects unauthenticated users", async () => {
      const { caller } = createUnauthenticatedContext();

      await expect(
        caller.groups.create({ name: "Nope" })
      ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    });
  });

  describe("join", () => {
    it("adds member to group", async () => {
      vi.mocked(db.getGroupMembers).mockResolvedValue([]); // no existing members
      vi.mocked(db.joinGroup).mockResolvedValue({} as any);
      const { caller, user } = createAuthenticatedContext();

      await caller.groups.join({ groupId: 1 });

      expect(db.joinGroup).toHaveBeenCalledWith(1, user.id);
    });

    it("throws CONFLICT if already a member", async () => {
      vi.mocked(db.getGroupMembers).mockResolvedValue([
        { membership: mockGroupMember, user: mockUser },
      ]);
      const { caller } = createAuthenticatedContext();

      await expect(
        caller.groups.join({ groupId: 1 })
      ).rejects.toMatchObject({
        code: "CONFLICT",
        message: "Already a member of this group",
      });
    });

    it("rejects unauthenticated users", async () => {
      const { caller } = createUnauthenticatedContext();

      await expect(
        caller.groups.join({ groupId: 1 })
      ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    });
  });
});
