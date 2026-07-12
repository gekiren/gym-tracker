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
  version: '1.1.52', // OTA識別用のバージョン文字列
  title: {
    ja: 'ルーティン管理メニューの配置調整',
    en: 'Routine Management menu layout adjustments',
  },
  notes: {
    ja: [
      '管理画面の「+ New」と「Back to Home」ボタンをリストの一番上に配置するよう変更しました。',
    ],
    en: [
      'Moved the "+ New" and "Back to Home" buttons to the top of the management screen.',
    ]
  }
};
