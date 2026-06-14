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
  version: '1.0.55', // OTA識別用のバージョン文字列
  title: {
    ja: 'アップデートのお知らせ',
    en: 'Update Information',
  },
  notes: {
    ja: [
      '手動で種目を追加した際、常に1セット（左右種目はL/R各1セット）のみデフォルトで追加する設定を「設定・ツール」画面に追加しました。'
    ],
    en: [
      'Added a setting in "Settings" to always add exactly one set (or L/R sets for unilateral exercises) by default when manually adding exercises.'
    ]
  }
};
