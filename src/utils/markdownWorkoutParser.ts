export interface ParsedWorkoutSet {
  set_number: number;
  weight: number | null;
  reps: number | null;
  rpe: number | null;
  stance: string | null;
  variation: string | null;
  work_seconds: number | null;
  rest_seconds: number | null;
  is_completed: boolean;
}

export interface ParsedWorkoutExercise {
  exercise_name: string;
  notes: string | null;
  sets: ParsedWorkoutSet[];
}

export interface ParsedWorkoutData {
  title: string;
  start_time: string; // ISO 8601 string
  end_time: string | null;
  notes: string | null;
  exercises: ParsedWorkoutExercise[];
}

/**
 * 時間文字列 (例: "1m30s", "90s", "1m") を秒数にパース
 */
const parseSeconds = (str: string): number | null => {
  if (!str || str === '-') return null;
  let total = 0;
  const minMatch = str.match(/(\d+)\s*m/i);
  const secMatch = str.match(/(\d+)\s*s/i);
  if (minMatch) total += parseInt(minMatch[1], 10) * 60;
  if (secMatch) total += parseInt(secMatch[1], 10);
  if (!minMatch && !secMatch) {
    const rawSec = parseInt(str, 10);
    if (!isNaN(rawSec)) total = rawSec;
  }
  return total > 0 ? total : null;
};

/**
 * ワークアウト Markdown テキストをパースし、構造体データに変換する
 */
export const parseWorkoutMarkdown = (mdContent: string): ParsedWorkoutData => {
  if (!mdContent || !mdContent.trim()) {
    throw new Error('Markdown content is empty.');
  }

  const lines = mdContent.split('\n');

  let title = 'Imported Workout';
  let dateStr = '';
  let overallNotes: string | null = null;
  const exercises: ParsedWorkoutExercise[] = [];

  let inFrontmatter = false;
  let frontmatterCount = 0;

  let currentExercise: ParsedWorkoutExercise | null = null;
  let inTable = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // 1. Frontmatter
    if (line === '---') {
      frontmatterCount++;
      inFrontmatter = frontmatterCount === 1;
      continue;
    }

    if (inFrontmatter) {
      const titleMatch = line.match(/^title:\s*["']?([^"'\r\n]+)["']?/i);
      if (titleMatch) title = titleMatch[1].trim();

      const dateMatch = line.match(/^date:\s*([^"\r\n]+)/i);
      if (dateMatch) dateStr = dateMatch[1].trim();
      continue;
    }

    // 2. 見出し H1 (# タイトル)
    const h1Match = line.match(/^#\s+(?:🏋️\s*)?([^(]+)(?:\(([^)]+)\))?/);
    if (h1Match) {
      if (h1Match[1].trim()) title = h1Match[1].trim();
      if (h1Match[2] && !dateStr) dateStr = h1Match[2].trim();
    }

    // 3. メタデータ行 (- **日付**: ..., - **メモ**: ...)
    const dateLineMatch = line.match(/^-\s*\*\*(?:日付|Date)\*\*:\s*(.+)/i);
    if (dateLineMatch && !dateStr) {
      dateStr = dateLineMatch[1].trim();
    }

    const notesLineMatch = line.match(/^-\s*\*\*(?:メモ|Notes?)\*\*:\s*(.+)/i);
    if (notesLineMatch) {
      overallNotes = notesLineMatch[1].trim();
    }

    // 4. 種目見出し (### 1. [[ベンチプレス]] や ### ベンチプレス)
    const exMatch = line.match(/^#{2,4}\s+(?:\d+\.\s*)?(?:\[\[([^\]]+)\]\]|(.+))/);
    if (exMatch) {
      const rawExName = (exMatch[1] || exMatch[2]).trim();
      // 余分な記号やプレフィックスを除去
      const cleanExName = rawExName.replace(/^[🏋️💪\s]+/, '').trim();

      currentExercise = {
        exercise_name: cleanExName,
        notes: null,
        sets: []
      };
      exercises.push(currentExercise);
      inTable = false;
      continue;
    }

    // 5. 種目メモ (*メモ: ...*)
    if (currentExercise && (line.startsWith('*メモ:') || line.startsWith('*Notes:'))) {
      const exNote = line.replace(/^\*(?:メモ|Notes?):\s*/i, '').replace(/\*$/, '').trim();
      if (exNote) currentExercise.notes = exNote;
      continue;
    }

    // 6. テーブル処理 (| Set | Stance | Weight | Reps | RPE | Time/Rest |)
    if (line.startsWith('|')) {
      const cols = line.split('|').map(c => c.trim()).filter((_, idx, arr) => idx > 0 && idx < arr.length - 1);
      
      // ヘッダー行またはセパレーター行はスキップ
      if (cols.length > 0 && (cols[0].toLowerCase().includes('set') || cols[0].includes('---'))) {
        inTable = true;
        continue;
      }

      if (inTable && currentExercise && cols.length >= 3) {
        // 例: Set=1, Stance=Normal, Weight=80 kg, Reps=10, RPE=@8, Time=60s / rest 90s
        const setNum = parseInt(cols[0], 10) || (currentExercise.sets.length + 1);
        
        let stance: string | null = null;
        let weightStr = '';
        let repsStr = '';
        let rpeStr = '';
        let timeStr = '';

        if (cols.length >= 6) {
          stance = cols[1] !== '-' ? cols[1] : null;
          weightStr = cols[2];
          repsStr = cols[3];
          rpeStr = cols[4];
          timeStr = cols[5];
        } else if (cols.length >= 4) {
          weightStr = cols[1];
          repsStr = cols[2];
          rpeStr = cols[3];
        } else {
          weightStr = cols[1];
          repsStr = cols[2];
        }

        // 数値抽出
        const weightMatch = weightStr.match(/(\d+(?:\.\d+)?)/);
        const weight = weightMatch ? parseFloat(weightMatch[1]) : null;

        const repsMatch = repsStr.match(/(\d+)/);
        const reps = repsMatch ? parseInt(repsMatch[1], 10) : null;

        const rpeMatch = rpeStr.match(/@?(\d+(?:\.\d+)?)/);
        const rpe = rpeMatch ? parseFloat(rpeMatch[1]) : null;

        let workSecs: number | null = null;
        let restSecs: number | null = null;

        if (timeStr && timeStr !== '-') {
          const parts = timeStr.split('/');
          if (parts.length > 1) {
            workSecs = parseSeconds(parts[0].trim());
            restSecs = parseSeconds(parts[1].replace(/rest/i, '').trim());
          } else if (timeStr.toLowerCase().includes('rest')) {
            restSecs = parseSeconds(timeStr.replace(/rest/i, '').trim());
          } else {
            workSecs = parseSeconds(timeStr.trim());
          }
        }

        currentExercise.sets.push({
          set_number: setNum,
          weight: isNaN(weight as any) ? null : weight,
          reps: isNaN(reps as any) ? null : reps,
          rpe: isNaN(rpe as any) ? null : rpe,
          stance: stance,
          variation: null,
          work_seconds: workSecs,
          rest_seconds: restSecs,
          is_completed: true
        });
      }
    }
  }

  // 開始日時の生成
  let startTimeIso = new Date().toISOString();
  if (dateStr) {
    const parsedDate = new Date(dateStr.replace(/\//g, '-'));
    if (!isNaN(parsedDate.getTime())) {
      startTimeIso = parsedDate.toISOString();
    }
  }

  return {
    title,
    start_time: startTimeIso,
    end_time: startTimeIso,
    notes: overallNotes,
    exercises
  };
};
