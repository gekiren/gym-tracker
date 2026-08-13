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
  version: '1.8.67',
  title: {
    ja: '栄養管理機能への履歴管理ページおよびグラフアイコンの追加',
    en: 'Added History Page and Graph Icon to Nutrition Feature',
  },
  notes: {
    ja: [
      '栄養（食事管理）画面の右上に青いグラフアイコンを追加し、過去の摂取カロリー・PFC（タンパク質・脂質・炭水化物）推移グラフや詳細履歴をいつでも確認・管理できるように改善しました。',
    ],
    en: [
      'Added a blue graph icon to the header of the Nutrition screen, allowing users to view historical calorie and PFC nutrient charts and logs.',
    ],
  },
};
