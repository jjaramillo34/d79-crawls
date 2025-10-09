require('dotenv').config({ path: '.env.local' });
const { MongoClient } = require('mongodb');

async function updateBrooklynCapacity() {
  const uri = process.env.MONGODB_URI;
  
  if (!uri) {
    console.error('❌ MONGODB_URI not found in .env.local');
    process.exit(1);
  }

  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');
    
    const db = client.db('d79-crawls');
    
    // Find Brooklyn location
    const location = await db.collection('eventLocations').findOne({ 
      name: 'Brooklyn Alternative Programs' 
    });
    
    if (!location) {
      console.log('❌ Brooklyn Alternative Programs not found');
      return;
    }
    
    console.log('Found Brooklyn Location:', location.name);
    console.log('Current maxCapacity:', location.maxCapacity || 'not set (defaults to 20)');
    
    // Update Brooklyn's max capacity to 15
    await db.collection('eventLocations').updateOne(
      { name: 'Brooklyn Alternative Programs' },
      { $set: { maxCapacity: 15 } }
    );
    
    console.log('✅ Updated Brooklyn Alternative Programs max capacity to 15');
    
    // Count current registrations
    const registrationCount = await db.collection('registrations').countDocuments({ 
      crawlLocation: location._id.toString() 
    });
    
    console.log(`\nCurrent registrations: ${registrationCount}`);
    console.log(`Available spots: ${15 - registrationCount} / 15`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await client.close();
  }
}

updateBrooklynCapacity();
