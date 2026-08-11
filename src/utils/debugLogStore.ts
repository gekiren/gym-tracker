import * as Updates from 'expo-updates';

export interface AIDebugLogEntry {
  id: string;
  timestamp: string;
  type: 'image_analysis' | 'text_analysis' | 'chat_coach';
  endpointUrl: string;
  status?: number;
  success: boolean;
  requestSummary: any;
  responseRaw?: any;
  errorMessage?: string;
}

const MAX_LOG_ENTRIES = 15;
let logStore: AIDebugLogEntry[] = [];

/**
 * ステージング環境または開発環境（__DEV__）であるかを判定する
 */
export const isStagingOrDev = (): boolean => {
  if (__DEV__) return true;
  try {
    const channel = Updates.channel;
    return channel === 'staging';
  } catch (e) {
    return false;
  }
};

/**
 * 長大なデータ（Base64画像など）を文字列整形時に短縮サニタイズする
 */
const sanitizePayload = (obj: any): any => {
  if (!obj) return obj;
  if (typeof obj === 'string') {
    if (obj.startsWith('data:image/') || obj.length > 500) {
      return `[String truncated: ${Math.round(obj.length / 1024)} KB]`;
    }
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map(sanitizePayload);
  }
  if (typeof obj === 'object') {
    const sanitized: Record<string, any> = {};
    for (const key of Object.keys(obj)) {
      if (key.toLowerCase().includes('image') && typeof obj[key] === 'string' && obj[key].length > 200) {
        sanitized[key] = `[Base64 Image Data: ${Math.round(obj[key].length / 1024)} KB]`;
      } else {
        sanitized[key] = sanitizePayload(obj[key]);
      }
    }
    return sanitized;
  }
  return obj;
};

/**
 * AI通信ログの記録
 */
export const recordAIDebugLog = (entry: Omit<AIDebugLogEntry, 'id' | 'timestamp'>) => {
  if (!isStagingOrDev()) return; // 本番環境では記録しない

  const newEntry: AIDebugLogEntry = {
    ...entry,
    id: Math.random().toString(36).substring(2, 9),
    timestamp: new Date().toLocaleTimeString('ja-JP', { hour12: false }),
    requestSummary: sanitizePayload(entry.requestSummary),
    responseRaw: sanitizePayload(entry.responseRaw),
  };

  logStore.unshift(newEntry);
  if (logStore.length > MAX_LOG_ENTRIES) {
    logStore = logStore.slice(0, MAX_LOG_ENTRIES);
  }
};

/**
 * 全ログの取得
 */
export const getAIDebugLogs = (): AIDebugLogEntry[] => {
  return [...logStore];
};

/**
 * 最新ログの取得
 */
export const getLatestAIDebugLog = (): AIDebugLogEntry | null => {
  return logStore.length > 0 ? logStore[0] : null;
};

/**
 * ログのクリア
 */
export const clearAIDebugLogs = () => {
  logStore = [];
};
