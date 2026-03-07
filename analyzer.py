"""
不動産相場分析 コアロジック

国土交通省 不動産情報ライブラリ API (reinfolib) と
国土地理院 ジオコーダ/逆ジオコーダを使って、
住所から坪単価・一種単価・建物残価推定を行う。

MCP / Claude Code 依存ゼロ。requests のみ使用。
"""

import datetime
import re
import statistics
import time
import requests

# ─── 定数 ─────────────────────────────────────────────────

REINFOLIB_API_URL = "https://www.reinfolib.mlit.go.jp/ex-api/external"
GSI_GEOCODER_URL = "https://msearch.gsi.go.jp/address-search/AddressSearch"
GSI_REVERSE_GEOCODER_URL = (
    "https://mreversegeocoder.gsi.go.jp/reverse-geocoder/LonLatToAddress"
)

TSUBO_PER_SQM = 3.30579  # 1坪 = 3.30579㎡

PREFECTURE_CODES = {
    "01": "北海道", "02": "青森県", "03": "岩手県", "04": "宮城県",
    "05": "秋田県", "06": "山形県", "07": "福島県", "08": "茨城県",
    "09": "栃木県", "10": "群馬県", "11": "埼玉県", "12": "千葉県",
    "13": "東京都", "14": "神奈川県", "15": "新潟県", "16": "富山県",
    "17": "石川県", "18": "福井県", "19": "山梨県", "20": "長野県",
    "21": "岐阜県", "22": "静岡県", "23": "愛知県", "24": "三重県",
    "25": "滋賀県", "26": "京都府", "27": "大阪府", "28": "兵庫県",
    "29": "奈良県", "30": "和歌山県", "31": "鳥取県", "32": "島根県",
    "33": "岡山県", "34": "広島県", "35": "山口県", "36": "徳島県",
    "37": "香川県", "38": "愛媛県", "39": "高知県", "40": "福岡県",
    "41": "佐賀県", "42": "長崎県", "43": "熊本県", "44": "大分県",
    "45": "宮崎県", "46": "鹿児島県", "47": "沖縄県",
}

# 法定耐用年数と標準建築費単価 (円/㎡)
# 出典: 減価償却資産の耐用年数等に関する省令 別表第一 / 2024年建築着工統計 第34表
BUILDING_SPECS = {
    "SRC": {"useful_life": 47, "unit_cost": 335_000},
    "RC":  {"useful_life": 47, "unit_cost": 334_000},
    "LS":  {"useful_life": 27, "unit_cost": 325_000},  # 軽量鉄骨（保守的に27年）
    "S":   {"useful_life": 34, "unit_cost": 325_000},
    "W":   {"useful_life": 22, "unit_cost": 215_000},
}


# ─── 住所 → 座標変換 ──────────────────────────────────────

def geocode(address: str) -> tuple[float, float]:
    """住所から緯度・経度を取得（国土地理院ジオコーダ）"""
    resp = requests.get(
        GSI_GEOCODER_URL,
        params={"q": address},
        timeout=10,
    )
    resp.raise_for_status()
    data = resp.json()
    if not data:
        raise ValueError(f"住所が見つかりません: {address}")
    lon, lat = data[0]["geometry"]["coordinates"]
    return lat, lon


def reverse_geocode(lat: float, lon: float) -> tuple[str, str]:
    """緯度・経度から市区町村コードと地名を取得（国土地理院逆ジオコーダ）"""
    resp = requests.get(
        GSI_REVERSE_GEOCODER_URL,
        params={"lat": lat, "lon": lon},
        timeout=10,
    )
    resp.raise_for_status()
    result = resp.json()
    muni_cd = result["results"]["muniCd"]
    lv01_nm = result["results"]["lv01Nm"]
    return muni_cd, lv01_nm


# ─── 住所解析ヘルパー ─────────────────────────────────────

