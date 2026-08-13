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
  version: '1.8.42',
  title: {
    ja: 'AI Coach モデル表記の DeepSeek V4 Pro 更新',
    en: 'Update AI Coach Model to DeepSeek V4 Pro',
  },
  notes: {
    ja: [
      '🤖 AI Coach 設定画面および設定メニューでの DeepSeek モデル表示を「DeepSeek V4 Pro」にアップデートしました。',
      '⚡ 高度な論理推論機能を提供する最新の DeepSeek V4 Pro モデルとの表示・連携を最適化しました。',
    ],
    en: [
      '🤖 Updated AI Coach DeepSeek model display label to "DeepSeek V4 Pro".',
      '⚡ Optimized alignment and display for the latest DeepSeek V4 Pro model.',
    ],
  },
};
