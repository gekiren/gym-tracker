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
  version: '1.1.19', // OTA識別用のバージョン文字列
  title: {
    ja: '水分補給画面のキーボード挙動改善',
    en: 'Hydration Keyboard Behavior Improvements',
  },
  notes: {
    ja: [
      'クイック追加ボタンの3つ目の設定で確定キーを押した際に、キーボードが閉じるようにしました。',
      '任意入力のカフェイン入力欄で確定キーを押した際に、キーボードが閉じるようにしました。',
    ],
    en: [
      'Dismiss software keyboard when pressing Enter on the 3rd quick add preset input.',
      'Dismiss software keyboard when pressing Enter on the caffeine input field.',
    ]
  }
};
