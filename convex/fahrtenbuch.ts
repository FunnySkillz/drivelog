import { mutation, query, QueryCtx, MutationCtx } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { Id } from "./_generated/dataModel";
import { UserProfile } from "../src/components/types/company";

async function getUserProfile(ctx: QueryCtx | MutationCtx) {
  const userId = await getAuthUserId(ctx);
  if (!userId) {
    throw new Error("Not authenticated");
  }

  const profile = await ctx.db
    .query("user_profiles")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .first();

  if (!profile) {
    throw new Error("User profile not found");
  }

  return { userId, profile };
}

async function checkVehicleAccess(ctx: QueryCtx | MutationCtx, userId: Id<"users">, vehicleId: Id<"vehicles">, profile: UserProfile) {
  const vehicle = await ctx.db.get(vehicleId);
  if (!vehicle) {
    throw new Error("Vehicle not found");
  }

  if (profile.role === "admin" && profile.companyId === vehicle.companyId) {
    return vehicle;
  }

  if (profile.role === "driver") {
    const assignment = await ctx.db
      .query("vehicle_assignments")
      .withIndex("by_user_and_vehicle", (q) => 
        q.eq("userId", userId).eq("vehicleId", vehicleId))
      .first();

    if (assignment || vehicle.isPublic) {
      return vehicle;
    }
  }

  throw new Error("Not authorized to access this vehicle");
}

export const create = mutation({
  args: {
    vehicleId: v.id("vehicles"),
    date: v.string(),
    timeStart: v.string(),
    timeEnd: v.string(),
    locationStart: v.string(),
    locationEnd: v.string(),
    kmStart: v.number(),
    kmEnd: v.number(),
    purpose: v.string(),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { userId, profile } = await getUserProfile(ctx);

    if (!profile.companyId) {
      throw new Error("User not associated with a company");
    }

    // Validate vehicle access
    await checkVehicleAccess(ctx, userId, args.vehicleId, profile);

    // Validate km values
    if (args.kmStart >= args.kmEnd) {
      throw new Error("End kilometers must be greater than start kilometers");
    }

    return await ctx.db.insert("fahrtenbuch_entries", {
      userId,
      vehicleId: args.vehicleId,
      companyId: profile.companyId,
      date: args.date,
      timeStart: args.timeStart,
      timeEnd: args.timeEnd,
      locationStart: args.locationStart,
      locationEnd: args.locationEnd,
      kmStart: args.kmStart,
      kmEnd: args.kmEnd,
      purpose: args.purpose,
      notes: args.notes,
    });
  },
});

export const listByUser = query({
  args: {},
  handler: async (ctx) => {
    const { userId } = await getUserProfile(ctx);

    const entries = await ctx.db
      .query("fahrtenbuch_entries")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();

    // Get vehicle info for each entry
    const entriesWithVehicles = await Promise.all(
      entries.map(async (entry) => {
        const vehicle = await ctx.db.get(entry.vehicleId);
        return {
          ...entry,
          vehicle,
        };
      })
    );

    return entriesWithVehicles;
  },
});

export const listByVehicle = query({
  args: { vehicleId: v.id("vehicles") },
  handler: async (ctx, args) => {
    const { userId, profile } = await getUserProfile(ctx);

    // Check vehicle access
    await checkVehicleAccess(ctx, userId, args.vehicleId, profile);

    const entries = await ctx.db
      .query("fahrtenbuch_entries")
      .withIndex("by_vehicle", (q) => q.eq("vehicleId", args.vehicleId))
      .order("desc")
      .collect();

    // Get user info for each entry
    const entriesWithUsers = await Promise.all(
      entries.map(async (entry) => {
        const userProfile = await ctx.db
          .query("user_profiles")
          .withIndex("by_user", (q) => q.eq("userId", entry.userId))
          .first();
        return {
          ...entry,
          user: userProfile,
        };
      })
    );

    return entriesWithUsers;
  },
});

export const listByCompany = query({
  args: {
    vehicleId: v.optional(v.id("vehicles")),
    userId: v.optional(v.id("users")),
    dateFrom: v.optional(v.string()),
    dateTo: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { profile } = await getUserProfile(ctx);

    if (profile.role !== "admin" || !profile.companyId) {
      throw new Error("Not authorized");
    }

    let entries = await ctx.db
      .query("fahrtenbuch_entries")
      .withIndex("by_company", (q) => q.eq("companyId", profile.companyId!))
      .order("desc")
      .collect();

    // Apply filters
    if (args.vehicleId) {
      entries = entries.filter(e => e.vehicleId === args.vehicleId);
    }

    if (args.userId) {
      entries = entries.filter(e => e.userId === args.userId);
    }

    if (args.dateFrom) {
      entries = entries.filter(e => e.date >= args.dateFrom!);
    }

    if (args.dateTo) {
      entries = entries.filter(e => e.date <= args.dateTo!);
    }

    // Get additional info
    const entriesWithDetails = await Promise.all(
      entries.map(async (entry) => {
        const [vehicle, userProfile] = await Promise.all([
          ctx.db.get(entry.vehicleId),
          ctx.db
            .query("user_profiles")
            .withIndex("by_user", (q) => q.eq("userId", entry.userId))
            .first(),
        ]);

        return {
          ...entry,
          vehicle,
          user: userProfile,
        };
      })
    );

    return entriesWithDetails;
  },
});

