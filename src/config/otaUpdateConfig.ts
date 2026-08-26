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
  version: '2.0.16',
  title: {
    ja: '🎯 習慣カウンター目標値保存バグの完全修正',
    en: '🎯 Complete Fix for Habit Target Value Persistence',
  },
  notes: {
    ja: [
      'タップするたびに目標値がリセットされる問題の根本原因（カウント後のデータ再注入に目標値が含まれていなかった）を修正しました。',
    ],
    en: [
      'Fixed the root cause of target values resetting on each tap: the data re-injection after counting now correctly includes target values.',
    ],
  },
};
