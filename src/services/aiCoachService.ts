import { getRecentWorkoutSummaryForAI } from '../db/database';
import i18next from 'i18next';
import { useWorkoutStore } from '../store/workoutStore';
import { useSettingsStore } from '../store/settingsStore';

// Cloudflare Workers AI Proxy API Endpoint URL
const WORKER_URL = 'https://gym-tracker-ai-proxy.toshi-diyil.workers.dev/api/chat';

export interface AICoachResponse {
  reply: string;
  success: boolean;
  errorType?: 'quota' | 'network' | 'unknown' | 'busy';
}

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
  const controller = new AbortController();
  const timeoutSeconds = aiMode === 'thinking' ? 45000 : 25000;
  const timeoutId = setTimeout(() => controller.abort(), timeoutSeconds); // 25s for quick, 45s for thinking

  try {
    // 1. Gather context: use customContext if provided (from direct page sparkles buttons),
    // otherwise load recent 3 workout logs from the SQLite database.
    let workoutHistoryContext = customContext;
    if (!workoutHistoryContext) {
      try {
        workoutHistoryContext = await getRecentWorkoutSummaryForAI(3);
      } catch (dbErr) {
        console.warn('Failed to load recent workout logs for AI context', dbErr);
        workoutHistoryContext = '過去の履歴を取得できませんでした。';
      }
    }

    const bodyWeightStr = userWeight ? `${userWeight} ${weightUnit}` : '未設定';
    const lang = i18next.language || 'ja';
    const preferredModel = useSettingsStore.getState().settings.preferredAiModel || 'gemini';

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
        workout_history: workoutHistoryContext,
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
      };
    } else {
      throw new Error('Invalid response structure from proxy');
    }
  } catch (err: any) {
    clearTimeout(timeoutId);
    console.error('Failed to communicate with AI Coach', err);
    
    if (err.name === 'AbortError') {
      return {
        reply: i18next.t('ui.coach.timeout_error') || '接続タイムアウトが発生しました。通信環境の良い場所で再度お試しください。',
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
