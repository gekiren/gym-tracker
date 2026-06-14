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
  version: '1.0.45', // OTA識別用のバージョン文字列
  title: {
    ja: 'アップデートのお知らせ',
    en: 'Update Information',
  },
  notes: {
    ja: [
      'AIトレーナー画面における React Hooks のルール違反を修正し、クラッシュする問題を解決しました。',
      'AIトレーナー通信時のエラーハンドリングを追加し、通信エラー時の画面フリーズを防止しました。',
      'データベース初期化処理の並行呼び出しにおける競合（デッドロック）リスクを解消しました。'
    ],
    en: [
      'Fixed React Hooks rule violation in AI Coach screen (crash prevention).',
      'Added exception handling to AI Coach communication (freeze prevention).',
      'Fixed race conditions in database initialization.'
    ]
  }
};
