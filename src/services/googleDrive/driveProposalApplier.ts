import {
  addCustomExercise,
  addRoutine,
  getExercises,
  getRoutines,
  getSettings,
  saveSetting,
  updateRoutine,
} from '../../db/database';
import { Exercise, RoutineExercise, RoutineSet } from '../../db/types';
import { useLifelogStore } from '../../store/lifelogStore';
import { useSettingsStore } from '../../store/settingsStore';
import { normalizeToDateISO } from '../obsidian/obsidianFormatter';
import { withDriveTriggerSuppressed } from './driveSyncTrigger';
import {
  AiAgentProposalsPayload,
  AppliedProposalHistoryEntry,
  GoogleDriveSyncSettings,
  ProposalSummaryCounts,
  TrainerAdviceEntry,
} from './types';

export const DRIVE_ADVICES_SETTING_KEY = 'google_drive_ai_advices';
export const DRIVE_APPLIED_HISTORY_SETTING_KEY = 'google_drive_applied_history';

// ZikanKanri.js の初期ピース定義と同期（未設定状態で AI がピース追加しても既存ピースが消えないようにする）
const BASE_DEFAULT_ACTIVITY_PIECES = [
  { name: '睡眠', icon: '🛌', type: 'large', category: 'maintain', duration: 480, snap: 15, color: 'blue' },
  { name: '仕事', icon: '💼', type: 'large', category: 'invest', duration: 480, snap: 15, color: 'amber' },
  { name: '学習', icon: '💻', type: 'large', category: 'invest', duration: 120, snap: 15, color: 'amber' },
  { name: '筋トレ', icon: '🏋️', type: 'medium', category: 'invest', duration: 60, snap: 5, color: 'amber' },
  { name: '食事', icon: '🍽️', type: 'medium', category: 'maintain', duration: 45, snap: 5, color: 'blue' },
  { name: '入浴', icon: '🛁', type: 'medium', category: 'maintain', duration: 30, snap: 5, color: 'blue' },
  { name: '移動', icon: '🚶', type: 'medium', category: 'maintain', duration: 25, snap: 5, color: 'blue' },
  { name: '家事', icon: '🧹', type: 'medium', category: 'maintain', duration: 30, snap: 5, color: 'blue' },
  { name: '休憩', icon: '☕', type: 'medium', category: 'maintain', duration: 20, snap: 5, color: 'blue' },
  { name: '歯磨き', icon: '🪥', type: 'small', category: 'maintain', duration: 3, snap: 1, color: 'blue' },
  { name: 'ストレッチ', icon: '🧘', type: 'small', category: 'maintain', duration: 10, snap: 1, color: 'blue' },
  { name: '15分タスク', icon: '⚡', type: 'small', category: 'invest', duration: 15, snap: 5, color: 'amber' },
  { name: '日記', icon: '📝', type: 'small', category: 'invest', duration: 5, snap: 1, color: 'amber' },
  { name: 'SNS', icon: '📱', type: 'medium', category: 'drift', duration: 30, snap: 5, color: 'purple' },
  { name: '動画', icon: '▶️', type: 'medium', category: 'drift', duration: 45, snap: 5, color: 'purple' },
  { name: 'ダラダラ', icon: '🌫️', type: 'medium', category: 'drift', duration: 30, snap: 5, color: 'purple' },
];

function safeParseArray(raw?: string): any[] {
  if (!raw) return [];
  try {
    let parsed = JSON.parse(raw);
    if (typeof parsed === 'string') {
      parsed = JSON.parse(parsed);
    }
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function generateCompactId(prefix = 'ai'): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

/**
 * 文字列（Markdownコードブロック混入含む）から AiAgentProposalsPayload を安全にパース・正規化する
 */
export function parseProposalsJson(rawText: string): AiAgentProposalsPayload | null {
  if (!rawText || !rawText.trim()) return null;

  let cleaned = rawText.trim();
  const fenced = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced && fenced[1]) {
    cleaned = fenced[1].trim();
  }

  const parsed = JSON.parse(cleaned);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('提案JSONはオブジェクト形式である必要があります');
  }

  const proposalId =
    typeof parsed.proposalId === 'string' && parsed.proposalId.trim()
      ? parsed.proposalId.trim()
      : `prop_${parsed.updatedAt || Date.now()}`;
  const updatedAt =
    typeof parsed.updatedAt === 'string' && parsed.updatedAt.trim()
      ? parsed.updatedAt.trim()
      : new Date().toISOString();

  return {
    schemaVersion: typeof parsed.schemaVersion === 'number' ? parsed.schemaVersion : 1,
    proposalId,
    updatedAt,
    agentName: typeof parsed.agentName === 'string' ? parsed.agentName : undefined,
    status: parsed.status,
    appliedAt: parsed.appliedAt,
    trainerAdvice: parsed.trainerAdvice,
    workoutMenus: Array.isArray(parsed.workoutMenus) ? parsed.workoutMenus : undefined,
    dailyRoutines: Array.isArray(parsed.dailyRoutines) ? parsed.dailyRoutines : undefined,
    timeManagement:
      parsed.timeManagement && typeof parsed.timeManagement === 'object'
        ? parsed.timeManagement
        : undefined,
    memoryUpdates: Array.isArray(parsed.memoryUpdates) ? parsed.memoryUpdates : undefined,
  };
}

