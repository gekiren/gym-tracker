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
  version: '1.8.47',
  title: {
    ja: 'ダッシュボードの習慣カウンター表示を改善',
    en: 'Improved Dashboard Habit Counter',
  },
  notes: {
    ja: [
      '📌 ダッシュボードの習慣カウンター表示を最大3件に制限し、すっきり整理しました。',
      '👆 習慣名やカウント部分をタップして習慣管理画面へスムーズに移動できるようになりました。',
    ],
    en: [
      '📌 Limited dashboard habit counter display to a maximum of 3 items for a cleaner UI.',
      '👆 Tapping habit names or count areas now seamlessly navigates to the habit management screen.',
    ],
  },
};
