import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  convertJapaneseYear,
  classifyStructure,
  estimateBuildingResidual,
  calcBuildingLandStats,
  BUILDING_SPECS,
} from '../app';
import type { TransactionItem } from '../types';

// ─── convertJapaneseYear ────────────────────────

describe('convertJapaneseYear', () => {
  test('令和', () => {
    expect(convertJapaneseYear('令和2年')).toBe(2020);
    expect(convertJapaneseYear('令和6年')).toBe(2024);
    expect(convertJapaneseYear('令和10年')).toBe(2028);
  });

  test('平成', () => {
    expect(convertJapaneseYear('平成30年')).toBe(2018);
    expect(convertJapaneseYear('平成1年')).toBe(1989);
  });

  test('昭和', () => {
    expect(convertJapaneseYear('昭和60年')).toBe(1985);
    expect(convertJapaneseYear('昭和40年')).toBe(1965);
  });

  test('元年は1年として処理', () => {
    expect(convertJapaneseYear('令和元年')).toBe(2019);
    expect(convertJapaneseYear('平成元年')).toBe(1989);
    expect(convertJapaneseYear('昭和元年')).toBe(1926);
  });

  test('西暦', () => {
    expect(convertJapaneseYear('2020年')).toBe(2020);
    expect(convertJapaneseYear('1990年')).toBe(1990);
  });

  test('null/空文字 → null', () => {
    expect(convertJapaneseYear('')).toBeNull();
  });

  test('パースできない文字列 → null', () => {
    expect(convertJapaneseYear('不明')).toBeNull();
    expect(convertJapaneseYear('戦前')).toBeNull();
  });
});

// ─── classifyStructure ──────────────────────────

describe('classifyStructure', () => {
  test('SRC（鉄骨鉄筋コンクリート造）', () => {
    expect(classifyStructure('ＳＲＣ（鉄骨鉄筋コンクリート造）')).toBe(BUILDING_SPECS.SRC);
  });

  test('RC（鉄筋コンクリート造）', () => {
    expect(classifyStructure('ＲＣ（鉄筋コンクリート造）')).toBe(BUILDING_SPECS.RC);
  });

  test('軽量鉄骨造', () => {
    expect(classifyStructure('軽量鉄骨造')).toBe(BUILDING_SPECS.LS);
  });

  test('鉄骨造', () => {
    expect(classifyStructure('鉄骨造')).toBe(BUILDING_SPECS.S);
  });

  test('木造（デフォルト）', () => {
    expect(classifyStructure('木造')).toBe(BUILDING_SPECS.W);
    expect(classifyStructure('')).toBe(BUILDING_SPECS.W);
  });

  test('SRCはRCより先に判定される', () => {
    // 'ＳＲＣ' にも 'ＲＣ' が含まれるが、SRCが先に判定される
    const result = classifyStructure('ＳＲＣ（鉄骨鉄筋コンクリート造）');
    expect(result.useful_life).toBe(47);
    expect(result.unit_cost).toBe(335000); // SRC は 335000、RC は 334000
  });

  test('軽量鉄骨は鉄骨より先に判定される', () => {
    const result = classifyStructure('軽量鉄骨造');
    expect(result.useful_life).toBe(27); // LS=27, S=34
  });
});

// ─── estimateBuildingResidual ───────────────────

