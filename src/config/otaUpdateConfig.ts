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
  version: '2.0.13',
  title: {
    ja: '🎯 習慣カウンター目標値および表示状態の保存バグ修正',
    en: '🎯 Complete Fix for Habit Target Value Persistence',
  },
  notes: {
    ja: [
      'データベースの構造不整合を修復し、目標数値と非表示設定が確実に保存・維持されるようになりました。',
    ],
    en: [
      'Fixed a database schema issue to ensure habit target values and hidden settings are reliably persisted.',
    ],
  },
};
