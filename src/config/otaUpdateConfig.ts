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
      '水分補給、24時間管理、習慣カウンター、ルーティン管理の各画面に履歴グラフ表示機能を追加しました。',
      '画面右上のグラフアイコンから、日・週・月・年ごとの総量グラフと詳細履歴一覧を切り替えられます。',
      'ワークアウト記録のグラフにも「年」スケールオプションを追加しました。',
    ],
    en: [
      'Added history charts to Water, 24-Hour, Habits, and Routines detail screens.',
      'Toggle between logs and daily/weekly/monthly/yearly charts via the header chart icon.',
      'Added a "Year" scale option to the workout records history chart.',
    ]
  }
};
