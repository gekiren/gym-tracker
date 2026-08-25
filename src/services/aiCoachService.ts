import { recordAIDebugLog } from '../utils/debugLogStore';
import {
  getRecentWorkoutSummaryForAI,
  getMealLogsByDate,
  getWaterLogs,
  getWaterGoal,
  getTimeLogs,
  MealLog,
} from '../db/database';
import i18next from 'i18next';
import { useWorkoutStore } from '../store/workoutStore';
import { useSettingsStore } from '../store/settingsStore';

// Cloudflare Workers AI Proxy API Endpoint URL
const WORKER_URL = 'https://gym-tracker-ai-proxy.toshi-diyil.workers.dev/api/chat';

// 栄養解析エンドポイント
const NUTRITION_TEXT_URL = 'https://gym-tracker-ai-proxy.toshi-diyil.workers.dev/api/nutrition';
const NUTRITION_IMAGE_URL = 'https://gym-tracker-ai-proxy.toshi-diyil.workers.dev/api/nutrition-image';

// 栄養AI解析の返却型
export interface NutritionAIResult {
  mealName: string;
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
  sodium: number;
  fiber: number;
  advice?: string;
  isFood?: boolean;
}

export interface AICoachResponse {
  reply: string;
  success: boolean;
  errorType?: 'quota' | 'network' | 'unknown' | 'busy';
  compiledContext?: string;
}

/**
 * 筋トレ履歴＋食事(PFC)＋ライフログ（水分・時間管理）の総合コンテキストを自動構築する
 */
export const compileFullUserContextForAI = async (customContext?: string): Promise<string> => {
  const getTodayDateStr = () => new Date().toISOString().split('T')[0];
  const today = getTodayDateStr();

  let workoutContext = '';
  try {
    workoutContext = await getRecentWorkoutSummaryForAI(3);
  } catch (e) {
    workoutContext = '筋トレ履歴の取得に失敗しました。';
  }

  let nutritionContext = '';
  try {
    const mealLogs: MealLog[] = await getMealLogsByDate(today);
    if (mealLogs && mealLogs.length > 0) {
      let totalCal = 0;
      let totalP = 0;
      let totalF = 0;
      let totalC = 0;
      const mealNames = mealLogs.map((m: MealLog) => {
        totalCal += m.calories || 0;
        totalP += m.protein || 0;
        totalF += m.fat || 0;
        totalC += m.carbs || 0;
        return `${m.name}(${m.calories || 0}kcal)`;
      });
      nutritionContext = `【本日の食事ログ (合計 ${totalCal}kcal / P:${Math.round(totalP)}g F:${Math.round(totalF)}g C:${Math.round(totalC)}g)】\n- 食べたもの: ${mealNames.join(', ')}`;
    } else {
      nutritionContext = '【本日の食事ログ】\n- まだ本日の食事は記録されていません。';
    }
  } catch (e) {
    nutritionContext = '食事ログの取得に失敗しました。';
  }

  let lifelogContext = '';
  try {
    const waterLogs = await getWaterLogs(today);
    const waterGoal = await getWaterGoal();
    const totalWater = waterLogs.reduce((acc, curr) => acc + (curr.amount || 0), 0);

    const timeLogs = await getTimeLogs(today);
    let timeSummary = '';
    if (timeLogs && timeLogs.length > 0) {
      const summaryMap = new Map<string, number>();
      timeLogs.forEach(t => {
        const current = summaryMap.get(t.activity_name) || 0;
        summaryMap.set(t.activity_name, current + (t.duration_minutes || 0));
      });
      timeSummary = Array.from(summaryMap.entries())
        .map(([name, mins]) => `${name}:${Math.round((mins / 60) * 10) / 10}時間`)
        .join(', ');
    }

    lifelogContext = `【本日のライフログ】\n- 水分摂取: ${totalWater}ml / 目標${waterGoal}ml\n${timeSummary ? `- 時間管理: ${timeSummary}` : ''}`;
  } catch (e) {
    lifelogContext = 'ライフログの取得に失敗しました。';
  }

  let finalContext = `${workoutContext}\n\n${nutritionContext}\n\n${lifelogContext}`;

  if (customContext && customContext.trim()) {
    finalContext = `【リアルタイムアクティビティデータ】\n${customContext.trim()}\n\n${finalContext}`;
  }

  return finalContext;
};

