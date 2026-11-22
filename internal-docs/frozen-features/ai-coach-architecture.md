# AIコーチ（AIパーソナルトレーナー）設計・仕組みアーカイブ

- **ステータス**: 凍結済み（2026-11-22 アプリ本体から排除）
- **アーカイブコード**:
  - [app/(tabs)/coach.tsx](./archived-code/app/(tabs)/coach.tsx)
  - [src/services/aiCoachService.ts](./archived-code/src/services/aiCoachService.ts)
  - [src/config/aiConfig.ts](./archived-code/src/config/aiConfig.ts)
  - [components/profile/AiCoachSection.tsx](./archived-code/components/profile/AiCoachSection.tsx)
  - [app/settings/ai-memory.tsx](./archived-code/app/settings/ai-memory.tsx)
- **バックエンドプロキシ**: [scripts/cloudflare-worker/cloudflare-worker-proxy.js](../../scripts/cloudflare-worker/cloudflare-worker-proxy.js)

---

## 1. 全体アーキテクチャ

```text
[UIエントリーポイント]
  ├─ ボトムタブ: app/(tabs)/coach.tsx (チャットUI・クイックチップ・モード切替)
  ├─ トレ中(全体): app/active-workout.tsx -> useActiveWorkout.handleAICoachWorkout()
  ├─ トレ中(種目別): ActiveExerciseCard.tsx -> useActiveWorkout.handleAICoachExercise(ex)
  ├─ 履歴一覧: app/(tabs)/history.tsx -> HistoryWorkoutsTab.tsx -> handleAICoachHistory()
  ├─ 種目詳細: app/exercise/[id].tsx -> handleAICoachExerciseDetail()
  └─ トレ完了画面: app/workout-completion.tsx -> useWorkoutCompletion.handleAskAICoach()
          │
          ▼ (consumeAIToken() でDB残高をアトミック減算)
[コンテキスト構築 & 通信] src/services/aiCoachService.ts
  ├─ compileFullUserContextForAI(customContext)
  │     ├─ getRecentWorkoutSummaryForAI(3)       (workoutRepository.ts)
  │     ├─ getMealLogsByDate(today)              (nutritionRepository.ts)
  │     ├─ getWaterLogs(today) / getWaterGoal()  (lifelogRepository.ts)
  │     └─ getTimeLogs(today)                    (lifelogRepository.ts)
  └─ POST https://gym-tracker-ai-proxy.toshi-diyil.workers.dev/api/chat
          │  (失敗時は refundAIToken() で自動返金)
          ▼
[Cloudflare Worker] scripts/cloudflare-worker/cloudflare-worker-proxy.js
  ├─ レート制限: AI_LIMIT_KV で全体 1,400 req/day 上限
  ├─ ガードレール: フィットネス外キーワード（不動産・投資・ギャンブル等）をブロック
  └─ モデル切替 & フォールバック: Gemini / Gemma 4 / DeepSeek
```

---

## 2. コンテキスト生成とプロンプト連携

### 2.1 `compileFullUserContextForAI(customContext?)`
送信時に毎回アプリ内 SQLite から以下の当日・直近データを自動集計し、テキストブロックとして `workout_history` フィールドで Worker に渡す。

1. **直近の筋トレ実績（最大3セッション）**: `getRecentWorkoutSummaryForAI(3)`（`src/db/repositories/workoutRepository.ts` に残存）を使用。
2. **本日の食事ログ**: `getMealLogsByDate(today)` から合計カロリー・PFC（P/F/C）・品目名一覧を集計。
3. **本日のライフログ**: 水分摂取量・目標値（`getWaterLogs` / `getWaterGoal`）、24時間管理の活動別合計時間（`getTimeLogs`）。
4. **リアルタイム画面コンテキスト（任意）**: `customContext` が渡された場合、先頭に `【リアルタイムアクティビティデータ】` として連結する。

### 2.2 各エントリーポイントからの遷移パラメータ
`router.push({ pathname: '/(tabs)/coach', params: { contextPrompt, prefillMessage, title } })` で以下を渡していた：
- **ワークアウト全体（`handleAICoachWorkout`）**: 実施中の全種目・セット（重量/回数/完了フラグ/片側 L・R/スタンス・バリエーション/RPE）・全体メモを整形。
- **種目別（`handleAICoachExercise`）**: 対象種目のメモと全セット数値を整形。
- **過去履歴（`handleAICoachHistory`）**: `loadFullWorkoutData(workoutId)` から日付・タイトル・種目メモ・セット一覧を整形。
- **種目詳細（`handleAICoachExerciseDetail`）**: `app/exercise/[id].tsx` にて対象種目の全履歴 `ensureFullHistory()`（分類・器具・全セット数値）を整形して `/(tabs)/coach` へ遷移。
- **ワークアウト完了画面（`handleAskAICoach`）**: チャット画面へ遷移せず、`sendMessageToAICoach` を直接呼び出して 1〜2文（100文字以内）の称賛・応援コメントを完了カードに表示。

