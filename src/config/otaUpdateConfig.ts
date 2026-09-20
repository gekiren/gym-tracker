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
  version: '2.2.14',
  title: {
    ja: '🍱 栄養管理に「献立プリセット（食事セット）」機能を追加',
    en: '🍱 Added Meal Presets Feature to Nutrition Tracker',
  },
  notes: {
    ja: [
      '複数の食品を1つの「献立セット」としてまとめて登録・一括記録できるようになりました。',
      'セットごとに曜日（月〜金など）や時間を固定でき、該当する曜日に優先サジェストされます。',
      '一括記録後も1品ごとの量調整（倍率変更）や個別削除が可能で、セット全体の一括削除にも対応しました。',
      '「今日の食事ログからセット作成」機能により、普段の食事からワンタップでセット化できます。',
    ],
    en: [
      'Added meal presets to batch-log multiple food items together with one tap.',
      'Support scheduling by day of the week and fixed meal times with priority suggestions on matching days.',
      'After logging, food items can be adjusted (scaled) or deleted individually, or deleted as an entire set.',
      'Easily create new presets directly from existing daily meal logs with a single tap.',
    ],
  },
};
