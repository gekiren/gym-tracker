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
  version: '1.1.67', // OTA識別用のバージョン文字列
  title: {
    ja: '水分補給設定のキーボード挙動改善',
    en: 'Improved Keyboard Behavior in Hydration Settings',
  },
  notes: {
    ja: [
      '水分補給設定画面のすべての入力欄において、Enterキー（完了/改行）を押した際にソフトウェアキーボードが閉じるように改善しました。',
    ],
    en: [
      'Improved the keyboard behavior in the hydration settings screen to dismiss the software keyboard when pressing Enter on all input fields.',
    ]
  }
};
