# TreNote リリース品質改善引き継ぎドキュメント

本ドキュメントは、アプリ本番リリースに向けた監査レポートの改善項目のうち、**対応が完了した項目を除外した「残りの未完了タスク」** および **開発・検証・配信プロセス** を引き継ぐためのものです。

---

## 🚀 これまでに完了した対応（監査レポートより除外済み）

以下の項目は対応が完了し、`master` ブランチへマージのうえ、リモート (`origin/master`) へプッシュ済みです。

*   **C2 (Hooks 違反修正):** `coach.tsx` の早期リターン前にフックを定義し、メンテナンス表示時のクラッシュを解消。
*   **C3 (エラーハンドリング):** `coach.tsx` 内の AI 通信エラー時に loading ロックが発生する問題を `try/catch/finally` で解消。
*   **C4 (DB初期化レースコンディション):** `database.ts` のコネクションプール初期化 Promise を共有化し、リークと競合を防止。
*   **C5 (プライバシーポリシー):** AdMob 広告表示およびデータ収集について `privacy-policy.html` に日・英双方で明記。
*   **C6 (Sentry DSN 漏洩防止):** 動的設定ファイル `app.config.js` を導入し、Sentry DSN を環境変数から読み込むようにセキュア化。
*   **H1/H2 (DBトランザクション):** `saveWorkout` および `addRoutine` をトランザクション処理（`withTransactionAsync`）でラップし整合性を保証。
*   **H6 (バージョン不整合):** `app.json` と `package.json` のバージョン番号を `1.0.47` に統一。
*   **H7 (ScrollView 仮想化):** 履歴画面のワークアウト一覧を `FlatList` 仮想化リストへ移行し、メモリパフォーマンスを最適化。
*   **H9 (Swipe 動作 Hooks 違反):** `select-exercise.tsx` および `history.tsx` の `renderRightActions` レンダープロップ内での `useAnimatedStyle` 呼び出しを別コンポーネント `SwipeDeleteAction` へ分離。
*   **H10 (二重保存ガード):** `active-workout.tsx` に `isSaving` ガードを導入し、保存ボタン連打時のデータ重複やフリーズを防止。
*   **H12 (Error Boundary 導入):** アプリルートレイアウト (`app/_layout.tsx`) にカスタム `ErrorBoundary` を配置し、画面クラッシュ発生時にアプリが強制終了するのを防ぎ再試行 UI を表示。
*   **M7 (チャートデータメモ化):** 履歴画面および種目詳細画面のグラフデータ計算を `useMemo` でラップし、再計算コストを削除。また、データが1件のみの場合にグラフが消えていた表示閾値バグも同時に修正。
*   **M14 (チャット履歴上限):** `coach.tsx` 内のステートに保持するチャット履歴数を最新の 100 件に制限し、メモリ増大を防止。
*   **H4 (プロモコードハードコード修正):** クライアント側からプロモコード `'TREPREMIUM2026'` および期間設定のハードコードを削除し、Cloudflare Workers によるサーバーサイド検証（`/api/verify-promo`）へ移行。
*   **M1 (consumeAIToken TOCTOU レースコンディション修正):** トークンの消費判定と減算を SQL クエリ（UPDATE）レベルでアトミックに統合。API送信前にトークンを消費し、失敗時や例外時には `refundAIToken` を呼んで返却する設計に修正し、利用枠上限を超えた並行呼び出しを防止。

---

## 📌 残りのリリース改善項目（未完了タスク）

### 🔴 CRITICAL — リリースブロッカー（必須対応）

