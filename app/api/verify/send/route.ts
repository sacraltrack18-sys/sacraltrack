import { NextResponse } from 'next/server';
import { Twilio } from 'twilio';

// Initialize Twilio client
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const verifySid = process.env.TWILIO_VERIFY_SERVICE_SID;

if (!accountSid || !authToken || !verifySid) {
  console.error('Missing Twilio environment variables');
}

export async function POST(request: Request) {
  try {
    // Parse request body
    const body = await request.json();
    const { phoneNumber, channel = 'sms' } = body;

    // Validate phone number
    if (!phoneNumber) {
      return NextResponse.json(
        { error: 'Phone number is required' },
        { status: 400 }
      );
    }

    // Validate channel (sms or call)
    if (channel !== 'sms' && channel !== 'call') {
      return NextResponse.json(
        { error: 'Channel must be sms or call' },
        { status: 400 }
      );
    }

    // Format phone number to E.164 format if needed
    const formattedPhoneNumber = phoneNumber.startsWith('+') 
      ? phoneNumber 
      : `+${phoneNumber}`;

    // Initialize Twilio client
    const client = new Twilio(accountSid!, authToken!);

    // Create verification
    const verification = await client.verify.v2
      .services(verifySid!)
      .verifications.create({
        to: formattedPhoneNumber,
        channel
      });

    console.log(`Verification sent to ${formattedPhoneNumber} via ${channel}`);

    // Return success response with verification SID as the verificationId
    return NextResponse.json({
      success: true,
      verificationId: verification.sid,
      status: verification.status
    });
  } catch (error: any) {
    console.error('Error sending verification:', error);
    
    // Handle specific Twilio errors
    const statusCode = error.status || 500;
    const errorMessage = error.message || 'Failed to send verification code';
    
    return NextResponse.json(
      { error: errorMessage },
      { status: statusCode }
    );
  }
} 