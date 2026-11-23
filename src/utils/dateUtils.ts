/**
 * 端末のローカルタイムゾーン基準で 'YYYY/MM/DD' 形式の今日の日付文字列を返す
 */
export function getLocalTodaySlash(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}/${m}/${d}`;
}

/**
 * 端末のローカルタイムゾーン基準で 'YYYY-MM-DD' 形式の今日の日付文字列を返す
 */
export function getLocalTodayISO(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
