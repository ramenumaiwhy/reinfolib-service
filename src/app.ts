import type {
  TransactionItem,
  BuildingSpec,
  BuildingResidual,
  TsuboResult,
  BuildingLandResult,
  StatsSummary,
  StationData,
} from './types';

// ═══════════════════════════════════════════════════════════
// Exported Constants（テストからも参照）
// ═══════════════════════════════════════════════════════════

export const TSUBO_PER_SQM = 3.30579;

export const PREFECTURE_CODES: Record<string, string> = {
  '01': '北海道', '02': '青森県', '03': '岩手県', '04': '宮城県',
  '05': '秋田県', '06': '山形県', '07': '福島県', '08': '茨城県',
  '09': '栃木県', '10': '群馬県', '11': '埼玉県', '12': '千葉県',
  '13': '東京都', '14': '神奈川県', '15': '新潟県', '16': '富山県',
  '17': '石川県', '18': '福井県', '19': '山梨県', '20': '長野県',
  '21': '岐阜県', '22': '静岡県', '23': '愛知県', '24': '三重県',
  '25': '滋賀県', '26': '京都府', '27': '大阪府', '28': '兵庫県',
  '29': '奈良県', '30': '和歌山県', '31': '鳥取県', '32': '島根県',
  '33': '岡山県', '34': '広島県', '35': '山口県', '36': '徳島県',
  '37': '香川県', '38': '愛媛県', '39': '高知県', '40': '福岡県',
  '41': '佐賀県', '42': '長崎県', '43': '熊本県', '44': '大分県',
  '45': '宮崎県', '46': '鹿児島県', '47': '沖縄県',
};

export const BUILDING_SPECS: Record<string, BuildingSpec> = {
  SRC: { useful_life: 47, unit_cost: 335000 },
  RC:  { useful_life: 47, unit_cost: 334000 },
  LS:  { useful_life: 27, unit_cost: 325000 },
  S:   { useful_life: 34, unit_cost: 325000 },
  W:   { useful_life: 22, unit_cost: 215000 },
};

export const ZONING_CATEGORIES: Record<string, string[]> = {
  '住居系': [
    '第１種低層住居専用地域', '第１種低層住居専用', '第一種低層住居専用地域',
    '第２種低層住居専用地域', '第２種低層住居専用', '第二種低層住居専用地域',
    '第１種中高層住居専用地域', '第１種中高層住居専用', '第一種中高層住居専用地域',
    '第２種中高層住居専用地域', '第２種中高層住居専用', '第二種中高層住居専用地域',
    '第１種住居地域', '第１種住居', '第一種住居地域',
    '第２種住居地域', '第２種住居', '第二種住居地域',
    '準住居地域', '準住居',
    '田園住居地域', '田園住居',
  ],
  '商業系': [
    '近隣商業地域', '近隣商業',
    '商業地域', '商業',
  ],
  '工業系': [
    '準工業地域', '準工業',
    '工業地域', '工業',
    '工業専用地域', '工業専用',
  ],
};

// ═══════════════════════════════════════════════════════════
// Exported Pure Functions（テスト対象）
// ═══════════════════════════════════════════════════════════

/** 市区町村コード → 都道府県名 */
export function getPrefName(muniCd: string): string {
  return PREFECTURE_CODES[muniCd.substring(0, 2)] || '';
}

/** 地名から丁目を除去 */
export function getDistrictName(lv01Nm: string): string {
  return lv01Nm.replace(/([一二三四五六七八九十百千万]+|[0-9]+)丁目$/, '');
}

/** UseDistrict / CityPlanning フォールバック */
export function getUseDistrict(item: TransactionItem): string {
  return item.UseDistrict || item.CityPlanning || '';
}

/** 用途地域の大分類判定（住居系/商業系/工業系） */
export function getZoningCategory(useDistrict: string): string {
  if (!useDistrict) return '';
  for (const cat of Object.keys(ZONING_CATEGORIES)) {
    const types = ZONING_CATEGORIES[cat];
    for (const t of types) {
      if (useDistrict.includes(t)) return cat;
    }
  }
  return '';
}

/** 地区名で取引データを絞り込み */
export function filterByDistrict(
  data: TransactionItem[],
  prefecture: string,
  municipality: string,
  districtName: string,
): TransactionItem[] {
  const filtered: TransactionItem[] = [];
  for (const item of data) {
    if (item.Prefecture !== prefecture) continue;
    const itemMuni = item.Municipality || '';
    if (municipality) {
      const muniMatch =
        itemMuni === municipality ||
        (municipality.endsWith('区') && itemMuni.endsWith(municipality));
      if (!muniMatch) continue;
    }
    if (item.DistrictName !== districtName) continue;
    filtered.push(item);
  }
  return filtered;
}

/** 和暦→西暦変換 */
export function convertJapaneseYear(yearStr: string): number | null {
  if (!yearStr) return null;
  const normalized = yearStr.replace('元年', '1年');
  let m: RegExpMatchArray | null;
  m = normalized.match(/令和(\d+)年/);
  if (m) return 2018 + parseInt(m[1]);
  m = normalized.match(/平成(\d+)年/);
  if (m) return 1988 + parseInt(m[1]);
  m = normalized.match(/昭和(\d+)年/);
  if (m) return 1925 + parseInt(m[1]);
  m = normalized.match(/(\d{4})年/);
  if (m) return parseInt(m[1]);
  return null;
}

/** 建物構造 → 仕様（SRC/RC/LS/S/W） */
export function classifyStructure(structure: string): BuildingSpec {
  if (structure.includes('\uff33\uff32\uff23')) return BUILDING_SPECS.SRC; // ＳＲＣ
  if (structure.includes('\uff32\uff23')) return BUILDING_SPECS.RC;         // ＲＣ
  if (structure.includes('軽量鉄骨')) return BUILDING_SPECS.LS;
  if (structure.includes('鉄骨')) return BUILDING_SPECS.S;
  return BUILDING_SPECS.W;
}

