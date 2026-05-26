import { findMatches } from '../src/services/matchingService';

// Mock database
jest.mock('../src/config/database', () => ({
  default: {
    query: jest.fn(),
  },
}));

import pool from '../src/config/database';
const mockPool = pool as jest.Mocked<typeof pool>;

describe('matchingService', () => {
  beforeEach(() => jest.clearAllMocks());

  it('should score same-city stores higher', async () => {
    (mockPool.query as jest.Mock).mockResolvedValue({
      rows: [
        {
          store_id: 2,
          quantity: 50,
          store_name: 'Mağaza B',
          store_city: 'İstanbul',
          requesting_city: 'İstanbul',
        },
        {
          store_id: 3,
          quantity: 50,
          store_name: 'Mağaza C',
          store_city: 'Ankara',
          requesting_city: 'İstanbul',
        },
      ],
    });

    const matches = await findMatches(1, 1, 10);
    expect(matches[0].source_store_city).toBe('İstanbul');
    expect(matches[0].score).toBeGreaterThan(matches[1].score);
  });

  it('should score excess stock stores higher', async () => {
    (mockPool.query as jest.Mock).mockResolvedValue({
      rows: [
        {
          store_id: 2,
          quantity: 40, // excess >= 25 → +40
          store_name: 'Mağaza B',
          store_city: 'Ankara',
          requesting_city: 'İstanbul',
        },
        {
          store_id: 3,
          quantity: 12, // excess < 10
          store_name: 'Mağaza C',
          store_city: 'Ankara',
          requesting_city: 'İstanbul',
        },
      ],
    });

    const matches = await findMatches(1, 1, 10);
    expect(matches[0].source_store_id).toBe(2);
    expect(matches[0].reasons).toContain('Fazla stok mevcut');
  });

  it('should return empty array when no stores available', async () => {
    (mockPool.query as jest.Mock).mockResolvedValue({ rows: [] });
    const matches = await findMatches(1, 1, 10);
    expect(matches).toHaveLength(0);
  });

  it('should sort by score descending', async () => {
    (mockPool.query as jest.Mock).mockResolvedValue({
      rows: [
        { store_id: 2, quantity: 10, store_name: 'B', store_city: 'Ankara', requesting_city: 'İstanbul' },
        { store_id: 3, quantity: 80, store_name: 'C', store_city: 'İstanbul', requesting_city: 'İstanbul' },
        { store_id: 4, quantity: 30, store_name: 'D', store_city: 'İzmir', requesting_city: 'İstanbul' },
      ],
    });

    const matches = await findMatches(1, 1, 5);
    for (let i = 1; i < matches.length; i++) {
      expect(matches[i - 1].score).toBeGreaterThanOrEqual(matches[i].score);
    }
  });
});
