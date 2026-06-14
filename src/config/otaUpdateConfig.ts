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
  version: '1.0.58', // OTA識別用のバージョン文字列
  title: {
    ja: 'アップデートのお知らせ',
    en: 'Update Information',
  },
  notes: {
    ja: [
      'オリジナル種目作成画面において、項目が増えてもソフトウェアキーボードで入力欄が隠れないように、スクロール表示できる形に改善しました。'
    ],
    en: [
      'Improved the custom exercise creation screen layout to scroll when the software keyboard is active, preventing it from hiding input fields.'
    ]
  }
};
