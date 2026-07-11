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
  version: '1.1.40', // OTA識別用のバージョン文字列
  title: {
    ja: '時間管理画面の不具合修正',
    en: 'Time Management Fix',
  },
  notes: {
    ja: [
      '円グラフのラベルが隣のグラフ表示に隠れてしまう不具合を修正しました。',
    ],
    en: [
      'Fixed an issue where chart labels were hidden behind neighboring chart sectors.',
    ]
  }
};
