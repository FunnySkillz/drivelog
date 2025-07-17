import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

export const create = mutation({
  args: {
    name: v.string(),
    address: v.optional(v.string()),
    industry: v.optional(v.string()),
    isRentalCompany: v.boolean(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const companyId = await ctx.db.insert("companies", {
      name: args.name,
      address: args.address,
      industry: args.industry,
      isRentalCompany: args.isRentalCompany,
    });

    // Create or update user profile as admin
    const existingProfile = await ctx.db
      .query("user_profiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    const user = await ctx.db.get(userId);
    if (!user) {
      throw new Error("User not found");
    }

    if (existingProfile) {
      await ctx.db.patch(existingProfile._id, {
        companyId,
        role: "admin",
      });
    } else {
      await ctx.db.insert("user_profiles", {
        userId,
        companyId,
        role: "admin",
        name: user.name || "Admin",
        email: user.email || "",
      });
    }

    return companyId;
  },
});

export const getByUser = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return null;
    }

    const profile = await ctx.db
      .query("user_profiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (!profile?.companyId) {
      return null;
    }

    return await ctx.db.get(profile.companyId);
  },
});

export const update = mutation({
  args: {
    companyId: v.id("companies"),
    name: v.string(),
    address: v.optional(v.string()),
    industry: v.optional(v.string()),
    isRentalCompany: v.boolean(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const profile = await ctx.db
      .query("user_profiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (!profile || profile.role !== "admin" || profile.companyId !== args.companyId) {
      throw new Error("Not authorized");
    }

    await ctx.db.patch(args.companyId, {
      name: args.name,
      address: args.address,
      industry: args.industry,
      isRentalCompany: args.isRentalCompany,
    });

    return args.companyId;
  },
});
