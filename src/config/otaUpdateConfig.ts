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
  version: '2.0.3',
  title: {
    ja: '🥗 食事写真のタップ拡大 ＆ 過去写真ギャラリー（写真削除対応）',
    en: '🥗 Meal Photo Zoom & Photo Gallery (With Photo Deletion)',
  },
  notes: {
    ja: [
      '食事ログの写真をタップして全画面で拡大表示（ズーム・移動）できるようになりました。',
      '過去の食事写真をまとめて一覧閲覧できる写真ギャラリー機能を新設しました。',
      'ギャラリーおよび拡大画面から写真データのみ（記録は維持）を削除できるようになりました。',
    ],
    en: [
      'Added full-screen photo zoom viewer when tapping meal photos.',
      'Added a Photo Gallery to view all past meal photos in one place.',
      'Supports deleting photo data only while keeping the meal log intact.',
    ],
  },
};
