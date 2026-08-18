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
  version: '1.8.79',
  title: {
    ja: '🥗 栄養クイックお気に入りの編集・並び替え機能',
    en: '🥗 Nutrition Quick Favorites Management',
  },
  notes: {
    ja: [
      'クイックお気に入りに編集ボタンを追加し、お気に入りの編集・削除・並び替え・新規追加を直接行えるように改善しました。',
    ],
    en: [
      'Added an edit button to Quick Favorites allowing direct editing, reordering, deletion, and addition of favorite foods.',
    ],
  },
};
