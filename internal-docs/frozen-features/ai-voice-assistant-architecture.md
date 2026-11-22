# AI音声入力アシスタント（音声AI / AIコンパニオン）設計・仕組みアーカイブ

- **ステータス**: 凍結済み（2026-11-22 アプリ本体から排除）
- **アーカイブコード**:
  - [app/lifelog/voice-assistant.tsx](./archived-code/app/lifelog/voice-assistant.tsx)
  - [src/components/home/VoiceAiCard.tsx](./archived-code/src/components/home/VoiceAiCard.tsx)
  - [src/services/aiCompanionSyncService.ts](./archived-code/src/services/aiCompanionSyncService.ts)
  - [app/settings/ai-memory.tsx](./archived-code/app/settings/ai-memory.tsx)
  - [components/profile/AiCoachSection.tsx](./archived-code/components/profile/AiCoachSection.tsx)
- **Webフロント＆専用Cloudflare Worker**: [ai-companion-web/](../../ai-companion-web/)（デプロイ先: `https://ai-companion-web.toshi-diyil.workers.dev`）

---

## 1. 全体アーキテクチャ

Expo React Native の WebView で外部ホストされた `ai-companion-web`（Vite + React + Cloudflare Worker）を開き、録音 → Aqua Voice 文字起こし → Gemini 構造化JSON抽出 → `postMessage` でアプリ側へ返却 → SQLite 一括保存という構成で動作していた。

```text
[TreNote アプリ側]
  ├─ ダッシュボードカード: VoiceAiCard.tsx -> /lifelog/voice-assistant
  ├─ 画面本体: app/lifelog/voice-assistant.tsx
  │     ├─ Android マイク権限要求 (RECORD_AUDIO)
  │     ├─ 直近ワークアウト・水分・体重・テーマ・記憶メモリ (ai_companion_memory) 収集
  │     └─ WebView ロード前に window.__TRENOTE_CONTEXT__ を注入
  │
  ▼ (WebView: https://ai-companion-web.toshi-diyil.workers.dev)
[ai-companion-web フロントエンド] ai-companion-web/src/App.tsx & useAquaVoiceCompanion.ts
  ├─ マイク録音 (MediaRecorder + AudioContext 音量メーター + エコー/ノイズ抑制)
  ├─ 1. POST /api/transcribe (音声Blob + category)
  ├─ 2. POST /api/analyze (文字起こしテキスト + context)
  ├─ 3. Web Speech API (speechSynthesis) で応答読み上げ & 抽出アイテム編集UI
  └─ 4. 「TreNote アプリに保存」タップ -> window.ReactNativeWebView.postMessage({ type: 'SYNC_DATA', data })
          │
          ▼
[ai-companion-web Worker] ai-companion-web/src/worker.ts
  ├─ /api/transcribe -> Aqua Voice API (https://api.aquavoice.com/v1/audio/transcriptions)
  │     └─ モデルフォールバック: avalon-v1.5 -> avalon-v1 -> avalon -> whisper-1
  └─ /api/analyze    -> Google Gemini API (generateContent / JSON出力)
        └─ モデルフォールバック: gemini-3.7-flash -> 3.6-flash -> 3.5-flash -> 2.5-flash -> 2.5-flash-lite
          │
          ▼
[TreNote アプリ側同期] src/services/aiCompanionSyncService.ts
  └─ handleCompanionWebViewMessage() -> 確認Alert -> processAndSaveCompanionData(payload)
        ├─ waters       -> addWaterLog()
        ├─ meals        -> addMealLog()
        ├─ workouts     -> getExercises() / addCustomExercise() / saveWorkout() + ゲーミフィケーション反映
        ├─ dailyNotes   -> getBodyLogByDate() / insertBodyLog() / updateBodyLog() (memo追記)
        └─ memoryUpdates-> settingsStore.setAiCompanionMemory() (最大5000文字・行単位重複排除)
```

---

## 2. アプリ側注入コンテキスト & 権限仕様

### 2.1 `window.__TRENOTE_CONTEXT__` 構造（`ai-companion-web/src/types/index.ts`）
`injectedJavaScriptBeforeContentLoaded` で以下を注入：
- `lastWorkout`: 直近ワークアウトの要約文字列（例: `タイトル (YYYY/MM/DD) 計Xセット`）
- `currentWaterMl` / `waterGoalMl`: 当日水分摂取量・目標値
- `bodyWeight`: 設定体重
- `theme`: `'dark'` | `'pureBlack'`
- `date`: 当日日付（`YYYY/MM/DD`）
- `memory`: `settings.aiCompanionMemory`（パーソナライズ記憶全文）
- `category`: URLパラメータ `category`（`'all' | 'workout' | 'nutrition' | 'water' | 'note'`）

### 2.2 マイク権限と WebView 設定
- Android パーミッション（`app.json` から凍結時に除外済み）:
  - `android.permission.RECORD_AUDIO`
  - `android.permission.MODIFY_AUDIO_SETTINGS`
