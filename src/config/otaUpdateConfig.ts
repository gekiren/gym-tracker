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
  version: '1.8.45',
  title: {
    ja: 'プラン＆アプリ情報および環境設定のレイアウト改善',
    en: 'Plan & App Info Layout Improvements',
  },
  notes: {
    ja: [
      '📋 設定画面の表記を「プラン & アプリ情報」および「プランの種類」へ更新しました。',
      '⚙️ 「プラン情報」および「環境設定」にカードヘッダー見出しを追加し、レイアウトを統一しました。',
    ],
    en: [
      '📋 Updated setting labels to "Plan & App Info" and "Plan Type".',
      '⚙️ Added section headers for Plan Info and Preferences for unified layout.',
    ],
  },
};
