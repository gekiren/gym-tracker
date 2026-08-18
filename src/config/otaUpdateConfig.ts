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
  version: '1.8.88',
  title: {
    ja: '🎯 限界到達度カードの表示シンプル化（到達率数値・ポテンシャル分析への最適化）',
    en: '🎯 Simplified Potential Analysis Card (Focused on Metrics & Reach %)',
  },
  notes: {
    ja: [
      '限界到達度カードのプログレスバーを削除し、到達率（%）とポテンシャル数値・アドバイスに特化したすっきり見やすいデザインに改善しました。',
    ],
    en: [
      'Removed the visual progress bar from the Muscle Potential card to provide a cleaner, distraction-free view of reach percentage and key stats.',
    ],
  },
};
