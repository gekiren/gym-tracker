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
  version: '1.8.63',
  title: {
    ja: 'MD一括取り込み画面でのAIプロンプトコピー機能追加',
    en: 'Added AI Prompt Copy Feature to MD Bulk Import',
  },
  notes: {
    ja: [
      '「MD一括取り込み」画面にChatGPTやClaude等の外部AIへ食事写真・メモを送信して解析させるための専用プロンプトをクリップボードにコピーできる機能を追加しました。',
    ],
    en: [
      'Added a button in MD Bulk Import to copy the AI Nutritionist prompt for ChatGPT and Claude directly to the clipboard.',
    ],
  },
};