/** 建物残価推定 */
export function estimateBuildingResidual(item: TransactionItem): BuildingResidual | null {
  const tradePrice = parseInt(item.TradePrice || '0') || 0;
  const totalFloorArea = item.TotalFloorArea;
  const buildingYear = item.BuildingYear;
  const structure = item.Structure || '';

  if (!tradePrice || !totalFloorArea || !buildingYear) return null;
  const floorArea = parseFloat(totalFloorArea);
  if (isNaN(floorArea) || floorArea <= 0) return null;

  const currentYear = new Date().getFullYear();
  const builtYear = convertJapaneseYear(buildingYear);
  if (!builtYear) return null;
  const age = currentYear - builtYear;

  const specs = classifyStructure(structure);
  const remainingRatio = Math.max(0, 1 - age / specs.useful_life);
  const buildingValue = specs.unit_cost * floorArea * remainingRatio;
  const estimatedLandPrice = tradePrice - buildingValue;
  if (estimatedLandPrice <= 0) return null;

  return {
    estimated_land_price: Math.floor(estimatedLandPrice),
    building_value: Math.floor(buildingValue),
    remaining_ratio: remainingRatio,
  };
}

/** 土地のみ取引から坪単価・一種単価を算出 */
export function calcTsuboStats(items: TransactionItem[]): TsuboResult[] {
  const results: TsuboResult[] = [];
  for (const item of items) {
    if (item.Type !== '宅地(土地のみ)') continue;
    const tradePrice = parseInt(item.TradePrice || '0') || 0;
    if (tradePrice <= 100000) continue;
    const areaM2 = parseFloat(item.Area || '0') || 0;
    if (areaM2 <= 0) continue;

    const tsuboPrice = tradePrice / areaM2 * TSUBO_PER_SQM;
    const floorAreaRatio = parseFloat(item.FloorAreaRatio || '0') || 0;
    const ikishuPrice = floorAreaRatio > 0 ? tsuboPrice / (floorAreaRatio / 100) : null;

    results.push({
      tsubo_price: tsuboPrice,
      ikishu_price: ikishuPrice,
      trade_price: tradePrice,
      area_m2: areaM2,
      floor_area_ratio: floorAreaRatio,
      use_district: getUseDistrict(item),
      period: item.Period || '',
      raw: item,
    });
  }
  return results;
}

/** 建物込み取引から推定土地坪単価を算出 */
export function calcBuildingLandStats(items: TransactionItem[]): BuildingLandResult[] {
  const results: BuildingLandResult[] = [];
  for (const item of items) {
    if (item.Type !== '宅地(土地と建物)') continue;
    const areaM2 = parseFloat(item.Area || '0') || 0;
    if (areaM2 <= 0) continue;

    const estimation = estimateBuildingResidual(item);
    if (!estimation) continue;

    const tsuboPrice = estimation.estimated_land_price / areaM2 * TSUBO_PER_SQM;
    const floorAreaRatio = parseFloat(item.FloorAreaRatio || '0') || 0;
    const ikishuPrice = floorAreaRatio > 0 ? tsuboPrice / (floorAreaRatio / 100) : null;

    results.push({
      tsubo_price: tsuboPrice,
      ikishu_price: ikishuPrice,
      estimated_land_price: estimation.estimated_land_price,
      building_value: estimation.building_value,
      remaining_ratio: estimation.remaining_ratio,
      trade_price: parseInt(item.TradePrice || '0') || 0,
      area_m2: areaM2,
      floor_area_ratio: floorAreaRatio,
      use_district: getUseDistrict(item),
      period: item.Period || '',
      structure: item.Structure || '',
      building_year: item.BuildingYear || '',
      raw: item,
    });
  }
  return results;
}

/** 異常値除外（中央値の1/5未満を除外） */
export function removeOutliers<T extends { tsubo_price: number }>(results: T[]): T[] {
  const prices = results.map(r => r.tsubo_price);
  if (prices.length < 3) return results;
  const mid = median(prices)!; // 3件以上あるため中央値は必ず存在する
  return results.filter(r => r.tsubo_price >= mid / 5);
}

