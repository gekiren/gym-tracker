import {
  getAllBodyLogs,
  getAllHabitLogs,
  getAllMealLogs,
  getAllTimeLogs,
  getAllWaterLogs,
  getCaffeineLimit,
  getHabitItems,
  getNutritionGoals,
  getRoutines,
  getSettings,
  getWaterGoal,
  getWorkoutsWithStats,
  loadFullWorkoutData,
} from '../../db/database';
import { normalizeToDateISO } from '../obsidian/obsidianFormatter';
import { AiAgentProposalsPayload } from './types';

function toLocalDateISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function safeDateISO(val?: string | null): string {
  if (!val) return '';
  return normalizeToDateISO(val) || '';
}

function getDateDaysAgoISO(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return toLocalDateISO(d);
}

function safeJsonParse<T>(raw: string | undefined, fallback: T): T {
  if (!raw) return fallback;
  try {
    let parsed = JSON.parse(raw);
    if (typeof parsed === 'string') {
      parsed = JSON.parse(parsed);
    }
    return parsed as T;
  } catch {
    return fallback;
  }
}

export interface BuiltDriveExportBundle {
  exportedAt: string;
  markdownSummary: string;
  jsonContent: string;
  agentGuideMarkdown: string;
}

/**
 * アプリ内のトレーニング・栄養・水分・体組成・24時間管理・ルーティン・習慣・AIメモリを収集し、
 * AIエージェント用の Markdown サマリー、JSON エクスポート、ガイド文書を生成する。
 */
