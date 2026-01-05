import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createTestContext(userId: number = 1): { ctx: TrpcContext } {
  const user: AuthenticatedUser = {
    id: userId,
    openId: `test-user-${userId}`,
    email: `test${userId}@example.com`,
    name: `Test User ${userId}`,
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  const ctx: TrpcContext = {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };

  return { ctx };
}

describe("Countries API", () => {
  it("should list all countries", async () => {
    const { ctx } = createTestContext();
    const caller = appRouter.createCaller(ctx);

    const countries = await caller.countries.list();

    expect(countries).toBeDefined();
    expect(Array.isArray(countries)).toBe(true);
    expect(countries.length).toBeGreaterThan(0);
    
    // Check that countries have required fields
    const firstCountry = countries[0];
    expect(firstCountry).toHaveProperty("id");
    expect(firstCountry).toHaveProperty("name");
    expect(firstCountry).toHaveProperty("cuisineType");
    expect(firstCountry).toHaveProperty("flagEmoji");
  });

  it("should get country by id", async () => {
    const { ctx } = createTestContext();
    const caller = appRouter.createCaller(ctx);

    const countries = await caller.countries.list();
    const firstCountry = countries[0];

    const country = await caller.countries.getById({ id: firstCountry.id });

    expect(country).toBeDefined();
    expect(country?.id).toBe(firstCountry.id);
    expect(country?.name).toBe(firstCountry.name);
  });
});

describe("Restaurants API", () => {
  it("should list all restaurants", async () => {
    const { ctx } = createTestContext();
    const caller = appRouter.createCaller(ctx);

    const restaurants = await caller.restaurants.list();

    expect(restaurants).toBeDefined();
    expect(Array.isArray(restaurants)).toBe(true);
  });

  it("should get restaurants by country", async () => {
    const { ctx } = createTestContext();
    const caller = appRouter.createCaller(ctx);

    const countries = await caller.countries.list();
    const firstCountry = countries[0];

    const restaurants = await caller.restaurants.getByCountry({ 
      countryId: firstCountry.id 
    });

    expect(restaurants).toBeDefined();
    expect(Array.isArray(restaurants)).toBe(true);
  });

  it("should search restaurants by name", async () => {
    const { ctx } = createTestContext();
    const caller = appRouter.createCaller(ctx);

    const results = await caller.restaurants.search({ query: "test" });

    expect(results).toBeDefined();
    expect(Array.isArray(results)).toBe(true);
  });
});

describe("Visits API", () => {
  it("should get user visits", async () => {
    const { ctx } = createTestContext();
    const caller = appRouter.createCaller(ctx);

    const visits = await caller.visits.myVisits();

    expect(visits).toBeDefined();
    expect(Array.isArray(visits)).toBe(true);
  });

  it("should check if restaurant is visited", async () => {
    const { ctx } = createTestContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.visits.checkVisit({ restaurantId: 1 });

    // Result can be undefined or a visit object
    expect(result === undefined || typeof result === 'object').toBe(true);
  });
});

describe("Reviews API", () => {
  it("should get reviews for restaurant", async () => {
    const { ctx } = createTestContext();
    const caller = appRouter.createCaller(ctx);

    const reviews = await caller.reviews.getForRestaurant({ restaurantId: 1 });

    expect(reviews).toBeDefined();
    expect(Array.isArray(reviews)).toBe(true);
  });

  it("should get average rating for restaurant", async () => {
    const { ctx } = createTestContext();
    const caller = appRouter.createCaller(ctx);

    const avgRating = await caller.reviews.getAverageRating({ restaurantId: 1 });

    // Result can be null if no reviews exist
    expect(avgRating === null || typeof avgRating === 'object').toBe(true);
  });

  it("should get user's review for restaurant", async () => {
    const { ctx } = createTestContext();
    const caller = appRouter.createCaller(ctx);

    const review = await caller.reviews.getMyReview({ restaurantId: 1 });

    // Result can be undefined if user hasn't reviewed
    expect(review === undefined || typeof review === 'object').toBe(true);
  });
});

describe("Groups API", () => {
  it("should list public groups", async () => {
    const { ctx } = createTestContext();
    const caller = appRouter.createCaller(ctx);

    const groups = await caller.groups.list();

    expect(groups).toBeDefined();
    expect(Array.isArray(groups)).toBe(true);
  });

  it("should get user's groups", async () => {
    const { ctx } = createTestContext();
    const caller = appRouter.createCaller(ctx);

    const groups = await caller.groups.myGroups();

    expect(groups).toBeDefined();
    expect(Array.isArray(groups)).toBe(true);
  });

  it("should create a new group", async () => {
    const { ctx } = createTestContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.groups.create({
      name: "Test Group",
      description: "A test group for vitest",
      isPublic: true,
    });

    expect(result).toBeDefined();
    expect(result).toHaveProperty("groupId");
    expect(typeof result.groupId).toBe("number");
    expect(result.groupId).toBeGreaterThan(0);
  });

  it("should get group by id", async () => {
    const { ctx } = createTestContext();
    const caller = appRouter.createCaller(ctx);

    // Create a group first
    const { groupId } = await caller.groups.create({
      name: "Test Group for Get",
      description: "Testing get by id",
      isPublic: true,
    });

    const group = await caller.groups.getById({ id: groupId });

    expect(group).toBeDefined();
    expect(group?.id).toBe(groupId);
    expect(group?.name).toBe("Test Group for Get");
  });

  it("should get group members", async () => {
    const { ctx } = createTestContext();
    const caller = appRouter.createCaller(ctx);

    // Create a group first
    const { groupId } = await caller.groups.create({
      name: "Test Group for Members",
      description: "Testing members",
      isPublic: true,
    });

    const members = await caller.groups.getMembers({ groupId });

    expect(members).toBeDefined();
    expect(Array.isArray(members)).toBe(true);
    expect(members.length).toBeGreaterThan(0); // Creator should be a member
    
    // Check creator is owner
    const creator = members[0];
    expect(creator.membership.role).toBe("owner");
  });

  it("should get group visits", async () => {
    const { ctx } = createTestContext();
    const caller = appRouter.createCaller(ctx);

    // Create a group first
    const { groupId } = await caller.groups.create({
      name: "Test Group for Visits",
      description: "Testing visits",
      isPublic: true,
    });

    const visits = await caller.groups.getVisits({ groupId });

    expect(visits).toBeDefined();
    expect(Array.isArray(visits)).toBe(true);
  });
});

describe("Authentication", () => {
  it("should return current user", async () => {
    const { ctx } = createTestContext();
    const caller = appRouter.createCaller(ctx);

    const user = await caller.auth.me();

    expect(user).toBeDefined();
    expect(user?.id).toBe(1);
    expect(user?.email).toBe("test1@example.com");
  });

  it("should logout successfully", async () => {
    const { ctx } = createTestContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.auth.logout();

    expect(result).toEqual({ success: true });
  });
});
