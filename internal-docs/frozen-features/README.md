# 凍結機能アーカイブ（Frozen Features Archive）

本ディレクトリは、**2026-11-22** 時点でアプリ本体から無効化・排除（凍結）した機能について、将来的に再導入（解凍）する際にそのまま参照・復元できるよう、アーキテクチャ設計・連携仕様・元コードを保管するためのアーカイブです。

> [!NOTE]
> `internal-docs/` 配下は `tsconfig.json` (`exclude`)、`eslint.config.js` (`ignores`)、`.easignore` により型チェック・Lint・EASバンドル対象から除外されています。

---

## 凍結対象機能一覧

| 機能名 | 概要 | 設計書 |
| :--- | :--- | :--- |
| **AIコーチ（AIパーソナルトレーナー）** | タブチャット画面、ワークアウト中/完了後/履歴からのコンテキスト連携相談、トークン利用枠管理、Cloudflare Worker `/api/chat` 連携 | [ai-coach-architecture.md](./ai-coach-architecture.md) |
| **AI音声入力アシスタント（音声AI / AIコンパニオン）** | WebView + Aqua Voice 文字起こし + Gemini 構造化解析による音声一括記録、パーソナライズ記憶、ホームカード、Androidウィジェット連携 | [ai-voice-assistant-architecture.md](./ai-voice-assistant-architecture.md) |

---

## 保管されている関連資産

### 1. アプリ本体から退避した元コード (`archived-code/`)
- [app/(tabs)/coach.tsx](./archived-code/app/(tabs)/coach.tsx) — AIコーチチャット画面本体
- [app/lifelog/voice-assistant.tsx](./archived-code/app/lifelog/voice-assistant.tsx) — 音声AIアシスタント WebView 画面（アプリ側は現在トップ `/` への安全リダイレクトのみ維持）
- [app/settings/ai-memory.tsx](./archived-code/app/settings/ai-memory.tsx) — AI残高＆パーソナライズ記憶確認・編集画面
- [src/components/home/VoiceAiCard.tsx](./archived-code/src/components/home/VoiceAiCard.tsx) — ダッシュボード用音声AIカード
- [components/profile/AiCoachSection.tsx](./archived-code/components/profile/AiCoachSection.tsx) — 月間AI利用枠残高ゲージUI
- [src/services/aiCoachService.ts](./archived-code/src/services/aiCoachService.ts) — AIコーチ通信＆コンテキスト構築サービス（※栄養AI関連関数は `src/services/nutritionAiService.ts` へ分離済み）
- [src/services/aiCompanionSyncService.ts](./archived-code/src/services/aiCompanionSyncService.ts) — WebView `SYNC_DATA` 受信＆SQLite保存サービス
- [src/config/aiConfig.ts](./archived-code/src/config/aiConfig.ts) — `AI_CONFIG.status` 緊急スイッチ設定

### 2. プロジェクト内にそのまま残しているバックエンド／Web資産
- [ai-companion-web/](../../ai-companion-web/) — 音声AIアシスタント用 Web フロントエンド（React + Vite）および Cloudflare Worker (`src/worker.ts`)
- [scripts/cloudflare-worker/](../../scripts/cloudflare-worker/) — Gemini / Gemma 4 / DeepSeek 用プロキシ Worker (`cloudflare-worker-proxy.js`)
  ※ 栄養AI解析 (`/api/nutrition`, `/api/nutrition-image`, オートファジー提案 `/api/chat`) および共通Googleアカウント同期 (`/api/account/sync`) で引き続き稼働中。

---

## 凍結中も維持されている周辺機能（副作用防止）
- **栄養AI解析（`src/services/nutritionAiService.ts`）**: 食事テキスト解析、食事写真/栄養成分ラベル解析、オートファジー絶食時間AI提案は AIコーチから切り離して継続利用可能。
- **Googleドライブ AI双方向同期（`src/services/googleDriveSyncService.ts`）**: 外部AIエージェント連携機能として継続維持。内部互換のため `settingsStore.ts` の `aiCompanionMemory`（DBキー `ai_companion_memory`）と `aiTokensBalance`（DBキー `ai_tokens_balance`）はストア・DB・同期ペイロード上で保持している。

---

## 再導入（解凍）時の共通チェックリスト
1. **アーカイブコードの復元**: `archived-code/` 配下の該当ファイルを元のパスへ戻す（`voice-assistant.tsx` はリダイレクト実装を上書き）。
2. **栄養AIサービスとの重複解消**: 再導入時は `aiCoachService.ts` 内の栄養関連関数と `src/services/nutritionAiService.ts` が重複しないよう、AIコーチ専用関数のみに戻すか `nutritionAiService.ts` へ一本化する。
3. **ナビゲーション・機能一覧の復帰**:
   - タブ復帰: `app/(tabs)/_layout.tsx` に `coach` タブを追加
   - 機能ID復帰: `settingsStore.ts` の `FeatureId`、`_layout.tsx` の `ALL_FEATURES`、`featureUnlockConstants.ts`、`useFeatureSwipe.ts`、`app/index.tsx`、`app/settings/feature-management.tsx` に `'voice_ai'` を復元
   - ウィジェット・権限復帰: `app.json` に `RECORD_AUDIO` / `MODIFY_AUDIO_SETTINGS` を戻し、`QuickLauncherWidget.kt` / `widget_quick_launcher.xml` / `widget-launcher.tsx` を調整（`app.json` やウィジェット変更後は `npx expo prebuild --clean --platform android` 等のネイティブ再ビルドが必要）
4. **文言・テスト**: `ja.json` / `en.json`、Paywall/AdBanner/PointBadge 表記、`docs/privacy-policy.html`、`__tests__/featureUnlock.test.ts` を更新し、`npx tsc --noEmit` と `npm test` を通過させる。
