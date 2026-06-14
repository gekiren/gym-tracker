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
  version: '1.0.53', // OTA識別用のバージョン文字列
  title: {
    ja: 'アップデートのお知らせ',
    en: 'Update Information',
  },
  notes: {
    ja: [
      'AIトークン消費処理における不整合（レースコンディション）を解消し、動作の安定性を向上させました。'
    ],
    en: [
      'Fixed a race condition in AI token consumption to improve system stability.'
    ]
  }
};
