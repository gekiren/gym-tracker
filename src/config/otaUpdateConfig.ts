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
  version: '2.3.30',
  title: {
    ja: '✨ セット行のスタンス・トロフィー・時間表示のレイアウト改善',
    en: '✨ Improved Set Row Stance, Trophy, and Timer Layout',
  },
  notes: {
    ja: [
      'スタンス選択時は「スタンス」のラベルを省略してスタンス名のみをシンプルに表示し、未選択時は「スタンス」と表示するように改善しました。',
      '自己ベスト更新時のトロフィー（🏆）をセット番号の左側に移動し、1RMや休憩・計測時間が記録チェックボタンと重ならないよう自動縮小・レイアウト調整を行いました。',
    ],
    en: [
      'Simplified stance display to show only the stance name when selected, and "Stance" when unselected.',
      'Moved the PR trophy (🏆) to the left of the set number and adjusted the layout with auto-scaling so 1RM and rest/work timers never overlap the check button.',
    ],
  },
};
