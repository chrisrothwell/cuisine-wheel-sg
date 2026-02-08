import { COOKIE_NAME } from "@shared/const";
import { ENV } from "./_core/env";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import * as db from "./db";
import { TRPCError } from "@trpc/server";
import { resolveAndParseMapsUrl } from "./googleMapsHelper";
import type { Country } from "../drizzle/schema";

// Import countries data - static import should be bundled by esbuild
import countriesDataRaw from "./data/countries.json";

// Transform the JSON data to match the database schema
// Using 'any' type to avoid esbuild issues with kebab-case property names
function transformCountriesData(data: any[]): Country[] {
  return data.map((item: any, index: number) => {
    const alpha2 = item["alpha-2"] as string;
    const alpha3 = item["alpha-3"] as string;
    const subRegion = item["sub-region"] as string | undefined;
    const region = item.region as string | undefined;

    return {
      id: index + 1, // Generate sequential IDs
      name: item.name as string,
      code: alpha2, // Map alpha-2 to code
      alpha2: alpha2,
      alpha3: alpha3,
      description: null,
      region: region && region.trim() !== "" ? region : null,
      subRegion: subRegion && subRegion.trim() !== "" ? subRegion : null,
      unMember: true, // JSON only contains UN member states
      unMembershipStatus: "Member",
      createdAt: new Date(),
    };
  });
}

const countriesData = transformCountriesData(countriesDataRaw);