- `voice-assistant.tsx` 起動時に `PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.RECORD_AUDIO)` を実行。
- `<WebView>` Props:
  - `allowsInlineMediaPlayback={true}`
  - `mediaPlaybackRequiresUserAction={false}`
  - `mediaCapturePermissionGrantType="grant"`
  - `onPermissionRequest={(request) => request.grant(request.resources)}`

---

## 3. Worker 側音声認識・構造化解析仕様 (`ai-companion-web/src/worker.ts`)

### 3.1 `/api/transcribe` (Aqua Voice API)
- 環境変数: `AQUA_VOICE_API_KEY`
- カテゴリー別語彙ヒント（`CATEGORY_VOCABULARY_PROMPTS`: `workout`, `nutrition`, `water`, `note`, `all`）を `prompt` パラメータとして付与して送信。400/422 が返った場合は `prompt` なしでリトライ。
- 404 時に次モデルへフォールバック（`avalon-v1.5` → `avalon-v1` → `avalon` → `whisper-1`）。

### 3.2 `/api/analyze` (Gemini API)
- 環境変数: `GEMINI_API_KEY`
- 屋外マイク・Bluetoothイヤホンの誤認識補正ルール（例: 「電池プレス」→「ベンチプレス」、「救助キロ」→「90kg」）をプロンプトに含む。
- カテゴリー（`all` / `workout` / `nutrition` / `water` / `note`）に応じた抽出優先指示を付与。
- `generationConfig: { temperature: 0.2, responseMimeType: 'application/json' }` で以下を返却：
  - `reply`: 音声読み上げ＆チャット表示用の応答文
  - `workouts[]`: `{ exercise_name, weight_kg, reps, sets, notes }`
  - `waters[]`: `{ amount_ml, has_caffeine }`
  - `meals[]`: `{ meal_name, meal_type, calories, protein }`
  - `dailyNotes[]`: `{ summary, condition }`
  - `memoryUpdates[]`: 長期記憶に追記すべき文字列配列
- `/api/gemini-ws` も WebSocket プロキシ互換として残存。

---

## 4. パーソナライズ記憶 (`ai_companion_memory`) と互換性

- **DBキー**: `ai_companion_memory`（最大 5,000 文字、超過時は先頭の古い行からトリミング）
- **外部連携への流用**: 本設定値（`settings.aiCompanionMemory` / `setAiCompanionMemory`）は Googleドライブ AI双方向同期（`drivePayloadBuilder.ts`, `driveProposalApplier.ts`）および Obsidian 出力（`obsidianService.ts` -> `TreNote_AI_Profile.md`）でも参照されているため、アプリ内部ストア・DBキー自体は凍結後も維持されている。
- **画面の排除**: `app/settings/ai-memory.tsx` は削除し、プロファイル設定メニュー（`src/hooks/useProfile.ts`）からも削除した。

---

## 5. アプリ内の周辺統合箇所（凍結時に削除・正規化した箇所）

再導入時には以下の8箇所を合わせて復元する：

1. **FeatureId・初期化**: `src/store/settingsStore.ts` (`FeatureId`), `app/_layout.tsx` (`ALL_FEATURES`, `featureVisibility`), `app/index.tsx` (`VoiceAiCard`, `InitialFeatureSelectModal`), `app/settings/feature-management.tsx`
2. **機能アンロック・Pポイント**: `src/constants/featureUnlockConstants.ts` (`ALL_FEATURE_IDS`, `FEATURE_UNLOCK_METAS`, `POINT_COSTS`), `src/types/featureUnlock.ts`, `src/services/featureUnlockService.ts`
3. **横スワイプ遷移**: `src/hooks/useFeatureSwipe.ts` (`featureToPath`)
4. **ゲーミフィケーション**: `src/services/gamificationService.ts` (`recordGamificationFeatureActivity`)
5. **Android クイックランチャーウィジェット**:
   - `app/settings/widget-launcher.tsx` (`FEATURE_OPTIONS`, デフォルト7枠)
   - `native-assets/widget/QuickLauncherWidget.kt` (`slots`, `featureMap` の `"voice_ai" -> "gymtracker://lifelog/voice-assistant"`)
   - `native-assets/widget/widget_quick_launcher.xml` & `native-assets/widget/icons/ic_ql_voice_ai.xml`（アイコンSVG/VectorDrawable自体は `native-assets/widget/icons/` に残存）
6. **Expo ルート安全リダイレクト**: 凍結中は旧ウィジェットのタップによる 404 を防ぐため、`app/lifelog/voice-assistant.tsx` に `<Redirect href="/" />` のみ配置している。再導入時はここをアーカイブ版で上書きする。
7. **ネイティブ権限**: `app.json` の `expo.android.permissions` に `android.permission.RECORD_AUDIO` と `android.permission.MODIFY_AUDIO_SETTINGS` を戻し、ネイティブ再ビルド（`npx expo prebuild --clean --platform android` 以降）を行う。
8. **i18n・表記**: `ja.json` / `en.json`、`components/PointBadge.tsx` 等の案内文言を戻す。
