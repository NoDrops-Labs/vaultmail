import { Db, MongoClient } from 'mongodb';

let clientPromise: Promise<MongoClient> | null = null;
let warnedMissingMongo = false;

const getUri = () => process.env.MONGODB_URI?.trim() || '';
const getDbName = () => process.env.MONGODB_DB || 'vaultmail';

const warnMissingMongo = () => {
  if (warnedMissingMongo) return;
  warnedMissingMongo = true;
  console.warn(
    'MONGODB_URI is not set. Storage-backed features are disabled until MongoDB is configured.'
  );
};

const getClient = async () => {
  const uri = getUri();
  if (!uri) {
    warnMissingMongo();
    return null;
  }
  if (!clientPromise) {
    const client = new MongoClient(uri, {
      maxPoolSize: 3,
      minPoolSize: 0,
      serverSelectionTimeoutMS: 10000,
    });
    clientPromise = client.connect();
  }
  return clientPromise;
};

const getDb = async () => {
  const client = await getClient();
  return client?.db(getDbName()) ?? null;
};

const withDb = async <T>(fallback: T, action: (db: Db) => Promise<T>) => {
  const db = await getDb();
  if (!db) return fallback;
  return action(db);
};

type StoredValue = unknown;

type KeyValueDocument = {
  _id: string;
  value: StoredValue;
  expiresAt?: Date | null;
};

