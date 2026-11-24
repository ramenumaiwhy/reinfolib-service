"""E2E テスト: 住所入力 → 分析 → レポート出力までの全パイプライン検証

- GSI（国土地理院）API: 実ネットワーク通信でテスト（APIキー不要）
- reinfolib（国交省）API: モックで代替（APIキーが必要なため）
- ノートブック整合性: 埋め込みコードのセキュリティ設定を検証
"""

import json
import sys
import os

import pytest
import requests

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from unittest.mock import patch, MagicMock
from analyzer import (
    geocode,
    reverse_geocode,
    get_pref_name,
    get_district_name,
    get_city_name,
    fetch_transactions,
    filter_by_district,
    calc_tsubo_stats,
    calc_building_land_stats,
    remove_outliers,
    summarize_stats,
    summarize_by_use_district,
    analyze,
    generate_report_text,
    _format_man_yen,
)


# ─── GSI API 実通信テスト ────────────────────────────────────

class TestGSIGeocoderLive:
    """国土地理院ジオコーダの実通信テスト（APIキー不要）"""

    def test_geocode_shibuya(self):
        """渋谷区恵比寿のジオコーディングが緯度経度を返す"""
        lat, lon = geocode("渋谷区恵比寿")
        assert 35.5 < lat < 35.7, f"緯度が範囲外: {lat}"
        assert 139.6 < lon < 139.8, f"経度が範囲外: {lon}"

    def test_geocode_osaka(self):
        """大阪市北区の座標が正しい範囲にある"""
        lat, lon = geocode("大阪市北区")
        assert 34.6 < lat < 34.8, f"緯度が範囲外: {lat}"
        assert 135.4 < lon < 135.6, f"経度が範囲外: {lon}"

    def test_geocode_nonexistent_raises(self):
        """存在しない住所でValueError"""
        with pytest.raises(ValueError, match="住所が見つかりません"):
            geocode("zzz存在しない住所xyz999")

    def test_reverse_geocode_shibuya(self):
        """渋谷の座標から市区町村コードと地名が返る"""
        lat, lon = geocode("渋谷区恵比寿")
        muni_cd, lv01_nm = reverse_geocode(lat, lon)
        assert muni_cd.startswith("13"), f"東京都(13)で始まるべき: {muni_cd}"
        assert len(muni_cd) == 5, f"市区町村コードは5桁: {muni_cd}"
        assert lv01_nm, "地名が空"

    def test_geocode_to_prefecture(self):
        """ジオコーダ → 逆ジオコーダ → 都道府県名の連結テスト"""
        lat, lon = geocode("横浜市緑区")
        muni_cd, _ = reverse_geocode(lat, lon)
        pref = get_pref_name(muni_cd)
        assert pref == "神奈川県"


class TestGSIAllowRedirects:
    """GSI API への allow_redirects=False が設定されているか"""

    def test_geocode_no_redirect(self):
        """geocode が allow_redirects=False でリクエストしている"""
        with patch("analyzer.requests.get") as mock_get:
            mock_resp = MagicMock()
            mock_resp.json.return_value = [
                {"geometry": {"coordinates": [139.71, 35.65]}}
            ]
            mock_resp.raise_for_status = MagicMock()
            mock_get.return_value = mock_resp
            geocode("テスト住所")
            _, kwargs = mock_get.call_args
            assert kwargs.get("allow_redirects") is False

    def test_reverse_geocode_no_redirect(self):
        """reverse_geocode が allow_redirects=False でリクエストしている"""
        with patch("analyzer.requests.get") as mock_get:
            mock_resp = MagicMock()
            mock_resp.json.return_value = {
                "results": {"muniCd": "13113", "lv01Nm": "恵比寿一丁目"}
            }
            mock_resp.raise_for_status = MagicMock()
            mock_get.return_value = mock_resp
            reverse_geocode(35.65, 139.71)
            _, kwargs = mock_get.call_args
            assert kwargs.get("allow_redirects") is False


# ─── 全パイプライン E2E テスト（reinfolib API はモック）────────

