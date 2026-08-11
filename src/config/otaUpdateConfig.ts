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
  version: '1.5.2',
  title: {
    ja: 'AI通信バックデータ出力・解析デバッグ機能追加 ＆ 接続最適化',
    en: 'AI Backdata Debug Logger & Connection Optimization',
  },
  notes: {
    ja: [
      '🔍 AI通信バックデータ出力機能: ステージング環境にてAI食事解析の通信レスポンスRaw JSONおよびエラーログを直接確認・コピー可能にしました',
      '⚡ サーバーレスポンス解析強化: Gemini 3.6 Flash解析エンジンの詳細レスポンス可視化とエラー自動記録を導入',
    ],
    en: [
      '🔍 AI Backdata Debug Logger: Added staging-only Raw JSON & error log inspector for AI meal analysis',
      '⚡ Response Diagnostics: Enhanced server response logging and failure tracking for Gemini 3.6 Flash',
    ],
  },
};
