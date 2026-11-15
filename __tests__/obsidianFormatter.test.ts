jest.mock('../src/db/database', () => ({
  getDB: jest.fn(),
  loadFullWorkoutData: jest.fn(),
}));

jest.mock('../src/i18n', () => ({
  __esModule: true,
  default: { t: (key: string) => key },
  translateExercise: (name: string) => name,
  translateStance: (stance: string) => stance,
}));

jest.mock('../src/services/obsidianService', () => ({}));

import {
  buildWorkoutObsidianNoteName,
  formatDailyLogToObsidianMarkdown,
} from '../src/services/obsidian/obsidianFormatter';

describe('obsidianFormatter - buildWorkoutObsidianNoteName', () => {
  it('builds note name without extension by default', () => {
    const name = buildWorkoutObsidianNoteName({
      start_time: '2026-11-15T11:15:00',
      title: 'フリーワークアウト',
    });
    expect(name).toBe('2026-11-15_1115_フリーワークアウト');
  });

  it('builds file name with .md extension and sanitizes invalid characters', () => {
    const name = buildWorkoutObsidianNoteName(
      {
        start_time: '2026-11-15T06:05:00',
        title: '胸/肩:DAY*1',
      },
      true
    );
    expect(name).toBe('2026-11-15_0605_胸_肩_DAY_1.md');
  });

  it('falls back safely when start_time is invalid or missing', () => {
    const name = buildWorkoutObsidianNoteName(
      {
        start_time: 'invalid-date',
        title: 'テスト',
      },
      false,
      '2026-11-15'
    );
    expect(name).toBe('2026-11-15_テスト');
  });
});

describe('obsidianFormatter - formatDailyLogToObsidianMarkdown', () => {
  const sampleWorkouts = [
    {
      title: 'フリーワークアウト',
      start_time: '2026-11-15T11:15:00',
      exercises: [
        { exercise_name: 'デッドリフト', sets: [{}, {}, {}] },
      ],
    },
  ];

  it('embeds detailed workout notes by default and omits set count summary', () => {
    const md = formatDailyLogToObsidianMarkdown(
      '2026-11-15',
      sampleWorkouts,
      [],
      [],
      [],
      [
        {
          routineName: 'シャクティマット',
          timestamp: new Date('2026-11-15T00:12:00').getTime(),
          totalActualSeconds: 908,
          logs: [{ task_name: '背面', actual_seconds: 607 }],
        },
      ]
    );

    expect(md).toContain('### 🏋️ 本日のトレーニング (1件)');
    expect(md).toContain('![[2026-11-15_1115_フリーワークアウト]]');
    expect(md).not.toContain('デッドリフト: 3 sets');
    expect(md).toContain('### 🔄 達成ルーティン (1件)');
  });

  it('separates multiple embedded workouts cleanly', () => {
    const multiWorkouts = [
      { title: 'フリーワークアウト', start_time: '2026-11-14T15:30:00', exercises: [] },
      { title: 'フリーワークアウト', start_time: '2026-11-14T03:52:00', exercises: [] },
    ];
    const md = formatDailyLogToObsidianMarkdown('2026-11-14', multiWorkouts, [], [], []);
    expect(md).toContain('### 🏋️ 本日のトレーニング (2件)');
    expect(md).toContain('![[2026-11-14_1530_フリーワークアウト]]\n\n![[2026-11-14_0352_フリーワークアウト]]');
  });

  it('falls back to exercise set count summary when useWorkoutEmbeds is false', () => {
    const md = formatDailyLogToObsidianMarkdown(
      '2026-11-15',
      sampleWorkouts,
      [],
      [],
      [],
      undefined,
      undefined,
      { useWorkoutEmbeds: false }
    );

    expect(md).toContain('- **フリーワークアウト** (11:15)');
    expect(md).toContain('  - デッドリフト: 3 sets');
    expect(md).not.toContain('![[2026-11-15_1115_フリーワークアウト]]');
  });
});
