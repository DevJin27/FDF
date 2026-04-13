"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, KeyRound } from "lucide-react";
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

export default function VerifyPage() {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const stored = localStorage.getItem("fdf_auth_phone");
    if (!stored) {
      router.push("/login");
    } else {
      setPhone(stored);
    }
  }, [router]);

  const handleVerifyOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (otp.length < 4) return;
    
    setError("");
    setLoading(true);

    try {
      const res = await api.auth.verifyOtp(phone, otp);
      localStorage.setItem("fdf_token", res.token);
      localStorage.setItem("fdf_user_id", res.user.id);
      router.push("/dashboard");
    } catch (err: any) {
      setError(err.message || "Invalid or expired OTP");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 animate-enter">
      <Card className="w-full max-w-md">
        <form onSubmit={handleVerifyOtp}>
          <CardHeader className="text-center pb-6">
            <div className="mx-auto h-12 w-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center mb-4">
              <KeyRound className="h-6 w-6 text-indigo-400" />
            </div>
            <CardTitle>Enter Code</CardTitle>
            <CardDescription>
              We sent a verification code to <br/>
              <span className="font-medium text-white">{phone}</span>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Input
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="000000"
                value={otp}
                onChange={(e) => {
                  setOtp(e.target.value.replace(/\D/g, ""));
                }}
                error={!!error}
                required
                className="text-center text-3xl font-heading tracking-[0.5em] h-16 bg-black/20 font-bold"
                maxLength={6}
              />
              {error && <p className="text-sm text-red-400 mt-2 text-center">{error}</p>}
            </div>
          </CardContent>
          <CardFooter>
            <Button
              type="submit"
              className="w-full"
              disabled={otp.length < 4 || loading}
            >
              {loading ? "Verifying..." : "Verify OTP"}
              {!loading && <CheckCircle2 className="ml-2 h-4 w-4" />}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