export async function buildDriveExportBundle(): Promise<BuiltDriveExportBundle> {
  const exportedAt = new Date().toISOString();
  const cutoff14ISO = getDateDaysAgoISO(14);
  const cutoff7ISO = getDateDaysAgoISO(7);

  const [
    allSettings,
    workoutsWithStats,
    workoutRoutines,
    bodyLogs,
    allMealLogs,
    nutritionGoals,
    allWaterLogs,
    waterGoal,
    caffeineLimit,
    allTimeLogs,
    habitItems,
    allHabitLogs,
  ] = await Promise.all([
    getSettings(),
    getWorkoutsWithStats(),
    getRoutines(),
    getAllBodyLogs(30),
    getAllMealLogs(),
    getNutritionGoals(),
    getAllWaterLogs(),
    getWaterGoal(),
    getCaffeineLimit(),
    getAllTimeLogs(),
    getHabitItems(),
    getAllHabitLogs(),
  ]);

  // 直近14日分（最大12件）のワークアウト詳細を順次取得（負荷軽減）
  const recentWorkoutMetas = workoutsWithStats
    .filter((w) => {
      const d = safeDateISO(w.start_time);
      return d !== '' && d >= cutoff14ISO;
    })
    .slice(0, 12);

  const detailedWorkouts = [];
  for (const w of recentWorkoutMetas) {
    const full = await loadFullWorkoutData(w.id);
    if (full) {
      detailedWorkouts.push({
        id: full.id,
        date: safeDateISO(full.start_time),
        title: full.title,
        start_time: full.start_time,
        end_time: full.end_time,
        notes: full.notes,
        calories: full.calories,
        total_volume_kg: w.volume ?? 0,
        exercises: full.exercises.map((ex) => ({
          exercise_id: ex.exercise_id,
          name: ex.exercise_name,
          notes: ex.notes,
          sets: ex.sets.map((s) => ({
            set_number: s.set_number,
            weight_kg: s.weight,
            reps: s.reps,
            rpe: s.rpe,
            speed: s.speed,
            incline: s.incline,
            side: s.side,
            variation: s.variation,
            stance: s.stance,
            is_completed: s.is_completed,
          })),
        })),
      });
    }
  }

  // 食事・水分・時間ログ・習慣ログ（直近7日分）
  const recentMeals = allMealLogs.filter(
    (m) => {
      const d = safeDateISO(m.date);
      return d !== '' && d >= cutoff7ISO;
    }
  );
  const recentWater = allWaterLogs.filter(
    (w) => {
      const d = safeDateISO(w.date);
      return d !== '' && d >= cutoff7ISO;
    }
  );
  const recentTimeLogs = allTimeLogs.filter(
    (t) => {
      const d = safeDateISO(t.date);
      return d !== '' && d >= cutoff7ISO;
    }
  );
  const recentHabitLogs = allHabitLogs.filter(
    (h) => {
      const d = safeDateISO(h.date);
      return d !== '' && d >= cutoff7ISO;
    }
  );

  // 24時間管理（予定・デフォルト・テンプレート・ピース）とデイリールーティン
  const zikanPlans = safeJsonParse<any[]>(allSettings['zikankanri_plans'], []);
  const zikanDefaultSchedules = safeJsonParse<any[]>(
    allSettings['zikankanri_default_schedules'],
    []
  );
  const zikanTemplates = safeJsonParse<any[]>(allSettings['zikankanri_templates'], []);
  const zikanPieces = safeJsonParse<any[]>(allSettings['zikankanri_pieces'], []);
  const dailyRoutines = safeJsonParse<any[]>(allSettings['routine_tracker_data'], []);

  // 今日〜直近7日以降（未来の予定含む）の zikanPlans を抽出
  const relevantZikanPlans = Array.isArray(zikanPlans)
    ? zikanPlans.filter((p) => !p?.date || safeDateISO(p.date) >= cutoff7ISO)
    : [];

  // AIコーチメモリ
  let aiMemory = allSettings['ai_companion_memory'] || '';
  if (!aiMemory) {
    try {
      const rawUserSettings = allSettings['user_settings'];
      if (rawUserSettings) {
        const parsed = JSON.parse(rawUserSettings);
        aiMemory = parsed?.aiCompanionMemory || '';
      }
    } catch {
      // ignore
    }
  }

  // 日別集計（食事・水分）
  const dailyNutritionMap: Record<
    string,
    { calories: number; protein: number; fat: number; carbs: number; fiber: number; meals: number }
  > = {};
  for (const m of recentMeals) {
    const d = safeDateISO(m.date);
    if (!d) continue;
    if (!dailyNutritionMap[d]) {
      dailyNutritionMap[d] = { calories: 0, protein: 0, fat: 0, carbs: 0, fiber: 0, meals: 0 };
    }
    dailyNutritionMap[d].calories += Number(m.calories) || 0;
    dailyNutritionMap[d].protein += Number(m.protein) || 0;
    dailyNutritionMap[d].fat += Number(m.fat) || 0;
    dailyNutritionMap[d].carbs += Number(m.carbs) || 0;
    dailyNutritionMap[d].fiber += Number(m.fiber) || 0;
    dailyNutritionMap[d].meals += 1;
  }

  const dailyWaterMap: Record<string, { waterMl: number; caffeineMg: number }> = {};
  for (const w of recentWater) {
    const d = safeDateISO(w.date);
    if (!d) continue;
    if (!dailyWaterMap[d]) {
      dailyWaterMap[d] = { waterMl: 0, caffeineMg: 0 };
    }
    dailyWaterMap[d].waterMl += Number(w.amount) || 0;
    dailyWaterMap[d].caffeineMg += Number(w.caffeine) || 0;
  }

  const habitNameMap = new Map<number, string>();
  for (const hi of habitItems) {
    habitNameMap.set(hi.id, hi.name);
  }

  const dailyHabitCountsMap: Record<string, Record<number, number>> = {};
  for (const l of recentHabitLogs) {
    const d = safeDateISO(l.date);
    if (!d) continue;
    if (!dailyHabitCountsMap[d]) {
      dailyHabitCountsMap[d] = {};
    }
    dailyHabitCountsMap[d][l.habit_item_id] = (dailyHabitCountsMap[d][l.habit_item_id] || 0) + 1;
  }

  const dailyHabitCountsLast7Days: Record<
    string,
    Array<{ habit_item_id: number; habitName: string; count: number; target_count: number }>
  > = {};
  for (const d of Object.keys(dailyHabitCountsMap).sort().reverse()) {
    dailyHabitCountsLast7Days[d] = habitItems.map((hi) => ({
      habit_item_id: hi.id,
      habitName: hi.name,
      count: dailyHabitCountsMap[d][hi.id] || 0,
      target_count: hi.target_count ?? 0,
    }));
  }

  const normalizedZikanPlans = relevantZikanPlans.map((p) => ({
    ...p,
    date: safeDateISO(p?.date) || p?.date,
  }));

  const normalizedTimeLogs = recentTimeLogs.map((t) => ({
    ...t,
    date: safeDateISO(t.date) || t.date,
  }));

  const jsonPayload = {
    schemaVersion: 1,
    exportedAt,
    timezoneOffsetMinutes: -new Date().getTimezoneOffset(),
    userProfileAndGoals: {
      aiCoachMemory: aiMemory,
      nutritionGoals,
      waterGoalMl: waterGoal,
      caffeineLimitMg: caffeineLimit,
    },
    bodyComposition: {
      latest: bodyLogs[0] ?? null,
      recentLogs: bodyLogs.slice(0, 14),
    },
    training: {
      currentWorkoutMenus: workoutRoutines,
      recentWorkoutsLast14Days: detailedWorkouts,
    },
    dailyRoutines: Array.isArray(dailyRoutines)
      ? dailyRoutines.map((r) => ({
          id: r.id,
          name: r.name,
          hidden: !!r.hidden,
          auto_update_estimates: r.auto_update_estimates !== false,
          auto_advance: !!r.auto_advance,
          enable_vibration: r.enable_vibration !== false,
          tasks: Array.isArray(r.tasks)
            ? r.tasks.map((t: any) => ({
                id: t.id,
                name: t.name,
                estimated_seconds: t.estimated_seconds,
              }))
            : [],
          recentHistory: Array.isArray(r.history) ? r.history.slice(0, 7) : [],
        }))
      : [],
    timeManagement24h: {
      plansRecentAndUpcoming: normalizedZikanPlans,
      defaultSchedules: zikanDefaultSchedules,
      templates: zikanTemplates,
      activityPieces: zikanPieces,
      actualTimeLogsLast7Days: normalizedTimeLogs,
    },
    nutritionLast7Days: {
      dailySummary: dailyNutritionMap,
      logs: recentMeals.slice(0, 80),
    },
    hydrationLast7Days: {
      dailySummary: dailyWaterMap,
    },
    habits: {
      items: habitItems.map((hi) => ({
        id: hi.id,
        name: hi.name,
        color: hi.color,
        target_count: hi.target_count ?? 0,
        is_hidden: hi.is_hidden === 1,
        sort_order: hi.sort_order ?? 0,
      })),
      dailyCountsLast7Days: dailyHabitCountsLast7Days,
      logsLast7Days: recentHabitLogs.map((h) => ({
        habit_item_id: h.habit_item_id,
        date: normalizeToDateISO(h.date),
        habitName: habitNameMap.get(h.habit_item_id) || `#${h.habit_item_id}`,
        timestamp: h.timestamp,
      })),
    },
  };

  // Markdown サマリーの生成
  const lines: string[] = [];
  lines.push('# TreNote ユーザー記録コンテキスト（AIトレーナー参照用）');
  lines.push(`- 最終更新: ${exportedAt}`);
  lines.push(`- 抽出期間: ワークアウト直近14日間 / 栄養・水分・習慣・24時間管理直近7日間`);
  lines.push('');

  lines.push('## 1. AIトレーナー記憶メモリ & 目標設定');
  lines.push(`- 目標摂取カロリー: ${nutritionGoals.calories} kcal (P: ${nutritionGoals.protein}g / F: ${nutritionGoals.fat}g / C: ${nutritionGoals.carbs}g / 食物繊維: ${nutritionGoals.fiber}g)`);
  lines.push(`- 水分目標: ${waterGoal} ml/日 / カフェイン上限: ${caffeineLimit} mg/日`);
  if (nutritionGoals.goal_type) {
    lines.push(`- 減量/増量方針: ${nutritionGoals.goal_type} (身長: ${nutritionGoals.height ?? '-'}cm, 年齢: ${nutritionGoals.age ?? '-'})`);
  }
  lines.push('### AI記憶メモリ');
  lines.push(aiMemory.trim() ? aiMemory.trim() : '_（未登録）_');
  lines.push('');

  lines.push('## 2. 体組成（最新〜直近推移）');
  if (bodyLogs.length === 0) {
    lines.push('_体組成ログなし_');
  } else {
    const latest = bodyLogs[0];
    lines.push(
      `- 最新 (${latest.date}): 体重 ${latest.weight ?? '-'} kg / 体脂肪率 ${latest.body_fat_rate ?? '-'}% / 筋肉量 ${latest.muscle_mass ?? '-'} kg / LBM ${latest.lbm ?? '-'} kg`
    );
    bodyLogs.slice(1, 7).forEach((b) => {
      lines.push(`  - ${b.date}: ${b.weight ?? '-'} kg (体脂肪 ${b.body_fat_rate ?? '-'}%)`);
    });
  }
  lines.push('');

  lines.push('## 3. 現在の筋トレメニュー (Routines)');
  if (workoutRoutines.length === 0) {
    lines.push('_登録済み筋トレメニューなし_');
  } else {
    for (const r of workoutRoutines) {
      lines.push(`### ${r.title}${r.description ? ` — ${r.description}` : ''}`);
      for (const ex of r.exercises || []) {
        const setsDesc = (ex.sets || [])
          .map((s) => `${s.weight ?? '-'}kg×${s.reps ?? '-'}${s.rpe ? `@RPE${s.rpe}` : ''}`)
          .join(', ');
        lines.push(`- ${ex.name} (${ex.muscle_group || '-'}): ${setsDesc || 'セット未設定'}`);
      }
    }
  }
  lines.push('');

  lines.push('## 4. 直近14日間のワークアウト実績');
  if (detailedWorkouts.length === 0) {
    lines.push('_直近14日間の記録なし_');
  } else {
    for (const w of detailedWorkouts) {
      lines.push(`### ${w.date} ${w.title} (総負荷量: ${Math.round(w.total_volume_kg)} kg)`);
      if (w.notes) lines.push(`> メモ: ${w.notes}`);
      for (const ex of w.exercises) {
        const setsSummary = ex.sets
          .map(
            (s) =>
              `${s.weight_kg ?? '-'}kg×${s.reps ?? '-'}${s.rpe ? `@${s.rpe}` : ''}${
                s.is_completed ? '' : '(未完)'
              }`
          )
          .join(' / ');
        lines.push(`- **${ex.name}**: ${setsSummary}${ex.notes ? ` [メモ: ${ex.notes}]` : ''}`);
      }
    }
  }
  lines.push('');

  lines.push('## 5. 直近7日間の栄養・水分サマリー');
  const allDates = Array.from(
    new Set([...Object.keys(dailyNutritionMap), ...Object.keys(dailyWaterMap)])
  )
    .sort()
    .reverse();
  if (allDates.length === 0) {
    lines.push('_直近7日間の栄養・水分記録なし_');
  } else {
    for (const d of allDates) {
      const n = dailyNutritionMap[d];
      const w = dailyWaterMap[d];
      const nStr = n
        ? `${Math.round(n.calories)}kcal (P:${Math.round(n.protein)}g F:${Math.round(n.fat)}g C:${Math.round(n.carbs)}g, ${n.meals}食)`
        : '食事記録なし';
      const wStr = w ? `水分 ${Math.round(w.waterMl)}ml / カフェイン ${Math.round(w.caffeineMg)}mg` : '水分記録なし';
      lines.push(`- ${d}: ${nStr} | ${wStr}`);
    }
  }
  lines.push('');

  lines.push('## 6. デイリールーティン（習慣タイマー）');
  if (!Array.isArray(dailyRoutines) || dailyRoutines.length === 0) {
    lines.push('_登録済みデイリールーティンなし_');
  } else {
    for (const r of dailyRoutines) {
      const tasksText = Array.isArray(r.tasks)
        ? r.tasks.map((t: any) => `${t.name}(${Math.round((t.estimated_seconds || 0) / 60)}分)`).join(' → ')
        : '';
      const lastExec =
        Array.isArray(r.history) && r.history[0]?.timestamp
          ? toLocalDateISO(new Date(r.history[0].timestamp))
          : '未実施';
      lines.push(`- **${r.name}** (最終実施: ${lastExec}): ${tasksText}`);
    }
  }
  lines.push('');

  lines.push('## 7. 24時間管理（予定・基本スケジュール・直近実績）');
  if (Array.isArray(zikanDefaultSchedules) && zikanDefaultSchedules.length > 0) {
    lines.push('### デフォルトスケジュール');
    for (const ds of zikanDefaultSchedules) {
      const dayLabels = ['日', '月', '火', '水', '木', '金', '土'];
      const daysText = Array.isArray(ds.days) ? ds.days.map((d: number) => dayLabels[d] ?? d).join(',') : '-';
      const slotsText = Array.isArray(ds.data)
        ? ds.data
            .slice(0, 12)
            .map((s: any) => {
              const title = s.items?.[0]?.name || s.activity_name || '活動';
              return `${s.start}-${s.end}:${title}`;
            })
            .join(', ')
        : '';
      lines.push(`- **${ds.name}** (${daysText}): ${slotsText}`);
    }
  }
  if (normalizedZikanPlans.length > 0) {
    const groupedPlans: Record<string, string[]> = {};
    for (const p of normalizedZikanPlans) {
      const d = safeDateISO(p?.date);
      if (!d) continue;
      if (!groupedPlans[d]) groupedPlans[d] = [];
      const title = p.items?.[0]?.name || p.activity_name || '予定';
      groupedPlans[d].push(`${p.start}-${p.end} ${title}`);
    }
    const planDates = Object.keys(groupedPlans).sort().reverse().slice(0, 7);
    if (planDates.length > 0) {
      lines.push('### 直近〜今後の予定 (Plans)');
      for (const d of planDates) {
        lines.push(`- ${d}: ${groupedPlans[d].slice(0, 15).join(' / ')}`);
      }
    }
  }
  if (Array.isArray(zikanPieces) && zikanPieces.length > 0) {
    lines.push(
      `### 登録済み活動ピース (${zikanPieces.length}件): ${zikanPieces.map((p: any) => p.name).filter(Boolean).join(', ')}`
    );
  }
  lines.push(`### 直近7日間の実績タイムログ (${recentTimeLogs.length}件)`);
  const groupedTime: Record<string, string[]> = {};
  for (const t of recentTimeLogs) {
    const d = safeDateISO(t.date);
    if (!d) continue;
    if (!groupedTime[d]) groupedTime[d] = [];
    groupedTime[d].push(`${t.start_time}-${t.end_time} ${t.activity_name}(${t.duration_minutes}m)`);
  }
  for (const d of Object.keys(groupedTime).sort().reverse()) {
    lines.push(`- ${d}: ${groupedTime[d].slice(0, 15).join(' / ')}`);
  }
  lines.push('');

  lines.push('## 8. 習慣トラッカー');
  if (habitItems.length === 0) {
    lines.push('_習慣アイテムなし_');
  } else {
    const countByHabit: Record<number, number> = {};
    for (const l of recentHabitLogs) {
      countByHabit[l.habit_item_id] = (countByHabit[l.habit_item_id] || 0) + 1;
    }
    for (const hi of habitItems) {
      const hiddenTag = hi.is_hidden === 1 ? ' [非表示]' : '';
      lines.push(
        `- [ID:${hi.id}] ${hi.name}${hiddenTag} (目標: ${hi.target_count ?? 0}回/日): 直近7日間で ${countByHabit[hi.id] || 0} 回達成`
      );
    }
    const habitDates = Object.keys(dailyHabitCountsLast7Days);
    if (habitDates.length > 0) {
      lines.push('### 直近7日間の日別達成回数');
      for (const d of habitDates) {
        const dayEntries = dailyHabitCountsLast7Days[d]
          .filter((e) => e.count > 0 || e.target_count > 0)
          .map((e) => `${e.habitName} ${e.count}${e.target_count > 0 ? `/${e.target_count}` : ''}回`);
        if (dayEntries.length > 0) {
          lines.push(`- ${d}: ${dayEntries.join(' / ')}`);
        }
      }
    }
  }

  return {
    exportedAt,
    markdownSummary: lines.join('\n'),
    jsonContent: JSON.stringify(jsonPayload, null, 2),
    agentGuideMarkdown: buildAgentGuideMarkdown(),
  };
}

