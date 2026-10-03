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
  version: '2.3.14',
  title: {
    ja: '🧩 24時間管理：タイムラインUIのスリム化',
    en: '🧩 24h Timeline: Simplified Timeline UI',
  },
  notes: {
    ja: [
      'タイムライン下部に配置されていた固定スケジュール用の「平日の基本型を一括配置」ボタンを削除し、UIをすっきりと整理しました。',
      'ご自身で登録したテンプレートやデフォルトスケジュールをより快適に活用いただけます。',
    ],
    en: [
      'Removed the static weekday template quick-fill button to streamline the timeline layout.',
      'Enjoy a cleaner workspace optimized for your custom templates and default routines.',
    ],
  },
};
