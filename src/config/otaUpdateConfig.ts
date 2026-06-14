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
  version: '1.0.59', // OTA識別用のバージョン文字列
  title: {
    ja: 'アップデートのお知らせ',
    en: 'Update Information',
  },
  notes: {
    ja: [
      'Android端末において、オリジナル種目作成画面でキーボードが表示された際に、表示エリアが狭くなりすぎる問題を改善しました。'
    ],
    en: [
      'Fixed layout compression issue on Android when the keyboard is visible on the custom exercise creation screen.'
    ]
  }
};
