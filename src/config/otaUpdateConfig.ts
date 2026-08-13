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
    ja: '環境設定体重と栄養管理目標体重のリアルタイム相互連動',
    en: 'Sync Body Weight between App Preferences and Nutrition Goals',
  },
  notes: {
    ja: [
      '📱 「アカウント & アプリ情報」画面に AI Coach 利用残高および環境設定（背景テーマ、アプリ言語、クラッシュレポート送信）を集約統合しました。',
      '⚖️ 環境設定での体重変更と栄養管理設定の目標体重がリアルタイムで相互連動し、一元管理できるよう改善しました。',
    ],
    en: [
      '📱 Integrated AI Coach balance and environment preferences into the Account Info screen.',
      '⚖️ Synchronized body weight setting seamlessly with Nutrition Goals for unified data tracking.',
    ],
  },
};
