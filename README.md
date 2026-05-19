[README.md](https://github.com/user-attachments/files/28010314/README.md)
# 焼肉 黒耀 ｜ Brand Site

> 恵比寿の高級焼肉店「焼肉 黒耀」ブランドサイト（実装版）。
> 企画から実装まで一気通貫で制作した、ポートフォリオ提出用の制作物です。

---

## 🔗 Live Demo

| 種別 | URL |
|---|---|
| **公式サイト（本リポジトリ）** | https://hirotonozaki.github.io/yakiniku-kokuyou/ |
| 企画提案書 | https://hirotonozaki.github.io/yakiniku-kokuyou-proposal/ |

> 本サイトの設計意図・KPI・競合分析・情報設計の全プロセスは、企画提案書（全30ページ）に記載しています。

---

## Preview

![焼肉 黒耀 トップページのプレビュー](assets/images/preview-mockup.png)

---

## 制作意図

「実店舗の格を、画面の中でも保つ」ことを唯一の設計指針として組み立てました。

恵比寿の高級焼肉店は **接待・記念日・デート** 利用が中心で、ユーザーは常に「失敗できない夜」という文脈で店を選びます。料金や雰囲気が言葉で伝わるだけでは足りず、画面そのものが店の照明設計と同じ温度を持つ必要がある — これが本サイトの出発点です。

漆黒（#0A0805）と古金色（#C9A84C）のミニマルな配色、Cormorant Garamond × 游明朝の和洋ペアリング、写真を主役にした広い余白で、ブランド体験としての品格を担保しました。

---

## UI/UXで工夫した点

| # | 工夫 | 意図 |
|---|---|---|
| 1 | **2階層CTA設計**（ご予約 / コースを見る） | 検討段階の異なるユーザーを取りこぼさない |
| 2 | **空席カレンダー予約UI** | 一般的なフォームではなく「席選びの体験」として再設計 |
| 3 | **営業時間ステータス自動表示** | 現在時刻から「営業中／準備中」を動的判定 |
| 4 | **タブ式メニュー切替** | 桐・竹・松の3コースをスクロールせず比較可能 |
| 5 | **FAQアコーディオン** | 同時に1件のみ展開、ファーストビュー時は1件目を開いて認知性UP |
| 6 | **スクロール連動アニメ** | IntersectionObserverで軽量に。`prefers-reduced-motion` 対応 |
| 7 | **モバイル/デスクトップで導線最適化** | アクセス情報の表示優先度を切り替え |

---

## 使用技術

### Frontend
- **HTML5** — セマンティック構造、`aria-*` によるアクセシビリティ配慮
- **CSS3** — CSS変数によるデザイントークン一元管理、Flexbox / Grid、`prefers-reduced-motion` 対応
- **Vanilla JavaScript** — ES6+、フレームワーク非依存、IIFE構成

### Typography
- **Cormorant Garamond / DM Sans**（Google Fonts、`preconnect` で初期描画最適化）
- **游明朝**（システム搭載フォントスタック、ネットワーク不要で和文を高品質表示）

### Hosting
- **GitHub Pages** — SSL自動、CDN配信、ビルド不要

---

## 制作期間

約3週間（企画設計・デザイン・実装・改善含む）

---

## ディレクトリ構成

```
.
├── index.html              トップページ（コンセプト〜FAQまで1ページ完結）
├── reserve.html            予約ページ（カレンダー＋ステップフォーム）
├── css/
│   ├── style.css           共通スタイル（変数 → ベース → コンポーネント）
│   └── reserve.css         予約ページ専用スタイル
├── js/
│   ├── main.js             全UIロジック（10モジュール構成）
│   └── reserve.js          予約フロー専用ロジック
└── assets/
    └── images/             写真素材
```

---

## ローカル表示

```bash
git clone https://github.com/hirotonozaki/yakiniku-kokuyou.git
cd yakiniku-kokuyou
open index.html
```

ビルド不要のバニラ構成のため、`index.html` をブラウザで開けばそのまま動作します。

---

## 今後の改善案

- [ ] **予約データの実バックエンド連携**（現状はフロントエンドのみのモック）
- [ ] **構造化データ（JSON-LD）** の埋め込みによるリッチリザルト対応
- [ ] **Lighthouseスコアの完全最適化**（画像WebP化・Critical CSS抽出）
- [ ] **多言語対応**（英語・繁体字）— インバウンド需要への対応
- [ ] **A/Bテスト基盤** の導入によるCVR改善の継続的検証

---

## ライセンス

ポートフォリオ提出用の制作物として公開しています。
コードの引用・参考は自由ですが、原稿コピーや写真素材の再配布はご遠慮ください。

---

<sub>Designed & Developed by [@hirotonozaki](https://github.com/hirotonozaki)</sub>