/**
 * Sends a message to the AI Coach via the Cloudflare Workers Proxy, including compiled context.
 * 
 * @param message The user's query or the prefilled contextual prompt
 * @param customContext Optional specific context (e.g., active workout sets or exercise history)
 * @param userWeight Current body weight from settings
 * @param weightUnit Selected weight unit ('kg' or 'lbs')
 * @param aiMode Selected AI chat mode ('quick' or 'thinking')
 */
export const sendMessageToAICoach = async (
  message: string,
  customContext?: string,
  userWeight?: number | null,
  weightUnit?: string,
  aiMode: 'quick' | 'thinking' = 'quick'
): Promise<AICoachResponse> => {
  const preferredModel = useSettingsStore.getState().settings.preferredAiModel || 'gemini-3.5-flash-lite';
  const isGemmaSelected = preferredModel.toLowerCase().includes('gemma');
  
  const baseTimeout = aiMode === 'thinking' ? 45000 : 28000;
  const timeoutSeconds = isGemmaSelected ? baseTimeout + 25000 : baseTimeout;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutSeconds);

  try {
    // 1. 総合コンテキスト（筋トレ＋食事PFC＋ライフログ）を自動生成
    const fullContext = await compileFullUserContextForAI(customContext);

    console.log(`[AI Coach Service] Context length: ${fullContext.length} chars (hasCustomContext: ${Boolean(customContext)})`);

    const bodyWeightStr = userWeight ? `${userWeight} ${weightUnit}` : '未設定';
    const lang = i18next.language || 'ja';

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    const proxySecret = process.env.EXPO_PUBLIC_AI_PROXY_SECRET;
    if (proxySecret) {
      headers['Authorization'] = `Bearer ${proxySecret}`;
    }

    // 2. Make the secure POST request to Cloudflare Workers proxy
    const response = await fetch(WORKER_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        message,
        workout_history: fullContext,
        user_weight: bodyWeightStr,
        weight_unit: weightUnit || 'kg',
        language: lang,
        preferred_model: preferredModel,
        ai_mode: aiMode,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (response.status === 429) {
      return {
        reply: i18next.t('ui.coach.limit_reached_msg') || '今月の利用枠が残っていません。',
        success: false,
        errorType: 'quota',
        compiledContext: fullContext,
      };
    }

    if (!response.ok) {
      let errorMsg = `Server returned status: ${response.status}`;
      let isBusy = false;
      try {
        const errJson = await response.json();
        if (errJson && errJson.error) {
          errorMsg = errJson.error;
        }
        if (
          response.status === 503 ||
          (errJson && (errJson.status === 503 || errJson.status === 429 || errorMsg.includes('Status: 503') || errorMsg.includes('Status: 429')))
        ) {
          isBusy = true;
        }
      } catch (_) {}

      if (isBusy) {
        throw new Error('busy');
      }
      throw new Error(errorMsg);
    }

    const data = await response.json();
    
    if (data && data.reply) {
      return {
        reply: data.reply,
        success: true,
        compiledContext: fullContext,
      };
    } else {
      throw new Error('Invalid response structure from proxy');
    }
  } catch (err: any) {
    clearTimeout(timeoutId);
    console.error('Failed to communicate with AI Coach', err);
    
    if (err.name === 'AbortError') {
      const fallbackMsg = '接続タイムアウトが発生しました。通信環境の良い場所で再度お試しください。';
      const timeoutText = i18next.t('ui.coach.timeout_error', { defaultValue: fallbackMsg });
      return {
        reply: !timeoutText || timeoutText === 'ui.coach.timeout_error' ? fallbackMsg : timeoutText,
        success: false,
        errorType: 'network',
      };
    }

    if (err.message === 'busy') {
      return {
        reply: i18next.t('ui.coach.busy_error') || '現在AIサービスが非常に混雑しています。しばらく時間をおいてから再度お試しください。',
        success: false,
        errorType: 'busy',
      };
    }
    
    const detailMsg = err.message ? `\n詳細: ${err.message}` : '';
    return {
      reply: `${i18next.t('ui.coach.network_error') || 'ネットワークエラーが発生しました。接続を確認してください。'}${detailMsg}`,
      success: false,
      errorType: 'network',
    };
  }
};

