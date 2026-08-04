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
  version: '1.1.86', // OTA識別用のバージョン文字列
  title: {
    ja: 'AIチャットに思考モード切替機能を追加',
    en: 'Added AI Chat Mode Toggle (Quick & Thinking)',
  },
  notes: {
    ja: [
      'AIチャット画面に「⚡ クイック（思考なし・スピード重視）」と「🧠 シンキング（思考あり・深層分析）」の切替モードを追加しました。',
      '質問の用途や相談内容に合わせて、AIの回答スタイルをワンタップで簡単に切り替えられます。',
    ],
    en: [
      'Added Quick Mode (fast, non-thinking) and Thinking Mode (deep analysis) toggles to AI Chat.',
      'Switch AI response style instantly according to your training needs.',
    ]
  }
};




