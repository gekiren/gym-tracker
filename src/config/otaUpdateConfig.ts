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
  version: '1.0.60', // OTA識別用のバージョン文字列
  title: {
    ja: 'アップデートのお知らせ',
    en: 'Update Information',
  },
  notes: {
    ja: [
      'オリジナル種目作成画面において、画面下部にさらに設定項目があることがわかるように、スクロールガイドの表示とスクロールバーの改善を行いました。'
    ],
    en: [
      'Added scroll bar and guidance text on the custom exercise creation screen to make it clear that more settings are available below.'
    ]
  }
};
