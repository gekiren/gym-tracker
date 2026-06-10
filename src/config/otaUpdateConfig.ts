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
  version: '1.0.23', // OTA識別用のバージョン文字列
  title: {
    ja: 'アップデートのお知らせ',
    en: 'Update Information',
  },
  notes: {
    ja: [
      'Androidナビゲーションバーによるタブバーのレイアウト位置の調整を行いました。',
      'タブバーの表示位置を押し上げて下部ボタンの操作性を高めました。'
    ],
    en: [
      'Adjusted tab bar layout placement for Android navigation bars.',
      'Raised the tab bar height to improve bottom button usability.'
    ]
  }
};
