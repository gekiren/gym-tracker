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
  version: '1.1.39', // OTA識別用のバージョン文字列
  title: {
    ja: '時間管理画面の改善',
    en: 'Time Management Improvements',
  },
  notes: {
    ja: [
      '円グラフのラベル表示が重なり合って見えなくなる問題を改善しました。',
    ],
    en: [
      'Improved chart label positions to prevent overlapping.',
    ]
  }
};
