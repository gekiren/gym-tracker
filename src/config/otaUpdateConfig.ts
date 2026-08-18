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
  version: '1.8.82',
  title: {
    ja: '🧬 身長・想定体脂肪率の完全永続化＆同期強化',
    en: '🧬 Height & Target Body Fat Persistence & Sync',
  },
  notes: {
    ja: [
      '身長および想定体脂肪率の自動永続化に対応し、カード間での双方向同期・画面変更後の保持を強化しました。',
    ],
    en: [
      'Persisted height and target body fat percentage with full cross-card synchronization.',
    ],
  },
};
