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
  version: '1.1.65', // OTA識別用のバージョン文字列
  title: {
    ja: 'ダッシュボードの水分補給ボタンおよびデータ同期の不具合修正',
    en: 'Fix Hydration Presets and Data Sync Bug',
  },
  notes: {
    ja: [
      'ダッシュボード上の水分補給・習慣カウンターのクイック追加ボタンが正常にタップできるようにUI構造を改善しました。',
      '詳細画面で水分を追加した際、他日程の過去履歴データが消去されてしまう同期処理のバグを修正しました。',
    ],
    en: [
      'Fixed an issue where quick-add buttons for Hydration and Habits on the dashboard were unresponsive.',
      'Fixed a data sync bug that caused past hydration history to be deleted when adding new logs.',
    ]
  }
};