def get_pref_name(muni_cd: str) -> str:
    """市区町村コードの上2桁から都道府県名を取得"""
    return PREFECTURE_CODES.get(muni_cd[:2], "")


def get_district_name(lv01_nm: str) -> str:
    """地名から丁目を除去して大字レベルの地区名を取得"""
    return re.sub(r"([一二三四五六七八九十百千万]+|[0-9]+)丁目$", "", lv01_nm)


def get_city_name(api_key: str, muni_cd: str) -> str | None:
    """XIT002 API で市区町村コードから市区町村名を取得"""
    pref_cd = muni_cd[:2]
    resp = requests.get(
        f"{REINFOLIB_API_URL}/XIT002",
        params={"area": pref_cd},
        headers={"Ocp-Apim-Subscription-Key": api_key},
        timeout=10,
        allow_redirects=False,
    )
    resp.raise_for_status()
    data = resp.json()
    match = next(
        (item for item in data.get("data", []) if item["id"] == muni_cd),
        None,
    )
    return match["name"] if match else None


# ─── 取引データ取得 ────────────────────────────────────────

def fetch_transactions(
    api_key: str, muni_cd: str, years: list[int]
) -> list[dict]:
    """XIT001 API を呼び出して取引データを取得（複数年分を結合）"""
    all_data = []
    for i, year in enumerate(years):
        if i > 0:
            time.sleep(1)  # rate limit 対策
        resp = requests.get(
            f"{REINFOLIB_API_URL}/XIT001",
            params={"year": year, "city": muni_cd},
            headers={"Ocp-Apim-Subscription-Key": api_key},
            timeout=30,
            allow_redirects=False,
        )
        resp.raise_for_status()
        result = resp.json()
        if result and "data" in result:
            all_data.extend(result["data"])
    return all_data


# ─── データフィルタリング ─────────────────────────────────

def filter_by_district(
    data: list[dict],
    prefecture: str,
    municipality: str,
    district_name: str,
) -> list[dict]:
    """都道府県・市区町村・地区名でフィルタリング

    政令指定都市の区名対応:
    XIT002 は「緑区」、XIT001 は「横浜市緑区」のため endswith で補完。
    city=muni_cd でリクエスト済みのため同一県内の同名区混入はない。
    """
    filtered = []
    for item in data:
        if item.get("Prefecture") != prefecture:
            continue
        item_muni = item.get("Municipality", "")
        if municipality:
            muni_match = (
                item_muni == municipality
                or (
                    municipality.endswith("区")
                    and item_muni.endswith(municipality)
                )
            )
            if not muni_match:
                continue
        if item.get("DistrictName") != district_name:
            continue
        filtered.append(item)
    return filtered


# ─── 和暦変換 ─────────────────────────────────────────────

def convert_japanese_year(year_str: str) -> int | None:
    """和暦・西暦を西暦(int)に変換"""
    if not year_str:
        return None
    year_str = year_str.replace("元年", "1年")
    patterns = [
        (r"令和(\d+)年", lambda m: 2018 + int(m.group(1))),
        (r"平成(\d+)年", lambda m: 1988 + int(m.group(1))),
        (r"昭和(\d+)年", lambda m: 1925 + int(m.group(1))),
    ]
    for pattern, converter in patterns:
        m = re.search(pattern, year_str)
        if m:
            return converter(m)
    m = re.search(r"(\d{4})年", year_str)
    if m:
        return int(m.group(1))
    return None


# ─── 建物残価推定 ─────────────────────────────────────────

def _classify_structure(structure: str) -> dict:
    """構造フィールドから耐用年数・建築費単価を判定

    判定順序が重要: SRC/RC を「鉄骨」より先に判定
    （「ＳＲＣ（鉄骨鉄筋コンクリート造）」に「鉄骨」が含まれるため）
    """
    if "ＳＲＣ" in structure:
        return BUILDING_SPECS["SRC"]
    if "ＲＣ" in structure:
        return BUILDING_SPECS["RC"]
    if "軽量鉄骨" in structure:
        return BUILDING_SPECS["LS"]
    if "鉄骨" in structure:
        return BUILDING_SPECS["S"]
    # 木造 / ＷＳ / 不明
    return BUILDING_SPECS["W"]