export function normalizeAdviceEntries(
  payload: AiAgentProposalsPayload
): TrainerAdviceEntry[] {
  const raw = payload.trainerAdvice;
  if (!raw) return [];
  const receivedAt = new Date().toISOString();

  if (typeof raw === 'string') {
    const msg = raw.trim();
    if (!msg) return [];
    return [
      {
        id: `${payload.proposalId}_adv_0`,
        title: payload.agentName || 'AIトレーナーからのアドバイス',
        message: msg,
        proposalId: payload.proposalId,
        receivedAt,
      },
    ];
  }

  type AdviceItemObj = {
    id?: string;
    title?: string;
    date?: string;
    summary?: string;
    message: string;
    focusAreas?: string[];
  };
  const arr: AdviceItemObj[] = Array.isArray(raw) ? raw : [raw];
  return arr
    .filter((item) => item && typeof item.message === 'string' && item.message.trim().length > 0)
    .map((item, idx) => ({
      id: item.id || `${payload.proposalId}_adv_${idx}`,
      date: item.date,
      title: item.title || payload.agentName || 'AIトレーナーからのアドバイス',
      summary: item.summary,
      message: item.message.trim(),
      focusAreas: Array.isArray(item.focusAreas) ? item.focusAreas : undefined,
      proposalId: payload.proposalId,
      receivedAt,
    }));
}

export function summarizeProposal(payload: AiAgentProposalsPayload): {
  counts: ProposalSummaryCounts;
  previewSummary: string;
} {
  const adviceList = normalizeAdviceEntries(payload);
  const workoutMenusCount = payload.workoutMenus?.length ?? 0;
  const dailyRoutinesCount = payload.dailyRoutines?.length ?? 0;
  const timePlansCount = payload.timeManagement?.plans?.length ?? 0;
  const defaultSchedulesCount = payload.timeManagement?.defaultSchedules?.length ?? 0;
  const templatesCount = payload.timeManagement?.templates?.length ?? 0;
  const piecesCount = payload.timeManagement?.pieces?.length ?? 0;
  const memoryUpdatesCount = payload.memoryUpdates?.length ?? 0;

  const counts: ProposalSummaryCounts = {
    adviceCount: adviceList.length,
    workoutMenusCount,
    dailyRoutinesCount,
    timePlansCount,
    defaultSchedulesCount,
    templatesCount,
    piecesCount,
    memoryUpdatesCount,
  };

  const parts: string[] = [];
  if (counts.adviceCount > 0) parts.push(`トレーナーアドバイス ${counts.adviceCount}件`);
  if (counts.workoutMenusCount > 0) parts.push(`筋トレメニュー ${counts.workoutMenusCount}件`);
  if (counts.dailyRoutinesCount > 0) parts.push(`デイリールーティン ${counts.dailyRoutinesCount}件`);
  const timeTotal =
    counts.timePlansCount +
    counts.defaultSchedulesCount +
    counts.templatesCount +
    counts.piecesCount;
  if (timeTotal > 0) {
    parts.push(`24時間管理提案 ${timeTotal}件`);
  }
  if (counts.memoryUpdatesCount > 0) parts.push(`AI記憶更新 ${counts.memoryUpdatesCount}件`);

  return {
    counts,
    previewSummary: parts.length > 0 ? parts.join(' / ') : '空の提案',
  };
}

