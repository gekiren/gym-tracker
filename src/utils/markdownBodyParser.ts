/**
 * 体組成 Markdown パーサーユーティリティ
 * Obsidianデイリーノート、InBody測定履歴テーブル、箇条書きメモなどから
 * 体重・体脂肪率・骨格筋量・除脂肪体重などを柔軟に抽出します。
 */

export interface ParsedBodyRecord {
  date: string; // YYYY-MM-DD
  weight?: number;
  body_fat_rate?: number;
  muscle_mass?: number;
  lbm?: number;
  height?: number;
  neck?: number;
  waist?: number;
  hip?: number;
  wrist?: number;
  ankle?: number;
  memo?: string;
}

/**
 * 全角数字や記号を半角に正規化
 */
const normalizeText = (text: string): string => {
  return text
    .replace(/[０-９]/g, (s) => String.fromCharCode(s.charCodeAt(0) - 0xfee0))
    .replace(/．/g, '.')
    .replace(/：/g, ':')
    .replace(/％/g, '%');
};

/**
 * 様々な日付表記（YYYY-MM-DD, YYYY/MM/DD, YYYY.MM.DD, YYYY年M月D日）を YYYY-MM-DD に正規化
 */
export const normalizeDate = (rawDate: string): string | null => {
  if (!rawDate) return null;
  const s = rawDate.trim();

  // YYYY-MM-DD, YYYY/MM/DD, YYYY.MM.DD
  const match1 = s.match(/(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if (match1) {
    const y = match1[1];
    const m = match1[2].padStart(2, '0');
    const d = match1[3].padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  // YYYY年M月D日
  const match2 = s.match(/(\d{4})年(\d{1,2})月(\d{1,2})日/);
  if (match2) {
    const y = match2[1];
    const m = match2[2].padStart(2, '0');
    const d = match2[3].padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  return null;
};

/**
 * 数値文字列を安全にパース
 */
const parseNumber = (val?: string | null): number | undefined => {
  if (!val) return undefined;
  const clean = val.replace(/[^0-9.]/g, '');
  if (!clean) return undefined;
  const num = parseFloat(clean);
  return isNaN(num) ? undefined : num;
};

type ColumnKey = keyof Omit<ParsedBodyRecord, 'date'> | 'date' | 'ignore';

/**
 * Markdown テーブルのヘッダー文字列から対応する属性キーを判定
 */
const identifyColumnKey = (headerText: string): ColumnKey => {
  const h = headerText.toLowerCase().replace(/[\s()（）[\]【】]/g, '');

  // 日付
  if (
    h.includes('測定日') ||
    h.includes('日付') ||
    h.includes('date') ||
    h.includes('日時') ||
    h.includes('計測日')
  ) {
    return 'date';
  }

  // 体脂肪率 (体脂肪量より先に判定)
  if (
    h.includes('体脂肪率') ||
    h.includes('体脂肪%') ||
    h.includes('fat%') ||
    h.includes('bf%') ||
    h.includes('体脂肪比率')
  ) {
    return 'body_fat_rate';
  }

  // 骨格筋量
  if (
    h.includes('骨格筋') ||
    h.includes('筋肉量') ||
    h.includes('smm') ||
    h.includes('musclemass') ||
    h.includes('skeletalmuscle')
  ) {
    return 'muscle_mass';
  }

  // 除脂肪体重 (LBM)
  if (
    h.includes('除脂肪') ||
    h.includes('lbm') ||
    h.includes('leanbody')
  ) {
    return 'lbm';
  }

  // 体重
  if (h.includes('体重') || h.includes('weight') || h.includes('bw')) {
    return 'weight';
  }

  // 身長
  if (h.includes('身長') || h.includes('height') || h.includes('ht')) {
    return 'height';
  }

  // 首回り
  if (h.includes('首回') || h.includes('首囲') || h.includes('neck')) {
    return 'neck';
  }

  // ウエスト
  if (h.includes('ウエスト') || h.includes('腹囲') || h.includes('腰回') || h.includes('waist')) {
    return 'waist';
  }

  // ヒップ
  if (h.includes('ヒップ') || h.includes('尻囲') || h.includes('hip')) {
    return 'hip';
  }

  // 手首
  if (h.includes('手首') || h.includes('wrist')) {
    return 'wrist';
  }

  // 足首
  if (h.includes('足首') || h.includes('ankle')) {
    return 'ankle';
  }

  // メモ
  if (h.includes('メモ') || h.includes('memo') || h.includes('備考') || h.includes('note')) {
    return 'memo';
  }

  return 'ignore';
};

/**
 * Markdownテーブルのパース
 */
const parseMarkdownTables = (text: string): ParsedBodyRecord[] => {
  const results: ParsedBodyRecord[] = [];
  const lines = text.split('\n');

  let inTable = false;
  let headers: ColumnKey[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // テーブル行の判定
    if (line.startsWith('|') && line.endsWith('|')) {
      const cells = line
        .slice(1, -1)
        .split('|')
        .map((c) => c.trim());

      // アライメント行 (| :--- | ---: |) の場合
      const isSeparator = cells.every((c) => /^:?-+:?$/.test(c));
      if (isSeparator) {
        inTable = true;
        continue;
      }

      if (!inTable) {
        // ヘッダー行候補
        headers = cells.map(identifyColumnKey);
      } else {
        // データ行
        let recordDate: string | null = null;
        const currentRecord: Partial<ParsedBodyRecord> = {};

        cells.forEach((cell, idx) => {
          if (idx >= headers.length) return;
          const key = headers[idx];
          if (key === 'ignore') return;

          if (key === 'date') {
            recordDate = normalizeDate(cell);
          } else if (key === 'memo') {
            if (cell && cell !== '-' && cell !== '--') {
              currentRecord.memo = cell;
            }
          } else {
            const num = parseNumber(cell);
            if (num !== undefined) {
              (currentRecord as any)[key] = num;
            }
          }
        });

        if (recordDate && Object.keys(currentRecord).length > 0) {
          results.push({
            date: recordDate,
            ...currentRecord,
          });
        }
      }
    } else {
      // テーブル終了
      inTable = false;
      headers = [];
    }
  }

  return results;
};

/**
 * セクション・リスト形式の行から体組成データを抽出
 */
const extractFromKeyValueText = (text: string, defaultDate: string): ParsedBodyRecord[] => {
  const recordsMap = new Map<string, ParsedBodyRecord>();
  const lines = text.split('\n');

  let currentDate = defaultDate;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    // 1. 日付見出しや Frontmatter の検出 (例: "## 2026-09-14", "## 体組成 (2026-09-14)", "date: 2026-09-14")
    const dateMatch =
      line.match(/(?:^#+\s*|\(|date:\s*["']?)(\d{4}[-/.]\d{1,2}[-/.]\d{1,2}|\d{4}年\d{1,2}月\d{1,2}日)/i) ||
      line.match(/^[-*+]\s*(\d{4}[-/.]\d{1,2}[-/.]\d{1,2})/);

    if (dateMatch) {
      const normalized = normalizeDate(dateMatch[1]);
      if (normalized) {
        currentDate = normalized;
      }
    }

    // 該当日のレコードを取り出しまたは作成
    let record = recordsMap.get(currentDate);
    if (!record) {
      record = { date: currentDate };
      recordsMap.set(currentDate, record);
    }

    // 2. 体重 (kg)
    const weightMatch =
      line.match(/(?:体重|weight|bw)[：:\s*]+([0-9.]+)/i) ||
      line.match(/([0-9.]+)\s*kg(?:\s*\/|\s*\(|\s*$|\s*,)/i);
    if (weightMatch && !line.includes('骨格筋') && !line.includes('筋肉量') && !line.includes('除脂肪') && !line.includes('lbm') && !line.includes('体脂肪量')) {
      const val = parseNumber(weightMatch[1]);
      if (val !== undefined && val >= 20 && val <= 300) {
        record.weight = val;
      }
    }

    // 3. 体脂肪率 (%)
    const fatMatch =
      line.match(/(?:体脂肪率?|fat|bf|body\s*fat)[：:\s*]+([0-9.]+)/i) ||
      line.match(/([0-9.]+)\s*%/i);
    if (fatMatch) {
      const val = parseNumber(fatMatch[1]);
      if (val !== undefined && val >= 1 && val <= 70) {
        record.body_fat_rate = val;
      }
    }

    // 4. 骨格筋量 (kg)
    const muscleMatch =
      line.match(/(?:骨格筋量?|筋肉量?|smm|muscle)[：:\s*]+([0-9.]+)/i);
    if (muscleMatch) {
      const val = parseNumber(muscleMatch[1]);
      if (val !== undefined && val >= 10 && val <= 100) {
        record.muscle_mass = val;
      }
    }

    // 5. 除脂肪体重 (LBM)
    const lbmMatch =
      line.match(/(?:除脂肪(?:体重|量)?|lbm)[：:\s*]+([0-9.]+)/i);
    if (lbmMatch) {
      const val = parseNumber(lbmMatch[1]);
      if (val !== undefined && val >= 10 && val <= 150) {
        record.lbm = val;
      }
    }

    // 6. 身長 (cm)
    const heightMatch =
      line.match(/(?:身長|height)[：:\s*]+([0-9.]+)/i) ||
      line.match(/([0-9.]+)\s*cm(?:\s*\/|\s*\(|\s*$|\s*,)/i);
    if (heightMatch && !line.includes('首') && !line.includes('ウエスト') && !line.includes('ヒップ') && !line.includes('手首') && !line.includes('足首')) {
      const val = parseNumber(heightMatch[1]);
      if (val !== undefined && val >= 100 && val <= 250) {
        record.height = Math.round(val);
      }
    }

    // 7. 各部位囲 (cm)
    const neckMatch = line.match(/(?:首回り?|首囲|neck)[：:\s*]+([0-9.]+)/i);
    if (neckMatch) {
      const val = parseNumber(neckMatch[1]);
      if (val !== undefined) record.neck = val;
    }

    const waistMatch = line.match(/(?:ウエスト|腹囲|waist)[：:\s*]+([0-9.]+)/i);
    if (waistMatch) {
      const val = parseNumber(waistMatch[1]);
      if (val !== undefined) record.waist = val;
    }

    const hipMatch = line.match(/(?:ヒップ|尻囲|hip)[：:\s*]+([0-9.]+)/i);
    if (hipMatch) {
      const val = parseNumber(hipMatch[1]);
      if (val !== undefined) record.hip = val;
    }

    const wristMatch = line.match(/(?:手首(?:最小囲)?|wrist)[：:\s*]+([0-9.]+)/i);
    if (wristMatch) {
      const val = parseNumber(wristMatch[1]);
      if (val !== undefined) record.wrist = val;
    }

    const ankleMatch = line.match(/(?:足首(?:最小囲)?|ankle)[：:\s*]+([0-9.]+)/i);
    if (ankleMatch) {
      const val = parseNumber(ankleMatch[1]);
      if (val !== undefined) record.ankle = val;
    }

    // 8. メモ
    const memoMatch = line.match(/(?:メモ|memo|notes?)[：:\s*]+([^\n\r]+)/i);
    if (memoMatch) {
      const cleanMemo = memoMatch[1].trim();
      if (cleanMemo && cleanMemo !== '-' && cleanMemo !== '--') {
        record.memo = cleanMemo;
      }
    }
  }

  // 有効なデータ（体重・体脂肪・筋肉量・測定値のいずれか）を持つレコードのみを抽出
  const validRecords: ParsedBodyRecord[] = [];
  for (const rec of recordsMap.values()) {
    const hasData =
      rec.weight !== undefined ||
      rec.body_fat_rate !== undefined ||
      rec.muscle_mass !== undefined ||
      rec.lbm !== undefined ||
      rec.height !== undefined ||
      rec.neck !== undefined ||
      rec.waist !== undefined ||
      rec.hip !== undefined ||
      rec.wrist !== undefined ||
      rec.ankle !== undefined;

    if (hasData) {
      validRecords.push(rec);
    }
  }

  return validRecords;
};

/**
 * 外部Markdownテキストから体組成データを解析するメイン関数
 *
 * @param mdText 貼り付けられたMarkdownテキスト
 * @param defaultDate 日付が見つからない場合のフォールバック日付 (YYYY-MM-DD)
 * @returns パースされた体組成データ配列（日付昇順）
 */
export const parseBodyCompositionMarkdown = (
  mdText: string,
  defaultDate: string = new Date().toISOString().split('T')[0]
): ParsedBodyRecord[] => {
  if (!mdText || !mdText.trim()) {
    return [];
  }

  const normalized = normalizeText(mdText);

  // 1. テーブル形式のパースを優先試行
  const tableResults = parseMarkdownTables(normalized);

  // 2. セクション・リスト形式のパース
  const listResults = extractFromKeyValueText(normalized, defaultDate);

  // 3. マージ（日付キーで統合。テーブルデータをベースにリストデータで補完）
  const mergedMap = new Map<string, ParsedBodyRecord>();

  for (const item of [...tableResults, ...listResults]) {
    const existing = mergedMap.get(item.date);
    if (!existing) {
      mergedMap.set(item.date, { ...item });
    } else {
      mergedMap.set(item.date, {
        ...existing,
        ...item,
        // memo は両方あれば結合
        memo: item.memo || existing.memo,
      });
    }
  }

  // 4. LBM（除脂肪体重）の自動算出補完
  const finalResults: ParsedBodyRecord[] = [];
  for (const rec of mergedMap.values()) {
    if (rec.lbm === undefined && rec.weight !== undefined && rec.body_fat_rate !== undefined) {
      rec.lbm = Math.round(rec.weight * (1 - rec.body_fat_rate / 100) * 10) / 10;
    }
    finalResults.push(rec);
  }

  // 日付昇順でソート
  return finalResults.sort((a, b) => a.date.localeCompare(b.date));
};
