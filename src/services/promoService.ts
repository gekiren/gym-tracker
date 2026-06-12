import Constants from 'expo-constants';
import * as Updates from 'expo-updates';

export interface PromoCampaignConfig {
  minNativeVersion: string;   // Required minimum native version (e.g. "1.0.0")
  promoCode: string;          // Campaign code
  startDate: string;         // Start date (ISO format with timezone offset)
  endDate: string;           // End date (ISO format with timezone offset)
}

// Campaign configuration: 2026-06-06 to 2026-06-20 (Japan Standard Time)
export const DEFAULT_CAMPAIGN_CONFIG: PromoCampaignConfig = {
  minNativeVersion: '1.0.0',
  promoCode: 'TREPREMIUM2026',
  startDate: '2026-06-06T00:00:00+09:00',
  endDate: '2026-06-20T23:59:59+09:00',
};

/**
 * Parses a semantic version string (e.g. "1.0.5") into an array of numbers.
 */
const parseVersion = (v: string): number[] => {
  return v.split('.').map(x => parseInt(x, 10) || 0);
};

/**
 * Checks if current version is strictly less than the required version.
 */
export const isVersionLessThan = (current: string, required: string): boolean => {
  const currentParts = parseVersion(current);
  const requiredParts = parseVersion(required);
  
  for (let i = 0; i < Math.max(currentParts.length, requiredParts.length); i++) {
    const cur = currentParts[i] ?? 0;
    const req = requiredParts[i] ?? 0;
    if (cur < req) return true;
    if (cur > req) return false;
  }
  return false;
};

export interface VersionCheckResult {
  isUpToDate: boolean;
  currentVersion: string;
  requiredVersion: string;
}

/**
 * Performs native app version check against campaign requirements.
 */
export const checkNativeVersion = (config: PromoCampaignConfig = DEFAULT_CAMPAIGN_CONFIG): VersionCheckResult => {
  const currentVersion = Updates.runtimeVersion || Constants.expoConfig?.version || Constants.nativeAppVersion || '1.0.0';
  const isOutdated = isVersionLessThan(currentVersion, config.minNativeVersion);
  
  return {
    isUpToDate: !isOutdated,
    currentVersion,
    requiredVersion: config.minNativeVersion,
  };
};

export interface OTACheckResult {
  isUpdateTriggered: boolean;
  error?: string;
}

/**
 * Checks for OTA updates and forces reload if available.
 * Skips in development/local test configurations automatically to avoid crashes.
 */
export const checkAndApplyOTAUpdate = async (): Promise<OTACheckResult> => {
  if (__DEV__ || !Updates.isEnabled) {
    console.log('OTA update check skipped in development or local build environments.');
    return { isUpdateTriggered: false };
  }

  try {
    const check = await Updates.checkForUpdateAsync();
    if (check.isAvailable) {
      console.log('New OTA update found, downloading...');
      await Updates.fetchUpdateAsync();
      console.log('Update downloaded successfully, reloading app...');
      await Updates.reloadAsync();
      return { isUpdateTriggered: true };
    }
    return { isUpdateTriggered: false };
  } catch (error) {
    console.warn('Failed to perform OTA update check:', error);
    return { 
      isUpdateTriggered: false, 
      error: error instanceof Error ? error.message : String(error) 
    };
  }
};

/**
 * Verifies if the entered code is correct and matches the active campaign period.
 * 
 * @param inputCode The user-entered promotion code
 * @param config The active campaign configuration
 * @param now Optional date instance representing the current time for verification
 */
export const verifyPromoCode = (
  inputCode: string,
  config: PromoCampaignConfig = DEFAULT_CAMPAIGN_CONFIG,
  now: Date = new Date()
): boolean => {
  const code = inputCode.trim();
  if (code !== config.promoCode) {
    return false;
  }

  const startTime = new Date(config.startDate).getTime();
  const endTime = new Date(config.endDate).getTime();
  const nowTime = now.getTime();

  return nowTime >= startTime && nowTime <= endTime;
};