/** 中央値 */
export function median(arr: number[]): number | null {
  if (arr.length === 0) return null;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/** 統計サマリー（min/max/median） */
export function summarizeStats(
  results: Array<{ tsubo_price: number; ikishu_price: number | null }>,
): StatsSummary {
  const tsuboPrices = results.map(r => r.tsubo_price);
  const ikishuPrices = results
    .filter(r => r.ikishu_price != null)
    .map(r => r.ikishu_price as number);

  const summary: StatsSummary = {
    count: tsuboPrices.length,
    tsubo_min: tsuboPrices.length ? Math.min(...tsuboPrices) : null,
    tsubo_max: tsuboPrices.length ? Math.max(...tsuboPrices) : null,
    tsubo_median: median(tsuboPrices),
  };
  if (ikishuPrices.length) {
    summary.ikishu_min = Math.min(...ikishuPrices);
    summary.ikishu_max = Math.max(...ikishuPrices);
    summary.ikishu_median = median(ikishuPrices) ?? undefined;
  }
  return summary;
}

/** 用途地域別に集計 */
export function summarizeByUseDistrict(
  results: Array<{ tsubo_price: number; ikishu_price: number | null; use_district: string }>,
): Record<string, StatsSummary> {
  const groups: Record<string, Array<{ tsubo_price: number; ikishu_price: number | null }>> = {};
  for (const r of results) {
    const key = r.use_district || '不明';
    if (!groups[key]) groups[key] = [];
    groups[key].push(r);
  }
  const summaries: Record<string, StatsSummary> = {};
  for (const district of Object.keys(groups)) {
    summaries[district] = summarizeStats(groups[district]);
  }
  return summaries;
}

/** 万円表示（小数1桁） */
export function formatManYen(value: number | null | undefined): string {
  if (value == null) return '-';
  return (value / 10000).toFixed(1);
}

/** 億/万円表示 */
export function formatPrice(value: number | string | null | undefined): string {
  if (!value) return '-';
  const num = typeof value === 'string' ? parseInt(value) : value;
  if (isNaN(num) || num <= 0) return '-';
  if (num >= 100000000) return (num / 100000000).toFixed(1) + '億';
  return Math.round(num / 10000).toLocaleString() + '万';
}

// ═══════════════════════════════════════════════════════════
// Non-exported Constants（DOM コードのみで使用）
// ═══════════════════════════════════════════════════════════

const GSI_GEOCODER_URL = 'https://msearch.gsi.go.jp/address-search/AddressSearch';
const GSI_REVERSE_GEOCODER_URL = 'https://mreversegeocoder.gsi.go.jp/reverse-geocoder/LonLatToAddress';

const ZONING_DISPLAY_NAMES: Record<string, string[]> = {
  '住居系': [
    '第１種低層住居専用地域', '第２種低層住居専用地域',
    '第１種中高層住居専用地域', '第２種中高層住居専用地域',
    '第１種住居地域', '第２種住居地域',
    '準住居地域', '田園住居地域',
  ],
  '商業系': ['近隣商業地域', '商業地域'],
  '工業系': ['準工業地域', '工業地域', '工業専用地域'],
};

const RAW_FIELD_LABELS: [string, string][] = [
  ['Type', '種類'],
  ['TradePrice', '取引価格'],
  ['Area', '面積(㎡)'],
  ['UnitPrice', '㎡単価'],
  ['FloorAreaRatio', '容積率(%)'],
  ['CoverageRatio', '建ぺい率(%)'],
  ['UseDistrict', '用途地域'],
  ['CityPlanning', '都市計画'],
  ['Period', '取引時点'],
  ['Structure', '構造'],
  ['BuildingYear', '建築年'],
  ['TotalFloorArea', '延床面積(㎡)'],
  ['FloorPlan', '間取り'],
  ['LandShape', '土地の形状'],
  ['Frontage', '間口(m)'],
  ['Direction', '前面道路の方位'],
  ['Classification', '前面道路の種類'],
  ['Breadth', '前面道路の幅員(m)'],
  ['Use', '利用現況'],
  ['Purpose', '今後の利用目的'],
  ['Renovation', '改装'],
  ['Remarks', '備考'],
];

const RAW_FIELD_SKIP = ['Prefecture', 'Municipality', 'DistrictName', 'Region', 'MunicipalityCode'];

// ═══════════════════════════════════════════════════════════
// DOM Initialization（ブラウザのみ実行）
// ═══════════════════════════════════════════════════════════

function init(): void {
  // ─── DOM 要素 ──────────────────────────────────
  const apiKeyInput = document.getElementById('apiKeyInput') as HTMLInputElement;
  const saveKeyBtn = document.getElementById('saveKeyBtn') as HTMLButtonElement;
  const deleteKeyBtn = document.getElementById('deleteKeyBtn') as HTMLButtonElement;
  const apiKeyStatus = document.getElementById('apiKeyStatus') as HTMLElement;
  const apiKeyForm = document.getElementById('apiKeyForm') as HTMLElement;
  const apiKeyDone = document.getElementById('apiKeyDone') as HTMLElement;
  const addressInput = document.getElementById('addressInput') as HTMLInputElement;
  const stationInput = document.getElementById('stationInput') as HTMLInputElement;
  const stationCandidatesDiv = document.getElementById('stationCandidates') as HTMLElement;
  const analyzeBtn = document.getElementById('analyzeBtn') as HTMLButtonElement;
  const loading = document.getElementById('loading') as HTMLElement;
  const loadingText = document.getElementById('loadingText') as HTMLElement;
  const resultsEl = document.getElementById('results') as HTMLElement;
  const resultSummary = document.getElementById('resultSummary') as HTMLElement;
  const landOnlyContent = document.getElementById('landOnlyContent') as HTMLElement;
  const buildingLandContent = document.getElementById('buildingLandContent') as HTMLElement;
  const zoningCategorySelect = document.getElementById('zoningCategory') as HTMLSelectElement;
  const zoningDetailDiv = document.getElementById('zoningDetail') as HTMLElement;
  const searchModeTabs = document.querySelectorAll('.search-tab');
  const addressSearchArea = document.getElementById('addressSearchArea') as HTMLElement;
  const stationSearchArea = document.getElementById('stationSearchArea') as HTMLElement;

  // ─── State ──────────────────────────────────────
  let searchMode = 'address';
  let selectedStation: StationData | null = null;
  let stationsData: StationData[] | null = null;
  let stationsLoading = false;
  let highlightedIndex = -1;
  let isComposing = false;
  let selectedZoningTypes: string[] = [];

  // ─── ユーティリティ ─────────────────────────────
  function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  function createSafeElement(tag: string, text?: string | null, attrs?: Record<string, string>): HTMLElement {
    const el = document.createElement(tag);
    if (text != null) el.textContent = text;
    if (attrs) {
      for (const key of Object.keys(attrs)) {
        el.setAttribute(key, attrs[key]);
      }
    }
    return el;
  }

  function setLoadingText(text: string): void {
    loadingText.textContent = text;
  }

  function showStatus(el: HTMLElement, type: string, msg: string): void {
    el.className = 'status ' + type;
    el.textContent = msg;
  }

  // ─── 検索モード切替 ─────────────────────────────
  for (let ti = 0; ti < searchModeTabs.length; ti++) {
    (function (tab: Element) {
      tab.addEventListener('click', function () {
        for (let j = 0; j < searchModeTabs.length; j++) {
          (searchModeTabs[j] as HTMLElement).className = 'search-tab';
        }
        (tab as HTMLElement).className = 'search-tab active';
        searchMode = (tab as HTMLElement).dataset.mode || 'address';
        if (searchMode === 'address') {
          addressSearchArea.style.display = '';
          stationSearchArea.style.display = 'none';
        } else {
          addressSearchArea.style.display = 'none';
          stationSearchArea.style.display = '';
        }
      });
    })(searchModeTabs[ti]);
  }

  // ─── 駅データ遅延ロード ─────────────────────────
  async function loadStations(): Promise<StationData[]> {
    if (stationsData) return stationsData;
    if (stationsLoading) {
      let waited = 0;
      while (stationsLoading && waited < 10000) {
        await sleep(100);
        waited += 100;
      }
      return stationsData!;
    }
    stationsLoading = true;
    const resp = await fetch('stations.json');
    stationsData = await resp.json();
    stationsLoading = false;
    return stationsData!;
  }

  // ─── 駅名インクリメンタルサーチ ──────────────────
  function buildCandidateLabel(station: StationData): string {
    const prefName = getPrefName(station.pref + '000');
    const lines = station.lines ? station.lines.split(',') : [];
    let lineText = '';
    if (lines.length === 1) {
      lineText = lines[0];
    } else if (lines.length === 2) {
      lineText = lines[0] + ' 他1路線';
    } else if (lines.length > 2) {
      lineText = lines[0] + ' 他' + (lines.length - 1) + '路線';
    }
    let label = station.name + '（' + prefName;
    if (lineText) label += '・' + lineText;
    label += '）';
    return label;
  }

  function renderCandidates(stations: StationData[]): void {
    stationCandidatesDiv.textContent = '';
    highlightedIndex = -1;
    if (!stations || stations.length === 0) {
      stationCandidatesDiv.className = 'station-candidates';
      return;
    }
    for (const station of stations) {
      const item = createSafeElement('div', buildCandidateLabel(station));
      item.className = 'station-candidate';
      item.addEventListener('mousedown', function (e) {
        e.preventDefault();
        selectStation(station);
      });
      stationCandidatesDiv.appendChild(item);
    }
    stationCandidatesDiv.className = 'station-candidates open';
  }

  function selectStation(station: StationData): void {
    selectedStation = station;
    stationInput.value = buildCandidateLabel(station);
    stationCandidatesDiv.className = 'station-candidates';
    stationCandidatesDiv.textContent = '';
    highlightedIndex = -1;
  }

  function highlightCandidate(index: number): void {
    const items = stationCandidatesDiv.querySelectorAll('.station-candidate');
    for (let i = 0; i < items.length; i++) {
      (items[i] as HTMLElement).className = 'station-candidate';
    }
    if (index >= 0 && index < items.length) {
      (items[index] as HTMLElement).className = 'station-candidate highlighted';
      highlightedIndex = index;
    } else {
      highlightedIndex = -1;
    }
  }

  stationInput.addEventListener('compositionstart', function () { isComposing = true; });
  stationInput.addEventListener('compositionend', function () {
    isComposing = false;
    stationInput.dispatchEvent(new Event('input'));
  });

  stationInput.addEventListener('input', async function () {
    if (isComposing) return;
    const q = stationInput.value.trim();
    selectedStation = null;
    if (q.length < 2) {
      stationCandidatesDiv.className = 'station-candidates';
      stationCandidatesDiv.textContent = '';
      return;
    }
    const all = await loadStations();
    const prefix: StationData[] = [];
    const middle: StationData[] = [];
    for (const s of all) {
      if (s.name.indexOf(q) === 0) {
        prefix.push(s);
      } else if (s.name.indexOf(q) > 0) {
        middle.push(s);
      }
    }
    renderCandidates(prefix.concat(middle).slice(0, 15));
  });

  stationInput.addEventListener('keydown', function (e) {
    const items = stationCandidatesDiv.querySelectorAll('.station-candidate');
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      let next = highlightedIndex + 1;
      if (next >= items.length) next = 0;
      highlightCandidate(next);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      let prev = highlightedIndex - 1;
      if (prev < 0) prev = items.length - 1;
      highlightCandidate(prev);
    } else if (e.key === 'Enter') {
      if (highlightedIndex >= 0 && highlightedIndex < items.length) {
        e.preventDefault();
        const all = stationsData;
        if (all) {
          const q = stationInput.value.trim();
          const prefix2: StationData[] = [];
          const middle2: StationData[] = [];
          for (const s of all) {
            if (s.name.indexOf(q) === 0) prefix2.push(s);
            else if (s.name.indexOf(q) > 0) middle2.push(s);
          }
          const combined = prefix2.concat(middle2).slice(0, 15);
          if (combined[highlightedIndex]) {
            selectStation(combined[highlightedIndex]);
          }
        }
      }
    } else if (e.key === 'Escape') {
      stationCandidatesDiv.className = 'station-candidates';
      stationCandidatesDiv.textContent = '';
      highlightedIndex = -1;
    }
  });

  stationInput.addEventListener('blur', function () {
    setTimeout(function () {
      stationCandidatesDiv.className = 'station-candidates';
      stationCandidatesDiv.textContent = '';
      highlightedIndex = -1;
    }, 150);
  });

  // ─── 用途地域フィルタ UI ─────────────────────────
  function renderZoningChips(category: string): void {
    zoningDetailDiv.textContent = '';
    selectedZoningTypes = [];
    if (!category) {
      zoningDetailDiv.className = 'zoning-detail';
      return;
    }
    const names = ZONING_DISPLAY_NAMES[category] || [];
    const chipsDiv = createSafeElement('div');
    chipsDiv.className = 'zoning-chips';
    const hint = createSafeElement('div');
    hint.className = 'filter-hint';
    hint.textContent = '選択しなければ「' + category + '」全体で分析します';
    zoningDetailDiv.appendChild(hint);

    for (const name of names) {
      const chip = createSafeElement('label');
      chip.className = 'zoning-chip';
      const cb = document.createElement('input') as HTMLInputElement;
      cb.type = 'checkbox';
      cb.value = name;
      chip.appendChild(cb);
      chip.appendChild(createSafeElement('span', name));
      cb.addEventListener('change', function () {
        if (cb.checked) {
          chip.className = 'zoning-chip selected';
          selectedZoningTypes.push(name);
        } else {
          chip.className = 'zoning-chip';
          selectedZoningTypes = selectedZoningTypes.filter(t => t !== name);
        }
      });
      chipsDiv.appendChild(chip);
    }
    zoningDetailDiv.appendChild(chipsDiv);
    zoningDetailDiv.className = 'zoning-detail visible';
  }

  zoningCategorySelect.addEventListener('change', function () {
    renderZoningChips(zoningCategorySelect.value);
  });

  function filterByZoning<T extends { use_district: string }>(dataArray: T[]): T[] {
    const category = zoningCategorySelect.value;
    if (!category) return dataArray;
    const filtered: T[] = [];
    for (const item of dataArray) {
      const ud = item.use_district;
      const itemCategory = getZoningCategory(ud);
      if (itemCategory !== category) continue;
      if (selectedZoningTypes.length > 0) {
        let matched = false;
        for (const st of selectedZoningTypes) {
          if (ud.includes(st)) { matched = true; break; }
        }
        if (!matched) continue;
      }
      filtered.push(item);
    }
    return filtered;
  }

  // ─── APIキー管理 ─────────────────────────────────
  function getApiKey(): string {
    return localStorage.getItem('reinfolib_api_key') || '';
  }

  function setApiKey(key: string): void {
    localStorage.setItem('reinfolib_api_key', key);
  }

  function removeApiKey(): void {
    localStorage.removeItem('reinfolib_api_key');
  }

  function updateKeyUI(): void {
    if (getApiKey()) {
      apiKeyForm.style.display = 'none';
      apiKeyDone.style.display = 'block';
      analyzeBtn.disabled = false;
    } else {
      apiKeyForm.style.display = 'block';
      apiKeyDone.style.display = 'none';
      analyzeBtn.disabled = true;
    }
  }

  saveKeyBtn.addEventListener('click', async function () {
    const key = apiKeyInput.value.trim();
    if (!key) {
      showStatus(apiKeyStatus, 'error', 'APIキーを入力してください');
      return;
    }
    saveKeyBtn.disabled = true;
    showStatus(apiKeyStatus, 'info', 'APIキーを検証中...');
    try {
      const resp = await fetch('/api/XIT002?area=13', {
        redirect: 'error', headers: { 'Ocp-Apim-Subscription-Key': key },
      });
      if (resp.ok) {
        const cities = await resp.json();
        if (!Array.isArray(cities?.data) || !cities.data.some((city: {id?: string}) => /^13\d{3}$/.test(city?.id ?? ''))) {
          showStatus(apiKeyStatus, 'error', 'プロキシから市区町村一覧を取得できません。');
        } else {
          setApiKey(key);
          apiKeyInput.value = '';
          apiKeyStatus.className = 'status';
          apiKeyStatus.textContent = '';
          updateKeyUI();
        }
      } else if (resp.status === 401 || resp.status === 403) {
        showStatus(apiKeyStatus, 'error', 'APIキーが無効です。正しいキーを入力してください。');
      } else {
        showStatus(apiKeyStatus, 'error', 'API接続エラー（ステータス: ' + resp.status + '）');
      }
    } catch {
      showStatus(apiKeyStatus, 'error', 'サーバーに接続できません。しばらく経ってからお試しください。');
    }
    saveKeyBtn.disabled = false;
  });

  deleteKeyBtn.addEventListener('click', function () {
    removeApiKey();
    updateKeyUI();
  });

  updateKeyUI();

  // ─── ジオコーディング ──────────────────────────
  async function geocode(address: string): Promise<{ lat: number; lon: number }> {
    const resp = await fetch(GSI_GEOCODER_URL + '?q=' + encodeURIComponent(address));
    if (!resp.ok) throw new Error('ジオコーダーエラー');
    const data = await resp.json();
    if (!data || data.length === 0) throw new Error('住所が見つかりません: ' + address);
    const coords = data[0].geometry.coordinates;
    return { lat: coords[1], lon: coords[0] };
  }

  async function reverseGeocode(lat: number, lon: number): Promise<{ muniCd: string; lv01Nm: string }> {
    const resp = await fetch(GSI_REVERSE_GEOCODER_URL + '?lat=' + lat + '&lon=' + lon);
    if (!resp.ok) throw new Error('逆ジオコーダーエラー');
    const data = await resp.json();
    return {
      muniCd: data.results.muniCd,
      lv01Nm: data.results.lv01Nm,
    };
  }

  // ─── 市区町村名取得 ─────────────────────────────
  async function getCityName(apiKey: string, muniCd: string): Promise<string | null> {
    const prefCd = muniCd.substring(0, 2);
    const resp = await fetch('/api/XIT002?area=' + prefCd, {
      redirect: 'error', headers: { 'Ocp-Apim-Subscription-Key': apiKey },
    });
    if (!resp.ok) throw new Error('市区町村名の取得に失敗');
    const data = await resp.json();
    const items = data.data || [];
    for (const item of items) {
      if (item.id === muniCd) return item.name;
    }
    return null;
  }

  // ─── 取引データ取得 ─────────────────────────────
  async function fetchTransactions(apiKey: string, muniCd: string, years: number[]): Promise<{year: number; rows: TransactionItem[] | null}[]> {
    const batches = [];
    for (let i = 0; i < years.length; i++) {
      if (i > 0) await sleep(1000);
      const resp = await fetch(
        '/api/XIT001?year=' + years[i] + '&city=' + muniCd,
        { redirect: 'error', headers: { 'Ocp-Apim-Subscription-Key': apiKey } },
      );
      if (resp.status === 404) {
        batches.push({year: years[i], rows: null});
        continue;
      }
      if (!resp.ok) throw new Error('取引データ取得エラー (year=' + years[i] + ')');
      const result = await resp.json();
      if (!Array.isArray(result?.data) || (result.status && result.status !== 'OK')) {
        throw new Error(years[i] + '年の取引データを確認できません');
      }
      batches.push({year: years[i], rows: result.data as TransactionItem[]});
    }
    return batches;
  }

  // ─── レンダリング ──────────────────────────────
  function getConfidence(count: number): { label: string; cls: string; note: string } {
    if (count >= 30) return { label: '信頼度: 高', cls: 'confidence-high', note: '' };
    if (count >= 20) return { label: '信頼度: 中', cls: 'confidence-mid', note: '中央値は概ね安定。±15%程度のブレ幅を見てください。' };
    if (count >= 5) return { label: '信頼度: 低', cls: 'confidence-low', note: '件数が少なく参考値です。下の市区町村全体のデータもご参照ください。' };
    return { label: '信頼度: 不足', cls: 'confidence-poor', note: '件数が極めて少なく統計的に信頼できません。市区町村全体のデータをご参照ください。' };
  }

  function renderDetailTable(container: HTMLElement, details: Array<TsuboResult | BuildingLandResult>, isBuilding: boolean): void {
    const section = createSafeElement('div');
    section.className = 'detail-section';

    const toggleBtn = createSafeElement('button', '');
    toggleBtn.className = 'detail-toggle';
    const arrow = createSafeElement('span', '\u25B6');
    arrow.className = 'arrow';
    toggleBtn.appendChild(arrow);
    toggleBtn.appendChild(document.createTextNode(' 個別取引データ（' + details.length + '件）'));

    toggleBtn.addEventListener('click', function () {
      const isOpen = section.classList.toggle('open');
      toggleBtn.classList.toggle('open', isOpen);
    });

    const calcHeaders: [string, string][] = isBuilding
      ? [['推定坪単価(万円)', 'tsubo_price'], ['一種単価(万円)', 'ikishu_price'], ['推定土地価格', 'estimated_land_price'], ['推定建物残価', 'building_value']]
      : [['坪単価(万円)', 'tsubo_price'], ['一種単価(万円)', 'ikishu_price']];

    const rawColumns: [string, string][] = [];
    const knownKeys: Record<string, boolean> = {};
    for (const [key, label] of RAW_FIELD_LABELS) {
      knownKeys[key] = true;
      rawColumns.push([key, label]);
    }
    if (details.length > 0 && details[0].raw) {
      for (const key of Object.keys(details[0].raw)) {
        if (!knownKeys[key] && RAW_FIELD_SKIP.indexOf(key) === -1) {
          rawColumns.push([key, key]);
        }
      }
    }

    const wrap = createSafeElement('div');
    wrap.className = 'table-wrap';
    wrap.style.marginTop = '12px';
    const table = createSafeElement('table');
    const thead = createSafeElement('thead');
    const headerRow = createSafeElement('tr');

    for (const [label] of calcHeaders) {
      const th = createSafeElement('th', label);
      th.style.background = 'var(--gold-pale)';
      th.style.color = 'var(--terracotta)';
      headerRow.appendChild(th);
    }
    for (const [, label] of rawColumns) {
      headerRow.appendChild(createSafeElement('th', label));
    }
    thead.appendChild(headerRow);
    table.appendChild(thead);

    const tbody = createSafeElement('tbody');
    const sorted = [...details].sort((a, b) => b.tsubo_price - a.tsubo_price);

    for (const d of sorted) {
      const raw = d.raw || {};
      const row = createSafeElement('tr');

      const dRecord = d as unknown as Record<string, unknown>;
      for (const [, field] of calcHeaders) {
        let val: string;
        if (field === 'tsubo_price' || field === 'ikishu_price') {
          const v = dRecord[field] as number | null;
          val = v != null ? formatManYen(v) : '-';
        } else if (field === 'estimated_land_price' || field === 'building_value') {
          val = formatPrice(dRecord[field] as number);
        } else {
          const v = dRecord[field];
          val = v != null ? String(v) : '-';
        }
        const td = createSafeElement('td', val);
        td.style.background = 'var(--gold-pale)';
        row.appendChild(td);
      }

      for (const [rawKey] of rawColumns) {
        const rawVal = raw[rawKey];
        let cellText: string;
        if (rawKey === 'TradePrice') {
          cellText = formatPrice(rawVal);
        } else if (rawVal == null || rawVal === '') {
          cellText = '-';
        } else {
          cellText = String(rawVal);
        }
        row.appendChild(createSafeElement('td', cellText));
      }

      tbody.appendChild(row);
    }
    table.appendChild(tbody);
    wrap.appendChild(table);
    section.appendChild(wrap);

    container.appendChild(toggleBtn);
    container.appendChild(section);
  }

  function renderSummary(result: Record<string, unknown>): void {
    resultSummary.textContent = '';
    const r = result as {
      scopeLabel?: string;
      prefecture: string;
      municipality: string;
      district_name: string;
      years: number[];
      coverage: string;
      filtered_records: number;
      land_only: { overall: StatsSummary };
      building_land: { overall: StatsSummary };
    };

    const h3 = createSafeElement('h3', r.scopeLabel || (r.prefecture + r.municipality + r.district_name + ' の相場'));
    resultSummary.appendChild(h3);

    const grid = createSafeElement('div');
    grid.className = 'summary-grid';

    const items: { label: string; value: string; unit: string }[] = [
      { label: '検索した年', value: r.years.join(', '), unit: '' },
      { label: '対象エリアの集計内訳', value: r.coverage, unit: '' },
      { label: '対象地区の取引件数', value: String(r.filtered_records), unit: '件' },
    ];

    const zoneCat = zoningCategorySelect.value;
    if (zoneCat) {
      const zoneLabel = selectedZoningTypes.length > 0 ? selectedZoningTypes.join(', ') : zoneCat;
      items.push({ label: '用途地域フィルタ', value: zoneLabel, unit: '' });
    }

    const landMedian = r.land_only.overall.tsubo_median;
    if (landMedian != null) {
      items.push({ label: '坪単価（中央値）', value: formatManYen(landMedian), unit: '万円' });
    }

    const bldMedian = r.building_land.overall.tsubo_median;
    if (bldMedian != null) {
      items.push({ label: '推定坪単価（中央値）', value: formatManYen(bldMedian), unit: '万円' });
    }

    for (const it of items) {
      const item = createSafeElement('div');
      item.className = 'summary-item';
      const lbl = createSafeElement('div', it.label);
      lbl.className = 'summary-label';
      const val = createSafeElement('div');
      val.className = 'summary-value';
      val.textContent = it.value;
      if (it.unit) {
        const unitSpan = createSafeElement('span', ' ' + it.unit);
        unitSpan.className = 'summary-unit';
        val.appendChild(unitSpan);
      }
      item.appendChild(lbl);
      item.appendChild(val);
      grid.appendChild(item);
    }
    resultSummary.appendChild(grid);
  }

  function renderCitywideRef(
    container: HTMLElement,
    citywideByDistrict: Record<string, StatsSummary>,
    citywideOverall: StatsSummary,
    isBuilding: boolean,
    municipalityName: string,
  ): void {
    const ref = createSafeElement('div');
    ref.className = 'citywide-ref';

    const title = createSafeElement('div', municipalityName + '全体の同一用途地域データ（参考）');
    title.className = 'ref-title';
    ref.appendChild(title);

    if (citywideOverall.count === 0) {
      ref.appendChild(createSafeElement('p', '該当データがありません'));
      container.appendChild(ref);
      return;
    }

    const wrap = createSafeElement('div');
    wrap.className = 'table-wrap';
    const table = createSafeElement('table');
    const thead = createSafeElement('thead');
    const headerRow = createSafeElement('tr');
    const headers = ['用途地域', '件数', isBuilding ? '推定坪単価(万円)' : '坪単価(万円)'];
    for (const h of headers) {
      headerRow.appendChild(createSafeElement('th', h));
    }
    thead.appendChild(headerRow);
    table.appendChild(thead);

    const tbody = createSafeElement('tbody');
    for (const district of Object.keys(citywideByDistrict)) {
      const stats = citywideByDistrict[district];
      const row = createSafeElement('tr');
      row.appendChild(createSafeElement('td', district));
      row.appendChild(createSafeElement('td', stats.count + '件'));
      row.appendChild(createSafeElement('td',
        formatManYen(stats.tsubo_min) + '〜' + formatManYen(stats.tsubo_max) +
        '（中央値 ' + formatManYen(stats.tsubo_median) + '）',
      ));
      tbody.appendChild(row);
    }
    table.appendChild(tbody);
    wrap.appendChild(table);
    ref.appendChild(wrap);

    const note = createSafeElement('div',
      '不動産鑑定評価基準の「同一需給圏内の類似地域」に相当する参考値です。' +
      '地域要因（駅距離・周辺環境等）の補正は行っていないため、あくまで目安としてご利用ください。');
    note.className = 'ref-note';
    ref.appendChild(note);

    container.appendChild(ref);
  }

  function renderStatsTable(
    container: HTMLElement,
    byUseDistrict: Record<string, StatsSummary>,
    overall: StatsSummary,
    isBuilding: boolean,
    details: Array<TsuboResult | BuildingLandResult>,
    citywideData: { by_use_district: Record<string, StatsSummary>; overall: StatsSummary } | null,
    municipalityName: string,
  ): void {
    container.textContent = '';

    const count = overall.count;
    const conf = getConfidence(count);
    const badge = createSafeElement('span', conf.label);
    badge.className = 'confidence-badge ' + conf.cls;
    container.appendChild(badge);
    if (conf.note) {
      const confNote = createSafeElement('div', conf.note);
      confNote.className = 'data-warning';
      confNote.style.marginTop = '8px';
      container.appendChild(confNote);
    }

    if (count === 0) {
      container.appendChild(createSafeElement('p', '該当データがありません'));
      if (citywideData && municipalityName) {
        renderCitywideRef(container, citywideData.by_use_district, citywideData.overall, isBuilding, municipalityName);
      }
      return;
    }

    const wrap = createSafeElement('div');
    wrap.className = 'table-wrap';
    const table = createSafeElement('table');

    const thead = createSafeElement('thead');
    const headerRow = createSafeElement('tr');
    const headers = ['用途地域', '件数', isBuilding ? '推定坪単価(万円)' : '坪単価(万円)', '一種単価(万円)'];
    for (const h of headers) {
      headerRow.appendChild(createSafeElement('th', h));
    }
    thead.appendChild(headerRow);
    table.appendChild(thead);

    const tbody = createSafeElement('tbody');
    for (const district of Object.keys(byUseDistrict)) {
      const stats = byUseDistrict[district];
      const row = createSafeElement('tr');
      row.appendChild(createSafeElement('td', district));
      row.appendChild(createSafeElement('td', stats.count + '件'));
      row.appendChild(createSafeElement('td',
        formatManYen(stats.tsubo_min) + '〜' + formatManYen(stats.tsubo_max) +
        '（中央値 ' + formatManYen(stats.tsubo_median) + '）',
      ));
      let ikishu = '-';
      if (stats.ikishu_median != null) {
        ikishu = formatManYen(stats.ikishu_min ?? null) + '〜' + formatManYen(stats.ikishu_max ?? null) +
          '（中央値 ' + formatManYen(stats.ikishu_median) + '）';
      }
      row.appendChild(createSafeElement('td', ikishu));
      tbody.appendChild(row);
    }
    table.appendChild(tbody);
    wrap.appendChild(table);
    container.appendChild(wrap);

    const noteEl = createSafeElement('p', '全体: ' +
      (isBuilding ? '推定坪単価' : '坪単価') + ' 中央値 ' +
      formatManYen(overall.tsubo_median) + '万円 (' + overall.count + '件)');
    noteEl.className = 'data-note';
    container.appendChild(noteEl);

    if (details && details.length > 0) {
      renderDetailTable(container, details, isBuilding);
    }

    if (count < 20 && citywideData && municipalityName) {
      renderCitywideRef(container, citywideData.by_use_district, citywideData.overall, isBuilding, municipalityName);
    }
  }

  // ─── メイン分析フロー ──────────────────────────
  async function analyzeCore(
    apiKey: string,
    muniCd: string,
    municipality: string,
    scopeLabel: string,
    districtName: string | null,
  ): Promise<Record<string, unknown>> {
    const currentYear = new Date().getFullYear();
    const years = [currentYear, currentYear - 1, currentYear - 2];
    const prefecture = getPrefName(muniCd);

    setLoadingText('取引データを取得中（3年分）...');
    const batches = await fetchTransactions(apiKey, muniCd, years);
    const rawData = batches.flatMap(batch => batch.rows ?? []);

    setLoadingText('データを分析中...');
    let filtered: TransactionItem[];
    if (districtName) {
      filtered = filterByDistrict(rawData, prefecture, municipality, districtName);
    } else {
      filtered = rawData;
    }

    // 土地のみ → 用途地域フィルタ適用
    let landOnly = filterByZoning(removeOutliers(calcTsuboStats(filtered)));
    const landStats = summarizeByUseDistrict(landOnly);
    const allLandStats = summarizeStats(landOnly);

    // 建物込み → 用途地域フィルタ適用
    let buildingLand = filterByZoning(removeOutliers(calcBuildingLandStats(filtered)));
    const buildingStats = summarizeByUseDistrict(buildingLand);
    const allBuildingStats = summarizeStats(buildingLand);

    // 市区町村全体（参考データ）→ 同じフィルタ適用
    const citywideLand = filterByZoning(removeOutliers(calcTsuboStats(rawData)));
    const citywideLandStats = summarizeByUseDistrict(citywideLand);
    const citywideLandOverall = summarizeStats(citywideLand);
    const citywideBuilding = filterByZoning(removeOutliers(calcBuildingLandStats(rawData)));
    const citywideBuildingStats = summarizeByUseDistrict(citywideBuilding);
    const citywideBuildingOverall = summarizeStats(citywideBuilding);

    const landRows = new Set(landOnly.map(row => row.raw));
    const buildingRows = new Set(buildingLand.map(row => row.raw));
    const coverage = batches.map(({year, rows}) => {
      if (rows === null) return year + '年 未取得（404）';
      if (!rows.length) return year + '年 市区町村の取引0件';
      return year + '年 土地のみ' + rows.filter(row => landRows.has(row)).length + '件・建物込み' + rows.filter(row => buildingRows.has(row)).length + '件';
    }).join(' ／ ');

    return {
      scopeLabel,
      prefecture,
      municipality,
      district_name: districtName || '',
      muni_cd: muniCd,
      years, coverage,
      total_records: rawData.length,
      filtered_records: filtered.length,
      land_only: {
        count: landOnly.length,
        by_use_district: landStats,
        overall: allLandStats,
        details: landOnly,
      },
      building_land: {
        count: buildingLand.length,
        by_use_district: buildingStats,
        overall: allBuildingStats,
        details: buildingLand,
      },
      citywide: {
        land_only: { count: citywideLand.length, by_use_district: citywideLandStats, overall: citywideLandOverall },
        building_land: { count: citywideBuilding.length, by_use_district: citywideBuildingStats, overall: citywideBuildingOverall },
      },
    };
  }

  async function analyzeByAddress(apiKey: string, address: string): Promise<Record<string, unknown>> {
    setLoadingText('住所を解析中...');
    const coords = await geocode(address);

    setLoadingText('市区町村コードを取得中...');
    const geo = await reverseGeocode(coords.lat, coords.lon);

    const prefecture = getPrefName(geo.muniCd);
    const districtName = getDistrictName(geo.lv01Nm);

    setLoadingText('市区町村名を取得中...');
    const municipality = await getCityName(apiKey, geo.muniCd);
    if (!municipality) throw new Error('市区町村名の取得に失敗しました');

    const scopeLabel = prefecture + municipality + districtName + ' の相場';
    return analyzeCore(apiKey, geo.muniCd, municipality, scopeLabel, districtName);
  }

  async function analyzeByStation(apiKey: string, station: StationData): Promise<Record<string, unknown>> {
    setLoadingText('市区町村名を取得中...');
    const municipality = await getCityName(apiKey, station.muni);
    if (!municipality) throw new Error('市区町村名の取得に失敗しました');

    const prefName = getPrefName(station.muni);
    const scopeLabel = station.name + '駅周辺（' + prefName + municipality + '全体）の相場';
    return analyzeCore(apiKey, station.muni, municipality, scopeLabel, null);
  }

  // ─── イベントハンドラ ──────────────────────────
  analyzeBtn.addEventListener('click', async function () {
    const apiKey = getApiKey();
    if (!apiKey) return;

    if (searchMode === 'address') {
      const address = addressInput.value.trim();
      if (!address) return;
    } else {
      if (!selectedStation) {
        const errCard = document.getElementById('searchCard');
        if (errCard) {
          const existing = errCard.querySelector('.status');
          if (existing) existing.remove();
          const errEl = createSafeElement('div', '駅を候補から選択してください');
          errEl.className = 'status error';
          errCard.appendChild(errEl);
          setTimeout(function () { errEl.remove(); }, 5000);
        }
        return;
      }
    }

    analyzeBtn.disabled = true;
    loading.className = 'loading active';
    resultsEl.className = 'results';

    try {
      let result: Record<string, unknown>;
      if (searchMode === 'address') {
        result = await analyzeByAddress(apiKey, addressInput.value.trim());
      } else {
        result = await analyzeByStation(apiKey, selectedStation!);
      }

      renderSummary(result);

      const lo = result.land_only as {
        by_use_district: Record<string, StatsSummary>;
        overall: StatsSummary;
        details: TsuboResult[];
      };
      const bl = result.building_land as {
        by_use_district: Record<string, StatsSummary>;
        overall: StatsSummary;
        details: BuildingLandResult[];
      };
      const cw = result.citywide as {
        land_only: { by_use_district: Record<string, StatsSummary>; overall: StatsSummary };
        building_land: { by_use_district: Record<string, StatsSummary>; overall: StatsSummary };
      };

      renderStatsTable(landOnlyContent, lo.by_use_district, lo.overall, false, lo.details, cw.land_only, result.municipality as string);
      renderStatsTable(buildingLandContent, bl.by_use_district, bl.overall, true, bl.details, cw.building_land, result.municipality as string);

      loading.className = 'loading';
      resultsEl.className = 'results active';
      resultsEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (e) {
      loading.className = 'loading';
      const errCard = document.getElementById('searchCard');
      if (errCard) {
        const existing = errCard.querySelector('.status');
        if (existing) existing.remove();
        const errEl = createSafeElement('div', (e as Error).message || '分析中にエラーが発生しました');
        errEl.className = 'status error';
        errCard.appendChild(errEl);
        setTimeout(function () { errEl.remove(); }, 8000);
      }
    }

    analyzeBtn.disabled = false;
  });

  addressInput.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && !analyzeBtn.disabled) {
      analyzeBtn.click();
    }
  });
}

// ─── Auto-init ──────────────────────────────────
(function autoInit() {
  if (typeof document === 'undefined') return;
  if (!document.getElementById('analyzeBtn')) return;
  init();
})();
