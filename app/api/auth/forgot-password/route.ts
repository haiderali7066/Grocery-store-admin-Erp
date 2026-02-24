import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { User } from "@/lib/models";
import { sendEmail } from "@/lib/sendEmail";

export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const { email } = await req.json();

    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    // Generate 6 digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    user.resetOTP = otp;
    user.resetOTPExpire = new Date(Date.now() + 10 * 60 * 1000); // 10 mins
    await user.save();

    await sendEmail(user.email, "Password Reset OTP", `Your OTP is: ${otp}`);

    return NextResponse.json({ message: "OTP sent to email" }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}
