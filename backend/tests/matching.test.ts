import { findMatches } from '../src/services/matchingService';

// Mock the models module
jest.mock('../src/models', () => ({
  __esModule: true,
  Store:     { findById: jest.fn() },
  Inventory: { find:     jest.fn() },
}));

import { Store, Inventory } from '../src/models';

// Helper: build a chainable mongoose-like query
function chainable(result: any) {
  return {
    populate: jest.fn().mockReturnThis(),
    lean:     jest.fn().mockResolvedValue(result),
  };
}

describe('matchingService – findMatches()', () => {
  beforeEach(() => jest.clearAllMocks());

  function mockReqStore(city: string) {
    (Store.findById as jest.Mock).mockReturnValue({
      lean: jest.fn().mockResolvedValue({ city, is_active: true }),
    });
  }

  function mockCandidates(rows: any[]) {
    (Inventory.find as jest.Mock).mockReturnValue(chainable(rows));
  }

  it('scores same-city store higher than different-city', async () => {
    mockReqStore('İstanbul');
    mockCandidates([
      { store_id: { _id: 'B', name: 'B', city: 'İstanbul', is_active: true }, quantity: 50 },
      { store_id: { _id: 'C', name: 'C', city: 'Ankara',   is_active: true }, quantity: 50 },
    ]);

    const matches = await findMatches('A', 'P1', 10);
    expect(matches[0].source_store_city).toBe('İstanbul');
    expect(matches[0].score).toBeGreaterThan(matches[1].score);
  });

  it('awards +40 for excess stock >= 25', async () => {
    mockReqStore('İstanbul');
    mockCandidates([
      { store_id: { _id: 'B', name: 'B', city: 'Ankara', is_active: true }, quantity: 40 },
    ]);
    const matches = await findMatches('A', 'P1', 10);
    // base 10 + excess +40 = 50
    expect(matches[0].score).toBe(50);
    expect(matches[0].reasons).toContain('Fazla stok mevcut');
  });

  it('awards +25 for moderate excess (10-24)', async () => {
    mockReqStore('İstanbul');
    mockCandidates([
      { store_id: { _id: 'B', name: 'B', city: 'Ankara', is_active: true }, quantity: 20 },
    ]);
    const matches = await findMatches('A', 'P1', 5);
    // base 10 + excess +25 = 35
    expect(matches[0].score).toBe(35);
    expect(matches[0].reasons).toContain('Yeterli stok mevcut');
  });

  it('gives max score for same-city + excess stock', async () => {
    mockReqStore('İstanbul');
    mockCandidates([
      { store_id: { _id: 'B', name: 'B', city: 'İstanbul', is_active: true }, quantity: 100 },
    ]);
    const matches = await findMatches('A', 'P1', 10);
    // base 10 + excess +40 + same-city +30 = 80
    expect(matches[0].score).toBe(80);
    expect(matches[0].reasons).toEqual(expect.arrayContaining(['Fazla stok mevcut', 'Aynı şehir']));
  });

  it('returns empty array when no candidate stores', async () => {
    mockReqStore('İstanbul');
    mockCandidates([]);
    expect(await findMatches('A', 'P1', 10)).toHaveLength(0);
  });

  it('sorts results by score descending', async () => {
    mockReqStore('İstanbul');
    mockCandidates([
      { store_id: { _id: 'B', name: 'B', city: 'Ankara',   is_active: true }, quantity: 12  },
      { store_id: { _id: 'C', name: 'C', city: 'İstanbul', is_active: true }, quantity: 100 },
      { store_id: { _id: 'D', name: 'D', city: 'İzmir',    is_active: true }, quantity: 30  },
    ]);
    const matches = await findMatches('A', 'P1', 5);
    for (let i = 1; i < matches.length; i++) {
      expect(matches[i - 1].score).toBeGreaterThanOrEqual(matches[i].score);
    }
  });

  it('attaches available_quantity correctly', async () => {
    mockReqStore('İstanbul');
    mockCandidates([
      { store_id: { _id: 'B', name: 'B', city: 'Ankara', is_active: true }, quantity: 75 },
    ]);
    const [m] = await findMatches('A', 'P1', 10);
    expect(m.available_quantity).toBe(75);
  });

  it('excludes inactive stores', async () => {
    mockReqStore('İstanbul');
    mockCandidates([
      { store_id: { _id: 'B', name: 'B', city: 'Ankara', is_active: false }, quantity: 100 },
    ]);
    expect(await findMatches('A', 'P1', 10)).toHaveLength(0);
  });
});

describe('Stock level boundaries', () => {
  const { getStockLevel } = require('../src/types');
  it('classifies < 10 as critical',         () => expect(getStockLevel(0)).toBe('critical'));
  it('classifies 9 as critical (boundary)', () => expect(getStockLevel(9)).toBe('critical'));
  it('classifies 10 as low (boundary)',     () => expect(getStockLevel(10)).toBe('low'));
  it('classifies 24 as low (boundary)',     () => expect(getStockLevel(24)).toBe('low'));
  it('classifies 25 as normal (boundary)',  () => expect(getStockLevel(25)).toBe('normal'));
  it('classifies 100 as normal',            () => expect(getStockLevel(100)).toBe('normal'));
});
