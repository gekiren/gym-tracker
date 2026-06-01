import { getRecentWorkoutSummaryForAI } from '../db/database';
import i18next from 'i18next';

// Cloudflare Workers AI Proxy API Endpoint URL
const WORKER_URL = 'https://gym-tracker-ai-coach.gekirennomads.workers.dev/api/chat';

export interface AICoachResponse {
  reply: string;
  success: boolean;
  errorType?: 'quota' | 'network' | 'unknown';
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
  try {
    // 1. Gather context: use customContext if provided (from direct page sparkles buttons),
    // otherwise load recent 5 workout logs from the SQLite database.
    let workoutHistoryContext = customContext;
    if (!workoutHistoryContext) {
      try {
        workoutHistoryContext = await getRecentWorkoutSummaryForAI(5);
      } catch (dbErr) {
        console.warn('Failed to load recent workout logs for AI context', dbErr);
        workoutHistoryContext = '過去の履歴を取得できませんでした。';
      }
    }

    const bodyWeightStr = userWeight ? `${userWeight} ${weightUnit}` : '未設定';
    const lang = i18next.language || 'ja';

    // 2. Make the secure POST request to Cloudflare Workers proxy
    const response = await fetch(WORKER_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message,
        workout_history: workoutHistoryContext,
        user_weight: bodyWeightStr,
        weight_unit: weightUnit || 'kg',
        language: lang,
      }),
    });

    if (response.status === 429) {
      return {
        reply: i18next.t('ui.coach.limit_reached_msg') || '今月の利用枠が残っていません。',
        success: false,
        errorType: 'quota',
      };
    }

    if (!response.ok) {
      throw new Error(`Server returned status: ${response.status}`);
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
  } catch (err) {
    console.error('Failed to communicate with AI Coach', err);
    return {
      reply: i18next.t('ui.coach.network_error') || 'ネットワークエラーが発生しました。接続を確認してください。',
      success: false,
      errorType: 'network',
    };
  }
};