### 2.3 クイック / 思考モードとデバッグUI
- **チャットモード (`settings.aiChatMode`: `'quick'` | `'thinking'`)**:
  - `quick`: タイムアウト 28,000ms（Gemma選択時は +25,000ms）
  - `thinking`: タイムアウト 45,000ms（Gemma選択時は +25,000ms）
- **モデル選択 (`settings.preferredAiModel`)**:
  - `'gemini'` | `'gemma-31b'` | `'gemma-26b'` | `'deepseek'`（本番チャンネルでは `_layout.tsx` で `'gemini'` に固定）
- **デバッグコンテキスト表示 (`settings.enableAiDebugContext`)**:
  - `Updates.channel !== 'production'` 時、`coach.tsx` 上部に送信された `compiledContext` 全文のアコーディオンを表示。`developer-menu.tsx` から ON/OFF 可能だった。

---

## 3. 利用枠（トークン）管理とプラン連動

`src/db/repositories/settingsRepository.ts` に実装（アカウント同期互換のためDB関連関数自体は残存）：

- **DBキー**:
  - `ai_tokens_balance`: 残り回数（初期値 `'20'`）
  - `ai_tokens_last_reset`: 最終リセット日時 ISO 文字列
- **上限ルール (`getMaxAITokens`)**:
  - `isEarlyAdopter === true` または `isPremium === true` → **20回 / 月**
  - ベーシックプラン → **5回 / 月**
- **月次リセット (`getAITokensBalance`)**:
  - 年または月が変わっていた場合、`maxTokens` にリセットして DB 更新。
- **消費と返金**:
  - 送信前に `consumeAIToken()`（SQL `WHERE key = 'ai_tokens_balance' AND CAST(value AS INTEGER) > 0` で 1 減算）。
  - API 失敗または例外発生時に `refundAIToken()`（上限 `maxTokens` を超えない範囲で +1 復元）。

---

## 4. Cloudflare Worker (`/api/chat`) の仕様

`scripts/cloudflare-worker/cloudflare-worker-proxy.js` の `/api/chat` 分岐で処理：

- **システム指示**: 英語／日本語を `payload.language` または `Accept-Language` から判定。「セット記録が含まれている場合は『データが無い』とお断りせず具体的に提案する」ようプロンプト指定。
- **モデルチェーン（Worker内）**:
  - `thinking` 時: `gemini-3.5-flash` → `gemini-3.5-flash-lite` → `gemini-3.1-flash-lite`
  - `quick` 時: `gemini-3.5-flash-lite` → `gemini-3.1-flash-lite` → `gemini-flash-lite-latest`
  - `preferredModel` が `gemma-31b` / `gemma-26b` の場合は `gemma-4-31b-it` / `gemma-4-26b-a4b-it` を先頭に挿入。
  - `preferredModel === 'deepseek'` かつ `env.DEEPSEEK_API_KEY` ありの場合は `deepseek-v4-pro` を先行試行し、失敗時は Gemini へフォールバック。
- **認証ヘッダ**: クライアント側で `process.env.EXPO_PUBLIC_AI_PROXY_SECRET` が設定されている場合、`Authorization: Bearer ...` を付与。

---

## 5. 再導入（解凍）手順

1. `archived-code/` から以下のファイルを元の位置へ戻す：
   - `app/(tabs)/coach.tsx`
   - `src/config/aiConfig.ts`
   - `components/profile/AiCoachSection.tsx`
   - `app/settings/ai-memory.tsx`（音声AIと共用のため必要に応じて復元）
2. `src/services/aiCoachService.ts` を戻す際、栄養解析関数（`analyzeMealText`, `analyzeMealImage`, `analyzeAutophagyRecommendation`）は既に `src/services/nutritionAiService.ts` へ分離済みのため、重複を避けて AIコーチ専用関数（`compileFullUserContextForAI`, `sendMessageToAICoach`, `buildWorkoutCoachPrompt`, `AICoachResponse`）のみで構成する。
3. UI導線を再接続する：
   - `app/(tabs)/_layout.tsx` に `coach` タブスクリーンを追加
   - `app/active-workout.tsx`, `src/hooks/useActiveWorkout.ts`, `components/active-workout/ActiveExerciseCard.tsx` にワークアウト中／種目別ボタンを復元
   - `app/(tabs)/history.tsx`, `components/history/HistoryWorkoutsTab.tsx` に履歴AIコーチ送信ボタンを復元
   - `app/exercise/[id].tsx` に種目詳細ヘッダーの `handleAICoachExerciseDetail` ボタンを復元
   - `app/workout-completion.tsx`, `src/hooks/useWorkoutCompletion.ts`, `components/workout-completion/AchievementsSection.tsx` に完了後評価リクエストを復元
   - `src/hooks/useProfile.ts` に設定メニュー導線を復元
   - 必要に応じて `app/developer-menu.tsx` にコンテキストデバッグUIを復元
4. `src/i18n/locales/ja.json` / `en.json`、Paywall / AdBanner / PointBadge 文言、`docs/privacy-policy.html` を更新する。
