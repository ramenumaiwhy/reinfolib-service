"""analyzer.py の単体テスト

API を実際に呼ばずにロジックをテストする。
API 統合テストは test_integration.py で手動実行。
"""

import datetime
from unittest.mock import patch

import pytest

# テスト対象のモジュールを直接インポートできるようにパスを追加
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from analyzer import (
    convert_japanese_year,
    get_pref_name,
    get_district_name,
    filter_by_district,
    calc_tsubo_stats,
    calc_building_land_stats,
    remove_outliers,
    summarize_stats,
    summarize_by_use_district,
    estimate_building_residual,
    _classify_structure,
    _format_man_yen,
    TSUBO_PER_SQM,
)


# ─── convert_japanese_year ────────────────────────────────

class TestConvertJapaneseYear:
    def test_reiwa(self):
        assert convert_japanese_year("令和5年") == 2023

    def test_reiwa_gannen(self):
        assert convert_japanese_year("令和元年") == 2019

    def test_heisei(self):
        assert convert_japanese_year("平成30年") == 2018

    def test_showa(self):
        assert convert_japanese_year("昭和60年") == 1985

    def test_western(self):
        assert convert_japanese_year("2024年") == 2024

    def test_none(self):
        assert convert_japanese_year(None) is None

    def test_empty(self):
        assert convert_japanese_year("") is None

    def test_invalid(self):
        assert convert_japanese_year("不明") is None


# ─── get_pref_name ────────────────────────────────────────

class TestGetPrefName:
    def test_tokyo(self):
        assert get_pref_name("13101") == "東京都"

    def test_kanagawa(self):
        assert get_pref_name("14101") == "神奈川県"

    def test_unknown(self):
        assert get_pref_name("99999") == ""


# ─── get_district_name ────────────────────────────────────

class TestGetDistrictName:
    def test_strip_chome_kanji(self):
        assert get_district_name("恵比寿一丁目") == "恵比寿"

    def test_strip_chome_arabic(self):
        assert get_district_name("恵比寿1丁目") == "恵比寿"

    def test_no_chome(self):
        assert get_district_name("恵比寿") == "恵比寿"

    def test_multi_digit_chome(self):
        assert get_district_name("中村四丁目") == "中村"


# ─── filter_by_district ──────────────────────────────────

class TestFilterByDistrict:
    def setup_method(self):
        self.data = [
            {"Prefecture": "東京都", "Municipality": "渋谷区", "DistrictName": "恵比寿"},
            {"Prefecture": "東京都", "Municipality": "渋谷区", "DistrictName": "代官山"},
            {"Prefecture": "東京都", "Municipality": "新宿区", "DistrictName": "恵比寿"},
            {"Prefecture": "神奈川県", "Municipality": "横浜市緑区", "DistrictName": "台村町"},
        ]

    def test_basic_filter(self):
        result = filter_by_district(self.data, "東京都", "渋谷区", "恵比寿")
        assert len(result) == 1
        assert result[0]["Municipality"] == "渋谷区"

    def test_no_match(self):
        result = filter_by_district(self.data, "大阪府", "大阪市", "恵比寿")
        assert len(result) == 0

    def test_seirei_shitei_endswith(self):
        """政令指定都市: XIT002「緑区」と XIT001「横浜市緑区」のマッチ"""
        result = filter_by_district(self.data, "神奈川県", "緑区", "台村町")
        assert len(result) == 1
        assert result[0]["Municipality"] == "横浜市緑区"


# ─── _classify_structure ─────────────────────────────────

class TestClassifyStructure:
    def test_src(self):
        result = _classify_structure("ＳＲＣ（鉄骨鉄筋コンクリート造）")
        assert result["useful_life"] == 47
        assert result["unit_cost"] == 335_000

    def test_rc(self):
        result = _classify_structure("ＲＣ（鉄筋コンクリート造）")
        assert result["useful_life"] == 47

    def test_light_steel(self):
        result = _classify_structure("軽量鉄骨造")
        assert result["useful_life"] == 27

    def test_steel(self):
        result = _classify_structure("鉄骨造")
        assert result["useful_life"] == 34

    def test_wood(self):
        result = _classify_structure("木造")
        assert result["useful_life"] == 22

    def test_ws(self):
        result = _classify_structure("ＷＳ（木造ストーンウォール）")
        assert result["useful_life"] == 22

    def test_unknown(self):
        result = _classify_structure("その他")
        assert result["useful_life"] == 22  # 不明時は木造

    def test_src_before_steel(self):
        """SRC に「鉄骨」が含まれるが SRC として判定されること"""
        result = _classify_structure("ＳＲＣ（鉄骨鉄筋コンクリート造）")
        assert result["useful_life"] == 47  # SRC, not S


