/**
 * Web stub for adConfig.ts
 * react-native-google-mobile-ads is not supported on web.
 * This file is used by the bundler instead of adConfig.ts when building for web.
 */
export const AD_CONFIG = {
  useTestAds: true,
  production: {
    androidBanner: '',
    iosBanner: '',
    androidRewardedInterstitial: '',
    iosRewardedInterstitial: '',
  },
  getBannerAdUnitId(): string {
    return '';
  },
  getRewardedInterstitialAdUnitId(): string {
    return '';
  },
};
