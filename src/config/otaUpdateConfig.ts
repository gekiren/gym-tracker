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
  version: '1.1.66', // OTA識別用のバージョン文字列
  title: {
    ja: 'ウィジェット水分設定の反映改善およびキーボード挙動の修正',
    en: 'Improved Widget Sync and Hydration Keyboard Fixes',
  },
  notes: {
    ja: [
      '設定からウィジェットのクイック追加水分量を変更した際、確実にウィジェットに反映されるように同期処理を改善しました。',
      '水分補給設定画面の入力欄で、キーボードの「完了/Enter」を押した際にキーボードが閉じるように挙動を修正しました。',
    ],
    en: [
      'Improved widget synchronization to ensure changes to quick-add amount are applied to the widget correctly.',
      'Fixed the keyboard behavior in hydration settings to dismiss upon pressing Enter/Done.',
    ]
  }
};
