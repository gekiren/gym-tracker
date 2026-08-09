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
  version: '1.2.3', // OTA識別用のバージョン文字列
  title: {
    ja: '履歴画面のデータベースアクセスおよび型安全性の改善',
    en: 'Improved History Database Queries & Type Safety',
  },
  notes: {
    ja: [
      'ワークアウト履歴一覧のデータベースクエリ処理を最適化',
      'コード内部の型定義を整理し、アプリ動作の安定性を向上',
    ],
    en: [
      'Optimized database queries for workout history',
      'Refactored internal type definitions to improve stability',
    ],
  },
};




