import { findMatches } from '../src/services/matchingService';

jest.mock('../src/config/database', () => ({
  default: { query: jest.fn() },
}));

import pool from '../src/config/database';
const mockQuery = pool.query as jest.Mock;

describe('matchingService – findMatches()', () => {
  beforeEach(() => jest.clearAllMocks());

  it('should score same-city store higher than different-city store', async () => {
    mockQuery.mockResolvedValue({
      rows: [
        { store_id: 2, quantity: 50, store_name: 'B', store_city: 'İstanbul', requesting_city: 'İstanbul' },
        { store_id: 3, quantity: 50, store_name: 'C', store_city: 'Ankara',   requesting_city: 'İstanbul' },
      ],
    });
    const matches = await findMatches(1, 1, 10);
    expect(matches[0].source_store_city).toBe('İstanbul');
    expect(matches[0].score).toBeGreaterThan(matches[1].score);
  });

  it('should award +40 for excess stock >= 25', async () => {
    mockQuery.mockResolvedValue({
      rows: [
        { store_id: 2, quantity: 40, store_name: 'B', store_city: 'Ankara', requesting_city: 'İstanbul' },
      ],
    });
    const matches = await findMatches(1, 1, 10);
    // base 10 + excess (40-10=30 >= 25) +40 = 50
    expect(matches[0].score).toBe(50);
    expect(matches[0].reasons).toContain('Fazla stok mevcut');
  });

  it('should award +25 for moderate excess (10-24)', async () => {
    mockQuery.mockResolvedValue({
      rows: [
        { store_id: 2, quantity: 20, store_name: 'B', store_city: 'Ankara', requesting_city: 'İstanbul' },
      ],
    });
    const matches = await findMatches(1, 1, 5);
    // base 10 + excess (20-5=15 in [10,25)) +25 = 35
    expect(matches[0].score).toBe(35);
    expect(matches[0].reasons).toContain('Yeterli stok mevcut');
  });

  it('should give max score for same-city + excess stock', async () => {
    mockQuery.mockResolvedValue({
      rows: [
        { store_id: 2, quantity: 100, store_name: 'B', store_city: 'İstanbul', requesting_city: 'İstanbul' },
      ],
    });
    const matches = await findMatches(1, 1, 10);
    // base 10 + excess +40 + same-city +30 = 80
    expect(matches[0].score).toBe(80);
    expect(matches[0].reasons).toEqual(expect.arrayContaining(['Fazla stok mevcut', 'Aynı şehir']));
  });

  it('should return empty array when no candidate stores exist', async () => {
    mockQuery.mockResolvedValue({ rows: [] });
    const matches = await findMatches(1, 1, 10);
    expect(matches).toHaveLength(0);
  });

  it('should sort results by score descending', async () => {
    mockQuery.mockResolvedValue({
      rows: [
        { store_id: 2, quantity: 12,  store_name: 'B', store_city: 'Ankara',   requesting_city: 'İstanbul' },
        { store_id: 3, quantity: 100, store_name: 'C', store_city: 'İstanbul', requesting_city: 'İstanbul' },
        { store_id: 4, quantity: 30,  store_name: 'D', store_city: 'İzmir',    requesting_city: 'İstanbul' },
      ],
    });
    const matches = await findMatches(1, 1, 5);
    for (let i = 1; i < matches.length; i++) {
      expect(matches[i - 1].score).toBeGreaterThanOrEqual(matches[i].score);
    }
  });

  it('should exclude requesting store from results', async () => {
    mockQuery.mockResolvedValue({ rows: [] });
    await findMatches(1, 1, 10);
    const sql = mockQuery.mock.calls[0][0];
    expect(sql).toMatch(/i\.store_id\s*!=\s*\$1/);
  });

  it('should attach available_quantity correctly', async () => {
    mockQuery.mockResolvedValue({
      rows: [{ store_id: 2, quantity: 75, store_name: 'B', store_city: 'Ankara', requesting_city: 'İstanbul' }],
    });
    const [m] = await findMatches(1, 1, 10);
    expect(m.available_quantity).toBe(75);
  });
});

describe('Stock level boundaries', () => {
  const { getStockLevel } = require('../src/types');
  it('classifies < 10 as critical',            () => expect(getStockLevel(0)).toBe('critical'));
  it('classifies 9 as critical (boundary)',    () => expect(getStockLevel(9)).toBe('critical'));
  it('classifies 10 as low (boundary)',        () => expect(getStockLevel(10)).toBe('low'));
  it('classifies 24 as low (boundary)',        () => expect(getStockLevel(24)).toBe('low'));
  it('classifies 25 as normal (boundary)',     () => expect(getStockLevel(25)).toBe('normal'));
  it('classifies 100 as normal',               () => expect(getStockLevel(100)).toBe('normal'));
});
