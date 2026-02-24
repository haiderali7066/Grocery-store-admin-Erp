import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { User } from "@/lib/models";
import { hashPassword } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const { email, otp, newPassword } = await req.json();

    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user || user.resetOTP !== otp || user.resetOTPExpire < new Date()) {
      return NextResponse.json(
        { message: "Invalid or expired OTP" },
        { status: 400 },
      );
    }

    user.password = await hashPassword(newPassword);
    user.resetOTP = undefined;
    user.resetOTPExpire = undefined;

    await user.save();

    return NextResponse.json(
      { message: "Password reset successful" },
      { status: 200 },
    );
  } catch (error) {
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}
