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
  version: '1.6.1',
  title: {
    ja: 'ワークアウト記録サマリーUIの洗練・デザイン統一',
    en: 'Refine Workout Summary UI & Capsule Styling',
  },
  notes: {
    ja: [
      '🎨 直近サマリーUIの調整: 日付表示を年カット(MM/DD)・同文字サイズ＆色に統合し、0kg部位の非表示・全記録部位のカプセル表示(borderRadius 20)に統一',
    ],
    en: [
      '🎨 Summary UI Polish: Unified date typography (MM/DD, same text size/color), excluded 0kg badges, and applied smooth capsule pill styling for all trained muscles',
    ],
  },
};
