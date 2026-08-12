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
  version: '1.8.9',
  title: {
    ja: '種目カード内レイアウト余白の最適化',
    en: 'Exercise Card Layout Spacing Optimization',
  },
  notes: {
    ja: [
      '✨ 種目ボリューム・KG調整行とテーブルヘッダー（セット/kg/回数...）の間の余白を短縮し、カード内の配置をスッキリさせました。',
    ],
    en: [
      '✨ Tightened spacing between volume/KG step row and table headers for a cleaner layout.',
    ],
  },
};

