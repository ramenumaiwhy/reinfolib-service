import { describe, test, expect } from 'vitest';
import {
  calcTsuboStats,
  calcBuildingLandStats,
  removeOutliers,
  median,
  summarizeStats,
  summarizeByUseDistrict,
  TSUBO_PER_SQM,
} from '../app';
import type { TransactionItem } from '../types';

// Python test_e2e.py と同じモックデータ
const MOCK_TRANSACTIONS: TransactionItem[] = [
  {
    Type: '宅地(土地のみ)',
    TradePrice: '80000000',
    Area: '120',
    FloorAreaRatio: '200',
    Prefecture: '東京都',
    Municipality: '渋谷区',
    DistrictName: '恵比寿',
    UseDistrict: '第一種住居地域',
    Period: '令和6年第1四半期',
  },
  {
    Type: '宅地(土地のみ)',
    TradePrice: '60000000',
    Area: '90',
    FloorAreaRatio: '200',
    Prefecture: '東京都',
    Municipality: '渋谷区',
    DistrictName: '恵比寿',
    UseDistrict: '第一種住居地域',
    Period: '令和5年第3四半期',
  },
  {
    Type: '宅地(土地のみ)',
    TradePrice: '100000000',
    Area: '150',
    FloorAreaRatio: '300',
    Prefecture: '東京都',
    Municipality: '渋谷区',
    DistrictName: '恵比寿',
    UseDistrict: '商業地域',
    Period: '令和5年第2四半期',
  },
  {
    Type: '宅地(土地と建物)',
    TradePrice: '120000000',
    Area: '100',
    TotalFloorArea: '200',
    FloorAreaRatio: '200',
    BuildingYear: '令和2年',
    Structure: 'ＲＣ（鉄筋コンクリート造）',
    Prefecture: '東京都',
    Municipality: '渋谷区',
    DistrictName: '恵比寿',
    UseDistrict: '第一種住居地域',
    Period: '令和6年第1四半期',
  },
  {
    Type: '宅地(土地のみ)',
    TradePrice: '50000',
    Area: '10',
    FloorAreaRatio: '200',
    Prefecture: '東京都',
    Municipality: '渋谷区',
    DistrictName: '恵比寿',
    UseDistrict: '第一種住居地域',
    Period: '令和5年第1四半期',
  },
  {
    Type: '宅地(土地のみ)',
    TradePrice: '70000000',
    Area: '100',
    FloorAreaRatio: '200',
    Prefecture: '東京都',
    Municipality: '渋谷区',
    DistrictName: '代官山',
    UseDistrict: '第一種住居地域',
    Period: '令和5年第1四半期',
  },
];

// ─── median ────────────────────────────────────

describe('median', () => {
  test('空配列 → null', () => {
    expect(median([])).toBeNull();
  });

  test('1件 → そのまま返す', () => {
    expect(median([42])).toBe(42);
  });

  test('奇数件 → 中央の値', () => {
    expect(median([1, 3, 5])).toBe(3);
    expect(median([10, 20, 30, 40, 50])).toBe(30);
  });

  test('偶数件 → 中央2つの平均', () => {
    expect(median([1, 3])).toBe(2);
    expect(median([10, 20, 30, 40])).toBe(25);
  });

  test('ソートされていない配列も正しく処理', () => {
    expect(median([5, 1, 3])).toBe(3);
    expect(median([40, 10, 30, 20])).toBe(25);
  });

  test('元の配列を変更しない', () => {
    const arr = [3, 1, 2];
    median(arr);
    expect(arr).toEqual([3, 1, 2]);
  });
});

// ─── calcTsuboStats ─────────────────────────────

describe('calcTsuboStats', () => {
  test('土地のみ取引を抽出して坪単価を算出', () => {
    const results = calcTsuboStats(MOCK_TRANSACTIONS);
    // items 1,2,3,6 が対象（item 4=建物、item 5=低価格で除外）
    expect(results).toHaveLength(4);
  });

  test('坪単価の計算が正しい', () => {
    const results = calcTsuboStats(MOCK_TRANSACTIONS);
    // item 1: 80000000 / 120 * 3.30579 = 2203860.0
    expect(results[0].tsubo_price).toBeCloseTo(2203860.0, 0);
    expect(results[0].trade_price).toBe(80000000);
    expect(results[0].area_m2).toBe(120);
  });

  test('一種単価は坪単価÷(容積率/100)', () => {
    const results = calcTsuboStats(MOCK_TRANSACTIONS);
    // item 1: FloorAreaRatio=200 → ikishu = 2203860 / 2 = 1101930
    expect(results[0].ikishu_price).toBeCloseTo(1101930.0, 0);
    // item 3: FloorAreaRatio=300 → ikishu = 2203860 / 3 = 734620
    expect(results[2].ikishu_price).toBeCloseTo(734620.0, 0);
  });

  test('建物込み取引は除外される', () => {
    const results = calcTsuboStats(MOCK_TRANSACTIONS);
    const types = results.map(r => r.raw.Type);
    expect(types.every(t => t === '宅地(土地のみ)')).toBe(true);
  });

  test('取引価格10万円以下は除外される', () => {
    const results = calcTsuboStats(MOCK_TRANSACTIONS);
    // item 5 (TradePrice=50000) が除外されている
    expect(results.every(r => r.trade_price > 100000)).toBe(true);
  });

  test('面積0以下は除外される', () => {
    const items: TransactionItem[] = [
      { Type: '宅地(土地のみ)', TradePrice: '10000000', Area: '0', FloorAreaRatio: '200' },
      { Type: '宅地(土地のみ)', TradePrice: '10000000', Area: '-5', FloorAreaRatio: '200' },
    ];
    expect(calcTsuboStats(items)).toHaveLength(0);
  });

  test('容積率0のとき一種単価はnull', () => {
    const items: TransactionItem[] = [
      { Type: '宅地(土地のみ)', TradePrice: '10000000', Area: '100', FloorAreaRatio: '0' },
    ];
    const results = calcTsuboStats(items);
    expect(results).toHaveLength(1);
    expect(results[0].ikishu_price).toBeNull();
  });

  test('use_districtにUseDistrictフィールドが使われる', () => {
    const results = calcTsuboStats(MOCK_TRANSACTIONS);
    expect(results[0].use_district).toBe('第一種住居地域');
  });

  test('0件の入力 → 空配列', () => {
    expect(calcTsuboStats([])).toHaveLength(0);
  });
});

