import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, decimal, boolean, unique, index } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Countries/cuisines available in the spinning wheel
 */
export const countries = mysqlTable("countries", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 100 }).notNull().unique(),
  code: varchar("code", { length: 3 }).notNull().unique(), // ISO country code
  cuisineType: varchar("cuisineType", { length: 100 }).notNull(), // e.g., "Chinese", "Italian"
  flagEmoji: varchar("flagEmoji", { length: 10 }), // Unicode flag emoji
  description: text("description"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Country = typeof countries.$inferSelect;
export type InsertCountry = typeof countries.$inferInsert;

/**
 * Restaurants categorized by country/cuisine
 */
export const restaurants = mysqlTable("restaurants", {
  id: int("id").autoincrement().primaryKey(),
  countryId: int("countryId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  address: text("address").notNull(),
  latitude: decimal("latitude", { precision: 10, scale: 7 }),
  longitude: decimal("longitude", { precision: 10, scale: 7 }),
  placeId: varchar("placeId", { length: 255 }), // Google Maps Place ID
  phoneNumber: varchar("phoneNumber", { length: 50 }),
  website: varchar("website", { length: 500 }),
  priceLevel: int("priceLevel"), // 1-4 scale
  imageUrl: text("imageUrl"),
  description: text("description"),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  countryIdx: index("country_idx").on(table.countryId),
  placeIdIdx: index("place_id_idx").on(table.placeId),
}));

export type Restaurant = typeof restaurants.$inferSelect;
export type InsertRestaurant = typeof restaurants.$inferInsert;
/**
 * User visits to restaurants
 */
export const visits = mysqlTable("visits", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  restaurantId: int("restaurantId").notNull(),
  visitedAt: timestamp("visitedAt").defaultNow().notNull(),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  userRestaurantUnique: unique("user_restaurant_unique").on(table.userId, table.restaurantId),
  userIdx: index("user_idx").on(table.userId),
  restaurantIdx: index("restaurant_idx").on(table.restaurantId),
}));

export type Visit = typeof visits.$inferSelect;
export type InsertVisit = typeof visits.$inferInsert;

/**
 * User ratings and reviews for restaurants
 */
export const reviews = mysqlTable("reviews", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  restaurantId: int("restaurantId").notNull(),
  rating: int("rating").notNull(), // 1-5 scale
  comment: text("comment"),
  isPublic: boolean("isPublic").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  userRestaurantUnique: unique("user_restaurant_review_unique").on(table.userId, table.restaurantId),
  userIdx: index("review_user_idx").on(table.userId),
  restaurantIdx: index("review_restaurant_idx").on(table.restaurantId),
  ratingIdx: index("rating_idx").on(table.rating),
}));

export type Review = typeof reviews.$inferSelect;
export type InsertReview = typeof reviews.$inferInsert;

/**
 * Groups for collaborative restaurant exploration
 */
export const groups = mysqlTable("groups", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  creatorId: int("creatorId").notNull(),
  isPublic: boolean("isPublic").default(true).notNull(), // Public groups visible to all
  imageUrl: text("imageUrl"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  creatorIdx: index("creator_idx").on(table.creatorId),
}));

export type Group = typeof groups.$inferSelect;
export type InsertGroup = typeof groups.$inferInsert;

/**
 * Group memberships
 */
export const groupMembers = mysqlTable("group_members", {
  id: int("id").autoincrement().primaryKey(),
  groupId: int("groupId").notNull(),
  userId: int("userId").notNull(),
  role: mysqlEnum("role", ["owner", "admin", "member"]).default("member").notNull(),
  joinedAt: timestamp("joinedAt").defaultNow().notNull(),
}, (table) => ({
  groupUserUnique: unique("group_user_unique").on(table.groupId, table.userId),
  groupIdx: index("group_idx").on(table.groupId),
  userIdx: index("member_user_idx").on(table.userId),
}));

export type GroupMember = typeof groupMembers.$inferSelect;
export type InsertGroupMember = typeof groupMembers.$inferInsert;
