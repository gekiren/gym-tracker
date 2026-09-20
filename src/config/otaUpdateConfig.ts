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
  version: '2.2.16',
  title: {
    ja: '🍱 献立セット案内バナーの表示改善',
    en: '🍱 Meal Preset Banner Display Fix',
  },
  notes: {
    ja: [
      '献立セット未登録時の案内バナーが端末画面幅からはみ出て見切れてしまう表示崩れを修正しました。',
      '案内テキストの自動折り返しとアクションバッジ配置により、各種画面サイズでの視認性を向上させました。',
    ],
    en: [
      'Fixed an issue where the meal preset guide banner overflowed the screen on certain devices.',
      'Improved responsive layout with text auto-wrapping and action badges across various screen sizes.',
    ],
  },
};
