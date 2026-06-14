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
  version: '1.0.43', // OTA識別用のバージョン文字列
  title: {
    ja: 'アップデートのお知らせ',
    en: 'Update Information',
  },
  notes: {
    ja: [
      '「プレミアムプラン（期間限定）」の表記を「プレミアムプラン（お試し）」に変更しました。'
    ],
    en: [
      'Changed the name of "Premium Plan (Limited-Time)" to "Premium Plan (Trial)".'
    ]
  }
};
