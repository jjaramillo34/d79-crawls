// One-time cleanup: proper-case first/last names and lowercase emails in registrations and the waitlist.
// The same rules run on every new sign-up (src/lib/names.ts); keep the two in sync.
//
//   npm run normalize:names            # preview only, changes nothing
//   npm run normalize:names -- --apply # writes the changes
//
// Before writing, the original values are saved to a backup collection named
// `backup_names_emails_<timestamp>` so the change can be undone.

if (!process.env.MONGODB_URI) {
  require('dotenv').config({ path: '.env.local', quiet: true });
}

const { MongoClient } = require('mongodb');

const APPLY = process.argv.includes('--apply');
const COLLECTIONS = ['registrations', 'waitlist'];
const ROMAN_NUMERALS = new Set(['II', 'III', 'IV', 'VI', 'VII', 'VIII', 'IX']);

function capitalizeParts(word) {
  return word.toLowerCase().replace(/(^|[-'’])(\p{L})/gu, (_, sep, letter) => sep + letter.toUpperCase());
}

// Only words typed all lowercase or ALL CAPS are changed; mixed case (McGillicuddy) is kept
function toProperCaseName(name) {
  return name
    .trim()
    .replace(/\s+/g, ' ')
    .split(' ')
    .map(word => {
      if (ROMAN_NUMERALS.has(word.toUpperCase()) && word === word.toUpperCase()) return word;
      const isAllLower = word === word.toLowerCase();
      const isAllUpper = word === word.toUpperCase();
      return isAllLower || isAllUpper ? capitalizeParts(word) : word;
    })
    .join(' ');
}

async function main() {
  if (!process.env.MONGODB_URI) {
    console.error('❌ MONGODB_URI is not set (in the shell or .env.local)');
    process.exitCode = 1;
    return;
  }

  const client = new MongoClient(process.env.MONGODB_URI);
  try {
    await client.connect();
    const db = client.db('d79-crawls');
    console.log(`Connected to ${new URL(process.env.MONGODB_URI).host} (database: d79-crawls) — ${APPLY ? 'APPLYING changes' : 'preview only'}\n`);

    const backupName = `backup_names_emails_${new Date().toISOString().replace(/[:.]/g, '-')}`;
    let totalChanged = 0;

    for (const name of COLLECTIONS) {
      const collection = db.collection(name);
      const docs = await collection.find({}, { projection: { email: 1, firstName: 1, lastName: 1 } }).toArray();
      const changes = [];

      for (const doc of docs) {
        const update = {};
        if (typeof doc.email === 'string' && doc.email !== doc.email.trim().toLowerCase()) update.email = doc.email.trim().toLowerCase();
        for (const field of ['firstName', 'lastName']) {
          if (typeof doc[field] === 'string') {
            const fixed = toProperCaseName(doc[field]);
            if (fixed !== doc[field]) update[field] = fixed;
          }
        }
        if (Object.keys(update).length > 0) changes.push({ doc, update });
      }

      console.log(`${name}: ${changes.length} of ${docs.length} records need changes`);
      for (const { doc, update } of changes) {
        const parts = Object.entries(update).map(([field, value]) => `${field}: ${JSON.stringify(doc[field])} → ${JSON.stringify(value)}`);
        console.log(`  - ${parts.join(' | ')}`);
      }
      console.log('');

      if (APPLY && changes.length > 0) {
        await db.collection(backupName).insertMany(changes.map(({ doc, update }) => ({
          collection: name,
          docId: doc._id,
          before: Object.fromEntries(Object.keys(update).map(field => [field, doc[field]])),
          after: update,
          savedAt: new Date(),
        })));
        await collection.bulkWrite(changes.map(({ doc, update }) => ({
          updateOne: { filter: { _id: doc._id }, update: { $set: update } },
        })));
      }
      totalChanged += changes.length;
    }

    if (!APPLY) {
      console.log(`Preview only: ${totalChanged} record(s) would change. Run with --apply to write them.`);
    } else if (totalChanged > 0) {
      console.log(`✅ Updated ${totalChanged} record(s). Original values saved in the "${backupName}" collection.`);
    } else {
      console.log('Nothing to change.');
    }
  } catch (error) {
    console.error('Error normalizing names/emails:', error);
    process.exitCode = 1;
  } finally {
    await client.close();
  }
}

main();
