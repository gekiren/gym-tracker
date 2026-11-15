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
  version: '2.3.44',
  title: {
    ja: '🎨 24時間管理のデザイン統一と操作性改善',
    en: '🎨 24h Time Management Theme & Layout Update',
  },
  notes: {
    ja: [
      '24時間管理画面のテーマカラーを青系に統一し、タイムライン操作ボタンの文字が1行で読みやすく表示されるようレイアウトを改善しました。',
    ],
    en: [
      'Unified the 24h Time Management screen theme to blue and improved timeline action button layout to prevent text wrapping.',
    ],
  },
};
