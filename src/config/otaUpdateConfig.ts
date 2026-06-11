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
  version: '1.0.33', // OTA識別用のバージョン文字列
  title: {
    ja: 'アップデートのお知らせ',
    en: 'Update Information',
  },
  notes: {
    ja: [
      '種目詳細画面に月間カレンダー表示および月間サマリー機能を追加しました。',
      'カレンダーの日付タップで該当種目の過去の履歴へスクロールし、ハイライト表示します。',
      '種目ごとの月間サマリー（実施日数・総ボリューム・総セット数）が確認できるようになりました。'
    ],
    en: [
      'Added a monthly calendar view and summary statistics to individual exercise detail screens.',
      'Tapping a calendar date scrolls to and highlights the corresponding workout history entry.',
      'View monthly exercise metrics (workouts, total volume, and total sets) at a glance.'
    ]
  }
};
