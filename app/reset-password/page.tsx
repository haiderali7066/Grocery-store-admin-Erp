"use client";

import React, { useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Lock, ShieldCheck, Eye, EyeOff, ArrowLeft } from "lucide-react";
import Link from "next/link";

function ResetPasswordContent() {
  const searchParams = useSearchParams();
  const email = searchParams.get("email");
  const router = useRouter();

  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          otp,
          newPassword: password,
        }),
      });

      if (res.ok) {
        router.push("/login");
      } else {
        const data = await res.json();
        throw new Error(data.message || "Invalid OTP or request failed.");
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white rounded-lg shadow-lg p-8">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-green-700 rounded-lg mb-4">
            <span className="text-white font-bold text-lg">KPF</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-800">Reset Password</h1>
          <p className="text-gray-600 mt-2">
            We've sent a code to{" "}
            <span className="font-medium text-gray-900">{email}</span>
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* OTP Field */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              One-Time Password (OTP)
            </label>
            <div className="relative">
              <ShieldCheck className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
              <Input
                type="text"
                placeholder="Enter 6-digit code"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                className="pl-10"
                required
              />
            </div>
          </div>

          {/* New Password Field */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              New Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
              <Input
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-10 pr-10"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? (
                  <EyeOff className="h-5 w-5" />
                ) : (
                  <Eye className="h-5 w-5" />
                )}
              </button>
            </div>
          </div>

          <Button
            type="submit"
            disabled={isLoading}
            className="w-full bg-green-700 hover:bg-green-800 text-white py-2 rounded-lg font-semibold"
          >
            {isLoading ? "Updating..." : "Reset Password"}
          </Button>
        </form>

        <div className="mt-8 text-center space-y-4">
          <p className="text-sm text-gray-600">
            Didn't receive the code?{" "}
            <button className="text-green-700 font-semibold hover:underline">
              Resend OTP
            </button>
          </p>
          <Link
            href="/login"
            className="inline-flex items-center text-gray-500 hover:text-gray-700 text-sm"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Login
          </Link>
        </div>
      </div>
    </div>
  );
}

// Wrap in Suspense because useSearchParams() requires it in Next.js 13/14/15
// when using static rendering/client components.
export default function ResetPassword() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center items-center h-screen">
          Loading...
        </div>
      }
    >
      <ResetPasswordContent />
    </Suspense>
  );
}
