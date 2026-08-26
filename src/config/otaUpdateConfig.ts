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
  version: '2.0.15',
  title: {
    ja: '⚙️ 習慣カウンターの設定メニュー統合・UI整理',
    en: '⚙️ Habit Counter Settings Integration & UI Cleanup',
  },
  notes: {
    ja: [
      'カード長押し時の設定メニュー（目標設定・削除）を右上の歯車（習慣の管理）に完全統合し、長押しは回数修正専用にシンプル化しました。',
    ],
    en: [
      'Integrated habit target settings and deletion into the manage settings gear icon, making card long-press exclusively for count adjustments.',
    ],
  },
};
