import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const originalEnv = { ...process.env };

type DeleteManyResult = { deletedCount: number | null | undefined };

type DeleteManyMock = ReturnType<typeof vi.fn> & {
  mockResolvedValue: (v: DeleteManyResult) => DeleteManyMock;
};
type CountDocumentsMock = ReturnType<typeof vi.fn> & {
  mockResolvedValue: (v: number) => CountDocumentsMock;
};

interface CollectionMock {
  deleteMany: DeleteManyMock;
  countDocuments: CountDocumentsMock;
  deleteOne: DeleteManyMock;
}

interface DbMock {
  collection: ReturnType<typeof vi.fn>;
}

interface ClientMock {
  connect: ReturnType<typeof vi.fn>;
  db: ReturnType<typeof vi.fn>;
}

const mocks = vi.hoisted(() => {
  const collectionMock: CollectionMock = {
    deleteMany: vi.fn().mockResolvedValue({ deletedCount: 0 }),
    countDocuments: vi.fn().mockResolvedValue(0),
    deleteOne: vi.fn().mockResolvedValue({ deletedCount: 1 })
  };
  const dbMock: DbMock = {
    collection: vi.fn().mockReturnValue(collectionMock)
  };
  const clientMock: ClientMock = {
    connect: vi.fn(),
    db: vi.fn().mockReturnValue(dbMock)
  };
  clientMock.connect.mockResolvedValue(clientMock);
  function MongoClientCtor() {
    return clientMock;
  }
  return { collectionMock, dbMock, clientMock, MongoClientCtor };
});

vi.mock('mongodb', () => ({
  MongoClient: mocks.MongoClientCtor as unknown as {
    new (uri: string): ClientMock;
  },
}));

