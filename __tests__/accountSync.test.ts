import { mergeEntitlements, EntitlementStatus } from '../src/services/accountSyncService';
import { useAuthStore } from '../src/store/authStore';

jest.mock('../src/db/database', () => ({
  getSettings: jest.fn().mockResolvedValue({}),
  saveSetting: jest.fn().mockResolvedValue(undefined),
}));

describe('Google Account Sync & Entitlement Merge Logic', () => {
  beforeEach(() => {
    useAuthStore.getState().clearAuth();
  });

  test('Preserves local Early Adopter status when cloud status is basic', () => {
    const local: EntitlementStatus = {
      isEarlyAdopter: true,
      premiumUntil: '',
      aiTokensBalance: 18,
    };
    const remote: Partial<EntitlementStatus> = {
      isEarlyAdopter: false,
      premiumUntil: '',
      aiTokensBalance: 5,
    };

    const merged = mergeEntitlements(local, remote, false);
    expect(merged.isEarlyAdopter).toBe(true);
    expect(merged.aiTokensBalance).toBe(20);
  });

  test('Restores cloud Perpetual Premium status onto fresh device (local is basic)', () => {
    const local: EntitlementStatus = {
      isEarlyAdopter: false,
      premiumUntil: '',
      aiTokensBalance: 5,
    };
    const remote: Partial<EntitlementStatus> = {
      isEarlyAdopter: false,
      premiumUntil: 'perpetual',
      aiTokensBalance: 20,
    };

    const merged = mergeEntitlements(local, remote, false);
    expect(merged.premiumUntil).toBe('perpetual');
    expect(merged.aiTokensBalance).toBe(20);
  });

  test('Picks the further future promo expiration date between local and remote', () => {
    const futureNear = new Date(Date.now() + 7 * 86400 * 1000).toISOString();
    const futureFar = new Date(Date.now() + 30 * 86400 * 1000).toISOString();

    const local: EntitlementStatus = {
      isEarlyAdopter: false,
      premiumUntil: futureNear,
      aiTokensBalance: 12,
    };
    const remote: Partial<EntitlementStatus> = {
      isEarlyAdopter: false,
      premiumUntil: futureFar,
      aiTokensBalance: 15,
    };

    const merged = mergeEntitlements(local, remote, false);
    expect(merged.premiumUntil).toBe(futureFar);
    expect(merged.aiTokensBalance).toBe(20);
  });

  test('Grants perpetual premium when isGlobalVip (cross-app VIP) is true', () => {
    const local: EntitlementStatus = {
      isEarlyAdopter: false,
      premiumUntil: '',
      aiTokensBalance: 5,
    };

    const merged = mergeEntitlements(local, null, true);
    expect(merged.premiumUntil).toBe('perpetual');
    expect(merged.aiTokensBalance).toBe(20);
  });

  test('AuthStore properly hydrates and clears user profile', () => {
    const mockUser = {
      id: 'google_123',
      email: 'test@example.com',
      name: 'Test User',
      photoUrl: null,
    };

    useAuthStore.getState().hydrateAuth(mockUser, '2026-10-25T12:00:00.000Z');
    expect(useAuthStore.getState().user).toEqual(mockUser);
    expect(useAuthStore.getState().lastSyncedAt).toBe('2026-10-25T12:00:00.000Z');

    useAuthStore.getState().clearAuth();
    expect(useAuthStore.getState().user).toBeNull();
    expect(useAuthStore.getState().lastSyncedAt).toBeNull();
  });
});
