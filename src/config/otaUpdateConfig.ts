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
  version: '2.1.4',
  title: {
    ja: '🛠️ ワークアウト画面での種目追加ボタンの反応不具合修正',
    en: '🛠️ Fixed Add Exercise Button Responsiveness in Workout Screen',
  },
  notes: {
    ja: [
      '複数セット完了時にフローティングボタンの領域が重なり、「種目を追加」ボタンが反応しなくなる不具合を修正しました。',
      'ジェスチャー操作とセット完了状態におけるボタンのタップ判定を改善し、確実に種目を追加できるよう向上させました。',
    ],
    en: [
      'Fixed an issue where completing multiple sets caused the Add Exercise button to become unresponsive due to floating action overlay obstruction.',
      'Improved button touch handling with gesture handler integration for reliable and immediate responsiveness.',
    ],
  },
};
