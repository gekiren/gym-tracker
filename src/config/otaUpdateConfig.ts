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
  version: '2.3.36',
  title: {
    ja: '✨ トレーニング中画面のUI・スタンス操作整理',
    en: '✨ Active Workout UI & Stance Cleanup',
  },
  notes: {
    ja: [
      'トレーニング中の種目カードからデフォルトスタンス設定ボタンを削除し、画面をすっきり整理しました（初期スタンスは種目詳細画面から設定でき、各セット個別の変更は引き続き可能です）。',
    ],
    en: [
      'Removed the exercise-level default stance button from active workout cards for a cleaner layout (default stance remains configurable in Exercise Details, and per-set changes are still supported).',
    ],
  },
};
