"use client";

import { useState, useEffect } from "react";
import { Auth0Provider } from "@auth0/auth0-react";
import { ConvexReactClient } from "convex/react";
import { ConvexProviderWithAuth0 } from "convex/react-auth0";

const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export function Providers({ children }: { children: React.ReactNode }) {
  const [redirectUri, setRedirectUri] = useState<string>("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      setRedirectUri(window.location.origin);
    }
  }, []);

  if (!redirectUri) return null; // or a loading indicator

  return (
    <Auth0Provider
      domain={process.env.NEXT_PUBLIC_AUTH0_DOMAIN!}
      clientId={process.env.NEXT_PUBLIC_AUTH0_CLIENT_ID!}
      authorizationParams={{ redirect_uri: redirectUri }}
      useRefreshTokens
      cacheLocation="localstorage"
    >
      <ConvexProviderWithAuth0 client={convex}>
        {children}
      </ConvexProviderWithAuth0>
    </Auth0Provider>
  );
}
