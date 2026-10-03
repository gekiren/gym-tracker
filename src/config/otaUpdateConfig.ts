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
  version: '2.3.8',
  title: {
    ja: '🛠️ 24時間管理：安定性向上とダイアログ修正',
    en: '🛠️ 24h Timeline: Stability Improvement & Fixes',
  },
  notes: {
    ja: [
      '24時間管理: スケジュール適用ダイアログの表示不具合を修正しました。',
      '24時間管理: デフォルトスケジュール機能の安定性を向上しました。',
    ],
    en: [
      '24h Tracker: Fixed schedule dialog display issue.',
      '24h Tracker: Improved stability of default schedule system.',
    ],
  },
};
