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
  version: '1.1.45', // OTA識別用のバージョン文字列
  title: {
    ja: 'ライフログ履歴の総量グラフ機能追加（日・週・月・年）',
    en: 'Lifelog History Charts (Day/Week/Month/Year)',
  },
  notes: {
    ja: [
      '「履歴」画面に「水分」「24時間」「習慣」「ルーティン」の履歴タブを追加しました。',
      'それぞれの履歴について、日・週・月・年ごとの総量グラフと詳細な履歴一覧を確認できます。',
      'ワークアウト記録のグラフにも「年」スケールオプションを追加しました。',
    ],
    en: [
      'Added history tabs for "Water", "24-Hour", "Habits", and "Routines" in the History screen.',
      'View daily, weekly, monthly, and yearly total charts and detailed history lists for each lifelog.',
      'Added a "Year" scale option to the workout records history chart.',
    ]
  }
};
