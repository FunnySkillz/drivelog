"use client";

import { useAuth0 } from "@auth0/auth0-react";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "../ui/button";
import { Card, CardContent } from "../ui/card";
import { Label } from "@radix-ui/react-label";
import { Input } from "../ui/input";

// Zod schema
const SignInSchema = z.object({
  email: z.string().email("Ungültige E-Mail"),
  password: z.string().min(6, "Mind. 6 Zeichen"),
});

type SignInFormData = z.infer<typeof SignInSchema>;

export default function SignInForm() {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignInFormData>({
    resolver: zodResolver(SignInSchema),
  });

  const { loginWithRedirect, isLoading, isAuthenticated, logout, user } =
    useAuth0();

  useEffect(() => {
    if (isAuthenticated) {
      // Optional: redirect after login
      window.location.href = "/fahrtenbuch";
    }
  }, [isAuthenticated]);

  const onSubmit = async (data: SignInFormData) => {
    await loginWithRedirect({
      authorizationParams: {
        login_hint: data.email,
      },
    });
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardContent className="space-y-4 pt-6">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <Label htmlFor="email">E-Mail</Label>
              <Input id="email" type="email" {...register("email")} />
              {errors.email && (
                <p className="text-sm text-red-600">{errors.email.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="password">Passwort</Label>
              <Input id="password" type="password" {...register("password")} />
              {errors.password && (
                <p className="text-sm text-red-600">
                  {errors.password.message}
                </p>
              )}
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Anmelden..." : "Anmelden"}
            </Button>
          </form>

          <div className="border-t pt-4 text-center text-sm text-muted-foreground">
            Oder
          </div>

          <Button
            variant="outline"
            className="w-full"
            onClick={() =>
              loginWithRedirect({
                authorizationParams: { connection: "google-oauth2" },
              })
            }
          >
            Mit Google anmelden
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
