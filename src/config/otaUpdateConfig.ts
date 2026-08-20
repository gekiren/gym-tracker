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
  version: '1.8.94',
  title: {
    ja: '⚡ AI食事写真解析の安定性向上 ＆ エラー表示改善',
    en: '⚡ Enhanced AI Meal Photo Analysis & Error Handling',
  },
  notes: {
    ja: [
      '食事写真および栄養成分ラベルのAI解析タイムアウトと安定性を向上しました。',
      'AI通信エラー発生時の詳細メッセージ表示を改善しました。',
    ],
    en: [
      'Improved timeout management and stability for AI meal photo analysis.',
      'Enhanced detailed error messages during AI communication.',
    ],
  },
};
