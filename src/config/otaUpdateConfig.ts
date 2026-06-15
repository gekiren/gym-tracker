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
  version: '1.0.62', // OTA識別用のバージョン文字列
  title: {
    ja: 'アップデートのお知らせ',
    en: 'Update Information',
  },
  notes: {
    ja: [
      '「すべてのルーティン」画面からルーティンをタップして直接編集できるようになりました。',
      'ルーティン登録数が11個以上の状態で編集しようとした場合の制限を追加しました。'
    ],
    en: [
      'You can now edit routines directly by tapping them from the "All Routines" screen.',
      'Added routine editing limitations when you have 11 or more registered routines.'
    ]
  }
};
