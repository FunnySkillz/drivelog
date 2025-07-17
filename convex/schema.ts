import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

const applicationTables = {
  companies: defineTable({
    name: v.string(),
    address: v.optional(v.string()),
    industry: v.optional(v.string()),
    isRentalCompany: v.boolean(),
  }),

  vehicles: defineTable({
    companyId: v.id("companies"),
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
  })
    .index("by_company", ["companyId"])
    .index("by_license_plate", ["licensePlate"]),

  vehicle_assignments: defineTable({
    userId: v.id("users"),
    vehicleId: v.id("vehicles"),
    assignedBy: v.id("users"),
    assignedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_vehicle", ["vehicleId"])
    .index("by_user_and_vehicle", ["userId", "vehicleId"]),

  fahrtenbuch_entries: defineTable({
    userId: v.id("users"),
    vehicleId: v.id("vehicles"),
    companyId: v.id("companies"),
    date: v.string(),
    timeStart: v.string(),
    timeEnd: v.string(),
    locationStart: v.string(),
    locationEnd: v.string(),
    kmStart: v.number(),
    kmEnd: v.number(),
    purpose: v.string(),
    notes: v.optional(v.string()),
  })
    .index("by_user", ["userId"])
    .index("by_vehicle", ["vehicleId"])
    .index("by_company", ["companyId"])
    .index("by_date", ["date"])
    .index("by_vehicle_and_date", ["vehicleId", "date"]),

  fahrtenbuch_files: defineTable({
    entryId: v.id("fahrtenbuch_entries"),
    storageId: v.id("_storage"),
    fileName: v.string(),
    fileType: v.union(v.literal("image"), v.literal("pdf")),
    uploadedAt: v.number(),
  })
    .index("by_entry", ["entryId"]),

  user_profiles: defineTable({
    userId: v.id("users"),
    companyId: v.optional(v.id("companies")),
    role: v.union(v.literal("admin"), v.literal("driver")),
    name: v.string(),
    email: v.string(),
    
  })
    .index("by_user", ["userId"])
    .index("by_company", ["companyId"])
    .index("by_email", ["email"]),

  users: defineTable({
    tokenIdentifier: v.string(),
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
  })
    .index("by_token", ["tokenIdentifier"])
    .index("by_email", ["email"])
    .index("by_phone", ["phone"]),

  invites: defineTable({
    email: v.string(),
    name: v.string(),
    companyId: v.id("companies"),
    invitedBy: v.id("users"),
    invitedAt: v.number(),
  })
    .index("by_email", ["email"]),

};

export default defineSchema({
  ...applicationTables,
});
