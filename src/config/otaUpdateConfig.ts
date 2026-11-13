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
  version: '2.3.29',
  title: {
    ja: '🛠️ カメラ撮影での食事写真解析時の画面遷移不具合を修正',
    en: '🛠️ Fixed Screen Navigation Issue When Taking Meal Photos with Camera',
  },
  notes: {
    ja: [
      'ウィジェット等から起動し、栄養管理の写真解析でカメラ撮影した際にワークアウト画面やトップ画面へ移動してしまう不具合を修正しました。',
      'カメラ撮影後にバックグラウンド復帰した際も、撮影した写真と入力メモを確実に引き継いでAI栄養解析が自動実行されるよう改善しました。',
    ],
    en: [
      'Fixed an issue where taking a photo with the in-app camera for nutrition analysis after launching from a widget unintentionally navigated to the workout or top screen.',
      'Improved camera lifecycle recovery so captured meal photos and notes are reliably preserved and automatically analyzed upon returning from the camera.',
    ],
  },
};
