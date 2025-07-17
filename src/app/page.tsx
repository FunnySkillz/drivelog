// app/page.tsx
"use client";

import { Authenticated, Unauthenticated, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { SignInForm } from "@/components/auth/SignInForm";

export default function HomePage() {
  const loggedInUser = useQuery(api.users.getCurrentUserProfile);
  const company = useQuery(api.companies.getByUser);

  if (loggedInUser === undefined || company === undefined) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <Unauthenticated>
        <div className="max-w-md mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              Willkommen bei DriveLog
            </h1>
            <p className="text-xl text-gray-600">
              Melden Sie sich an, um Ihre Fahrzeuge zu verwalten
            </p>
          </div>
          <SignInForm />
        </div>
      </Unauthenticated>

      <Authenticated>
        {loggedInUser && company ? (
          <Dashboard user={loggedInUser} company={company} />
        ) : (
          <CompanySetup />
        )}
      </Authenticated>
    </div>
  );
}
