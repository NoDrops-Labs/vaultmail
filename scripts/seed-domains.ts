import { MongoClient } from 'mongodb';
import { SEED_DOMAINS } from '@/lib/domain-config.seed';
import { withPrefix } from '@/lib/storage-keys';

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB || 'vaultmail';

if (!uri) {
  console.error('MONGODB_URI is not set. Set it in .env.local or environment.');
  process.exit(1);
}

const DOMAINS_CONFIG_SETTINGS_KEY = withPrefix('settings:domains-config');

async function main() {
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db(dbName);
    const kv = db.collection('kv_store');
    await kv.updateOne(
      { _id: DOMAINS_CONFIG_SETTINGS_KEY },
      { $set: { value: SEED_DOMAINS } },
      { upsert: true }
    );
    console.log(`Seeded ${SEED_DOMAINS.length} master domains into ${DOMAINS_CONFIG_SETTINGS_KEY}`);
    for (const entry of SEED_DOMAINS) {
      const subCount = entry.subdomains.length;
      console.log(`  - ${entry.domain} (allowRoot=${entry.allowRoot}, subdomains=${subCount})`);
    }
  } finally {
    await client.close();
  }
}

main().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
