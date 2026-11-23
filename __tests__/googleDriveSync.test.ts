import * as accountSyncService from '../src/services/accountSyncService';
import {
  authorizeGoogleDrive,
  createDriveFolder,
  getDriveAccessToken,
  GOOGLE_DRIVE_SCOPE,
  listDriveFolders,
} from '../src/services/googleDrive/driveApiClient';
import {
  buildAgentGuideMarkdown,
  buildInitialProposalTemplate,
} from '../src/services/googleDrive/drivePayloadBuilder';
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
import {
  checkDriveForProposals,
  saveAgentGuideToDriveFolder,
  selectDriveSyncFolder,
} from '../src/services/googleDriveSyncService';
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
const mockBodyLogs: Record<string, any> = {};

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
  getBodyLogByDate: jest.fn(async (date: string) => mockBodyLogs[date] || null),
  upsertBodyLog: jest.fn(async (log: any) => {
    const existing = mockBodyLogs[log.date];
    if (existing) {
      mockBodyLogs[log.date] = {
        ...existing,
        weight: log.weight !== undefined ? log.weight : existing.weight,
        body_fat_rate: log.body_fat_rate !== undefined ? log.body_fat_rate : existing.body_fat_rate,
        muscle_mass: log.muscle_mass !== undefined ? log.muscle_mass : existing.muscle_mass,
        lbm: log.lbm !== undefined ? log.lbm : existing.lbm,
        height: log.height !== undefined ? log.height : existing.height,
        neck: log.neck !== undefined ? log.neck : existing.neck,
        waist: log.waist !== undefined ? log.waist : existing.waist,
        hip: log.hip !== undefined ? log.hip : existing.hip,
        wrist: log.wrist !== undefined ? log.wrist : existing.wrist,
        ankle: log.ankle !== undefined ? log.ankle : existing.ankle,
        gender: log.gender || existing.gender || 'male',
        source: log.source || existing.source || 'manual',
        memo: log.memo !== undefined ? log.memo : existing.memo,
      };
      return existing.id;
    }
    const created = {
      id: Object.keys(mockBodyLogs).length + 1,
      date: log.date,
      weight: log.weight ?? null,
      body_fat_rate: log.body_fat_rate ?? null,
      muscle_mass: log.muscle_mass ?? null,
      lbm: log.lbm ?? null,
      height: log.height ?? null,
      neck: log.neck ?? null,
      waist: log.waist ?? null,
      hip: log.hip ?? null,
      wrist: log.wrist ?? null,
      ankle: log.ankle ?? null,
      gender: log.gender || 'male',
      source: log.source || 'manual',
      memo: log.memo ?? null,
      created_at: Date.now(),
    };
    mockBodyLogs[log.date] = created;
    return created.id;
  }),
}));

