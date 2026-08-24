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
  version: '2.0.0',
  title: {
    ja: '🚀 TreNote v2.0.0 メジャーアップデート',
    en: '🚀 TreNote v2.0.0 Major Update',
  },
  notes: {
    ja: [
      'ライフログ機能（水分・習慣・時間管理）の安定性と操作性を大幅に向上しました。',
      'パフォーマンスの最適化および全体の安定性を改善しました。',
    ],
    en: [
      'Significantly improved lifelog stability and responsiveness (Water, Habits, Time Tracking).',
      'Optimized overall performance and app stability.',
    ],
  },
};
