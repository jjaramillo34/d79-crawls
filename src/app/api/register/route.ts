import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { Registration } from '@/types/registration';
import { sendEmail, getRegistrationConfirmationEmail, getAdminNotificationEmail } from '@/lib/email';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, firstName, lastName, school, crawlDate, crawlLocation, crawlLocationAddress } = body;
    
    // Validate email domain
    if (!email.endsWith('@schools.nyc.gov')) {
      return NextResponse.json(
        { error: 'Only @schools.nyc.gov email addresses are allowed' },
        { status: 400 }
      );
    }
    
    // Validate required fields
    if (!firstName || !lastName || !school || !crawlDate || !crawlLocation) {
      return NextResponse.json(
        { error: 'All fields are required' },
        { status: 400 }
      );
    }
    
    const db = await getDatabase();
    
    // Check if email is already registered
    const existingRegistration = await db.collection('registrations').findOne({ email });
    if (existingRegistration) {
      return NextResponse.json(
        { error: 'Email is already registered' },
        { status: 400 }
      );
    }
    
    // Check availability for the selected date
    const registrationsForDate = await db.collection('registrations').countDocuments({ crawlDate });
    if (registrationsForDate >= 20) {
      return NextResponse.json(
        { error: 'No spots available for this date' },
        { status: 400 }
      );
    }
    
    // Get location details from database
    const locationDetails = await db.collection('eventLocations').findOne({ _id: crawlLocation });
    
    // Create registration
    const registration: Omit<Registration, '_id'> = {
      email,
      firstName,
      lastName,
      school,
      crawlDate,
      crawlLocation,
      crawlLocationAddress: crawlLocationAddress || locationDetails?.address || '',
      crawlLocationName: locationDetails?.name || '',
      createdAt: new Date()
    };
    
    const result = await db.collection('registrations').insertOne(registration);
    
    // Calculate remaining spots
    const updatedRegistrationsForDate = await db.collection('registrations').countDocuments({ crawlDate });
    const availableSpots = 20 - updatedRegistrationsForDate;
    
    // Send confirmation email to registrant
    const confirmationEmail = getRegistrationConfirmationEmail({
      firstName,
      lastName,
      crawlDate,
      description: 'Join us for an information session and a site visit to a Referral Center and D79 site',
      crawlLocationName: locationDetails?.name || crawlLocation,
      crawlLocationAddress: crawlLocationAddress || locationDetails?.address || '',
      time: '10:00 AM - 12:00 PM'
    });
    
    await sendEmail({
      to: email,
      subject: `Registration Confirmed - District 79 Fall Crawls`,
      html: confirmationEmail
    });
    
    // Send notification email to admin
    if (process.env.ADMIN_EMAIL) {
      const adminEmail = getAdminNotificationEmail({
        firstName,
        lastName,
        email,
        school,
        crawlDate,
        crawlLocation: locationDetails?.name || crawlLocation,
        crawlLocationName: locationDetails?.name || crawlLocation,
        description: 'Join us for an information session and a site visit to a Referral Center and D79 site',
        crawlLocationAddress: crawlLocationAddress || locationDetails?.address || '',
        availableSpots
      });
      
      await sendEmail({
        to: process.env.ADMIN_EMAIL,
        subject: `New Registration - ${firstName} ${lastName} - D79 Fall Crawls`,
        html: adminEmail
      });
    }
    
    return NextResponse.json({
      success: true,
      id: result.insertedId,
      message: 'Registration successful! Check your email for confirmation.'
    });
    
  } catch (error) {
    console.error('Error creating registration:', error);
    return NextResponse.json(
      { error: 'Failed to create registration' },
      { status: 500 }
    );
  }
}
