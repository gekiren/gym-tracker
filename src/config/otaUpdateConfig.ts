export interface OTAUpdateConfig {
  version: string;
  title: {
    ja: string;
    en: string;
  };
  notes: {
    ja: string[];
    en: string[];
  };
}

export const CURRENT_OTA_CONFIG: OTAUpdateConfig = {
  version: '2.1.12',
  title: {
    ja: '🔍 スワイプ数値調整のリアルタイム診断アップデート',
    en: '🔍 Real-time Diagnostics for Swipe Adjustments',
  },
  notes: {
    ja: [
      'スワイプ操作およびタッチ判定のリアルタイム診断ログを追加しました。',
    ],
    en: [
      'Added real-time diagnostic logging for swipe adjustments and touch interactions.',
    ],
  },
};