export function isNewPendingProposal(
  payload: AiAgentProposalsPayload,
  settings: GoogleDriveSyncSettings
): boolean {
  if (!payload || payload.proposalId === 'template_initial_000') {
    return false;
  }
  // ステータスが明示的に applied / ignored の場合はスキップ
  if (payload.status === 'applied' || payload.status === 'ignored') {
    return false;
  }
  const { counts } = summarizeProposal(payload);
  const hasAnyContent =
    counts.adviceCount +
      counts.workoutMenusCount +
      counts.dailyRoutinesCount +
      counts.timePlansCount +
      counts.defaultSchedulesCount +
      counts.templatesCount +
      counts.piecesCount +
      counts.memoryUpdatesCount >
    0;
  if (!hasAnyContent) return false;

  if (
    settings.lastAppliedProposalId === payload.proposalId &&
    settings.lastAppliedUpdatedAt === payload.updatedAt
  ) {
    return false;
  }
  return true;
}

export async function loadSavedAdvices(): Promise<TrainerAdviceEntry[]> {
  const settings = await getSettings();
  return safeParseArray(settings[DRIVE_ADVICES_SETTING_KEY]) as TrainerAdviceEntry[];
}

export async function loadAppliedHistory(): Promise<AppliedProposalHistoryEntry[]> {
  const settings = await getSettings();
  return safeParseArray(
    settings[DRIVE_APPLIED_HISTORY_SETTING_KEY]
  ) as AppliedProposalHistoryEntry[];
}

/**
 * 提案内容をローカル SQLite / Zustand へ冪等に反映する
 */
