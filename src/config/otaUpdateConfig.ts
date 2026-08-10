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
  version: '1.3.0',
  title: {
    ja: '栄養＆食事管理機能の統合',
    en: 'Nutrition & Meal Management Integration',
  },
  notes: {
    ja: [
      'AI写真解析・チャット解析による栄養成分の自動推定機能を追加',
      '今日のカロリー・PFCバランス・塩分・食物繊維進捗カードを追加',
      '16時間絶食オートファジータイマーと14日間の栄養グラフィック推移を追加',
      'Gemini 3.6 Flash AIモデルへの最新化と最適化',
    ],
    en: [
      'Added AI photo & chat nutrition analysis',
      'Added daily calories, PFC balance, sodium, and fiber progress card',
      'Added 16-hour intermittent fasting timer & 14-day history chart',
      'Updated to Gemini 3.6 Flash AI model',
    ],
  },
};