describe('storage ldeleteByIds / ldeleteOlderThanIsoDate', () => {
  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
    process.env.MONGODB_URI = 'mongodb://test-server/vaultmail';
    process.env.MONGODB_DB = 'vaultmail';
    mocks.collectionMock.deleteMany.mockClear();
    mocks.collectionMock.countDocuments.mockClear();
    mocks.collectionMock.deleteOne.mockClear();
    mocks.dbMock.collection.mockClear();
    mocks.clientMock.db.mockClear();
    mocks.collectionMock.deleteMany.mockResolvedValue({ deletedCount: 0 });
    mocks.collectionMock.countDocuments.mockResolvedValue(0);
    mocks.collectionMock.deleteOne.mockResolvedValue({ deletedCount: 1 });
    mocks.dbMock.collection.mockReturnValue(mocks.collectionMock);
    mocks.clientMock.db.mockReturnValue(mocks.dbMock);
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('ldeleteByIds returns 0 and does not call deleteMany for empty ids array', async () => {
    const { storage } = await import('@/lib/storage');
    const result = await storage.ldeleteByIds('inbox:test@example.com', []);
    expect(result).toBe(0);
    expect(mocks.collectionMock.deleteMany).not.toHaveBeenCalled();
  });

  it('ldeleteByIds deletes items where value.id is in ids array', async () => {
    mocks.collectionMock.deleteMany.mockResolvedValue({ deletedCount: 2 });
    mocks.collectionMock.countDocuments.mockResolvedValue(1);
    const { storage } = await import('@/lib/storage');
    const ids = ['email-1', 'email-2'];
    const result = await storage.ldeleteByIds('inbox:test@example.com', ids);
    expect(result).toBe(2);
    expect(mocks.collectionMock.deleteMany).toHaveBeenCalledTimes(1);
    const callArgs = mocks.collectionMock.deleteMany.mock.calls[0][0];
    expect(callArgs.key).toBe('inbox:test@example.com');
    expect(callArgs['value.id']).toEqual({ $in: ids });
  });

  it('ldeleteByIds calls cleanupEmptyListMeta (countDocuments) after delete', async () => {
    mocks.collectionMock.deleteMany.mockResolvedValue({ deletedCount: 1 });
    mocks.collectionMock.countDocuments.mockResolvedValue(0);
    const { storage } = await import('@/lib/storage');
    await storage.ldeleteByIds('inbox:test@example.com', ['email-1']);
    expect(mocks.collectionMock.countDocuments).toHaveBeenCalledWith(
      { key: 'inbox:test@example.com' },
      { limit: 1 }
    );
  });

  it('ldeleteByIds deletes list_meta when list is empty after delete', async () => {
    mocks.collectionMock.deleteMany.mockResolvedValue({ deletedCount: 1 });
    mocks.collectionMock.countDocuments.mockResolvedValue(0);
    const { storage } = await import('@/lib/storage');
    await storage.ldeleteByIds('inbox:test@example.com', ['email-1']);
    expect(mocks.collectionMock.deleteOne).toHaveBeenCalledWith({
      _id: 'inbox:test@example.com'
    });
  });

  it('ldeleteByIds does NOT delete list_meta when list still has items', async () => {
    mocks.collectionMock.deleteMany.mockResolvedValue({ deletedCount: 1 });
    mocks.collectionMock.countDocuments.mockResolvedValue(3);
    const { storage } = await import('@/lib/storage');
    await storage.ldeleteByIds('inbox:test@example.com', ['email-1']);
    expect(mocks.collectionMock.deleteOne).not.toHaveBeenCalled();
  });

  it('ldeleteByIds returns deleted count from result', async () => {
    mocks.collectionMock.deleteMany.mockResolvedValue({ deletedCount: 5 });
    mocks.collectionMock.countDocuments.mockResolvedValue(1);
    const { storage } = await import('@/lib/storage');
    const result = await storage.ldeleteByIds('inbox:test@example.com', [
      'a',
      'b',
      'c',
      'd',
      'e'
    ]);
    expect(result).toBe(5);
  });

  it('ldeleteByIds handles null deletedCount (returns 0)', async () => {
    mocks.collectionMock.deleteMany.mockResolvedValue({ deletedCount: null });
    mocks.collectionMock.countDocuments.mockResolvedValue(0);
    const { storage } = await import('@/lib/storage');
    const result = await storage.ldeleteByIds('inbox:test@example.com', [
      'email-1'
    ]);
    expect(result).toBe(0);
  });

  it('ldeleteOlderThanIsoDate deletes items where value.receivedAt < isoDate', async () => {
    mocks.collectionMock.deleteMany.mockResolvedValue({ deletedCount: 3 });
    mocks.collectionMock.countDocuments.mockResolvedValue(1);
    const { storage } = await import('@/lib/storage');
    const threshold = '2024-01-01T00:00:00.000Z';
    const result = await storage.ldeleteOlderThanIsoDate(
      'inbox:test@example.com',
      threshold
    );
    expect(result).toBe(3);
    expect(mocks.collectionMock.deleteMany).toHaveBeenCalledTimes(1);
    const callArgs = mocks.collectionMock.deleteMany.mock.calls[0][0];
    expect(callArgs.key).toBe('inbox:test@example.com');
    expect(callArgs['value.receivedAt']).toEqual({ $lt: threshold });
  });

  it('ldeleteOlderThanIsoDate does NOT accept a fieldPath param (constrained to value.receivedAt)', async () => {
    const { storage } = await import('@/lib/storage');
    const { ldeleteOlderThanIsoDate } = storage;
    expect(ldeleteOlderThanIsoDate.length).toBe(2);
  });

  it('ldeleteOlderThanIsoDate calls cleanupEmptyListMeta after delete', async () => {
    mocks.collectionMock.deleteMany.mockResolvedValue({ deletedCount: 2 });
    mocks.collectionMock.countDocuments.mockResolvedValue(0);
    const { storage } = await import('@/lib/storage');
    await storage.ldeleteOlderThanIsoDate(
      'inbox:test@example.com',
      '2024-01-01T00:00:00.000Z'
    );
    expect(mocks.collectionMock.countDocuments).toHaveBeenCalledWith(
      { key: 'inbox:test@example.com' },
      { limit: 1 }
    );
    expect(mocks.collectionMock.deleteOne).toHaveBeenCalledWith({
      _id: 'inbox:test@example.com'
    });
  });

  it('ldeleteOlderThanIsoDate returns deleted count', async () => {
    mocks.collectionMock.deleteMany.mockResolvedValue({ deletedCount: 7 });
    mocks.collectionMock.countDocuments.mockResolvedValue(1);
    const { storage } = await import('@/lib/storage');
    const result = await storage.ldeleteOlderThanIsoDate(
      'inbox:test@example.com',
      '2024-01-01T00:00:00.000Z'
    );
    expect(result).toBe(7);
  });

  it('ldeleteOlderThanIsoDate handles null deletedCount (returns 0)', async () => {
    mocks.collectionMock.deleteMany.mockResolvedValue({ deletedCount: null });
    mocks.collectionMock.countDocuments.mockResolvedValue(0);
    const { storage } = await import('@/lib/storage');
    const result = await storage.ldeleteOlderThanIsoDate(
      'inbox:test@example.com',
      '2024-01-01T00:00:00.000Z'
    );
    expect(result).toBe(0);
  });
});

describe('storage methods fall back when MONGODB_URI is unset', () => {
  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
    delete process.env.MONGODB_URI;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('ldeleteByIds returns 0 fallback when MONGODB_URI is unset', async () => {
    const { storage } = await import('@/lib/storage');
    const result = await storage.ldeleteByIds('inbox:test@example.com', [
      'email-1'
    ]);
    expect(result).toBe(0);
  });

  it('ldeleteOlderThanIsoDate returns 0 fallback when MONGODB_URI is unset', async () => {
    const { storage } = await import('@/lib/storage');
    const result = await storage.ldeleteOlderThanIsoDate(
      'inbox:test@example.com',
      '2024-01-01T00:00:00.000Z'
    );
    expect(result).toBe(0);
  });
});
