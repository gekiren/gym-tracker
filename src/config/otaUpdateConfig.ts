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
  version: '1.8.99',
  title: {
    ja: '🧠 音声AIアシスタントのパーソナライズ（記憶）機能を追加',
    en: '🧠 AI Voice Assistant Personalization & Memory Support',
  },
  notes: {
    ja: [
      '音声AIアシスタントに対話を通じて好みや生活習慣、怪我の注意点などを学習・記憶するパーソナライズ機能を追加しました。',
      'アプリ設定に「AIの記憶・プロフィール」画面を追加し、記憶された内容の確認や手動編集・消去ができるようになりました。',
      'WebViewデータ受け渡しをJS直接注入方式に刷新し、長文の記憶データも安定して引き継がれます。',
    ],
    en: [
      'Added personalization and memory capabilities to Voice AI Assistant, allowing it to remember preferences, habits, and conditions.',
      'Added a new "AI Memory & Profile" screen in Settings for reviewing, editing, and clearing stored memories.',
      'Upgraded context bridging to direct JS injection for limitless, seamless memory handling.',
    ],
  },
};
