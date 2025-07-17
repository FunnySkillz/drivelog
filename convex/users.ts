import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

export const getCurrentUserProfile = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return null;
    }

    const user = await ctx.db.get(userId);
    if (!user) {
      return null;
    }

    const profile = await ctx.db
      .query("user_profiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    return {
      ...user,
      profile,
    };
  },
});

export const updateProfile = mutation({
  args: {
    name: v.string(),
    email: v.string(),
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

    if (profile) {
      await ctx.db.patch(profile._id, {
        name: args.name,
        email: args.email,
      });
    }

    // Also update the user record
    await ctx.db.patch(userId, {
      name: args.name,
      email: args.email,
    });

    return userId;
  },
});

export const ensureUserProfile = mutation({
  args: {},
  handler: async (ctx) => {
    const authId = await getAuthUserId(ctx);
    if (!authId) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", authId))
      .first();

    if (!user?.email) throw new Error("User must have an email");

    const profile = await ctx.db
      .query("user_profiles")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();

    if (profile) return "Profile already exists.";

    const invite = await ctx.db
      .query("invites")
      .withIndex("by_email", (q) => q.eq("email", user.email!))
      .first();

    if (!invite) throw new Error("No invitation found for this email.");

    await ctx.db.insert("user_profiles", {
      userId: user._id,
      companyId: invite.companyId,
      role: "driver",
      name: invite.name,
      email: user.email,
    });

    if (invite) {
      await ctx.db.delete(invite._id);
    }

    return "User profile created.";
  },
});