#### C1. AdMob 広告IDがすべてテスト用 / プレースホルダー
*   **対象ファイル:**
    *   [app.json](file:///c:/kintore/gym-tracker/app.json#L82-L83) — `androidAppId` / `iosAppId` が Google 公式テスト ID
    *   [adConfig.ts](file:///c:/kintore/gym-tracker/src/config/adConfig.ts#L14-L17) — 4つの広告ユニット ID がプレースホルダーのまま
*   **対応案:** ユーザーから本番用の AdMob アプリ ID・広告ユニット ID を入手し、置き換える。

---

### 🟠 HIGH — リリース品質に大きく影響する問題

#### H3. AI プロキシエンドポイントが認証なし
*   **対象ファイル:** [aiCoachService.ts](file:///c:/kintore/gym-tracker/src/services/aiCoachService.ts)
*   **問題:** `WORKER_URL` (Cloudflare Workers) が認証なしで呼び出せるため、逆コンパイルでエンドポイントを抽出されると誰でも無制限に API を叩けてしまう。
*   **対応案:** ヘッダーに共有シークレット（EAS Secret等で管理）または署名付き JWT を追加し、Worker 側で検証する。

#### H5. Sentry ソースマップの自動アップロード有効化
*   **対象ファイル:** [eas.json](file:///c:/kintore/gym-tracker/eas.json)
*   **問題:** 全ビルドプロファイルで `SENTRY_DISABLE_AUTO_UPLOAD: "true"` になっており、本番でのクラッシュログが難読化されたままで解析不能。
*   **対応案:** プロファイル `production` では `"false"` に変更し、Sentryで生成した `SENTRY_AUTH_TOKEN` を EAS Secrets に設定する。

#### H8. 巨大モノリシックコンポーネントの分割（長期的改善）
*   **対象ファイル:**
    *   `app/active-workout.tsx` (74KB / 1541行)
    *   `app/workout-completion.tsx` (53KB / 1552行)
    *   `app/(tabs)/profile.tsx` (64KB / 1412行)
    *   `app/exercise/[id].tsx` (50KB / 1105行)
*   **問題:** stateが1つ更新されるだけで、コンポーネント全体が再描画されパフォーマンスに影響が出る。
*   **対応案:** 機能ブロックごとに小さなサブコンポーネントへ分割し、`React.memo` や `useMemo` で再描画を制御する。

#### H11. 早期アダプター判定がデバイス時計に依存
*   **対象ファイル:** [database.ts](file:///c:/kintore/gym-tracker/src/db/database.ts#L550-L552)
*   **問題:** アリーアダプター判定に `Date.now()` を用いているため、端末の時計を2026年7月以前に巻き戻すだけで無期限プレミアムが取得できてしまう。
*   **対応案:** 初回判定時にネットワークタイム（サーバー時刻）を取得・参照してローカルに書き込むか、サーバーサイドでの検証を一度でも行うようにする。

---

### 🟡 MEDIUM — 品質向上のため推奨

| ID | 問題 | 対象ファイル | 対応案 |
|---|---|---|---|
| **M2** | タイマー終了時の通知全件キャンセル | [timer.ts](file:///c:/kintore/gym-tracker/src/utils/timer.ts#L30) | 全件キャンセルではなく、タイマー通知 ID を控えておき個別キャンセルする |
| **M3** | UUID 生成に `Math.random()` を使用 | [database.ts](file:///c:/kintore/gym-tracker/src/db/database.ts#L537-L543) | 暗号学的に安全な `expo-crypto` の `getRandomValues()` に切り替える |
| **M4** | `loadSettings` が 12個の大量の位置引数 | [workoutStore.ts](file:///c:/kintore/gym-tracker/src/store/workoutStore.ts#L120) | 引数をオブジェクト（オプションオブジェクトパターン）に変更する |
| **M5** | iOS App Store URL がプレースホルダー | [reviewService.ts](file:///c:/kintore/gym-tracker/src/services/reviewService.ts#L17) | 正式な Apple App ID に置き換える |
| **M6** | CSV インポートの曖昧マッチング | [csvImporter.ts](file:///c:/kintore/gym-tracker/src/utils/csvImporter.ts#L182-L183) | 完全一致を優先した上で、文字列の類似度スコア等を用いてマッチ度順に判定する |
| **M8** | ルートパラメータの parseInt にエラー検証なし | 各種 `[id].tsx` | `isNaN()` チェックを行い、不正な値の場合はエラー画面を表示する |
| **M9** | テストフレームワーク未導入 | `package.json` | `jest` および `react-native-testing-library` を導入する |
| **M10** | 開発者メニューが本番コードに存在 | `app/developer-menu.tsx` | リリースビルド時にはルート構造 (`_layout.tsx`) 自体から除外する |
| **M11** | KeyboardAvoidingView が padding 固定 | 各種入力画面 | iOS は `'padding'`、Android は `'height'` にプラットフォーム別分岐する |
| **M12** | プロモの月末日有効期限エッジケース | [database.ts](file:///c:/kintore/gym-tracker/src/db/database.ts#L901-L903) | 日付の単純足し算ではなく `date-fns` の `addMonths()` を使用する |
| **M13** | AdBanner のレンダリングエラー対策不足 | `AdBanner.tsx` | 広告ローディング失敗時のクラッシュを防ぐため AdBanner を Error Boundary で囲む |
| **M15** | スクリプトのハードコードパス | `scripts/inject_settings.js` | 廃止された旧フォルダへの参照パスを相対パスや実行時引数に修正する |
| **M16** | `isNewUser` ステートが更新されない | `app/(tabs)/index.tsx` | settings にあるフラグを直接参照し、スタイル選択完了で即時画面遷移させる |
| **M17** | IAP プレミアムレシート検証がクライアントのみ | `iapService.ts` | 不正購入を防ぐため、App Store / Google Play API を通じたサーバー検証を導入する |
| **M18** | タブレイアウトが settings 全体を購読 | `(tabs)/_layout.tsx` | hooks の購読範囲を絞る（セレクターを使用して必要なパラメータのみ購読） |

---

### 🟢 LOW — 将来的に対応

| ID | 問題 | 対応案 |
|---|---|---|
| **L1** | `database.ts` L115 にダブルセミコロン | `;` を1つ削除 |
| **L2** | DB クエリ結果等で `any` 型を多用 | 適切なインターフェースやジェネリクスを定義 |
| **L3** | IAP 購入トークンをコンソール出力 | 本番では `console.log` を削除またはマスク処理 |
| **L4** | YouTube 検索キーワードの末尾が日本語固定 | 言語設定に応じたキーワードを末尾に付与するように変更 (i18n) |
| **L5** | Markdown エクスポートのヘッダーが英語固定 | 言語設定に対応 (i18n) |
| **L6** | シェアテキストが日本語固定 | 言語設定に対応 (i18n) |
| **L7** | `SponsorBanner` がデッドコード | 不要であれば削除 |
| **L8** | `accessibilityLabel` 等の未設定 | スクリーンリーダー対応のため、インタラクティブ要素へラベルを付与 |
| **L9** | 完了アニメーションでの Animated View 数過多 | Confetti の生成パーティクル数を削減・チューニング |
| **L10** | `package.json` にエンジンの指定なし | `engines` フィールドを追加し Node.js バージョンを明記 |

---

## 🛠 開発・テスト・配信の手順

### 1. ローカル型チェック
コード変更を行った後は、必ず型エラーが発生していないかチェックしてください。
```bash
npx tsc --noEmit
```

### 2. EAS Update 配信手順 (Staging チャンネル)
実機での動作確認を依頼する際は、`staging` ブランチで検証用アップデートを配信します。

> [!IMPORTANT]
> **重要: Runtime Version と Client のバージョン一致について**
> 現在、実機検証用端末にインストールされている APK は **Runtime Version `1.0.40`** を参照しています。
> `app.json` の `"version"` に設定された文字列がそのまま Runtime Version として扱われるため、変更を行わないと Runtime Version が `1.0.47` になってしまい、実機端末にOTAが届きません。
>
> 以下の手順で一時的にバージョンを `1.0.40` に変更してビルド・配信し、配信完了後に `1.0.47` に戻す必要があります。

1.  `app.json` を開き、一時的に `"version": "1.0.40"` に変更する。
2.  以下のコマンドで EAS Update を実行する。
    ```bash
    npx eas update -p android --branch staging --message "タスク名 (for 1.0.40)"
    ```
3.  EAS Update 完了後、`app.json` の `"version"` を `"1.0.47"` に戻す。

### 3. Git ワークフロー
1.  作業は必ず `staging` ブランチで行います。
2.  **PowerShell の注意点**: PowerShell 環境下では `git add . && git commit` のように `&&` でコマンドを繋ぐと構文エラーが発生するため、個別に実行してください。
    ```bash
    git add .
    git commit -m "コミットメッセージ"
    git push origin staging
    ```
3.  実機での動作確認をユーザーに依頼し、承認（OK）を得られたら `master` にマージしてリモートへプッシュします。
    ```bash
    git checkout master
    git pull origin master
    git merge staging
    git push origin master
    git checkout staging
    ```