export async function applyAiAgentProposalToApp(
  payload: AiAgentProposalsPayload
): Promise<{
  counts: ProposalSummaryCounts;
  summary: string;
  advices: TrainerAdviceEntry[];
  appliedHistory: AppliedProposalHistoryEntry[];
  workoutMenuTouched: boolean;
  dailyRoutineTouched: boolean;
  timeManagementTouched: boolean;
}> {
  const { counts, previewSummary } = summarizeProposal(payload);

  return await withDriveTriggerSuppressed(async () => {
    const allSettings = await getSettings();
    let workoutMenuTouched = false;
    let dailyRoutineTouched = false;
    let timeManagementTouched = false;

    // 1. トレーナーアドバイスの保存
    const newAdvices = normalizeAdviceEntries(payload);
    let mergedAdvices = safeParseArray(
      allSettings[DRIVE_ADVICES_SETTING_KEY]
    ) as TrainerAdviceEntry[];
    if (newAdvices.length > 0) {
      const existingIds = new Set(mergedAdvices.map((a) => a.id));
      const fresh = newAdvices.filter((a) => !existingIds.has(a.id));
      mergedAdvices = [...fresh, ...mergedAdvices].slice(0, 30);
      await saveSetting(DRIVE_ADVICES_SETTING_KEY, JSON.stringify(mergedAdvices));
    }

    // 2. 筋トレメニュー (workout_routines) の追加・更新
    if (payload.workoutMenus && payload.workoutMenus.length > 0) {
      const existingExercises = (await getExercises()) as Exercise[];
      const exerciseByName = new Map<string, Exercise>(
        existingExercises.map((e) => [e.name.trim().toLowerCase(), e])
      );
      const existingRoutines = await getRoutines();

      for (const menu of payload.workoutMenus) {
        if (!menu?.title || !Array.isArray(menu.exercises) || menu.exercises.length === 0) {
          continue;
        }
        const resolvedExercises: RoutineExercise[] = [];

        for (const proposedEx of menu.exercises) {
          const exName = (proposedEx.name || '').trim();
          if (!exName) continue;
          const lower = exName.toLowerCase();

          let matched = exerciseByName.get(lower);
          if (!matched) {
            for (const candidate of existingExercises) {
              const candLower = candidate.name.toLowerCase();
              if (candLower.includes(lower) || lower.includes(candLower)) {
                matched = candidate;
                break;
              }
            }
          }

          let exId: number;
          let exObj = matched;
          if (!exObj) {
            exId = await addCustomExercise(
              exName,
              proposedEx.muscle_group || 'その他',
              proposedEx.equipment || 'その他',
              !!proposedEx.is_unilateral,
              proposedEx.default_variation ?? null,
              proposedEx.default_stance ?? null
            );
            exObj = {
              id: exId,
              name: exName,
              muscle_group: proposedEx.muscle_group || 'その他',
              equipment: proposedEx.equipment || 'その他',
              is_unilateral: proposedEx.is_unilateral ? 1 : 0,
              default_variation: proposedEx.default_variation ?? null,
              default_stance: proposedEx.default_stance ?? null,
              weight_step: proposedEx.weight_step ?? 2.5,
              rest_seconds: proposedEx.rest_seconds ?? null,
            };
            existingExercises.push(exObj);
            exerciseByName.set(lower, exObj);
          }

          const sets: RoutineSet[] =
            Array.isArray(proposedEx.sets) && proposedEx.sets.length > 0
              ? proposedEx.sets.map((s, idx) => ({
                  set_number: s.set_number ?? idx + 1,
                  reps: s.reps ?? null,
                  weight: s.weight ?? null,
                  rpe: s.rpe ?? null,
                  speed: s.speed ?? null,
                  incline: s.incline ?? null,
                  side: s.side ?? null,
                  variation: s.variation ?? null,
                  stance: s.stance ?? null,
                }))
              : [
                  { set_number: 1, reps: 10, weight: null, rpe: null },
                  { set_number: 2, reps: 10, weight: null, rpe: null },
                  { set_number: 3, reps: 10, weight: null, rpe: null },
                ];

          resolvedExercises.push({
            id: exObj.id,
            name: exObj.name,
            is_unilateral: exObj.is_unilateral,
            equipment: exObj.equipment,
            muscle_group: exObj.muscle_group,
            default_variation: proposedEx.default_variation ?? exObj.default_variation,
            default_stance: proposedEx.default_stance ?? exObj.default_stance,
            weight_step: proposedEx.weight_step ?? exObj.weight_step,
            rest_seconds: proposedEx.rest_seconds ?? exObj.rest_seconds,
            sets,
          });
        }

        if (resolvedExercises.length === 0) continue;

        const cleanTitle = menu.title.trim();
        const existingTarget =
          menu.action === 'create'
            ? undefined
            : existingRoutines.find(
                (r) => r.title.trim().toLowerCase() === cleanTitle.toLowerCase()
              );

        if (existingTarget) {
          await updateRoutine(
            existingTarget.id,
            cleanTitle,
            menu.description ?? existingTarget.description ?? '',
            resolvedExercises
          );
        } else {
          await addRoutine(cleanTitle, menu.description || '', resolvedExercises);
        }
        workoutMenuTouched = true;
      }
    }

    // 3. デイリールーティン (routine_tracker_data) の更新
    if (payload.dailyRoutines && payload.dailyRoutines.length > 0) {
      const currentDailyRoutines = safeParseArray(allSettings['routine_tracker_data']);

      for (const proposed of payload.dailyRoutines) {
        if (!proposed?.name || !Array.isArray(proposed.tasks) || proposed.tasks.length === 0) {
          continue;
        }
        const cleanName = proposed.name.trim();
        const newTasks = proposed.tasks
          .filter((t) => t && t.name)
          .map((t) => ({
            id: t.id || generateCompactId('task'),
            name: t.name.trim(),
            estimated_seconds: Math.max(10, Math.round(Number(t.estimated_seconds) || 60)),
            image: null,
          }));

        if (newTasks.length === 0) continue;

        const existingIndex =
          proposed.action === 'create'
            ? -1
            : currentDailyRoutines.findIndex(
                (r) =>
                  (proposed.id && r.id === proposed.id) ||
                  (typeof r.name === 'string' &&
                    r.name.trim().toLowerCase() === cleanName.toLowerCase())
              );

        if (existingIndex !== -1) {
          const prev = currentDailyRoutines[existingIndex];
          currentDailyRoutines[existingIndex] = {
            ...prev,
            name: cleanName,
            tasks: newTasks,
            auto_update_estimates:
              proposed.auto_update_estimates ?? prev.auto_update_estimates ?? true,
            auto_advance: proposed.auto_advance ?? prev.auto_advance ?? false,
            enable_vibration: proposed.enable_vibration ?? prev.enable_vibration ?? true,
            hidden: proposed.hidden ?? prev.hidden ?? false,
          };
        } else {
          currentDailyRoutines.push({
            id: proposed.id || generateCompactId('rt'),
            name: cleanName,
            tasks: newTasks,
            auto_update_estimates: proposed.auto_update_estimates ?? true,
            auto_advance: proposed.auto_advance ?? false,
            enable_vibration: proposed.enable_vibration ?? true,
            hidden: proposed.hidden ?? false,
            image: null,
            history: [],
          });
        }
        dailyRoutineTouched = true;
      }

      if (dailyRoutineTouched) {
        await saveSetting('routine_tracker_data', JSON.stringify(currentDailyRoutines));
        await useLifelogStore.getState().loadRoutineData();
      }
    }

    // 4. 24時間管理 (zikankanri_*) の更新
    if (payload.timeManagement) {
      const tm = payload.timeManagement;

      // 4-a. 予定 (zikankanri_plans)
      const safeDateISO = (d?: string | null): string => {
        if (!d) return '';
        return normalizeToDateISO(d) || '';
      };

      if ((tm.plans && tm.plans.length > 0) || (tm.replaceDates && tm.replaceDates.length > 0)) {
        let plans = safeParseArray(allSettings['zikankanri_plans']);
        const replaceDateSet = new Set<string>(
          (tm.replaceDates || []).map((d) => safeDateISO(d)).filter(Boolean)
        );
        for (const p of tm.plans || []) {
          if (p.replaceDatePlans && p.date) {
            const dIso = safeDateISO(p.date);
            if (dIso) replaceDateSet.add(dIso);
          }
        }

        if (replaceDateSet.size > 0) {
          plans = plans.filter((p) => {
            if (!p?.date) return true;
            const d = safeDateISO(p.date);
            if (!d || !replaceDateSet.has(d)) return true;
            // 既存の Google カレンダー予定やユーザー手動予定は原則残し、前回の AI 提案枠を置き換える
            return p.source !== 'ai_agent';
          });
        }

        for (const p of tm.plans || []) {
          if (!p?.date || !p?.start || !p?.end) continue;
          const dateISO = safeDateISO(p.date);
          if (!dateISO) continue;
          const primaryName =
            p.items && p.items.length > 0
              ? p.items[0].name
              : p.activity_name || 'AI提案予定';
          const items =
            p.items && p.items.length > 0
              ? p.items.map((it) => ({
                  name: it.name,
                  percent: it.percent ?? 100,
                  weight: it.weight,
                }))
              : [{ name: primaryName, percent: 100 }];

          const planObj = {
            id: p.id || generateCompactId('ai_plan'),
            date: dateISO,
            start: p.start,
            end: p.end,
            category: p.category || 'invest',
            items,
            memo: p.memo || '',
            source: 'ai_agent',
          };

          const dupIdx = plans.findIndex(
            (ex) =>
              (p.id && ex.id === p.id) ||
              (ex.source === 'ai_agent' &&
                safeDateISO(ex.date) === dateISO &&
                ex.start === p.start &&
                ex.end === p.end)
          );
          if (dupIdx !== -1) {
            plans[dupIdx] = { ...plans[dupIdx], ...planObj };
          } else {
            plans.push(planObj);
          }
        }

        await saveSetting('zikankanri_plans', JSON.stringify(plans));
        timeManagementTouched = true;
      }

      // 4-b. デフォルトスケジュール (zikankanri_default_schedules)
      if (tm.defaultSchedules && tm.defaultSchedules.length > 0) {
        const schedules = safeParseArray(allSettings['zikankanri_default_schedules']);
        for (const ds of tm.defaultSchedules) {
          if (!ds?.name || !Array.isArray(ds.data)) continue;
          const cleanName = ds.name.trim();
          const cleanData = ds.data
            .filter((s) => s && s.start && s.end)
            .map((s) => {
              const primaryName =
                s.items && s.items.length > 0
                  ? s.items[0].name
                  : s.activity_name || '活動';
              return {
                start: s.start,
                end: s.end,
                category: s.category || 'invest',
                items:
                  s.items && s.items.length > 0
                    ? s.items.map((it) => ({
                        name: it.name,
                        percent: it.percent ?? 100,
                        weight: it.weight,
                      }))
                    : [{ name: primaryName, percent: 100 }],
                memo: s.memo || '',
              };
            });

          if (cleanData.length === 0) continue;

          const idx = schedules.findIndex(
            (ex) =>
              (ds.id !== undefined && String(ex.id) === String(ds.id)) ||
              (typeof ex.name === 'string' &&
                ex.name.trim().toLowerCase() === cleanName.toLowerCase())
          );

          if (idx !== -1) {
            schedules[idx] = {
              ...schedules[idx],
              name: cleanName,
              days: Array.isArray(ds.days) ? ds.days : schedules[idx].days || [],
              data: cleanData,
              updatedAt: Date.now(),
            };
          } else {
            schedules.push({
              id: ds.id ?? Date.now() + Math.floor(Math.random() * 1000),
              name: cleanName,
              days: Array.isArray(ds.days) ? ds.days : [],
              data: cleanData,
              updatedAt: Date.now(),
            });
          }
          timeManagementTouched = true;
        }
        if (timeManagementTouched) {
          await saveSetting('zikankanri_default_schedules', JSON.stringify(schedules));
        }
      }

      // 4-c. テンプレート (zikankanri_templates)
      if (tm.templates && tm.templates.length > 0) {
        const templates = safeParseArray(allSettings['zikankanri_templates']);
        for (const tpl of tm.templates) {
          if (!tpl?.name || !Array.isArray(tpl.items)) continue;
          const cleanName = tpl.name.trim();
          const idx = templates.findIndex(
            (ex) =>
              (tpl.id !== undefined && String(ex.id) === String(tpl.id)) ||
              (typeof ex.name === 'string' &&
                ex.name.trim().toLowerCase() === cleanName.toLowerCase())
          );
          const entry = {
            id: tpl.id ?? generateCompactId('tpl'),
            name: cleanName,
            items: tpl.items,
            updatedAt: Date.now(),
          };
          if (idx !== -1) {
            templates[idx] = { ...templates[idx], ...entry };
          } else {
            templates.push(entry);
          }
          timeManagementTouched = true;
        }
        await saveSetting('zikankanri_templates', JSON.stringify(templates));
      }

      // 4-d. 活動ピース (zikankanri_pieces + zikankanri_tags)
      if (tm.pieces && tm.pieces.length > 0) {
        let pieces = safeParseArray(allSettings['zikankanri_pieces']);
        if (pieces.length === 0) {
          pieces = BASE_DEFAULT_ACTIVITY_PIECES.map((p) => ({ ...p }));
        }
        for (const piece of tm.pieces) {
          if (!piece?.name) continue;
          const cleanName = piece.name.trim();
          const idx = pieces.findIndex(
            (p) => typeof p.name === 'string' && p.name.trim() === cleanName
          );
          const formattedPiece = {
            name: cleanName,
            icon: piece.icon || '✨',
            type: piece.type || 'medium',
            category: piece.category || 'invest',
            duration: Number(piece.duration) || 30,
            snap: Number(piece.snap) || 5,
            color: piece.color || 'amber',
          };
          if (idx !== -1) {
            pieces[idx] = { ...pieces[idx], ...formattedPiece };
          } else {
            pieces.push(formattedPiece);
          }
          timeManagementTouched = true;
        }
        await saveSetting('zikankanri_pieces', JSON.stringify(pieces));
        await saveSetting(
          'zikankanri_tags',
          JSON.stringify(pieces.map((p) => p.name))
        );
      }

      if (timeManagementTouched) {
        const nowD = new Date();
        const todayISO = `${nowD.getFullYear()}-${String(nowD.getMonth() + 1).padStart(2, '0')}-${String(nowD.getDate()).padStart(2, '0')}`;
        await useLifelogStore.getState().loadTimeData(todayISO);
      }
    }

    // 5. AIコーチ記憶メモリ更新
    if (payload.memoryUpdates && payload.memoryUpdates.length > 0) {
      const currentMem = useSettingsStore.getState().settings.aiCompanionMemory || '';
      const existingLines = new Set(
        currentMem
          .split('\n')
          .map((l) => l.trim())
          .filter(Boolean)
      );
      const additions = payload.memoryUpdates
        .map((m) => (typeof m === 'string' ? m.trim() : ''))
        .filter((m) => m.length > 0 && !existingLines.has(m));

      if (additions.length > 0) {
        const mergedMemory = [currentMem.trim(), ...additions]
          .filter(Boolean)
          .join('\n');
        await useSettingsStore.getState().setAiCompanionMemory(mergedMemory);
      }
    }

    // 6. 適用履歴の保存
    const appliedAt = new Date().toISOString();
    const prevHistory = safeParseArray(
      allSettings[DRIVE_APPLIED_HISTORY_SETTING_KEY]
    ) as AppliedProposalHistoryEntry[];
    const historyEntry: AppliedProposalHistoryEntry = {
      proposalId: payload.proposalId,
      updatedAt: payload.updatedAt,
      appliedAt,
      agentName: payload.agentName,
      summary: previewSummary,
      counts,
    };
    const nextHistory = [
      historyEntry,
      ...prevHistory.filter((h) => h.proposalId !== payload.proposalId),
    ].slice(0, 30);
    await saveSetting(DRIVE_APPLIED_HISTORY_SETTING_KEY, JSON.stringify(nextHistory));

    return {
      counts,
      summary: previewSummary,
      advices: mergedAdvices,
      appliedHistory: nextHistory,
      workoutMenuTouched,
      dailyRoutineTouched,
      timeManagementTouched,
    };
  });
}