/**
 * ワークアウトデータと心拍数・カロリーからAI Coach用のコンテキスト文字列をビルドする
 */
export const buildWorkoutCoachPrompt = (workoutData: {
  title?: string;
  durationMin?: number | null;
  calories?: number | null;
  avgHeartRate?: number | null;
  maxHeartRate?: number | null;
  exercises?: any[];
}): string => {
  let prompt = `【今回完了したワークアウト情報】\n`;
  if (workoutData.title) prompt += `タイトル: ${workoutData.title}\n`;
  if (workoutData.durationMin) prompt += `運動時間: ${workoutData.durationMin}分\n`;
  if (workoutData.calories) prompt += `消費カロリー: ${workoutData.calories} kcal\n`;
  if (workoutData.avgHeartRate) prompt += `平均心拍数: ${workoutData.avgHeartRate} bpm\n`;
  if (workoutData.maxHeartRate) prompt += `最高心拍数: ${workoutData.maxHeartRate} bpm\n`;
  return prompt;
};

// ─── 栄養解析 AI 関数 ────────────────────────────────────

/**
 * テキスト入力による食事栄養解析
 * @param textInput 例: "ラーメン大盛りと餃子3個"
 * @param preferredModel 'gemini' | 'gemma-31b' | 'gemma-26b' | 'deepseek'
 */
