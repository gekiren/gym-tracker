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
  version: '1.8.66',
  title: {
    ja: '水分補給画面におけるカフェイン管理数値の文字色改善',
    en: 'Improved Caffeine Display Text Color on Hydration Screen',
  },
  notes: {
    ja: [
      '水分補給画面中央プログレスリング内のカフェイン管理数値（☕ カフェイン: X / XXX mg）の文字色を、水量の目標表示と同じ白色に修正し、視認性を向上させました。',
    ],
    en: [
      'Updated the text color of the central caffeine display on the hydration screen to white to improve visibility and match the water goals display.',
    ],
  },
};