def estimate_building_residual(item: dict) -> dict | None:
    """建物込み取引から土地価格を推定

    Returns:
        {"estimated_land_price": int, "building_value": int, "remaining_ratio": float}
        推定不能または異常値の場合は None
    """
    trade_price = int(item.get("TradePrice", 0) or 0)
    total_floor_area = item.get("TotalFloorArea")
    building_year = item.get("BuildingYear")
    structure = item.get("Structure", "")

    if not all([trade_price, total_floor_area, building_year]):
        return None

    try:
        floor_area = float(total_floor_area)
    except (ValueError, TypeError):
        return None

    current_year = datetime.date.today().year
    built_year = convert_japanese_year(building_year)
    if not built_year:
        return None
    age = current_year - built_year

    specs = _classify_structure(structure)
    remaining_ratio = max(0, 1 - age / specs["useful_life"])
    building_value = specs["unit_cost"] * floor_area * remaining_ratio

    estimated_land_price = trade_price - building_value
    if estimated_land_price <= 0:
        return None

    return {
        "estimated_land_price": int(estimated_land_price),
        "building_value": int(building_value),
        "remaining_ratio": remaining_ratio,
    }


# ─── 坪単価・一種単価算出 ─────────────────────────────────

def calc_tsubo_stats(items: list[dict]) -> list[dict]:
    """土地のみ取引から坪単価・一種単価を算出

    1パス目の異常値除外: TradePrice <= 10万円を除外
    """
    results = []
    for item in items:
        if item.get("Type") != "宅地(土地のみ)":
            continue
        trade_price = int(item.get("TradePrice", 0) or 0)
        if trade_price <= 100_000:
            continue
        area_m2 = float(item.get("Area", 0) or 0)
        if area_m2 <= 0:
            continue

        tsubo_price = trade_price / area_m2 * TSUBO_PER_SQM
        floor_area_ratio = float(item.get("FloorAreaRatio") or 0)
        ikishu_price = (
            tsubo_price / (floor_area_ratio / 100)
            if floor_area_ratio > 0
            else None
        )

        results.append({
            "tsubo_price": tsubo_price,
            "ikishu_price": ikishu_price,
            "trade_price": trade_price,
            "area_m2": area_m2,
            "floor_area_ratio": floor_area_ratio,
            "use_district": item.get("UseDistrict", ""),
            "period": item.get("Period", ""),
            "raw": item,
        })
    return results


def calc_building_land_stats(items: list[dict]) -> list[dict]:
    """建物込み取引から推定土地坪単価を算出

    「中古マンション等」は除外（土地持分構造が異なるため）
    """
    results = []
    for item in items:
        if item.get("Type") != "宅地(土地と建物)":
            continue
        area_m2 = float(item.get("Area", 0) or 0)
        if area_m2 <= 0:
            continue

        estimation = estimate_building_residual(item)
        if estimation is None:
            continue

        tsubo_price = estimation["estimated_land_price"] / area_m2 * TSUBO_PER_SQM
        floor_area_ratio = float(item.get("FloorAreaRatio") or 0)
        ikishu_price = (
            tsubo_price / (floor_area_ratio / 100)
            if floor_area_ratio > 0
            else None
        )

        results.append({
            "tsubo_price": tsubo_price,
            "ikishu_price": ikishu_price,
            "estimated_land_price": estimation["estimated_land_price"],
            "building_value": estimation["building_value"],
            "remaining_ratio": estimation["remaining_ratio"],
            "area_m2": area_m2,
            "floor_area_ratio": floor_area_ratio,
            "use_district": item.get("UseDistrict", ""),
            "period": item.get("Period", ""),
            "raw": item,
        })
    return results


