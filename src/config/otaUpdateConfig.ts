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
  version: '1.0.75', // OTA識別用のバージョン文字列
  title: {
    ja: 'アップデートのお知らせ',
    en: 'Update Information',
  },
  notes: {
    ja: [
      'データベースの復元処理で発生していたエラー（java.lang.NullPointerException）を修正しました。'
    ],
    en: [
      'Fixed a restore database error (java.lang.NullPointerException) on Android.'
    ]
  }
};
