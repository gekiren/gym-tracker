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
  version: '2.1.0',
  title: {
    ja: '✨ v2.1.0 ネイティブリリース',
    en: '✨ v2.1.0 Native Release',
  },
  notes: {
    ja: [
      'ルーティン結果画面のグラフデザイン・配色をアプリテーマに合わせて刷新しました。',
      '「予定/実績/結果」の分かりやすい日本語表記に統一し、カードデザインと安定性を向上しました。',
    ],
    en: [
      'Refreshed the routine result screen chart design and color scheme to match the app theme.',
      'Localized labels to Japanese and improved task result card styling and stability.',
    ],
  },
};
