// Script to seed the database with event locations and details
// Run with: node scripts/seed-database.js

const { MongoClient } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/d79-crawls';

// Load environment variables from .env.local if available
if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config({ path: '.env.local' });
}

console.log('Environment:', process.env.NODE_ENV || 'development');
console.log('MongoDB URI:', MONGODB_URI ? 'Set' : 'Not set');

async function seedDatabase() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    
    const db = client.db('d79-crawls');
    
    // Production safety check
    if (process.env.NODE_ENV === 'production') {
      console.log('⚠️  PRODUCTION MODE DETECTED');
      console.log('This will clear existing data and reseed the database.');
      
      // Check if collections already have data
      const existingEvents = await db.collection('events').countDocuments();
      const existingLocations = await db.collection('eventLocations').countDocuments();
      
      if (existingEvents > 0 || existingLocations > 0) {
        console.log(`Found ${existingEvents} events and ${existingLocations} locations`);
        console.log('To proceed with reseeding, set FORCE_RESET=true');
        
        if (process.env.FORCE_RESET !== 'true') {
          console.log('❌ Aborting to prevent data loss. Use FORCE_RESET=true to override.');
          return;
        }
      }
    }
    
    // Clear existing collections
    await db.collection('events').deleteMany({});
    await db.collection('eventLocations').deleteMany({});
    console.log('Cleared existing events and locations');
    
    // Define event locations
    const locations = [
      // Tuesday locations (Manhattan, Queens, Bronx)
      {
        name: "Manhattan Referral Center",
        address: "269 West 15th Street, Manhattan, NY 10011",
        borough: "Manhattan",
        capacity: 20,
        description: "P2G Referral Center & Adult Education Center",
        coordinates: { lat: 40.7589, lng: -73.9851 }
      },
      {
        name: "Queens Alternative School",
        address: "162-02 Hillside Avenue, Queens, NY 11372",
        borough: "Queens",
        capacity: 20,
        description: "P2G Referral Center & LYFE",
        coordinates: { lat: 40.7282, lng: -73.7949 }
      },
      {
        name: "Bronx D79 Center",
        address: "1010 Reverend James A. Polite Avenue, Bronx, NY 10462",
        borough: "The Bronx",
        capacity: 20,
        description: "P2G Referral Center & LYFE",
        coordinates: { lat: 40.8448, lng: -73.8648 }
      },
      // Thursday locations (Staten Island, Brooklyn)
      {
        name: "Staten Island Learning Center",
        address: "365 Bay Street, Staten Island, NY 10301",
        borough: "Staten Island",
        capacity: 20,
        description: "P2G Referral Center & Adult Education Center",
        coordinates: { lat: 40.6415, lng: -74.0776 }
      },
      {
        name: "Brooklyn Alternative Programs",
        address: "67-69 Schermerhorn Street, Brooklyn, NY 11207",
        borough: "Brooklyn",
        capacity: 15,
        description: "P2G Referral Center & LYFE",
        coordinates: { lat: 40.6782, lng: -73.9442 }
      }
    ];
    
    // Insert locations
    const locationResults = await db.collection('eventLocations').insertMany(locations);
    const locationIds = Object.values(locationResults.insertedIds);
    console.log(`Inserted ${locations.length} locations`);
    
    // Define events
    const events = [
      {
        title: "District 79 Fall Crawls - Tuesday",
        date: "2024-10-28",
        time: "10:00 AM - 12:00 PM",
        eventType: "site-crawl",
        locationIds: locationIds.slice(0, 3), // Manhattan, Queens, Bronx
        description: "Join us for an information session and a site visit to a Referral Center and D79 site in Manhattan, Queens, or The Bronx",
        targetAudience: "nycps-staff",
        maxCapacity: 20,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        title: "District 79 Fall Crawls - Thursday",
        date: "2024-10-30",
        time: "10:00 AM - 12:00 PM",
        eventType: "site-crawl",
        locationIds: locationIds.slice(3, 5), // Staten Island, Brooklyn
        description: "Join us for an information session and a site visit to a Referral Center and D79 site in Staten Island or Brooklyn",
        targetAudience: "nycps-staff",
        maxCapacity: 20,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];
    
    // Insert events
    await db.collection('events').insertMany(events);
    console.log(`Inserted ${events.length} events`);
    
    console.log('Database seeded successfully!');
    
  } catch (error) {
    console.error('Error seeding database:', error);
  } finally {
    await client.close();
  }
}

seedDatabase();
