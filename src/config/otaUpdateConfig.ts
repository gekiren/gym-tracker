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
  version: '2.3.52',
  title: {
    ja: '📝 Obsidian連携：栄養価・体組成・ヘルスデータを日次ログに統合',
    en: '📝 Obsidian Sync: Nutrition, Body Metrics & Health Data in Daily Log',
  },
  notes: {
    ja: [
      'Obsidian の TreNote 日次ログ (TreNote_YYYY-MM-DD.md) に、食事・栄養価（カロリー・PFC）、体組成の数値、およびヘルスデータ（歩数・睡眠など）の埋め込みが自動で含まれるようになりました。',
    ],
    en: [
      'TreNote daily Obsidian logs (TreNote_YYYY-MM-DD.md) now automatically include meal nutrition (calories & macros), body composition metrics, and embedded health data.',
    ],
  },
};
