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
  version: '1.8.55',
  title: {
    ja: '食事記録モーダルのタイトル変更およびテキストAI解析の整理',
    en: 'Meal Record Modal Title Update & Text AI Analysis Removal',
  },
  notes: {
    ja: [
      '食事記録モーダルのタイトルを「写真から食事記録」に変更しました。',
      '「テキストメモからAI栄養解析」ボタンを削除し、直感的なUI構造に改善しました。',
    ],
    en: [
      'Updated the meal record modal title to "Meal Record from Photo".',
      'Removed the text memo AI analysis button for a cleaner user interface.',
    ],
  },
};
