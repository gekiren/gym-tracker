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
  version: '1.1.38', // OTA識別用のバージョン文字列
  title: {
    ja: '時間管理画面の改善',
    en: 'Time Management Improvements',
  },
  notes: {
    ja: [
      '5分などの短い活動でも、集計円グラフにラベル（項目名）が表示されるように改善しました。',
    ],
    en: [
      'Fixed an issue where labels for short activities (e.g., 5 minutes) were not displayed on the chart.',
    ]
  }
};
