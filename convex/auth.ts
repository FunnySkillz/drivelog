import { convexAuth, getAuthUserId } from "convex-helpers/server/auth";
import { Password } from "convex-helpers/server/auth";
import { Anonymous } from "convex-helpers/server/auth";
import { query } from "./_generated/server";

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [Password, Anonymous],
});

export const loggedInUser = query({
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const user = await ctx.db.get(userId);
    return user ?? null;
  },
});
