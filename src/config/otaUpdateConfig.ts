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
  version: '1.0.7-ota2', // OTA識別用のバージョン文字列
  title: {
    ja: 'アップデートのお知らせ',
    en: 'Update Information',
  },
  notes: {
    ja: [
      'ルーティン作成時に、種目を新規作成して直接追加できるようになりました。',
      'YouTubeで種目のやり方動画をワンタップで検索できるボタンを追加しました。',
      '設定画面にデータのバックアップ・復元機能を追加しました（プレミアム会員限定）。',
      'プロモーションコードを入力してプレミアム機能を利用できる機能を追加しました。',
      'プレミアムプランの期限切れの自動判定とプランの自動復旧ロジックを実装しました。',
      'ワークアウト中のタイマー表示や履歴画面のグラフ描画、セット削除等の不具合を修正しました。'
    ],
    en: [
      'Added ability to create and add new exercises directly when building routines.',
      'Added a quick-access YouTube button to search for exercise "how-to" videos.',
      'Added data backup and restore features in settings (Premium only).',
      'Added support for promo codes to unlock Premium features.',
      'Implemented automatic check and reversion for expired premium plans.',
      'Fixed minor issues with the workout timer, history graphs, set deletion, and UI layout.'
    ]
  }
};
