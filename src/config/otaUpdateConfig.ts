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
  version: '1.8.109',
  title: {
    ja: '✨ 習慣カウンターのタップ操作および安定性の改善',
    en: '✨ Habit Counter Touch Responsiveness & Stability Fix',
  },
  notes: {
    ja: [
      '習慣カウンター画面において、習慣の追加ボタンや設定アイコンがタップしても反応しなかった不具合を修正しました。',
      'データの同期処理を最適化し、各種ライフログの安定性を向上させました。',
    ],
    en: [
      'Fixed an issue where tapping the add habit card or settings icon in Habit Counter had no response.',
      'Optimized lifelog data synchronization for improved app stability.',
    ],
  },
};
