import { Platform } from 'react-native';
import { TestIds } from 'react-native-google-mobile-ads';

/**
 * Google AdMob Configuration
 * Contains both Test IDs (for development/verification) and placeholders for Production IDs.
 */
export const AD_CONFIG = {
  // Set to true to force test ads during development and testing
  useTestAds: __DEV__,

  // Production Ad Unit IDs (Replace placeholders with actual AdMob IDs prior to app release)
  production: {
    androidBanner: 'ca-app-pub-xxxxxxxxxxxxxxxx/xxxxxxxxxx', // Replace with real Android banner unit ID
    iosBanner: 'ca-app-pub-xxxxxxxxxxxxxxxx/xxxxxxxxxx',     // Replace with real iOS banner unit ID
  },

  /**
   * Returns the correct AdMob Banner Unit ID depending on platform and environment mode.
   */
  getBannerAdUnitId(): string {
    if (this.useTestAds) {
      // Use the built-in library TestIds helper which resolves to the appropriate platform test ID
      return Platform.select({
        android: TestIds.BANNER,
        ios: TestIds.BANNER,
        default: TestIds.BANNER,
      });
    }

    const adId = Platform.select({
      android: this.production.androidBanner,
      ios: this.production.iosBanner,
    });

    // Fall back to SDK Test ID if production ID is not set or invalid
    if (!adId || adId.includes('xxxxxxxxxxxxxxxx')) {
      return Platform.select({
        android: TestIds.BANNER,
        ios: TestIds.BANNER,
        default: TestIds.BANNER,
      });
    }

    return adId;
  }
};
