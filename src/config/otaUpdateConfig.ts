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
  version: '1.1.21', // OTA識別用のバージョン文字列
  title: {
    ja: 'ダッシュボードヘッダーの調整',
    en: 'Dashboard Header Adjustments',
  },
  notes: {
    ja: [
      'ダッシュボードヘッダーの幅を調整し、ステータスバーやカメラとの重なりを解消しました。',
      '日付切り替えボタンのタップ操作性を改善しました。',
    ],
    en: [
      'Adjusted the dashboard header height to resolve overlap with the status bar and camera notch.',
      'Improved touch usability for the date switcher buttons.',
    ]
  }
};
