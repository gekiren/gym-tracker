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
  version: '1.3.1',
  title: {
    ja: '栄養機能フォールバック＆AIテキスト栄養解析の改善',
    en: 'Nutrition Fallback & AI Text Analysis Update',
  },
  notes: {
    ja: [
      'AI写真解析・チャット解析による栄養成分の自動推定機能を追加',
      'カメラ非対応環境における黒画面フリーズ防止とテキストAI栄養解析フォールバックを実装',
      '今日のカロリー・PFCバランス・塩分・食物繊維進捗カードを追加',
      '16時間絶食オートファジータイマーと14日間の栄養グラフィック推移を追加',
    ],
    en: [
      'Added AI photo & chat nutrition analysis',
      'Improved camera fallback & added text-based AI nutrition analysis',
      'Added daily calories, PFC balance, sodium, and fiber progress card',
      'Added 16-hour intermittent fasting timer & 14-day history chart',
    ],
  },
};
