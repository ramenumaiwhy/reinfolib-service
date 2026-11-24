# 不動産相場チェッカー

住所を指定すると、国土交通省「不動産情報ライブラリ」の同じ地区の土地取引から、坪単価と一種単価の件数・最小値・中央値・最大値を調べられます。土地と建物を一括で取引した事例は、取引価格から推定建物残価を引き、別枠の参考値として表示します。

## 使い方

[不動産情報ライブラリのAPIキー](https://www.reinfolib.mlit.go.jp/api/request/)を用意し、次のどちらかで実行します。

- **Colab** — [ノートブックを開き](https://colab.research.google.com/github/ramenumaiwhy/reinfolib-service/blob/main/reinfolib_checker.ipynb)、設定セルに調べたい住所を入力します。すべてのセルを実行し、表示された入力欄にAPIキーを貼り付けます。
- **ブラウザ** — [ローカルで起動したWeb版](#開発)でAPIキーを検証し、住所または駅を指定します。駅を選ぶと、その駅がある市区町村の取引を集計します。

坪単価は土地1坪当たりの取引価格、一種単価は坪単価を指定容積率の倍率で割った値です。例えば200%なら坪単価を2で割ります。表示された対象地区・年・件数と併せて読んでください。

## 住所とAPIキーの扱い

住所検索では住所と座標を国土地理院に送ります。Colab版はキーを非表示で受け取り、国交省APIに直接問い合わせます。住所と結果は出力に残るので、ノートブックの共有前に設定セルの住所と実行結果を確認してください。

Web版はキーをブラウザに保存し、検証・検索時に画面と同じ配信元のCloudflare Worker経由で国交省APIへ送ります。保存したキーは画面から削除できます。

## 開発

Web版のソースは `src/app.ts`、配信用ファイルは `docs/app.js` です。以下はNode.js 26で確認した手順です。リポジトリのルートで実行します。

```bash
npm ci
npm run typecheck
npm test
npm run build
npm ci --prefix workers
npm run dev --prefix workers -- --local
```

ブラウザで `http://127.0.0.1:8787/app.html` を開きます。Python版のテストは `uv run --with pytest --with requests pytest -q tests` で実行できます。国土地理院との実通信を含み、国交省APIの応答にはテストデータを使います。

## 同じ取引データを使う作品

土地の相場をClaude Codeで質問するなら [reinfolib-skill](https://github.com/ramenumaiwhy/reinfolib-skill)、中古マンションの専有面積当たりの価格を比較するなら、このツールから派生した [mansion-checker](https://github.com/ramenumaiwhy/mansion-checker) を使えます。

## ライセンスと駅データ

コードはMIT。駅検索用の `docs/stations.json` は、国土交通省「国土数値情報（鉄道データ）令和6年度」を駅グループ単位にまとめ、市区町村コードを付与し、路線名と表示順を整えた加工データです。駅データの再利用にはCC BY 4.0を適用します。[原典（N02-24）](https://nlftp.mlit.go.jp/ksj/gml/datalist/KsjTmplt-N02-2024.html)・[利用条件（CC BY 4.0）](https://creativecommons.org/licenses/by/4.0/deed.ja)
