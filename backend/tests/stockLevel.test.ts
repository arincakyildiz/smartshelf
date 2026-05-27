import { getStockLevel } from '../src/types';

describe('getStockLevel() – kritik seviye eşikleri (PDF spec)', () => {
  describe('Kritik seviye (< 10)', () => {
    it.each([0, 1, 5, 9])('quantity=%i → critical', (q) => {
      expect(getStockLevel(q)).toBe('critical');
    });
  });

  describe('Düşük seviye (10 – 24)', () => {
    it.each([10, 15, 20, 24])('quantity=%i → low', (q) => {
      expect(getStockLevel(q)).toBe('low');
    });
  });

  describe('Normal seviye (25+)', () => {
    it.each([25, 50, 100, 1000])('quantity=%i → normal', (q) => {
      expect(getStockLevel(q)).toBe('normal');
    });
  });
});
