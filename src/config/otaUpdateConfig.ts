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
  version: '1.0.69', // OTA識別用のバージョン文字列
  title: {
    ja: 'アップデートのお知らせ',
    en: 'Update Information',
  },
  notes: {
    ja: [
      'Android端末でキーボード表示時に入力欄が隠れず、自動でスクロールされるように改善しました。',
      'キーボードを閉じた後に画面最下部に余計な余白（黒い領域）が残る不具合を解消しました。'
    ],
    en: [
      'Fixed an issue on Android where text inputs were hidden behind the keyboard and did not auto-scroll.',
      'Resolved the layout bug where a black space or blank area remained at the bottom after dismissing the keyboard.'
    ]
  }
};
