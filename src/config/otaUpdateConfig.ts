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
  version: '2.3.61',
  title: {
    ja: '🏅 各機能のトップページにランク表示を追加',
    en: '🏅 Added Feature Rank Bar to Each Feature Page',
  },
  notes: {
    ja: [
      '筋トレ・体組成・水分・栄養・24時間管理・ルーティン・習慣カウンターの各トップページ上部に、現在の機能別ランクと次のランクまでのXP進捗バーを表示するようにしました。',
      'ランクバーをタップすると、その機能のランク一覧と関連メダル詳細を直接確認できるようになりました。',
    ],
    en: [
      'Added a compact rank and XP progress bar to the top page of every feature (Workout, Body, Water, Nutrition, 24h Time, Routine, and Habit Counter).',
      'Tapping the rank bar now opens that feature\'s class roadmap and related achievement medals directly.',
    ],
  },
};
