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
  version: '2.0.12',
  title: {
    ja: '🎯 習慣カウンター目標値の永続化保存バグを完全修正',
    en: '🎯 Complete Fix for Habit Target Value Persistence',
  },
  notes: {
    ja: [
      '習慣カウンターで目標値を設定後に画面やモーダルを閉じても、数値が消えずデータベースへ確実に永久保存されるよう修正しました。',
    ],
    en: [
      'Fixed issue where habit target values were lost upon closing modal. Target values are now reliably persisted.',
    ],
  },
};
