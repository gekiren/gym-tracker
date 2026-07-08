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
  version: '1.1.22', // OTA識別用のバージョン文字列
  title: {
    ja: 'カフェイン上限設定とUIの改善',
    en: 'Caffeine Limit & UI Improvements',
  },
  notes: {
    ja: [
      '水分補給設定に「1日のカフェイン上限」設定を追加しました。',
      '水分補給画面ヘッダーのカフェイン表示の文字色を黒に調整し、視認性を向上させました。',
      '記録リストおよび履歴画面のカフェイン表示の文字色を白に調整し、視認性を向上させました。',
    ],
    en: [
      'Added a "Daily Caffeine Limit" setting in hydration settings.',
      'Adjusted caffeine text color in the hydration header to black for better visibility.',
      'Adjusted caffeine text color in the intake log list and history modal to white for better visibility.',
    ]
  }
};
