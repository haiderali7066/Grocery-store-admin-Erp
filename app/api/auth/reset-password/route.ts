// app/api/auth/reset-password/route.ts

import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { User } from "@/lib/models";
import bcryptjs from "bcryptjs";

export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const { email, otp, newPassword } = await req.json();

    // Validation
    if (!email || !otp || !newPassword) {
      return NextResponse.json(
        { message: "Email, OTP, and new password are required" },
        { status: 400 }
      );
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { message: "Password must be at least 6 characters long" },
        { status: 400 }
      );
    }

    // ✅ FIX: Explicitly select resetOTP and resetOTPExpire
    const user = await User.findOne({ email: email.toLowerCase() }).select(
      "+resetOTP +resetOTPExpire"
    );

    if (!user) {
      return NextResponse.json(
        { message: "User not found" },
        { status: 404 }
      );
    }

    // Check if OTP exists and is not expired
    if (!user.resetOTP || !user.resetOTPExpire) {
      return NextResponse.json(
        { message: "OTP not found. Please request a new OTP." },
        { status: 400 }
      );
    }

    // Verify OTP matches
    if (user.resetOTP !== otp) {
      return NextResponse.json(
        { message: "Invalid OTP. Please check and try again." },
        { status: 400 }
      );
    }

    // Check if OTP is expired
    if (new Date() > new Date(user.resetOTPExpire)) {
      // Clear expired OTP
      user.resetOTP = undefined;
      user.resetOTPExpire = undefined;
      await user.save();

      return NextResponse.json(
        { message: "OTP has expired. Please request a new one." },
        { status: 400 }
      );
    }

    // Hash new password
    const hashedPassword = await bcryptjs.hash(newPassword, 10);

    // Update password and clear OTP
    user.password = hashedPassword;
    user.resetOTP = undefined;
    user.resetOTPExpire = undefined;
    await user.save();

    return NextResponse.json(
      { message: "Password reset successful. You can now login with your new password." },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Reset password error:", error);
    return NextResponse.json(
      { message: error.message || "Server error" },
      { status: 500 }
    );
  }
}