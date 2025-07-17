import { mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { QueryCtx, MutationCtx } from "./_generated/server";

async function getUserProfile(ctx: QueryCtx | MutationCtx) {
  const userId = await getAuthUserId(ctx);
  if (!userId) throw new Error("Not authenticated");

  const profile = await ctx.db
    .query("user_profiles")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .first();

  if (!profile) throw new Error("User profile not found");

  return { userId, profile };
}

export const inviteDriver = mutation({
  args: {
    email: v.string(),
    name: v.string(),
  },
  handler: async (ctx, args) => {
    const { userId, profile } = await getUserProfile(ctx);

    if (profile.role !== "admin" || !profile.companyId) {
      throw new Error("Not authorized");
    }

    const existingInvite = await ctx.db
      .query("invites")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();

    if (existingInvite) {
      throw new Error("This email has already been invited.");
    }

    const existingProfile = await ctx.db
      .query("user_profiles")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();

    if (existingProfile) {
      throw new Error("A user with this email already exists.");
    }

    await ctx.db.insert("invites", {
      email: args.email,
      name: args.name,
      companyId: profile.companyId,
      invitedBy: userId,
      invitedAt: Date.now(),
    });

    return "Invitation created. The user must now register.";
  },
});
