import { eq, and, like } from "drizzle-orm";
import { drizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";
import { InsertUser, users, countries, restaurants, visits, reviews, groups, groupMembers, visitParticipants, InsertCountry, InsertRestaurant, InsertVisit, InsertReview, InsertGroup, InsertGroupMember, InsertVisitParticipant } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      const client = createClient({
        url: process.env.DATABASE_URL,
        authToken: process.env.DATABASE_AUTH_TOKEN, // Optional for local, required for Turso Cloud
      });
      _db = drizzle(client);
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

    await db.insert(users).values(values).onConflictDoUpdate({
      target: users.openId,
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
  // Only return countries that are UN members
  return await db
    .select()
    .from(countries)
    .where(eq(countries.unMember, true))
    .orderBy(countries.name);
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
  // Get visits where user is a participant
  const result = await db.select({
    visit: visits,
  })
    .from(visits)
    .innerJoin(visitParticipants, eq(visits.id, visitParticipants.visitId))
    .where(eq(visitParticipants.userId, userId));
  // Return just the visits
  return result.map(r => r.visit);
}

export async function getRestaurantVisits(restaurantId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(visits).where(eq(visits.restaurantId, restaurantId));
}

export async function checkUserVisit(userId: number, restaurantId: number) {
  const db = await getDb();
  if (!db) return null;
  // Check if user is a participant in any visit for this restaurant
  const result = await db.select({
    visit: visits,
  })
    .from(visits)
    .innerJoin(visitParticipants, eq(visits.id, visitParticipants.visitId))
    .where(
      and(
        eq(visitParticipants.userId, userId),
        eq(visits.restaurantId, restaurantId)
      )
    )
    .limit(1);
  return result[0]?.visit || null;
}

export async function getVisitParticipants(visitId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select({
    participant: visitParticipants,
    user: users,
  })
    .from(visitParticipants)
    .leftJoin(users, eq(visitParticipants.userId, users.id))
    .where(eq(visitParticipants.visitId, visitId));
}

export async function createVisit(data: {
  restaurantId: number;
  groupId?: number;
  visitedAt?: Date;
  notes?: string;
  participantIds: number[];
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Create the visit and return the inserted row
  const visitResult = await db.insert(visits).values({
    restaurantId: data.restaurantId,
    groupId: data.groupId || null,
    visitedAt: data.visitedAt || new Date(),
    notes: data.notes || null,
  }).returning({ id: visits.id });
  
  const visitId = visitResult[0]?.id;
  
  if (!visitId) {
    throw new Error("Failed to create visit: no ID returned");
  }
  
  // Add participants
  if (data.participantIds.length > 0) {
    await db.insert(visitParticipants).values(
      data.participantIds.map(userId => ({
        visitId: visitId,
        userId,
      }))
    );
  }
  
  return { insertId: visitId };
}

export async function updateVisit(visitId: number, data: {
  visitedAt?: Date;
  notes?: string;
  groupId?: number;
  participantIds?: number[];
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const updateData: any = {};
  if (data.visitedAt !== undefined) updateData.visitedAt = data.visitedAt;
  if (data.notes !== undefined) updateData.notes = data.notes;
  if (data.groupId !== undefined) updateData.groupId = data.groupId || null;
  
  await db.update(visits).set(updateData).where(eq(visits.id, visitId));
  
  // Update participants if provided
  if (data.participantIds !== undefined) {
    // Delete existing participants
    await db.delete(visitParticipants).where(eq(visitParticipants.visitId, visitId));
    
    // Add new participants
    if (data.participantIds.length > 0) {
      await db.insert(visitParticipants).values(
        data.participantIds.map(userId => ({
          visitId,
          userId,
        }))
      );
    }
  }
}

export async function deleteVisit(visitId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Delete participants first (foreign key constraint)
  await db.delete(visitParticipants).where(eq(visitParticipants.visitId, visitId));
  
  // Delete the visit
  return await db.delete(visits).where(eq(visits.id, visitId));
}

// Legacy function for backward compatibility
export async function markVisited(userId: number, restaurantId: number, visitedAt?: Date, notes?: string) {
  return await createVisit({
    restaurantId,
    visitedAt,
    notes,
    participantIds: [userId],
  });
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
  const result = await db.insert(groups).values(group).returning({ id: groups.id });
  const insertId = result[0]?.id;
  if (!insertId) {
    throw new Error("Failed to create group: no ID returned");
  }
  return { insertId };
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
