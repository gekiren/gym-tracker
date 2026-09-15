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
  version: '2.2.13',
  title: {
    ja: '✨ 更新通知ポップアップの改善＆文字サイズ拡大',
    en: '✨ Improved Update Modal & PR Font Size',
  },
  notes: {
    ja: [
      '自己ベスト（PR）一覧カードの文字サイズを拡大し、視認性を向上させました（カードサイズは完全維持）。',
      '更新通知画面の操作性を改善し、「閉じる」ボタンでスムーズにアプリを利用できるようにしました。',
    ],
    en: [
      'Increased font size of Personal Record (PR) cards for better readability while preserving card dimensions.',
      'Enhanced update notification dialog with a convenient Close button for a smoother user experience.',
    ],
  },
};
