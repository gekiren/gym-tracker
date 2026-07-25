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
  version: '1.1.73', // OTA識別用のバージョン文字列
  title: {
    ja: 'Obsidian カテゴリ別保存先フォルダ設定 ＆ 種目・ルーティン分離連携',
    en: 'Obsidian Custom Subfolder Settings & Exercise/Routine Export',
  },
  notes: {
    ja: [
      'Obsidian連携において筋トレ（ワークアウト/種目）、水分、時間管理、習慣、ルーティン管理の各保存先サブフォルダを個別に自由設定できるようになりました。',
      '筋トレのワークアウトログと各種目ノート（自己ベスト・全セット履歴付き）を分離し、相互リンク連携する機能を追加しました。',
    ],
    en: [
      'Added support for configuring custom subfolders for Workouts, Exercises, Hydration, Time, Habits, and Routines in Obsidian export.',
      'Separated Workout logs and Exercise notes (with PRs & full set histories) with seamless WikiLink navigation.',
    ]
  }
};




