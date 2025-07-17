"use client";

import { useAuth0 } from "@auth0/auth0-react";
import { Button } from "@/components/ui/button";

export function SignOutButton() {
  const { isAuthenticated, logout } = useAuth0();

  if (!isAuthenticated) return null;

  return (
    <Button
      variant="outline"
      onClick={() =>
        logout({
          logoutParams: {
            returnTo: window.location.origin,
          },
        })
      }
    >
      Abmelden
    </Button>
  );
}
