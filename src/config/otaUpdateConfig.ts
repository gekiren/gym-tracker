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
  version: '1.1.0', // OTA識別用のバージョン文字列
  title: {
    ja: '正式リリースのお知らせ',
    en: 'Official Release',
  },
  notes: {
    ja: [
      '正式リリース版です。'
    ],
    en: [
      'Official release version.'
    ]
  }
};
