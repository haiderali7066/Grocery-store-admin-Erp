// app/api/auth/forgot-password/route.ts

import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { User } from "@/lib/models";
import nodemailer from "nodemailer";

// Initialize email transporter
// Update these with your email service credentials
const transporter = nodemailer.createTransport({
  service: "gmail", // or your email service
  auth: {
    user: process.env.SMTP_EMAIL,
    pass: process.env.SMTP_PASSWORD,
  },
});

// Alternative: Use your email service provider settings
// const transporter = nodemailer.createTransport({
//   host: process.env.SMTP_HOST,
//   port: parseInt(process.env.SMTP_PORT || "587"),
//   secure: process.env.SMTP_SECURE === "true",
//   auth: {
//     user: process.env.SMTP_EMAIL,
//     pass: process.env.SMTP_PASSWORD,
//   },
// });

async function sendOTPEmail(email: string, otp: string) {
  try {
    await transporter.sendMail({
      from: `"Khas Pure Foods" <${process.env.SMTP_EMAIL}>`,
      to: email,
      subject: "🔐 Password Reset OTP - Khas Pure Foods",
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(to right, #16a34a, #3b82f6); color: white; padding: 20px; border-radius: 8px 8px 0 0; text-align: center; }
              .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
              .otp-box { background: white; border: 2px solid #16a34a; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0; }
              .otp-code { font-size: 32px; font-weight: bold; color: #16a34a; letter-spacing: 4px; }
              .footer { font-size: 12px; color: #999; margin-top: 20px; text-align: center; }
              .warning { color: #d97706; font-weight: bold; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>Password Reset Request</h1>
              </div>
              <div class="content">
                <p>Hello,</p>
                <p>We received a request to reset your password. Use the OTP below to proceed:</p>
                
                <div class="otp-box">
                  <p style="margin: 0; color: #666; font-size: 14px;">Your One-Time Password</p>
                  <div class="otp-code">${otp}</div>
                  <p style="margin: 10px 0 0 0; color: #666; font-size: 14px;">Valid for 10 minutes</p>
                </div>

                <p><strong>Important:</strong></p>
                <ul>
                  <li>Never share this OTP with anyone</li>
                  <li>This OTP will expire in 10 minutes</li>
                  <li>If you didn't request this, please ignore this email</li>
                </ul>

                <p>If you're having trouble, please contact our support team.</p>
                
                <p>Best regards,<br><strong>Khas Pure Foods Team</strong></p>
              </div>
              <div class="footer">
                <p>© 2024 Khas Pure Foods. All rights reserved.</p>
              </div>
            </div>
          </body>
        </html>
      `,
    });
    return true;
  } catch (error) {
    console.error("Failed to send email:", error);
    throw error;
  }
}

export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const { email } = await req.json();

    if (!email) {
      return NextResponse.json(
        { message: "Email is required" },
        { status: 400 }
      );
    }

    // Find user by email
    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      // For security, don't reveal if email exists
      // But for better UX, you can return a user-friendly message
      return NextResponse.json(
        { message: "If an account exists with this email, you will receive an OTP" },
        { status: 200 }
      );
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Set OTP and expiration (10 minutes from now)
    user.resetOTP = otp;
    user.resetOTPExpire = new Date(Date.now() + 10 * 60 * 1000);
    await user.save();

    // Send OTP via email
    try {
      await sendOTPEmail(user.email, otp);
    } catch (emailError) {
      console.error("Email sending failed:", emailError);
      // Clear OTP if email fails
      user.resetOTP = undefined;
      user.resetOTPExpire = undefined;
      await user.save();
      
      return NextResponse.json(
        { message: "Failed to send OTP. Please check your email configuration." },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { 
        message: "OTP sent to your email. Please check your inbox.",
        email: user.email,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Forgot password error:", error);
    return NextResponse.json(
      { message: error.message || "Server error" },
      { status: 500 }
    );
  }
}