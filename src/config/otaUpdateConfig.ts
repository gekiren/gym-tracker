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
  version: '1.1.29', // OTA識別用のバージョン文字列
  title: {
    ja: '不具合修正と機能改善',
    en: 'Bug Fixes and Improvements',
  },
  notes: {
    ja: [
      '24時間管理において、活動内容（活動名）を入力せずに時間のみで記録できるよう改善しました。',
      '筋トレ画面の上部「＜」マーク（戻るボタン）でダッシュボードに戻れない不具合を修正しました。',
    ],
    en: [
      'Improved the 24-hour manager to allow recording logs with only a time range.',
      'Fixed an issue where the back button on the workout screen did not return to the dashboard.',
    ]
  }
};
