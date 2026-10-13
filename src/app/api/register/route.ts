import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { Registration } from '@/types/registration';
import { sendEmail, getRegistrationConfirmationEmail, getAdminNotificationEmail } from '@/lib/email';
import { getActiveCrawlEvents } from '@/lib/crawls';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { firstName, lastName, school, crawlLocation } = body;
    const email = typeof body.email === 'string' ? body.email.trim() : '';
    
    // Validate email domain
    if (!email.toLowerCase().endsWith('@schools.nyc.gov')) {
      return NextResponse.json(
        { error: 'Only @schools.nyc.gov email addresses are allowed' },
        { status: 400 }
      );
    }
    
    // Validate required fields
    if (!firstName || !lastName || !school || !crawlLocation) {
      return NextResponse.json(
        { error: 'All fields are required' },
        { status: 400 }
      );
    }
    
    const db = await getDatabase();
    
    // The location must belong to a session that is currently open for registration
    const activeEvents = await getActiveCrawlEvents(db);
    const event = activeEvents.find(e => e.locations.some(location => location._id === crawlLocation));
    const locationDetails = event?.locations.find(location => location._id === crawlLocation);
    if (!event || !locationDetails) {
      return NextResponse.json(
        { error: 'This location is not open for registration' },
        { status: 400 }
      );
    }
    const maxCapacity = locationDetails.totalSpots;
    
    // One registration per person per cycle (past years' registrations don't block sign-up)
    const activeLocationIds = activeEvents.flatMap(e => e.locations.map(location => location._id));
    const emailPattern = new RegExp(`^${email.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');
    const existingRegistration = await db.collection('registrations').findOne({
      email: emailPattern,
      crawlLocation: { $in: activeLocationIds },
    });
    if (existingRegistration) {
      return NextResponse.json(
        { error: 'Email is already registered' },
        { status: 400 }
      );
    }
    
    // Check availability for the selected location
    const registrationsForLocation = await db.collection('registrations').countDocuments({ crawlLocation });
    if (registrationsForLocation >= maxCapacity) {
      return NextResponse.json(
        { error: 'No spots available for this location' },
        { status: 400 }
      );
    }
    
    // Create registration
    const registration: Omit<Registration, '_id'> = {
      email,
      firstName,
      lastName,
      school,
      crawlDate: event.date,
      eventId: event._id,
      crawlLocation,
      crawlLocationAddress: locationDetails.address || '',
      crawlLocationName: locationDetails.name || '',
      createdAt: new Date()
    };
    
    const result = await db.collection('registrations').insertOne(registration);
    
    // Calculate remaining spots for this specific location
    const updatedRegistrationsForLocation = await db.collection('registrations').countDocuments({ 
      crawlLocation 
    });
    const availableSpots = maxCapacity - updatedRegistrationsForLocation;
    
    // Send confirmation email to registrant
    const confirmationEmail = getRegistrationConfirmationEmail({
      firstName,
      lastName,
      crawlDate: event.dateLabel,
      description: event.description || 'Join us for an information session and a site visit to a Referral Center and D79 site',
      crawlLocationName: locationDetails.name,
      crawlLocationAddress: locationDetails.address || '',
      time: event.time
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
        crawlDate: event.dateLabel,
        crawlLocation: locationDetails.name,
        crawlLocationName: locationDetails.name,
        description: event.description || 'Join us for an information session and a site visit to a Referral Center and D79 site',
        crawlLocationAddress: locationDetails.address || '',
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
