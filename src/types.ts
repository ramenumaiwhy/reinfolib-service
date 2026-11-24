/** APIから返される不動産取引データの1レコード */
export interface TransactionItem {
  Type?: string;
  TradePrice?: string;
  Area?: string;
  TotalFloorArea?: string;
  FloorAreaRatio?: string;
  CoverageRatio?: string;
  BuildingYear?: string;
  Structure?: string;
  Prefecture?: string;
  Municipality?: string;
  DistrictName?: string;
  UseDistrict?: string;
  CityPlanning?: string;
  Period?: string;
  Region?: string;
  MunicipalityCode?: string;
  UnitPrice?: string;
  FloorPlan?: string;
  LandShape?: string;
  Frontage?: string;
  Direction?: string;
  Classification?: string;
  Breadth?: string;
  Use?: string;
  Purpose?: string;
  Renovation?: string;
  Remarks?: string;
  [key: string]: string | undefined;
}

/** 建物の構造仕様（耐用年数と建築費単価） */
export interface BuildingSpec {
  readonly useful_life: number;
  readonly unit_cost: number;
}

/** 建物残価推定結果 */
export interface BuildingResidual {
  estimated_land_price: number;
  building_value: number;
  remaining_ratio: number;
}

/** 坪単価計算結果（土地のみ取引） */
export interface TsuboResult {
  tsubo_price: number;
  ikishu_price: number | null;
  trade_price: number;
  area_m2: number;
  floor_area_ratio: number;
  use_district: string;
  period: string;
  raw: TransactionItem;
}

/** 建物込み取引の推定結果 */
export interface BuildingLandResult {
  tsubo_price: number;
  ikishu_price: number | null;
  estimated_land_price: number;
  building_value: number;
  remaining_ratio: number;
  trade_price: number;
  area_m2: number;
  floor_area_ratio: number;
  use_district: string;
  period: string;
  structure: string;
  building_year: string;
  raw: TransactionItem;
}

/** 統計サマリー */
export interface StatsSummary {
  count: number;
  tsubo_min: number | null;
  tsubo_max: number | null;
  tsubo_median: number | null;
  ikishu_min?: number;
  ikishu_max?: number;
  ikishu_median?: number;
}

/** 駅データ（stations.json の1レコード） */
export interface StationData {
  name: string;
  pref: string;
  muni: string;
  lines?: string;
}