export const appRouter = router({
  system: systemRouter,
  
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      ctx.res.clearCookie(COOKIE_NAME, {
        httpOnly: true,
        path: "/",
        sameSite: "Lax",
        secure: ENV.isProduction,
      });
      return { success: true } as const;
    }),
  }),

  countries: router({
    list: publicProcedure.query(async () => {
      // Return countries from the imported JSON file
      return countriesData;
    }),
    
    getById: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return await db.getCountryById(input.id);
      }),
    
    getByCode: publicProcedure
      .input(z.object({ code: z.string() }))
      .query(async ({ input }) => {
        return await db.getCountryByCode(input.code);
      }),
  }),

  restaurants: router({
    list: publicProcedure.query(async () => {
      const results = await db.getAllRestaurants();
      // Transform to include country info in restaurant object
      return results.map((r) => ({
        ...r.restaurant,
        country: r.country ? {
          id: r.country.id,
          name: r.country.name,
          alpha2: r.country.alpha2,
          code: r.country.code,
        } : null,
      }));
    }),
    
    getById: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return await db.getRestaurantById(input.id);
      }),
    
    getByCountry: publicProcedure
      .input(z.object({ countryId: z.number() }))
      .query(async ({ input }) => {
        return await db.getRestaurantsByCountry(input.countryId);
      }),
    
    getByCountryCode: publicProcedure
      .input(z.object({ countryCode: z.string() }))
      .query(async ({ input }) => {
        return await db.getRestaurantsByCountryCode(input.countryCode);
      }),
    
    search: publicProcedure
      .input(z.object({ query: z.string() }))
      .query(async ({ input }) => {
        return await db.searchRestaurants(input.query);
      }),

    parseMapsUrl: publicProcedure
      .input(z.object({ url: z.string().url() }))
      .mutation(async ({ input }) => {
        return await resolveAndParseMapsUrl(input.url);
      }),

    create: protectedProcedure
      .input(z.object({
        countryId: z.number(),
        name: z.string(),
        address: z.string(),
        latitude: z.string().optional(),
        longitude: z.string().optional(),
        placeId: z.string().optional(),
        phoneNumber: z.string().optional(),
        website: z.string().optional(),
        priceLevel: z.number().optional(),
        imageUrl: z.string().optional(),
        description: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        return await db.createRestaurant({
          countryId: input.countryId,
          name: input.name,
          address: input.address,
          latitude: input.latitude !== undefined ? Number(input.latitude) : 0,
          longitude: input.longitude !== undefined ? Number(input.longitude) : 0,
          placeId: input.placeId,
          phoneNumber: input.phoneNumber,
          website: input.website,
          priceLevel: input.priceLevel,
          imageUrl: input.imageUrl,
          description: input.description,
        });
      }),
    
    importFromGoogleMaps: protectedProcedure
      .input(z.object({
        name: z.string(),
        address: z.string(),
        latitude: z.string(),
        longitude: z.string(),
        countryId: z.number(), // This is the sequential ID from JSON, need to convert to DB ID
        placeId: z.string().optional(),
        phoneNumber: z.string().optional(),
        website: z.string().optional(),
        priceLevel: z.number().optional(),
        imageUrl: z.string().optional(),
        description: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        // Convert sequential JSON country ID to actual database country ID
        // The input.countryId is the index+1 from the JSON, we need the actual DB ID
        const jsonCountry = countriesData.find(c => c.id === input.countryId);
        if (!jsonCountry) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `Country with ID ${input.countryId} not found`,
          });
        }
        
        console.log('[importFromGoogleMaps] JSON country:', { id: jsonCountry.id, code: jsonCountry.code, alpha2: jsonCountry.alpha2, name: jsonCountry.name });
        
        // Look up the actual database country by alpha2 (2-letter code like "MX")
        // code is numeric (e.g. 484), alpha2 is the 2-letter code
        const dbCountry = await db.getCountryByAlpha2(jsonCountry.alpha2);
        if (!dbCountry) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `Country with alpha2 ${jsonCountry.alpha2} not found in database`,
          });
        }
        
        console.log('[importFromGoogleMaps] Found database country:', { id: dbCountry.id, code: dbCountry.code, alpha2: dbCountry.alpha2, name: dbCountry.name });
        
        const actualCountryId = dbCountry.id;
        
        // Check if restaurant already exists
        const existing = await db.getRestaurantByName(input.name, actualCountryId);
        if (existing) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "Restaurant already exists in database",
          });
        }
        
        // Create new restaurant with the actual database country ID
        const restaurantData = {
          name: input.name,
          address: input.address,
          latitude: Number(input.latitude),
          longitude: Number(input.longitude),
          countryId: actualCountryId, // Use the actual database ID
          placeId: input.placeId,
          phoneNumber: input.phoneNumber,
          website: input.website,
          priceLevel: input.priceLevel,
          imageUrl: input.imageUrl,
          description: input.description,
        };
        
        console.log('[importFromGoogleMaps] JSON country ID:', input.countryId);
        console.log('[importFromGoogleMaps] Database country ID:', actualCountryId);
        console.log('[importFromGoogleMaps] Restaurant data being passed to createRestaurant:', JSON.stringify(restaurantData, null, 2));
        
        const result = await db.createRestaurant(restaurantData);
        
        console.log('[importFromGoogleMaps] createRestaurant returned:', result);
        return result;
      }),
  }),

  visits: router({
    myVisits: protectedProcedure.query(async ({ ctx }) => {
      return await db.getUserVisits(ctx.user.id);
    }),
    
    checkVisit: protectedProcedure
      .input(z.object({ restaurantId: z.number() }))
      .query(async ({ ctx, input }) => {
        const visit = await db.checkUserVisit(ctx.user.id, input.restaurantId);
        if (!visit) return null;
        
        // Get participants for this visit
        const participants = await db.getVisitParticipants(visit.id);
        return {
          ...visit,
          participants: participants.map(p => p.user?.id).filter(Boolean) as number[],
        };
      }),
    
    markVisited: protectedProcedure
      .input(z.object({
        restaurantId: z.number(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        return await db.markVisited(ctx.user.id, input.restaurantId);
      }),
    
    createOrUpdate: protectedProcedure
      .input(z.object({
        restaurantId: z.number(),
        visitedAt: z.date(),
        notes: z.string().optional(),
        groupId: z.number().optional(),
        participantIds: z.array(z.number()).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const existing = await db.checkUserVisit(ctx.user.id, input.restaurantId);
        const participantIds = input.participantIds && input.participantIds.length > 0 
          ? input.participantIds 
          : [ctx.user.id]; // Default to current user if no participants specified
        
        if (existing) {
          await db.updateVisit(existing.id, {
            visitedAt: input.visitedAt,
            notes: input.notes,
            groupId: input.groupId,
            participantIds,
          });
          return { success: true, updated: true };
        } else {
          await db.createVisit({
            restaurantId: input.restaurantId,
            visitedAt: input.visitedAt,
            notes: input.notes,
            groupId: input.groupId,
            participantIds,
          });
          return { success: true, updated: false };
        }
      }),
    
    delete: protectedProcedure
      .input(z.object({ restaurantId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const existing = await db.checkUserVisit(ctx.user.id, input.restaurantId);
        if (existing) {
          await db.deleteVisit(existing.id);
        }
        return { success: true };
      }),
    
    unmarkVisited: protectedProcedure
      .input(z.object({ restaurantId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const existing = await db.checkUserVisit(ctx.user.id, input.restaurantId);
        if (existing) {
          await db.deleteVisit(existing.id);
        }
        return { success: true };
      }),
  }),

  reviews: router({
    getForRestaurant: publicProcedure
      .input(z.object({ restaurantId: z.number() }))
      .query(async ({ input }) => {
        return await db.getRestaurantReviews(input.restaurantId);
      }),
    
    getMyReview: protectedProcedure
      .input(z.object({ restaurantId: z.number() }))
      .query(async ({ ctx, input }) => {
        return await db.getUserReview(ctx.user.id, input.restaurantId);
      }),
    
    getAverageRating: publicProcedure
      .input(z.object({ restaurantId: z.number() }))
      .query(async ({ input }) => {
        return await db.getRestaurantAverageRating(input.restaurantId);
      }),
    
    create: protectedProcedure
      .input(z.object({
        restaurantId: z.number(),
        rating: z.number().min(1).max(5),
        comment: z.string().optional(),
        isPublic: z.boolean().default(true),
      }))
      .mutation(async ({ ctx, input }) => {
        return await db.createReview({
          userId: ctx.user.id,
          restaurantId: input.restaurantId,
          rating: input.rating,
          comment: input.comment,
          isPublic: input.isPublic,
        });
      }),
    
    update: protectedProcedure
      .input(z.object({
        restaurantId: z.number(),
        rating: z.number().min(1).max(5).optional(),
        comment: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        return await db.updateReview(ctx.user.id, input.restaurantId, {
          rating: input.rating,
          comment: input.comment,
        });
      }),
  }),

  groups: router({
    list: publicProcedure.query(async () => {
      return await db.getAllPublicGroups();
    }),
    
    myGroups: protectedProcedure.query(async ({ ctx }) => {
      return await db.getUserGroups(ctx.user.id);
    }),
    
    getById: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return await db.getGroupById(input.id);
      }),
    
    getMembers: publicProcedure
      .input(z.object({ groupId: z.number() }))
      .query(async ({ input }) => {
        return await db.getGroupMembers(input.groupId);
      }),
    
    getVisits: publicProcedure
      .input(z.object({ groupId: z.number() }))
      .query(async ({ input }) => {
        return await db.getGroupVisits(input.groupId);
      }),
    
    create: protectedProcedure
      .input(z.object({
        name: z.string(),
        description: z.string().optional(),
        isPublic: z.boolean().default(true),
        imageUrl: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        // Create group
        const { insertId: groupId } = await db.createGroup({
          name: input.name,
          description: input.description,
          creatorId: ctx.user.id,
          isPublic: input.isPublic,
          imageUrl: input.imageUrl,
        });
        
        // Add creator as owner
        await db.addGroupMember({
          groupId,
          userId: ctx.user.id,
          role: 'owner',
        });
        
        return { groupId };
      }),
    
    join: protectedProcedure
      .input(z.object({ groupId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        // Check if already member
        const members = await db.getGroupMembers(input.groupId);
        const existing = members.some(m => m.user?.id === ctx.user.id);
        if (existing) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "Already a member of this group",
          });
        }
        
        return await db.joinGroup(input.groupId, ctx.user.id);
      }),
  }),
});

export type AppRouter = typeof appRouter;
