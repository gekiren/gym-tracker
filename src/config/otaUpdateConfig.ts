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
  version: '1.7.9',
  title: {
    ja: '推定1RMグラフカラーの統一',
    en: '1RM Chart Color Standardized',
  },
  notes: {
    ja: [
      '🎨 推定1RMグラフのテーマカラーを総重量グラフと同じテーマカラー（青）に統一しました。',
    ],
    en: [
      '🎨 Standardized the estimated 1RM chart theme color to blue to match the total volume chart.',
    ],
  },
};

