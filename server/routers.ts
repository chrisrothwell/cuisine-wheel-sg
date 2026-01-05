import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import * as db from "./db";

import { notifyOwner } from "./_core/notification";

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
      return await db.getAllCountries();
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
        return await db.createRestaurant(input);
      }),
  }),

  visits: router({
    myVisits: protectedProcedure.query(async ({ ctx }) => {
      return await db.getUserVisits(ctx.user.id);
    }),
    
    checkVisit: protectedProcedure
      .input(z.object({ restaurantId: z.number() }))
      .query(async ({ ctx, input }) => {
        return await db.checkUserVisit(ctx.user.id, input.restaurantId);
      }),
    
    markVisited: protectedProcedure
      .input(z.object({
        restaurantId: z.number(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        return await db.createVisit({
          userId: ctx.user.id,
          restaurantId: input.restaurantId,
          notes: input.notes,
        });
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
        const result = await db.createReview({
          userId: ctx.user.id,
          restaurantId: input.restaurantId,
          rating: input.rating,
          comment: input.comment,
          isPublic: input.isPublic,
        });
        
        // Check if restaurant has reached review milestone
        const avgRating = await db.getRestaurantAverageRating(input.restaurantId);
        if (avgRating && avgRating.count >= 10 && avgRating.count % 10 === 0) {
          const restaurant = await db.getRestaurantById(input.restaurantId);
          await notifyOwner({
            title: "Restaurant Review Milestone",
            content: `${restaurant?.name} has reached ${avgRating.count} reviews with an average rating of ${Number(avgRating.avgRating).toFixed(1)} stars!`
          });
        }
        
        return result;
      }),
    
    update: protectedProcedure
      .input(z.object({
        restaurantId: z.number(),
        rating: z.number().min(1).max(5).optional(),
        comment: z.string().optional(),
        isPublic: z.boolean().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { restaurantId, ...data } = input;
        await db.updateReview(ctx.user.id, restaurantId, data);
        return { success: true };
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
        
        // Notify owner about new group
        await notifyOwner({
          title: "New Group Created",
          content: `${ctx.user.name || ctx.user.email} created a new group: "${input.name}"${input.description ? ` - ${input.description}` : ''}`
        });
        
        return { groupId };
      }),
    
    join: protectedProcedure
      .input(z.object({ groupId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        // Check if already member
        const existing = await db.checkGroupMembership(ctx.user.id, input.groupId);
        if (existing) {
          throw new Error("Already a member of this group");
        }
        
        return await db.addGroupMember({
          groupId: input.groupId,
          userId: ctx.user.id,
          role: 'member',
        });
      }),
  }),
});

export type AppRouter = typeof appRouter;