export function buildInitialProposalTemplate(): AiAgentProposalsPayload {
  const now = new Date().toISOString();
  return {
    schemaVersion: 1,
    proposalId: 'template_initial_000',
    updatedAt: now,
    agentName: 'AI Personal Trainer',
    status: 'applied',
    appliedAt: now,
    trainerAdvice: {
      title: 'テンプレート（AIエージェントが提案を書く際のサンプル）',
      date: toLocalDateISO(new Date()),
      summary: 'AIエージェントが新しくアドバイスやメニューを提案する際は、新しい proposalId と status: "pending" を設定して上書き保存してください。',
      message:
        'このファイルは TreNote と外部 AI エージェントの連携用提案ファイルです。AI_AGENT_GUIDE.md を参照し、trainerAdvice / workoutMenus / dailyRoutines / timeManagement / bodyComposition / memoryUpdates を記述して status を "pending" に変更すると、アプリが自動で読み込みます。',
      focusAreas: ['初期化'],
    },
    workoutMenus: [],
    dailyRoutines: [],
    timeManagement: {
      plans: [],
      actualLogs: [],
      defaultSchedules: [],
      templates: [],
      pieces: [],
    },
    habits: {
      items: [],
      logs: [],
    },
    bodyComposition: [],
    memoryUpdates: [],
  };
}

