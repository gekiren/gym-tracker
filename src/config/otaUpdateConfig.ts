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
  version: '1.0.68', // OTA識別用のバージョン文字列
  title: {
    ja: 'アップデートのお知らせ',
    en: 'Update Information',
  },
  notes: {
    ja: [
      'Android端末でのキーボード表示時のレイアウトの安定性を向上させました。',
      'キーボード表示時の入力欄の自動スクロールおよび余白調整を改善しました。'
    ],
    en: [
      'Improved layout stability when the keyboard is shown on Android devices.',
      'Optimized automatic scrolling and bottom padding when the keyboard is active.'
    ]
  }
};
