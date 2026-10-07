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
  version: '2.3.21',
  title: {
    ja: '⏱️ ２４時間管理：予定追加時のカード選択自動解除',
    en: '⏱️ 24h Timeline: Auto-deselect Card after Schedule Addition',
  },
  notes: {
    ja: [
      '２４時間管理タイムラインで予定（ピース/カード）を追加した直後に、カードの選択状態を自動的に解除するように改善しました。連続して別の操作や記録を行う際の手間を削減します。',
    ],
    en: [
      'Improved 24-hour timeline to automatically clear card selection immediately after adding a schedule, streamlining continuous logging.',
    ],
  },
};

