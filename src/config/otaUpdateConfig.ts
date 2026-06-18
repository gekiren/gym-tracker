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
  version: '1.0.78', // OTA識別用のバージョン文字列
  title: {
    ja: 'アップデートのお知らせ',
    en: 'Update Information',
  },
  notes: {
    ja: [
      'ID生成ロジックをより安全で重複リスクの少ない標準モジュール（expo-crypto）に移行しました。'
    ],
    en: [
      'Migrated to standard secure module (expo-crypto) for generating unique IDs.'
    ]
  }
};
