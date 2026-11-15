import * as accountSyncService from '../src/services/accountSyncService';
import {
  authorizeGoogleDrive,
  getDriveAccessToken,
  GOOGLE_DRIVE_SCOPE,
} from '../src/services/googleDrive/driveApiClient';
import {
  applyAiAgentProposalToApp,
  isNewPendingProposal,
  normalizeAdviceEntries,
  parseProposalsJson,
  summarizeProposal,
} from '../src/services/googleDrive/driveProposalApplier';
import {
  registerDriveSyncHandlers,
  triggerDebouncedDriveUpload,
  withDriveTriggerSuppressed,
} from '../src/services/googleDrive/driveSyncTrigger';
import {
  AiAgentProposalsPayload,
  DEFAULT_GOOGLE_DRIVE_SYNC_SETTINGS,
  GoogleDriveSyncSettings,
} from '../src/services/googleDrive/types';
import { checkDriveForProposals } from '../src/services/googleDriveSyncService';
import { useLifelogStore } from '../src/store/lifelogStore';
import { useSettingsStore } from '../src/store/settingsStore';

jest.mock('expo-document-picker', () => ({
  getDocumentAsync: jest.fn(),
}));

jest.mock('expo-file-system/legacy', () => ({
  documentDirectory: 'file:///mock-doc/',
  getInfoAsync: jest.fn(async () => ({ exists: false })),
  readAsStringAsync: jest.fn(async () => ''),
  writeAsStringAsync: jest.fn(async () => undefined),
  deleteAsync: jest.fn(async () => undefined),
}));

const mockSavedSettings: Record<string, string> = {};

jest.mock('../src/db/database', () => ({
  getSettings: jest.fn(async () => ({ ...mockSavedSettings })),
  saveSetting: jest.fn(async (key: string, value: string) => {
    mockSavedSettings[key] = value;
  }),
  getExercises: jest.fn(async () => [
    { id: 1, name: 'ベンチプレス', muscle_group: '胸', equipment: 'バーベル', weight_step: 2.5 },
  ]),
  addCustomExercise: jest.fn(async () => 99),
  getRoutines: jest.fn(async () => [
    { id: 10, title: '既存の胸トレ', description: '旧メニュー', exercises: [] },
  ]),
  addRoutine: jest.fn(async () => undefined),
  updateRoutine: jest.fn(async () => undefined),
}));

jest.mock('../src/store/lifelogStore', () => {
  const loadRoutineData = jest.fn().mockResolvedValue(undefined);
  const loadTimeData = jest.fn().mockResolvedValue(undefined);
  return {
    useLifelogStore: {
      getState: () => ({
        loadRoutineData,
        loadTimeData,
      }),
    },
  };
});

jest.mock('../src/store/settingsStore', () => {
  const state = {
    settings: {
      aiCompanionMemory: '既存の記憶',
    },
    setAiCompanionMemory: jest.fn(async (memory: string) => {
      state.settings.aiCompanionMemory = memory;
    }),
  };
  return {
    useSettingsStore: {
      getState: () => state,
    },
  };
});

