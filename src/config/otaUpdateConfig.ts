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
  version: '2.0.29',
  title: {
    ja: '✨ ルーティン結果画面のデザイン＆表記刷新',
    en: '✨ Routine Result Screen UI & Design Refresh',
  },
  notes: {
    ja: [
      'ルーティン完了後の結果画面のグラフデザイン・配色をアプリテーマ（スカイブルー＆ネオングリーン）に合わせてモダンに刷新しました。',
      '「Est/Act/Result」の英語表記を「予定/実績/結果」の分かりやすい日本語に統一し、各タスクのカードデザインを改善しました。',
    ],
    en: [
      'Refreshed the routine result screen chart design and color scheme to match the app dark theme (sky blue & neon green).',
      'Localized "Est/Act/Result" labels to Japanese and improved task result card styling.',
    ],
  },
};
