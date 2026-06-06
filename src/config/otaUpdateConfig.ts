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
  version: '1.0.7-ota1', // OTA識別用のバージョン文字列
  title: {
    ja: 'アップデートのお知らせ',
    en: 'App Updated',
  },
  notes: {
    ja: [
      '不具合の修正とアプリの動作安定性を向上しました。',
      '一部の画面レイアウトを最適化しました。'
    ],
    en: [
      'Fixed bugs and improved application stability.',
      'Optimized layout for several screens.'
    ]
  }
};
