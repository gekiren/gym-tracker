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
  version: '1.1.51', // OTA識別用のバージョン文字列
  title: {
    ja: 'ルーティン管理画面のレイアウト調整',
    en: 'Routine Management UI adjustments',
  },
  notes: {
    ja: [
      '管理画面の「+ New」ボタンを画面最下部の「Back to Home」の上にバーボタン形式で配置するよう変更しました。',
    ],
    en: [
      'Changed "+ New" button in Routine Management to a bar button above "Back to Home".',
    ]
  }
};
