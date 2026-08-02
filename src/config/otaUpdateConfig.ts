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
  version: '1.1.85', // OTA識別用のバージョン文字列
  title: {
    ja: 'AIモデル選択機能の追加',
    en: 'AI Model Selection Added',
  },
  notes: {
    ja: [
      'AIコーチで使用する優先モデル（Gemini 3.6 Flash / DeepSeek V3）を設定画面から選択できるようになりました。',
      '接続エラー発生時に自動的にもう一方のモデルへ切り替わる相互フォールバック機能を実装しました。',
    ],
    en: [
      'Added option to select preferred AI model (Gemini 3.6 Flash / DeepSeek V3) in settings.',
      'Implemented mutual automatic fallback in case of connection errors.',
    ]
  }
};




