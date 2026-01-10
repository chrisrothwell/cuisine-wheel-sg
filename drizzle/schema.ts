import { sqliteTable, text, integer, real, uniqueIndex, index, unique } from "drizzle-orm/sqlite-core";

/**
 * Core user table
 */
export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  openId: text("open_id").notNull().unique(),
  name: text("name"),
  email: text("email"),
  loginMethod: text("login_method"),
  // SQLite doesn't have Enums, use text with validation in your app logic
  role: text("role").$type<"user" | "admin">().default("user").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).$defaultFn(() => new Date()).$onUpdateFn(() => new Date()).notNull(),
  lastSignedIn: integer("last_signed_in", { mode: "timestamp" }).$defaultFn(() => new Date()).notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
/**
 * Countries/cuisines available in the spinning wheel
 */
export const countries = sqliteTable("countries", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull().unique(),
  // Ensure this is ISO2 (2 chars) to match your Map and Flag logic
  code: text("code").notNull().unique(),
  description: text("description"),
  region: text("region"),
  subRegion: text("sub_region"),
  unMember: integer("un_member", { mode: "boolean" }).default(false).notNull(),
  unMembershipStatus: text("un_membership_status"),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()).notNull(),
});


export type Country = typeof countries.$inferSelect;
export type InsertCountry = typeof countries.$inferInsert;

/**
 * Restaurants categorized by country/cuisine
 */
export const restaurants = sqliteTable("restaurants", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  countryId: integer("country_id").notNull().references(() => countries.id),
  name: text("name").notNull(),
  address: text("address").notNull(),
  latitude: real("latitude").notNull(),
  longitude: real("longitude").notNull(),
  placeId: text("place_id"), 
  phoneNumber: text("phone_number"),
  website: text("website"),
  priceLevel: integer("price_level"), 
  imageUrl: text("image_url"),
  description: text("description"),
  isActive: integer("is_active", { mode: "boolean" }).default(true).notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).$defaultFn(() => new Date()).$onUpdateFn(() => new Date()).notNull(),
}, (table) => [
  index("restaurant_country_idx").on(table.countryId),
  index("restaurant_place_id_idx").on(table.placeId),
]);

export type Restaurant = typeof restaurants.$inferSelect;
export type InsertRestaurant = typeof restaurants.$inferInsert;
/**
 * User visits and reviews (Combined logic or separate as per your preference)
 */
export const visits = sqliteTable("visits", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("userId").notNull(),
  restaurantId: integer("restaurantId").notNull(),
  visitedAt: integer("visited_at", { mode: "timestamp" }).$defaultFn(() => new Date()).notNull(),
  notes: text("notes"),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()).notNull(),
}, (table) => [
  unique("user_restaurant_unique").on(table.userId, table.restaurantId),
  index("user_idx").on(table.userId),
  index("restaurant_idx").on(table.restaurantId),
]);

export type Visit = typeof visits.$inferSelect;
export type InsertVisit = typeof visits.$inferInsert;

/**
 * User ratings and reviews for restaurants
 */
export const reviews = sqliteTable("reviews", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("userId").notNull(),
  restaurantId: integer("restaurantId").notNull(),
  rating: integer("rating").notNull(), // 1-5 scale
  comment: text("comment"),
  isPublic: integer("is_public", { mode: "boolean" }).default(true).notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).$defaultFn(() => new Date()).$onUpdateFn(() => new Date()).notNull(),
}, (table) => [
  unique("user_restaurant_review_unique").on(table.userId, table.restaurantId),
]);

export type Review = typeof reviews.$inferSelect;
export type InsertReview = typeof reviews.$inferInsert;

/**
 * Groups
 */
export const groups = sqliteTable("groups", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  description: text("description"),
  creatorId: integer("creator_id").notNull().references(() => users.id),
  isPublic: integer("is_public", { mode: "boolean" }).default(true).notNull(),
  imageUrl: text("image_url"),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()).notNull(),
});


export type Group = typeof groups.$inferSelect;
export type InsertGroup = typeof groups.$inferInsert;

export const groupMembers = sqliteTable("group_members", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  groupId: integer("group_id").notNull().references(() => groups.id),
  userId: integer("user_id").notNull().references(() => users.id),
  role: text("role").$type<"owner" | "admin" | "member">().default("member").notNull(),
  joinedAt: integer("joined_at", { mode: "timestamp" }).$defaultFn(() => new Date()).notNull(),
}, (table) => [
  unique("group_user_unique").on(table.groupId, table.userId),
]);

export type GroupMember = typeof groupMembers.$inferSelect;
export type InsertGroupMember = typeof groupMembers.$inferInsert;