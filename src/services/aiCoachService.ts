import { getRecentWorkoutSummaryForAI } from '../db/database';
import i18next from 'i18next';

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
 */
export const sendMessageToAICoach = async (
  message: string,
  customContext?: string,
  userWeight?: number | null,
  weightUnit?: string
): Promise<AICoachResponse> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 25000); // 25 seconds timeout

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
