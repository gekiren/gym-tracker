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
  version: '2.2.22',
  title: {
    ja: '⚡ ウィジェット起動時の動作改善',
    en: '⚡ Widget Launch Improvements',
  },
  notes: {
    ja: [
      'ウィジェットからワークアウトを直接起動した際に、更新内容ポップアップが表示されないよう改善しました。',
      'ウィジェットからのクイック起動時の安定性と応答性を向上しました。',
    ],
    en: [
      'Improved quick launch from the widget to suppress the release notes popup when starting workouts directly.',
      'Enhanced launch stability and responsiveness from home screen widgets.',
    ],
  },
};
