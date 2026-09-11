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
  version: '2.1.7',
  title: {
    ja: '⏳ オートファジータイマーの記録時間同期への改善',
    en: '⏳ Improved Autophagy Timer Sync with Logged Meal Times',
  },
  notes: {
    ja: [
      '食事を後から記録した際、操作時間ではなく記録された食事時間を基準にオートファジー絶食タイマーが正しく同期されるよう改善しました。',
      '過去の食事ログを後から追加・編集した場合でも、最新の食事時刻が正しく判定されるよう最適化しました。',
      'タイマー表示部に最終食事の記録時刻バッジを表示し、食事一覧を時間順に整列しました。',
    ],
    en: [
      'Fixed autophagy fasting timer to sync with actual logged meal times rather than entry timestamps.',
      'Optimized latest meal calculation when adding or editing past meal records.',
      'Added last meal time badge to timer display and sorted meal logs chronologically.',
    ],
  },
};
