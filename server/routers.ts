import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import * as db from "./db";
import { TRPCError } from "@trpc/server";
import { resolveAndParseMapsUrl } from "./googleMapsHelper";
import type { Country } from "../drizzle/schema";

// Import countries data - static import should be bundled by esbuild
import countriesDataRaw from "../../client/src/countries.json";

// Transform the JSON data to match the database schema
// Using 'any' type to avoid esbuild issues with kebab-case property names
function transformCountriesData(data: any[]): Country[] {
  return data.map((item: any, index: number) => {
    const alpha2 = item["alpha-2"] as string;
    const alpha3 = item["alpha-3"] as string;
    const subRegion = item["sub-region"] as string | undefined;
    const region = item.region as string | undefined;
    const unMember = item.un_member as boolean | undefined;
    const unMembershipStatus = item.un_membership_status as string | undefined;
    
    return {
      id: index + 1, // Generate sequential IDs
      name: item.name as string,
      code: alpha2, // Map alpha-2 to code
      alpha2: alpha2,
      alpha3: alpha3,
      description: null, // Not available in JSON
      region: region && region.trim() !== "" ? region : null,
      subRegion: subRegion && subRegion.trim() !== "" ? subRegion : null,
      unMember: unMember ?? false,
      unMembershipStatus: unMembershipStatus && unMembershipStatus.trim() !== "" ? unMembershipStatus : null,
      createdAt: new Date(), // Use current date as default
    };
  });
}

const countriesData = transformCountriesData(countriesDataRaw);

export const appRouter = router({
  system: systemRouter,
  
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
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
  }),

  restaurants: router({
    list: publicProcedure.query(async () => {
      return await db.getAllRestaurants();
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
        countryId: z.number(),
        placeId: z.string().optional(),
        phoneNumber: z.string().optional(),
        website: z.string().optional(),
        priceLevel: z.number().optional(),
        imageUrl: z.string().optional(),
        description: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        // Check if restaurant already exists
        const existing = await db.getRestaurantByName(input.name, input.countryId);
        if (existing) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "Restaurant already exists in database",
          });
        }
        
        // Create new restaurant
        const result = await db.createRestaurant({
          name: input.name,
          address: input.address,
          latitude: Number(input.latitude),
          longitude: Number(input.longitude),
          countryId: input.countryId,
          placeId: input.placeId,
          phoneNumber: input.phoneNumber,
          website: input.website,
          priceLevel: input.priceLevel,
          imageUrl: input.imageUrl,
          description: input.description,
        });
        
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
        await db.deleteVisit(ctx.user.id, input.restaurantId);
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