MOCK_TRANSACTIONS = [
    {
        "Type": "宅地(土地のみ)",
        "TradePrice": "80000000",
        "Area": "120",
        "FloorAreaRatio": "200",
        "Prefecture": "東京都",
        "Municipality": "渋谷区",
        "DistrictName": "恵比寿",
        "UseDistrict": "第一種住居地域",
        "Period": "令和6年第1四半期",
    },
    {
        "Type": "宅地(土地のみ)",
        "TradePrice": "60000000",
        "Area": "90",
        "FloorAreaRatio": "200",
        "Prefecture": "東京都",
        "Municipality": "渋谷区",
        "DistrictName": "恵比寿",
        "UseDistrict": "第一種住居地域",
        "Period": "令和5年第3四半期",
    },
    {
        "Type": "宅地(土地のみ)",
        "TradePrice": "100000000",
        "Area": "150",
        "FloorAreaRatio": "300",
        "Prefecture": "東京都",
        "Municipality": "渋谷区",
        "DistrictName": "恵比寿",
        "UseDistrict": "商業地域",
        "Period": "令和5年第2四半期",
    },
    {
        "Type": "宅地(土地と建物)",
        "TradePrice": "120000000",
        "Area": "100",
        "TotalFloorArea": "200",
        "FloorAreaRatio": "200",
        "BuildingYear": "令和2年",
        "Structure": "ＲＣ（鉄筋コンクリート造）",
        "Prefecture": "東京都",
        "Municipality": "渋谷区",
        "DistrictName": "恵比寿",
        "UseDistrict": "第一種住居地域",
        "Period": "令和6年第1四半期",
    },
    {
        "Type": "宅地(土地のみ)",
        "TradePrice": "50000",
        "Area": "10",
        "FloorAreaRatio": "200",
        "Prefecture": "東京都",
        "Municipality": "渋谷区",
        "DistrictName": "恵比寿",
        "UseDistrict": "第一種住居地域",
        "Period": "令和5年第1四半期",
    },
    {
        "Type": "宅地(土地のみ)",
        "TradePrice": "70000000",
        "Area": "100",
        "FloorAreaRatio": "200",
        "Prefecture": "東京都",
        "Municipality": "渋谷区",
        "DistrictName": "代官山",
        "UseDistrict": "第一種住居地域",
        "Period": "令和5年第1四半期",
    },
]

MOCK_CITY_LIST = {
    "data": [
        {"id": "13113", "name": "渋谷区"},
        {"id": "13104", "name": "新宿区"},
    ]
}


def _make_mock_response(json_data, status_code=200):
    resp = MagicMock()
    resp.json.return_value = json_data
    resp.status_code = status_code
    resp.raise_for_status = MagicMock()
    return resp


def _mock_side_effect(url, **kwargs):
    if "AddressSearch" in url:
        return _make_mock_response([
            {"geometry": {"coordinates": [139.71, 35.65]}}
        ])
    elif "LonLatToAddress" in url:
        return _make_mock_response({
            "results": {"muniCd": "13113", "lv01Nm": "恵比寿一丁目"}
        })
    elif "XIT002" in url:
        return _make_mock_response(MOCK_CITY_LIST)
    elif "XIT001" in url:
        return _make_mock_response({"data": MOCK_TRANSACTIONS})
    else:
        raise ValueError(f"Unexpected URL: {url}")


class TestFullPipelineWithMock:
    """reinfolib API をモックし、全パイプラインをテスト"""

    @patch("analyzer.time.sleep")
    @patch("analyzer.requests.get")
    def test_years_in_report(self, mock_get, _sleep):
        def fetch(url, **kwargs):
            if "XIT001" in url:
                year = kwargs["params"]["year"]
                if year == 2026:
                    return _make_mock_response({}, 404)
                if year == 2025:
                    return _make_mock_response({"data": []})
            return _mock_side_effect(url, **kwargs)

        mock_get.side_effect = fetch
        result = analyze("fixture", "渋谷区恵比寿", years=[2026, 2025, 2024])
        report = generate_report_text(result)
        assert "2026年 未取得（404）" in report
        assert "2025年 市区町村の取引0件" in report
        assert "2024年 土地のみ3件・建物込み1件" in report

    @patch("analyzer.time.sleep")
    @patch("analyzer.requests.get")
    def test_analyze_ebisu(self, mock_get, mock_sleep):
        """渋谷区恵比寿の全パイプラインが正常に完了する"""
        mock_get.side_effect = _mock_side_effect

        result = analyze("test-api-key", "渋谷区恵比寿", years=[2024, 2023])

        assert result["address"] == "渋谷区恵比寿"
        assert result["prefecture"] == "東京都"
        assert result["municipality"] == "渋谷区"
        assert result["district_name"] == "恵比寿"
        assert result["muni_cd"] == "13113"

        land_count = result["land_only"]["count"]
        assert land_count > 0, "土地のみ取引が0件"

        bld_count = result["building_land"]["count"]
        assert bld_count > 0, "建物込み取引が0件"

        assert result["land_only"]["overall"]["tsubo_median"] is not None
        assert result["land_only"]["overall"]["tsubo_median"] > 0

    @patch("analyzer.time.sleep")
    @patch("analyzer.requests.get")
    def test_generate_report(self, mock_get, mock_sleep):
        """analyze → generate_report_text でマークダウンレポートが生成される"""
        mock_get.side_effect = _mock_side_effect

        result = analyze("test-api-key", "渋谷区恵比寿", years=[2024])
        report = generate_report_text(result)

        assert "## 不動産相場分析レポート" in report
        assert "渋谷区恵比寿" in report
        assert "### 基本情報" in report
        assert "### 土地のみ取引" in report
        assert "坪単価(万円)" in report
        assert "万円" in report
        assert "参考値" in report

    @patch("analyzer.time.sleep")
    @patch("analyzer.requests.get")
    def test_all_requests_use_allow_redirects_false(self, mock_get, mock_sleep):
        """全 API 呼び出しで allow_redirects=False が設定されている"""
        mock_get.side_effect = _mock_side_effect
        analyze("test-api-key", "渋谷区恵比寿", years=[2024])

        for call in mock_get.call_args_list:
            _, kwargs = call
            assert kwargs.get("allow_redirects") is False, (
                f"allow_redirects=False が未設定: {call}"
            )

    @patch("analyzer.time.sleep")
    @patch("analyzer.requests.get")
    def test_api_key_not_in_url_params(self, mock_get, mock_sleep):
        """APIキーがURLパラメータに含まれない"""
        mock_get.side_effect = _mock_side_effect
        test_key = "secret-test-key-12345"
        analyze(test_key, "渋谷区恵比寿", years=[2024])

        for call in mock_get.call_args_list:
            _, kwargs = call
            params = kwargs.get("params", {})
            for v in params.values():
                assert test_key not in str(v), "APIキーがURLパラメータに含まれている"


