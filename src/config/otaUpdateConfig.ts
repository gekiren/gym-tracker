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
  version: '1.8.75',
  title: {
    ja: 'カロリー推移グラフの表示改善',
    en: 'Calorie History Chart Improvement',
  },
  notes: {
    ja: [
      '直近14日間のカロリー推移グラフで、今日の日付が右端に初期表示されるよう改善しました。',
    ],
    en: [
      'Improved the 14-day calorie history chart to show today\'s date on the far right by default.',
    ],
  },
};
