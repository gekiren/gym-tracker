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
  version: '1.8.97',
  title: {
    ja: '🎙️ 音声AIアシスタントのデータ一括保存機能改善',
    en: '🎙️ Improved AI Assistant Data Sync & Storage',
  },
  notes: {
    ja: [
      '音声AIアシスタントから筋トレ・食事・水分・メモデータをTreNote本体へ確実に一括保存できるよう連携処理を最適化しました。',
      'データ保存完了時に各カテゴリの保存件数をポップアップ表示し、スムーズにダッシュボードへ戻るよう改善しました。',
    ],
    en: [
      'Optimized data sync between the AI Voice Assistant and TreNote database for workouts, meals, water, and daily notes.',
      'Added detailed save count summary popup and streamlined the return flow to dashboard upon save completion.',
    ],
  },
};
