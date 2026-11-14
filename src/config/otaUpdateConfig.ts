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
  version: '2.3.42',
  title: {
    ja: '🎨 栄養・プロフィール・各種設定UIのテーマ最適化',
    en: '🎨 UI & Theme Refinements (Nutrition, Profile & Settings)',
  },
  notes: {
    ja: [
      '栄養管理画面および関連モーダルがダーク／ピュアブラックテーマに動的対応し、操作ボタンと背景タップ閉じを最適化しました。',
      'プロフィール画面・各種設定画面（バックアップ・AIメモリ・カレンダー連携・ヘルスコネクト等）・プライバシーポリシー・開発者メニューのデザイン統一とタップ領域を改善しました。',
    ],
    en: [
      'Updated Nutrition screens and modals to follow Dark / Pure Black themes with improved action buttons and backdrop dismissal.',
      'Unified styling, tap targets, and modal interactions across Profile, Settings (Backup, AI Memory, Calendar Sync, Health Connect, etc.), Privacy Policy, and Developer Menu.',
    ],
  },
};
