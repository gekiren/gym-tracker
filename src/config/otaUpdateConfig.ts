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
  version: '1.0.92', // OTA識別用のバージョン文字列
  title: {
    ja: 'アップデートのお知らせ',
    en: 'Update Information',
  },
  notes: {
    ja: [
      'プロフィール画面の設定項目の表示順をご指定の順序に並び替えました。'
    ],
    en: [
      'Reordered setting items on the Profile screen to the specified order.'
    ]
  }
};