// ─── removeOutliers ─────────────────────────────

describe('removeOutliers', () => {
  test('3件未満はそのまま返す', () => {
    const results = [
      { tsubo_price: 1000000 },
      { tsubo_price: 100 }, // 極端な外れ値だが2件なので除外されない
    ];
    expect(removeOutliers(results)).toHaveLength(2);
  });

  test('中央値の1/5未満を除外する', () => {
    const results = [
      { tsubo_price: 1000000 },
      { tsubo_price: 1100000 },
      { tsubo_price: 1200000 },
      { tsubo_price: 50000 }, // 1050000/5 = 210000 未満 → 除外
    ];
    const filtered = removeOutliers(results);
    expect(filtered).toHaveLength(3);
    expect(filtered.every(r => r.tsubo_price >= 210000)).toBe(true);
  });

  test('偶数件では中央2件の平均の1/5を境界とする', () => {
    const rows = [210000, 1000000, 1100000, 1200000].map(tsubo_price => ({ tsubo_price }));
    expect(removeOutliers(rows)).toEqual(rows);
  });

  test('全件正常なら除外なし', () => {
    const results = calcTsuboStats(MOCK_TRANSACTIONS);
    // MOCK_TRANSACTIONSの正常4件は全て似た坪単価 → 除外なし
    const filtered = removeOutliers(results);
    expect(filtered).toHaveLength(results.length);
  });

  test('元の配列を変更しない', () => {
    const results = [
      { tsubo_price: 1000000 },
      { tsubo_price: 1100000 },
      { tsubo_price: 1200000 },
      { tsubo_price: 50000 },
    ];
    const original = [...results];
    removeOutliers(results);
    expect(results).toEqual(original);
  });
});

// ─── summarizeStats ─────────────────────────────

describe('summarizeStats', () => {
  test('坪単価の統計を算出', () => {
    const results = calcTsuboStats(MOCK_TRANSACTIONS);
    const stats = summarizeStats(results);

    expect(stats.count).toBe(4);
    expect(stats.tsubo_min).toBeCloseTo(2203860.0, 0);
    expect(stats.tsubo_max).toBeCloseTo(2314053.0, 0);
    // median of [2203860, 2203860, 2203860, 2314053] = (2203860 + 2203860) / 2 = 2203860
    expect(stats.tsubo_median).toBeCloseTo(2203860.0, 0);
  });

  test('一種単価の統計も算出される', () => {
    const results = calcTsuboStats(MOCK_TRANSACTIONS);
    const stats = summarizeStats(results);

    expect(stats.ikishu_min).toBeDefined();
    expect(stats.ikishu_max).toBeDefined();
    expect(stats.ikishu_median).toBeDefined();
    // ikishu_prices: [1101930, 1101930, 734620, 1157026.5]
    // min=734620, max=1157026.5, median=(1101930+1101930)/2=1101930
    expect(stats.ikishu_min).toBeCloseTo(734620.0, 0);
    expect(stats.ikishu_max).toBeCloseTo(1157026.5, 0);
    expect(stats.ikishu_median).toBeCloseTo(1101930.0, 0);
  });

  test('0件のとき', () => {
    const stats = summarizeStats([]);
    expect(stats.count).toBe(0);
    expect(stats.tsubo_min).toBeNull();
    expect(stats.tsubo_max).toBeNull();
    expect(stats.tsubo_median).toBeNull();
    expect(stats.ikishu_min).toBeUndefined();
  });

  test('1件のとき', () => {
    const stats = summarizeStats([{ tsubo_price: 1000000, ikishu_price: 500000 }]);
    expect(stats.count).toBe(1);
    expect(stats.tsubo_min).toBe(1000000);
    expect(stats.tsubo_max).toBe(1000000);
    expect(stats.tsubo_median).toBe(1000000);
  });
});

// ─── summarizeByUseDistrict ─────────────────────

describe('summarizeByUseDistrict', () => {
  test('用途地域別にグループ化して統計', () => {
    const results = calcTsuboStats(MOCK_TRANSACTIONS);
    const byDistrict = summarizeByUseDistrict(results);

    // '第一種住居地域' (items 1,2,6), '商業地域' (item 3)
    expect(Object.keys(byDistrict)).toContain('第一種住居地域');
    expect(Object.keys(byDistrict)).toContain('商業地域');

    const residential = byDistrict['第一種住居地域'];
    expect(residential.count).toBe(3);

    const commercial = byDistrict['商業地域'];
    expect(commercial.count).toBe(1);
    expect(commercial.tsubo_median).toBeCloseTo(2203860.0, 0);
  });

  test('use_districtが空の場合は「不明」にグループ化', () => {
    const results = [
      { tsubo_price: 1000000, ikishu_price: 500000, use_district: '' },
      { tsubo_price: 2000000, ikishu_price: 600000, use_district: '' },
    ];
    const byDistrict = summarizeByUseDistrict(results);
    expect(byDistrict['不明']).toBeDefined();
    expect(byDistrict['不明'].count).toBe(2);
  });
});
