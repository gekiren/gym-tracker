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
  version: '1.8.57',
  title: {
    ja: 'オートファジー時間最適化のAI解析タイムアウト＆エラー表示改善',
    en: 'Autophagy Time Optimization Analysis Timeout & Error Display Improvement',
  },
  notes: {
    ja: [
      '「✨ オートファジー時間最適化」機能実行時のAI解析タイムアウト制限時間を拡張し、安定性を向上させました。',
      '通信タイムアウト発生時に生のシステムキーが表示される不具合を修正し、分かりやすいエラー表示に対応しました。',
    ],
    en: [
      'Extended timeout limits for Autophagy AI Time Optimization for increased stability.',
      'Fixed an issue where raw error keys were displayed on timeout, improving error message visibility.',
    ],
  },
};
