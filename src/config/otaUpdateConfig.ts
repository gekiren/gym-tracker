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
  version: '2.3.77',
  title: {
    ja: '📊 栄養管理：カロリー推移グラフの日付表示を修正',
    en: '📊 Nutrition: Fixed Date Labels in Calorie Chart',
  },
  notes: {
    ja: [
      '「直近14日間のカロリー推移」グラフにおいて、2桁の日付ラベル（例: 11/24）が見切れる不具合を修正しました。',
    ],
    en: [
      'Fixed an issue where two-digit date labels (e.g., 11/24) were truncated in the 14-day calorie history chart.',
    ],
  },
};
