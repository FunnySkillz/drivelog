// /types/models.ts

import { Id } from "../../../convex/_generated/dataModel";

export type Role = "admin" | "driver";

export interface Company {
  _id: string;
  _creationTime: number;
  name: string;
  address?: string;
  industry?: string;
  isRentalCompany: boolean;
  userId?: string; // Creator / owner of the company
}

export interface User {
  _id: string;
  _creationTime: number;
  name?: string;
  email?: string;
  tokenIdentifier: string;
}

export interface UserProfile {
  _id: string;
  userId: string;
  role: Role;
  name?: string;
  email?: string;
  companyId?: Id<"companies">;
}

export interface UserWithProfile extends User {
  profile?: UserProfile | null;
}

export interface Vehicle {
  _id: Id<"vehicles">;
  _creationTime: number;
  companyId: Id<"companies">;
  brand: string;
  model: string;
  licensePlate: string;
  vin: string;
  fuelType: "Petrol" | "Diesel" | "Electric" | "Hybrid";
  year: number;
  mileage: number;
  isPublic: boolean;
  notes?: string;
}

export interface Driver {
  _id: Id<"user_profiles">;
  _creationTime: number;
  companyId?: Id<"companies">; // correct type
  userId: Id<"users">;
  name: string;
  email?: string;
  phone?: string;
  role: "admin" | "driver";
  assignedVehicles?: (Vehicle | null)[];
}

export interface Trip {
  _id: string;
  _creationTime: number;
  companyId: string;
  userId: string;
  vehicleId: string;
  locationStart: string;
  locationEnd: string;
  kmStart: number;
  kmEnd: number;
  purpose?: string;
  date: string; // ISO format

  timeStart?: string;
  timeEnd?: string;
  notes?: string;

}

export interface EnrichedTrip extends Trip {
  user?: UserProfile;
  vehicle?: Vehicle | null;
}