type ListMetaDocument = {
  _id: string;
  expiresAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

type ListItemDocument = {
  key: string;
  value: StoredValue;
  createdAt: Date;
};

const isExpired = (expiresAt?: Date | null) =>
  Boolean(expiresAt && expiresAt.getTime() <= Date.now());

const cleanupExpiredList = async (db: Db, key: string) => {
  const listMeta = db.collection<ListMetaDocument>('list_meta');
  const listItems = db.collection<ListItemDocument>('list_items');
  const meta = await listMeta.findOne({ _id: key });
  if (meta && isExpired(meta.expiresAt)) {
    await Promise.all([
      listMeta.deleteOne({ _id: key }),
      listItems.deleteMany({ key })
    ]);
    return null;
  }
  return meta;
};

const cleanupEmptyListMeta = async (db: Db, key: string) => {
  const listMeta = db.collection<ListMetaDocument>('list_meta');
  const listItems = db.collection<ListItemDocument>('list_items');
  const count = await listItems.countDocuments({ key }, { limit: 1 });
  if (count === 0) {
    await listMeta.deleteOne({ _id: key });
  }
};

const patternToRegex = (pattern: string) => {
  const escaped = pattern.replace(/[-/\\^$+?.()|[\]{}]/g, '\\$&');
  const regexBody = escaped.replace(/\*/g, '.*');
  return new RegExp(`^${regexBody}$`);
};

export const storage = {
  async get(key: string) {
    return withDb<StoredValue | null>(null, async (db) => {
      const kv = db.collection<KeyValueDocument>('kv_store');
      const doc = await kv.findOne({ _id: key });
      if (!doc) return null;
      if (isExpired(doc.expiresAt)) {
        await kv.deleteOne({ _id: key });
        return null;
      }
      return doc.value;
    });
  },

  async set(key: string, value: StoredValue, options?: { ex?: number }) {
    await withDb<void>(undefined, async (db) => {
      const kv = db.collection<KeyValueDocument>('kv_store');
      const expiresAt = options?.ex
        ? new Date(Date.now() + options.ex * 1000)
        : null;
      await kv.updateOne(
        { _id: key },
        { $set: { value, expiresAt } },
        { upsert: true }
      );
    });
  },

  async exists(key: string) {
    return withDb(0, async (db) => {
      const kv = db.collection<KeyValueDocument>('kv_store');
      const doc = await kv.findOne({ _id: key }, { projection: { expiresAt: 1 } });
      if (!doc) return 0;
      if (isExpired(doc.expiresAt)) {
        await kv.deleteOne({ _id: key });
        return 0;
      }
      return 1;
    });
  },

  async del(key: string) {
    await withDb<void>(undefined, async (db) => {
      const kv = db.collection<KeyValueDocument>('kv_store');
      await kv.deleteOne({ _id: key });
    });
  },

  async expire(key: string, seconds: number) {
    await withDb<void>(undefined, async (db) => {
      const kv = db.collection<KeyValueDocument>('kv_store');
      const listMeta = db.collection<ListMetaDocument>('list_meta');
      const expiresAt = new Date(Date.now() + seconds * 1000);
      await Promise.all([
        kv.updateOne({ _id: key }, { $set: { expiresAt } }),
        listMeta.updateOne({ _id: key }, { $set: { expiresAt } })
      ]);
    });
  },

  async lpush(key: string, value: StoredValue) {
    await withDb<void>(undefined, async (db) => {
      const listMeta = db.collection<ListMetaDocument>('list_meta');
      const listItems = db.collection<ListItemDocument>('list_items');
      await cleanupExpiredList(db, key);
      await listItems.insertOne({ key, value, createdAt: new Date() });
      const now = new Date();
      await listMeta.updateOne(
        { _id: key },
        {
          $set: { updatedAt: now },
          $setOnInsert: { createdAt: now, expiresAt: null }
        },
        { upsert: true }
      );
    });
  },

  async lrange(key: string, start: number, end: number) {
    return withDb<StoredValue[]>([], async (db) => {
      const listItems = db.collection<ListItemDocument>('list_items');
      const meta = await cleanupExpiredList(db, key);
      if (!meta) return [];
      const query = listItems.find({ key }).sort({ createdAt: -1, _id: -1 });
      const safeStart = Math.max(0, start);
      if (safeStart > 0) {
        query.skip(safeStart);
      }
      if (end >= 0) {
        const limit = Math.max(0, end - safeStart + 1);
        if (limit === 0) return [];
        query.limit(limit);
      }
      const docs = await query.toArray();
      return docs.map((doc) => doc.value);
    });
  },

  async llen(key: string) {
    return withDb(0, async (db) => {
      const listItems = db.collection<ListItemDocument>('list_items');
      const meta = await cleanupExpiredList(db, key);
      if (!meta) return 0;
      return listItems.countDocuments({ key });
    });
  },

  async ldeleteByIds(key: string, ids: string[]) {
    return withDb(0, async (db) => {
      if (ids.length === 0) return 0;
      const listItems = db.collection<ListItemDocument>('list_items');
      const result = await listItems.deleteMany({
        key,
        'value.id': { $in: ids }
      });
      await cleanupEmptyListMeta(db, key);
      return result.deletedCount ?? 0;
    });
  },

  async ldeleteOlderThanIsoDate(key: string, isoDate: string) {
    return withDb(0, async (db) => {
      const listItems = db.collection<ListItemDocument>('list_items');
      const result = await listItems.deleteMany({
        key,
        'value.receivedAt': { $lt: isoDate }
      });
      await cleanupEmptyListMeta(db, key);
      return result.deletedCount ?? 0;
    });
  },

  async keys(pattern: string) {
    return withDb<string[]>([], async (db) => {
      const listMeta = db.collection<ListMetaDocument>('list_meta');
      const listItems = db.collection<ListItemDocument>('list_items');
      const regex = patternToRegex(pattern);
      const metas = await listMeta.find({ _id: { $regex: regex } }).toArray();
      const now = Date.now();
      const validKeys: string[] = [];
      const expiredKeys: string[] = [];
      for (const meta of metas) {
        if (meta.expiresAt && meta.expiresAt.getTime() <= now) {
          expiredKeys.push(meta._id);
        } else {
          validKeys.push(meta._id);
        }
      }
      if (expiredKeys.length > 0) {
        await Promise.all([
          listMeta.deleteMany({ _id: { $in: expiredKeys } }),
          listItems.deleteMany({ key: { $in: expiredKeys } })
        ]);
      }
      return validKeys;
    });
  }
};
