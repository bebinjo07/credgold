import { NextResponse } from 'next/server';
import { resend } from '@/lib/resend';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, phone, otp } = body;

    const recipientEmail = email || 'bsbbebinjo2007@gmail.com';
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; background-color: #0f172a; color: #ffffff; padding: 30px; border-radius: 12px; max-width: 500px; margin: 0 auto;">
        <div style="text-align: center; margin-bottom: 20px;">
          <h1 style="color: #facc15; font-size: 24px; margin: 0;">🪙 SWARNA PAWN</h1>
          <p style="color: #94a3b8; font-size: 12px; text-transform: uppercase; tracking: 1px;">Gold Loan & Vault Ledger</p>
        </div>
        <div style="background-color: #1e293b; border: 1px solid #334155; padding: 20px; border-radius: 8px; text-align: center;">
          <h2 style="color: #e2e8f0; font-size: 18px; margin-top: 0;">Customer Verification</h2>
          <p style="color: #94a3b8; font-size: 14px;">Your One-Time Password (OTP) for customer portal access is:</p>
          <div style="font-size: 32px; font-weight: bold; color: #10b981; letter-spacing: 6px; padding: 15px; background: #0f172a; border-radius: 6px; margin: 15px 0;">
            ${otp}
          </div>
          ${phone ? `<p style="color: #64748b; font-size: 12px;">Mobile Number: +91 ${phone}</p>` : ''}
          <p style="color: #64748b; font-size: 12px; margin-bottom: 0;">This OTP is valid for 10 minutes. Do not share it with anyone.</p>
        </div>
        <div style="text-align: center; margin-top: 20px; color: #64748b; font-size: 11px;">
          Sent by Swarna Pawn (noreplycredgold@gmail.com) • All rights reserved.
        </div>
      </div>
    `;

    let data;
    try {
      // Primary Attempt: Send from Swarna Pawn <noreplycredgold@gmail.com>
      data = await resend.emails.send({
        from: 'Swarna Pawn <noreplycredgold@gmail.com>',
        to: [recipientEmail],
        replyTo: 'noreplycredgold@gmail.com',
        subject: `Swarna Pawn - Your Verification OTP Code: ${otp}`,
        html: emailHtml,
      });
    } catch (primaryError) {
      // Fallback Attempt if provider requires verified domain sender
      data = await resend.emails.send({
        from: 'Swarna Pawn <onboarding@resend.dev>',
        to: [recipientEmail],
        replyTo: 'noreplycredgold@gmail.com',
        subject: `Swarna Pawn - Your Verification OTP Code: ${otp}`,
        html: emailHtml,
      });
    }

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('Error sending OTP via Resend:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
