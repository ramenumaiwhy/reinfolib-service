# 不動産相場チェッカー

[![Open In Colab](https://colab.research.google.com/assets/colab-badge.svg)](https://colab.research.google.com/github/ramenumaiwhy/reinfolib-service/blob/main/reinfolib_checker.ipynb)

住所を入れるだけで、国交省の実際の取引データから坪単価・一種単価・建物残価推定を自動分析します。

## 必要なもの

- Google アカウント（Colab 実行用）
- [不動産情報ライブラリ API キー](https://www.reinfolib.mlit.go.jp/api/request/)（無料申請）

## 使い方

1. 上の「Open in Colab」バッジをクリック
2. API キーと住所を入力
3. 「ランタイム」→「すべてのセルを実行」

詳しい手順: [使い方ガイド](https://ramenumaiwhy.github.io/reinfolib-service/)

## 開発者向け

```bash
# テスト実行
uv run --with pytest --with requests pytest tests/ -v
```

## ライセンス

MIT
