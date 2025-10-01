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
    const { verificationId, code, phoneNumber } = body;

    // Check for required parameters
    if (!code) {
      return NextResponse.json(
        { error: 'Verification code is required' },
        { status: 400 }
      );
    }

    // Either verificationId or phoneNumber must be provided
    if (!verificationId && !phoneNumber) {
      return NextResponse.json(
        { error: 'Either verificationId or phoneNumber is required' },
        { status: 400 }
      );
    }

    // Format phone number to E.164 format if provided and needed
    const formattedPhoneNumber = phoneNumber?.startsWith('+') 
      ? phoneNumber 
      : phoneNumber ? `+${phoneNumber}` : undefined;

    // Initialize Twilio client
    const client = new Twilio(accountSid!, authToken!);

    // Check verification
    // Note: Twilio Verify API allows checking by phone number directly,
    // which is useful if you don't want to store the verificationId
    let verificationCheck;
    
    if (formattedPhoneNumber) {
      verificationCheck = await client.verify.v2
        .services(verifySid!)
        .verificationChecks.create({
          to: formattedPhoneNumber,
          code
        });
    } else if (verificationId) {
      // This approach may vary based on your Twilio setup
      // Some Twilio Verify implementations may require different parameters
      verificationCheck = await client.verify.v2
        .services(verifySid!)
        .verificationChecks.create({
          verificationSid: verificationId,
          code
        });
    } else {
      return NextResponse.json(
        { error: 'Invalid parameters for verification check' },
        { status: 400 }
      );
    }

    // Check if verification was successful
    if (verificationCheck.status === 'approved') {
      console.log('Verification successful');
      
      return NextResponse.json({
        success: true,
        status: verificationCheck.status
      });
    } else {
      console.log('Verification failed:', verificationCheck.status);
      
      return NextResponse.json(
        { error: `Verification failed with status: ${verificationCheck.status}` },
        { status: 400 }
      );
    }
  } catch (error: any) {
    console.error('Error checking verification:', error);
    
    // Handle specific Twilio errors
    const statusCode = error.status || 500;
    const errorMessage = error.message || 'Failed to verify code';
    
    return NextResponse.json(
      { error: errorMessage },
      { status: statusCode }
    );
  }
} 