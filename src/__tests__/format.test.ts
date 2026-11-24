import { describe, test, expect } from 'vitest';
import { formatManYen, formatPrice } from '../app';

// ─── formatManYen ───────────────────────────────

describe('formatManYen', () => {
  test('通常値（万円に変換、小数1桁）', () => {
    expect(formatManYen(2203860)).toBe('220.4');
    expect(formatManYen(10000)).toBe('1.0');
    expect(formatManYen(100000)).toBe('10.0');
    expect(formatManYen(15000)).toBe('1.5');
  });

  test('null → "-"', () => {
    expect(formatManYen(null)).toBe('-');
  });

  test('undefined → "-"', () => {
    expect(formatManYen(undefined)).toBe('-');
  });

  test('0 → "0.0"（null ではないので計算される）', () => {
    expect(formatManYen(0)).toBe('0.0');
  });

  test('大きな値', () => {
    // 1億 = 100000000 → 10000.0万円
    expect(formatManYen(100000000)).toBe('10000.0');
  });
});

// ─── formatPrice ────────────────────────────────

describe('formatPrice', () => {
  test('1億以上は億表示', () => {
    expect(formatPrice(100000000)).toBe('1.0億');
    expect(formatPrice(150000000)).toBe('1.5億');
    expect(formatPrice(200000000)).toBe('2.0億');
  });

  test('1億未満は万表示', () => {
    const result = formatPrice(80000000);
    // toLocaleString がカンマ区切りを入れる: "8,000万"
    expect(result).toBe('8,000万');
  });

  test('文字列入力も処理できる', () => {
    expect(formatPrice('100000000')).toBe('1.0億');
    const result = formatPrice('50000000');
    expect(result).toContain('万');
  });

  test('0 → "-"', () => {
    expect(formatPrice(0)).toBe('-');
  });

  test('null → "-"', () => {
    expect(formatPrice(null)).toBe('-');
  });

  test('undefined → "-"', () => {
    expect(formatPrice(undefined)).toBe('-');
  });

  test('空文字 → "-"', () => {
    expect(formatPrice('')).toBe('-');
  });

  test('負の値 → "-"', () => {
    expect(formatPrice(-1000000)).toBe('-');
  });

  test('NaN文字列 → "-"', () => {
    expect(formatPrice('abc')).toBe('-');
  });

  test('小さい値', () => {
    // 10000 → Math.round(10000/10000) = 1 → "1万"
    const result = formatPrice(10000);
    expect(result).toContain('1');
    expect(result).toContain('万');
  });
});
