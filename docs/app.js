"use strict";
(() => {
  // src/app.ts
  var TSUBO_PER_SQM = 3.30579;
  var PREFECTURE_CODES = {
    "01": "\u5317\u6D77\u9053",
    "02": "\u9752\u68EE\u770C",
    "03": "\u5CA9\u624B\u770C",
    "04": "\u5BAE\u57CE\u770C",
    "05": "\u79CB\u7530\u770C",
    "06": "\u5C71\u5F62\u770C",
    "07": "\u798F\u5CF6\u770C",
    "08": "\u8328\u57CE\u770C",
    "09": "\u6803\u6728\u770C",
    "10": "\u7FA4\u99AC\u770C",
    "11": "\u57FC\u7389\u770C",
    "12": "\u5343\u8449\u770C",
    "13": "\u6771\u4EAC\u90FD",
    "14": "\u795E\u5948\u5DDD\u770C",
    "15": "\u65B0\u6F5F\u770C",
    "16": "\u5BCC\u5C71\u770C",
    "17": "\u77F3\u5DDD\u770C",
    "18": "\u798F\u4E95\u770C",
    "19": "\u5C71\u68A8\u770C",
    "20": "\u9577\u91CE\u770C",
    "21": "\u5C90\u961C\u770C",
    "22": "\u9759\u5CA1\u770C",
    "23": "\u611B\u77E5\u770C",
    "24": "\u4E09\u91CD\u770C",
    "25": "\u6ECB\u8CC0\u770C",
    "26": "\u4EAC\u90FD\u5E9C",
    "27": "\u5927\u962A\u5E9C",
    "28": "\u5175\u5EAB\u770C",
    "29": "\u5948\u826F\u770C",
    "30": "\u548C\u6B4C\u5C71\u770C",
    "31": "\u9CE5\u53D6\u770C",
    "32": "\u5CF6\u6839\u770C",
    "33": "\u5CA1\u5C71\u770C",
    "34": "\u5E83\u5CF6\u770C",
    "35": "\u5C71\u53E3\u770C",
    "36": "\u5FB3\u5CF6\u770C",
    "37": "\u9999\u5DDD\u770C",
    "38": "\u611B\u5A9B\u770C",
    "39": "\u9AD8\u77E5\u770C",
    "40": "\u798F\u5CA1\u770C",
    "41": "\u4F50\u8CC0\u770C",
    "42": "\u9577\u5D0E\u770C",
    "43": "\u718A\u672C\u770C",
    "44": "\u5927\u5206\u770C",
    "45": "\u5BAE\u5D0E\u770C",
    "46": "\u9E7F\u5150\u5CF6\u770C",
    "47": "\u6C96\u7E04\u770C"
  };
  var BUILDING_SPECS = {
    SRC: { useful_life: 47, unit_cost: 335e3 },
    RC: { useful_life: 47, unit_cost: 334e3 },
    LS: { useful_life: 27, unit_cost: 325e3 },
    S: { useful_life: 34, unit_cost: 325e3 },
    W: { useful_life: 22, unit_cost: 215e3 }
  };
  var ZONING_CATEGORIES = {
    "\u4F4F\u5C45\u7CFB": [
      "\u7B2C\uFF11\u7A2E\u4F4E\u5C64\u4F4F\u5C45\u5C02\u7528\u5730\u57DF",
      "\u7B2C\uFF11\u7A2E\u4F4E\u5C64\u4F4F\u5C45\u5C02\u7528",
      "\u7B2C\u4E00\u7A2E\u4F4E\u5C64\u4F4F\u5C45\u5C02\u7528\u5730\u57DF",
      "\u7B2C\uFF12\u7A2E\u4F4E\u5C64\u4F4F\u5C45\u5C02\u7528\u5730\u57DF",
      "\u7B2C\uFF12\u7A2E\u4F4E\u5C64\u4F4F\u5C45\u5C02\u7528",
      "\u7B2C\u4E8C\u7A2E\u4F4E\u5C64\u4F4F\u5C45\u5C02\u7528\u5730\u57DF",
      "\u7B2C\uFF11\u7A2E\u4E2D\u9AD8\u5C64\u4F4F\u5C45\u5C02\u7528\u5730\u57DF",
      "\u7B2C\uFF11\u7A2E\u4E2D\u9AD8\u5C64\u4F4F\u5C45\u5C02\u7528",
      "\u7B2C\u4E00\u7A2E\u4E2D\u9AD8\u5C64\u4F4F\u5C45\u5C02\u7528\u5730\u57DF",
      "\u7B2C\uFF12\u7A2E\u4E2D\u9AD8\u5C64\u4F4F\u5C45\u5C02\u7528\u5730\u57DF",
      "\u7B2C\uFF12\u7A2E\u4E2D\u9AD8\u5C64\u4F4F\u5C45\u5C02\u7528",
      "\u7B2C\u4E8C\u7A2E\u4E2D\u9AD8\u5C64\u4F4F\u5C45\u5C02\u7528\u5730\u57DF",
      "\u7B2C\uFF11\u7A2E\u4F4F\u5C45\u5730\u57DF",
      "\u7B2C\uFF11\u7A2E\u4F4F\u5C45",
      "\u7B2C\u4E00\u7A2E\u4F4F\u5C45\u5730\u57DF",
      "\u7B2C\uFF12\u7A2E\u4F4F\u5C45\u5730\u57DF",
      "\u7B2C\uFF12\u7A2E\u4F4F\u5C45",
      "\u7B2C\u4E8C\u7A2E\u4F4F\u5C45\u5730\u57DF",
      "\u6E96\u4F4F\u5C45\u5730\u57DF",
      "\u6E96\u4F4F\u5C45",
      "\u7530\u5712\u4F4F\u5C45\u5730\u57DF",
      "\u7530\u5712\u4F4F\u5C45"
    ],
    "\u5546\u696D\u7CFB": [
      "\u8FD1\u96A3\u5546\u696D\u5730\u57DF",
      "\u8FD1\u96A3\u5546\u696D",
      "\u5546\u696D\u5730\u57DF",
      "\u5546\u696D"
    ],
    "\u5DE5\u696D\u7CFB": [
      "\u6E96\u5DE5\u696D\u5730\u57DF",
      "\u6E96\u5DE5\u696D",
      "\u5DE5\u696D\u5730\u57DF",
      "\u5DE5\u696D",
      "\u5DE5\u696D\u5C02\u7528\u5730\u57DF",
      "\u5DE5\u696D\u5C02\u7528"
    ]
  };
  function getPrefName(muniCd) {
    return PREFECTURE_CODES[muniCd.substring(0, 2)] || "";
  }
  function getDistrictName(lv01Nm) {
    return lv01Nm.replace(/([一二三四五六七八九十百千万]+|[0-9]+)丁目$/, "");
  }
  function getUseDistrict(item) {
    return item.UseDistrict || item.CityPlanning || "";
  }
  function getZoningCategory(useDistrict) {
    if (!useDistrict) return "";
    for (const cat of Object.keys(ZONING_CATEGORIES)) {
      const types = ZONING_CATEGORIES[cat];
      for (const t of types) {
        if (useDistrict.includes(t)) return cat;
      }
    }
    return "";
  }
  function filterByDistrict(data, prefecture, municipality, districtName) {
    const filtered = [];
    for (const item of data) {
      if (item.Prefecture !== prefecture) continue;
      const itemMuni = item.Municipality || "";
      if (municipality) {
        const muniMatch = itemMuni === municipality || municipality.endsWith("\u533A") && itemMuni.endsWith(municipality);
        if (!muniMatch) continue;
      }
      if (item.DistrictName !== districtName) continue;
      filtered.push(item);
    }
    return filtered;
  }
  function convertJapaneseYear(yearStr) {
    if (!yearStr) return null;
    const normalized = yearStr.replace("\u5143\u5E74", "1\u5E74");
    let m;
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
  function classifyStructure(structure) {
    if (structure.includes("\uFF33\uFF32\uFF23")) return BUILDING_SPECS.SRC;
    if (structure.includes("\uFF32\uFF23")) return BUILDING_SPECS.RC;
    if (structure.includes("\u8EFD\u91CF\u9244\u9AA8")) return BUILDING_SPECS.LS;
    if (structure.includes("\u9244\u9AA8")) return BUILDING_SPECS.S;
    return BUILDING_SPECS.W;
  }
  function estimateBuildingResidual(item) {
    const tradePrice = parseInt(item.TradePrice || "0") || 0;
    const totalFloorArea = item.TotalFloorArea;
    const buildingYear = item.BuildingYear;
    const structure = item.Structure || "";
    if (!tradePrice || !totalFloorArea || !buildingYear) return null;
    const floorArea = parseFloat(totalFloorArea);
    if (isNaN(floorArea) || floorArea <= 0) return null;
    const currentYear = (/* @__PURE__ */ new Date()).getFullYear();
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
      remaining_ratio: remainingRatio
    };
  }
  function calcTsuboStats(items) {
    const results = [];
    for (const item of items) {
      if (item.Type !== "\u5B85\u5730(\u571F\u5730\u306E\u307F)") continue;
      const tradePrice = parseInt(item.TradePrice || "0") || 0;
      if (tradePrice <= 1e5) continue;
      const areaM2 = parseFloat(item.Area || "0") || 0;
      if (areaM2 <= 0) continue;
      const tsuboPrice = tradePrice / areaM2 * TSUBO_PER_SQM;
      const floorAreaRatio = parseFloat(item.FloorAreaRatio || "0") || 0;
      const ikishuPrice = floorAreaRatio > 0 ? tsuboPrice / (floorAreaRatio / 100) : null;
      results.push({
        tsubo_price: tsuboPrice,
        ikishu_price: ikishuPrice,
        trade_price: tradePrice,
        area_m2: areaM2,
        floor_area_ratio: floorAreaRatio,
        use_district: getUseDistrict(item),
        period: item.Period || "",
        raw: item
      });
    }
    return results;
  }
  function calcBuildingLandStats(items) {
    const results = [];
    for (const item of items) {
      if (item.Type !== "\u5B85\u5730(\u571F\u5730\u3068\u5EFA\u7269)") continue;
      const areaM2 = parseFloat(item.Area || "0") || 0;
      if (areaM2 <= 0) continue;
      const estimation = estimateBuildingResidual(item);
      if (!estimation) continue;
      const tsuboPrice = estimation.estimated_land_price / areaM2 * TSUBO_PER_SQM;
      const floorAreaRatio = parseFloat(item.FloorAreaRatio || "0") || 0;
      const ikishuPrice = floorAreaRatio > 0 ? tsuboPrice / (floorAreaRatio / 100) : null;
      results.push({
        tsubo_price: tsuboPrice,
        ikishu_price: ikishuPrice,
        estimated_land_price: estimation.estimated_land_price,
        building_value: estimation.building_value,
        remaining_ratio: estimation.remaining_ratio,
        trade_price: parseInt(item.TradePrice || "0") || 0,
        area_m2: areaM2,
        floor_area_ratio: floorAreaRatio,
        use_district: getUseDistrict(item),
        period: item.Period || "",
        structure: item.Structure || "",
        building_year: item.BuildingYear || "",
        raw: item
      });
    }
    return results;
  }
  function removeOutliers(results) {
    const prices = results.map((r) => r.tsubo_price);
    if (prices.length < 3) return results;
    const mid = median(prices);
    return results.filter((r) => r.tsubo_price >= mid / 5);
  }
  function median(arr) {
    if (arr.length === 0) return null;
    const sorted = [...arr].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  }
  function summarizeStats(results) {
    var _a;
    const tsuboPrices = results.map((r) => r.tsubo_price);
    const ikishuPrices = results.filter((r) => r.ikishu_price != null).map((r) => r.ikishu_price);
    const summary = {
      count: tsuboPrices.length,
      tsubo_min: tsuboPrices.length ? Math.min(...tsuboPrices) : null,
      tsubo_max: tsuboPrices.length ? Math.max(...tsuboPrices) : null,
      tsubo_median: median(tsuboPrices)
    };
    if (ikishuPrices.length) {
      summary.ikishu_min = Math.min(...ikishuPrices);
      summary.ikishu_max = Math.max(...ikishuPrices);
      summary.ikishu_median = (_a = median(ikishuPrices)) != null ? _a : void 0;
    }
    return summary;
  }
  function summarizeByUseDistrict(results) {
    const groups = {};
    for (const r of results) {
      const key = r.use_district || "\u4E0D\u660E";
      if (!groups[key]) groups[key] = [];
      groups[key].push(r);
    }
    const summaries = {};
    for (const district of Object.keys(groups)) {
      summaries[district] = summarizeStats(groups[district]);
    }
    return summaries;
  }
  function formatManYen(value) {
    if (value == null) return "-";
    return (value / 1e4).toFixed(1);
  }
  function formatPrice(value) {
    if (!value) return "-";
    const num = typeof value === "string" ? parseInt(value) : value;
    if (isNaN(num) || num <= 0) return "-";
    if (num >= 1e8) return (num / 1e8).toFixed(1) + "\u5104";
    return Math.round(num / 1e4).toLocaleString() + "\u4E07";
  }
  var GSI_GEOCODER_URL = "https://msearch.gsi.go.jp/address-search/AddressSearch";
  var GSI_REVERSE_GEOCODER_URL = "https://mreversegeocoder.gsi.go.jp/reverse-geocoder/LonLatToAddress";
  var ZONING_DISPLAY_NAMES = {
    "\u4F4F\u5C45\u7CFB": [
      "\u7B2C\uFF11\u7A2E\u4F4E\u5C64\u4F4F\u5C45\u5C02\u7528\u5730\u57DF",
      "\u7B2C\uFF12\u7A2E\u4F4E\u5C64\u4F4F\u5C45\u5C02\u7528\u5730\u57DF",
      "\u7B2C\uFF11\u7A2E\u4E2D\u9AD8\u5C64\u4F4F\u5C45\u5C02\u7528\u5730\u57DF",
      "\u7B2C\uFF12\u7A2E\u4E2D\u9AD8\u5C64\u4F4F\u5C45\u5C02\u7528\u5730\u57DF",
      "\u7B2C\uFF11\u7A2E\u4F4F\u5C45\u5730\u57DF",
      "\u7B2C\uFF12\u7A2E\u4F4F\u5C45\u5730\u57DF",
      "\u6E96\u4F4F\u5C45\u5730\u57DF",
      "\u7530\u5712\u4F4F\u5C45\u5730\u57DF"
    ],
    "\u5546\u696D\u7CFB": ["\u8FD1\u96A3\u5546\u696D\u5730\u57DF", "\u5546\u696D\u5730\u57DF"],
    "\u5DE5\u696D\u7CFB": ["\u6E96\u5DE5\u696D\u5730\u57DF", "\u5DE5\u696D\u5730\u57DF", "\u5DE5\u696D\u5C02\u7528\u5730\u57DF"]
  };
  var RAW_FIELD_LABELS = [
    ["Type", "\u7A2E\u985E"],
    ["TradePrice", "\u53D6\u5F15\u4FA1\u683C"],
    ["Area", "\u9762\u7A4D(\u33A1)"],
    ["UnitPrice", "\u33A1\u5358\u4FA1"],
    ["FloorAreaRatio", "\u5BB9\u7A4D\u7387(%)"],
    ["CoverageRatio", "\u5EFA\u307A\u3044\u7387(%)"],
    ["UseDistrict", "\u7528\u9014\u5730\u57DF"],
    ["CityPlanning", "\u90FD\u5E02\u8A08\u753B"],
    ["Period", "\u53D6\u5F15\u6642\u70B9"],
    ["Structure", "\u69CB\u9020"],
    ["BuildingYear", "\u5EFA\u7BC9\u5E74"],
    ["TotalFloorArea", "\u5EF6\u5E8A\u9762\u7A4D(\u33A1)"],
    ["FloorPlan", "\u9593\u53D6\u308A"],
    ["LandShape", "\u571F\u5730\u306E\u5F62\u72B6"],
    ["Frontage", "\u9593\u53E3(m)"],
    ["Direction", "\u524D\u9762\u9053\u8DEF\u306E\u65B9\u4F4D"],
    ["Classification", "\u524D\u9762\u9053\u8DEF\u306E\u7A2E\u985E"],
    ["Breadth", "\u524D\u9762\u9053\u8DEF\u306E\u5E45\u54E1(m)"],
    ["Use", "\u5229\u7528\u73FE\u6CC1"],
    ["Purpose", "\u4ECA\u5F8C\u306E\u5229\u7528\u76EE\u7684"],
    ["Renovation", "\u6539\u88C5"],
    ["Remarks", "\u5099\u8003"]
  ];
  var RAW_FIELD_SKIP = ["Prefecture", "Municipality", "DistrictName", "Region", "MunicipalityCode"];
  function init() {
    const apiKeyInput = document.getElementById("apiKeyInput");
    const saveKeyBtn = document.getElementById("saveKeyBtn");
    const deleteKeyBtn = document.getElementById("deleteKeyBtn");
    const apiKeyStatus = document.getElementById("apiKeyStatus");
    const apiKeyForm = document.getElementById("apiKeyForm");
    const apiKeyDone = document.getElementById("apiKeyDone");
    const addressInput = document.getElementById("addressInput");
    const stationInput = document.getElementById("stationInput");
    const stationCandidatesDiv = document.getElementById("stationCandidates");
    const analyzeBtn = document.getElementById("analyzeBtn");
    const loading = document.getElementById("loading");
    const loadingText = document.getElementById("loadingText");
    const resultsEl = document.getElementById("results");
    const resultSummary = document.getElementById("resultSummary");
    const landOnlyContent = document.getElementById("landOnlyContent");
    const buildingLandContent = document.getElementById("buildingLandContent");
    const zoningCategorySelect = document.getElementById("zoningCategory");
    const zoningDetailDiv = document.getElementById("zoningDetail");
    const searchModeTabs = document.querySelectorAll(".search-tab");
    const addressSearchArea = document.getElementById("addressSearchArea");
    const stationSearchArea = document.getElementById("stationSearchArea");
    let searchMode = "address";
    let selectedStation = null;
    let stationsData = null;
    let stationsLoading = false;
    let highlightedIndex = -1;
    let isComposing = false;
    let selectedZoningTypes = [];
    function sleep(ms) {
      return new Promise((resolve) => setTimeout(resolve, ms));
    }
    function createSafeElement(tag, text, attrs) {
      const el = document.createElement(tag);
      if (text != null) el.textContent = text;
      if (attrs) {
        for (const key of Object.keys(attrs)) {
          el.setAttribute(key, attrs[key]);
        }
      }
      return el;
    }
    function setLoadingText(text) {
      loadingText.textContent = text;
    }
    function showStatus(el, type, msg) {
      el.className = "status " + type;
      el.textContent = msg;
    }
    for (let ti = 0; ti < searchModeTabs.length; ti++) {
      (function(tab) {
        tab.addEventListener("click", function() {
          for (let j = 0; j < searchModeTabs.length; j++) {
            searchModeTabs[j].className = "search-tab";
          }
          tab.className = "search-tab active";
          searchMode = tab.dataset.mode || "address";
          if (searchMode === "address") {
            addressSearchArea.style.display = "";
            stationSearchArea.style.display = "none";
          } else {
            addressSearchArea.style.display = "none";
            stationSearchArea.style.display = "";
          }
        });
      })(searchModeTabs[ti]);
    }
    async function loadStations() {
      if (stationsData) return stationsData;
      if (stationsLoading) {
        let waited = 0;
        while (stationsLoading && waited < 1e4) {
          await sleep(100);
          waited += 100;
        }
        return stationsData;
      }
      stationsLoading = true;
      const resp = await fetch("stations.json");
      stationsData = await resp.json();
      stationsLoading = false;
      return stationsData;
    }
    function buildCandidateLabel(station) {
      const prefName = getPrefName(station.pref + "000");
      const lines = station.lines ? station.lines.split(",") : [];
      let lineText = "";
      if (lines.length === 1) {
        lineText = lines[0];
      } else if (lines.length === 2) {
        lineText = lines[0] + " \u4ED61\u8DEF\u7DDA";
      } else if (lines.length > 2) {
        lineText = lines[0] + " \u4ED6" + (lines.length - 1) + "\u8DEF\u7DDA";
      }
      let label = station.name + "\uFF08" + prefName;
      if (lineText) label += "\u30FB" + lineText;
      label += "\uFF09";
      return label;
    }
    function renderCandidates(stations) {
      stationCandidatesDiv.textContent = "";
      highlightedIndex = -1;
      if (!stations || stations.length === 0) {
        stationCandidatesDiv.className = "station-candidates";
        return;
      }
      for (const station of stations) {
        const item = createSafeElement("div", buildCandidateLabel(station));
        item.className = "station-candidate";
        item.addEventListener("mousedown", function(e) {
          e.preventDefault();
          selectStation(station);
        });
        stationCandidatesDiv.appendChild(item);
      }
      stationCandidatesDiv.className = "station-candidates open";
    }
    function selectStation(station) {
      selectedStation = station;
      stationInput.value = buildCandidateLabel(station);
      stationCandidatesDiv.className = "station-candidates";
      stationCandidatesDiv.textContent = "";
      highlightedIndex = -1;
    }
    function highlightCandidate(index) {
      const items = stationCandidatesDiv.querySelectorAll(".station-candidate");
      for (let i = 0; i < items.length; i++) {
        items[i].className = "station-candidate";
      }
      if (index >= 0 && index < items.length) {
        items[index].className = "station-candidate highlighted";
        highlightedIndex = index;
      } else {
        highlightedIndex = -1;
      }
    }
    stationInput.addEventListener("compositionstart", function() {
      isComposing = true;
    });
    stationInput.addEventListener("compositionend", function() {
      isComposing = false;
      stationInput.dispatchEvent(new Event("input"));
    });
    stationInput.addEventListener("input", async function() {
      if (isComposing) return;
      const q = stationInput.value.trim();
      selectedStation = null;
      if (q.length < 2) {
        stationCandidatesDiv.className = "station-candidates";
        stationCandidatesDiv.textContent = "";
        return;
      }
      const all = await loadStations();
      const prefix = [];
      const middle = [];
      for (const s of all) {
        if (s.name.indexOf(q) === 0) {
          prefix.push(s);
        } else if (s.name.indexOf(q) > 0) {
          middle.push(s);
        }
      }
      renderCandidates(prefix.concat(middle).slice(0, 15));
    });
    stationInput.addEventListener("keydown", function(e) {
      const items = stationCandidatesDiv.querySelectorAll(".station-candidate");
      if (e.key === "ArrowDown") {
        e.preventDefault();
        let next = highlightedIndex + 1;
        if (next >= items.length) next = 0;
        highlightCandidate(next);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        let prev = highlightedIndex - 1;
        if (prev < 0) prev = items.length - 1;
        highlightCandidate(prev);
      } else if (e.key === "Enter") {
        if (highlightedIndex >= 0 && highlightedIndex < items.length) {
          e.preventDefault();
          const all = stationsData;
          if (all) {
            const q = stationInput.value.trim();
            const prefix2 = [];
            const middle2 = [];
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
      } else if (e.key === "Escape") {
        stationCandidatesDiv.className = "station-candidates";
        stationCandidatesDiv.textContent = "";
        highlightedIndex = -1;
      }
    });
    stationInput.addEventListener("blur", function() {
      setTimeout(function() {
        stationCandidatesDiv.className = "station-candidates";
        stationCandidatesDiv.textContent = "";
        highlightedIndex = -1;
      }, 150);
    });
    function renderZoningChips(category) {
      zoningDetailDiv.textContent = "";
      selectedZoningTypes = [];
      if (!category) {
        zoningDetailDiv.className = "zoning-detail";
        return;
      }
      const names = ZONING_DISPLAY_NAMES[category] || [];
      const chipsDiv = createSafeElement("div");
      chipsDiv.className = "zoning-chips";
      const hint = createSafeElement("div");
      hint.className = "filter-hint";
      hint.textContent = "\u9078\u629E\u3057\u306A\u3051\u308C\u3070\u300C" + category + "\u300D\u5168\u4F53\u3067\u5206\u6790\u3057\u307E\u3059";
      zoningDetailDiv.appendChild(hint);
      for (const name of names) {
        const chip = createSafeElement("label");
        chip.className = "zoning-chip";
        const cb = document.createElement("input");
        cb.type = "checkbox";
        cb.value = name;
        chip.appendChild(cb);
        chip.appendChild(createSafeElement("span", name));
        cb.addEventListener("change", function() {
          if (cb.checked) {
            chip.className = "zoning-chip selected";
            selectedZoningTypes.push(name);
          } else {
            chip.className = "zoning-chip";
            selectedZoningTypes = selectedZoningTypes.filter((t) => t !== name);
          }
        });
        chipsDiv.appendChild(chip);
      }
      zoningDetailDiv.appendChild(chipsDiv);
      zoningDetailDiv.className = "zoning-detail visible";
    }
    zoningCategorySelect.addEventListener("change", function() {
      renderZoningChips(zoningCategorySelect.value);
    });
    function filterByZoning(dataArray) {
      const category = zoningCategorySelect.value;
      if (!category) return dataArray;
      const filtered = [];
      for (const item of dataArray) {
        const ud = item.use_district;
        const itemCategory = getZoningCategory(ud);
        if (itemCategory !== category) continue;
        if (selectedZoningTypes.length > 0) {
          let matched = false;
          for (const st of selectedZoningTypes) {
            if (ud.includes(st)) {
              matched = true;
              break;
            }
          }
          if (!matched) continue;
        }
        filtered.push(item);
      }
      return filtered;
    }
    function getApiKey() {
      return localStorage.getItem("reinfolib_api_key") || "";
    }
    function setApiKey(key) {
      localStorage.setItem("reinfolib_api_key", key);
    }
    function removeApiKey() {
      localStorage.removeItem("reinfolib_api_key");
    }
    function updateKeyUI() {
      if (getApiKey()) {
        apiKeyForm.style.display = "none";
        apiKeyDone.style.display = "block";
        analyzeBtn.disabled = false;
      } else {
        apiKeyForm.style.display = "block";
        apiKeyDone.style.display = "none";
        analyzeBtn.disabled = true;
      }
    }
    saveKeyBtn.addEventListener("click", async function() {
      const key = apiKeyInput.value.trim();
      if (!key) {
        showStatus(apiKeyStatus, "error", "API\u30AD\u30FC\u3092\u5165\u529B\u3057\u3066\u304F\u3060\u3055\u3044");
        return;
      }
      saveKeyBtn.disabled = true;
      showStatus(apiKeyStatus, "info", "API\u30AD\u30FC\u3092\u691C\u8A3C\u4E2D...");
      try {
        const resp = await fetch("/api/XIT002?area=13", {
          redirect: "error",
          headers: { "Ocp-Apim-Subscription-Key": key }
        });
        if (resp.ok) {
          const cities = await resp.json();
          if (!Array.isArray(cities == null ? void 0 : cities.data) || !cities.data.some((city) => {
            var _a;
            return /^13\d{3}$/.test((_a = city == null ? void 0 : city.id) != null ? _a : "");
          })) {
            showStatus(apiKeyStatus, "error", "\u30D7\u30ED\u30AD\u30B7\u304B\u3089\u5E02\u533A\u753A\u6751\u4E00\u89A7\u3092\u53D6\u5F97\u3067\u304D\u307E\u305B\u3093\u3002");
          } else {
            setApiKey(key);
            apiKeyInput.value = "";
            apiKeyStatus.className = "status";
            apiKeyStatus.textContent = "";
            updateKeyUI();
          }
        } else if (resp.status === 401 || resp.status === 403) {
          showStatus(apiKeyStatus, "error", "API\u30AD\u30FC\u304C\u7121\u52B9\u3067\u3059\u3002\u6B63\u3057\u3044\u30AD\u30FC\u3092\u5165\u529B\u3057\u3066\u304F\u3060\u3055\u3044\u3002");
        } else {
          showStatus(apiKeyStatus, "error", "API\u63A5\u7D9A\u30A8\u30E9\u30FC\uFF08\u30B9\u30C6\u30FC\u30BF\u30B9: " + resp.status + "\uFF09");
        }
      } catch (e) {
        showStatus(apiKeyStatus, "error", "\u30B5\u30FC\u30D0\u30FC\u306B\u63A5\u7D9A\u3067\u304D\u307E\u305B\u3093\u3002\u3057\u3070\u3089\u304F\u7D4C\u3063\u3066\u304B\u3089\u304A\u8A66\u3057\u304F\u3060\u3055\u3044\u3002");
      }
      saveKeyBtn.disabled = false;
    });
    deleteKeyBtn.addEventListener("click", function() {
      removeApiKey();
      updateKeyUI();
    });
    updateKeyUI();
    async function geocode(address) {
      const resp = await fetch(GSI_GEOCODER_URL + "?q=" + encodeURIComponent(address));
      if (!resp.ok) throw new Error("\u30B8\u30AA\u30B3\u30FC\u30C0\u30FC\u30A8\u30E9\u30FC");
      const data = await resp.json();
      if (!data || data.length === 0) throw new Error("\u4F4F\u6240\u304C\u898B\u3064\u304B\u308A\u307E\u305B\u3093: " + address);
      const coords = data[0].geometry.coordinates;
      return { lat: coords[1], lon: coords[0] };
    }
    async function reverseGeocode(lat, lon) {
      const resp = await fetch(GSI_REVERSE_GEOCODER_URL + "?lat=" + lat + "&lon=" + lon);
      if (!resp.ok) throw new Error("\u9006\u30B8\u30AA\u30B3\u30FC\u30C0\u30FC\u30A8\u30E9\u30FC");
      const data = await resp.json();
      return {
        muniCd: data.results.muniCd,
        lv01Nm: data.results.lv01Nm
      };
    }
    async function getCityName(apiKey, muniCd) {
      const prefCd = muniCd.substring(0, 2);
      const resp = await fetch("/api/XIT002?area=" + prefCd, {
        redirect: "error",
        headers: { "Ocp-Apim-Subscription-Key": apiKey }
      });
      if (!resp.ok) throw new Error("\u5E02\u533A\u753A\u6751\u540D\u306E\u53D6\u5F97\u306B\u5931\u6557");
      const data = await resp.json();
      const items = data.data || [];
      for (const item of items) {
        if (item.id === muniCd) return item.name;
      }
      return null;
    }
    async function fetchTransactions(apiKey, muniCd, years) {
      const batches = [];
      for (let i = 0; i < years.length; i++) {
        if (i > 0) await sleep(1e3);
        const resp = await fetch(
          "/api/XIT001?year=" + years[i] + "&city=" + muniCd,
          { redirect: "error", headers: { "Ocp-Apim-Subscription-Key": apiKey } }
        );
        if (resp.status === 404) {
          batches.push({ year: years[i], rows: null });
          continue;
        }
        if (!resp.ok) throw new Error("\u53D6\u5F15\u30C7\u30FC\u30BF\u53D6\u5F97\u30A8\u30E9\u30FC (year=" + years[i] + ")");
        const result = await resp.json();
        if (!Array.isArray(result == null ? void 0 : result.data) || result.status && result.status !== "OK") {
          throw new Error(years[i] + "\u5E74\u306E\u53D6\u5F15\u30C7\u30FC\u30BF\u3092\u78BA\u8A8D\u3067\u304D\u307E\u305B\u3093");
        }
        batches.push({ year: years[i], rows: result.data });
      }
      return batches;
    }
    function getConfidence(count) {
      if (count >= 30) return { label: "\u4FE1\u983C\u5EA6: \u9AD8", cls: "confidence-high", note: "" };
      if (count >= 20) return { label: "\u4FE1\u983C\u5EA6: \u4E2D", cls: "confidence-mid", note: "\u4E2D\u592E\u5024\u306F\u6982\u306D\u5B89\u5B9A\u3002\xB115%\u7A0B\u5EA6\u306E\u30D6\u30EC\u5E45\u3092\u898B\u3066\u304F\u3060\u3055\u3044\u3002" };
      if (count >= 5) return { label: "\u4FE1\u983C\u5EA6: \u4F4E", cls: "confidence-low", note: "\u4EF6\u6570\u304C\u5C11\u306A\u304F\u53C2\u8003\u5024\u3067\u3059\u3002\u4E0B\u306E\u5E02\u533A\u753A\u6751\u5168\u4F53\u306E\u30C7\u30FC\u30BF\u3082\u3054\u53C2\u7167\u304F\u3060\u3055\u3044\u3002" };
      return { label: "\u4FE1\u983C\u5EA6: \u4E0D\u8DB3", cls: "confidence-poor", note: "\u4EF6\u6570\u304C\u6975\u3081\u3066\u5C11\u306A\u304F\u7D71\u8A08\u7684\u306B\u4FE1\u983C\u3067\u304D\u307E\u305B\u3093\u3002\u5E02\u533A\u753A\u6751\u5168\u4F53\u306E\u30C7\u30FC\u30BF\u3092\u3054\u53C2\u7167\u304F\u3060\u3055\u3044\u3002" };
    }
    function renderDetailTable(container, details, isBuilding) {
      const section = createSafeElement("div");
      section.className = "detail-section";
      const toggleBtn = createSafeElement("button", "");
      toggleBtn.className = "detail-toggle";
      const arrow = createSafeElement("span", "\u25B6");
      arrow.className = "arrow";
      toggleBtn.appendChild(arrow);
      toggleBtn.appendChild(document.createTextNode(" \u500B\u5225\u53D6\u5F15\u30C7\u30FC\u30BF\uFF08" + details.length + "\u4EF6\uFF09"));
      toggleBtn.addEventListener("click", function() {
        const isOpen = section.classList.toggle("open");
        toggleBtn.classList.toggle("open", isOpen);
      });
      const calcHeaders = isBuilding ? [["\u63A8\u5B9A\u576A\u5358\u4FA1(\u4E07\u5186)", "tsubo_price"], ["\u4E00\u7A2E\u5358\u4FA1(\u4E07\u5186)", "ikishu_price"], ["\u63A8\u5B9A\u571F\u5730\u4FA1\u683C", "estimated_land_price"], ["\u63A8\u5B9A\u5EFA\u7269\u6B8B\u4FA1", "building_value"]] : [["\u576A\u5358\u4FA1(\u4E07\u5186)", "tsubo_price"], ["\u4E00\u7A2E\u5358\u4FA1(\u4E07\u5186)", "ikishu_price"]];
      const rawColumns = [];
      const knownKeys = {};
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
      const wrap = createSafeElement("div");
      wrap.className = "table-wrap";
      wrap.style.marginTop = "12px";
      const table = createSafeElement("table");
      const thead = createSafeElement("thead");
      const headerRow = createSafeElement("tr");
      for (const [label] of calcHeaders) {
        const th = createSafeElement("th", label);
        th.style.background = "var(--gold-pale)";
        th.style.color = "var(--terracotta)";
        headerRow.appendChild(th);
      }
      for (const [, label] of rawColumns) {
        headerRow.appendChild(createSafeElement("th", label));
      }
      thead.appendChild(headerRow);
      table.appendChild(thead);
      const tbody = createSafeElement("tbody");
      const sorted = [...details].sort((a, b) => b.tsubo_price - a.tsubo_price);
      for (const d of sorted) {
        const raw = d.raw || {};
        const row = createSafeElement("tr");
        const dRecord = d;
        for (const [, field] of calcHeaders) {
          let val;
          if (field === "tsubo_price" || field === "ikishu_price") {
            const v = dRecord[field];
            val = v != null ? formatManYen(v) : "-";
          } else if (field === "estimated_land_price" || field === "building_value") {
            val = formatPrice(dRecord[field]);
          } else {
            const v = dRecord[field];
            val = v != null ? String(v) : "-";
          }
          const td = createSafeElement("td", val);
          td.style.background = "var(--gold-pale)";
          row.appendChild(td);
        }
        for (const [rawKey] of rawColumns) {
          const rawVal = raw[rawKey];
          let cellText;
          if (rawKey === "TradePrice") {
            cellText = formatPrice(rawVal);
          } else if (rawVal == null || rawVal === "") {
            cellText = "-";
          } else {
            cellText = String(rawVal);
          }
          row.appendChild(createSafeElement("td", cellText));
        }
        tbody.appendChild(row);
      }
      table.appendChild(tbody);
      wrap.appendChild(table);
      section.appendChild(wrap);
      container.appendChild(toggleBtn);
      container.appendChild(section);
    }
    function renderSummary(result) {
      resultSummary.textContent = "";
      const r = result;
      const h3 = createSafeElement("h3", r.scopeLabel || r.prefecture + r.municipality + r.district_name + " \u306E\u76F8\u5834");
      resultSummary.appendChild(h3);
      const grid = createSafeElement("div");
      grid.className = "summary-grid";
      const items = [
        { label: "\u691C\u7D22\u3057\u305F\u5E74", value: r.years.join(", "), unit: "" },
        { label: "\u5BFE\u8C61\u30A8\u30EA\u30A2\u306E\u96C6\u8A08\u5185\u8A33", value: r.coverage, unit: "" },
        { label: "\u5BFE\u8C61\u5730\u533A\u306E\u53D6\u5F15\u4EF6\u6570", value: String(r.filtered_records), unit: "\u4EF6" }
      ];
      const zoneCat = zoningCategorySelect.value;
      if (zoneCat) {
        const zoneLabel = selectedZoningTypes.length > 0 ? selectedZoningTypes.join(", ") : zoneCat;
        items.push({ label: "\u7528\u9014\u5730\u57DF\u30D5\u30A3\u30EB\u30BF", value: zoneLabel, unit: "" });
      }
      const landMedian = r.land_only.overall.tsubo_median;
      if (landMedian != null) {
        items.push({ label: "\u576A\u5358\u4FA1\uFF08\u4E2D\u592E\u5024\uFF09", value: formatManYen(landMedian), unit: "\u4E07\u5186" });
      }
      const bldMedian = r.building_land.overall.tsubo_median;
      if (bldMedian != null) {
        items.push({ label: "\u63A8\u5B9A\u576A\u5358\u4FA1\uFF08\u4E2D\u592E\u5024\uFF09", value: formatManYen(bldMedian), unit: "\u4E07\u5186" });
      }
      for (const it of items) {
        const item = createSafeElement("div");
        item.className = "summary-item";
        const lbl = createSafeElement("div", it.label);
        lbl.className = "summary-label";
        const val = createSafeElement("div");
        val.className = "summary-value";
        val.textContent = it.value;
        if (it.unit) {
          const unitSpan = createSafeElement("span", " " + it.unit);
          unitSpan.className = "summary-unit";
          val.appendChild(unitSpan);
        }
        item.appendChild(lbl);
        item.appendChild(val);
        grid.appendChild(item);
      }
      resultSummary.appendChild(grid);
    }
    function renderCitywideRef(container, citywideByDistrict, citywideOverall, isBuilding, municipalityName) {
      const ref = createSafeElement("div");
      ref.className = "citywide-ref";
      const title = createSafeElement("div", municipalityName + "\u5168\u4F53\u306E\u540C\u4E00\u7528\u9014\u5730\u57DF\u30C7\u30FC\u30BF\uFF08\u53C2\u8003\uFF09");
      title.className = "ref-title";
      ref.appendChild(title);
      if (citywideOverall.count === 0) {
        ref.appendChild(createSafeElement("p", "\u8A72\u5F53\u30C7\u30FC\u30BF\u304C\u3042\u308A\u307E\u305B\u3093"));
        container.appendChild(ref);
        return;
      }
      const wrap = createSafeElement("div");
      wrap.className = "table-wrap";
      const table = createSafeElement("table");
      const thead = createSafeElement("thead");
      const headerRow = createSafeElement("tr");
      const headers = ["\u7528\u9014\u5730\u57DF", "\u4EF6\u6570", isBuilding ? "\u63A8\u5B9A\u576A\u5358\u4FA1(\u4E07\u5186)" : "\u576A\u5358\u4FA1(\u4E07\u5186)"];
      for (const h of headers) {
        headerRow.appendChild(createSafeElement("th", h));
      }
      thead.appendChild(headerRow);
      table.appendChild(thead);
      const tbody = createSafeElement("tbody");
      for (const district of Object.keys(citywideByDistrict)) {
        const stats = citywideByDistrict[district];
        const row = createSafeElement("tr");
        row.appendChild(createSafeElement("td", district));
        row.appendChild(createSafeElement("td", stats.count + "\u4EF6"));
        row.appendChild(createSafeElement(
          "td",
          formatManYen(stats.tsubo_min) + "\u301C" + formatManYen(stats.tsubo_max) + "\uFF08\u4E2D\u592E\u5024 " + formatManYen(stats.tsubo_median) + "\uFF09"
        ));
        tbody.appendChild(row);
      }
      table.appendChild(tbody);
      wrap.appendChild(table);
      ref.appendChild(wrap);
      const note = createSafeElement(
        "div",
        "\u4E0D\u52D5\u7523\u9451\u5B9A\u8A55\u4FA1\u57FA\u6E96\u306E\u300C\u540C\u4E00\u9700\u7D66\u570F\u5185\u306E\u985E\u4F3C\u5730\u57DF\u300D\u306B\u76F8\u5F53\u3059\u308B\u53C2\u8003\u5024\u3067\u3059\u3002\u5730\u57DF\u8981\u56E0\uFF08\u99C5\u8DDD\u96E2\u30FB\u5468\u8FBA\u74B0\u5883\u7B49\uFF09\u306E\u88DC\u6B63\u306F\u884C\u3063\u3066\u3044\u306A\u3044\u305F\u3081\u3001\u3042\u304F\u307E\u3067\u76EE\u5B89\u3068\u3057\u3066\u3054\u5229\u7528\u304F\u3060\u3055\u3044\u3002"
      );
      note.className = "ref-note";
      ref.appendChild(note);
      container.appendChild(ref);
    }
    function renderStatsTable(container, byUseDistrict, overall, isBuilding, details, citywideData, municipalityName) {
      var _a, _b;
      container.textContent = "";
      const count = overall.count;
      const conf = getConfidence(count);
      const badge = createSafeElement("span", conf.label);
      badge.className = "confidence-badge " + conf.cls;
      container.appendChild(badge);
      if (conf.note) {
        const confNote = createSafeElement("div", conf.note);
        confNote.className = "data-warning";
        confNote.style.marginTop = "8px";
        container.appendChild(confNote);
      }
      if (count === 0) {
        container.appendChild(createSafeElement("p", "\u8A72\u5F53\u30C7\u30FC\u30BF\u304C\u3042\u308A\u307E\u305B\u3093"));
        if (citywideData && municipalityName) {
          renderCitywideRef(container, citywideData.by_use_district, citywideData.overall, isBuilding, municipalityName);
        }
        return;
      }
      const wrap = createSafeElement("div");
      wrap.className = "table-wrap";
      const table = createSafeElement("table");
      const thead = createSafeElement("thead");
      const headerRow = createSafeElement("tr");
      const headers = ["\u7528\u9014\u5730\u57DF", "\u4EF6\u6570", isBuilding ? "\u63A8\u5B9A\u576A\u5358\u4FA1(\u4E07\u5186)" : "\u576A\u5358\u4FA1(\u4E07\u5186)", "\u4E00\u7A2E\u5358\u4FA1(\u4E07\u5186)"];
      for (const h of headers) {
        headerRow.appendChild(createSafeElement("th", h));
      }
      thead.appendChild(headerRow);
      table.appendChild(thead);
      const tbody = createSafeElement("tbody");
      for (const district of Object.keys(byUseDistrict)) {
        const stats = byUseDistrict[district];
        const row = createSafeElement("tr");
        row.appendChild(createSafeElement("td", district));
        row.appendChild(createSafeElement("td", stats.count + "\u4EF6"));
        row.appendChild(createSafeElement(
          "td",
          formatManYen(stats.tsubo_min) + "\u301C" + formatManYen(stats.tsubo_max) + "\uFF08\u4E2D\u592E\u5024 " + formatManYen(stats.tsubo_median) + "\uFF09"
        ));
        let ikishu = "-";
        if (stats.ikishu_median != null) {
          ikishu = formatManYen((_a = stats.ikishu_min) != null ? _a : null) + "\u301C" + formatManYen((_b = stats.ikishu_max) != null ? _b : null) + "\uFF08\u4E2D\u592E\u5024 " + formatManYen(stats.ikishu_median) + "\uFF09";
        }
        row.appendChild(createSafeElement("td", ikishu));
        tbody.appendChild(row);
      }
      table.appendChild(tbody);
      wrap.appendChild(table);
      container.appendChild(wrap);
      const noteEl = createSafeElement("p", "\u5168\u4F53: " + (isBuilding ? "\u63A8\u5B9A\u576A\u5358\u4FA1" : "\u576A\u5358\u4FA1") + " \u4E2D\u592E\u5024 " + formatManYen(overall.tsubo_median) + "\u4E07\u5186 (" + overall.count + "\u4EF6)");
      noteEl.className = "data-note";
      container.appendChild(noteEl);
      if (details && details.length > 0) {
        renderDetailTable(container, details, isBuilding);
      }
      if (count < 20 && citywideData && municipalityName) {
        renderCitywideRef(container, citywideData.by_use_district, citywideData.overall, isBuilding, municipalityName);
      }
    }
    async function analyzeCore(apiKey, muniCd, municipality, scopeLabel, districtName) {
      const currentYear = (/* @__PURE__ */ new Date()).getFullYear();
      const years = [currentYear, currentYear - 1, currentYear - 2];
      const prefecture = getPrefName(muniCd);
      setLoadingText("\u53D6\u5F15\u30C7\u30FC\u30BF\u3092\u53D6\u5F97\u4E2D\uFF083\u5E74\u5206\uFF09...");
      const batches = await fetchTransactions(apiKey, muniCd, years);
      const rawData = batches.flatMap((batch) => {
        var _a;
        return (_a = batch.rows) != null ? _a : [];
      });
      setLoadingText("\u30C7\u30FC\u30BF\u3092\u5206\u6790\u4E2D...");
      let filtered;
      if (districtName) {
        filtered = filterByDistrict(rawData, prefecture, municipality, districtName);
      } else {
        filtered = rawData;
      }
      let landOnly = filterByZoning(removeOutliers(calcTsuboStats(filtered)));
      const landStats = summarizeByUseDistrict(landOnly);
      const allLandStats = summarizeStats(landOnly);
      let buildingLand = filterByZoning(removeOutliers(calcBuildingLandStats(filtered)));
      const buildingStats = summarizeByUseDistrict(buildingLand);
      const allBuildingStats = summarizeStats(buildingLand);
      const citywideLand = filterByZoning(removeOutliers(calcTsuboStats(rawData)));
      const citywideLandStats = summarizeByUseDistrict(citywideLand);
      const citywideLandOverall = summarizeStats(citywideLand);
      const citywideBuilding = filterByZoning(removeOutliers(calcBuildingLandStats(rawData)));
      const citywideBuildingStats = summarizeByUseDistrict(citywideBuilding);
      const citywideBuildingOverall = summarizeStats(citywideBuilding);
      const landRows = new Set(landOnly.map((row) => row.raw));
      const buildingRows = new Set(buildingLand.map((row) => row.raw));
      const coverage = batches.map(({ year, rows }) => {
        if (rows === null) return year + "\u5E74 \u672A\u53D6\u5F97\uFF08404\uFF09";
        if (!rows.length) return year + "\u5E74 \u5E02\u533A\u753A\u6751\u306E\u53D6\u5F150\u4EF6";
        return year + "\u5E74 \u571F\u5730\u306E\u307F" + rows.filter((row) => landRows.has(row)).length + "\u4EF6\u30FB\u5EFA\u7269\u8FBC\u307F" + rows.filter((row) => buildingRows.has(row)).length + "\u4EF6";
      }).join(" \uFF0F ");
      return {
        scopeLabel,
        prefecture,
        municipality,
        district_name: districtName || "",
        muni_cd: muniCd,
        years,
        coverage,
        total_records: rawData.length,
        filtered_records: filtered.length,
        land_only: {
          count: landOnly.length,
          by_use_district: landStats,
          overall: allLandStats,
          details: landOnly
        },
        building_land: {
          count: buildingLand.length,
          by_use_district: buildingStats,
          overall: allBuildingStats,
          details: buildingLand
        },
        citywide: {
          land_only: { count: citywideLand.length, by_use_district: citywideLandStats, overall: citywideLandOverall },
          building_land: { count: citywideBuilding.length, by_use_district: citywideBuildingStats, overall: citywideBuildingOverall }
        }
      };
    }
    async function analyzeByAddress(apiKey, address) {
      setLoadingText("\u4F4F\u6240\u3092\u89E3\u6790\u4E2D...");
      const coords = await geocode(address);
      setLoadingText("\u5E02\u533A\u753A\u6751\u30B3\u30FC\u30C9\u3092\u53D6\u5F97\u4E2D...");
      const geo = await reverseGeocode(coords.lat, coords.lon);
      const prefecture = getPrefName(geo.muniCd);
      const districtName = getDistrictName(geo.lv01Nm);
      setLoadingText("\u5E02\u533A\u753A\u6751\u540D\u3092\u53D6\u5F97\u4E2D...");
      const municipality = await getCityName(apiKey, geo.muniCd);
      if (!municipality) throw new Error("\u5E02\u533A\u753A\u6751\u540D\u306E\u53D6\u5F97\u306B\u5931\u6557\u3057\u307E\u3057\u305F");
      const scopeLabel = prefecture + municipality + districtName + " \u306E\u76F8\u5834";
      return analyzeCore(apiKey, geo.muniCd, municipality, scopeLabel, districtName);
    }
    async function analyzeByStation(apiKey, station) {
      setLoadingText("\u5E02\u533A\u753A\u6751\u540D\u3092\u53D6\u5F97\u4E2D...");
      const municipality = await getCityName(apiKey, station.muni);
      if (!municipality) throw new Error("\u5E02\u533A\u753A\u6751\u540D\u306E\u53D6\u5F97\u306B\u5931\u6557\u3057\u307E\u3057\u305F");
      const prefName = getPrefName(station.muni);
      const scopeLabel = station.name + "\u99C5\u5468\u8FBA\uFF08" + prefName + municipality + "\u5168\u4F53\uFF09\u306E\u76F8\u5834";
      return analyzeCore(apiKey, station.muni, municipality, scopeLabel, null);
    }
    analyzeBtn.addEventListener("click", async function() {
      const apiKey = getApiKey();
      if (!apiKey) return;
      if (searchMode === "address") {
        const address = addressInput.value.trim();
        if (!address) return;
      } else {
        if (!selectedStation) {
          const errCard = document.getElementById("searchCard");
          if (errCard) {
            const existing = errCard.querySelector(".status");
            if (existing) existing.remove();
            const errEl = createSafeElement("div", "\u99C5\u3092\u5019\u88DC\u304B\u3089\u9078\u629E\u3057\u3066\u304F\u3060\u3055\u3044");
            errEl.className = "status error";
            errCard.appendChild(errEl);
            setTimeout(function() {
              errEl.remove();
            }, 5e3);
          }
          return;
        }
      }
      analyzeBtn.disabled = true;
      loading.className = "loading active";
      resultsEl.className = "results";
      try {
        let result;
        if (searchMode === "address") {
          result = await analyzeByAddress(apiKey, addressInput.value.trim());
        } else {
          result = await analyzeByStation(apiKey, selectedStation);
        }
        renderSummary(result);
        const lo = result.land_only;
        const bl = result.building_land;
        const cw = result.citywide;
        renderStatsTable(landOnlyContent, lo.by_use_district, lo.overall, false, lo.details, cw.land_only, result.municipality);
        renderStatsTable(buildingLandContent, bl.by_use_district, bl.overall, true, bl.details, cw.building_land, result.municipality);
        loading.className = "loading";
        resultsEl.className = "results active";
        resultsEl.scrollIntoView({ behavior: "smooth", block: "start" });
      } catch (e) {
        loading.className = "loading";
        const errCard = document.getElementById("searchCard");
        if (errCard) {
          const existing = errCard.querySelector(".status");
          if (existing) existing.remove();
          const errEl = createSafeElement("div", e.message || "\u5206\u6790\u4E2D\u306B\u30A8\u30E9\u30FC\u304C\u767A\u751F\u3057\u307E\u3057\u305F");
          errEl.className = "status error";
          errCard.appendChild(errEl);
          setTimeout(function() {
            errEl.remove();
          }, 8e3);
        }
      }
      analyzeBtn.disabled = false;
    });
    addressInput.addEventListener("keydown", function(e) {
      if (e.key === "Enter" && !analyzeBtn.disabled) {
        analyzeBtn.click();
      }
    });
  }
  (function autoInit() {
    if (typeof document === "undefined") return;
    if (!document.getElementById("analyzeBtn")) return;
    init();
  })();
})();
