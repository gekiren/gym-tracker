/**
 * AI Personal Trainer (AI Coach) Configuration & Emergency Switches
 */
export const AI_CONFIG = {
  // EMERGENCY SWITCHES (ステータス設定):
  // - 'active': Fully functional. All AI Coach features and sparks buttons are visible.
  // - 'maintenance': Chat page is locked with a "準備中" (Under Maintenance) screen, and all sparks buttons are hidden.
  // - 'disabled': Coach tab is completely hidden from the bottom bar, and all sparks buttons are hidden.
  status: 'active' as 'active' | 'maintenance' | 'disabled',
};
