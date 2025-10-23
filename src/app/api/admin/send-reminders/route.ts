import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { sendEmail, getReminderEmail } from '@/lib/email';
import { ObjectId } from 'mongodb';

export async function POST(request: NextRequest) {
  try {
    const { password, eventType } = await request.json();
    
    // Check password against environment variable
    const adminPassword = process.env.ADMIN_PASSWORD || 'district79admin';
    
    if (password !== adminPassword) {
      return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
    }

    if (!eventType || !['tuesday', 'thursday'].includes(eventType)) {
      return NextResponse.json({ error: 'Invalid event type. Must be tuesday or thursday' }, { status: 400 });
    }
    
    const db = await getDatabase();
    
    // Get all registrations for the specified event type
    const registrations = await db.collection('registrations').find({
      crawlDate: eventType
    }).toArray();
    
    if (registrations.length === 0) {
      return NextResponse.json({ 
        success: true, 
        message: `No registrations found for ${eventType} event`,
        emailsSent: 0,
        errors: []
      });
    }
    
    // Get location information for each registration
    const locationIds = [...new Set(registrations.map(reg => reg.crawlLocation))];
    const locations = await db.collection('eventLocations').find({
      _id: { $in: locationIds.map(id => new ObjectId(id)) }
    }).toArray();
    
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
          crawlDate: registration.crawlDate,
          crawlLocationName: location.name,
          crawlLocationAddress: location.address,
          time: '10:00 AM - 12:00 PM'
        };
        
        const emailHtml = getReminderEmail(emailData);
        const emailResult = await sendEmail({
          to: registration.email,
          subject: `🔔 Reminder: D79 Fall Crawl Tomorrow - ${eventType === 'tuesday' ? 'Tuesday, October 28' : 'Thursday, October 30'}`,
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
      message: `Reminder emails processed for ${eventType} event`,
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
