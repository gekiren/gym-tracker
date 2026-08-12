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
  version: '1.7.8',
  title: {
    ja: '種目別グラフデザインの統一',
    en: 'Exercise Chart Design Standardized',
  },
  notes: {
    ja: [
      '📊 種目詳細ページのグラフデザインおよび初期表示数（7個）をワークアウトグラフと統一しました。',
    ],
    en: [
      '📊 Standardized exercise detail charts to match the main workout history graph design and 7-item display count.',
    ],
  },
};