export const update = mutation({
  args: {
    entryId: v.id("fahrtenbuch_entries"),
    date: v.string(),
    timeStart: v.string(),
    timeEnd: v.string(),
    locationStart: v.string(),
    locationEnd: v.string(),
    kmStart: v.number(),
    kmEnd: v.number(),
    purpose: v.string(),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { userId, profile } = await getUserProfile(ctx);

    const entry = await ctx.db.get(args.entryId);
    if (!entry) {
      throw new Error("Entry not found");
    }

    // Check authorization
    if (profile.role === "driver" && entry.userId !== userId) {
      throw new Error("Not authorized to edit this entry");
    }

    if (profile.role === "admin" && entry.companyId !== profile.companyId) {
      throw new Error("Not authorized to edit this entry");
    }

    // Validate km values
    if (args.kmStart >= args.kmEnd) {
      throw new Error("End kilometers must be greater than start kilometers");
    }

    await ctx.db.patch(args.entryId, {
      date: args.date,
      timeStart: args.timeStart,
      timeEnd: args.timeEnd,
      locationStart: args.locationStart,
      locationEnd: args.locationEnd,
      kmStart: args.kmStart,
      kmEnd: args.kmEnd,
      purpose: args.purpose,
      notes: args.notes,
    });

    return args.entryId;
  },
});

export const remove = mutation({
  args: { entryId: v.id("fahrtenbuch_entries") },
  handler: async (ctx, args) => {
    const { userId, profile } = await getUserProfile(ctx);

    const entry = await ctx.db.get(args.entryId);
    if (!entry) {
      throw new Error("Entry not found");
    }

    // Check authorization
    if (profile.role === "driver" && entry.userId !== userId) {
      throw new Error("Not authorized to delete this entry");
    }

    if (profile.role === "admin" && entry.companyId !== profile.companyId) {
      throw new Error("Not authorized to delete this entry");
    }

    // Delete associated files
    const files = await ctx.db
      .query("fahrtenbuch_files")
      .withIndex("by_entry", (q) => q.eq("entryId", args.entryId))
      .collect();

    for (const file of files) {
      await ctx.db.delete(file._id);
    }

    await ctx.db.delete(args.entryId);
  },
});

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});

export const addFile = mutation({
  args: {
    entryId: v.id("fahrtenbuch_entries"),
    storageId: v.id("_storage"),
    fileName: v.string(),
    fileType: v.union(v.literal("image"), v.literal("pdf")),
  },
  handler: async (ctx, args) => {
    const { userId, profile } = await getUserProfile(ctx);

    const entry = await ctx.db.get(args.entryId);
    if (!entry) {
      throw new Error("Entry not found");
    }

    // Check authorization
    if (profile.role === "driver" && entry.userId !== userId) {
      throw new Error("Not authorized to add files to this entry");
    }

    if (profile.role === "admin" && entry.companyId !== profile.companyId) {
      throw new Error("Not authorized to add files to this entry");
    }

    return await ctx.db.insert("fahrtenbuch_files", {
      entryId: args.entryId,
      storageId: args.storageId,
      fileName: args.fileName,
      fileType: args.fileType,
      uploadedAt: Date.now(),
    });
  },
});

export const getFilesByEntry = query({
  args: { entryId: v.id("fahrtenbuch_entries") },
  handler: async (ctx, args) => {
    const { userId, profile } = await getUserProfile(ctx);

    const entry = await ctx.db.get(args.entryId);
    if (!entry) {
      throw new Error("Entry not found");
    }

    // Check authorization
    if (profile.role === "driver" && entry.userId !== userId) {
      throw new Error("Not authorized to view files for this entry");
    }

    if (profile.role === "admin" && entry.companyId !== profile.companyId) {
      throw new Error("Not authorized to view files for this entry");
    }

    const files = await ctx.db
      .query("fahrtenbuch_files")
      .withIndex("by_entry", (q) => q.eq("entryId", args.entryId))
      .collect();

    // Get URLs for files
    const filesWithUrls = await Promise.all(
      files.map(async (file) => {
        const url = await ctx.storage.getUrl(file.storageId);
        return {
          ...file,
          url,
        };
      })
    );

    return filesWithUrls;
  },
});
