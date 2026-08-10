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
  version: '1.5.0',
  title: {
    ja: '全テーマ総合アップデート (AIアドバイス強化・PFC機能拡張・タイマー高速化)',
    en: 'Major Update v1.5.0 (AI Coach, PFC & Performance Optimization)',
  },
  notes: {
    ja: [
      '⚡ パフォーマンス最適化: SQLiteデッドロック対策、一括クエリによる読み込み高速化、非表示画面の自動サスペンドを導入',
      '🤖 AIコーチング最適化: 筋トレ履歴・食事PFC・水分・ライフログを統合したパーソナライズAIアドバイス機能を搭載',
      '🍽️ 食事・ライフログ拡張: 食事ログ一覧へのフィルター＆キーワード検索バー追加、ダッシュボードへのリアルタイムPFCサマリーカード追加',
      '🏋️ 筋トレ機能強化: 1RM計算機への公式切替（Epley/Brzycki）と目的別強度ゾーン表示、タイマー残り3・2・1秒予告バイブ演出を追加',
    ],
    en: [
      '⚡ Performance Optimization: Batch SQL queries and background screen suspension for smooth FPS',
      '🤖 AI Coach Upgrade: Personalised AI advice integrating workout history, PFC nutrition, hydration, and time logs',
      '🍽️ Nutrition & Lifelog: Search & filter tabs in meal logs, live PFC summary widget on Dashboard',
      '🏋️ Workout Expansion: 1RM formula selector (Epley/Brzycki), intensity zone badges, and 3-2-1 timer haptics',
    ],
  },
};
