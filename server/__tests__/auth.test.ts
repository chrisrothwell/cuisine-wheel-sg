import { describe, expect, it } from "vitest";
import { COOKIE_NAME } from "@shared/const";
import {
  createAuthenticatedContext,
  createUnauthenticatedContext,
} from "./helpers/context";

describe("auth", () => {
  describe("me", () => {
    it("returns user when authenticated", async () => {
      const { caller, user } = createAuthenticatedContext();

      const result = await caller.auth.me();

      expect(result).toEqual(user);
    });

    it("returns null when unauthenticated", async () => {
      const { caller } = createUnauthenticatedContext();

      const result = await caller.auth.me();

      expect(result).toBeNull();
    });
  });

  describe("logout", () => {
    it("clears cookie with correct options", async () => {
      const { caller, clearedCookies } = createAuthenticatedContext();

      await caller.auth.logout();

      expect(clearedCookies).toHaveLength(1);
      expect(clearedCookies[0].name).toBe(COOKIE_NAME);
      expect(clearedCookies[0].options).toMatchObject({
        httpOnly: true,
        path: "/",
        sameSite: "Lax",
        secure: false, // NODE_ENV is not "production" in test
      });
    });

    it("returns { success: true }", async () => {
      const { caller } = createAuthenticatedContext();

      const result = await caller.auth.logout();

      expect(result).toEqual({ success: true });
    });
  });
});
