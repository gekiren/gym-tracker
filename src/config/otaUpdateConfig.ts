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
  version: '1.8.10',
  title: {
    ja: '種目カードおよびカード間余白の最適化',
    en: 'Exercise Card & Spacing Optimization',
  },
  notes: {
    ja: [
      '✨ 種目名の上部余白および種目カード同士の黒い余白を縮小し、画面内の表示領域と操作性を向上させました。',
    ],
    en: [
      '✨ Reduced top padding of exercise titles and gap between exercise cards for improved screen efficiency.',
    ],
  },
};

