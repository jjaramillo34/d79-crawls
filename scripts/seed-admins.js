// Script to create/update admin user accounts for the admin panel
// Run with: npm run seed:admins
//
// Passwords:
//   - If SEED_ADMIN_DEFAULT_PASSWORD is set, every NEW account gets that password.
//   - Otherwise a unique random password is generated per new account and printed ONCE below.
// Existing accounts keep their current password unless RESET_ADMIN_PASSWORDS=true.
// Seeded/reset accounts must choose a new password on first sign-in.
// Extra accounts can be added with SEED_ADMIN_EMAILS="a@schools.nyc.gov,b@schools.nyc.gov".

// Fall back to .env.local whenever MONGODB_URI isn't already set in the shell
if (!process.env.MONGODB_URI) {
  require('dotenv').config({ path: '.env.local', quiet: true });
}

const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { MongoClient } = require('mongodb');

// No localhost default: silently seeding a local database looks like success but nobody can sign in
const MONGODB_URI = process.env.MONGODB_URI;
const RESET = process.env.RESET_ADMIN_PASSWORDS === 'true';
const DEFAULT_PASSWORD = process.env.SEED_ADMIN_DEFAULT_PASSWORD;
const MIN_PASSWORD_LENGTH = 12;

const ADMIN_EMAILS = [
  'jjaramillo7@schools.nyc.gov',
  'SOliger@schools.nyc.gov',
  ...(process.env.SEED_ADMIN_EMAILS || '').split(','),
]
  .map((email) => email.trim().toLowerCase())
  .filter(Boolean)
  .filter((email, index, all) => all.indexOf(email) === index);

function generatePassword() {
  return crypto.randomBytes(12).toString('base64url');
}

async function seedAdmins() {
  if (DEFAULT_PASSWORD && DEFAULT_PASSWORD.length < MIN_PASSWORD_LENGTH) {
    console.error(`❌ SEED_ADMIN_DEFAULT_PASSWORD must be at least ${MIN_PASSWORD_LENGTH} characters`);
    process.exitCode = 1;
    return;
  }

  if (!MONGODB_URI) {
    console.error('❌ MONGODB_URI is not set (in the shell or .env.local)');
    process.exitCode = 1;
    return;
  }

  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    console.log(`Connected to MongoDB at ${new URL(MONGODB_URI).host} (database: d79-crawls)`);

    const users = client.db('d79-crawls').collection('adminUsers');
    await users.createIndex({ email: 1 }, { unique: true });

    const issued = [];

    for (const email of ADMIN_EMAILS) {
      const existing = await users.findOne({ email });

      if (existing && !RESET) {
        console.log(`• ${email} already exists — password unchanged`);
        continue;
      }

      const password = DEFAULT_PASSWORD || generatePassword();
      const passwordHash = await bcrypt.hash(password, 12);
      const now = new Date();

      await users.updateOne(
        { email },
        {
          // Seeded passwords are one-time: the user must pick their own on first sign-in
          $set: { passwordHash, isActive: true, mustChangePassword: true, updatedAt: now },
          $setOnInsert: { email, createdAt: now },
        },
        { upsert: true }
      );

      if (existing) {
        // Changing the password signs the user out everywhere
        await client.db('d79-crawls').collection('adminSessions').deleteMany({ email });
      }

      console.log(`✅ ${existing ? 'Reset password for' : 'Created'} ${email}`);
      issued.push({ email, password: DEFAULT_PASSWORD ? '(SEED_ADMIN_DEFAULT_PASSWORD)' : password });
    }

    if (issued.length > 0) {
      console.log('\n🔐 One-time credentials — share securely, they will not be shown again:');
      console.table(issued);
    }

  } catch (error) {
    console.error('Error seeding admin users:', error);
    process.exitCode = 1;
  } finally {
    await client.close();
  }
}

seedAdmins();