describe('estimateBuildingResidual', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 0, 1)); // 2026年に固定
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test('RC造の建物残価推定', () => {
    const item: TransactionItem = {
      TradePrice: '120000000',
      TotalFloorArea: '200',
      BuildingYear: '令和2年',
      Structure: 'ＲＣ（鉄筋コンクリート造）',
    };
    const result = estimateBuildingResidual(item);
    expect(result).not.toBeNull();

    // 2026 - 2020 = 築6年
    // RC: useful_life=47, unit_cost=334000
    // remainingRatio = 1 - 6/47 = 41/47 ≈ 0.87234
    // buildingValue = 334000 * 200 * (41/47) ≈ 58272340
    // estimatedLandPrice = 120000000 - 58272340.43 ≈ 61727659
    expect(result!.remaining_ratio).toBeCloseTo(41 / 47, 5);
    expect(result!.building_value).toBe(58272340);
    expect(result!.estimated_land_price).toBe(61727659);
  });

  test('木造の建物残価推定', () => {
    const item: TransactionItem = {
      TradePrice: '50000000',
      TotalFloorArea: '100',
      BuildingYear: '平成30年',
      Structure: '木造',
    };
    const result = estimateBuildingResidual(item);
    expect(result).not.toBeNull();

    // 2026 - 2018 = 築8年
    // W: useful_life=22, unit_cost=215000
    // remainingRatio = 1 - 8/22 = 14/22 ≈ 0.63636
    // buildingValue = 215000 * 100 * (14/22) ≈ 13681818
    expect(result!.remaining_ratio).toBeCloseTo(14 / 22, 5);
    expect(result!.building_value).toBeGreaterThan(0);
    expect(result!.estimated_land_price).toBeGreaterThan(0);
  });

  test('TradePriceが0 → null', () => {
    const item: TransactionItem = {
      TradePrice: '0',
      TotalFloorArea: '200',
      BuildingYear: '令和2年',
      Structure: 'ＲＣ',
    };
    expect(estimateBuildingResidual(item)).toBeNull();
  });

  test('TotalFloorAreaが未設定 → null', () => {
    const item: TransactionItem = {
      TradePrice: '120000000',
      BuildingYear: '令和2年',
      Structure: 'ＲＣ',
    };
    expect(estimateBuildingResidual(item)).toBeNull();
  });

  test('BuildingYearが未設定 → null', () => {
    const item: TransactionItem = {
      TradePrice: '120000000',
      TotalFloorArea: '200',
      Structure: 'ＲＣ',
    };
    expect(estimateBuildingResidual(item)).toBeNull();
  });

  test('推定土地価格が0以下 → null', () => {
    // 非常に古い建物だが面積が大きい → 建物価値が取引価格を超える場合
    const item: TransactionItem = {
      TradePrice: '10000000',
      TotalFloorArea: '500',
      BuildingYear: '令和5年', // 築1年 → 残価が高い
      Structure: 'ＳＲＣ（鉄骨鉄筋コンクリート造）',
    };
    // buildingValue = 335000 * 500 * (1 - 1/47) ≈ 164,042,553 > 10,000,000
    const result = estimateBuildingResidual(item);
    expect(result).toBeNull();
  });

  test('耐用年数超過 → remainingRatio=0で建物価値=0', () => {
    const item: TransactionItem = {
      TradePrice: '50000000',
      TotalFloorArea: '100',
      BuildingYear: '昭和40年', // 1965年 → 築61年、W耐用22年超
      Structure: '木造',
    };
    const result = estimateBuildingResidual(item);
    // remainingRatio = max(0, 1 - 61/22) = 0
    // buildingValue = 0, estimatedLandPrice = 50000000
    expect(result).not.toBeNull();
    expect(result!.remaining_ratio).toBe(0);
    expect(result!.building_value).toBe(0);
    expect(result!.estimated_land_price).toBe(50000000);
  });
});

// ─── calcBuildingLandStats ──────────────────────

describe('calcBuildingLandStats', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 0, 1));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const MOCK_TRANSACTIONS: TransactionItem[] = [
    {
      Type: '宅地(土地のみ)',
      TradePrice: '80000000',
      Area: '120',
    },
    {
      Type: '宅地(土地と建物)',
      TradePrice: '120000000',
      Area: '100',
      TotalFloorArea: '200',
      FloorAreaRatio: '200',
      BuildingYear: '令和2年',
      Structure: 'ＲＣ（鉄筋コンクリート造）',
      UseDistrict: '第一種住居地域',
      Period: '令和6年第1四半期',
    },
  ];

  test('建物込み取引のみ抽出される', () => {
    const results = calcBuildingLandStats(MOCK_TRANSACTIONS);
    expect(results).toHaveLength(1);
  });

  test('推定坪単価が正の値', () => {
    const results = calcBuildingLandStats(MOCK_TRANSACTIONS);
    expect(results[0].tsubo_price).toBeGreaterThan(0);
  });

  test('推定土地価格・建物残価が含まれる', () => {
    const results = calcBuildingLandStats(MOCK_TRANSACTIONS);
    expect(results[0].estimated_land_price).toBeGreaterThan(0);
    expect(results[0].building_value).toBeGreaterThan(0);
    expect(results[0].remaining_ratio).toBeGreaterThan(0);
    expect(results[0].remaining_ratio).toBeLessThan(1);
  });

  test('土地のみ取引は除外される', () => {
    const results = calcBuildingLandStats(MOCK_TRANSACTIONS);
    expect(results.every(r => r.raw.Type === '宅地(土地と建物)')).toBe(true);
  });

  test('面積0の建物取引は除外される', () => {
    const items: TransactionItem[] = [
      {
        Type: '宅地(土地と建物)',
        TradePrice: '100000000',
        Area: '0',
        TotalFloorArea: '100',
        BuildingYear: '令和2年',
        Structure: 'ＲＣ',
      },
    ];
    expect(calcBuildingLandStats(items)).toHaveLength(0);
  });
});
