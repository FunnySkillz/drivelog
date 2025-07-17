"use client";

import { useAuth0 } from "@auth0/auth0-react";
import { useState } from "react";

export function SignInForm() {
  const { loginWithRedirect, isAuthenticated, logout, isLoading, user } =
    useAuth0();
  const [submitting, setSubmitting] = useState(false);

  const handleLogin = async () => {
    setSubmitting(true);
    try {
      await loginWithRedirect();
    } catch (err) {
      console.error("Login error", err);
    } finally {
      setSubmitting(false);
    }
  };

  if (isLoading) {
    return <div>Lade...</div>;
  }

  if (isAuthenticated) {
    return (
      <div className="text-center space-y-4">
        <p>Willkommen, {user?.name}</p>
        <button
          onClick={() =>
            logout({
              logoutParams: {
                returnTo: window.location.origin,
              },
            })
          }
          className="bg-red-600 text-white px-4 py-2 rounded"
        >
          Abmelden
        </button>
      </div>
    );
  }

  return (
    <div className="text-center space-y-4">
      <p>Bitte melden Sie sich an, um fortzufahren</p>
      <button
        onClick={handleLogin}
        className="bg-blue-600 text-white px-4 py-2 rounded"
        disabled={submitting}
      >
        {submitting ? "Anmelden..." : "Mit Auth0 anmelden"}
      </button>
    </div>
  );
}
