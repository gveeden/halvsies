import { NextResponse } from 'next/server';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: Request) {
  try {
    const { email, inviteLink, groupName, senderName } = await request.json();

    if (!email || !inviteLink || !groupName) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (!process.env.RESEND_API_KEY) {
      return NextResponse.json({ error: 'Resend API key is not configured on the server' }, { status: 500 });
    }

    const { data, error } = await resend.emails.send({
      from: 'Halvsies <invites@whenever.fyi>',
      to: [email],
      subject: `You've been invited to join ${groupName} on Halvsies!`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; text-align: center;">
          <h1 style="color: #10b981;">Halvsies</h1>
          <h2 style="color: #334155;">You're invited to join a group!</h2>
          <p style="color: #475569; font-size: 16px; line-height: 1.5; margin-bottom: 30px;">
            ${senderName ? `<strong>${senderName}</strong> has invited you to join ` : 'You have been invited to join '} 
            <strong>${groupName}</strong> to track and split shared expenses.
          </p>
          <a href="${inviteLink}" style="background-color: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
            Join Group
          </a>
          <p style="color: #94a3b8; font-size: 12px; margin-top: 40px;">
            If you didn't expect this invitation, you can safely ignore this email.
          </p>
        </div>
      `,
    });

    if (error) {
      console.error("Resend API error:", error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error("Internal API error:", error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
