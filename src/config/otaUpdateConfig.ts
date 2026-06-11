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
  version: '1.0.32', // OTA識別用のバージョン文字列
  title: {
    ja: 'アップデートのお知らせ',
    en: 'Update Information',
  },
  notes: {
    ja: [
      'ワークアウト履歴画面にカレンダー表示機能を追加しました。',
      'カレンダーの日付タップで該当のワークアウトへ自動スクロールし、一時的にハイライトします。',
      '月間の実施日数・総ボリューム・総消費カロリーのサマリーが確認できるようになりました。'
    ],
    en: [
      'Added a monthly calendar view to the workout history screen.',
      'Tapping a calendar date scrolls to and highlights the corresponding workout card.',
      'View monthly summary metrics (workout days, total volume, and calories burned) at a glance.'
    ]
  }
};
