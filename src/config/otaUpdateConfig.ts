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
  version: '1.8.102',
  title: {
    ja: '🚀 クイックランチャーウィジェット設定の機能選択UI改善',
    en: '🚀 Quick Launcher Widget Settings UI Improvements',
  },
  notes: {
    ja: [
      'ウィジェット設定画面において、機能選択ダイアログを専用モーダルに刷新しました。',
      'AI音声アシスタントや体組成を含む全8項目が確実に選択できるようになりました。',
    ],
    en: [
      'Revamped the feature selection dialog in widget settings to a custom modal.',
      'All 8 features including Voice AI Assistant and Body Composition can now be selected.',
    ],
  },
};
