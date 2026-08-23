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
  version: '1.8.101',
  title: {
    ja: '⚡ 音声AIアシスタントの記録精度＆記憶保存の信頼性向上',
    en: '⚡ Voice AI Assistant Precision & Storage Reliability',
  },
  notes: {
    ja: [
      '音声AIアシスタントのツール判定ルールを強化し、プロテイン飲料や水分の自動判別精度を向上しました。',
      'リアルタイム対話のフォールバックモデルを3段階体制に拡充しました。',
      '音声AIで記録された筋トレワークアウトの保存時刻が実際の会話時刻に同期するよう改善しました。',
      '設定画面でのAI記憶の保存・初期化におけるエラーハンドリングを強化しました。',
    ],
    en: [
      'Enhanced tool recognition rules to accurately distinguish protein drinks from plain water.',
      'Expanded live model fallback to a robust 3-tier architecture.',
      'Improved workout save timestamps to reflect actual conversation time.',
      'Reinforced error handling and status feedback for AI memory settings.',
    ],
  },
};