# ─── 異常値除外（2パス目）──────────────────────────────────

def remove_outliers(results: list[dict]) -> list[dict]:
    """2パス目の異常値除外: 中央値の1/5以下を除去"""
    tsubo_prices = [r["tsubo_price"] for r in results if r["tsubo_price"] is not None]
    if len(tsubo_prices) < 3:
        return results
    median = statistics.median(tsubo_prices)
    return [
        r for r in results
        if r["tsubo_price"] is None or r["tsubo_price"] >= median / 5
    ]


# ─── 統計サマリー ─────────────────────────────────────────

def summarize_stats(results: list[dict]) -> dict:
    """坪単価リストから統計サマリーを生成"""
    tsubo_prices = [r["tsubo_price"] for r in results]
    ikishu_prices = [r["ikishu_price"] for r in results if r["ikishu_price"] is not None]

    summary = {
        "count": len(tsubo_prices),
        "tsubo_min": min(tsubo_prices) if tsubo_prices else None,
        "tsubo_max": max(tsubo_prices) if tsubo_prices else None,
        "tsubo_median": statistics.median(tsubo_prices) if tsubo_prices else None,
    }
    if ikishu_prices:
        summary["ikishu_min"] = min(ikishu_prices)
        summary["ikishu_max"] = max(ikishu_prices)
        summary["ikishu_median"] = statistics.median(ikishu_prices)

    return summary


def summarize_by_use_district(results: list[dict]) -> dict[str, dict]:
    """用途地域別に統計サマリーを生成"""
    groups: dict[str, list[dict]] = {}
    for r in results:
        key = r.get("use_district") or "不明"
        groups.setdefault(key, []).append(r)

    return {
        district: summarize_stats(items)
        for district, items in groups.items()
    }


# ─── メイン分析フロー ─────────────────────────────────────

def analyze(api_key: str, address: str, years: list[int] | None = None) -> dict:
    """住所から不動産相場を分析するメイン関数

    Args:
        api_key: 国交省 reinfolib API キー
        address: 分析対象の住所（例: "渋谷区恵比寿1丁目"）
        years: 取得する年のリスト（デフォルト: 直近3年）

    Returns:
        分析結果の辞書
    """
    if years is None:
        current_year = datetime.date.today().year
        years = [current_year, current_year - 1, current_year - 2]

    # Step 1: 住所 → 座標
    lat, lon = geocode(address)

    # Step 2: 座標 → 市区町村コード・地名
    muni_cd, lv01_nm = reverse_geocode(lat, lon)

    # Step 3: 住所情報の組み立て
    prefecture = get_pref_name(muni_cd)
    municipality = get_city_name(api_key, muni_cd)
    if not municipality:
        raise ValueError(f"市区町村名の取得に失敗しました: muni_cd={muni_cd}")
    district_name = get_district_name(lv01_nm)

    # Step 4: 取引データ取得（3年分）
    raw_data = fetch_transactions(api_key, muni_cd, years)

    # Step 5: 地区名でフィルタ
    filtered = filter_by_district(raw_data, prefecture, municipality, district_name)

    # Step 6: 土地のみ取引の分析
    land_only = calc_tsubo_stats(filtered)
    land_only = remove_outliers(land_only)
    land_stats = summarize_by_use_district(land_only)

    # Step 7: 建物込み取引の分析（参考値）
    building_land = calc_building_land_stats(filtered)
    building_land = remove_outliers(building_land)
    building_stats = summarize_by_use_district(building_land)

    # Step 8: 全体統計
    all_land_stats = summarize_stats(land_only)
    all_building_stats = summarize_stats(building_land)

    return {
        "address": address,
        "lat": lat,
        "lon": lon,
        "prefecture": prefecture,
        "municipality": municipality,
        "district_name": district_name,
        "muni_cd": muni_cd,
        "years": years,
        "total_records": len(raw_data),
        "filtered_records": len(filtered),
        "land_only": {
            "count": len(land_only),
            "by_use_district": land_stats,
            "overall": all_land_stats,
        },
        "building_land": {
            "count": len(building_land),
            "by_use_district": building_stats,
            "overall": all_building_stats,
        },
    }


