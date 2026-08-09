/**
 * ユーザーのプレミアムステータス（有効/無効）を判定する共通関数
 */
export const computeIsPremium = (
  premiumUntil: string | undefined | null,
  isEarlyAdopter: boolean = false
): boolean => {
  if (isEarlyAdopter) return true;
  if (!premiumUntil) return false;
  if (premiumUntil === 'perpetual') return true;
  const expiry = Date.parse(premiumUntil);
  return !isNaN(expiry) && expiry > Date.now();
};
