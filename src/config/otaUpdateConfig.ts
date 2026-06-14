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
  version: '1.0.44', // OTA識別用のバージョン文字列
  title: {
    ja: 'アップデートのお知らせ',
    en: 'Update Information',
  },
  notes: {
    ja: [
      'アーリーアダプターの判定基準となる初回起動日の期限を2026年7月31日までに変更しました。'
    ],
    en: [
      'Changed the early adopter eligibility deadline to July 31, 2026.'
    ]
  }
};
