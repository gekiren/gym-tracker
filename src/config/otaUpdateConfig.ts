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
  version: '1.1.37', // OTA識別用のバージョン文字列
  title: {
    ja: '時間管理画面の改善',
    en: 'Time Management Improvements',
  },
  notes: {
    ja: [
      '24時間管理の集計円グラフ内の項目名が背景と重なって読みにくくなる問題を改善しました。',
    ],
    en: [
      'Improved readability of item names in the 24-hour summary chart by preventing them from blending into the background.',
    ]
  }
};
