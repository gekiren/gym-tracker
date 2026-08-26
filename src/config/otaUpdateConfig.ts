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
  version: '2.0.14',
  title: {
    ja: '🎯 習慣カウンター目標値保存バグの最終修正',
    en: '🎯 Final Fix for Habit Target Value Persistence',
  },
  notes: {
    ja: [
      'データベースの構造不整合を修復する処理が過去の更新履歴によってスキップされてしまう問題を解決し、確実に目標値が保存されるよう修正しました。',
    ],
    en: [
      'Resolved an issue where database schema repairs were skipped due to previous update history, ensuring target values are reliably persisted.',
    ],
  },
};