# ─── レポート生成 ──────────────────────────────────────────

def _format_man_yen(value: float | None) -> str:
    """円を万円表記（小数1桁）に変換"""
    if value is None:
        return "-"
    return f"{value / 10000:.1f}"


def generate_report_text(result: dict) -> str:
    """分析結果からテキストレポートを生成"""
    lines = []
    lines.append(f"## 不動産相場分析レポート: {result['address']}")
    lines.append("")
    lines.append("### 基本情報")
    lines.append(f"- 住所: {result['prefecture']}{result['municipality']}{result['district_name']}")
    lines.append(f"- 座標: ({result['lat']:.6f}, {result['lon']:.6f})")
    lines.append(f"- 分析対象年: {', '.join(map(str, result['years']))}")
    lines.append(f"- 全取引件数: {result['total_records']}件")
    lines.append(f"- 対象地区の取引件数: {result['filtered_records']}件")
    lines.append("")

    # 土地のみ取引
    land = result["land_only"]
    lines.append(f"### 土地のみ取引 ({land['count']}件)")
    if land["count"] == 0:
        lines.append("該当データなし")
    else:
        if land["count"] < 3:
            lines.append("**注意: 3件未満のためデータ不足。暫定参考値です。**")
        lines.append("")
        lines.append("| 用途地域 | 件数 | 坪単価(万円) | 一種単価(万円) |")
        lines.append("|----------|------|-------------|---------------|")
        for district, stats in land["by_use_district"].items():
            tsubo = f"{_format_man_yen(stats['tsubo_min'])}〜{_format_man_yen(stats['tsubo_max'])}（中央値{_format_man_yen(stats['tsubo_median'])}）"
            ikishu = "-"
            if stats.get("ikishu_median") is not None:
                ikishu = f"{_format_man_yen(stats['ikishu_min'])}〜{_format_man_yen(stats['ikishu_max'])}（中央値{_format_man_yen(stats['ikishu_median'])}）"
            lines.append(f"| {district} | {stats['count']}件 | {tsubo} | {ikishu} |")

        overall = land["overall"]
        lines.append("")
        lines.append(f"**全体**: 坪単価 中央値 {_format_man_yen(overall['tsubo_median'])}万円")
    lines.append("")

    # 建物込み取引
    bld = result["building_land"]
    lines.append(f"### 建物込み取引からの推定土地坪単価（参考）({bld['count']}件)")
    if bld["count"] == 0:
        lines.append("該当データなし")
    else:
        lines.append("")
        lines.append("| 用途地域 | 件数 | 推定坪単価(万円) | 備考 |")
        lines.append("|----------|------|-----------------|------|")
        for district, stats in bld["by_use_district"].items():
            tsubo = f"{_format_man_yen(stats['tsubo_min'])}〜{_format_man_yen(stats['tsubo_max'])}（中央値{_format_man_yen(stats['tsubo_median'])}）"
            lines.append(f"| {district} | {stats['count']}件 | {tsubo} | 簡易推定・参考値 |")

        overall = bld["overall"]
        lines.append("")
        lines.append(f"**全体**: 推定坪単価 中央値 {_format_man_yen(overall['tsubo_median'])}万円")
    lines.append("")

    lines.append("---")
    lines.append("> このサービスは、国土交通省不動産情報ライブラリのAPI機能を使用していますが、")
    lines.append("> 提供情報の最新性、正確性、完全性等が保証されたものではありません。")
    lines.append("> 建物込み取引の推定土地価格は、法定耐用年数に基づく簡易推定であり、")
    lines.append("> リフォーム・個別品質・設備は未考慮です。参考値としてご利用ください。")

    return "\n".join(lines)