describe('Google Drive AI双方向同期ロジック', () => {
  beforeEach(() => {
    for (const k of Object.keys(mockSavedSettings)) {
      delete mockSavedSettings[k];
    }
    jest.clearAllMocks();
  });

  test('Markdownコードフェンス付きの提案JSONを正しくパースする', () => {
    const raw = `\`\`\`json
    {
      "proposalId": "prop_001",
      "updatedAt": "2026-11-15T10:00:00Z",
      "status": "pending",
      "trainerAdvice": "睡眠をあと30分増やしましょう"
    }
    \`\`\``;
    const parsed = parseProposalsJson(raw);
    expect(parsed).not.toBeNull();
    expect(parsed?.proposalId).toBe('prop_001');
    expect(parsed?.status).toBe('pending');
    expect(normalizeAdviceEntries(parsed!).length).toBe(1);
    expect(normalizeAdviceEntries(parsed!)[0].message).toBe('睡眠をあと30分増やしましょう');
  });

  test('未適用・新規判定はテンプレートや適用済み提案を正しく除外する', () => {
    const settings: GoogleDriveSyncSettings = {
      ...DEFAULT_GOOGLE_DRIVE_SYNC_SETTINGS,
      lastAppliedProposalId: 'prop_001',
      lastAppliedUpdatedAt: '2026-11-15T10:00:00Z',
    };

    const templatePayload: AiAgentProposalsPayload = {
      proposalId: 'template_initial_000',
      updatedAt: '2026-11-15T09:00:00Z',
      status: 'pending',
      trainerAdvice: 'sample',
    };
    expect(isNewPendingProposal(templatePayload, settings)).toBe(false);

    const sameAppliedPayload: AiAgentProposalsPayload = {
      proposalId: 'prop_001',
      updatedAt: '2026-11-15T10:00:00Z',
      status: 'pending',
      trainerAdvice: 'hello',
    };
    expect(isNewPendingProposal(sameAppliedPayload, settings)).toBe(false);

    const updatedPayload: AiAgentProposalsPayload = {
      ...sameAppliedPayload,
      updatedAt: '2026-11-15T11:00:00Z',
    };
    expect(isNewPendingProposal(updatedPayload, settings)).toBe(true);

    const statusAppliedPayload: AiAgentProposalsPayload = {
      proposalId: 'prop_002',
      updatedAt: '2026-11-15T12:00:00Z',
      status: 'applied',
      trainerAdvice: 'already applied',
    };
    expect(isNewPendingProposal(statusAppliedPayload, settings)).toBe(false);
  });

  test('withDriveTriggerSuppressed はバッチ反映中の再アップロード発火を抑止する', async () => {
    const triggerSpy = jest.fn();
    registerDriveSyncHandlers({
      triggerDebounced: triggerSpy,
      flushPending: async () => undefined,
    });

    triggerDebouncedDriveUpload('normal_change', 10000);
    expect(triggerSpy).toHaveBeenCalledTimes(1);

    await withDriveTriggerSuppressed(async () => {
      triggerDebouncedDriveUpload('suppressed_change', 10000);
    });
    expect(triggerSpy).toHaveBeenCalledTimes(1);

    triggerDebouncedDriveUpload('after_batch', 10000);
    expect(triggerSpy).toHaveBeenCalledTimes(2);
  });

  test('applyAiAgentProposalToApp は筋トレ・ルーティン履歴維持・24時間管理・AI記憶を冪等に反映する', async () => {
    const db = require('../src/db/database');
    mockSavedSettings['routine_tracker_data'] = JSON.stringify([
      {
        id: 'rt_morning',
        name: '朝ルーティン',
        tasks: [{ id: 't1', name: '白湯', estimated_seconds: 60, image: null }],
        history: [{ timestamp: 1700000000000, total_actual_seconds: 55, logs: [] }],
      },
    ]);
    mockSavedSettings['zikankanri_plans'] = JSON.stringify([
      {
        id: 'gcal_1',
        date: '2026-11-16',
        start: '10:00',
        end: '11:00',
        items: [{ name: '会議', percent: 100 }],
        source: 'google',
      },
      {
        id: 'ai_old_1',
        date: '2026-11-16',
        start: '19:00',
        end: '20:00',
        items: [{ name: '旧AI提案枠', percent: 100 }],
        source: 'ai_agent',
      },
    ]);

    const payload: AiAgentProposalsPayload = {
      proposalId: 'prop_20261115_test',
      updatedAt: '2026-11-15T12:00:00Z',
      status: 'pending',
      trainerAdvice: {
        title: '高強度胸Day',
        message: 'フォーム重視でいきましょう',
        focusAreas: ['胸トレ', '睡眠'],
      },
      workoutMenus: [
        {
          action: 'upsert',
          title: '既存の胸トレ',
          description: '新メニュー',
          exercises: [
            { name: 'ベンチプレス', sets: [{ set_number: 1, weight: 80, reps: 6, rpe: 8 }] },
            { name: 'ペックデックフライ', muscle_group: '胸', equipment: 'マシン' },
          ],
        },
      ],
      dailyRoutines: [
        {
          action: 'upsert',
          name: '朝ルーティン',
          tasks: [
            { name: '白湯', estimated_seconds: 60 },
            { name: 'モビリティ', estimated_seconds: 180 },
          ],
        },
      ],
      timeManagement: {
        replaceDates: ['2026-11-16'],
        plans: [
          {
            date: '2026-11-16',
            start: '18:30',
            end: '19:30',
            category: 'invest',
            items: [{ name: '筋トレ', percent: 100 }],
          },
        ],
        pieces: [{ name: 'リカバリー', icon: '🧘', duration: 15, snap: 5 }],
      },
      memoryUpdates: ['既存の記憶', '新規記憶: ベンチ80kg継続'],
    };

    const { counts } = summarizeProposal(payload);
    expect(counts.workoutMenusCount).toBe(1);
    expect(counts.dailyRoutinesCount).toBe(1);
    expect(counts.timePlansCount).toBe(1);

    const res = await applyAiAgentProposalToApp(payload);
    expect(res.workoutMenuTouched).toBe(true);
    expect(res.dailyRoutineTouched).toBe(true);
    expect(res.timeManagementTouched).toBe(true);

    // 未登録種目がカスタム作成され、既存タイトルルーティンが更新されること
    expect(db.addCustomExercise).toHaveBeenCalledWith(
      'ペックデックフライ',
      '胸',
      'マシン',
      false,
      null,
      null
    );
    expect(db.updateRoutine).toHaveBeenCalledTimes(1);

    // デイリールーティンの過去履歴が消えずにタスク更新されること
    const savedRoutines = JSON.parse(mockSavedSettings['routine_tracker_data']);
    expect(savedRoutines).toHaveLength(1);
    expect(savedRoutines[0].tasks).toHaveLength(2);
    expect(savedRoutines[0].history).toHaveLength(1);
    expect(useLifelogStore.getState().loadRoutineData).toHaveBeenCalledTimes(1);

    // Google予定は残り、古いai_agent予定のみ置き換わり、新しいAI予定が入ること
    const savedPlans = JSON.parse(mockSavedSettings['zikankanri_plans']);
    expect(savedPlans.some((p: any) => p.id === 'gcal_1')).toBe(true);
    expect(savedPlans.some((p: any) => p.id === 'ai_old_1')).toBe(false);
    expect(savedPlans.some((p: any) => p.start === '18:30' && p.source === 'ai_agent')).toBe(true);

    // 活動ピース追加時にデフォルト16種目が失われないこと
    const savedPieces = JSON.parse(mockSavedSettings['zikankanri_pieces']);
    expect(savedPieces.length).toBeGreaterThanOrEqual(17);
    expect(savedPieces.some((p: any) => p.name === 'リカバリー')).toBe(true);

    // メモリが重複なく追記されること
    expect(useSettingsStore.getState().settings.aiCompanionMemory).toBe(
      '既存の記憶\n新規記憶: ベンチ80kg継続'
    );
  });

  test('authorizeGoogleDrive と getDriveAccessToken の同時呼び出しは直列化され ASYNC_OP_IN_PROGRESS を起こさない', async () => {
    let activeNativeOp = false;
    let overlapCount = 0;

    const runSerializedCheck = async <T>(fn: () => Promise<T>): Promise<T> => {
      if (activeNativeOp) {
        overlapCount += 1;
        const err: any = new Error(
          'Warning: previous promise did not settle and was overwritten. ASYNC_OP_IN_PROGRESS'
        );
        err.code = 'ASYNC_OP_IN_PROGRESS';
        throw err;
      }
      activeNativeOp = true;
      try {
        await new Promise((resolve) => setTimeout(resolve, 15));
        return await fn();
      } finally {
        activeNativeOp = false;
      }
    };

    const mockUser = {
      user: { email: 'trainer@example.com' },
      scopes: ['email', 'profile', GOOGLE_DRIVE_SCOPE],
    };
    let signedInUser: any = null;

    const fakeGoogleSignin = {
      configure: jest.fn(),
      hasPlayServices: jest.fn(async () => true),
      getCurrentUser: jest.fn(() => signedInUser),
      signOut: jest.fn(async () => {
        await runSerializedCheck(async () => {
          signedInUser = null;
        });
      }),
      signIn: jest.fn(async () =>
        runSerializedCheck(async () => {
          signedInUser = mockUser;
          return { type: 'success', data: mockUser };
        })
      ),
      signInSilently: jest.fn(async () =>
        runSerializedCheck(async () => ({
          type: 'success',
          data: signedInUser ?? mockUser,
        }))
      ),
      addScopes: jest.fn(),
      getTokens: jest.fn(async () =>
        runSerializedCheck(async () => ({
          idToken: 'id_tok_123',
          accessToken: 'access_tok_123',
        }))
      ),
      clearCachedAccessToken: jest.fn(),
    };

    const spy = jest
      .spyOn(accountSyncService, 'getGoogleSigninModule')
      .mockReturnValue({ GoogleSignin: fakeGoogleSignin });

    try {
      const [authRes, tokenRes] = await Promise.all([
        authorizeGoogleDrive(),
        getDriveAccessToken({ interactive: false }),
      ]);

      expect(overlapCount).toBe(0);
      expect(authRes.success).toBe(true);
      expect(authRes.email).toBe('trainer@example.com');
      expect(tokenRes.accessToken).toBe('access_tok_123');
    } finally {
      spy.mockRestore();
    }
  });

  test('未連携（connectedEmail未設定）の状態で非対話チェックが走っても getTokens を呼ばずスキップする', async () => {
    mockSavedSettings['google_drive_sync_settings'] = JSON.stringify({
      ...DEFAULT_GOOGLE_DRIVE_SYNC_SETTINGS,
      enabled: true,
      autoDownload: true,
      connectedEmail: undefined,
    });

    const getTokensMock = jest.fn();
    const spy = jest.spyOn(accountSyncService, 'getGoogleSigninModule').mockReturnValue({
      GoogleSignin: {
        configure: jest.fn(),
        getCurrentUser: jest.fn(() => null),
        signInSilently: jest.fn(),
        getTokens: getTokensMock,
      },
    });

    try {
      const res = await checkDriveForProposals({
        interactive: false,
        force: true,
        reason: 'app_active',
      });
      expect(res.status).toBe('skipped');
      expect(getTokensMock).not.toHaveBeenCalled();
    } finally {
      spy.mockRestore();
    }
  });
});