export const analyzeMealText = async (
  textInput: string,
  preferredModel?: string
): Promise<NutritionAIResult> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 28000);

  const activeModel = preferredModel || useSettingsStore.getState().settings.preferredAiModel || 'gemini-3.5-flash-lite';

  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    const proxySecret = process.env.EXPO_PUBLIC_AI_PROXY_SECRET;
    if (proxySecret) headers['Authorization'] = `Bearer ${proxySecret}`;

    const response = await fetch(NUTRITION_TEXT_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify({ textInput, preferredModel: activeModel }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Nutrition text API error: ${response.status}`);
    }

    const data = await response.json();
    recordAIDebugLog({
      type: 'text_analysis',
      endpointUrl: NUTRITION_TEXT_URL,
      status: response.status,
      success: true,
      requestSummary: { textInput, preferredModel: activeModel },
      responseRaw: data,
    });

    return {
      mealName: data.mealName || '不明な食事',
      calories: Number(data.calories) || 0,
      protein: Number(data.protein) || 0,
      fat: Number(data.fat) || 0,
      carbs: Number(data.carbs) || 0,
      sodium: Number(data.sodium) || 0,
      fiber: Number(data.fiber) || 0,
      advice: data.advice,
      isFood: true,
    };
  } catch (err: any) {
    clearTimeout(timeoutId);
    console.error('analyzeMealText failed:', err);

    const isAbort = err?.name === 'AbortError' || err?.message === 'Aborted' || err?.message === 'AbortError';
    const friendlyErrMsg = isAbort
      ? '接続タイムアウトが発生しました（28秒超過）。通信環境を確認するか、再度お試しください。'
      : (err?.message || String(err));

    recordAIDebugLog({
      type: 'text_analysis',
      endpointUrl: NUTRITION_TEXT_URL,
      success: false,
      requestSummary: { textInput, preferredModel: activeModel },
      errorMessage: friendlyErrMsg,
    });

    if (isAbort) {
      throw new Error(friendlyErrMsg);
    }
    throw err;
  }
};

/**
 * 画像による食事栄養解析
 * @param base64Image data:image/jpeg;base64,... 形式
 * @param ocrHintText オンデバイスOCRで事前抽出したテキスト（任意）
 * @param userMemo ユーザーが入力した補足メモ（任意）
 * @param preferredModel 'gemini' | 'gemma-31b' | 'gemma-26b' | 'deepseek'
 */
export const analyzeMealImage = async (
  base64Image: string,
  ocrHintText: string = '',
  userMemo: string = '',
  preferredModel?: string
): Promise<NutritionAIResult> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 28000);

  const activeModel = preferredModel || useSettingsStore.getState().settings.preferredAiModel || 'gemini-3.5-flash-lite';

  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    const proxySecret = process.env.EXPO_PUBLIC_AI_PROXY_SECRET;
    if (proxySecret) headers['Authorization'] = `Bearer ${proxySecret}`;

    const promptMessage = userMemo.trim()
      ? `【食事メモ】${userMemo}\nこの食事の写真、または食品パッケージ・栄養成分表示ラベルから、料理名/食品名、推定カロリー、PFC（タンパク質・脂質・炭水化物・塩分・食物繊維）の数値を正確に分析・抽出して回答してください。`
      : 'この食事の写真、または食品パッケージ・栄養成分表示ラベルから、料理名/食品名、推定カロリー、PFC（タンパク質・脂質・炭水化物・塩分・食物繊維）の数値を正確に分析・抽出して回答してください。';

    const requestPayload = {
      message: promptMessage,
      image: base64Image,
      ocrHintText,
      userMemo,
      preferredModel: activeModel,
    };

    const response = await fetch(NUTRITION_IMAGE_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify(requestPayload),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errText = await response.text();
      let parsedAdvice = '';
      try {
        const errJson = JSON.parse(errText);
        parsedAdvice = errJson?.advice || errJson?.error || '';
      } catch (_) {}

      recordAIDebugLog({
        type: 'image_analysis',
        endpointUrl: NUTRITION_IMAGE_URL,
        status: response.status,
        success: false,
        requestSummary: requestPayload,
        responseRaw: errText,
        errorMessage: parsedAdvice ? `HTTP ${response.status}: ${parsedAdvice}` : `HTTP ${response.status}: ${errText}`,
      });
      throw new Error(parsedAdvice || `AIによる画像解析時にエラーが発生しました (HTTP ${response.status})`);
    }

    const data = await response.json();

    recordAIDebugLog({
      type: 'image_analysis',
      endpointUrl: NUTRITION_IMAGE_URL,
      status: response.status,
      success: data.success !== false && data.isFood !== false,
      requestSummary: requestPayload,
      responseRaw: data,
      errorMessage: (data.success === false || data.isFood === false) ? (data.advice || data.reply || '不認識') : undefined,
    });

    if (data.success === false || data.isFood === false) {
      throw new Error(data.advice || data.reply || '食品または栄養成分表示ラベルが検出できませんでした。');
    }

    const adviceText = data.advice || data.reply || undefined;

    return {
      mealName: data.mealName || (userMemo.trim() ? userMemo.trim() : '食事写真'),
      calories: Number(data.calories) || 0,
      protein: Number(data.protein) || 0,
      fat: Number(data.fat) || 0,
      carbs: Number(data.carbs) || 0,
      sodium: Number(data.sodium) || 0,
      fiber: Number(data.fiber) || 0,
      advice: adviceText,
      isFood: data.isFood !== false,
    };
  } catch (err: any) {
    clearTimeout(timeoutId);
    console.error('analyzeMealImage failed:', err);
    recordAIDebugLog({
      type: 'image_analysis',
      endpointUrl: NUTRITION_IMAGE_URL,
      success: false,
      requestSummary: { ocrHintText, userMemo, preferredModel, imageLength: base64Image?.length },
      errorMessage: err?.message || String(err),
    });
    throw err;
  }
};

// ─── AI オートファジー時間提案 ──────────────────────────────

export interface AutophagyAIProposal {
  recommendedHours: number;
  reason: string;
  advice: string;
}

/**
 * 直近24時間の食事ログに基づきAIで適切なオートファジー絶食時間を提案する
 */
export const analyzeAutophagyRecommendation = async (
  mealLogs: MealLog[],
  preferredModel: string = 'gemini-3.7-flash'
): Promise<AutophagyAIProposal> => {
  if (!mealLogs || mealLogs.length === 0) {
    throw new Error('直近24時間の食事ログが存在しません。食事を記録してからお試しください。');
  }

  let totalCalories = 0;
  let totalP = 0;
  let totalF = 0;
  let totalC = 0;
  const mealSummaryList: string[] = [];

  mealLogs.forEach((m, idx) => {
    const cal = m.calories || 0;
    const p = m.protein || 0;
    const f = m.fat || 0;
    const c = m.carbs || 0;
    totalCalories += cal;
    totalP += p;
    totalF += f;
    totalC += c;

    const timeStr = m.meal_time || (m.created_at ? new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '時刻不明');
    mealSummaryList.push(`${idx + 1}. [${timeStr}] ${m.name} (${cal}kcal, P:${Math.round(p)}g, F:${Math.round(f)}g, C:${Math.round(c)}g)`);
  });

  const lastMeal = mealLogs[mealLogs.length - 1];
  const lastMealTimeStr = lastMeal.meal_time || (lastMeal.created_at ? new Date(lastMeal.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '直近');

  const promptMessage = `あなたは栄養学・オートファジー（自食作用）に詳しいAI専門トレーナーです。
以下の「直近24時間におけるユーザーの食事摂取データ」を深く分析し、次回行うべき最も効果的かつ安全なオートファジー（絶食）目標時間（時間数）と、その具体的な医学的・栄養学的理由、および実践アドバイスを提示してください。

【直近24時間の食事ログデータ】
- 食べた食事の回数: ${mealLogs.length}回
- 直近の最終食事時刻: ${lastMealTimeStr}
- 24時間合計カロリー: ${totalCalories} kcal
- 24時間合計PFC: タンパク質 ${Math.round(totalP)}g, 脂質 ${Math.round(totalF)}g, 炭水化物 ${Math.round(totalC)}g
- 具体的な品目内訳:
${mealSummaryList.join('\n')}

【回答のルール】
必ず以下のJSON形式のみを出力してください（余計な解説文や挨拶は含めないでください）。
{
  "recommended_hours": 数字（8から24までの整数。標準は16。摂取カロリーや炭水化物量、直近の食事内容に応じて12, 14, 16, 18, 20など適切に設定）,
  "reason": "なぜこの絶食時間が推奨されるかの分かりやすい理由説明（総カロリー・PFCバランス・糖質量・消化負担などを絡めた解説）",
  "advice": "絶食中に気をつけるべきポイントや水分補給・次回食事のアドバイス"
}`;

  const response = await sendMessageToAICoach(
    promptMessage,
    undefined,
    undefined,
    'kg',
    'thinking'
  );

  if (!response.success || !response.reply) {
    throw new Error(response.reply || 'AIによる解析に失敗しました。');
  }

  try {
    // レスポンスからJSON部分をパース
    let rawText = response.reply.trim();
    if (rawText.includes('```json')) {
      rawText = rawText.split('```json')[1].split('```')[0].trim();
    } else if (rawText.includes('```')) {
      rawText = rawText.split('```')[1].split('```')[0].trim();
    }

    const parsed = JSON.parse(rawText);
    const rawHours = Number(parsed.recommended_hours) || 16;
    const clampedHours = Math.min(24, Math.max(8, Math.round(rawHours)));

    return {
      recommendedHours: clampedHours,
      reason: parsed.reason || '直近の食事摂取バランスに基づき、適切な絶食時間を提案します。',
      advice: parsed.advice || '絶食中は十分な水分と適度な塩分を補給してください。',
    };
  } catch (e) {
    console.warn('Failed to parse JSON response from AI autophagy proposal, trying fallback text regex:', e);
    // フォールバック: テキストから数値（時間）を抽出
    const match = response.reply.match(/(\d{1,2})\s*時間/);
    let fallbackHours = 16;
    if (match && match[1]) {
      fallbackHours = Math.min(24, Math.max(8, parseInt(match[1], 10)));
    }
    return {
      recommendedHours: fallbackHours,
      reason: response.reply,
      advice: '絶食期間中は無理をせず水分補給を徹底してください。',
    };
  }
};