# ─── ノートブック整合性チェック ────────────────────────────────

class TestNotebookConsistency:
    """reinfolib_checker.ipynb の埋め込みコードがセキュリティ要件を満たしているか"""

    @pytest.fixture
    def notebook(self):
        nb_path = os.path.join(
            os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
            "reinfolib_checker.ipynb",
        )
        with open(nb_path, "r", encoding="utf-8") as f:
            return json.load(f)

    def _get_cell_source(self, notebook, cell_idx):
        cell = notebook["cells"][cell_idx]
        src = cell["source"]
        return src if isinstance(src, str) else "".join(src)

    def test_uses_getpass(self, notebook):
        """APIキー入力に getpass.getpass() を使用している"""
        settings_cell = self._get_cell_source(notebook, 1)
        assert "getpass" in settings_cell
        assert "getpass.getpass(" in settings_cell

    def test_no_param_for_api_key(self, notebook):
        """APIキーに @param フォーム入力が使われていない"""
        settings_cell = self._get_cell_source(notebook, 1)
        for line in settings_cell.split("\n"):
            if "api_key" in line and "@param" in line:
                pytest.fail("APIキーに @param が使われている")

    def test_allow_redirects_in_notebook(self, notebook):
        """ノートブック内の全 requests.get に allow_redirects=False がある"""
        engine_cell = self._get_cell_source(notebook, 2)
        get_count = engine_cell.count("requests.get(")
        redirect_count = engine_cell.count("allow_redirects=False")
        assert redirect_count >= get_count, (
            f"requests.get={get_count} vs allow_redirects=False={redirect_count}"
        )

    def test_security_section_in_header(self, notebook):
        """ノートブック冒頭にセキュリティ説明がある"""
        header_cell = self._get_cell_source(notebook, 0)
        assert "セキュリティ" in header_cell
        assert "getpass" in header_cell

    def test_notebook_has_disclaimer(self, notebook):
        """免責事項が含まれている"""
        all_source = " ".join(
            self._get_cell_source(notebook, i)
            for i in range(len(notebook["cells"]))
        )
        assert "参考値" in all_source or "保証" in all_source


# ─── GSI → 分析パイプライン連結テスト ─────────────────────────

class TestGSIToAnalysisPipeline:
    """GSI 実通信で取得した座標を分析パイプラインに流す"""

    def test_address_parsing_pipeline(self):
        """住所 → 座標 → 市区町村コード → 都道府県名・地区名の変換パイプライン"""
        lat, lon = geocode("渋谷区恵比寿")
        muni_cd, lv01_nm = reverse_geocode(lat, lon)
        pref = get_pref_name(muni_cd)
        district = get_district_name(lv01_nm)

        assert pref == "東京都"
        assert district, "地区名が空"
        assert "丁目" not in district, f"丁目が残っている: {district}"

    def test_yokohama_seirei_shitei(self):
        """政令指定都市（横浜市緑区）のアドレスパイプライン"""
        lat, lon = geocode("横浜市緑区")
        muni_cd, lv01_nm = reverse_geocode(lat, lon)
        pref = get_pref_name(muni_cd)

        assert pref == "神奈川県"
        assert muni_cd.startswith("14"), f"神奈川県(14)で始まるべき: {muni_cd}"
