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
  version: '1.8.90',
  title: {
    ja: '⭐ 食事ログ編集画面へのお気に入り機能追加・カードUI整理',
    en: '⭐ Add to Favorites from Meal Edit Screen & Cleaner Card UI',
  },
  notes: {
    ja: [
      '食事ログ編集画面から直接お気に入りの登録・解除ができるようになりました。',
      '食事ログ一覧カードのボタン構成をスッキリ整理し、操作性を向上させました。',
    ],
    en: [
      'You can now add or remove items from Favorites directly from the Meal Edit modal.',
      'Refined the meal log card buttons for a cleaner layout and improved usability.',
    ],
  },
};
