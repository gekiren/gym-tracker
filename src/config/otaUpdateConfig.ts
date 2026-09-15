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
  version: '2.2.12',
  title: {
    ja: '🔍 自己ベスト（PR）カードの文字サイズ拡大',
    en: '🔍 Increased Font Size for Personal Record Cards',
  },
  notes: {
    ja: [
      '種目詳細画面の自己ベスト（PR）一覧カードの文字サイズを拡大し、視認性を向上させました。',
      'カードのコンパクトな4列グリッドサイズは維持したまま、重量・回数・推定1RMの文字をくっきり読みやすく調整しました。',
    ],
    en: [
      'Increased the font size of Personal Record (PR) cards on the exercise detail screen for better readability.',
      'Maintained the compact 4-column card dimensions while making weight, reps, and estimated 1RM text clearer.',
    ],
  },
};
