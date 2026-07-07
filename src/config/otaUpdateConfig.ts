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
  version: '1.1.9', // OTA識別用のバージョン文字列
  title: {
    ja: '水分補給のカフェイン記録対応',
    en: 'Caffeine Tracking in Hydration',
  },
  notes: {
    ja: [
      '水分補給の記録時に、オプションでカフェイン量（mg）を入力・記録できるようになりました。',
      '今日の記録リストや詳細履歴にカフェイン量（☕）が表示されるようになりました。',
    ],
    en: [
      'Added an option to track caffeine intake (mg) alongside water consumption.',
      'Caffeine intake is now displayed in your logs and daily detail views.',
    ]
  }
};
