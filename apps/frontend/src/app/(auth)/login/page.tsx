"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Smartphone } from "lucide-react";
import { api } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";

export default function LoginPage() {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await api.auth.sendOtp(phone);
      // Store phone to pass to the verify page
      localStorage.setItem("fdf_auth_phone", phone);
      router.push("/verify");
    } catch (err: any) {
      setError(err.message || "Failed to send OTP");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 animate-enter">
      <Card className="w-full max-w-md">
        <form onSubmit={handleSendOtp}>
          <CardHeader className="text-center pb-6">
            <div className="mx-auto h-12 w-12 rounded-2xl bg-blue-500/10 flex items-center justify-center mb-4">
              <Smartphone className="h-6 w-6 text-blue-400" />
            </div>
            <CardTitle>Welcome back</CardTitle>
            <CardDescription>
              Enter your phone number to sign in to your account
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Input
                type="tel"
                placeholder="+1 (555) 000-0000"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                error={!!error}
                required
                className="text-lg tracking-wide"
              />
              {error && <p className="text-sm text-red-400 mt-1">{error}</p>}
            </div>
          </CardContent>
          <CardFooter>
            <Button
              type="submit"
              className="w-full"
              disabled={!phone || loading}
            >
              {loading ? "Sending..." : "Continue"}
              {!loading && <ArrowRight className="ml-2 h-4 w-4" />}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
