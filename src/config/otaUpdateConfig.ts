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
  version: '2.3.59',
  title: {
    ja: '🧹 機能の整理・画面構成の最適化',
    en: '🧹 Feature Cleanup & Layout Simplification',
  },
  notes: {
    ja: [
      'AIトレーナーおよび音声AIアシスタント機能を無効化し、メニュー・タブ・機能一覧をシンプルに整理しました。',
      'ウィジェットのクイックランチャー初期構成を7つの主要機能に合わせて最適化しました。',
      '食事・栄養のAI解析機能および外部サービス連携は引き続きご利用いただけます。',
    ],
    en: [
      'Disabled the AI Coach and Voice AI Assistant features to streamline tabs, menus, and feature management.',
      'Optimized the default Quick Launcher widget layout for the 7 core features.',
      'Nutrition AI analysis and external sync integrations remain available.',
    ],
  },
};
