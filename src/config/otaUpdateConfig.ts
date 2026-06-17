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
  version: '1.0.73', // OTA識別用のバージョン文字列
  title: {
    ja: 'アップデートのお知らせ',
    en: 'Update Information',
  },
  notes: {
    ja: [
      'Android端末でキーボード表示時に入力欄が隠れず、自動でスクロールされるように改善しました。',
      'Keyboard Controllerライブラリの段階的導入により、ルーティン編集画面でのキーボード表示時のレイアウト不具合（黒い領域）を修正しました。'
    ],
    en: [
      'Fixed an issue on Android where text inputs were hidden behind the keyboard and did not auto-scroll.',
      'Introduced Keyboard Controller to resolve the keyboard layout gap issue on the routine builder screen.'
    ]
  }
};
