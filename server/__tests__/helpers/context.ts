import { appRouter } from "../../routers";
import type { TrpcContext } from "../../_core/context";
import type { User } from "../../../drizzle/schema";

type CookieCall = {
  name: string;
  options: Record<string, unknown>;
};

export function createMockUser(overrides?: Partial<User>): User {
  return {
    id: 1,
    openId: "google_12345",
    name: "Test User",
    email: "test@example.com",
    loginMethod: "google",
    role: "user",
    createdAt: new Date("2025-01-01"),
    updatedAt: new Date("2025-01-01"),
    lastSignedIn: new Date("2025-01-01"),
    ...overrides,
  };
}

export function createAuthenticatedContext(userOverrides?: Partial<User>) {
  const clearedCookies: CookieCall[] = [];
  const user = createMockUser(userOverrides);

  const ctx: TrpcContext = {
    user,
    req: new Request("http://localhost/test"),
    res: {
      clearCookie: (name: string, options?: Record<string, unknown>) => {
        clearedCookies.push({ name, options: options ?? {} });
      },
    },
  };

  const caller = appRouter.createCaller(ctx);
  return { ctx, caller, clearedCookies, user };
}

export function createUnauthenticatedContext() {
  const clearedCookies: CookieCall[] = [];

  const ctx: TrpcContext = {
    user: null,
    req: new Request("http://localhost/test"),
    res: {
      clearCookie: (name: string, options?: Record<string, unknown>) => {
        clearedCookies.push({ name, options: options ?? {} });
      },
    },
  };

  const caller = appRouter.createCaller(ctx);
  return { ctx, caller, clearedCookies };
}
