import { describe, test, expect } from 'vitest';
import { getUseDistrict, getZoningCategory } from '../app';
import type { TransactionItem } from '../types';

// ─── getUseDistrict ─────────────────────────────

describe('getUseDistrict', () => {
  test('UseDistrictがある場合はそれを返す', () => {
    const item: TransactionItem = { UseDistrict: '第一種住居地域' };
    expect(getUseDistrict(item)).toBe('第一種住居地域');
  });

  test('UseDistrictがなくCityPlanningがある場合はCityPlanningを返す', () => {
    const item: TransactionItem = { CityPlanning: '商業地域' };
    expect(getUseDistrict(item)).toBe('商業地域');
  });

  test('UseDistrictが優先される', () => {
    const item: TransactionItem = { UseDistrict: '住居地域', CityPlanning: '商業地域' };
    expect(getUseDistrict(item)).toBe('住居地域');
  });

  test('両方ない場合は空文字', () => {
    const item: TransactionItem = {};
    expect(getUseDistrict(item)).toBe('');
  });
});

// ─── getZoningCategory ─────────────────────────

describe('getZoningCategory', () => {
  test('住居系の判定', () => {
    expect(getZoningCategory('第一種住居地域')).toBe('住居系');
    expect(getZoningCategory('第１種住居地域')).toBe('住居系');
    expect(getZoningCategory('第１種低層住居専用地域')).toBe('住居系');
    expect(getZoningCategory('第２種中高層住居専用地域')).toBe('住居系');
    expect(getZoningCategory('準住居地域')).toBe('住居系');
    expect(getZoningCategory('田園住居地域')).toBe('住居系');
  });

  test('商業系の判定', () => {
    expect(getZoningCategory('商業地域')).toBe('商業系');
    expect(getZoningCategory('近隣商業地域')).toBe('商業系');
  });

  test('工業系の判定', () => {
    expect(getZoningCategory('工業地域')).toBe('工業系');
    expect(getZoningCategory('準工業地域')).toBe('工業系');
    expect(getZoningCategory('工業専用地域')).toBe('工業系');
  });

  test('不明な用途地域は空文字', () => {
    expect(getZoningCategory('市街化調整区域')).toBe('');
    expect(getZoningCategory('未指定')).toBe('');
  });

  test('空文字は空文字', () => {
    expect(getZoningCategory('')).toBe('');
  });

  test('全角数字バリアント', () => {
    expect(getZoningCategory('第１種住居')).toBe('住居系');
    expect(getZoningCategory('第２種住居')).toBe('住居系');
  });

  test('略称バリアント', () => {
    expect(getZoningCategory('近隣商業')).toBe('商業系');
    expect(getZoningCategory('準工業')).toBe('工業系');
  });

  test('部分一致で判定される（indexOf >= 0 相当）', () => {
    // 'XX第一種住居地域YY' のような文字列でも判定可能
    expect(getZoningCategory('XX第一種住居地域YY')).toBe('住居系');
  });
});
