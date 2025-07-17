import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

import { QueryCtx, MutationCtx } from "./_generated/server";

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

export const create = mutation({
  args: {
    brand: v.string(),
    model: v.string(),
    licensePlate: v.string(),
    vin: v.string(),
    fuelType: v.union(
      v.literal("Petrol"),
      v.literal("Diesel"),
      v.literal("Electric"),
      v.literal("Hybrid")
    ),
    year: v.number(),
    mileage: v.number(),
    isPublic: v.boolean(),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { profile } = await getUserProfile(ctx);

    if (profile.role !== "admin" || !profile.companyId) {
      throw new Error("Not authorized");
    }

    return await ctx.db.insert("vehicles", {
      companyId: profile.companyId,
      brand: args.brand,
      model: args.model,
      licensePlate: args.licensePlate,
      vin: args.vin,
      fuelType: args.fuelType,
      year: args.year,
      mileage: args.mileage,
      isPublic: args.isPublic,
      notes: args.notes,
    });
  },
});

export const listByCompany = query({
  args: {},
  handler: async (ctx) => {
    const { profile } = await getUserProfile(ctx);

    if (!profile.companyId) {
      return [];
    }

    return await ctx.db
      .query("vehicles")
      .withIndex("by_company", (q) => q.eq("companyId", profile.companyId!))
      .collect();
  },
});

export const listAssignedToUser = query({
  args: {},
  handler: async (ctx) => {
    const { userId, profile } = await getUserProfile(ctx);

    if (!profile.companyId) {
      return [];
    }

    // Get assigned vehicles
    const assignments = await ctx.db
      .query("vehicle_assignments")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    const assignedVehicleIds = assignments.map(a => a.vehicleId);

    // Get public vehicles in the company
    const publicVehicles = await ctx.db
      .query("vehicles")
      .withIndex("by_company", (q) => q.eq("companyId", profile.companyId!))
      .filter((q) => q.eq(q.field("isPublic"), true))
      .collect();

    // Get assigned vehicles
    const assignedVehicles = await Promise.all(
      assignedVehicleIds.map(id => ctx.db.get(id))
    );

    // Combine and deduplicate
    const allVehicles = [...assignedVehicles.filter(Boolean), ...publicVehicles];
    const uniqueVehicles = allVehicles.filter((vehicle, index, self) => 
      index === self.findIndex(v => v?._id === vehicle?._id)
    );

    return uniqueVehicles;
  },
});

export const getById = query({
  args: { vehicleId: v.id("vehicles") },
  handler: async (ctx, args) => {
    const { userId, profile } = await getUserProfile(ctx);

    const vehicle = await ctx.db.get(args.vehicleId);
    if (!vehicle) {
      return null;
    }

    // Check access
    if (profile.role === "admin" && profile.companyId === vehicle.companyId) {
      return vehicle;
    }

    if (profile.role === "driver") {
      // Check if assigned or public
      const assignment = await ctx.db
        .query("vehicle_assignments")
        .withIndex("by_user_and_vehicle", (q) => 
          q.eq("userId", userId).eq("vehicleId", args.vehicleId))
        .first();

      if (assignment || vehicle.isPublic) {
        return vehicle;
      }
    }

    throw new Error("Not authorized to access this vehicle");
  },
});

export const update = mutation({
  args: {
    vehicleId: v.id("vehicles"),
    brand: v.string(),
    model: v.string(),
    licensePlate: v.string(),
    vin: v.string(),
    fuelType: v.union(
      v.literal("Petrol"),
      v.literal("Diesel"),
      v.literal("Electric"),
      v.literal("Hybrid")
    ),
    year: v.number(),
    mileage: v.number(),
    isPublic: v.boolean(),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { profile } = await getUserProfile(ctx);

    if (profile.role !== "admin") {
      throw new Error("Not authorized");
    }

    const vehicle = await ctx.db.get(args.vehicleId);
    if (!vehicle || vehicle.companyId !== profile.companyId) {
      throw new Error("Vehicle not found or not authorized");
    }

    await ctx.db.patch(args.vehicleId, {
      brand: args.brand,
      model: args.model,
      licensePlate: args.licensePlate,
      vin: args.vin,
      fuelType: args.fuelType,
      year: args.year,
      mileage: args.mileage,
      isPublic: args.isPublic,
      notes: args.notes,
    });

    return args.vehicleId;
  },
});

export const remove = mutation({
  args: { vehicleId: v.id("vehicles") },
  handler: async (ctx, args) => {
    const { profile } = await getUserProfile(ctx);

    if (profile.role !== "admin") {
      throw new Error("Not authorized");
    }

    const vehicle = await ctx.db.get(args.vehicleId);
    if (!vehicle || vehicle.companyId !== profile.companyId) {
      throw new Error("Vehicle not found or not authorized");
    }

    // Remove all assignments
    const assignments = await ctx.db
      .query("vehicle_assignments")
      .withIndex("by_vehicle", (q) => q.eq("vehicleId", args.vehicleId))
      .collect();

    for (const assignment of assignments) {
      await ctx.db.delete(assignment._id);
    }

    await ctx.db.delete(args.vehicleId);
  },
});

export const assignToUser = mutation({
  args: {
    vehicleId: v.id("vehicles"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const { userId: adminId, profile } = await getUserProfile(ctx);

    if (profile.role !== "admin") {
      throw new Error("Not authorized");
    }

    const vehicle = await ctx.db.get(args.vehicleId);
    if (!vehicle || vehicle.companyId !== profile.companyId) {
      throw new Error("Vehicle not found or not authorized");
    }

    // Check if already assigned
    const existing = await ctx.db
      .query("vehicle_assignments")
      .withIndex("by_user_and_vehicle", (q) => 
        q.eq("userId", args.userId).eq("vehicleId", args.vehicleId))
      .first();

    if (existing) {
      throw new Error("Vehicle already assigned to this user");
    }

    return await ctx.db.insert("vehicle_assignments", {
      userId: args.userId,
      vehicleId: args.vehicleId,
      assignedBy: adminId,
      assignedAt: Date.now(),
    });
  },
});

export const unassignFromUser = mutation({
  args: {
    vehicleId: v.id("vehicles"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const { profile } = await getUserProfile(ctx);

    if (profile.role !== "admin") {
      throw new Error("Not authorized");
    }

    const assignment = await ctx.db
      .query("vehicle_assignments")
      .withIndex("by_user_and_vehicle", (q) => 
        q.eq("userId", args.userId).eq("vehicleId", args.vehicleId))
      .first();

    if (assignment) {
      await ctx.db.delete(assignment._id);
    }
  },
});