# ─── calc_tsubo_stats ─────────────────────────────────────

class TestCalcTsuboStats:
    def test_basic(self):
        items = [{
            "Type": "宅地(土地のみ)",
            "TradePrice": "50000000",
            "Area": "100",
            "FloorAreaRatio": "200",
            "UseDistrict": "第一種住居地域",
            "Period": "令和5年第1四半期",
        }]
        results = calc_tsubo_stats(items)
        assert len(results) == 1
        # 坪単価: 50,000,000 / 100 * 3.30579 = 1,652,895
        expected_tsubo = 50_000_000 / 100 * TSUBO_PER_SQM
        assert abs(results[0]["tsubo_price"] - expected_tsubo) < 1

    def test_exclude_low_price(self):
        items = [{
            "Type": "宅地(土地のみ)",
            "TradePrice": "50000",  # <= 10万円
            "Area": "100",
        }]
        results = calc_tsubo_stats(items)
        assert len(results) == 0

    def test_exclude_non_land(self):
        items = [{
            "Type": "宅地(土地と建物)",
            "TradePrice": "50000000",
            "Area": "100",
        }]
        results = calc_tsubo_stats(items)
        assert len(results) == 0


# ─── estimate_building_residual ───────────────────────────

class TestEstimateBuildingResidual:
    @patch("analyzer.datetime")
    def test_wood_10years(self, mock_dt):
        mock_dt.date.today.return_value = datetime.date(2025, 1, 1)
        item = {
            "TradePrice": "30000000",
            "TotalFloorArea": "100",
            "BuildingYear": "平成27年",  # 2015年, 築10年
            "Structure": "木造",
        }
        result = estimate_building_residual(item)
        assert result is not None
        # 残存率: 1 - 10/22 ≈ 0.5455
        # 建物残価: 215,000 * 100 * 0.5455 ≈ 11,727,273
        # 推定土地: 30,000,000 - 11,727,273 ≈ 18,272,727
        assert result["estimated_land_price"] > 15_000_000
        assert result["estimated_land_price"] < 25_000_000

    def test_missing_fields(self):
        item = {"TradePrice": "30000000"}
        result = estimate_building_residual(item)
        assert result is None

    @patch("analyzer.datetime")
    def test_negative_land_price(self, mock_dt):
        """建物残価が取引価格を上回る場合は None"""
        mock_dt.date.today.return_value = datetime.date(2025, 1, 1)
        item = {
            "TradePrice": "1000000",  # 100万円（安すぎる）
            "TotalFloorArea": "200",
            "BuildingYear": "令和5年",  # 築2年
            "Structure": "ＲＣ（鉄筋コンクリート造）",
        }
        result = estimate_building_residual(item)
        assert result is None  # RC 200㎡ 築2年の残価 >> 100万円


# ─── remove_outliers ──────────────────────────────────────

class TestRemoveOutliers:
    def test_removes_low_outliers(self):
        results = [
            {"tsubo_price": 1_000_000},
            {"tsubo_price": 1_100_000},
            {"tsubo_price": 1_200_000},
            {"tsubo_price": 100_000},   # 中央値の1/5以下
        ]
        cleaned = remove_outliers(results)
        assert len(cleaned) == 3

    def test_keeps_all_when_few(self):
        results = [
            {"tsubo_price": 1_000_000},
            {"tsubo_price": 100_000},
        ]
        cleaned = remove_outliers(results)
        assert len(cleaned) == 2  # 3件未満は除外しない


# ─── summarize_stats ──────────────────────────────────────

class TestSummarizeStats:
    def test_basic(self):
        results = [
            {"tsubo_price": 1_000_000, "ikishu_price": 500_000},
            {"tsubo_price": 2_000_000, "ikishu_price": 1_000_000},
            {"tsubo_price": 1_500_000, "ikishu_price": 750_000},
        ]
        summary = summarize_stats(results)
        assert summary["count"] == 3
        assert summary["tsubo_min"] == 1_000_000
        assert summary["tsubo_max"] == 2_000_000
        assert summary["tsubo_median"] == 1_500_000

    def test_empty(self):
        summary = summarize_stats([])
        assert summary["count"] == 0
        assert summary["tsubo_min"] is None


# ─── _format_man_yen ──────────────────────────────────────

class TestFormatManYen:
    def test_basic(self):
        assert _format_man_yen(1_000_000) == "100.0"

    def test_none(self):
        assert _format_man_yen(None) == "-"

    def test_decimal(self):
        assert _format_man_yen(1_234_567) == "123.5"
