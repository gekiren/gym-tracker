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
  version: '1.8.103',
  title: {
    ja: '🚀 アプリ設定メニューの整理とAIアシスタント設定統合',
    en: '🚀 Settings Menu Reorganization & AI Assistant Integration',
  },
  notes: {
    ja: [
      'ウィジェット設定のメニュー位置を調整し、デザインスタイルを他のメニューと統一しました。',
      'AIトレーナー設定（利用枠残高）を「AIアシスタント」画面へ統合し、より分かりやすく管理できるように改善しました。',
    ],
    en: [
      'Adjusted the menu position of Widget Settings and unified its design style.',
      'Integrated AI Trainer settings (token balance) into the AI Assistant screen for better management.',
    ],
  },
};
