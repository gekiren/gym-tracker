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
  version: '1.2.5', // OTA識別用のバージョン文字列
  title: {
    ja: 'AIトレーナー機能の内部改善',
    en: 'AI Trainer System Improvements',
  },
  notes: {
    ja: [
      'AIトレーナー画面におけるシステムメッセージの処理と表示の安定性を向上',
    ],
    en: [
      'Improved stability of system message handling and display in the AI Trainer screen',
    ],
  },
};




