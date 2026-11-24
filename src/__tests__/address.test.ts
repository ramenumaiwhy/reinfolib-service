import { describe, test, expect } from 'vitest';
import { getPrefName, getDistrictName, filterByDistrict } from '../app';
import type { TransactionItem } from '../types';

// ─── getPrefName ────────────────────────────────

describe('getPrefName', () => {
  test('東京都（13xxx）', () => {
    expect(getPrefName('13113')).toBe('東京都');
  });

  test('神奈川県（14xxx）', () => {
    expect(getPrefName('14109')).toBe('神奈川県');
  });

  test('北海道（01xxx）', () => {
    expect(getPrefName('01100')).toBe('北海道');
  });

  test('沖縄県（47xxx）', () => {
    expect(getPrefName('47201')).toBe('沖縄県');
  });

  test('存在しないコードは空文字', () => {
    expect(getPrefName('99999')).toBe('');
    expect(getPrefName('00000')).toBe('');
  });

  test('2桁でも先頭2文字で判定', () => {
    // getPrefName('13') → substring(0,2) = '13' → '東京都'
    expect(getPrefName('13')).toBe('東京都');
  });
});

// ─── getDistrictName ────────────────────────────

describe('getDistrictName', () => {
  test('漢数字の丁目を除去', () => {
    expect(getDistrictName('恵比寿一丁目')).toBe('恵比寿');
    expect(getDistrictName('代官山三丁目')).toBe('代官山');
  });

  test('アラビア数字の丁目を除去', () => {
    expect(getDistrictName('新宿1丁目')).toBe('新宿');
    expect(getDistrictName('渋谷12丁目')).toBe('渋谷');
  });

  test('十以上の漢数字', () => {
    expect(getDistrictName('上野十二丁目')).toBe('上野');
  });

  test('丁目がない場合はそのまま', () => {
    expect(getDistrictName('恵比寿')).toBe('恵比寿');
    expect(getDistrictName('代官山')).toBe('代官山');
  });

  test('空文字', () => {
    expect(getDistrictName('')).toBe('');
  });
});

// ─── filterByDistrict ───────────────────────────

const MOCK_DATA: TransactionItem[] = [
  { Prefecture: '東京都', Municipality: '渋谷区', DistrictName: '恵比寿' },
  { Prefecture: '東京都', Municipality: '渋谷区', DistrictName: '恵比寿' },
  { Prefecture: '東京都', Municipality: '渋谷区', DistrictName: '代官山' },
  { Prefecture: '東京都', Municipality: '新宿区', DistrictName: '歌舞伎町' },
  { Prefecture: '神奈川県', Municipality: '横浜市緑区', DistrictName: '長津田' },
];

describe('filterByDistrict', () => {
  test('地区名で絞り込み', () => {
    const result = filterByDistrict(MOCK_DATA, '東京都', '渋谷区', '恵比寿');
    expect(result).toHaveLength(2);
    expect(result.every(r => r.DistrictName === '恵比寿')).toBe(true);
  });

  test('都道府県が一致しないと除外', () => {
    const result = filterByDistrict(MOCK_DATA, '大阪府', '渋谷区', '恵比寿');
    expect(result).toHaveLength(0);
  });

  test('市区町村が一致しないと除外', () => {
    const result = filterByDistrict(MOCK_DATA, '東京都', '港区', '恵比寿');
    expect(result).toHaveLength(0);
  });

  test('地区名が一致しないと除外', () => {
    const result = filterByDistrict(MOCK_DATA, '東京都', '渋谷区', '広尾');
    expect(result).toHaveLength(0);
  });

  test('区付き自治体の末尾マッチ', () => {
    // municipality='緑区' で itemMuni='横浜市緑区' → endsWith('緑区') = true
    const result = filterByDistrict(MOCK_DATA, '神奈川県', '緑区', '長津田');
    expect(result).toHaveLength(1);
  });

  test('空の入力データ → 空配列', () => {
    expect(filterByDistrict([], '東京都', '渋谷区', '恵比寿')).toHaveLength(0);
  });
});
