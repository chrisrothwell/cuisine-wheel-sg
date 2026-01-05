import { eq, and, like } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, countries, restaurants, visits, reviews, groups, groupMembers, InsertCountry, InsertRestaurant, InsertVisit, InsertReview, InsertGroup, InsertGroupMember } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ===== USER OPERATIONS =====

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// ===== COUNTRY OPERATIONS =====

export async function getAllCountries() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(countries).orderBy(countries.name);
}

export async function getCountryById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(countries).where(eq(countries.id, id)).limit(1);
  return result[0];
}

export async function createCountry(country: InsertCountry) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.insert(countries).values(country);
}

// ===== RESTAURANT OPERATIONS =====

export async function getAllRestaurants() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(restaurants);
}

export async function getRestaurantsByCountry(countryId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(restaurants).where(eq(restaurants.countryId, countryId));
}

export async function getRestaurantById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(restaurants).where(eq(restaurants.id, id)).limit(1);
  return result[0];
}

export async function getRestaurantByName(name: string, countryId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(restaurants).where(
    and(
      eq(restaurants.name, name),
      eq(restaurants.countryId, countryId)
    )
  ).limit(1);
  return result[0];
}

export async function createRestaurant(restaurant: InsertRestaurant) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(restaurants).values(restaurant);
  return result;
}

export async function searchRestaurants(query: string) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(restaurants).where(
    like(restaurants.name, `%${query}%`)
  ).limit(20);
}

// ===== VISIT OPERATIONS =====

export async function getUserVisits(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(visits).where(eq(visits.userId, userId));
}

export async function getRestaurantVisits(restaurantId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(visits).where(eq(visits.restaurantId, restaurantId));
}

export async function checkUserVisit(userId: number, restaurantId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(visits).where(
    and(
      eq(visits.userId, userId),
      eq(visits.restaurantId, restaurantId)
    )
  ).limit(1);
  return result[0];
}

export async function markVisited(userId: number, restaurantId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.insert(visits).values({
    userId,
    restaurantId,
    visitedAt: new Date(),
  });
}

export async function deleteVisit(userId: number, restaurantId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.delete(visits).where(
    and(
      eq(visits.userId, userId),
      eq(visits.restaurantId, restaurantId)
    )
  );
}

// ===== REVIEW OPERATIONS =====

export async function getRestaurantReviews(restaurantId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select({
    review: reviews,
    user: users,
  }).from(reviews)
    .leftJoin(users, eq(reviews.userId, users.id))
    .where(eq(reviews.restaurantId, restaurantId))
    .orderBy(reviews.createdAt);
}

export async function getUserReview(userId: number, restaurantId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(reviews).where(
    and(
      eq(reviews.userId, userId),
      eq(reviews.restaurantId, restaurantId)
    )
  ).limit(1);
  return result[0];
}

export async function createReview(review: InsertReview) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.insert(reviews).values(review);
}

export async function updateReview(userId: number, restaurantId: number, data: Partial<InsertReview>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.update(reviews).set(data).where(
    and(
      eq(reviews.userId, userId),
      eq(reviews.restaurantId, restaurantId)
    )
  );
}

export async function getRestaurantAverageRating(restaurantId: number) {
  const db = await getDb();
  if (!db) return null;
  
  const result = await db.select({
    avgRating: reviews.rating,
    count: reviews.id,
  }).from(reviews)
    .where(eq(reviews.restaurantId, restaurantId));

  if (result.length === 0) return null;

  const avgRating = result.reduce((sum, r) => sum + (r.avgRating || 0), 0) / result.length;
  return {
    avgRating: avgRating.toFixed(1),
    count: result.length,
  };
}

// ===== GROUP OPERATIONS =====

export async function getAllPublicGroups() {
  const db = await getDb();
  if (!db) return [];
  return await db.select({
    group: groups,
    creator: users,
    memberCount: groupMembers.id,
  }).from(groups)
    .leftJoin(users, eq(groups.creatorId, users.id))
    .leftJoin(groupMembers, eq(groups.id, groupMembers.groupId))
    .where(eq(groups.isPublic, true));
}

export async function getGroupById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(groups).where(eq(groups.id, id)).limit(1);
  return result[0];
}

export async function getUserGroups(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select({
    group: groups,
    membership: groupMembers,
    creator: users
  })
    .from(groupMembers)
    .leftJoin(groups, eq(groupMembers.groupId, groups.id))
    .leftJoin(users, eq(groups.creatorId, users.id))
    .where(eq(groupMembers.userId, userId));
}

export async function createGroup(group: InsertGroup) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(groups).values(group);
  // Return insertId as number
  const insertId = (result as any)[0]?.insertId || (result as any).insertId;
  return { insertId: Number(insertId) };
}

export async function getGroupMembers(groupId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select({
    membership: groupMembers,
    user: users,
  }).from(groupMembers)
    .leftJoin(users, eq(groupMembers.userId, users.id))
    .where(eq(groupMembers.groupId, groupId));
}

export async function addGroupMember(member: InsertGroupMember) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(groupMembers).values(member);
  return result;
}

export async function getGroupVisits(groupId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select({
    visit: visits,
    user: users,
    restaurant: restaurants,
  }).from(visits)
    .leftJoin(users, eq(visits.userId, users.id))
    .leftJoin(restaurants, eq(visits.restaurantId, restaurants.id))
    .leftJoin(groupMembers, eq(visits.userId, groupMembers.userId))
    .where(eq(groupMembers.groupId, groupId));
}

export async function joinGroup(groupId: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.insert(groupMembers).values({
    groupId,
    userId,
    role: 'member',
  });
}
