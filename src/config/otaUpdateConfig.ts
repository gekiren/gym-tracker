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
  version: '1.6.8',
  title: {
    ja: 'フリーワークアウト開始ボタンのシンプル化',
    en: 'Simplified Free Workout Button',
  },
  notes: {
    ja: [
      '✨ アイコン表示の最適化: フリーワークアウト開始ボタンからプラスアイコンを外し、スッキリと再生マークのみのシンプルな表記に修正しました',
    ],
    en: [
      '✨ Button Layout Polish: Removed plus icon from free workout button for a cleaner look with play-circle icon',
    ],
  },
};
