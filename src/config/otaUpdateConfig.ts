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
  version: '2.3.37',
  title: {
    ja: '✨ 共通モーダル・ナビゲーションのUI/UX改善',
    en: '✨ Shared Modals & Navigation UI/UX Improvements',
  },
  notes: {
    ja: [
      '各種確認モーダル、カレンダー、お知らせ・共有シートなどの共通UIをダーク／ピュアブラックテーマに完全対応し、角丸・枠線・ボタンの押しやすさを統一しました。',
    ],
    en: [
      'Updated shared modals, calendar, update/share sheets, and root navigation to fully support Dark and Pure Black themes with unified spacing, borders, and larger tap targets.',
    ],
  },
};
