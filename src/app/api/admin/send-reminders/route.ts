import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { sendEmail, getReminderEmail } from '@/lib/email';
import { ObjectId } from 'mongodb';
import { requireAdmin } from '@/lib/auth';
import { formatEventDate } from '@/lib/crawls';

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdmin(request);
    if (auth instanceof NextResponse) return auth;

    const { eventId } = await request.json();
    if (typeof eventId !== 'string' || !ObjectId.isValid(eventId)) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 400 });
    }
    
    const db = await getDatabase();
    
    const event = await db.collection('events').findOne({ _id: new ObjectId(eventId) });
    if (!event) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }
    const dateLabel = formatEventDate(event.date);
    
    // Registrations are tied to the session's locations
    const locationIds = (event.locationIds || []) as ObjectId[];
    const registrations = await db.collection('registrations').find({
      crawlLocation: { $in: locationIds.map(id => id.toString()) }
    }).toArray();
    
    if (registrations.length === 0) {
      return NextResponse.json({ 
        success: true, 
        message: `No registrations found for ${event.title}`,
        emailsSent: 0,
        errors: []
      });
    }
    
    const locations = await db.collection('eventLocations').find({ _id: { $in: locationIds } }).toArray();
    
    const locationMap = new Map();
    locations.forEach(location => {
      locationMap.set(location._id.toString(), location);
    });
    
    // Send reminder emails
    const results = [];
    const errors = [];
    
    for (const registration of registrations) {
      try {
        const location = locationMap.get(registration.crawlLocation);
        if (!location) {
          errors.push({
            email: registration.email,
            name: `${registration.firstName} ${registration.lastName}`,
            error: 'Location not found'
          });
          continue;
        }
        
        const emailData = {
          firstName: registration.firstName,
          lastName: registration.lastName,
          crawlDate: dateLabel,
          crawlLocationName: location.name,
          crawlLocationAddress: location.address,
          time: event.time
        };
        
        const emailHtml = getReminderEmail(emailData);
        const emailResult = await sendEmail({
          to: registration.email,
          subject: `🔔 Reminder: D79 Fall Crawl Tomorrow - ${dateLabel}`,
          html: emailHtml
        });
        
        if (emailResult.success) {
          results.push({
            email: registration.email,
            name: `${registration.firstName} ${registration.lastName}`,
            location: location.name,
            messageId: emailResult.messageId,
            status: 'sent'
          });
        } else {
          errors.push({
            email: registration.email,
            name: `${registration.firstName} ${registration.lastName}`,
            error: emailResult.error instanceof Error ? emailResult.error.message : 'Unknown error'
          });
        }
        
        // Add a small delay between emails to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (error) {
        console.error(`Error sending email to ${registration.email}:`, error);
        errors.push({
          email: registration.email,
          name: `${registration.firstName} ${registration.lastName}`,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
    
    return NextResponse.json({
      success: true,
      message: `Reminder emails processed for ${event.title}`,
      emailsSent: results.length,
      totalRegistrations: registrations.length,
      results,
      errors
    });
    
  } catch (error) {
    console.error('Error sending reminder emails:', error);
    return NextResponse.json(
      { error: 'Failed to send reminder emails' },
      { status: 500 }
    );
  }
}