const mockLoadBodyData = jest.fn().mockResolvedValue(undefined);
const mockLoadAllHistory = jest.fn().mockResolvedValue(undefined);
jest.mock('../src/store/bodyStore', () => ({
  useBodyStore: {
    getState: () => ({
      currentLog: null,
      loadBodyData: mockLoadBodyData,
      loadAllHistory: mockLoadAllHistory,
    }),
  },
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
    for (const d of Object.keys(mockBodyLogs)) {
      delete mockBodyLogs[d];
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

  test('drive.file のみ付与済みのアカウントは addScopes でフル Drive スコープへ昇格する', async () => {
    let currentUser: any = {
      user: { email: 'trainer@example.com' },
      scopes: ['email', 'profile', 'https://www.googleapis.com/auth/drive.file'],
    };

    const upgradedUser = {
      user: { email: 'trainer@example.com' },
      scopes: ['email', 'profile', GOOGLE_DRIVE_SCOPE],
    };

    const addScopesMock = jest.fn(async () => {
      currentUser = upgradedUser;
      return { type: 'success', data: upgradedUser };
    });

    const spy = jest.spyOn(accountSyncService, 'getGoogleSigninModule').mockReturnValue({
      GoogleSignin: {
        configure: jest.fn(),
        hasPlayServices: jest.fn(async () => true),
        getCurrentUser: jest.fn(() => currentUser),
        addScopes: addScopesMock,
        getTokens: jest.fn(async () => ({ accessToken: 'upgraded_token' })),
      },
    });

    try {
      const res = await authorizeGoogleDrive();
      expect(res.success).toBe(true);
      expect(addScopesMock).toHaveBeenCalledWith({
        scopes: [GOOGLE_DRIVE_SCOPE],
      });
    } finally {
      spy.mockRestore();
    }
  });

  test('listDriveFolders と createDriveFolder は root とサブフォルダを正しくリクエストする', async () => {
    const spy = jest.spyOn(accountSyncService, 'getGoogleSigninModule').mockReturnValue({
      GoogleSignin: {
        configure: jest.fn(),
        hasPlayServices: jest.fn(async () => true),
        getCurrentUser: jest.fn(() => ({
          user: { email: 'trainer@example.com' },
          scopes: ['email', 'profile', GOOGLE_DRIVE_SCOPE],
        })),
        getTokens: jest.fn(async () => ({ accessToken: 'drive_token_ok' })),
      },
    });

    const originalFetch = global.fetch;
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          files: [{ id: 'fld_1', name: 'Obsidian', mimeType: 'application/vnd.google-apps.folder' }],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          id: 'fld_new_root',
          name: 'MyRootSync',
          mimeType: 'application/vnd.google-apps.folder',
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          id: 'fld_new_child',
          name: 'TreNote',
          mimeType: 'application/vnd.google-apps.folder',
        }),
      });
    global.fetch = fetchMock as any;

    try {
      const folders = await listDriveFolders('root', false);
      expect(folders).toHaveLength(1);
      expect(folders[0].name).toBe('Obsidian');
      expect(decodeURIComponent(fetchMock.mock.calls[0][0])).toContain("'root' in parents");

      await createDriveFolder('MyRootSync', 'root', false);
      const rootCreateBody = JSON.parse(fetchMock.mock.calls[1][1].body);
      expect(rootCreateBody).toEqual({
        name: 'MyRootSync',
        mimeType: 'application/vnd.google-apps.folder',
      });

      await createDriveFolder('TreNote', 'fld_1', false);
      const childCreateBody = JSON.parse(fetchMock.mock.calls[2][1].body);
      expect(childCreateBody).toEqual({
        name: 'TreNote',
        mimeType: 'application/vnd.google-apps.folder',
        parents: ['fld_1'],
      });
    } finally {
      global.fetch = originalFetch;
      spy.mockRestore();
    }
  });

  test('selectDriveSyncFolder と saveAgentGuideToDriveFolder は指定フォルダに AI_AGENT_GUIDE.md を保存し既存提案は上書きしない', async () => {
    const spy = jest.spyOn(accountSyncService, 'getGoogleSigninModule').mockReturnValue({
      GoogleSignin: {
        configure: jest.fn(),
        hasPlayServices: jest.fn(async () => true),
        getCurrentUser: jest.fn(() => ({
          user: { email: 'trainer@example.com' },
          scopes: ['email', 'profile', GOOGLE_DRIVE_SCOPE],
        })),
        getTokens: jest.fn(async () => ({ accessToken: 'drive_token_ok' })),
      },
    });

    const originalFetch = global.fetch;
    const fetchMock = jest
      .fn()
      // selectDriveSyncFolder: find GUIDE_MD (ensureGuideAndTemplateInFolder) -> none
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ files: [] }),
      })
      // selectDriveSyncFolder: find GUIDE_MD (upsertTextFileInFolder pre-check when !existingFileId) -> none
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ files: [] }),
      })
      // selectDriveSyncFolder: create GUIDE_MD (POST)
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ id: 'guide_1', name: 'AI_AGENT_GUIDE.md' }),
      })
      // selectDriveSyncFolder: find PROPOSALS_JSON -> already exists
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          files: [{ id: 'prop_existing', name: 'ai_agent_proposals.json' }],
        }),
      })
      // saveAgentGuideToDriveFolder: ensureDriveFolder verifies folderId
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          id: 'fld_custom',
          name: 'MyAI',
          trashed: false,
          mimeType: 'application/vnd.google-apps.folder',
        }),
      })
      // saveAgentGuideToDriveFolder: find GUIDE_MD -> exists (guide_1)
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          files: [{ id: 'guide_1', name: 'AI_AGENT_GUIDE.md' }],
        }),
      })
      // saveAgentGuideToDriveFolder: PATCH guide_1
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ id: 'guide_1', name: 'AI_AGENT_GUIDE.md' }),
      })
      // saveAgentGuideToDriveFolder: find PROPOSALS_JSON -> exists
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          files: [{ id: 'prop_existing', name: 'ai_agent_proposals.json' }],
        }),
      });
    global.fetch = fetchMock as any;

    try {
      const sel = await selectDriveSyncFolder({
        id: 'fld_custom',
        name: 'MyAI',
        path: 'マイドライブ / Obsidian / MyAI',
      });
      expect(sel.guideSaved).toBe(true);
      expect(sel.settings.folderId).toBe('fld_custom');
      expect(sel.settings.connectedEmail).toBe('trainer@example.com');
      expect(fetchMock.mock.calls[2][1].method).toBe('POST');
      expect(fetchMock.mock.calls[2][1].body).toContain('マイドライブ / Obsidian / MyAI');

      const manual = await saveAgentGuideToDriveFolder();
      expect(manual.success).toBe(true);
      expect(manual.folderPath).toBe('マイドライブ / Obsidian / MyAI');
      expect(fetchMock.mock.calls[6][1].method).toBe('PATCH');
      // ai_agent_proposals.json への書き込み（上書き）は呼ばれていないこと（合計8コール）
      expect(fetchMock).toHaveBeenCalledTimes(8);
    } finally {
      global.fetch = originalFetch;
      spy.mockRestore();
    }
  });

  test('bodyComposition を含む AI 提案を正しくパース・要約・新着判定し、ガイドにも仕様が含まれる', () => {
    const rawSingle = JSON.stringify({
      proposalId: 'prop_body_001',
      updatedAt: '2026-11-23T08:00:00+09:00',
      status: 'pending',
      bodyComposition: {
        date: '2026/11/23',
        weight: 70.2,
        body_fat_rate: 14.5,
      },
    });

    const parsed = parseProposalsJson(rawSingle);
    expect(parsed).not.toBeNull();
    expect(Array.isArray(parsed?.bodyComposition)).toBe(true);
    expect(parsed?.bodyComposition).toHaveLength(1);

    const { counts, previewSummary } = summarizeProposal(parsed!);
    expect(counts.bodyCompositionCount).toBe(1);
    expect(previewSummary).toContain('体組成記録 1件');
    expect(isNewPendingProposal(parsed!, DEFAULT_GOOGLE_DRIVE_SYNC_SETTINGS)).toBe(true);

    const template = buildInitialProposalTemplate();
    expect(Array.isArray(template.bodyComposition)).toBe(true);
    expect(buildAgentGuideMarkdown()).toContain('"bodyComposition"');
  });

  test('applyAiAgentProposalToApp は bodyComposition の upsert・LBM自動算出・replace・不正値除外を正しく行う', async () => {
    mockBodyLogs['2026-11-22'] = {
      id: 10,
      date: '2026-11-22',
      weight: 71.0,
      body_fat_rate: 15.0,
      muscle_mass: 33.0,
      lbm: 60.4,
      height: 175,
      wrist: 17.2,
      ankle: 22.0,
      gender: 'male',
      source: 'manual',
      memo: '既存メモ',
      created_at: 1700000000000,
    };

    mockBodyLogs['2026-11-21'] = {
      id: 9,
      date: '2026-11-21',
      weight: 72.0,
      body_fat_rate: 16.0,
      muscle_mass: 33.1,
      lbm: 60.5,
      height: 175,
      neck: 38.0,
      waist: 80.0,
      gender: 'male',
      source: 'manual',
      memo: '消えるメモ',
      created_at: 1699900000000,
    };

    const payload: AiAgentProposalsPayload = {
      proposalId: 'prop_body_apply_001',
      updatedAt: '2026-11-23T09:00:00+09:00',
      status: 'pending',
      bodyComposition: [
        // 1. upsert: 既存 height/wrist/ankle/memo を保持しつつ、weight更新に伴い lbm を自動再計算
        {
          date: '2026/11/22',
          weight: 70.0,
          waist: 78.5,
        },
        // 2. replace: 未指定項目を null にクリア
        {
          date: '2026-11-21',
          action: 'replace',
          weight: 71.5,
          body_fat_rate: 15.5,
        },
        // 3. 新規日のフルデータ
        {
          date: '2026-11-23',
          weight: 69.8,
          body_fat_rate: 14.4,
          muscle_mass: 33.5,
          height: 175,
          memo: 'AI計測同期',
        },
        // 4. 異常値・不正日付はスキップ
        {
          date: 'invalid-date',
          weight: 70,
        },
        {
          date: '2026-11-20',
          weight: -50,
        },
      ],
    };

    const res = await applyAiAgentProposalToApp(payload);
    expect(res.bodyCompositionTouched).toBe(true);

    // 11/22 upsert 確認
    expect(mockBodyLogs['2026-11-22'].weight).toBe(70);
    expect(mockBodyLogs['2026-11-22'].body_fat_rate).toBe(15);
    expect(mockBodyLogs['2026-11-22'].lbm).toBe(59.5);
    expect(mockBodyLogs['2026-11-22'].height).toBe(175);
    expect(mockBodyLogs['2026-11-22'].wrist).toBe(17.2);
    expect(mockBodyLogs['2026-11-22'].waist).toBe(78.5);
    expect(mockBodyLogs['2026-11-22'].memo).toBe('既存メモ');
    expect(mockBodyLogs['2026-11-22'].source).toBe('ai_agent');

    // 11/21 replace 確認
    expect(mockBodyLogs['2026-11-21'].weight).toBe(71.5);
    expect(mockBodyLogs['2026-11-21'].body_fat_rate).toBe(15.5);
    expect(mockBodyLogs['2026-11-21'].lbm).toBe(60.4);
    expect(mockBodyLogs['2026-11-21'].muscle_mass).toBeNull();
    expect(mockBodyLogs['2026-11-21'].waist).toBeNull();
    expect(mockBodyLogs['2026-11-21'].memo).toBeNull();
    expect(mockBodyLogs['2026-11-21'].source).toBe('ai_agent');

    // 11/23 新規日確認
    expect(mockBodyLogs['2026-11-23'].weight).toBe(69.8);
    expect(mockBodyLogs['2026-11-23'].body_fat_rate).toBe(14.4);
    expect(mockBodyLogs['2026-11-23'].lbm).toBe(59.7);
    expect(mockBodyLogs['2026-11-23'].memo).toBe('AI計測同期');
    expect(mockBodyLogs['2026-11-23'].source).toBe('ai_agent');

    // 不正データは保存されていないこと
    expect(mockBodyLogs['2026-11-20']).toBeUndefined();

    // body_last_measurements と bodyStore リフレッシュ確認
    const savedMeas = JSON.parse(mockSavedSettings['body_last_measurements']);
    expect(savedMeas.waist).toBe(78.5);
    expect(savedMeas.height).toBe(175);
    expect(mockLoadBodyData).toHaveBeenCalledWith('2026-11-23');
  });
});
