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
  version: '1.8.11',
  title: {
    ja: 'RM計算機への公式解説ヘルプ追加とレイアウト最適化',
    en: 'RM Calculator Formula Help & Layout Optimization',
  },
  notes: {
    ja: [
      '💡 RM計算機に1RMやEpley式・Brzycki式の特徴と違いを確認できる「？」ヘルプボタンを追加しました。',
      '✨ 画面右上タブの見切れ表示を解消し、表示領域と操作性を向上させました。',
    ],
    en: [
      '💡 Added a help icon to the RM Calculator explaining 1RM and Epley / Brzycki formulas.',
      '✨ Fixed header tab layout overflow issue in the RM Calculator.',
    ],
  },
};