export function buildAgentGuideMarkdown(folderPath?: string): string {
  const folderLine = folderPath ? `\n- **同期フォルダ**: \`${folderPath}\`\n` : '';
  return `# TreNote Google Drive AI連携ガイド (AI_AGENT_GUIDE.md)

このフォルダは **TreNote（フィットネス＆ライフログアプリ）** と外部 AI エージェントが自律的に連携するための共有ワークスペースです。${folderLine}

## フォルダ内のファイル構成

1. **\`trainer_context_summary.md\`**（アプリが自動更新 / 読み取り専用）
   - ユーザーの直近14日間の筋トレ実績、現在のメニュー、直近7日間の栄養・水分・習慣・24時間管理ログ、体組成、AI記憶メモリを読みやすい Markdown にまとめたレポートです。
   - **まず最初にこのファイルを読むことで、ユーザーの現状を素早く把握できます。**

2. **\`app_records_export.json\`**（アプリが自動更新 / 読み取り専用）
   - 上記データの機械可読な完全 JSON です。種目名、既存ルーティンID、24時間管理の活動ピース名などを正確に参照したい場合に使ってください。

3. **\`ai_agent_proposals.json\`**（AIエージェントが編集 → アプリが自動読み込み）
   - トレーナーとしてのアドバイス、新しい筋トレメニュー、新しいデイリールーティン、24時間管理（予定・実績タイムログ・基本スケジュール・テンプレート・活動ピース）、習慣カウンター（習慣項目の作成/更新/削除・日別達成回数の記録）、体組成記録（体重・体脂肪率・筋肉量・LBM・身体サイズ等）、AI記憶メモリへの追記を書き込むファイルです。

---

## AIエージェントへの書き込みルール（重要）

提案を反映させたいときは、必ず **\`ai_agent_proposals.json\`** ファイルを更新（または同ファイル名で本フォルダ直下へ保存）してください。

### 必須ルール
1. **\`proposalId\`**: 提案ごとに必ず一意の新しい文字列にしてください（例: \`"prop_20261115_001"\`）。同じ \`proposalId\` かつ同じ \`updatedAt\` の場合は、重複適用を防ぐためスキップされます。
2. **\`updatedAt\`**: 現在の ISO 8601 日時文字列にしてください。
3. **\`status\`**: 新規提案時は必ず **\`"pending"\`** にしてください。アプリが取り込みを完了すると自動的に \`"applied"\` に書き戻します。

---

## \`ai_agent_proposals.json\` スキーマ仕様

\`\`\`json
{
  "schemaVersion": 1,
  "proposalId": "prop_20261115_001",
  "updatedAt": "2026-11-15T09:00:00+09:00",
  "agentName": "Claude / Gemini Personal Trainer",
  "status": "pending",
  "trainerAdvice": {
    "title": "今週のコンディション評価と調整案",
    "date": "2026-11-15",
    "summary": "ベンチプレスが停滞傾向のため、補助種目と睡眠時間を優先調整しました。",
    "message": "直近2週間のベンチプレスで80kgの回数が横ばいです。今週はインクラインダンベルプレスを追加し、23:30までに就寝する24時間スケジュールを提案します。",
    "focusAreas": ["胸トレ停滞打破", "睡眠7.5時間確保"]
  },
  "workoutMenus": [
    {
      "action": "upsert",
      "title": "AI提案: 胸・三頭 停滞打破DAY",
      "description": "RPE8目安・レスト90〜120秒",
      "exercises": [
        {
          "name": "ベンチプレス",
          "muscle_group": "胸",
          "equipment": "バーベル",
          "rest_seconds": 120,
          "sets": [
            { "set_number": 1, "weight": 80, "reps": 6, "rpe": 8 },
            { "set_number": 2, "weight": 80, "reps": 6, "rpe": 8.5 },
            { "set_number": 3, "weight": 75, "reps": 8, "rpe": 8 }
          ]
        },
        {
          "name": "インクラインダンベルプレス",
          "muscle_group": "胸",
          "equipment": "ダンベル",
          "rest_seconds": 90,
          "sets": [
            { "set_number": 1, "weight": 26, "reps": 10, "rpe": 8 },
            { "set_number": 2, "weight": 26, "reps": 10, "rpe": 8.5 }
          ]
        }
      ]
    }
  ],
  "dailyRoutines": [
    {
      "action": "upsert",
      "name": "AI提案: 就寝前リカバリー",
      "auto_update_estimates": true,
      "auto_advance": true,
      "tasks": [
        { "name": "胸・肩ストレッチ", "estimated_seconds": 180 },
        { "name": "フォームローラー", "estimated_seconds": 240 },
        { "name": "深呼吸・照明オフ", "estimated_seconds": 120 }
      ]
    }
  ],
  "timeManagement": {
    "replaceDates": ["2026-11-16"],
    "replaceActualDates": [],
    "plans": [
      {
        "date": "2026-11-16",
        "start": "07:00",
        "end": "07:30",
        "category": "maintain",
        "items": [{ "name": "食事", "percent": 100 }],
        "memo": "高タンパク朝食"
      },
      {
        "date": "2026-11-16",
        "start": "18:30",
        "end": "19:45",
        "category": "invest",
        "items": [{ "name": "筋トレ", "percent": 100 }],
        "memo": "AI提案: 胸・三頭 停滞打破DAY"
      }
    ],
    "actualLogs": [
      {
        "date": "2026-11-15",
        "start": "07:30",
        "end": "08:00",
        "activity_name": "食事"
      },
      {
        "date": "2026-11-15",
        "start": "20:00",
        "end": "21:00",
        "items": [
          { "name": "学習", "percent": 70 },
          { "name": "休憩", "percent": 30 }
        ]
      }
    ],
    "defaultSchedules": [
      {
        "name": "AI提案: 平日トレあり基本枠",
        "days": [1, 3, 5],
        "data": [
          { "start": "00:00", "end": "07:00", "category": "maintain", "items": [{ "name": "睡眠", "percent": 100 }] },
          { "start": "18:30", "end": "19:45", "category": "invest", "items": [{ "name": "筋トレ", "percent": 100 }] }
        ]
      }
    ],
    "pieces": [
      { "name": "リカバリー", "icon": "🧘", "type": "small", "category": "maintain", "duration": 15, "snap": 5, "color": "blue" }
    ]
  },
  "habits": {
    "items": [
      { "action": "upsert", "name": "クレアチン摂取", "color": "blue", "target_count": 1, "hidden": false },
      { "action": "upsert", "name": "ストレッチ", "color": "green", "target_count": 2 }
    ],
    "logs": [
      { "date": "2026-11-15", "habit_name": "クレアチン摂取", "count": 1, "mode": "set" },
      { "date": "2026-11-15", "habit_name": "ストレッチ", "count": 1, "mode": "increment" }
    ]
  },
  "bodyComposition": [
    {
      "date": "2026-11-16",
      "action": "upsert",
      "weight": 70.4,
      "body_fat_rate": 14.8,
      "muscle_mass": 33.6,
      "height": 175.0,
      "waist": 78.5,
      "memo": "朝測定（AI記録）"
    }
  ],
  "memoryUpdates": [
    "2026-11-15: 胸の日ボリューム調整フェーズ開始（インクライン重視）"
  ]
}
\`\`\`

### 各フィールドの補足
- \`workoutMenus[].action\`: \`"upsert"\`（同名タイトルがあれば更新、無ければ新規作成） / \`"create"\`（常に新規作成）。種目が未登録の場合は自動でカスタム種目として登録されます。
- \`dailyRoutines[].action\`: \`"upsert"\`（同名ルーティンがあればタスクを更新しつつ過去の実施履歴は保持）。
- \`timeManagement.replaceDates\`: 指定した日付（\`YYYY-MM-DD\`）の既存AI提案予定を置き換えます（通常の予定も \`replaceDatePlans: true\` 時はその日の予定を整理）。\`category\` は \`"invest"\`（自己投資・アンバー）、\`"maintain"\`（維持・ブルー）、\`"drift"\`（オフ・パープル）が使えます。
- \`timeManagement.actualLogs[]\` / \`replaceActualDates\`: 24時間管理の「実績タイムログ」を書き込みます。\`replaceActualDates\` に指定した日付は既存実績を置き換え、未指定日は同一時間帯（\`start\`-\`end\`）を冪等に上書きします。単一活動は \`activity_name\`、複数同時進行は \`items: [{ name, percent }]\` で指定します。
- \`timeManagement.defaultSchedules[].days\`: \`0=日曜, 1=月曜, ..., 6=土曜\`。
- \`habits.items[]\`: 習慣カウンターの項目を管理します。\`action\` は \`"upsert"\`（省略時のデフォルト：同名があれば更新・無ければ新規作成）、\`"create"\`、\`"delete"\`。\`color\` は \`"red" | "blue" | "green" | "yellow" | "purple"\` または CSS グラデーション文字列、\`target_count\` は1日の目標回数、\`hidden\` は非表示フラグです。
- \`habits.logs[]\`: 指定日（\`date\`）の習慣達成回数を記録します。\`habit_name\`（または \`habit_item_id\`）を指定し、\`mode\` で \`"set"\`（省略時のデフォルト：その日の合計回数を \`count\` 回に調整）、\`"increment"\`（\`count\` 回加算）、\`"clear"\`（当日の記録を0回にリセット）を選べます。未登録の \`habit_name\` は自動作成されます。
- \`bodyComposition[]\`: 指定日（\`date\`: \`YYYY-MM-DD\`）の体組成ログを書き込みます。\`action\` は \`"upsert"\`（省略時のデフォルト：指定した項目だけ既存記録へマージ更新）または \`"replace"\`（未指定項目をクリアして上書き）。利用可能項目は \`weight\`(kg), \`body_fat_rate\`(%), \`muscle_mass\`(kg), \`lbm\`(kg), \`height\`(cm), \`neck\`(cm), \`waist\`(cm), \`hip\`(cm), \`wrist\`(cm), \`ankle\`(cm), \`gender\`(\`"male"\` / \`"female"\`), \`memo\` です。\`lbm\` を省略しても \`weight\` と \`body_fat_rate\` が揃っていれば自動算出されます。
`;
}
